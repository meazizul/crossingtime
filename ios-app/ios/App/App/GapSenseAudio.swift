import AVFoundation
import UIKit

// MARK: - Sound

/// CrossingTime's own tone player for the iPhone app.
///
/// Why native: inside the web view, Web Audio is played by WebKit, which
/// decides the audio session itself and can fall back to the "ambient"
/// session that the ring/silent switch mutes. A student at a curb with the
/// switch on would hear nothing and not know why (Cindi: "felt but not
/// heard"). Tones synthesized here play through the app's own `.playback`
/// session, which iOS never mutes with the switch.
///
/// One AVAudioSourceNode renders every voice. Voices are sine partials with
/// the same envelopes as the web code ("pulse": quick attack then a linear
/// fade; "steady": one level from start to end) and are placed by sample
/// frame, so tones scheduled together keep their spacing exactly.
///
/// Loudness: the mix goes through a soft clipper (tanh, drive 3). Measured
/// against build 8: the steady sample about 7 dB louder, the chimes about
/// 5 dB, peaks held just under full scale, and the added overtones carry
/// better on a phone's small speaker. Louder at the same phone volume,
/// without crackling.
///
/// Build 14 (tracker 12.34): steady voices are lowered to 30% while any
/// short cue (the student's own sound, the right or wrong cue) plays, with a
/// few milliseconds of smoothing, so the cue stays clean over the sample
/// instead of merging with it, and the two together no longer drive the
/// clipper. The web version does the same with gain automation.
final class GSAudio {
    static let shared = GSAudio()

    private struct Voice {
        var id: Int = 0
        var active = false
        var freqs: (Double, Double, Double, Double) = (0, 0, 0, 0)
        var gains: (Float, Float, Float, Float) = (0, 0, 0, 0)
        var phases: (Double, Double, Double, Double) = (0, 0, 0, 0)
        var count = 0
        var level: Float = 1
        var startFrame: Int64 = 0
        var endFrame: Int64 = .max      // when the release begins
        var attackFrames: Int64 = 1
        var releaseFrames: Int64 = 1
        var steady = true
    }

    /// Build 28 (tracker F14): one playing recording. The short cues (right,
    /// wrong, the student's own sound) are recordings now; they are mixed in
    /// by sample frame exactly as the tones are, so their spacing in a replay
    /// is just as exact.
    private struct CueVoice {
        var id: Int = 0
        var active = false
        var sample = 0                 // index into cueData
        var position: Double = 0       // read position in the recording
        var step: Double = 1           // recording frames per output frame
        var level: Float = 1
        var startFrame: Int64 = 0
        var fade: Int = -1             // frames of fade-out left; -1 = not stopping
    }

    private static let maxCues = 16
    private static let cueFadeFrames = 240
    private static let maxVoices = 32
    private static let drive: Float = 3
    private static let duckLevel: Float = 0.3
    private var duckSmooth: Float = 0        // 0 = no cue playing, 1 = fully ducked
    private var pulseScratch = [Float](repeating: 0, count: 4096)
    private var steadyScratch = [Float](repeating: 0, count: 4096)
    private var envScratch = [Float](repeating: 0, count: 4096)

    private let engine = AVAudioEngine()
    private var source: AVAudioSourceNode?
    private var sampleRate: Double = 48_000
    private let lock: UnsafeMutablePointer<os_unfair_lock> = {
        let pointer = UnsafeMutablePointer<os_unfair_lock>.allocate(capacity: 1)
        pointer.initialize(to: os_unfair_lock())
        return pointer
    }()
    private var voices = [Voice](repeating: Voice(), count: GSAudio.maxVoices)
    private var cues = [CueVoice](repeating: CueVoice(), count: GSAudio.maxCues)
    private var cueData: [[Float]] = []        // mono recordings, never changed once added
    private var cueRates: [Double] = []        // each recording's own sample rate
    private var cueIndex: [String: Int] = [:]  // "bright/right-a" -> index
    private var cueScratch = [Float](repeating: 0, count: 4096)
    private var cuesStarted = 0
    private var frame: Int64 = 0          // frames rendered so far
    private var nextId = 1
    private var peak: Float = 0           // loudest output sample since last status()
    private var tonesStarted = 0
    private var observers: [NSObjectProtocol] = []

    private init() {
        configureSession()
        buildGraph()
        start()
        observe()
        // The recordings are small (under 1 MB in all); read them now so the
        // first cue does not wait for the disk.
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in self?.preloadCues() }
    }

    // MARK: Session

    /// `.playback` is the category iOS documents as playing with the
    /// ring/silent switch on. `.mixWithOthers` leaves the student's own audio
    /// and VoiceOver alone. Called again whenever something may have changed
    /// it: coming back to the app, the end of an interruption, a media reset.
    func configureSession(force: Bool = true) {
        let session = AVAudioSession.sharedInstance()
        let changed = session.category != .playback || !session.categoryOptions.contains(.mixWithOthers)
        guard changed || force else { return }
        do {
            if changed {
                try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            }
            try session.setActive(true)
        } catch {
            NSLog("[GapSense] audio session: %@", error.localizedDescription)
        }
    }

    // MARK: Engine

    private func buildGraph() {
        let output = engine.outputNode.inputFormat(forBus: 0)
        sampleRate = output.sampleRate > 0 ? output.sampleRate : 48_000
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1) else { return }
        let node = AVAudioSourceNode(format: format) { [unowned self] _, _, frameCount, bufferList -> OSStatus in
            self.render(frameCount: Int(frameCount), bufferList: bufferList)
            return noErr
        }
        source = node
        engine.attach(node)
        engine.connect(node, to: engine.mainMixerNode, format: format)
        engine.mainMixerNode.outputVolume = 1
        engine.prepare()
    }

    @discardableResult
    private func start() -> Bool {
        if engine.isRunning { return true }
        configureSession()
        do {
            try engine.start()
            return true
        } catch {
            NSLog("[GapSense] audio engine: %@", error.localizedDescription)
            return false
        }
    }

    private func observe() {
        let center = NotificationCenter.default
        // A call, Siri or an alarm stops the engine; start again when it ends.
        observers.append(center.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  AVAudioSession.InterruptionType(rawValue: raw) == .ended else { return }
            self?.start()
        })
        // Headphones plugged in or out, AirPods connecting: the engine stops
        // itself after a change of output and has to be started again.
        observers.append(center.addObserver(forName: .AVAudioEngineConfigurationChange, object: engine, queue: .main) { [weak self] _ in
            self?.start()
        })
        observers.append(center.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: nil, queue: .main) { [weak self] _ in
            self?.configureSession()
            self?.start()
        })
        observers.append(center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            self?.configureSession()
            self?.start()
        })
    }

    // MARK: Playing

    /// Schedule one tone `delay` seconds from now. Returns its id.
    @discardableResult
    func tone(partials: [(Double, Float)], duration: Double, delay: Double, level: Float, steady: Bool) -> Int {
        add(partials: partials, duration: max(0.005, duration), delay: max(0, delay), level: level, steady: steady)
    }

    /// Start a steady tone that lasts until `stop(id)`.
    func startSustained(partials: [(Double, Float)], level: Float) -> Int {
        add(partials: partials, duration: nil, delay: 0, level: level, steady: true)
    }

    /// Fade a sustained tone out now (12 ms, no click).
    func stop(_ id: Int) {
        os_unfair_lock_lock(lock)
        for index in voices.indices where voices[index].active && voices[index].id == id {
            voices[index].endFrame = max(voices[index].startFrame, frame)
        }
        os_unfair_lock_unlock(lock)
    }

    /// Silence everything at once (leaving a screen, cancelling a replay).
    func stopAll() {
        os_unfair_lock_lock(lock)
        for index in voices.indices where voices[index].active {
            voices[index].endFrame = min(voices[index].endFrame, max(voices[index].startFrame, frame))
            if voices[index].startFrame > frame { voices[index].active = false }
        }
        for index in cues.indices where cues[index].active {
            // Not started yet: drop it. Playing: a 5 ms fade, so no click.
            if cues[index].startFrame > frame { cues[index].active = false }
            else if cues[index].fade < 0 { cues[index].fade = GSAudio.cueFadeFrames }
        }
        os_unfair_lock_unlock(lock)
    }

    // MARK: Recorded cues (build 28)

    private static var cueFolder: URL {
        Bundle.main.bundleURL.appendingPathComponent("public/sounds", isDirectory: true)
    }

    /// Reads every recording under public/sounds/<style>/<role>.wav.
    /// Safe to call more than once and from any thread: a recording already
    /// read is not read again.
    func preloadCues() {
        let manager = FileManager.default
        guard let styles = try? manager.contentsOfDirectory(at: GSAudio.cueFolder, includingPropertiesForKeys: nil) else { return }
        for style in styles where style.hasDirectoryPath {
            guard let files = try? manager.contentsOfDirectory(at: style, includingPropertiesForKeys: nil) else { continue }
            for file in files where file.pathExtension == "wav" {
                _ = loadCue("\(style.lastPathComponent)/\(file.deletingPathExtension().lastPathComponent)")
            }
        }
    }

    /// The index of a recording, reading it from the app bundle if needed.
    /// Names are "<style>/<role>" in lower-case letters and hyphens only.
    private func loadCue(_ name: String) -> Int? {
        os_unfair_lock_lock(lock)
        let known = cueIndex[name]
        os_unfair_lock_unlock(lock)
        if let known = known { return known }
        guard name.range(of: "^[a-z]+/[a-z-]+$", options: .regularExpression) != nil else { return nil }
        let url = GSAudio.cueFolder.appendingPathComponent(name + ".wav")
        guard let file = try? AVAudioFile(forReading: url),
              file.length > 0, file.length < 10_000_000,
              let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length)),
              (try? file.read(into: buffer)) != nil,
              let channels = buffer.floatChannelData else { return nil }
        let frames = Int(buffer.frameLength)
        let channelCount = Int(buffer.format.channelCount)
        guard frames > 1, channelCount > 0 else { return nil }
        var mono = [Float](repeating: 0, count: frames)
        for c in 0..<channelCount {
            let data = channels[c]
            for i in 0..<frames { mono[i] += data[i] / Float(channelCount) }
        }
        os_unfair_lock_lock(lock)
        defer { os_unfair_lock_unlock(lock) }
        if let known = cueIndex[name] { return known }
        cueData.append(mono)
        cueRates.append(buffer.format.sampleRate)
        cueIndex[name] = cueData.count - 1
        return cueData.count - 1
    }

    /// The recordings this copy of the app holds, for the web code to check
    /// before it relies on one.
    func cueNames() -> [String] {
        os_unfair_lock_lock(lock)
        defer { os_unfair_lock_unlock(lock) }
        return cueIndex.keys.sorted()
    }

    /// Schedule one recording `delay` seconds from now. `rate` above 1 plays
    /// it higher (and shorter), below 1 lower. Returns false when the app
    /// has no recording of that name.
    @discardableResult
    func cue(name: String, delay: Double, level: Float, rate: Double) -> Bool {
        guard let index = loadCue(name) else { return false }
        configureSession(force: false)
        start()
        var voice = CueVoice()
        voice.sample = index
        voice.level = max(0, min(1.5, level))
        voice.active = true
        os_unfair_lock_lock(lock)
        voice.step = cueRates[index] / sampleRate * max(0.5, min(2, rate))
        voice.startFrame = frame + Int64((max(0, delay) + 0.005) * sampleRate)
        voice.id = nextId
        nextId += 1
        cuesStarted += 1
        let slot = cues.firstIndex(where: { !$0.active })
            ?? cues.indices.min(by: { cues[$0].startFrame < cues[$1].startFrame })!
        cues[slot] = voice
        os_unfair_lock_unlock(lock)
        return true
    }

    private func add(partials: [(Double, Float)], duration: Double?, delay: Double, level: Float, steady: Bool) -> Int {
        // Cheap check before every tone: if anything has moved the session
        // off .playback, put it back before the tone can be muted.
        configureSession(force: false)
        start()
        var voice = Voice()
        let used = Array(partials.prefix(4))
        voice.count = used.count
        func f(_ i: Int) -> Double { i < used.count ? used[i].0 : 0 }
        func g(_ i: Int) -> Float { i < used.count ? used[i].1 : 0 }
        voice.freqs = (f(0), f(1), f(2), f(3))
        voice.gains = (g(0), g(1), g(2), g(3))
        voice.level = max(0, min(1.5, level))
        voice.steady = steady
        voice.attackFrames = Int64((steady ? 0.006 : 0.01) * sampleRate)
        voice.releaseFrames = Int64((steady ? 0.012 : 0.07) * sampleRate)
        voice.active = true

        os_unfair_lock_lock(lock)
        // A few milliseconds ahead of the render position, so the first
        // frames are never already past.
        voice.startFrame = frame + Int64((delay + 0.005) * sampleRate)
        if let duration = duration {
            voice.endFrame = voice.startFrame + Int64(duration * sampleRate)
        }
        voice.id = nextId
        nextId += 1
        tonesStarted += 1
        let slot = voices.firstIndex(where: { !$0.active })
            ?? voices.indices.min(by: { voices[$0].startFrame < voices[$1].startFrame })!
        voices[slot] = voice
        os_unfair_lock_unlock(lock)
        return voice.id
    }

    // MARK: Rendering (audio thread)

    private func render(frameCount: Int, bufferList: UnsafeMutablePointer<AudioBufferList>) {
        let buffers = UnsafeMutableAudioBufferListPointer(bufferList)
        guard let out = buffers.first?.mData?.assumingMemoryBound(to: Float.self) else { return }
        for i in 0..<frameCount { out[i] = 0 }

        os_unfair_lock_lock(lock)
        if pulseScratch.count < frameCount {
            pulseScratch = [Float](repeating: 0, count: frameCount)
            steadyScratch = [Float](repeating: 0, count: frameCount)
            envScratch = [Float](repeating: 0, count: frameCount)
        }
        if cueScratch.count < frameCount { cueScratch = [Float](repeating: 0, count: frameCount) }
        for i in 0..<frameCount { pulseScratch[i] = 0; steadyScratch[i] = 0; envScratch[i] = 0; cueScratch[i] = 0 }
        let first = frame
        let twoPi = 2.0 * Double.pi
        for v in voices.indices where voices[v].active {
            var voice = voices[v]
            let releaseEnd = voice.endFrame == .max ? Int64.max : voice.endFrame + voice.releaseFrames
            if first + Int64(frameCount) <= voice.startFrame { continue }
            let steps = (twoPi * voice.freqs.0 / sampleRate, twoPi * voice.freqs.1 / sampleRate,
                         twoPi * voice.freqs.2 / sampleRate, twoPi * voice.freqs.3 / sampleRate)
            for i in 0..<frameCount {
                let n = first + Int64(i)
                if n < voice.startFrame { continue }
                if n >= releaseEnd { voice.active = false; break }
                let t = n - voice.startFrame
                var env: Float
                if t < voice.attackFrames {
                    env = Float(t) / Float(max(1, voice.attackFrames))
                } else if voice.steady {
                    env = 1
                } else {
                    // pulse: from full at the end of the attack down to zero
                    // at the end of the release, as the web version does.
                    let span = max(1, releaseEnd - voice.startFrame - voice.attackFrames)
                    env = 1 - Float(t - voice.attackFrames) / Float(span)
                }
                if voice.steady && n >= voice.endFrame {
                    env *= 1 - Float(n - voice.endFrame) / Float(max(1, voice.releaseFrames))
                }
                var s: Float = 0
                if voice.count > 0 { s += voice.gains.0 * Float(sin(voice.phases.0)); voice.phases.0 += steps.0 }
                if voice.count > 1 { s += voice.gains.1 * Float(sin(voice.phases.1)); voice.phases.1 += steps.1 }
                if voice.count > 2 { s += voice.gains.2 * Float(sin(voice.phases.2)); voice.phases.2 += steps.2 }
                if voice.count > 3 { s += voice.gains.3 * Float(sin(voice.phases.3)); voice.phases.3 += steps.3 }
                // Steady voices (the sample) and short cues are summed apart,
                // so the cues can lower the sample underneath them.
                if voice.steady {
                    steadyScratch[i] += s * env * voice.level
                } else {
                    pulseScratch[i] += s * env * voice.level
                    envScratch[i] = max(envScratch[i], min(1, env * voice.level * 2))
                }
            }
            // Keep phases small so long tones stay accurate.
            voice.phases = (voice.phases.0.truncatingRemainder(dividingBy: twoPi), voice.phases.1.truncatingRemainder(dividingBy: twoPi),
                            voice.phases.2.truncatingRemainder(dividingBy: twoPi), voice.phases.3.truncatingRemainder(dividingBy: twoPi))
            voices[v] = voice
        }
        // Recorded cues: read with linear interpolation, so one recording
        // serves any output rate and any pitch setting.
        for c in cues.indices where cues[c].active {
            var cue = cues[c]
            if first + Int64(frameCount) <= cue.startFrame { continue }
            let data = cueData[cue.sample]
            let last = data.count - 1
            data.withUnsafeBufferPointer { samples in
                for i in 0..<frameCount {
                    if first + Int64(i) < cue.startFrame { continue }
                    let p = Int(cue.position)
                    if p >= last { cue.active = false; break }
                    let fraction = Float(cue.position - Double(p))
                    var s = (samples[p] + (samples[p + 1] - samples[p]) * fraction) * cue.level
                    if cue.fade >= 0 {
                        s *= Float(cue.fade) / Float(GSAudio.cueFadeFrames)
                        cue.fade -= 1
                        if cue.fade < 0 { cue.active = false; break }
                    }
                    cueScratch[i] += s
                    // The steady sample is lowered while a cue is sounding.
                    envScratch[i] = max(envScratch[i], min(1, abs(s) * 4))
                    cue.position += cue.step
                }
            }
            cues[c] = cue
        }
        frame = first + Int64(frameCount)

        // Duck: follow the cue envelope with ~3 ms attack and ~25 ms release.
        let attack: Float = 1 - expf(-1 / (0.003 * Float(sampleRate)))
        let release: Float = 1 - expf(-1 / (0.025 * Float(sampleRate)))
        var duck = duckSmooth
        for i in 0..<frameCount {
            let target = envScratch[i] > 0.02 ? Float(1) : Float(0)
            duck += (target - duck) * (target > duck ? attack : release)
            out[i] = steadyScratch[i] * (1 - duck * (1 - GSAudio.duckLevel)) + pulseScratch[i]
        }
        duckSmooth = duck

        let norm = tanhf(GSAudio.drive)
        var loudest = peak
        for i in 0..<frameCount {
            // The soft clipper thickens the plain tones. A recording is
            // already finished sound, so it is added after the clipper; the
            // sum is then held under full scale with a gentle knee at 0.8.
            var y = tanhf(GSAudio.drive * out[i]) / norm + cueScratch[i]
            let size = abs(y)
            if size > 0.8 { y = (y < 0 ? -1 : 1) * (0.8 + 0.2 * tanhf((size - 0.8) / 0.2)) }
            out[i] = y
            loudest = max(loudest, abs(y))
        }
        peak = loudest
        os_unfair_lock_unlock(lock)
        for b in buffers.dropFirst() {
            if let data = b.mData { memcpy(data, out, Int(b.mDataByteSize)) }
        }
    }

    // MARK: Status

    /// What the app can see of its sound: used by "Play a test sound" and by
    /// the simulator checks. `peak` is the loudest sample played since the
    /// last call (0 to 1).
    func status() -> [String: Any] {
        let session = AVAudioSession.sharedInstance()
        os_unfair_lock_lock(lock)
        let loudest = peak
        peak = 0
        let started = tonesStarted
        let cuesPlayed = cuesStarted
        let cuesLoaded = cueIndex.count
        os_unfair_lock_unlock(lock)
        return [
            "engineRunning": engine.isRunning,
            "category": session.category.rawValue,
            "ignoresSilentSwitch": session.category == .playback,
            "outputVolume": session.outputVolume,
            "outputLatency": session.outputLatency,
            "route": session.currentRoute.outputs.map { $0.portType.rawValue }.joined(separator: ","),
            "peak": loudest,
            "tonesStarted": started,
            "cuesStarted": cuesPlayed,
            "cuesLoaded": cuesLoaded
        ]
    }
}

// MARK: - Speech

/// Spoken prompts ("Get ready", self-voicing) through the app's own audio
/// session, so the silent switch cannot mute them either.
/// Used from the main thread only.
final class GSSpeech: NSObject, AVSpeechSynthesizerDelegate, @unchecked Sendable {
    static let shared = GSSpeech()

    private let synthesizer = AVSpeechSynthesizer()
    private var finished: [ObjectIdentifier: () -> Void] = [:]

    override private init() {
        super.init()
        synthesizer.delegate = self
        synthesizer.usesApplicationAudioSession = true
    }

    /// rate: the web code's 0.5–2 scale, where 1 is normal speed.
    func speak(_ text: String, rate: Float, interrupt: Bool, onDone: @escaping () -> Void) {
        GSAudio.shared.configureSession()
        if interrupt { stop() }
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = bestVoice()
        let normal = AVSpeechUtteranceDefaultSpeechRate
        let scaled = rate >= 1
            ? normal + (AVSpeechUtteranceMaximumSpeechRate - normal) * min(1, (rate - 1) / 1.0) * 0.6
            : normal - (normal - AVSpeechUtteranceMinimumSpeechRate) * min(1, (1 - rate) / 0.5) * 0.6
        utterance.rate = scaled
        utterance.volume = 1
        finished[ObjectIdentifier(utterance)] = onDone
        synthesizer.speak(utterance)
    }

    /// Build 28: the most natural US English voice on this phone. A Premium
    /// or Enhanced voice the person has downloaded (Settings, Accessibility,
    /// Spoken Content, Voices) sounds far less robotic than the compact
    /// voice every phone starts with; without one, the phone's own default
    /// for US English is used, as before. Checked again every few minutes,
    /// so a voice downloaded while the app is open is picked up.
    private var chosenVoice: AVSpeechSynthesisVoice?
    private var chosenAt = Date.distantPast

    private func bestVoice() -> AVSpeechSynthesisVoice? {
        if chosenVoice != nil, Date().timeIntervalSince(chosenAt) < 300 { return chosenVoice }
        let english = AVSpeechSynthesisVoice.speechVoices().filter { voice in
            guard voice.language == "en-US" else { return false }
            if #available(iOS 17.0, *), voice.voiceTraits.contains(.isNoveltyVoice) { return false }
            return true
        }
        let best = english.first(where: { $0.quality == .premium })
            ?? english.first(where: { $0.quality == .enhanced })
            ?? AVSpeechSynthesisVoice(language: "en-US")
        chosenVoice = best
        chosenAt = Date()
        return best
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        finished.removeValue(forKey: ObjectIdentifier(utterance))?()
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        finished.removeValue(forKey: ObjectIdentifier(utterance))?()
    }
}

// MARK: - Recorded voice (build 28)

/// The app's fixed sentences ("Get ready", "Replay", the directions on each
/// screen) as recordings of a natural voice, played one after another
/// through the app's own audio session, so the silent switch cannot mute
/// them. Sentences with no recording (a number of seconds, a student's
/// name) are spoken by GSSpeech instead; the web code decides which.
/// Used from the main thread only.
final class GSVoiceClips: NSObject, AVAudioPlayerDelegate, @unchecked Sendable {
    static let shared = GSVoiceClips()

    private var queue: [URL] = []
    private var player: AVAudioPlayer?
    private var onDone: ((Bool) -> Void)?
    private var rate: Float = 1

    private static var folder: URL {
        Bundle.main.bundleURL.appendingPathComponent("public/voice", isDirectory: true)
    }

    var isPlaying: Bool { player != nil }

    /// Plays the named recordings in order. `onDone(true)` when the last one
    /// has finished, `onDone(false)` if it was stopped or a file is missing
    /// (nothing is played in that case, so the caller can speak the words).
    func play(files: [String], rate: Float, onDone: @escaping (Bool) -> Void) {
        stop()
        let urls = files.compactMap { name -> URL? in
            guard name.range(of: "^[a-z0-9]+$", options: .regularExpression) != nil else { return nil }
            let url = GSVoiceClips.folder.appendingPathComponent(name + ".mp3")
            return FileManager.default.fileExists(atPath: url.path) ? url : nil
        }
        guard !urls.isEmpty, urls.count == files.count else {
            onDone(false)
            return
        }
        GSAudio.shared.configureSession()
        queue = urls
        self.rate = max(0.5, min(2, rate))
        self.onDone = onDone
        next()
    }

    private func next() {
        guard !queue.isEmpty else {
            finish(true)
            return
        }
        let url = queue.removeFirst()
        guard let next = try? AVAudioPlayer(contentsOf: url) else {
            finish(false)
            return
        }
        next.delegate = self
        next.enableRate = true      // faster or slower without changing the pitch
        next.rate = rate
        next.volume = 1
        player = next
        if !next.play() { finish(false) }
    }

    private func finish(_ completed: Bool) {
        player?.delegate = nil
        player = nil
        queue = []
        let done = onDone
        onDone = nil
        done?(completed)
    }

    func stop() {
        guard player != nil || onDone != nil else { return }
        player?.stop()
        finish(false)
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, self.player === player else { return }
            flag ? self.next() : self.finish(false)
        }
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, self.player === player else { return }
            self.finish(false)
        }
    }
}

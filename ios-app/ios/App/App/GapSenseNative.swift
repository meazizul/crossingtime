import UIKit
import Capacitor
import CoreHaptics
import AudioToolbox
import AppIntents
import AVFoundation

// MARK: - Bridge view controller

/// The storyboard's root view controller. Identical to Capacitor's, plus Gap
/// Sense's own plugin, registered in code because it lives in the app target
/// rather than in a package.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(GSNativePlugin())
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        GSSelfTest.runIfRequested(in: webView)
    }
}

// MARK: - Plugin

/// `window.Capacitor.Plugins.GSNative` in the web code.
///
///   haptic({ type })   play one of the app's haptic cues
///   tone({ partials, duration, delay, level, envelope })
///                      play a tone (GapSenseAudio.swift); partials are
///                      [{ freq, gain }], times in seconds from now
///   sustainStart({ partials, level }) -> { id }   a steady tone until stopped
///   sustainStop({ id })
///   stopSound()        silence every tone now
///   keepAwake({ on })  keep the screen on while a pad is open
///   directTouchShow({ x, y, width, height, label, hint, focus })
///                      lay a native direct-touch area over the page at that
///                      rectangle (CSS px). With VoiceOver on, touches there
///                      reach the app unchanged, so swipes and taps work the
///                      same as without VoiceOver (build 12). With focus,
///                      VoiceOver's cursor is moved onto the area (build 14).
///   directTouchHide()  take it out of the view tree and tell VoiceOver
///   Event "directTouch" { kind: tap|up|down|left|right|escape, durationMs, dx, dy }
///                      "escape" is VoiceOver's two-finger scrub on the area
///   audioStatus()      engine, session category, phone volume, route, peak
///   speak({ text, rate, interrupt })  resolves when the speech ends
///   stopSpeaking()
///   canOpen({ scheme })  whether a mail (mailto) or messaging (sms) app can open
///   pendingScreen()    the activity a Siri / Shortcuts request asked for, if any
///   log({ message })   write to the device log (diagnostics)
///
/// Event "openScreen" { screen } fires when Siri or Shortcuts asks for an
/// activity while the app is already running. Event "volume" { value } fires
/// when the phone's volume changes.
@objc(GSNativePlugin)
public class GSNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GSNativePlugin"
    public let jsName = "GSNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "tone", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sustainStart", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sustainStop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopSound", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "audioStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopSpeaking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pendingScreen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keepAwake", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "directTouchShow", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "directTouchHide", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "canOpen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "accessibilityStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "log", returnType: CAPPluginReturnPromise)
    ]

    private let haptics = GSHaptics()
    private var shortcutObserver: NSObjectProtocol?
    private var directTouch: GSDirectTouchView?

    private var volumeObservation: NSKeyValueObservation?
    private var routeObserver: NSObjectProtocol?
    private var interruptionObserver: NSObjectProtocol?

    override public func load() {
        // Tell the page when the phone's volume changes, so the "volume is
        // low" note goes away as soon as the student turns it up.
        volumeObservation = AVAudioSession.sharedInstance().observe(\.outputVolume, options: [.new]) { [weak self] _, change in
            guard let value = change.newValue else { return }
            self?.notifyListeners("volume", data: ["value": value])
        }
        // Headphones connecting or disconnecting change the output delay, and
        // need not change the volume. The page re-reads audioStatus on this
        // event, so Comparison preparation uses the delay of the route in use.
        routeObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main
        ) { [weak self] note in
            self?.notifyListeners("volume", data: ["value": AVAudioSession.sharedInstance().outputVolume])
            // A new output (AirPods, hearing aids) or the old one gone: the
            // audio engine stops and restarts, so a sample playing now is cut
            // (tracker 20.11). The page cancels the try.
            if let raw = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
               let reason = AVAudioSession.RouteChangeReason(rawValue: raw),
               reason == .newDeviceAvailable || reason == .oldDeviceUnavailable {
                self?.notifyListeners("audioInterrupted", data: ["reason": "route"])
            }
        }
        // A call, Siri or an alarm takes the sound: the engine's clock stops.
        interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
        ) { [weak self] note in
            guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  AVAudioSession.InterruptionType(rawValue: raw) == .began else { return }
            self?.notifyListeners("audioInterrupted", data: ["reason": "interruption"])
        }
        shortcutObserver = NotificationCenter.default.addObserver(
            forName: GSShortcutRouter.didRequest, object: nil, queue: .main
        ) { [weak self] note in
            guard let screen = note.userInfo?["screen"] as? String else { return }
            GSShortcutRouter.shared.consume()
            // Kept until the web code is listening, in case Siri asked before
            // the page finished loading.
            self?.notifyListeners("openScreen", data: ["screen": screen], retainUntilConsumed: true)
        }
    }

    deinit {
        if let observer = shortcutObserver {
            NotificationCenter.default.removeObserver(observer)
        }
        if let observer = routeObserver {
            NotificationCenter.default.removeObserver(observer)
        }
        if let observer = interruptionObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    @objc func haptic(_ call: CAPPluginCall) {
        let type = call.getString("type") ?? "marker"
        DispatchQueue.main.async { [haptics] in
            haptics.play(type)
        }
        call.resolve()
    }

    private func partials(_ call: CAPPluginCall) -> [(Double, Float)] {
        let list = call.getArray("partials", JSObject.self) ?? []
        return list.compactMap { item in
            guard let freq = (item["freq"] as? NSNumber)?.doubleValue,
                  let gain = (item["gain"] as? NSNumber)?.floatValue else { return nil }
            return (freq, gain)
        }
    }

    @objc func tone(_ call: CAPPluginCall) {
        let id = GSAudio.shared.tone(
            partials: partials(call),
            duration: call.getDouble("duration") ?? 0.12,
            delay: call.getDouble("delay") ?? 0,
            level: call.getFloat("level") ?? 1,
            steady: call.getString("envelope") != "pulse"
        )
        call.resolve(["id": id])
    }

    @objc func sustainStart(_ call: CAPPluginCall) {
        let id = GSAudio.shared.startSustained(partials: partials(call), level: call.getFloat("level") ?? 1)
        call.resolve(["id": id])
    }

    @objc func sustainStop(_ call: CAPPluginCall) {
        GSAudio.shared.stop(call.getInt("id") ?? -1)
        call.resolve()
    }

    @objc func stopSound(_ call: CAPPluginCall) {
        GSAudio.shared.stopAll()
        call.resolve()
    }

    @objc func audioStatus(_ call: CAPPluginCall) {
        var status = GSAudio.shared.status()
        haptics.status().forEach { status[$0.key] = $0.value }
        call.resolve(status)
    }

    @objc func speak(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        let rate = call.getFloat("rate") ?? 1
        let interrupt = call.getBool("interrupt") ?? true
        DispatchQueue.main.async {
            GSSpeech.shared.speak(text, rate: rate, interrupt: interrupt) { call.resolve() }
        }
    }

    @objc func stopSpeaking(_ call: CAPPluginCall) {
        DispatchQueue.main.async { GSSpeech.shared.stop() }
        call.resolve()
    }

    /// accessibilityStatus (build 15): is VoiceOver running? The page then
    /// hands the replay word and the sound descriptions to VoiceOver's own
    /// voice instead of speaking them itself.
    @objc func accessibilityStatus(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve([
                "screenReader": UIAccessibility.isVoiceOverRunning,
                "switchControl": UIAccessibility.isSwitchControlRunning
            ])
        }
    }

    /// directTouchShow: a native view marked for direct interaction, placed
    /// over the pad's swipe area. VoiceOver passes touches inside it straight
    /// to the app (the student turns Direct Touch on for CrossingTime once), so a
    /// swipe at the curb is the same swipe with VoiceOver on or off. Without
    /// VoiceOver it simply forwards the same gestures.
    ///
    /// Build 14 (tracker 12.28, 13.2, 13.3, 13.6): VoiceOver keeps its own
    /// picture of the screen and has to be told when the area appears, moves,
    /// changes its label or goes. Every change posts a layout-changed
    /// notification; with `focus` the notification carries the area, which
    /// moves the VoiceOver cursor onto it, so the area's label is read first
    /// and the very first tap or swipe already reaches the app.
    @objc func directTouchShow(_ call: CAPPluginCall) {
        let x = CGFloat(call.getDouble("x") ?? 0)
        let y = CGFloat(call.getDouble("y") ?? 0)
        let width = CGFloat(call.getDouble("width") ?? 0)
        let height = CGFloat(call.getDouble("height") ?? 0)
        let label = call.getString("label") ?? "Gesture area"
        let hint = call.getString("hint") ?? "Direct touch area. Swipe or tap here as you would without VoiceOver."
        let focus = call.getBool("focus") ?? false
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let webView = self.bridge?.webView else { call.resolve(["shown": false]); return }
            if width < 1 || height < 1 {
                self.removeDirectTouch()
                call.resolve(["shown": false])
                return
            }
            if self.directTouch == nil {
                let view = GSDirectTouchView(frame: .zero)
                view.onGesture = { [weak self] kind, durationMs, dx, dy in
                    self?.notifyListeners("directTouch", data: ["kind": kind, "durationMs": durationMs, "dx": dx, "dy": dy])
                }
                self.directTouch = view
            }
            guard let view = self.directTouch else { call.resolve(["shown": false]); return }
            if view.superview !== webView { webView.addSubview(view) }
            view.frame = CGRect(x: x, y: y, width: width, height: height)
            view.accessibilityLabel = label
            view.accessibilityHint = hint
            view.isHidden = false
            webView.bringSubviewToFront(view)
            // Tell VoiceOver. With focus the cursor moves onto the area.
            UIAccessibility.post(notification: .layoutChanged, argument: focus ? view : nil)
            call.resolve(["shown": true, "focused": focus])
        }
    }

    /// directTouchHide: the area leaves the view tree, so no invisible area
    /// can stay over the next screen, and VoiceOver is told the layout changed.
    @objc func directTouchHide(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.removeDirectTouch()
            call.resolve()
        }
    }

    private func removeDirectTouch() {
        guard let view = directTouch, view.superview != nil || !view.isHidden else { return }
        view.isHidden = true
        view.removeFromSuperview()
        UIAccessibility.post(notification: .layoutChanged, argument: nil)
    }

    /// keepAwake({ on }): stop the phone from locking while a full-screen pad
    /// is open. At the street a student may wait minutes for a vehicle.
    @objc func keepAwake(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        DispatchQueue.main.async { UIApplication.shared.isIdleTimerDisabled = on }
        call.resolve()
    }

    /// canOpen({ scheme }): whether an app is set up for mailto: or sms:, so
    /// "Email to my instructor" is only offered when a mail app can open
    /// (tracker 12.38). The schemes are listed in Info.plist.
    @objc func canOpen(_ call: CAPPluginCall) {
        let scheme = call.getString("scheme") ?? "mailto"
        let probe = scheme == "sms" ? "sms:" : "mailto:test@example.com"
        guard let url = URL(string: probe) else { call.resolve(["canOpen": false]); return }
        DispatchQueue.main.async {
            call.resolve(["canOpen": UIApplication.shared.canOpenURL(url)])
        }
    }

    @objc func pendingScreen(_ call: CAPPluginCall) {
        if let screen = GSShortcutRouter.shared.consume() {
            call.resolve(["screen": screen])
        } else {
            call.resolve([:])
        }
    }

    @objc func log(_ call: CAPPluginCall) {
        NSLog("[GapSense] %@", call.getString("message") ?? "")
        call.resolve()
    }
}

// MARK: - Haptics

/// One long-lived Core Haptics engine that plays haptics only.
///
/// Why not the stock @capacitor/haptics plugin: its long buzz created a new
/// CHHapticEngine on every call and let it be freed as soon as the call
/// returned, which can cut the buzz short; and that engine was a full audio
/// engine sharing the app's audio session with the web view's sound. This one
/// is created once, never touches audio (`playsHapticsOnly`), and plays each
/// cue as a single pattern so its taps are evenly spaced.
///
/// The cues are the app's touch vocabulary for DeafBlind students:
///   marker         one strong knock      "this is you"
///   reference_ok   three strong knocks   within the margin / right
///   reference_bad  one long buzz         outside the margin / wrong
///   start          one medium knock      a sample starts or ends
///   ready          two lighter knocks    "get ready"
final class GSHaptics {
    private var engine: CHHapticEngine?
    private var engineRunning = false
    private let supportsCoreHaptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics
    private let heavy = UIImpactFeedbackGenerator(style: .heavy)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let light = UIImpactFeedbackGenerator(style: .light)
    /// Counts for the phone checks (tracker 12.30): how many cues reached
    /// Core Haptics, how many fell back to UIKit, how many failed outright.
    private(set) var played = 0
    private(set) var fellBack = 0
    private(set) var failed = 0
    private(set) var lastError = ""

    /*
     * Build 14 (tracker 12.30: nothing vibrated during tries on an iPhone
     * while the test pulse worked): the engine is kept running instead of
     * auto-shutting down between cues and being restarted under a playing
     * audio engine; a stopped or reset engine is rebuilt on the next cue; a
     * cue that Core Haptics refuses is played through UIKit at once; and the
     * UIKit generators are kept prepared. audioStatus() reports the counts
     * so a phone test can see whether the cues arrive and which path they
     * took.
     */
    private func readyEngine() -> CHHapticEngine? {
        guard supportsCoreHaptics else { return nil }
        if engine == nil {
            do {
                let created = try CHHapticEngine()
                created.playsHapticsOnly = true
                created.isAutoShutdownEnabled = false
                created.resetHandler = { [weak self] in
                    self?.engineRunning = false
                    do { try self?.engine?.start(); self?.engineRunning = true } catch { self?.engine = nil }
                }
                created.stoppedHandler = { [weak self] _ in
                    self?.engineRunning = false
                }
                engine = created
                engineRunning = false
            } catch {
                lastError = "create: \(error.localizedDescription)"
                return nil
            }
        }
        if !engineRunning {
            do {
                try engine?.start()
                engineRunning = true
            } catch {
                lastError = "start: \(error.localizedDescription)"
                engine = nil
                engineRunning = false
                return nil
            }
        }
        return engine
    }

    func status() -> [String: Any] {
        [
            "hapticsSupported": supportsCoreHaptics,
            "hapticsEngineRunning": engineRunning,
            "hapticsPlayed": played,
            "hapticsFellBack": fellBack,
            "hapticsFailed": failed,
            "hapticsLastError": lastError
        ]
    }

    private func tap(_ time: TimeInterval, intensity: Float, sharpness: Float) -> CHHapticEvent {
        CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
            ],
            relativeTime: time
        )
    }

    private func hold(_ time: TimeInterval, _ duration: TimeInterval, intensity: Float, sharpness: Float) -> CHHapticEvent {
        CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
            ],
            relativeTime: time,
            duration: duration
        )
    }

    /// A tap is over in a few milliseconds, which testers found too faint,
    /// especially through a pocket. Each pulse is now a sharp tap to mark
    /// the moment plus a short full-strength rumble behind it, so it is felt
    /// as a solid knock. The rhythms are unchanged: one knock, three knocks,
    /// one long buzz, two light knocks.
    private func pulse(_ time: TimeInterval, _ length: TimeInterval, intensity: Float) -> [CHHapticEvent] {
        [tap(time, intensity: intensity, sharpness: 0.7), hold(time, length, intensity: intensity, sharpness: 0.4)]
    }

    private func events(for type: String) -> [CHHapticEvent] {
        switch type {
        case "reference_bad":
            return [tap(0, intensity: 1, sharpness: 0.5), hold(0, 0.6, intensity: 1, sharpness: 0.3)]
        case "reference_ok":
            return pulse(0, 0.08, intensity: 1) + pulse(0.16, 0.08, intensity: 1) + pulse(0.32, 0.08, intensity: 1)
        case "start":
            return pulse(0, 0.06, intensity: 0.85)
        case "ready":
            return pulse(0, 0.05, intensity: 0.7) + pulse(0.14, 0.05, intensity: 0.7)
        default: // marker
            return pulse(0, 0.12, intensity: 1)
        }
    }

    func play(_ type: String) {
        guard let engine = readyEngine() else {
            fallback(type)
            return
        }
        do {
            let pattern = try CHHapticPattern(events: events(for: type), parameters: [])
            let player = try engine.makePlayer(with: pattern)
            try player.start(atTime: CHHapticTimeImmediate)
            played += 1
            heavy.prepare()
        } catch {
            lastError = "play: \(error.localizedDescription)"
            engineRunning = false
            fallback(type)
        }
    }

    /// Devices without Core Haptics (or if it fails): UIKit feedback, and the
    /// system vibration for the long "wrong" buzz.
    private func fallback(_ type: String) {
        fellBack += 1
        switch type {
        case "reference_bad":
            AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
        case "reference_ok":
            heavy.impactOccurred()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.11) { [heavy] in heavy.impactOccurred() }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) { [heavy] in heavy.impactOccurred() }
        case "ready":
            light.impactOccurred()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.095) { [light] in light.impactOccurred() }
        case "start":
            medium.impactOccurred()
        default:
            heavy.impactOccurred()
        }
        heavy.prepare()
    }
}

// MARK: - Siri and Shortcuts

/// Hands an activity requested by Siri or Shortcuts to the web code. A cold
/// launch keeps it as "pending" until the page asks; a running app gets it
/// through the plugin's "openScreen" event.
final class GSShortcutRouter {
    static let shared = GSShortcutRouter()
    static let didRequest = Notification.Name("GSShortcutRouterDidRequest")

    private let lock = NSLock()
    private var pending: String?

    func request(_ screen: String) {
        lock.lock()
        pending = screen
        lock.unlock()
        NotificationCenter.default.post(name: Self.didRequest, object: nil, userInfo: ["screen": screen])
    }

    @discardableResult
    func consume() -> String? {
        lock.lock()
        defer { lock.unlock() }
        let screen = pending
        pending = nil
        return screen
    }
}

@available(iOS 16.0, *)
struct OpenPracticeIntent: AppIntent {
    static let title: LocalizedStringResource = "Practice my timing"
    static let description = IntentDescription("Opens Practice my timing in CrossingTime.")
    static let openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        GSShortcutRouter.shared.request("practice")
        return .result()
    }
}

@available(iOS 16.0, *)
struct OpenPreparationIntent: AppIntent {
    static let title: LocalizedStringResource = "Comparison preparation"
    static let description = IntentDescription("Opens Comparison preparation in CrossingTime.")
    static let openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        GSShortcutRouter.shared.request("signal")
        return .result()
    }
}

@available(iOS 16.0, *)
struct OpenComparisonIntent: AppIntent {
    static let title: LocalizedStringResource = "Comparison practice"
    static let description = IntentDescription("Opens Comparison practice in CrossingTime.")
    static let openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        GSShortcutRouter.shared.request("compare")
        return .result()
    }
}

@available(iOS 16.0, *)
struct OpenStreetIntent: AppIntent {
    static let title: LocalizedStringResource = "At the street"
    static let description = IntentDescription("Opens At the street in CrossingTime.")
    static let openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        GSShortcutRouter.shared.request("live")
        return .result()
    }
}

/// Phrases Siri recognizes with no setup. Every phrase must contain the app
/// name; Info.plist keeps "Gap Sense" (the name until build 15) as an alternative.
@available(iOS 16.0, *)
struct GapSenseShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenPracticeIntent(),
            phrases: ["Practice my timing in \(.applicationName)", "Open Practice my timing in \(.applicationName)"],
            shortTitle: "Practice my timing",
            systemImageName: "metronome"
        )
        AppShortcut(
            intent: OpenPreparationIntent(),
            phrases: ["Comparison preparation in \(.applicationName)", "Open Comparison preparation in \(.applicationName)"],
            shortTitle: "Comparison preparation",
            systemImageName: "timer"
        )
        AppShortcut(
            intent: OpenComparisonIntent(),
            phrases: ["Comparison practice in \(.applicationName)", "Open Comparison practice in \(.applicationName)"],
            shortTitle: "Comparison practice",
            systemImageName: "arrow.left.arrow.right"
        )
        AppShortcut(
            intent: OpenStreetIntent(),
            phrases: ["At the street in \(.applicationName)", "Open At the street in \(.applicationName)"],
            shortTitle: "At the street",
            systemImageName: "figure.walk"
        )
    }
}

// MARK: - Diagnostics (simulator checks only)

/// Launched with `-GSSelfTest YES`, the app writes a one-line report of its
/// web layer to the device log a few seconds after start: plugins present,
/// sound engine state, speech, the screen showing. With `-GSSelfTestScreen
/// <name>` it first asks for that screen through the Siri path. Never runs in
/// normal use.
enum GSSelfTest {
    private static var ran = false

    static func runIfRequested(in webView: WKWebView?) {
        let defaults = UserDefaults.standard
        guard !ran, defaults.bool(forKey: "GSSelfTest"), let webView = webView else { return }
        ran = true
        if let screen = defaults.string(forKey: "GSSelfTestScreen"), !screen.isEmpty {
            GSShortcutRouter.shared.request(screen)
        }
        // A full scripted check, passed base64-encoded as -GSSelfTestScript.
        // Its result is logged in chunks (the device log truncates long lines).
        if let encoded = defaults.string(forKey: "GSSelfTestScript"),
           let data = Data(base64Encoded: encoded),
           let custom = String(data: data, encoding: .utf8) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                webView.callAsyncJavaScript(custom, arguments: [:], in: nil, in: .page) { result in
                    let text: String
                    switch result {
                    case .success(let value): text = String(describing: value)
                    case .failure(let error): text = "FAILED " + error.localizedDescription
                    }
                    let chunks = stride(from: 0, to: text.count, by: 700).map { start -> String in
                        let from = text.index(text.startIndex, offsetBy: start)
                        let to = text.index(from, offsetBy: min(700, text.count - start))
                        return String(text[from..<to])
                    }
                    for (index, chunk) in chunks.enumerated() {
                        NSLog("[GapSense] result %d/%d %@", index + 1, chunks.count, chunk)
                    }
                    NSLog("[GapSense] result end")
                }
            }
            return
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
            let script = """
            const r = {};
            try {
              r.gsnative = Boolean(window.Capacitor?.Plugins?.GSNative);
              r.share = Boolean(window.Capacitor?.Plugins?.Share);
              r.app = Boolean(window.Capacitor?.Plugins?.App);
              r.build = typeof GS_APP_BUILD === "undefined" ? null : GS_APP_BUILD;
              const ctx = ensureAudioContext();
              await new Promise((res) => setTimeout(res, 600));
              r.audio = ctx.state;
              r.audioSession = navigator.audioSession ? navigator.audioSession.type : "none";
              r.speech = typeof speechAvailable === "function" ? speechAvailable() : null;
              r.vibrate = a11ySettings.vibrate;
              r.title = document.getElementById("screenTitle")?.textContent;
              r.haptics = document.getElementById("hapticsSupportNote")?.textContent?.slice(0, 40);
              hapticCue("marker");
              playFeedbackTone("acceptable", 0.05);
              await new Promise((res) => setTimeout(res, 300));
              r.audioAfterTone = ctx.state;
            } catch (e) { r.error = String(e); }
            return JSON.stringify(r);
            """
            webView.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { result in
                switch result {
                case .success(let value):
                    NSLog("[GapSense] selftest %@", String(describing: value))
                case .failure(let error):
                    NSLog("[GapSense] selftest failed %@", error.localizedDescription)
                }
            }
        }
    }
}


/// A transparent view that VoiceOver treats as a direct-touch area. It reads
/// one finger: where it went down, where it lifted, and how long it took,
/// and classifies the gesture with the same thresholds as the web pads
/// (36 pt; vertical wins a tie). The page gets the result as an event and
/// times the vehicle from the touch-down, not the lift.
final class GSDirectTouchView: UIView {
    var onGesture: ((String, Double, Double, Double) -> Void)?
    private var startPoint: CGPoint?
    private var startTime: TimeInterval = 0
    private var trackedTouch: UITouch?
    private let minSwipe: CGFloat = 36

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        isMultipleTouchEnabled = false
        isAccessibilityElement = true
        accessibilityTraits = [.allowsDirectInteraction]
        accessibilityHint = "Direct touch area. Swipe or tap here as you would without VoiceOver."
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard trackedTouch == nil, let touch = touches.first else { return }
        trackedTouch = touch
        startPoint = touch.location(in: self)
        startTime = touch.timestamp
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = trackedTouch, touches.contains(touch), let start = startPoint else { return }
        let end = touch.location(in: self)
        let dx = end.x - start.x
        let dy = end.y - start.y
        let durationMs = max(0, (touch.timestamp - startTime) * 1000)
        let kind: String
        if abs(dx) < minSwipe && abs(dy) < minSwipe {
            kind = "tap"
        } else if abs(dy) >= abs(dx) {
            kind = dy < 0 ? "up" : "down"
        } else {
            kind = dx < 0 ? "left" : "right"
        }
        trackedTouch = nil
        startPoint = nil
        onGesture?(kind, durationMs, Double(dx), Double(dy))
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        trackedTouch = nil
        startPoint = nil
    }

    /// VoiceOver's two-finger scrub ("go back") on the area: the page does
    /// what the pad's Back button does (tracker 13.7).
    override func accessibilityPerformEscape() -> Bool {
        onGesture?("escape", 0, 0, 0)
        return true
    }
}

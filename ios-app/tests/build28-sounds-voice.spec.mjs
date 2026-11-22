import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { watchErrors, openApp, setTimes } from "./helpers.mjs";

/* Build 28 (tracker F14, and Azizul 21 Nov 2026): designed sounds in place of
 * the plain tones, and a recorded natural voice in place of the phone's
 * robotic one. */

const WWW = new URL("../www/", import.meta.url);
const ROLES = ["right-a", "right-b", "wrong-a", "wrong-b", "marker", "confirm", "reference"];

const cuesLoaded = (page, style = "bright") => page.waitForFunction(
  ([s, roles]) => roles.every((r) => Boolean(cueBuffers[`${s}/${r}`])), [style, ROLES]
);

/* A stand-in for the phone's voice that records what it is asked to say. */
async function fakePhoneVoice(page) {
  await page.evaluate(() => {
    window.__spoken = [];
    const fake = {
      speaking: false,
      cancel() {},
      speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 10); },
      getVoices() { return []; }
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  });
}

test("sounds: the Bright style is the default, its seven recordings load, and a cue plays the recording, not a tone", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  expect(await page.evaluate(() => gsSoundStyle())).toBe("bright");
  await cuesLoaded(page);
  const result = await page.evaluate(() => {
    let oscillators = 0;
    const real = audioContext.createOscillator.bind(audioContext);
    audioContext.createOscillator = () => { oscillators += 1; return real(); };
    const before = gsCuesPlayed;
    playFeedbackTone("acceptable", 0.05);
    playFeedbackTone("outside", 0.3);
    playUserMarkerTone(0.6);
    playConfirmTone(0.8);
    playReferenceTick(1.0);
    return { cues: gsCuesPlayed - before, oscillators };
  });
  expect(result).toEqual({ cues: 5, oscillators: 0 });
  expect(errors).toEqual([]);
});

test("sounds: Classic keeps the tones of earlier builds, and a recording that is not loaded falls back to its tone", async ({ page }) => {
  await openApp(page, { storage: { "om-sound-style": "classic" } });
  const classic = await page.evaluate(() => {
    ensureAudioContext();
    let oscillators = 0;
    const real = audioContext.createOscillator.bind(audioContext);
    audioContext.createOscillator = () => { oscillators += 1; return real(); };
    const before = gsCuesPlayed;
    playFeedbackTone("acceptable", 0.05);
    playUserMarkerTone(0.3);
    return { cues: gsCuesPlayed - before, oscillators, sample: gsSamplePartials().map((p) => Math.round(p.freq)) };
  });
  expect(classic.cues).toBe(0);
  expect(classic.oscillators).toBe(4);            // two partials each, as before
  expect(classic.sample).toEqual([392, 466]);     // the two tones a minor third apart

  await openApp(page);
  await cuesLoaded(page);
  const missing = await page.evaluate(() => {
    delete cueBuffers["bright/marker"];
    cueLoading.bright = true;                      // do not fetch it again during the test
    let oscillators = 0;
    const real = audioContext.createOscillator.bind(audioContext);
    audioContext.createOscillator = () => { oscillators += 1; return real(); };
    playUserMarkerTone(0.05);
    return oscillators;
  });
  expect(missing).toBe(2);
});

test("sounds: right and wrong differ from the first moment, and every recording starts on its first sample", async ({ page }) => {
  await openApp(page);
  for (const style of ["bright", "warm"]) {
    await page.evaluate((s) => gsSetSoundStyle(s), style);
    await cuesLoaded(page, style);
    const measured = await page.evaluate(([s, roles]) => {
      const out = {};
      for (const role of roles) {
        const buffer = cueBuffers[`${s}/${role}`];
        const data = buffer.getChannelData(0);
        const rate = buffer.sampleRate;
        let peak = 0;
        for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
        let first = 0;
        while (first < data.length && Math.abs(data[first]) < peak * 0.05) first += 1;
        // The strongest pitch in the first 80 ms, 120 Hz to 2 kHz (Goertzel).
        const n = Math.round(0.08 * rate);
        let best = 0, bestHz = 0;
        for (let hz = 120; hz <= 2000; hz += 4) {
          const k = 2 * Math.cos(2 * Math.PI * hz / rate);
          let s1 = 0, s2 = 0;
          for (let i = 0; i < n; i += 1) { const s0 = data[i] + k * s1 - s2; s2 = s1; s1 = s0; }
          const power = s1 * s1 + s2 * s2 - k * s1 * s2;
          if (power > best) { best = power; bestHz = hz; }
        }
        out[role] = { startMs: (first / rate) * 1000, hz: bestHz, peak, seconds: buffer.duration };
      }
      return out;
    }, [style, ROLES]);
    for (const role of ROLES) {
      expect(measured[role].startMs, `${style}/${role} starts at once`).toBeLessThan(1.5);
      expect(measured[role].peak, `${style}/${role} level`).toBeGreaterThan(0.8);
      expect(measured[role].peak).toBeLessThanOrEqual(0.9);
      expect(measured[role].seconds).toBeLessThan(1.1);
    }
    // Choice A, the default pair: the wrong sound opens at least a fifth
    // below the right sound, so one note is enough to tell them apart.
    expect(measured["wrong-a"].hz, `${style}: wrong-a opens low`).toBeLessThan(measured["right-a"].hz / 1.5);
    // The student's own sound is the shortest of all.
    expect(measured.marker.seconds).toBeLessThan(measured["right-a"].seconds);
    expect(measured.marker.seconds).toBeLessThan(measured["wrong-a"].seconds);
  }
});

test("sounds: the recorded cue and the steady warning sound together stay under full scale, and the cue is heard", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await cuesLoaded(page);
  const result = await page.evaluate(async () => {
    const rate = 48000;
    const offline = new OfflineAudioContext(1, rate * 3, rate);
    const stage = gsBuildOutputStage(offline);
    const saved = [audioContext, masterLimiter, cueOutput];
    audioContext = offline;
    masterLimiter = stage.tones;
    cueOutput = stage.cues;
    playCompositeTone.retrying = true;
    gsPlayCue.retrying = true;
    playCompositeTone(gsSamplePartials(), 2.0, 0.1, gsSampleLevel(), "steady");
    playUserMarkerTone(1.0);
    playFeedbackTone("acceptable", 1.0);       // the worst case: two cues on the same instant
    playCompositeTone.retrying = false;
    gsPlayCue.retrying = false;
    [audioContext, masterLimiter, cueOutput] = saved;
    const data = (await offline.startRendering()).getChannelData(0);
    const rms = (from, to) => {
      let sum = 0;
      const a = Math.round(from * rate), b = Math.round(to * rate);
      for (let i = a; i < b; i += 1) sum += data[i] * data[i];
      return Math.sqrt(sum / (b - a));
    };
    let peak = 0;
    for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    return { peak, alone: rms(0.5, 0.9), withCue: rms(1.0, 1.1), tail: rms(2.6, 2.9) };
  });
  expect(result.peak).toBeLessThanOrEqual(1.0);
  expect(result.alone).toBeGreaterThan(0.2);            // the steady sound is there
  expect(result.withCue).toBeGreaterThan(0.2);          // and the cue over it
  expect(result.tail).toBeLessThan(0.01);               // everything has ended
});

test("sounds: the warning-time sound is one note with its own overtones, and Sound pitch also moves the cues", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < GS_SAMPLE_PITCHES.length; i += 1) {
      gsSetSamplePitchIndex(i);
      const partials = gsSamplePartials();
      out[i] = {
        ratios: partials.map((p) => Math.round((p.freq / partials[0].freq) * 100) / 100),
        sum: partials.reduce((a, p) => a + p.gain, 0),
        rate: gsCueRate()
      };
    }
    return out;
  });
  for (const i of [0, 1, 2, 3, 4]) {
    expect(result[i].ratios).toEqual([1, 2, 3, 4]);     // whole multiples: no beat to count by
    expect(result[i].sum).toBeLessThanOrEqual(0.801);   // the gain budget of the tones
  }
  expect(result[3].rate).toBe(1);                       // Medium: as recorded
  expect(result[0].rate).toBeLessThan(result[1].rate);
  expect(result[1].rate).toBeLessThan(result[2].rate);
  expect(result[2].rate).toBeLessThan(1);
  expect(result[4].rate).toBeGreaterThan(1);
  expect(result[0].rate).toBeGreaterThan(0.7);          // never so far that it sounds unnatural
  expect(result[4].rate).toBeLessThan(1.2);
});

test("sounds: Settings offers the three styles, remembers the choice, and names the sounds for what they mean", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await page.evaluate(() => document.getElementById("settingsModal").showModal());
  await expect(page.locator("input[name='soundStyle'][value='bright']")).toBeChecked();
  await expect(page.locator("label[for='acceptable-a']")).toHaveText("Right sound A");
  await expect(page.locator("label[for='outside-b']")).toHaveText("Wrong sound B");
  await expect(page.locator(".preview-btn[data-sound='outside-a']")).toHaveText("Play Wrong sound A");
  await page.locator("input[name='soundStyle'][value='warm']").check();
  expect(await page.evaluate(() => localStorage.getItem("om-sound-style"))).toBe("warm");
  await cuesLoaded(page, "warm");
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await expect(page.locator("input[name='soundStyle'][value='warm']")).toBeChecked();
  expect(await page.evaluate(() => gsSoundStyle())).toBe("warm");
  // An unknown stored value is not trusted.
  await page.evaluate(() => localStorage.setItem("om-sound-style", "loud"));
  expect(await page.evaluate(() => gsSoundStyle())).toBe("bright");
  expect(errors).toEqual([]);
});

test("sounds: Back still silences a recorded cue that is scheduled or playing", async ({ page }) => {
  await openApp(page);
  await cuesLoaded(page);
  const result = await page.evaluate(() => {
    const stopped = [];
    const real = audioContext.createBufferSource.bind(audioContext);
    audioContext.createBufferSource = () => {
      const node = real();
      const stop = node.stop.bind(node);
      node.stop = (when) => { stopped.push(when); stop(when); };
      return node;
    };
    playFeedbackTone("acceptable", 2);
    playUserMarkerTone(0);
    stopAllSound();
    return { stopped: stopped.length, left: scheduledSounds.length };
  });
  expect(result).toEqual({ stopped: 2, left: 0 });
});

test("iPhone app: recorded cues go to the app's own player by name, with the pitch setting, and never to web audio", async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    window.__native = { tones: [], cues: [], clips: [], speech: [] };
    window.__audioContexts = 0;
    const RealContext = window.AudioContext;
    window.AudioContext = function (...args) { window.__audioContexts += 1; return new RealContext(...args); };
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      Plugins: {
        GSNative: {
          haptic: async () => {},
          pendingScreen: async () => ({}),
          tone: async (args) => { window.__native.tones.push(args); return { id: 1 }; },
          cue: async (args) => { window.__native.cues.push(args); return { played: true }; },
          cueList: async () => ({ names: ["bright/right-a", "bright/wrong-a", "bright/marker", "bright/confirm", "bright/reference", "bright/right-b"] }),
          sustainStart: async () => ({ id: 2 }),
          sustainStop: async () => {},
          stopSound: async () => {},
          audioStatus: async () => ({ engineRunning: true, ignoresSilentSwitch: true, outputVolume: 1, outputLatency: 0.01, route: "Speaker", peak: 0.9, tonesStarted: 1 }),
          speak: async (args) => { window.__native.speech.push(args); },
          speakClips: async (args) => { window.__native.clips.push(args); await new Promise((r) => setTimeout(r, 150)); return { completed: !window.__native.failClips }; },
          stopSpeaking: async () => { window.__native.speech.push("stop"); },
          addListener: () => ({ remove: () => {} })
        },
        App: { getInfo: async () => ({ version: "1.0", build: "28" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  });
  await openApp(page, { voice: "natural" });
  await setTimes(page);
  await page.waitForFunction(() => nativeCueNames && nativeCueNames.size === 6 && gsVoiceManifest);
  await page.evaluate(() => {
    gsSetSamplePitchIndex(1);                 // Low: the cues go down too
    playFeedbackTone("acceptable", 0.5);
    playUserMarkerTone(1.25);
    localStorage.setItem("om-feedback-outside", "outside-b");
    playFeedbackTone("outside", 2);          // wrong-b is not in this copy of the app: its tone plays
  });
  const native = await page.evaluate(() => window.__native);
  expect(native.cues.map((c) => c.name)).toEqual(["bright/right-a", "bright/marker"]);
  expect(native.cues[0]).toMatchObject({ delay: 0.5, level: 1 });
  expect(native.cues[0].rate).toBeCloseTo(Math.pow(2, -4 / 12), 5);
  expect(native.tones.length).toBe(1);
  expect(native.tones[0]).toMatchObject({ delay: 2, envelope: "pulse" });

  // The recorded voice: file names to the app's player; the phone's voice
  // only when the player could not play them.
  await page.evaluate(() => gsSpeak("Get ready"));
  expect(await page.evaluate(() => gsSpeechBusy())).toBe(true);
  await page.waitForFunction(() => !gsSpeechBusy());
  let after = await page.evaluate(() => window.__native);
  expect(after.clips.length).toBe(1);
  expect(after.clips[0].files.length).toBe(1);
  expect(after.clips[0].files[0]).toMatch(/^[a-z0-9]{10}$/);
  expect(after.speech.filter((s) => typeof s === "object")).toEqual([]);
  await page.evaluate(() => { window.__native.failClips = true; gsSpeak("Replay"); });
  await page.waitForFunction(() => window.__native.speech.some((s) => typeof s === "object"));
  after = await page.evaluate(() => window.__native);
  expect(after.speech.find((s) => typeof s === "object")).toMatchObject({ text: "Replay" });
  expect(await page.evaluate(() => window.__audioContexts)).toBe(0);
  expect(errors).toEqual([]);
});

test("voice: every sentence in the list has its recording on disk, and the files are real sound", async () => {
  const manifest = JSON.parse(readFileSync(new URL("voice/manifest.json", WWW), "utf8"));
  const names = Object.values(manifest.clips);
  expect(names.length).toBeGreaterThan(500);
  const onDisk = new Set(readdirSync(new URL("voice/", WWW)).filter((n) => n.endsWith(".mp3")));
  for (const name of names) {
    expect(name).toMatch(/^[a-z0-9]{10}$/);
    expect(onDisk.has(`${name}.mp3`), `${name}.mp3`).toBe(true);
    expect(statSync(new URL(`voice/${name}.mp3`, WWW)).size).toBeGreaterThan(1500);
  }
  expect(onDisk.size).toBe(new Set(names).size);        // and no file nobody asks for
  // The sound files the offline cache lists are all there too.
  const sw = readFileSync(new URL("sw.js", WWW), "utf8");
  for (const style of ["bright", "warm"]) {
    for (const role of ROLES) {
      expect(sw).toContain(`"./sounds/${style}/${role}.wav"`);
      expect(statSync(new URL(`sounds/${style}/${role}.wav`, WWW)).size).toBeGreaterThan(10000);
    }
  }
  expect(sw).toContain('"./voice/manifest.json"');
});

test("voice: what the app says by default all has a recording; a number or a name goes to the phone's voice", async ({ page }) => {
  await openApp(page, { voice: "natural" });
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  const result = await page.evaluate(() => {
    const said = [
      "Get ready", "Get ready.", "Replay", "Correct.",
      "Not correct. It was longer.", "Not correct. It was shorter.", "Not correct. It was about the same.",
      "Within the margin.", "Outside the margin.",
      "That was your taps, then the crossing time: within the margin. Ready for another try.",
      "That was the sample, your stop, and your crossing time: outside the margin. Ready for another.",
      "That was the sample warning time, then your own sound where your crossing time ends.",
      "Ready for the next vehicle.", "This is the speaking rate.", "This is the voice.",
      "Verbosity high.", "Verbosity medium.", "Verbosity low."
    ];
    const missing = said.filter((text) => !gsVoiceClipsFor(text));
    return {
      missing,
      two: gsVoiceClipsFor("Not correct. It was longer.").length,
      number: gsVoiceClipsFor("You were 0.4 seconds early."),
      mixed: gsVoiceClipsFor("Correct. You were 0.4 seconds early."),
      name: gsVoiceClipsFor("Now showing student AB1."),
      same: gsVoiceClipsFor("Get ready")[0] === gsVoiceClipsFor("  get   READY.​ ")[0],
      question: gsVoiceKey("Was it longer?")
    };
  });
  expect(result.missing).toEqual([]);
  expect(result.two).toBe(2);
  expect(result.number).toBeNull();
  expect(result.mixed).toBeNull();                 // one message never changes voice half-way
  expect(result.name).toBeNull();
  expect(result.same).toBe(true);
  expect(result.question).toBe("was it longer?");
});

test("voice: 'Get ready' is played from its recording, counts as speaking, and tells the caller when it has ended", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { voice: "natural" });
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  await fakePhoneVoice(page);
  await page.evaluate(() => {
    window.__done = 0;
    window.__startedAt = performance.now();
    gsSpeak("Get ready", { onDone: () => { window.__done += 1; window.__doneAt = performance.now(); }, maxWaitMs: 8000 });
  });
  expect(await page.evaluate(() => gsSpeechBusy())).toBe(true);
  await page.waitForFunction(() => window.__done === 1, null, { timeout: 8000 });
  const result = await page.evaluate(() => ({
    spoken: window.__spoken, busy: gsSpeechBusy(), tookMs: window.__doneAt - window.__startedAt,
    seconds: gsVoiceAudio().duration, played: gsVoiceClipsPlayed
  }));
  expect(result.spoken).toEqual([]);               // the phone's voice was not used
  expect(result.busy).toBe(false);
  expect(result.played).toBe(1);
  expect(result.seconds).toBeGreaterThan(0.3);
  expect(result.seconds).toBeLessThan(2);
  expect(result.tookMs).toBeGreaterThan(result.seconds * 1000 * 0.8);   // it waited for the words
  expect(errors).toEqual([]);
});

test("voice: two sentences play one after the other; stopping cuts them and still releases the caller", async ({ page }) => {
  await openApp(page, { voice: "natural" });
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  await fakePhoneVoice(page);
  await page.evaluate(() => {
    window.__sources = [];
    const el = gsVoiceAudio();
    el.addEventListener("playing", () => window.__sources.push(el.currentSrc));
    window.__done = 0;
    gsSpeak("Not correct. It was longer.", { onDone: () => { window.__done += 1; }, maxWaitMs: 15000 });
  });
  await page.waitForFunction(() => window.__done === 1, null, { timeout: 15000 });
  const sources = await page.evaluate(() => window.__sources);
  expect(sources.length).toBe(2);
  expect(sources[0]).not.toBe(sources[1]);

  await page.evaluate(() => {
    window.__done = 0;
    gsSpeak("That was your taps, then the crossing time: within the margin. Ready for another try.", { onDone: () => { window.__done += 1; }, maxWaitMs: 15000 });
  });
  await page.waitForFunction(() => !gsVoiceAudio().paused);
  await page.evaluate(() => gsStopSpeech());
  expect(await page.evaluate(() => ({ done: window.__done, busy: gsSpeechBusy(), paused: gsVoiceAudio().paused })))
    .toEqual({ done: 1, busy: false, paused: true });
  expect(await page.evaluate(() => window.__spoken)).toEqual([]);
});

test("voice: text with no recording, a missing file, and 'This phone's own voice' all use the phone's voice", async ({ page }) => {
  await openApp(page, { voice: "natural" });
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  await fakePhoneVoice(page);
  // 1. A number of seconds.
  await page.evaluate(() => gsSpeak("You were 0.4 seconds early."));
  expect(await page.evaluate(() => window.__spoken)).toEqual(["You were 0.4 seconds early."]);
  // 2. The recording cannot be fetched (offline before it was ever heard).
  await page.route("**/voice/*.mp3", (route) => route.abort());
  await page.evaluate(() => {
    window.__spoken = [];
    window.__done = 0;
    gsVoiceBlobUrls.clear();
    gsSpeak("Correct.", { onDone: () => { window.__done += 1; } });
  });
  await page.waitForFunction(() => window.__done === 1);
  expect(await page.evaluate(() => window.__spoken)).toEqual(["Correct."]);
  await page.unroute("**/voice/*.mp3");
  // 3. The setting.
  await page.evaluate(() => document.getElementById("a11yModal").showModal());
  await expect(page.locator("#a11yVoice")).toHaveValue("natural");
  await page.evaluate(() => { window.__spoken = []; });
  await page.locator("#a11yVoice").selectOption("phone");
  expect(await page.evaluate(() => localStorage.getItem("om-voice"))).toBe("phone");
  expect(await page.evaluate(() => window.__spoken)).toEqual(["This is the voice."]);
  await page.evaluate(() => { window.__spoken = []; gsSpeak("Get ready"); });
  expect(await page.evaluate(() => window.__spoken)).toEqual(["Get ready"]);
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await expect(page.locator("#a11yVoice")).toHaveValue("phone");
});

test("voice: a phone with no speech engine still says its recorded sentences (tracker 27.15)", async ({ page }) => {
  await openApp(page, { voice: "natural" });
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  const result = await page.evaluate(async () => {
    Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true });
    const out = { available: speechAvailable() };
    out.recorded = gsSpeak("Get ready");
    out.unrecorded = await new Promise((resolve) => {
      gsStopSpeech();
      const said = gsSpeak("You were 0.4 seconds early.", { onDone: () => resolve(`done:${said}`) });
    });
    return out;
  });
  expect(result).toEqual({ available: false, recorded: true, unrecorded: "done:false" });
});

test("voice: the speaking rate is carried to the recording, and visual-only output says nothing", async ({ page }) => {
  await openApp(page, { voice: "natural", storage: { "om-a11y-speech-rate": "1.25" } });
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  await page.evaluate(() => gsSpeak("Get ready"));
  await page.waitForFunction(() => !gsVoiceAudio().paused);
  expect(await page.evaluate(() => gsVoiceAudio().playbackRate)).toBe(1.25);
  await page.evaluate(() => gsStopSpeech());
  const quiet = await page.evaluate(() => {
    a11ySettings.outputMode = "visual-only";
    const before = gsVoiceClipsPlayed;
    const said = gsSpeak("Get ready");
    return { said, played: gsVoiceClipsPlayed - before };
  });
  expect(quiet).toEqual({ said: false, played: 0 });
});

test("preparation with the recorded voice: Ready says 'Get ready' from the recording, and the wait starts when the words end", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { voice: "natural" });
  await setTimes(page, "4", "8", "0.4");
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  await fakePhoneVoice(page);
  await page.evaluate(() => gsShowScreen("signal"));
  await expect(page.locator("#screen-signal")).toBeVisible();
  const before = await page.evaluate(() => gsVoiceClipsPlayed);
  await page.locator("#signalBtn").click();
  await page.waitForFunction((n) => gsVoiceClipsPlayed > n, before);
  await page.waitForFunction(() => !gsSpeechBusy(), null, { timeout: 8000 });
  expect(await page.evaluate(() => window.__spoken)).toEqual([]);
  // The activity went on to its waiting stage, exactly as with the phone's voice.
  await expect(page.locator("#signalBtn")).toContainText(/WAIT|NOW/i, { timeout: 12000 });
  expect(errors).toEqual([]);
});

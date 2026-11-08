import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes } from "./helpers.mjs";

/* A stand-in for the iPhone app's GSNative plugin with the build 9 sound
 * methods. Records every call; the volume can be set from the test. */
function nativeIos({ volume = 1 } = {}) {
  return (startVolume) => {
    window.__native = { tones: [], sustained: [], stopped: [], speech: [], volume: startVolume, listeners: {} };
    window.__audioContexts = 0;
    const RealContext = window.AudioContext;
    window.AudioContext = function (...args) { window.__audioContexts += 1; return new RealContext(...args); };
    let nextId = 1;
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      Plugins: {
        GSNative: {
          haptic: async () => {},
          pendingScreen: async () => ({}),
          tone: async (args) => { window.__native.tones.push(args); return { id: nextId++ }; },
          sustainStart: async (args) => {
            await new Promise((r) => setTimeout(r, 30));
            const id = nextId++;
            window.__native.sustained.push({ id, ...args });
            return { id };
          },
          sustainStop: async ({ id }) => { window.__native.stopped.push(id); },
          stopSound: async () => {},
          audioStatus: async () => ({
            engineRunning: true, category: "AVAudioSessionCategoryPlayback", ignoresSilentSwitch: true,
            outputVolume: window.__native.volume, outputLatency: 0.012, route: "Speaker", peak: 0.9, tonesStarted: 1
          }),
          speak: async (args) => { window.__native.speech.push(args); await new Promise((r) => setTimeout(r, 200)); },
          stopSpeaking: async () => { window.__native.speech.push("stop"); },
          addListener: (name, fn) => { window.__native.listeners[name] = fn; return { remove: () => {} }; }
        },
        App: { getInfo: async () => ({ version: "1.0", build: "9" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  };
}

test("iPhone app: every tone and spoken prompt goes to the native player, and no web audio is created", async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(nativeIos(), 1);
  await openApp(page);
  await setTimes(page);
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.evaluate(() => {
    playFeedbackTone("acceptable", 0.5);
    playCompositeTone(gsSamplePartials(), 2, 0.1, gsSampleLevel(), "steady");
    playUserMarkerTone(1.25);
  });
  const tones = await page.evaluate(() => window.__native.tones);
  expect(tones.length).toBe(3);
  expect(tones[0]).toMatchObject({ delay: 0.5, envelope: "pulse" });
  expect(tones[1]).toMatchObject({ duration: 2, delay: 0.1, envelope: "steady", level: 1 });
  expect(tones[1].partials[0].freq).toBe(392);
  expect(tones[2].delay).toBe(1.25);
  // Speech goes native too, and "is it speaking" follows it.
  await page.evaluate(() => gsSpeak("Get ready"));
  expect(await page.evaluate(() => gsSpeechBusy())).toBe(true);
  await page.waitForFunction(() => !gsSpeechBusy());
  // Leaving a screen now stops any speech first ("stop" entries); the first
  // utterance is still "Get ready".
  expect(await page.evaluate(() => window.__native.speech.find((s) => typeof s === "object"))).toMatchObject({ text: "Get ready" });
  // The replays still get a running clock.
  const t1 = await page.evaluate(() => ensureAudioContext().currentTime);
  await page.waitForTimeout(120);
  const t2 = await page.evaluate(() => ensureAudioContext().currentTime);
  expect(t2 - t1).toBeGreaterThan(0.08);
  expect(await page.evaluate(() => window.__audioContexts)).toBe(0);
  expect(await page.evaluate(() => navigator.audioSession?.type ?? "none")).not.toBe("playback");
  expect(errors).toEqual([]);
});

test("iPhone app: a steady tone stopped before the player answers still stops", async ({ page }) => {
  await page.addInitScript(nativeIos(), 1);
  await openApp(page);
  await page.evaluate(() => { const stop = startSustainedTone(gsSamplePartials(), 1); stop(); });
  await page.waitForFunction(() => window.__native.stopped.length === 1);
  const { sustained, stopped } = await page.evaluate(() => window.__native);
  expect(stopped[0]).toBe(sustained[0].id);
});

test("iPhone app: at low phone volume the app says and shows nothing about it (22.7)", async ({ page }) => {
  await page.addInitScript(nativeIos(), 0.25);
  await openApp(page);
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.evaluate(() => { window.__native.volume = 0.1; window.__native.listeners.volume?.({ value: 0.1 }); });
  await expect(page.locator("#volumeTip")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.innerText)).not.toContain("volume up button");
  expect(await page.evaluate(() => document.getElementById("srAnnouncer").textContent)).not.toContain("volume");
});

test("iPhone app: Play a test sound reports the silent switch and the phone volume", async ({ page }) => {
  await page.addInitScript(nativeIos(), 0.3);
  await openApp(page);
  await page.evaluate(() => gsShowScreen("settings"));
  await page.evaluate(() => document.getElementById("soundTestBtn").click());
  await expect(page.locator("#soundTestNote")).toContainText("plays even with the silent switch on");
  await expect(page.locator("#soundTestNote")).toContainText("Phone volume 30%");
  // Build 24 (22.7): it reports the level but never tells the student to raise it.
  await expect(page.locator("#soundTestNote")).not.toContainText("volume up button");
  expect(await page.evaluate(() => window.__native.tones.length)).toBe(2);
});

test("web: cues pass through the loudness stage (quiet parts about 6 dB louder, peaks under full scale)", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(() => {
    ensureAudioContext();
    const curve = masterLimiter.curve;
    const at = (x) => curve[Math.round(((x + 1) / 2) * (curve.length - 1))];
    return { type: masterLimiter.constructor.name, quiet: at(0.3), full: at(1), mid: at(0) };
  });
  expect(result.type).toBe("WaveShaperNode");
  expect(result.quiet).toBeGreaterThan(0.55);
  expect(result.full).toBeCloseTo(1, 3);
  expect(Math.abs(result.mid)).toBeLessThan(0.01);
});

test("Android app: vibrations are long enough to feel, with the same rhythms", async ({ page }) => {
  await page.addInitScript(() => {
    window.__vib = [];
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "android",
      Plugins: {
        Haptics: { impact: async () => { window.__vib.push("impact"); }, vibrate: async ({ duration }) => { window.__vib.push(duration); } },
        App: { getInfo: async () => ({ version: "1.0", build: "9" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  });
  await openApp(page);
  await page.evaluate(() => { a11ySettings.vibrate = true; hapticCue("marker"); hapticCue("reference_ok"); hapticCue("reference_bad"); });
  await page.waitForTimeout(500);
  const vib = await page.evaluate(() => window.__vib);
  expect(vib).not.toContain("impact");
  expect(vib.sort((a, b) => a - b)).toEqual([70, 70, 70, 100, 550]);
});

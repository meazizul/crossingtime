import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick, waitUntil, answerOn, streetGesture, statusText } from "./helpers.mjs";

/*
 * Build 14: the student's sound and the mix (12.34, 12.35), Play it again
 * (F1), and the durable copy of the data (12.40).
 */

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

async function recordSounds(page) {
  await page.evaluate(() => {
    window.__sounds = [];
    const wrap = (name, kind) => {
      const real = window[name];
      window[name] = (...args) => {
        window.__sounds.push({ kind: kind(args), at: Number(name === "playCompositeTone" ? args[2] : name === "playFeedbackTone" ? args[1] : args[0]) || 0, len: name === "playCompositeTone" ? args[1] : 0, partials: name === "playCompositeTone" ? args[0] : null });
        return real(...args);
      };
    };
    wrap("playFeedbackTone", (a) => a[0]);
    wrap("playUserMarkerTone", () => "user");
    wrap("playConfirmTone", () => "confirm");
    wrap("playCompositeTone", (a) => (a[4] === "steady" ? "sample" : "tone"));
  });
}

test("12.34: the student's sound sits well above every sample pitch and its layers, and above the chimes", async ({ page }) => {
  await openApp(page);
  const marker = await page.evaluate(() => userSoundOptions.marker.partials.map((p) => p.freq));
  expect(Math.min(...marker)).toBeGreaterThanOrEqual(1000);
  const highestSample = await page.evaluate(() => Math.max(...GS_SAMPLE_PITCHES.map((p) => p.hz * 1.189)));
  expect(Math.min(...marker)).toBeGreaterThan(highestSample * 1.5);
  const chimes = await page.evaluate(() => Object.values(feedbackOptions.acceptable).flatMap((o) => o.partials.map((p) => p.freq)));
  expect(Math.min(...marker)).toBeGreaterThan(Math.max(...chimes));
});

test("12.34: the steady sound dips while the student's sound plays over it, and the mix stays under full scale", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  const result = await page.evaluate(async () => {
    const rate = 44100;
    const offline = new OfflineAudioContext(1, rate * 3, rate);
    const saved = [audioContext, masterLimiter, cueOutput];
    audioContext = offline;
    masterLimiter = offline.createGain();
    masterLimiter.connect(offline.destination);
    // Build 28: the student's sound is a recording now. It is left out of
    // this render (its output goes nowhere) so the level measured is the
    // steady sound's alone; build28-sounds-voice.spec.mjs renders the two
    // together through the real output chain.
    cueOutput = offline.createGain();
    playCompositeTone.retrying = true;
    gsPlayCue.retrying = true;
    playCompositeTone(gsSamplePartials(), 2.0, 0.1, gsSampleLevel(), "steady");   // the sample, 0.1 to 2.1 s
    playUserMarkerTone(1.0);                                                          // the student's sound at 1.0 s
    playCompositeTone.retrying = false;
    gsPlayCue.retrying = false;
    [audioContext, masterLimiter, cueOutput] = saved;
    const data = (await offline.startRendering()).getChannelData(0);
    // Goertzel at the sample's base pitch: how loud the sample is in a window.
    const level = (from, to, hz) => {
      const n = Math.round((to - from) * rate), start = Math.round(from * rate);
      const k = 2 * Math.cos(2 * Math.PI * hz / rate);
      let s0 = 0, s1 = 0, s2 = 0;
      for (let i = 0; i < n; i += 1) { s0 = data[start + i] + k * s1 - s2; s2 = s1; s1 = s0; }
      return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - k * s1 * s2)) / n;
    };
    const hz = gsSamplePartials()[0].freq;
    let peak = 0;
    for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    return { before: level(0.6, 0.9, hz), during: level(1.02, 1.12, hz), after: level(1.5, 1.8, hz), peak };
  });
  expect(result.during / result.before).toBeLessThan(0.45);      // ducked to about 30%
  expect(result.after / result.before).toBeGreaterThan(0.9);     // back to full afterwards
  expect(result.peak).toBeLessThanOrEqual(1.0);
});

test("12.35: the student's taps and their replay use the same sound, the student's own, by default", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("practice"));
  await recordSounds(page);
  await page.click("#actionBtn");                        // Begin
  await tick(page, 4000);
  await page.click("#actionBtn");                        // Halfway
  let kinds = await page.evaluate(() => window.__sounds.map((s) => s.kind));
  expect(kinds.filter((k) => k === "user").length).toBeGreaterThanOrEqual(2);   // the two taps (the replay is scheduled at once)
  expect(kinds).not.toContain("confirm");
  await tick(page, 8000);                                 // the replay
  kinds = await page.evaluate(() => window.__sounds.map((s) => s.kind));
  expect(kinds.filter((k) => k === "user").length).toBeGreaterThanOrEqual(4);  // taps + replayed taps
  expect(kinds).not.toContain("confirm");
  // The How much taps are the student's taps too.
  await page.evaluate(() => gsShowScreen("compare"));
  await page.evaluate(() => { window.__sounds = []; Object.assign(gsCompareState, { intervalSec: 10, crossingSec: 4, expected: "longer", phase: "howmuch" }); gsOpenHowMuchPad({ title: "How much longer?", onDone: gsCompareHowMuchDone, onBack: gsCompareHowMuchBack }); });
  await page.click("#compareFollowUpBtn");
  expect(await page.evaluate(() => window.__sounds.map((s) => s.kind).filter((k) => k !== "tone"))).toEqual(["user"]);
  // The old setting now names what it does.
  expect(await page.locator("label:has(#replayUsesConfirm)").innerText()).toContain("my own sound, for my taps and in every replay");
});

test("F1: Play it again replays the last try in Comparison practice, is never recorded, and goes away when a new sample starts", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  const again = page.locator("#comparePlayAgainBtn");
  await expect(again).toBeHidden();
  await page.evaluate(() => { Object.assign(gsCompareState, { intervalSec: 6, crossingSec: 4, expected: "longer", phase: "answering" }); gsCompareAskAnswer(); });
  await answerOn(page, "longer");
  await waitUntil(page, () => gsCompareState.phase === "idle", { ms: 45000, step: 250 });
  await expect(again).toBeVisible();
  // One swipe from Play: the button follows Play in the page.
  expect(await page.evaluate(() => document.getElementById("compareStartBtn").nextElementSibling.id)).toBe("comparePlayAgainBtn");
  await recordSounds(page);
  await again.click();
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("replaying");
  await expect(again).toHaveAttribute("aria-disabled", "true");
  await waitUntil(page, () => gsCompareState.phase === "idle", { ms: 45000, step: 250 });
  const kinds = await page.evaluate(() => window.__sounds.map((s) => s.kind));
  expect(kinds).toContain("sample");
  expect(kinds).toContain("user");
  expect(await history(page)).toHaveLength(1);           // not recorded
  await expect(again).toBeFocused();
  await expect(again).toBeVisible();                      // still there: again and again
  await page.click("#compareStartBtn");
  await expect(again).toBeHidden();                       // a new sample: the old replay is gone
  await waitUntil(page, () => gsCompareState.phase === "answering", { ms: 20000, step: 200 });
  await page.click("#answerBackBtn");
  await expect(again).toBeHidden();
});

test("F1: Play it again in Comparison preparation and At the street; the instructor can turn it off, and the student's switch hides it", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  // Preparation.
  await page.evaluate(() => { gsShowScreen("signal"); gsSignalState.phase = "timing"; gsSignalResolve(4.1); });
  await tick(page, 9000);
  await expect(page.locator("#signalPlayAgainBtn")).toBeVisible();
  await page.click("#signalPlayAgainBtn");
  expect(await page.evaluate(() => gsSignalState.phase)).toBe("replaying");
  await tick(page, 9000);
  expect(await page.evaluate(() => gsSignalState.phase)).toBe("idle");
  expect(await history(page)).toHaveLength(1);
  await expect(page.locator("#signalPlayAgainBtn")).toBeFocused();
  // The street.
  await page.evaluate(() => gsShowScreen("live"));
  await page.click("#liveStartBtn");
  await streetGesture(page, "left");
  await tick(page, 5000);
  await streetGesture(page, "tap");
  await answerOn(page, "longer");
  await waitUntil(page, () => gsLiveState.phase === "detect", { ms: 40000, step: 250 });
  await expect(page.locator("#livePlayAgainBtn")).toBeVisible();
  await page.click("#livePlayAgainBtn");
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("feedback");
  await waitUntil(page, () => gsLiveState.phase === "detect", { ms: 40000, step: 250 });
  expect(await history(page)).toHaveLength(2);
  await streetGesture(page, "right");
  await expect(page.locator("#livePlayAgainBtn")).toBeHidden();
  await page.click("#liveBackBtn");
  // The student's switch.
  await page.evaluate(() => { gsShowScreen("signal"); document.getElementById("signalOptions").open = true; });
  await page.click("#prepPlayAgainToggle");
  expect(await page.evaluate(() => localStorage.getItem("om-playAgain"))).toBe("false");
  await page.evaluate(() => { gsSignalState.phase = "timing"; gsSignalResolve(4.1); });
  await tick(page, 9000);
  await expect(page.locator("#signalPlayAgainBtn")).toBeHidden();
  // The instructor's option travels in the link and hides the student's switch.
  await openApp(page, { storage: { "om-features": JSON.stringify({ options: { playAgain: "off" } }) } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("signal"));
  await expect(page.locator("[data-feature-choice='playAgain']").first()).toBeHidden();
  expect(await page.evaluate(() => gsPlayAgainEnabled())).toBe(false);
  const token = await page.evaluate(() => { const f = gsLoadFeatures(); f.options.playAgain = "on"; gsSaveFeatures(f); return buildShareTimingToken({ times: false, contact: false, features: true, lock: false }); });
  expect(await page.evaluate((t) => parseShareToken(t).features.options.playAgain, token)).toBe("on");
});

test("12.40 web: every setting and the history are mirrored to IndexedDB, and come back after the browser's storage is wiped", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsLogAttempt({ activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 }));
  const status = await page.evaluate(async () => { await gsStore.syncNow(); return gsStore.status(); });
  expect(status.backend).toBe("indexeddb");
  expect(status.lastError).toBe("");
  expect(status.lastSavedAt).toBeGreaterThan(0);
  // Safari after seven days, or a phone low on space: local storage gone.
  // (The system wipes storage behind the app's back: no "cleared on purpose" flag.)
  await page.evaluate(() => gsStore.simulateLoss());
  await page.goto("/index.html");
  await page.waitForFunction(() => localStorage.getItem("om-attempt-log") && document.getElementById("screen-home"), null, { timeout: 15000 });
  expect(await page.evaluate(() => localStorage.getItem("om-full-time"))).toBe("8");
  expect(await history(page)).toHaveLength(1);
  // A fresh, empty app never overwrites the copy of real data (the race at start).
  await page.evaluate(() => gsStore.simulateLoss());
  await page.evaluate(async () => { await gsStore.syncNow(); });
  const copy = await page.evaluate(() => new Promise((resolve) => { const r = indexedDB.open("gapsense", 1); r.onsuccess = () => { const t = r.result.transaction("kv", "readonly").objectStore("kv").get("gs-settings"); t.onsuccess = () => resolve(t.result); }; }));
  expect(copy["om-full-time"]).toBe("8");
  await page.goto("/index.html");
  await page.waitForFunction(() => localStorage.getItem("om-attempt-log") && document.getElementById("screen-home"), null, { timeout: 15000 });
  expect(await history(page)).toHaveLength(1);
  await page.evaluate(() => gsShowScreen("help"));
  await expect(page.locator("#aboutStorage")).toContainText("Backup copy: the browser's database");
});

test("12.40 phone apps: the copy goes to native preferences and a file, and is restored from them", async ({ page }) => {
  await page.addInitScript(() => {
    window.__prefs = {}; window.__files = {};
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios", Plugins: {
      Preferences: { get: async ({ key }) => ({ value: window.__prefs[key] ?? null }), set: async ({ key, value }) => { window.__prefs[key] = value; }, remove: async ({ key }) => { delete window.__prefs[key]; } },
      Filesystem: { writeFile: async ({ path, data }) => { window.__files[path] = data; return { uri: "file:///" + path }; }, readFile: async ({ path }) => { if (!(path in window.__files)) throw new Error("not found"); return { data: window.__files[path] }; } },
      GSNative: { haptic: async () => {}, tone: async () => ({ id: 1 }), sustainStart: async () => ({ id: 1 }), sustainStop: async () => {}, stopSound: async () => {}, keepAwake: async () => {}, speak: async () => {}, stopSpeaking: async () => {}, pendingScreen: async () => ({}), audioStatus: async () => ({ engineRunning: true, outputVolume: 1, outputLatency: 0 }), canOpen: async () => ({ canOpen: true }), addListener: () => ({ remove() {} }), directTouchShow: async () => ({ shown: true }), directTouchHide: async () => {} },
      App: { getInfo: async () => ({ version: "1.0", build: "14" }), addListener: () => {}, getLaunchUrl: async () => ({}) }, StatusBar: { setStyle: async () => {} } } };
  });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsLogAttempt({ activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 }));
  const status = await page.evaluate(async () => { await gsStore.syncNow(); return gsStore.status(); });
  expect(status.backend).toBe("native");
  expect(status.lastError).toBe("");
  const copy = await page.evaluate(() => ({ prefs: JSON.parse(window.__prefs["gs-settings"]), file: window.__files["gapsense/history.json"] }));
  expect(copy.prefs["om-full-time"]).toBe("8");
  expect(JSON.parse(copy.file)).toHaveLength(1);
  // The web view's storage is gone; the native copy is still there (the stub survives the reload through the init script only if we carry it over).
  await page.evaluate(() => gsStore.simulateLoss());
  const carried = await page.evaluate(() => JSON.stringify({ prefs: window.__prefs, files: window.__files }));
  await page.addInitScript((c) => { const o = JSON.parse(c); window.__carry = o; }, carried);
  await page.addInitScript(() => {
    const orig = window.Capacitor;
    if (window.__carry) { window.__prefs = window.__carry.prefs; window.__files = window.__carry.files; }
    void orig;
  });
  await page.goto("/index.html");
  await page.waitForFunction(() => localStorage.getItem("om-attempt-log") && document.getElementById("screen-home"), null, { timeout: 15000 });
  expect(await page.evaluate(() => localStorage.getItem("om-clear-time"))).toBe("4");
  expect(await history(page)).toHaveLength(1);
});

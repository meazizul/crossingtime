import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick, statusText, swipeOn, answerOn, streetGesture } from "./helpers.mjs";

/*
 * Fixes from the 16 Oct 2026 test report on build 9: gesture timing, the
 * headphone delay, Back silencing sounds, the screen staying awake, a way
 * out of the answer pads, quiet confirmation at the street, a setup link
 * that locks, local dates, and real section headings.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__spoken = [];
    const fake = {
      speaking: false,
      cancel() {},
      speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 5); },
      getVoices() { return []; }
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    // A fake screen wake lock that records requests and releases.
    window.__wake = { requests: 0, releases: 0 };
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: {
      request: async () => { window.__wake.requests += 1; return { release: async () => { window.__wake.releases += 1; }, addEventListener() {} }; }
    } });
  });
  await page.clock.install();
});

async function openLive(page, storage = {}) {
  await openApp(page, { storage });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("live"));
  await page.click("#liveStartBtn");
}

test("street: the warning time runs from the touch, not the lift, of the swipe", async ({ page }) => {
  await openLive(page);
  // A swipe whose finger stays down for 400 ms before lifting.
  await page.evaluate(() => {
    const el = document.getElementById("liveSurface");
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, pointerId: 9, pointerType: "touch", isPrimary: true };
    el.dispatchEvent(new PointerEvent("pointerdown", { ...o, clientX: r.left + 200, clientY: r.top + 100 }));
  });
  await tick(page, 400);
  await page.evaluate(() => {
    const el = document.getElementById("liveSurface");
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, pointerId: 9, pointerType: "touch", isPrimary: true };
    el.dispatchEvent(new PointerEvent("pointerup", { ...o, clientX: r.left + 100, clientY: r.top + 100 }));
  });
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("arriving");
  await tick(page, 6000);
  await streetGesture(page, "tap");
  const warning = await page.evaluate(() => gsLiveState.warningSec);
  // 0.4 s of swipe plus 6 s of waiting: the swipe is part of the warning time.
  expect(warning).toBeGreaterThan(6.3);
  expect(warning).toBeLessThan(6.6);
});

test("street: Back on the answer pad is recorded as cancelled and never scored; Escape does the same", async ({ page }) => {
  await openLive(page);
  await streetGesture(page, "left");
  await tick(page, 3000);
  await streetGesture(page, "tap");
  await expect(page.locator("#answerOverlay")).toBeVisible();
  await expect(page.locator("#answerBackBtn")).toBeVisible();
  await page.click("#answerBackBtn");
  await expect(page.locator("#answerOverlay")).toBeHidden();
  let log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "live", street: "half", direction: "left", skipped: true, skip: "judgment", judged: false, correct: false });
  expect(log[0].userSec).toBeGreaterThan(2.8);
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("detect");
  expect(await statusText(page, "liveOverlayStatus")).toContain("Cancelled");
  // Escape on the next vehicle.
  await streetGesture(page, "right");
  await tick(page, 3000);
  await streetGesture(page, "tap");
  await expect(page.locator("#answerOverlay")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#answerOverlay")).toBeHidden();
  log = await history(page);
  expect(log).toHaveLength(2);
  // Shown, never scored: no attempt in the summary, the tally or the report's totals.
  expect(await page.evaluate(() => gsSummary().total)).toBe(0);
  expect(await page.evaluate(() => gsSummary().byActivity.live.skipped)).toBe(2);
  await expect(page.locator("#liveTally")).toContainText("No vehicles timed yet");
  const report = await page.evaluate(() => gsBuildReport());
  expect(report).toContain("At the street: 2 cancelled");
  expect(report).toMatch(/At the street \(first half, from the left, by hearing\): warning time \d+\.\d\d s, crossing 4\.00 s \(\d+\.\d\d s (longer|shorter)\) — cancelled \(not scored\)/);
  expect(report).not.toContain("correct (");
});

test("street: Back on 'how much' keeps the judgment and cancels the estimate", async ({ page }) => {
  await openLive(page, { "om-features": JSON.stringify({ options: { liveHowMuch: "on", liveReplay: "never" } }) });
  await streetGesture(page, "left");
  await tick(page, 6000);
  await streetGesture(page, "tap");
  await answerOn(page, "longer");
  await tick(page, 1300);
  await expect(page.locator("#howMuchOverlay")).toBeVisible();
  await page.click("#howMuchBackBtn");
  await expect(page.locator("#howMuchOverlay")).toBeHidden();
  const log = await history(page);
  expect(log).toHaveLength(1);                            // one vehicle, one record (12.37)
  expect(log[0]).toMatchObject({ activity: "live", answer: "longer", correct: true });
  expect(log[0].howMuch).toMatchObject({ skipped: true, correct: false });
  // The judgment counts; the cancelled estimate does not.
  const live = await page.evaluate(() => gsSummary().byActivity.live);
  // A cancelled estimate is counted apart from cancelled answers.
  expect(live).toMatchObject({ total: 1, correct: 1, howMuchTotal: 0, skippedHowMuch: 1 });
  expect(await page.evaluate(() => gsHistoryFor("live", "half", 10, true).length)).toBe(0);
  const report = await page.evaluate(() => gsBuildReport());
  expect(report).toContain("how much: estimate cancelled (not scored)");
  await tick(page, 1500);
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("detect");
});

test("street: the instructor can make the confirmation vibration only", async ({ page }) => {
  await openLive(page, { "om-features": JSON.stringify({ options: { liveConfirm: "vibration" } }) });
  await page.evaluate(() => {
    window.__beeps = 0; window.__cues = [];
    window.playConfirmTone = () => { window.__beeps += 1; };
    const real = window.hapticCue;
    window.hapticCue = (c, ...a) => { window.__cues.push(c); return real(c, ...a); };
  });
  await streetGesture(page, "left");
  await tick(page, 2000);
  await streetGesture(page, "tap");
  expect(await page.evaluate(() => window.__beeps)).toBe(0);
  expect(await page.evaluate(() => window.__cues)).toEqual(expect.arrayContaining(["start", "marker"]));
  // Default: the short sound still plays.
  await openLive(page);
  await page.evaluate(() => { window.__beeps = 0; window.playConfirmTone = () => { window.__beeps += 1; }; });
  await streetGesture(page, "left");
  expect(await page.evaluate(() => window.__beeps)).toBe(1);
  await expect(page.locator("#ftLiveConfirm")).toHaveCount(1);
});

test("street: the screen is kept awake while a pad is open, and a hidden app drops the vehicle", async ({ page }) => {
  await openLive(page);
  expect(await page.evaluate(() => window.__wake.requests)).toBe(1);
  await streetGesture(page, "left");
  await tick(page, 1000);
  // The phone locks or another app comes to the front.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("detect");
  expect(await history(page)).toEqual([]);
  expect(await statusText(page, "liveOverlayStatus")).toContain("hidden");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });
  await page.click("#liveBackBtn");
  expect(await page.evaluate(() => window.__wake.releases)).toBe(1);
});

test("comparison practice: Back records the trial as cancelled; a hidden app cancels it too", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  await page.evaluate(() => { gsCompareState.phase = "answering"; gsOpenAnswerPad({ title: "x", onAnswer: gsCompareAnswer, onSkip: gsCompareSkip }); });
  await expect(page.locator("#answerOverlay")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#answerOverlay")).toBeHidden();
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "compare", skipped: true, skip: "judgment", correct: false });
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("idle");
  expect(await statusText(page, "compareStatusText")).toContain("Cancelled");
  // Out of the score, the summary and the adaptive lane.
  await expect(page.locator("#compareScore")).toContainText("No attempts yet");
  expect(await page.evaluate(() => gsSummary().total)).toBe(0);
  expect(await page.evaluate(() => gsSummary().byActivity.compare.skipped)).toBe(1);
  expect(await page.evaluate(() => { gsSetAdaptiveEnabled(true); for (let i = 0; i < 10; i += 1) gsLogAttempt({ activity: "compare", street: "full", userSec: 9, refSec: 8, diffSec: 1, correct: false, marginSec: 0.4, skipped: true, skip: "judgment" }); return gsLoadAdaptive().lanes["compare:full"]?.attemptsSinceStep || 0; })).toBe(0);
  const report = await page.evaluate(() => gsBuildReport());
  expect(report).toContain("Comparison practice: 11 cancelled");
  expect(report).toContain("— cancelled (not scored)");
  // A real replay with sounds scheduled, then the app is hidden.
  await page.evaluate(() => { Object.assign(gsCompareState, { intervalSec: 9, crossingSec: 8, expected: "longer" }); gsCompareReplay(); });
  expect(await page.evaluate(() => gsCompareState.phase)).not.toBe("idle");
  expect(await page.evaluate(() => scheduledSounds.length)).toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("idle");
  // Hiding the app silenced the replay, not only its label.
  expect(await page.evaluate(() => scheduledSounds.length)).toBe(0);
  expect(await statusText(page, "compareStatusText")).toContain("hidden");
});

test("preparation: the headphone delay is taken off the measured time, and screen and replay agree", async ({ page }) => {
  // Pretend the output path adds 0.2 s (about what Bluetooth adds).
  await page.addInitScript(() => {
    const proto = (window.AudioContext || window.webkitAudioContext).prototype;
    Object.defineProperty(proto, "outputLatency", { get: () => 0.2, configurable: true });
  });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("signal"); ensureAudioContext(); });
  await page.evaluate(() => {
    window.__cues = [];
    const real = window.gsHapticAt;
    window.gsHapticAt = (t, c) => { window.__cues.push(c); return real(t, c); };
  });
  // Stopped 0.75 s after the crossing time as the phone measured it: 0.55 s
  // late once the delay is removed, so outside. Before the fix this was
  // "within" on screen and "outside" in the replay.
  await page.evaluate(() => { gsSignalState.street = "full"; gsSignalState.phase = "timing"; gsSignalResolve(8.75); });
  let log = await history(page);
  expect(log[0].correct).toBe(false);
  expect(log[0].userSec).toBeCloseTo(8.55, 1);
  expect(await page.evaluate(() => window.__cues)).toContain("reference_bad");
  await tick(page, 12000);
  expect(await statusText(page, "signalStatusText")).toBe("Ready for another.");
  // Stopped 0.6 s early as measured: 0.8 s early in truth, outside as well.
  await page.evaluate(() => { window.__cues = []; gsSignalState.phase = "timing"; gsSignalResolve(7.4); });
  log = await history(page);
  expect(log[1].correct).toBe(false);
  expect(log[1].userSec).toBeCloseTo(7.2, 1);
  await tick(page, 12000);
  // Stopped 0.5 s late as measured: 0.3 s late in truth, within.
  await page.evaluate(() => { window.__cues = []; gsSignalState.phase = "timing"; gsSignalResolve(8.5); });
  log = await history(page);
  expect(log[2].correct).toBe(true);
  expect(log[2].userSec).toBeCloseTo(8.3, 1);
  expect(await page.evaluate(() => window.__cues)).toContain("reference_ok");
  expect(await page.evaluate(() => window.__cues)).not.toContain("reference_bad");
});

test("Back silences scheduled sounds and the steady sample at once", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("signal"));
  const result = await page.evaluate(() => {
    ensureAudioContext();
    // A steady sound and a tone 5 s ahead, then leave the screen.
    const stop = startSustainedTone(gsSamplePartials(), 1);
    playFeedbackTone("acceptable", 5);
    const before = { scheduled: scheduledSounds.length, sustains: activeSustains.size };
    gsShowScreen("home");
    return { before, after: { scheduled: scheduledSounds.length, sustains: activeSustains.size }, stopIsFunction: typeof stop === "function", screen: gsCurrentScreen };
  });
  expect(result.stopIsFunction).toBe(true);
  // Something was playing and scheduled before Back...
  expect(result.before.scheduled).toBeGreaterThan(0);
  expect(result.before.sustains).toBe(1);
  // ...and Back itself emptied both: this fails if the shutdown is removed.
  expect(result.after).toEqual({ scheduled: 0, sustains: 0 });
  expect(result.screen).toBe("home");
});

test("iPhone app: Back asks the native player to stop, and pads toggle the idle timer", async ({ page }) => {
  await page.addInitScript(() => {
    window.__native = { stopSound: 0, keepAwake: [] };
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      Plugins: {
        GSNative: {
          haptic: async () => {}, pendingScreen: async () => ({}),
          tone: async () => ({ id: 1 }), sustainStart: async () => ({ id: 2 }), sustainStop: async () => {},
          stopSound: async () => { window.__native.stopSound += 1; },
          keepAwake: async ({ on }) => { window.__native.keepAwake.push(on); },
          audioStatus: async () => ({ engineRunning: true, category: "AVAudioSessionCategoryPlayback", ignoresSilentSwitch: true, outputVolume: 1, outputLatency: 0.01, route: "Speaker", peak: 0 }),
          speak: async () => {}, stopSpeaking: async () => {},
          addListener: () => ({ remove: () => {} })
        },
        App: { getInfo: async () => ({ version: "1.0", build: "10" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("live"));
  await page.click("#liveStartBtn");
  expect(await page.evaluate(() => window.__native.keepAwake)).toEqual([true]);
  await page.click("#liveBackBtn");
  expect(await page.evaluate(() => window.__native.keepAwake)).toEqual([true, false]);
  await page.evaluate(() => { gsShowScreen("signal"); gsShowScreen("home"); });
  expect(await page.evaluate(() => window.__native.stopSound)).toBeGreaterThan(0);
});

test("a setup link can carry the instructor code and lock the student's Instructor setup", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  // The instructor sets a code on their phone, then builds the link.
  const token = await page.evaluate(() => {
    localStorage.setItem("om-instructor-pin", gsHashPin("2468"));
    gsSaveFeatures({ ...gsLoadFeatures(), activities: { practice: true, signal: false, compare: false, live: false } });
    return buildShareTimingToken({ times: true, contact: false, features: true, lock: true });
  });
  expect(await page.evaluate((t) => parseShareToken(t).lock.length > 0, token)).toBe(true);
  // The student's phone (fresh storage) opens the link.
  await openApp(page);
  expect(await page.evaluate(() => localStorage.getItem("om-instructor-pin"))).toBeNull();
  expect(await page.evaluate((t) => applyShareToken(t), token)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("om-instructor-pin"))).toBe(await page.evaluate(() => gsHashPin("2468")));
  expect(await page.evaluate(() => gsLoadFeatures().activities.live)).toBe(false);
  await page.evaluate(() => gsShowScreen("instructor"));
  await expect(page.locator("#instructorLockedCard")).toBeVisible();
  await expect(page.locator("#instructorBody")).toBeHidden();
  // The instructor's code opens it.
  await page.fill("#instructorPinEntry", "2468");
  await page.click("#instructorUnlockBtn");
  await expect(page.locator("#instructorBody")).toBeVisible();
  // Without the box ticked, the link carries no lock.
  const plain = await page.evaluate(() => buildShareTimingToken({ times: true, contact: false, features: false, lock: false }));
  expect(await page.evaluate((t) => parseShareToken(t).lock, plain)).toBe("");
  await expect(page.locator("#shareIncludeLock")).toHaveCount(1);
});

test("days practiced follows the phone's own date", async ({ page }) => {
  await openApp(page);
  const days = await page.evaluate(() => {
    // 7 pm and 9 pm on the same local day. In a timezone west of UTC the
    // 9 pm entry falls on the next UTC day, which used to count as two days.
    const d = new Date(2026, 9, 16, 19, 0, 0).getTime();
    const log = [
      { time: d, activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 },
      { time: d + 2 * 3600 * 1000, activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 }
    ];
    localStorage.setItem("om-attempt-log", JSON.stringify(log));
    return { local: gsSummary().daysPracticed, utcWouldBe: new Set(log.map((e) => new Date(e.time).toISOString().slice(0, 10))).size };
  });
  expect(days.local).toBe(1);
  // (In a UTC-based test run utcWouldBe is 1 too; the point is the local count.)
  expect(days.utcWouldBe).toBeGreaterThanOrEqual(1);
});

test("Instructor setup, Help and Progress have real section headings and labelled groups", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  const h2 = page.locator("#screen-instructor h2.setup-heading:visible");
  expect(await h2.count()).toBeGreaterThanOrEqual(8);
  // Build 20: the student list comes first, then the crossing times.
  await expect(h2.first()).toHaveText("Students on this phone");
  await expect(h2.nth(1)).toHaveText("Crossing times");
  const groups = await page.evaluate(() => [...document.querySelectorAll("#screen-instructor .setup-group")]
    .filter((g) => g.getAttribute("role") === "group" && document.getElementById(g.getAttribute("aria-labelledby") || "")).length);
  expect(groups).toBeGreaterThanOrEqual(8);
  await page.evaluate(() => gsShowScreen("help"));
  expect(await page.locator("#screen-help h2.card-label:visible").count()).toBeGreaterThanOrEqual(3);
  await page.evaluate(() => gsShowScreen("progress"));
  expect(await page.locator("#screen-progress h2.card-label:visible").count()).toBeGreaterThanOrEqual(1);
  // No stray <p> section labels remain anywhere.
  expect(await page.locator("p.setup-heading, p.card-label").count()).toBe(0);
});

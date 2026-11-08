// Build 25: the rest of tracker 22.8 (the word "Replay" goes through the
// screen reader and the replay waits for it; on Android the app waits for
// TalkBack's voice to go quiet) and of 22.6 (every label on a pad can be read
// at the student's own size: "Read it larger" on a press and hold, which is
// never an answer; the street pad with buttons only and "how much" follow
// the text size).
import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick, watchErrors } from "./helpers.mjs";

function stubIosShell(page, { voiceOver = false, announceMs = 300 } = {}) {
  return page.addInitScript(({ voiceOver, announceMs }) => {
    window.__listeners = {};
    window.__announced = [];
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      Plugins: {
        GSNative: {
          haptic: async () => {},
          pendingScreen: async () => ({}),
          accessibilityStatus: async () => ({ screenReader: voiceOver }),
          announce: ({ text }) => new Promise((resolve) => {
            window.__announced.push(text);
            setTimeout(() => resolve({ finished: true }), announceMs);
          }),
          addListener: (name, fn) => { (window.__listeners[name] ||= []).push(fn); }
        },
        App: { getInfo: async () => ({ version: "1.0", build: "25" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  }, { voiceOver, announceMs });
}

function stubAndroidShell(page, { talkBack = true, heard = true, speechMs = 300 } = {}) {
  return page.addInitScript(({ talkBack, heard, speechMs }) => {
    window.__waits = [];
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "android",
      Plugins: {
        GSAndroid: {
          accessibilityStatus: async () => ({ screenReader: talkBack }),
          waitForSpeech: (options) => new Promise((resolve) => {
            window.__waits.push(options);
            setTimeout(() => resolve({ heard, ended: heard }), speechMs);
          }),
          speak: async () => {},
          stopSpeaking: async () => {},
          speechStatus: async () => ({ ready: false, failed: true }),
          setWindowBackground: async () => {},
          addListener: () => {}
        },
        App: { getInfo: async () => ({ version: "1.0", build: "25" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  }, { talkBack, heard, speechMs });
}

/* ---------------- 22.8: "Replay" first, then the sounds ---------------- */

test("22.8: with VoiceOver, 'Replay' goes to VoiceOver and the replay starts only when it reports the word is over", async ({ page }) => {
  await stubIosShell(page, { voiceOver: true, announceMs: 800 });
  await openApp(page);
  await page.waitForFunction(() => gsScreenReaderOn() === true);
  const r = await page.evaluate(() => new Promise((resolve) => {
    const at = performance.now();
    const log = [];
    const sync = gsReplayAfterWord(
      (intro) => { log.push({ run: true, intro, ms: performance.now() - at }); return 2.5; },
      (doneAt) => resolve({ log, doneAt, sync, said: window.__announced.slice() })
    );
    log.push({ returned: sync });
  }));
  expect(r.said).toContain("Replay.");
  expect(r.log[0]).toEqual({ returned: null });           // nothing started at once
  expect(r.log[1].intro).toBe(false);                      // the word was not said twice
  expect(r.log[1].ms).toBeGreaterThanOrEqual(750);         // after VoiceOver finished
  expect(r.doneAt).toBe(2.5);
});

test("22.8: Back while 'Replay' is being read means no replay", async ({ page }) => {
  await stubIosShell(page, { voiceOver: true, announceMs: 300 });
  await openApp(page);
  await page.waitForFunction(() => gsScreenReaderOn() === true);
  const ran = await page.evaluate(() => new Promise((resolve) => {
    let wanted = true;
    let ran = false;
    gsReplayAfterWord(() => { ran = true; return 1; }, null, { stillWanted: () => wanted });
    wanted = false;                                        // the student pressed Back
    setTimeout(() => resolve(ran), 700);
  }));
  expect(ran).toBe(false);
});

test("22.8: without a screen reader the replay starts at once with its own 'Replay', as before", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(() => {
    const calls = [];
    const doneAt = gsReplayAfterWord((intro) => { calls.push(intro); return 3; }, (d) => calls.push(`then ${d}`));
    return { calls, doneAt };
  });
  expect(r.calls).toEqual([true, "then 3"]);
  expect(r.doneAt).toBe(3);
});

test("22.8: Comparison practice with VoiceOver: the replay sounds wait for 'Replay'", async ({ page }) => {
  await stubIosShell(page, { voiceOver: true, announceMs: 900 });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.waitForFunction(() => gsScreenReaderOn() === true);
  const r = await page.evaluate(() => new Promise((resolve) => {
    const real = window.gsReplayJudgment;
    const at = performance.now();
    window.gsReplayJudgment = (opts) => { resolve({ ms: performance.now() - at, intro: opts.intro, said: window.__announced.slice() }); return real(opts); };
    gsCompareState.intervalSec = 5;
    gsCompareState.crossingSec = 4;
    gsCompareReplay();
  }));
  expect(r.said).toContain("Replay.");
  expect(r.intro).toBe(false);
  expect(r.ms).toBeGreaterThanOrEqual(850);
});

test("22.8: Practice with VoiceOver says 'Replay' through VoiceOver, then replays and records the try", async ({ page }) => {
  await page.clock.install();
  await stubIosShell(page, { voiceOver: true, announceMs: 700 });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.waitForFunction(() => gsScreenReaderOn() === true);
  await page.evaluate(() => gsShowScreen("practice"));
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.click("#actionBtn");                          // Begin
  await tick(page, 4000);
  await page.click("#actionBtn");                          // Mark (Halfway): the replay begins
  await tick(page, 300);
  expect(await page.evaluate(() => window.__announced.includes("Replay."))).toBe(true);
  expect(await history(page)).toHaveLength(0);              // still waiting for VoiceOver
  await tick(page, 600);
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "practice", street: "half", correct: true });
});

/* ---------------- 22.8 on Android: wait for TalkBack's voice ---------------- */

test("22.8: on Android, the wait ends when TalkBack's voice goes quiet, not on a guess", async ({ page }) => {
  await stubAndroidShell(page, { talkBack: true, heard: true, speechMs: 300 });
  await openApp(page);
  await page.waitForFunction(() => gsScreenReaderOn() === true);
  const r = await page.evaluate(() => new Promise((resolve) => {
    const at = performance.now();
    gsScreenReaderSay("Not correct. It was about the same, a little longer.", { onDone: () => resolve({ ms: performance.now() - at, waits: window.__waits.slice() }) });
  }));
  expect(r.waits).toHaveLength(1);
  expect(r.waits[0]).toMatchObject({ startWithinMs: 2500, quietMs: 450 });   // 11 words: the estimate is over 2.5 s
  expect(r.ms).toBeGreaterThanOrEqual(250);
  expect(r.ms).toBeLessThan(1500);                          // the estimate for these words is over 4 s
});

test("22.8: on Android, if the phone never reports TalkBack's voice, the estimate stays", async ({ page }) => {
  await stubAndroidShell(page, { talkBack: true, heard: false, speechMs: 1500 });
  await openApp(page);
  await page.waitForFunction(() => gsScreenReaderOn() === true);
  const r = await page.evaluate(() => new Promise((resolve) => {
    const at = performance.now();
    gsScreenReaderSay("Replay.", { onDone: () => resolve({ ms: performance.now() - at, startWithinMs: window.__waits[0]?.startWithinMs }) });
  }));
  expect(r.ms).toBeGreaterThanOrEqual(1450);                // at least 1.5 s for one word
  expect(r.ms).toBeLessThan(1900);                           // and no longer than build 24 waited
  expect(r.startWithinMs).toBe(1500);
});

/* ---------------- 22.6: every label at the student's size ---------------- */

async function openAnswerPad(page) {
  await page.evaluate(() => {
    window.__answers = [];
    gsOpenAnswerPad({ title: "Was that longer, shorter, or about the same as your crossing?", onAnswer: (a) => window.__answers.push(a), onBack: () => {} });
  });
  return page.locator("#answerSurface").boundingBox();
}

test("22.6: at large text a press and hold opens 'Read it larger' at the student's size, and is not an answer", async ({ page }) => {
  const errors = watchErrors(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await openApp(page, { storage: { "om-a11y-text-size": "max" } });
  const area = await openAnswerPad(page);
  await expect(page.locator("#answerSurface .pad-hold-hint")).toBeVisible();
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(950);
  await expect(page.locator("#padReadOverlay")).toBeVisible();
  await page.mouse.up();
  expect(await page.evaluate(() => window.__answers)).toEqual([]);   // never an answer
  await expect(page.locator("#padReadTitle")).toHaveText("Your answer");
  await expect(page.locator("#padReadBody")).toContainText("Was that longer, shorter, or about the same as your crossing?");
  await expect(page.locator("#padReadBody")).toContainText("Tap: about the same");
  const sizes = await page.evaluate(() => ({
    root: parseFloat(getComputedStyle(document.documentElement).fontSize),
    text: parseFloat(getComputedStyle(document.querySelector("#padReadBody p")).fontSize)
  }));
  expect(sizes.root).toBeGreaterThan(50);                    // 300%
  expect(sizes.text).toBeCloseTo(sizes.root, 0);             // at the student's own size
  await page.click("#padReadClose");
  await expect(page.locator("#padReadOverlay")).toBeHidden();
  await expect(page.locator("#answerOverlay")).toBeVisible();
  // A quick tap still answers.
  await page.mouse.click(area.x + area.width / 2, area.y + area.height / 2);
  expect(await page.evaluate(() => window.__answers)).toEqual(["same"]);
  expect(errors).toEqual([]);
});

test("22.6: Escape (and Back) close 'Read it larger' first, not the pad", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openApp(page, { storage: { "om-a11y-text-size": "xxl" } });
  await openAnswerPad(page);
  await page.evaluate(() => gsPadReadOpen(document.getElementById("answerOverlay")));
  await expect(page.locator("#padReadOverlay")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#padReadOverlay")).toBeHidden();
  await expect(page.locator("#answerOverlay")).toBeVisible();
});

test("22.6: at the default text size, or with a screen reader, a long press is still a tap and no hint shows", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openApp(page);
  let area = await openAnswerPad(page);
  await expect(page.locator("#answerSurface .pad-hold-hint")).toBeHidden();
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(950);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__answers)).toEqual(["same"]);
  await expect(page.locator("#padReadOverlay")).toBeHidden();

  await openApp(page, { storage: { "om-a11y-text-size": "max" } });
  await page.evaluate(() => { window.__gsScreenReader = true; });
  area = await openAnswerPad(page);
  await expect(page.locator("#answerSurface .pad-hold-hint")).toBeHidden();
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(950);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__answers)).toEqual(["same"]);
});

test("22.6: a swipe that moves is an answer even when slow; a hold at the street opens the panel and records nothing", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openApp(page, { storage: { "om-a11y-text-size": "max" } });
  const area = await openAnswerPad(page);
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
  await page.mouse.down();
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2 - 120, { steps: 4 });
  await page.waitForTimeout(950);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__answers)).toEqual(["longer"]);
  await expect(page.locator("#padReadOverlay")).toBeHidden();

  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("live"); document.getElementById("liveStartBtn").click(); gsLiveDetect("left"); });
  const street = await page.locator("#liveSurface").boundingBox();
  await page.mouse.move(street.x + street.width / 2, street.y + street.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(950);
  await page.mouse.up();
  await expect(page.locator("#padReadOverlay")).toBeVisible();
  await expect(page.locator("#padReadTitle")).toHaveText("At the street");
  await expect(page.locator("#padReadBody")).toContainText("Tap when it passes in front of you");
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("arriving");   // the hold did not count as "it passed"
  expect(await history(page)).toEqual([]);
});

for (const [width, height] of [[320, 568], [360, 640], [375, 667]]) {
  test(`22.6: at 300% on a ${width}x${height} screen every pad fits, with the hint, and its words stay large`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openApp(page, { storage: { "om-a11y-text-size": "max" } });
    await setTimes(page, "4", "8", "0.4");
    await openAnswerPad(page);
    const answer = await page.evaluate(() => {
      const s = document.getElementById("answerSurface");
      const q = document.getElementById("answerQuestion");
      const hint = s.querySelector(".pad-hold-hint");
      const r = s.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, question: parseFloat(getComputedStyle(q).fontSize), questionTop: q.getBoundingClientRect().top, hintBottom: hint.getBoundingClientRect().bottom, surfaceBottom: r.bottom };
    });
    expect(answer.bottom).toBeLessThanOrEqual(height + 0.5);
    expect(answer.questionTop).toBeGreaterThanOrEqual(answer.top - 0.5);         // the question's first line is not cut off (build 24 cut it)
    expect(answer.question).toBeGreaterThan(24);
    expect(answer.hintBottom).toBeLessThanOrEqual(answer.surfaceBottom + 0.5);   // the hint is not cut off
    await page.evaluate(() => { gsCloseAnswerPad(); gsShowScreen("live"); document.getElementById("liveStartBtn").click(); });
    const live = await page.evaluate(() => {
      const s = document.getElementById("liveSurface");
      const r = s.getBoundingClientRect();
      const hint = s.querySelector(".pad-hold-hint").getBoundingClientRect();
      const first = s.querySelector("p").getBoundingClientRect();
      return { bottom: r.bottom, top: r.top, hintBottom: hint.bottom, firstTop: first.top };
    });
    expect(live.bottom).toBeLessThanOrEqual(height + 0.5);
    expect(live.firstTop).toBeGreaterThanOrEqual(live.top - 0.5);
    expect(live.hintBottom).toBeLessThanOrEqual(live.bottom + 0.5);
  });
}

test("22.6: with buttons only, the street pad scrolls and its buttons follow the text size; 'how much' too", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openApp(page, { storage: { "om-a11y-text-size": "max" } });
  await setTimes(page, "4", "8", "0.4");
  const r = await page.evaluate(() => {
    const f = gsLoadFeatures();
    f.options.compareSwipe = "off";
    gsSaveFeatures(f);
    gsShowScreen("live");
    document.getElementById("liveStartBtn").click();
    const overlay = document.getElementById("liveOverlay");
    const btn = overlay.querySelector("#liveDetectButtons .answer-btn");
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const howMuch = parseFloat(getComputedStyle(document.getElementById("compareFollowUpBtn")).fontSize);
    return { buttonsOnly: overlay.classList.contains("buttons-only"), overflowY: getComputedStyle(overlay).overflowY, font: parseFloat(getComputedStyle(btn).fontSize), root, howMuch };
  });
  expect(r.buttonsOnly).toBe(true);
  expect(r.overflowY).toBe("auto");
  expect(r.font).toBeCloseTo(r.root * 1.02, 0);
  expect(r.howMuch).toBeCloseTo(r.root * 1.4, 0);
});

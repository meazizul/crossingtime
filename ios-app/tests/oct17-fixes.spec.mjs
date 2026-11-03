import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick, statusText } from "./helpers.mjs";

/*
 * Regressions for the Oct 17, 2026 review of build 12 (bug numbers from the
 * shared test-results doc). Each test was run against build 12 without its
 * fix and failed there.
 */

test.beforeEach(async ({ page }) => { await page.clock.install(); });

const hide = (page) => page.evaluate(() => {
  Object.defineProperty(document, "hidden", { value: true, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
});

test("bug 15: Progress shows skipped and unjudged practice instead of 'Nothing recorded yet'", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => {
    gsLogAttempt({ activity: "compare", street: "full", userSec: 9, refSec: 8, diffSec: 1, correct: false, marginSec: 0.4, skipped: true, skip: "judgment" });
    gsLogAttempt({ activity: "live", street: "full", direction: "right", judged: false, userSec: 7, refSec: 8, diffSec: -1, correct: false, marginSec: 0.4 });
    gsShowScreen("progress");
  });
  const text = await page.locator("#progressBody").innerText();
  expect(text).not.toContain("Nothing recorded yet");
  expect(text).toContain("1 cancelled");
  expect(text).toContain("1 not scored");
  // Still out of every score.
  expect(await page.evaluate(() => gsSummary().total)).toBe(0);
});

test("bug 16: hidden during 'how much', the screen says the answer was saved", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => {
    gsShowScreen("compare");
    Object.assign(gsCompareState, { intervalSec: 10, crossingSec: 8, expected: "longer", phase: "answering" });
    document.getElementById("compareFollowUp").checked = true;
    gsCompareAnswer("longer");
  });
  await tick(page, 1500);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("howmuch");
  await hide(page);
  expect(await history(page)).toHaveLength(1);
  const status = await statusText(page, "compareStatusText");
  expect(status).toContain("Your answer was saved");
  expect(status).not.toContain("not recorded");
});

test("bug 17 (build 14: Skip became Back): the pads' Back buttons are named Back and never say nothing is recorded", async ({ page }) => {
  await openApp(page);
  for (const id of ["#answerBackBtn", "#howMuchBackBtn", "#liveBackBtn"]) {
    const label = await page.getAttribute(id, "aria-label");
    expect(label).toMatch(/^Back/);
    expect(label).not.toContain("nothing");
  }
});

test("bug 18: 'it passed' confirms once, like the swipe for a vehicle", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  const counts = await page.evaluate(() => {
    const calls = [];
    window.hapticCue = (t) => calls.push(t);
    gsShowScreen("live"); document.getElementById("liveStartBtn").click();
    gsLiveDetect("right"); const detect = calls.length;
    gsLiveArrived(); return { detect, arrive: calls.length - detect };
  });
  expect(counts).toEqual({ detect: 1, arrive: 1 });
});

test("bug 19: Comparison preparation reads the headphone delay again on Ready", async ({ page }) => {
  await page.addInitScript(() => {
    window.__latency = 0.012;
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios", Plugins: {
      GSNative: {
        haptic: async () => {}, pendingScreen: async () => ({}), tone: async () => ({ id: 1 }), sustainStart: async () => ({ id: 2 }), sustainStop: async () => {}, stopSound: async () => {},
        audioStatus: async () => ({ engineRunning: true, outputVolume: 1, outputLatency: window.__latency }),
        speak: async () => {}, stopSpeaking: async () => {}, addListener: () => ({ remove() {} })
      },
      App: { getInfo: async () => ({}), addListener: () => {}, getLaunchUrl: async () => ({}) }, StatusBar: { setStyle: async () => {} }
    } };
  });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await tick(page, 100);
  await page.evaluate(() => { window.__latency = 0.22; gsShowScreen("signal"); gsSignalState.street = "full"; gsSignalPress(); });
  await tick(page, 100);
  await page.evaluate(() => { gsSignalState.phase = "timing"; gsSignalState.signalAt = performance.now(); });
  await tick(page, 8220);
  await page.evaluate(() => gsSignalPress());
  const entry = (await history(page)).at(-1);
  expect(Math.abs(entry.diffSec)).toBeLessThan(0.05);
});

test("bug 20: Android Back closes the top pad, then goes Home, then leaves the app", async ({ page }) => {
  await page.addInitScript(() => {
    window.__app = { listeners: {}, minimized: 0 };
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "android", Plugins: {
      Haptics: { vibrate: async () => {}, impact: async () => {} },
      App: { getInfo: async () => ({}), getLaunchUrl: async () => ({}), minimizeApp: async () => { window.__app.minimized += 1; },
        addListener: (name, fn) => { window.__app.listeners[name] = fn; return { remove() {} }; } },
      StatusBar: { setStyle: async () => {} }
    } };
  });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  expect(await page.evaluate(() => typeof window.__app.listeners.backButton)).toBe("function");
  await page.evaluate(() => { gsShowScreen("live"); document.getElementById("liveStartBtn").click(); gsLiveDetect("left"); gsLiveArrived(); });
  const back = () => page.evaluate(() => window.__app.listeners.backButton({ canGoBack: false }));
  await back();
  await expect(page.locator("#answerOverlay")).toBeHidden();
  expect((await history(page)).at(-1)).toMatchObject({ skipped: true });
  await back();
  await expect(page.locator("#liveOverlay")).toBeHidden();
  await back();
  await expect(page.locator("#screen-home")).toBeVisible();
  await back();
  expect(await page.evaluate(() => window.__app.minimized)).toBe(1);
});

test("bug 21: sharing with the lock ticked but no code says it locks nothing; a lock-only link is allowed", async ({ page }) => {
  await page.addInitScript(() => { navigator.share = async () => {}; });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.click("#shareTimingSettings");
  await expect(page.locator("#shareNote")).toContainText("does not lock Instructor setup");
  await page.evaluate(() => { localStorage.setItem("om-instructor-pin", gsHashPin("1234")); });
  for (const id of ["#shareIncludeTimes", "#shareIncludeContact", "#shareIncludeFeatures"]) await page.uncheck(id);
  await page.click("#shareTimingSettings");
  await expect(page.locator("#shareNote")).toHaveText("Setup link shared.");
});

test("bug 22: a stay-awake lock granted after the pad closed is released", async ({ page }) => {
  await page.addInitScript(() => {
    window.__held = 0;
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: {
      request: () => new Promise((r) => setTimeout(() => { window.__held += 1; r({ release: async () => { window.__held -= 1; }, addEventListener() {} }); }, 500))
    } });
  });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("live"); document.getElementById("liveStartBtn").click(); });
  await tick(page, 100);
  await page.click("#liveBackBtn");
  await tick(page, 1000);
  expect(await page.evaluate(() => window.__held)).toBe(0);
});

test("bug 23: days practiced counts unscored practice; skipped estimates are counted apart", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  const s = await page.evaluate(() => {
    // Whole calendar days at noon: 24-hour steps land on the same date across a clock change.
    const daysAgo = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d.getTime(); };
    const log = [
      { time: daysAgo(2), activity: "live", street: "full", judged: false, userSec: 7, refSec: 8, diffSec: -1, correct: false, marginSec: 0.4 },
      { time: daysAgo(1), activity: "compare", street: "full", userSec: 0, refSec: 2, diffSec: 0, correct: false, marginSec: 0.4, answer: "magnitude", skipped: true, skip: "magnitude" },
      { time: daysAgo(0), activity: "compare", street: "full", userSec: 9, refSec: 8, diffSec: 1, correct: true, marginSec: 0.4, answer: "longer", expected: "longer" }
    ];
    localStorage.setItem("om-attempt-log", JSON.stringify(log));
    return gsSummary();
  });
  expect(s.daysPracticed).toBe(3);
  expect(s.byActivity.compare).toMatchObject({ skippedHowMuch: 1 });
  expect(s.byActivity.compare.skipped || 0).toBe(0);
});

test("bug 24: at 300% text on a small phone, every answer, Skip and Done can be reached by touch", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openApp(page, { storage: { "om-a11y-text-size": "max" } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("live"); document.getElementById("liveStartBtn").click(); });
  await tick(page, 100);
  const reachable = (sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((el) => !el.closest("[hidden]")).map((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const onScreen = r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    return onScreen && el.contains(document.elementFromPoint(x, y));
  }), sel);
  // Build 14: with swipes on the whole pad is the swipe area; Back and the area are the controls.
  expect(await reachable("#liveBackBtn, #liveSurface")).toEqual([true, true]);
  await page.evaluate(() => { gsLiveDetect("left"); gsLiveArrived(); });
  await tick(page, 100);
  expect(await reachable("#answerBackBtn, #answerSurface")).toEqual([true, true]);
});

test("bug 25 (build 14): Back is a square button in the top-left corner, large enough to hit", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("live"); document.getElementById("liveStartBtn").click(); gsLiveDetect("left"); gsLiveArrived(); });
  const box = await page.evaluate(() => { const r = document.getElementById("answerBackBtn").getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; });
  expect(box.left).toBeLessThan(40);
  expect(box.top).toBeLessThan(80);
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  const lines = 1;
});

test("bug 26: High contrast keeps a dark theme dark, and the Settings title readable", async ({ page }) => {
  await openApp(page, { storage: { "om-a11y-high-contrast": "true", "om-a11y-theme": "dark" } });
  const colors = await page.evaluate(() => {
    document.getElementById("settingsModal").showModal();
    const title = document.querySelector("#settingsModal .modal-header h2");
    const header = title.closest(".modal-header");
    return { body: getComputedStyle(document.body).backgroundColor, title: getComputedStyle(title).color, header: getComputedStyle(header).backgroundColor };
  });
  expect(colors.body).toBe("rgb(0, 0, 0)");
  expect(colors.title).not.toBe(colors.header);
});

test("bug 27: forced colors keep the right and wrong shapes visible", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await openApp(page, { storage: { "om-a11y-output-mode": "audio-visual" } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("compare"); gsShowResult(true); });
  await tick(page, 150);
  const c = await page.evaluate(() => ({
    shape: getComputedStyle(document.getElementById("visualReplayShape")).backgroundColor,
    field: getComputedStyle(document.getElementById("visualReplayFlash")).backgroundColor
  }));
  expect(c.shape).not.toBe(c.field);
});

test("bug 39: halfway-and-finish shows a score for each mark", async ({ page }) => {
  await openApp(page, { storage: { "om-mode": "3" } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => {
    document.querySelector("input[name='mode'][value='3']").click();
    gsLogAttempt({ activity: "practice", street: "full", userSec: 8, refSec: 8, diffSec: 0, correct: true, marginSec: 0.4 });
    gsShowScreen("practice");
  });
  const score = await page.locator("#practiceScore").innerText();
  expect(score).toContain("Halfway:");
  expect(score).toContain("Finish: Last 1: 1 within margin");
});

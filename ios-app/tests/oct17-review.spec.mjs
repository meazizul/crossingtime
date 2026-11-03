import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick } from "./helpers.mjs";

/*
 * Acceptance tests for the bugs found in build 12 in the Oct 17, 2026 review
 * (two independent reviewers). Bug numbers are those in the shared test-results doc (Bug
 * tracker and "Bugs 14 to 39" tabs).
 *
 * They check what the student or instructor experiences, not how it is
 * coded: any fix that gives the right behavior passes. Every test here fails
 * on build 12 (commit 2e0e9c1) except the second bug 29 test, which passes
 * there on purpose: it guards that a fix for bug 29 keeps correcting sound.
 * A test passing is the definition of that bug being fixed; change a test
 * only if the expected behavior itself changes.
 *
 * Run: npm test, or npx playwright test tests/oct17-review.spec.mjs
 */

test.beforeEach(async ({ page }) => { await page.clock.install(); });

const hide = (page) => page.evaluate(() => {
  Object.defineProperty(document, "hidden", { value: true, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
});

/* On screen, and the element a finger at its centre would hit. */
const reachable = (page, sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((el) => !el.closest("[hidden]")).map((el) => {
  const r = el.getBoundingClientRect();
  const onScreen = r.top >= 0 && r.bottom <= innerHeight + 0.5 && r.left >= 0 && r.right <= innerWidth + 0.5;
  return onScreen && el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
}), sel);

const contrast = (page, fgExpr, bgExpr) => page.evaluate(([f, b]) => {
  const parse = (c) => c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
  const lum = ([r, g, bl]) => [r, g, bl].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const a = lum(parse(eval(f))), c = lum(parse(eval(b)));
  return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05);
}, [fgExpr, bgExpr]);

function nativeIos(extra = "") {
  return new Function(`
    window.__native = { shows: [], latency: 0.012 };
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios", Plugins: {
      GSNative: {
        haptic: async () => {}, pendingScreen: async () => ({}), tone: async () => ({ id: 1 }),
        sustainStart: async () => ({ id: 2 }), sustainStop: async () => {}, stopSound: async () => {}, keepAwake: async () => {},
        directTouchShow: async (a) => { window.__native.shows.push(a); return { shown: true }; }, directTouchHide: async () => {},
        audioStatus: async () => ({ engineRunning: true, outputVolume: 1, outputLatency: window.__native.latency }),
        speak: async () => {}, stopSpeaking: async () => {}, addListener: () => ({ remove() {} })
      },
      App: { getInfo: async () => ({ version: "1.0", build: "13" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
      StatusBar: { setStyle: async (s) => { window.__native.statusBar = s.style; } }
    } };
    ${extra}
  `);
}

/* ---------------- 14: the setup link ---------------- */

async function instructorLink(page) {
  await openApp(page);
  await setTimes(page, "3", "6", "0.4");
  await page.evaluate(() => { instructorEmailInput.value = "o.m@example.org"; clientCodeInput.value = "TEST12"; });
  return page.evaluate(() => buildShareTimingLink({ times: true, contact: true, features: true, lock: false }));
}

async function openOnStudentPhone(page, url) {
  await openApp(page);
  await page.goto(url);
  await page.waitForFunction(() => typeof gsBoot === "function");
  return page.evaluate(() => [clearTimeInput.value, fullTimeInput.value, clientCodeInput.value]);
}

test("bug 14: the setup link is short enough for one text and has no periods inside it", async ({ page }) => {
  const link = await instructorLink(page);
  const token = link.split("#ts=")[1];
  expect(token).not.toContain(".");
  expect(link.length).toBeLessThan(200);
});

test("bug 14: the setup link still works with a full stop or a line break added by Messages", async ({ page }) => {
  const link = await instructorLink(page);
  const token = link.split("#ts=")[1];
  for (const url of [`${link}.`, link.replace(token, `${token.slice(0, 40)}%0A${token.slice(40)}`)]) {
    expect(await openOnStudentPhone(page, url)).toEqual(["3", "6", "TEST12"]);
  }
});

/* ---------------- 15 to 23 ---------------- */

test("bug 15: Progress shows skipped and unjudged practice, not 'Nothing recorded yet'", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => {
    gsLogAttempt({ activity: "compare", street: "full", userSec: 9, refSec: 8, diffSec: 1, correct: false, marginSec: 0.4, skipped: true, skip: "judgment" });
    gsLogAttempt({ activity: "live", street: "full", direction: "right", judged: false, userSec: 7, refSec: 8, diffSec: -1, correct: false, marginSec: 0.4 });
    gsShowScreen("progress");
  });
  const text = await page.locator("#progressBody").innerText();
  expect(text).not.toContain("Nothing recorded");
  expect(text).toMatch(/cancelled/i);
  expect(await page.evaluate(() => gsSummary().total)).toBe(0); // still never scored
});

test("bug 16: hidden during 'how much', the app does not say the recorded answer was lost", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => {
    gsShowScreen("compare");
    Object.assign(gsCompareState, { intervalSec: 10, crossingSec: 8, expected: "longer", phase: "answering" });
    document.getElementById("compareFollowUp").checked = true;
    gsCompareAnswer("longer");
  });
  await tick(page, 1500);
  await hide(page);
  expect(await history(page)).toHaveLength(1);
  expect(await page.locator("#compareStatusText").innerText()).not.toMatch(/not recorded/i);
});

test("bug 17: the Skip buttons do not tell screen reader users that nothing is recorded", async ({ page }) => {
  await openApp(page);
  for (const id of ["#answerBackBtn", "#howMuchBackBtn"]) {
    const name = (await page.getAttribute(id, "aria-label")) || (await page.locator(id).innerText());
    expect(name).toMatch(/^back/i);                      // build 14: Skip became Back
    expect(name).not.toMatch(/nothing/i);
  }
});

test("bug 18: 'it passed' confirms with the same single cue as the swipe for a vehicle", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  const counts = await page.evaluate(() => {
    const calls = [];
    window.hapticCue = (t) => calls.push(t);
    gsShowScreen("live"); document.getElementById("liveStartBtn").click();
    gsLiveDetect("right"); const detect = calls.length;
    gsLiveArrived(); return { detect, arrive: calls.length - detect };
  });
  expect(counts.arrive).toBe(counts.detect);
});

test("bug 19: iPhone: headphones connected mid-session, an on-time stop is on time", async ({ page }) => {
  await page.addInitScript(nativeIos());
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.locator("body").click({ position: { x: 5, y: 5 } }); // first sound: speaker delay read
  await tick(page, 100);
  await page.evaluate(() => { window.__native.latency = 0.22; gsShowScreen("signal"); gsSignalState.street = "full"; gsSignalPress(); });
  await tick(page, 100);
  await page.evaluate(() => { gsSignalState.phase = "timing"; gsSignalState.signalAt = performance.now(); });
  await tick(page, 8220); // 8 s crossing, heard 0.22 s late
  await page.evaluate(() => gsSignalPress());
  expect(Math.abs((await history(page)).at(-1).diffSec)).toBeLessThan(0.05);
});

test("bug 20: Android Back closes the top pad, then goes Home, then leaves the app", async ({ page }) => {
  await page.addInitScript(() => {
    window.__app = { listeners: {}, left: 0 };
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "android", Plugins: {
      Haptics: { vibrate: async () => {}, impact: async () => {} },
      App: { getInfo: async () => ({}), getLaunchUrl: async () => ({}),
        minimizeApp: async () => { window.__app.left += 1; }, exitApp: async () => { window.__app.left += 1; },
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
  await back();
  await expect(page.locator("#liveOverlay")).toBeHidden();
  await back();
  await expect(page.locator("#screen-home")).toBeVisible();
  expect(await page.evaluate(() => window.__app.left)).toBe(0);
  await back();
  expect(await page.evaluate(() => window.__app.left)).toBe(1);
});

test("bug 21: sharing with the lock ticked but no instructor code says the link locks nothing", async ({ page }) => {
  await page.addInitScript(() => { navigator.share = async () => {}; });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.click("#shareTimingSettings");
  await expect(page.locator("#shareNote")).toContainText(/code/i);
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

test("bug 23: days practiced counts days of unscored practice", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  const days = await page.evaluate(() => {
    // Whole calendar days at noon: 24-hour steps land on the same date across a clock change.
    const daysAgo = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d.getTime(); };
    localStorage.setItem("om-attempt-log", JSON.stringify([
      { time: daysAgo(2), activity: "live", street: "full", judged: false, userSec: 7, refSec: 8, diffSec: -1, correct: false, marginSec: 0.4 },
      { time: daysAgo(1), activity: "compare", street: "full", userSec: 9, refSec: 8, diffSec: 1, correct: false, marginSec: 0.4, skipped: true, skip: "judgment" },
      { time: daysAgo(0), activity: "compare", street: "full", userSec: 9, refSec: 8, diffSec: 1, correct: true, marginSec: 0.4, answer: "longer", expected: "longer" }
    ]));
    return gsSummary().daysPracticed;
  });
  expect(days).toBe(3);
});

/* ---------------- 24 to 27: pads and low-vision settings ---------------- */

for (const view of [
  { name: "iPhone SE portrait, 300% text", size: { width: 375, height: 667 }, text: "max" },
  { name: "phone portrait, 200% text", size: { width: 390, height: 844 }, text: "xl" },
  { name: "landscape, default text", size: { width: 844, height: 390 }, text: "default" },
  { name: "small landscape, default text", size: { width: 667, height: 375 }, text: "default" }
]) {
  test(`bug 24: ${view.name}: every street and answer control can be reached by touch`, async ({ page }) => {
    await page.setViewportSize(view.size);
    await openApp(page, { storage: { "om-a11y-text-size": view.text } });
    await setTimes(page, "4", "8", "0.4");
    await page.evaluate(() => { gsShowScreen("live"); document.getElementById("liveStartBtn").click(); });
    await tick(page, 100);
    expect(await reachable(page, "#liveBackBtn, #liveSurface")).toEqual([true, true]);
    await page.evaluate(() => gsLiveDetect("left"));
    await tick(page, 50);
    expect(await reachable(page, "#liveBackBtn, #liveSurface")).toEqual([true, true]);
    await page.evaluate(() => gsLiveArrived());
    await tick(page, 100);
    expect(await reachable(page, "#answerBackBtn, #answerSurface")).toEqual([true, true]);
  });
}

test("bug 25 (build 14): Back is one square control in the top-left corner of the pad", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("live"); document.getElementById("liveStartBtn").click(); gsLiveDetect("left"); gsLiveArrived(); });
  const box = await page.evaluate(() => { const r = document.getElementById("answerBackBtn").getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; });
  expect(box.left).toBeLessThan(40);
  expect(box.top).toBeLessThan(80);
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
});

for (const theme of ["dark", "inverted"]) {
  test(`bug 26: High contrast with the ${theme} theme stays dark, with a readable Settings title and status bar`, async ({ page }) => {
    await page.addInitScript(nativeIos());
    await openApp(page, { storage: { "om-a11y-high-contrast": "true", "om-a11y-theme": theme } });
    await page.evaluate(() => document.getElementById("settingsModal").showModal());
    const bodyIsDark = await page.evaluate(() => {
      const [r, g, b] = getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number);
      return r + g + b < 120;
    });
    expect(bodyIsDark).toBe(true);
    expect(await contrast(page,
      "getComputedStyle(document.querySelector('#settingsModal .modal-header h2')).color",
      "getComputedStyle(document.querySelector('#settingsModal .modal-header')).backgroundColor")).toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(() => window.__native.statusBar)).toBe("DARK");
  });
}

test("bug 27: under forced colors the right/wrong shapes stay visible against their field", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await openApp(page, { storage: { "om-a11y-output-mode": "audio-visual" } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("compare"); gsShowResult(true); });
  await tick(page, 150);
  const c = await page.evaluate(() => [
    getComputedStyle(document.getElementById("visualReplayShape")).backgroundColor,
    getComputedStyle(document.getElementById("visualReplayFlash")).backgroundColor
  ]);
  expect(c[0]).not.toBe(c[1]);
});

/* ---------------- 28 to 38 (from the code audit) ---------------- */

test("bug 28: with the answer pad over the street pad, keyboard focus never reaches the street pad", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("live"); document.getElementById("liveStartBtn").click(); gsLiveDetect("left"); gsLiveArrived(); });
  await page.focus("#answerSurface");
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.getElementById("liveOverlay").contains(document.activeElement))).toBe(false);
  }
  expect(await page.evaluate(() => { const o = document.getElementById("liveOverlay"); return o.inert || o.getAttribute("aria-hidden") === "true"; })).toBe(true);
});

async function prepAttempt(page, outputMode, pressAtSec) {
  await page.addInitScript(() => {
    Object.defineProperty(AudioContext.prototype, "outputLatency", { get: () => 0.3, configurable: true });
    Object.defineProperty(AudioContext.prototype, "baseLatency", { get: () => 0, configurable: true });
  });
  await openApp(page, { storage: { "om-a11y-output-mode": outputMode } });
  await setTimes(page, "2", "4", "0.1");
  await page.evaluate(() => { ensureAudioContext(); gsShowScreen("signal"); gsSignalState.street = "full"; gsSignalState.phase = "timing"; gsSignalState.signalAt = performance.now(); });
  await tick(page, pressAtSec * 1000);
  await page.evaluate(() => gsSignalPress());
  return (await history(page)).at(-1);
}

test("bug 29: visual-only: an on-time stop is not corrected for a sound delay", async ({ page }) => {
  const entry = await prepAttempt(page, "visual-only", 4.0);
  expect(entry.userSec).toBeCloseTo(4.0, 1);
  expect(entry.correct).toBe(true);
});

test("bug 29: with sound: a stop 0.3 s late through a 0.3 s delay counts as on time", async ({ page }) => {
  const entry = await prepAttempt(page, "audio-only", 4.3);
  expect(entry.userSec).toBeCloseTo(4.0, 1);
  expect(entry.correct).toBe(true);
});

test("bug 30: replay B keeps the first replay's visuals", async ({ page }) => {
  await openApp(page, { storage: { "om-a11y-output-mode": "audio-visual", "om-features": JSON.stringify({ options: { magnitudeReplay: "b" } }) } });
  await setTimes(page, "2", "4", "0.4");
  await page.evaluate(() => {
    gsShowScreen("compare");
    Object.assign(gsCompareState, { street: "full", intervalSec: 6, crossingSec: 4, expected: "longer", phase: "howmuch" });
    gsCompareHowMuchDone(2);
  });
  await tick(page, 300);
  const types = await page.evaluate(() => visualReplayState.events.map((e) => e.type));
  expect(types).toContain("sample");     // the first replay's comparison bar
  expect(types).toContain("reference");  // the second replay's result
});

test("bug 31: changing street during a replay, or Done at the street, stops scheduled sounds", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("compare"); Object.assign(gsCompareState, { intervalSec: 9, crossingSec: 8, expected: "longer" }); gsCompareReplay(); });
  expect(await page.evaluate(() => scheduledSounds.length)).toBeGreaterThan(0);
  await page.evaluate(() => gsCompareSetStreet("half"));
  expect(await page.evaluate(() => scheduledSounds.length)).toBe(0);
  await page.evaluate(() => {
    gsShowScreen("live"); document.getElementById("liveStartBtn").click();
    gsReplayJudgment({ sampleSec: 5, crossingSec: 4, startDelaySec: 0.3 });
  });
  expect(await page.evaluate(() => scheduledSounds.length)).toBeGreaterThan(0);
  await page.click("#liveBackBtn");
  expect(await page.evaluate(() => scheduledSounds.length)).toBe(0);
});

test("bug 31: hiding the app during a Practice my timing replay stops its sounds", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => {
    gsShowScreen("practice");
    document.getElementById("actionBtn").click();
    startTimestamp = performance.now() - 4000;
    document.getElementById("actionBtn").click(); // the last mark: the replay starts
  });
  expect(await page.evaluate(() => scheduledSounds.length)).toBeGreaterThan(0);
  await hide(page);
  expect(await page.evaluate(() => scheduledSounds.length)).toBe(0);
});

test("bug 32: a margin of 0, or no margin, is refused rather than turned into 0.4 s", async ({ page }) => {
  await openApp(page);
  for (const margin of ["0", ""]) {
    await setTimes(page, "4", "8", margin);
    expect(await page.evaluate(() => gsHasTimes() && validateSetup())).toBe(false);
  }
});

test("bug 33: impossible times are refused, and an accepted setup survives its own link", async ({ page }) => {
  await openApp(page);
  for (const [c, f, m] of [["601", "602", "61"], ["8", "4", "0.4"]]) {
    await setTimes(page, c, f, m);
    expect(await page.evaluate(() => gsHasTimes() && validateSetup())).toBe(false);
  }
  await setTimes(page, "3.5", "7", "0.3");
  const parsed = await page.evaluate(() => parseShareToken(buildShareTimingToken({ times: true, contact: false, features: false, lock: false })));
  expect(parsed?.times).toEqual(["3.5", "7", "0.3"]);
});

for (const theme of ["light", "dark"]) {
  test(`bug 34: ${theme}: the crossing-time field's border is at least 3:1 against its background`, async ({ page }) => {
    await openApp(page, { storage: { "om-a11y-theme": theme } });
    await page.evaluate(() => gsShowScreen("instructor"));
    expect(await contrast(page,
      "getComputedStyle(document.getElementById('clearTime')).borderTopColor",
      "(() => { let e = document.getElementById('clearTime').parentElement; while (e && getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)') e = e.parentElement; return getComputedStyle(e || document.body).backgroundColor; })()"
    )).toBeGreaterThanOrEqual(3);
  });
}

test("bug 35: after deleting history, the old report can no longer be sent", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => {
    gsLogAttempt({ activity: "practice", street: "full", userSec: 8, refSec: 8, diffSec: 0, correct: true, marginSec: 0.4 });
    gsShowScreen("progress");
    gsPreviewReport();
    gsClearData();
  });
  await page.click("#confirmDeleteHistoryBtn");   // build 15 (14.2): the warning comes first
  expect(await page.evaluate(() => document.getElementById("reportPreview").value)).not.toContain("Practice my timing");
});

test("bug 36: when copying fails, the app does not say it copied", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } });
    document.execCommand = () => false;
    navigator.share = undefined;
  });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.click("#shareTimingSettings");
  await expect(page.locator("#shareNote")).not.toContainText(/copied/i);
  await page.evaluate(() => { gsLogAttempt({ activity: "practice", street: "full", userSec: 8, refSec: 8, diffSec: 0, correct: true, marginSec: 0.4 }); gsShowScreen("progress"); });
  await page.evaluate(() => gsCopyReport());
  await expect(page.locator("#reportNote")).not.toContainText(/copied/i);
});

test("bug 37: the phone apps allow pinch zoom", async ({ page }) => {
  await page.addInitScript(nativeIos());
  await openApp(page);
  const meta = await page.getAttribute("meta[name='viewport']", "content");
  expect(meta).not.toContain("user-scalable=no");
  expect(meta).not.toMatch(/maximum-scale=1(\.0)?\b/);
});

test("bug 38: iPhone: the Direct Touch area follows the street surface after a vehicle is detected", async ({ page }) => {
  await page.addInitScript(nativeIos());
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("live"); document.getElementById("liveStartBtn").click(); });
  await tick(page, 150);
  await page.evaluate(() => gsLiveDetect("left"));
  await tick(page, 150);
  const [show, rect] = await page.evaluate(() => {
    const r = document.getElementById("liveSurface").getBoundingClientRect();
    return [window.__native.shows.at(-1), { y: r.top, height: r.height }];
  });
  expect(show.y).toBeCloseTo(rect.y, 0);
  expect(show.height).toBeCloseTo(rect.height, 0);
});

/* ---------------- 39 ---------------- */

test("bug 39: halfway-and-finish shows a score for the finish marks too", async ({ page }) => {
  await openApp(page, { storage: { "om-mode": "3" } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => {
    document.querySelector("input[name='mode'][value='3']").click();
    gsLogAttempt({ activity: "practice", street: "full", userSec: 8, refSec: 8, diffSec: 0, correct: true, marginSec: 0.4 });
    gsShowScreen("practice");
  });
  const score = await page.locator("#practiceScore").innerText();
  expect(score).toMatch(/Finish/);
  expect(score).toMatch(/1 within margin/);
});

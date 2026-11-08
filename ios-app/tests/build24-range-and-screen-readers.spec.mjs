// Build 24: the "about the same" range (tracker 20.16, Cindi's design of
// 7 Nov 2026), no volume tip (22.7), dialogs that only scroll up and down
// (22.4), the screen reader followed live and never talked over (22.1,
// 22.2, 22.8), and the buttons-only answer pad at large text (22.6, part).
import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, watchErrors } from "./helpers.mjs";

/* ---------------- 20.16: "about the same" is k x the crossing time ---------------- */

test("20.16: the range is 12% of the crossing time by default, and follows Instructor setup", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(() => {
    const before = [gsSameRangeK(), gsSameRangeSec(3), gsSameRangeSec(7)];
    const features = gsLoadFeatures();
    features.options.sameRange = "10";
    gsSaveFeatures(features);
    return { before, after: [gsSameRangeK(), gsSameRangeSec(9)] };
  });
  expect(r.before[0]).toBeCloseTo(0.12, 6);
  expect(r.before[1]).toBeCloseTo(0.36, 6);   // Cindi's example: 3 s gives 2.64 to 3.36
  expect(r.before[2]).toBeCloseTo(0.84, 6);   // 7 s gives 6.16 to 7.84
  expect(r.after[0]).toBeCloseTo(0.10, 6);
  expect(r.after[1]).toBeCloseTo(0.90, 6);
  await expect(page.locator("#ftSameRange")).toBeAttached();
});

test("20.16: inside the range 'about the same' and the true direction are both correct; outside only the direction", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(() => {
    const range = 0.36; // 12% of 3 s
    return {
      above: gsAcceptedAnswers(3.2, 3, range),
      below: gsAcceptedAnswers(2.8, 3, range),
      exact: gsAcceptedAnswers(3, 3, range),
      edge: gsAcceptedAnswers(3.36, 3, range),
      outLonger: gsAcceptedAnswers(3.5, 3, range),
      outShorter: gsAcceptedAnswers(2.5, 3, range),
      words: [gsAnswerTruthWords(3.2, 3, range), gsAnswerTruthWords(3.5, 3, range)]
    };
  });
  expect(r.above).toEqual(["same", "longer"]);
  expect(r.below).toEqual(["same", "shorter"]);
  expect(r.exact).toEqual(["same"]);
  expect(r.edge).toEqual(["same", "longer"]);
  expect(r.outLonger).toEqual(["longer"]);
  expect(r.outShorter).toEqual(["shorter"]);
  expect(r.words[0]).toBe("about the same, a little longer");
});

test("20.16: a large margin no longer changes what 'about the same' means, and every answer stays possible", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "1", "2", "0.9");   // a margin almost as large as the crossing
  const r = await page.evaluate(() => {
    const seen = new Set();
    for (let i = 0; i < 400; i += 1) {
      const range = gsSameRangeSec(1);
      const trial = gsBuildTrial(1, range);
      seen.add(trial.category);
      if (trial.category !== gsClassifyInterval(trial.interval, 1, range)) return { bad: trial };
    }
    return { seen: [...seen].sort() };
  });
  expect(r.bad).toBeUndefined();
  expect(r.seen).toEqual(["longer", "same", "shorter"]);
});

test("20.16: Comparison practice scores a close call either way, logs both answers and the range, and the report says so", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "3", "7", "0.4");
  await page.evaluate(() => {
    gsShowScreen("compare");
    // A close call above the crossing time: 3.2 s against 3 s.
    gsCompareState.street = "half";
    gsCompareState.intervalSec = 3.2;
    gsCompareState.crossingSec = 3;
    gsCompareState.marginSec = 0.4;
    gsCompareState.rangeSec = gsSameRangeSec(3);
    gsCompareState.expected = gsClassifyInterval(3.2, 3, gsCompareState.rangeSec);
    gsCompareState.phase = "answering";
    gsCompareAnswer("longer");
  });
  const log = await history(page);
  const last = log[log.length - 1];
  expect(last.correct).toBe(true);
  expect(last.expected).toBe("same");
  expect(last.accepted).toEqual(["same", "longer"]);
  expect(last.sameRangeSec).toBeCloseTo(0.36, 6);
  const report = await page.evaluate(() => {
    const entries = JSON.parse(localStorage.getItem("om-attempt-log") || "[]");
    const e = entries[entries.length - 1];
    return { line: gsReportLine(e), csv: gsCsvRow(e), header: GS_CSV_COLUMNS };
  });
  expect(report.line).toContain("about the same within");
  expect(report.line).toContain('correct answer "same" or "longer"');
  expect(report.header[report.header.length - 1]).toBe("about the same range (s)");
  expect(report.csv).toContain("same or longer");
  expect(report.csv.trim().endsWith("0.36") || report.csv.trim().endsWith("\"0.36\"")).toBe(true);
});

test("20.16: the range travels in the setup link; a link without it gets 12%", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(() => {
    const f = gsLoadFeatures();
    f.options.sameRange = "15";
    const code = encodeLinkFeatures(f);
    return {
      back: gsNormalizeFeatures(decodeLinkFeatures(code)).options.sameRange,
      old: gsNormalizeFeatures(decodeLinkFeatures(code.slice(0, -1))).options.sameRange
    };
  });
  expect(r.back).toBe("15");
  expect(r.old).toBe("12");
});

/* ---------------- 22.7: no volume tip ---------------- */

test("22.7: the app never tells the student to turn the volume up", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#volumeTip")).toHaveCount(0);
  const text = await page.evaluate(() => document.body.innerText);
  expect(text).not.toContain("volume is low");
  expect(await page.evaluate(() => typeof GS_LOW_VOLUME_TIP)).toBe("undefined");
});

/* ---------------- 22.4: dialogs scroll up and down only ---------------- */

for (const [width, size] of [[320, "max"], [320, "xxl"], [375, "max"], [430, "huge"]]) {
  test(`22.4: no dialog is wider than its card at ${width} px with text ${size}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await openApp(page, { storage: { "om-a11y-text-size": size } });
    const overflow = await page.evaluate(() => [...document.querySelectorAll("dialog")].map((d) => {
      d.showModal?.();
      const card = d.querySelector(".modal-card") || d;
      const result = { id: d.id, extra: card.scrollWidth - card.clientWidth, x: getComputedStyle(card).overflowX };
      d.close?.();
      return result;
    }));
    for (const o of overflow) {
      expect(o.extra, o.id).toBeLessThanOrEqual(0);
      if (o.id) expect(o.x, o.id).toBe("hidden");
    }
  });
}

/* ---------------- 22.1 / 22.2 / 22.8: screen readers ---------------- */

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
        App: { getInfo: async () => ({ version: "1.0", build: "24" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  }, { voiceOver, announceMs });
}

test("22.2: turning VoiceOver on or off while the app is open changes it at once", async ({ page }) => {
  await stubIosShell(page, { voiceOver: false });
  await openApp(page);
  await page.waitForFunction(() => gsScreenReaderOn() === false);
  await page.evaluate(() => window.__listeners.screenReader.forEach((fn) => fn({ screenReader: true })));
  expect(await page.evaluate(() => gsScreenReaderOn())).toBe(true);
  await page.evaluate(() => window.__listeners.screenReader.forEach((fn) => fn({ screenReader: false })));
  expect(await page.evaluate(() => gsScreenReaderOn())).toBe(false);
});

test("22.8: with VoiceOver, a description waits until VoiceOver reports it has finished", async ({ page }) => {
  await stubIosShell(page, { voiceOver: true, announceMs: 600 });
  await openApp(page, { storage: { "om-a11y-describe-sounds": "true" } });
  await page.waitForFunction(() => gsScreenReaderOn() === true);
  const r = await page.evaluate(() => new Promise((resolve) => {
    const at = performance.now();
    gsDescribe("Correct.", { onDone: () => resolve({ ms: performance.now() - at, said: window.__announced.slice() }) });
  }));
  expect(r.said).toContain("Correct.");
  expect(r.ms).toBeGreaterThanOrEqual(550);
  expect(r.ms).toBeLessThan(3000);
});

test("22.8: without word from the shell (TalkBack, a browser) the wait is long enough for slow speech", async ({ page }) => {
  await openApp(page, { storage: { "om-a11y-describe-sounds": "true" } });
  const r = await page.evaluate(() => {
    window.__gsScreenReader = true;
    return { replay: gsReplayIntro(), long: gsScreenReaderWaitSec("Not correct. It was about the same, a little longer.") };
  });
  expect(r.replay).toBeGreaterThanOrEqual(1.5);
  expect(r.long).toBeGreaterThanOrEqual(4.5);
});

test("22.1 and 22.8: with a screen reader the app's own voice never says 'Get ready'", async ({ page }) => {
  await page.addInitScript(() => {
    window.__spoken = [];
    const fake = { speaking: false, cancel() {}, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 10); }, getVoices() { return []; } };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  });
  await openApp(page);
  await setTimes(page, "3", "6", "0.4");
  await page.evaluate(() => { window.__gsScreenReader = true; window.__spoken = []; gsShowScreen("signal"); });
  await page.evaluate(() => document.getElementById("signalBtn")?.click());
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__spoken)).toEqual([]);
});

test("22.1: nothing is announced while the app is not the screen in front", async ({ page }) => {
  await openApp(page);
  const text = await page.evaluate(() => {
    const announcer = document.getElementById("srAnnouncer");
    announcer.textContent = "";
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    announceScreenReader("Should not be heard.");
    const result = announcer.textContent;
    delete document.hidden;
    return result;
  });
  expect(text).toBe("");
});

/* ---------------- 22.6 (first part): buttons-only answer pad ---------------- */

test("22.6: with buttons only, the answer pad scrolls and its buttons follow the text size", async ({ page }) => {
  const errors = watchErrors(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await openApp(page, { storage: { "om-a11y-text-size": "max" } });
  const r = await page.evaluate(() => {
    const f = gsLoadFeatures();
    f.options.compareSwipe = "off";
    gsSaveFeatures(f);
    gsOpenAnswerPad({ title: "Was that longer, shorter, or about the same as your crossing?", onAnswer: () => {}, onBack: () => {} });
    const overlay = document.getElementById("answerOverlay");
    const btn = overlay.querySelector(".answer-btn:not([hidden])");
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return {
      buttonsOnly: overlay.classList.contains("buttons-only"),
      overflowY: getComputedStyle(overlay).overflowY,
      font: parseFloat(getComputedStyle(btn).fontSize),
      root
    };
  });
  expect(r.buttonsOnly).toBe(true);
  expect(r.overflowY).toBe("auto");
  expect(r.font).toBeGreaterThan(28);            // no longer capped
  expect(r.font).toBeCloseTo(r.root * 1.02, 0);  // follows the student's size
  expect(errors).toEqual([]);
});

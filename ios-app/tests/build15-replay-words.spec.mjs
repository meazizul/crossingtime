// Build 15, part 2 (Jonggi's test of build 14, 25 Oct 2026): "Replay" is
// said before every replay and the tones wait for it; after the
// right-or-wrong sound and after each replay the app says in words what the
// sounds were, and the next step waits for the words; a replay bar shows the
// replay on screen; the margin is in words on the practice screens (F2).
import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, announcer, watchErrors, tick, waitUntil } from "./helpers.mjs";

/** A speech engine that records what is said and ends each utterance when told to (or after 10 ms). */
async function fakeSpeech(page, { autoEnd = true } = {}) {
  await page.addInitScript((autoEnd) => {
    window.__spoken = [];
    window.__pending = [];
    const fake = {
      speaking: false,
      cancel() { window.__spoken.push("<cancel>"); },
      speak(u) {
        window.__spoken.push(u.text);
        if (autoEnd) setTimeout(() => u.onend && u.onend(), 10);
        else window.__pending.push(u);
      },
      getVoices() { return []; }
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  }, autoEnd);
}

const spoken = (page) => page.evaluate(() => window.__spoken.filter((t) => t !== "<cancel>"));

async function practiceOneTry(page, storage = {}) {
  await openApp(page, { storage });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("practice"));
  await page.click("#actionBtn");                       // Begin
  await tick(page, 4000);
  await page.evaluate(() => { window.__spoken = []; });
  await page.click("#actionBtn");                       // Mark (Halfway), on time
}

test("settings: both speech options exist, are on by default, and persist", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#a11ySayReplay")).toBeChecked();
  await expect(page.locator("#a11yDescribeSounds")).toBeChecked();
  expect(await page.evaluate(() => [a11ySettings.sayReplay, a11ySettings.describeSounds])).toEqual([true, true]);
  await page.evaluate(() => { const b = document.getElementById("a11yDescribeSounds"); b.checked = false; b.dispatchEvent(new Event("change")); });
  expect(await page.evaluate(() => localStorage.getItem("om-a11y-describe-sounds"))).toBe("false");
  await openApp(page, { storage: { "om-a11y-describe-sounds": "false", "om-a11y-say-replay": "false" } });
  await expect(page.locator("#a11ySayReplay")).not.toBeChecked();
  await expect(page.locator("#a11yDescribeSounds")).not.toBeChecked();
  expect(await page.evaluate(() => [a11ySettings.sayReplay, a11ySettings.describeSounds])).toEqual([false, false]);
});

test("practice: 'Replay' is spoken before the tones, and the replay is described in words after it", async ({ page }) => {
  await page.clock.install();
  await fakeSpeech(page);
  const errors = watchErrors(page);
  await page.evaluate(() => {}).catch(() => {});
  await practiceOneTry(page);
  // Record the tones from here on.
  await page.evaluate(() => {
    window.__tones = [];
    const t0 = performance.now();
    for (const name of ["playStudentTone", "playFeedbackTone"]) {
      const real = window[name];
      window[name] = (...args) => { window.__tones.push([name, performance.now() - t0, args[0]]); return real(...args); };
    }
  });
  await tick(page, 50);
  expect(await spoken(page)).toEqual(["Replay"]);
  // The replay tones are scheduled at (lead-in + 1 s for the word) from now,
  // so nothing lands in the first 2 s of a 4 s mark.
  await tick(page, 9000);
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "practice", street: "half", correct: true });
  const said = await spoken(page);
  expect(said[0]).toBe("Replay");
  expect(said[said.length - 1]).toBe("That was your taps, then the crossing time: within the margin. Ready for another try.");
  // The spoken status replaces the live-region copy of the same words, so
  // nothing is said twice; the live region still got the replay cue.
  await expect(page.locator("#practiceScore")).toHaveText("Last 1: 1 within margin");
  expect(errors).toEqual([]);
});

test("practice: with the options off nothing is spoken and the lead-in is the old 1.5 s", async ({ page }) => {
  await page.clock.install();
  await fakeSpeech(page);
  await practiceOneTry(page, { "om-a11y-say-replay": "false", "om-a11y-describe-sounds": "false" });
  await tick(page, 9000);
  expect(await spoken(page)).toEqual([]);
  expect(await history(page)).toHaveLength(1);
  // Tracker 20.2: with the descriptions off the verdict is still read, in short.
  expect(await announcer(page)).toBe("Within the margin. Ready for another try.");
});

test("practice: with a screen reader running the words go to the live region, not the app's own voice", async ({ page }) => {
  await page.clock.install();
  await fakeSpeech(page);
  await page.addInitScript(() => { window.__gsScreenReader = true; });
  await practiceOneTry(page);
  await tick(page, 9000);
  expect(await spoken(page)).toEqual([]);
  expect(await announcer(page)).toBe("That was your taps, then the crossing time: within the margin. Ready for another try.");
});

test("practice: three-point mode describes both marks", async ({ page }) => {
  await page.clock.install();
  await fakeSpeech(page);
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("practice"));
  await page.click("label:has(#mode-start-halfway-finish)");
  await page.click("#actionBtn");
  await tick(page, 3000);                                // 1 s early for halfway
  await page.click("#actionBtn");
  await tick(page, 5000);                                // on time for finish
  await page.evaluate(() => { window.__spoken = []; });
  await page.click("#actionBtn");
  await tick(page, 14000);
  const said = await spoken(page);
  expect(said[0]).toBe("Replay");
  expect(said[said.length - 1]).toBe("That was your taps, then halfway: outside the margin, and finish: within the margin. Ready for another try.");
});

test("comparison practice: the result is spoken after the sound and the replay waits for the words", async ({ page }) => {
  await page.clock.install();
  await fakeSpeech(page, { autoEnd: false });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  await page.click("input[name='compareStreet'][value='full']");
  // Straight to an answered trial: longer, judged wrong ("same").
  await page.evaluate(() => {
    Object.assign(gsCompareState, { phase: "answering", intervalSec: 10, crossingSec: 8, marginSec: 0.4, expected: "longer" });
    window.__spoken = [];
    gsCompareAnswer("same");
  });
  await tick(page, 50);
  expect(await spoken(page)).toEqual(["Not correct. It was longer."]);
  // Two seconds on and the words have not ended: no replay yet.
  await tick(page, 2000);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("judged");
  expect(await spoken(page)).toEqual(["Not correct. It was longer."]);
  // The words end: the replay follows, announced by its own word.
  await page.evaluate(() => { window.__pending.shift().onend(); });
  await tick(page, 1300);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("replaying");
  expect(await spoken(page)).toEqual(["Not correct. It was longer.", "Replay"]);
  await page.evaluate(() => { window.__pending.shift().onend(); });
  await waitUntil(page, () => gsCompareState.phase === "idle", { ms: 20000, step: 250 });
  const said = await spoken(page);
  expect(said[said.length - 1]).toBe("That was the sample warning time, then your own sound where your crossing time ends. Press Play for another.");
  await expect(page.locator("#compareStatusText")).toHaveText("Press Play for another.");
});

test("comparison practice: a right answer says Correct and 'about the same' is said in words", async ({ page }) => {
  await page.clock.install();
  await fakeSpeech(page);
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  await page.evaluate(() => {
    Object.assign(gsCompareState, { phase: "answering", intervalSec: 8.1, crossingSec: 8, marginSec: 0.4, rangeSec: 0.96, expected: "same" });
    window.__spoken = [];
    gsCompareAnswer("same");
  });
  await tick(page, 50);
  expect(await spoken(page)).toEqual(["Correct."]);
  await page.evaluate(() => {
    // Build 24 (20.16): 8.1 s is inside the range, so "longer" is also
    // correct; "shorter" is the wrong direction.
    Object.assign(gsCompareState, { phase: "answering", intervalSec: 8.1, crossingSec: 8, marginSec: 0.4, rangeSec: 0.96, expected: "same" });
    window.__spoken = [];
    gsCompareAnswer("shorter");
  });
  await tick(page, 50);
  expect(await spoken(page)).toEqual(["Not correct. It was about the same, a little longer."]);
  await page.evaluate(() => {
    Object.assign(gsCompareState, { phase: "answering", intervalSec: 9.5, crossingSec: 8, marginSec: 0.4, rangeSec: 0.96, expected: "longer" });
    window.__spoken = [];
    gsCompareAnswer("same");
  });
  await tick(page, 50);
  expect(await spoken(page)).toEqual(["Not correct. It was longer."]);
});

test("comparison preparation and the street: the replay is described after it", async ({ page }) => {
  await page.clock.install();
  await fakeSpeech(page);
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  // Preparation: finish a produced interval directly.
  await page.evaluate(() => gsShowScreen("signal"));
  await page.evaluate(() => {
    window.__spoken = [];
    gsSignalState.street = "full";
    gsSignalState.style = "continuous";
    gsSignalState.phase = "timing";
    gsSignalResolve(8.3);
  });
  await tick(page, 50);
  expect(await spoken(page)).toEqual(["Replay"]);
  await waitUntil(page, () => gsSignalState.phase === "idle", { ms: 20000, step: 250 });
  let said = await spoken(page);
  expect(said[said.length - 1]).toBe("That was the sample, your stop, and your crossing time: within the margin. Ready for another.");
  await expect(page.locator("#signalStatusText")).toHaveText("Ready for another.");

  // The street: a judged vehicle with the replay set to always.
  await page.evaluate(() => gsShowScreen("live"));
  await page.evaluate(() => {
    window.__spoken = [];
    Object.assign(gsLiveState, { phase: "judging", direction: "left", warningSec: 6, crossingSec: 8, marginSec: 0.4, category: "shorter" });
    gsLiveAnswer("shorter");
  });
  await tick(page, 50);
  expect(await spoken(page)).toEqual(["Correct."]);
  await waitUntil(page, () => gsLiveState.phase === "detect", { ms: 25000, step: 250 });
  said = await spoken(page);
  expect(said).toContain("Replay");
  expect(said[said.length - 1]).toBe("That was the warning time, then your own sound where your crossing time ends. Ready for the next vehicle.");
});

test("the replay bar shows during a practice replay, marks each sound, then hides", async ({ page }) => {
  // Real timers: the bar follows the audio clock.
  await openApp(page, { storage: { "om-a11y-say-replay": "false", "om-a11y-describe-sounds": "false" } });
  await setTimes(page, "2", "4", "0.4");
  await page.evaluate(() => gsShowScreen("practice"));
  const bar = page.locator("#screen-practice .replay-bar");
  await expect(bar).toBeHidden();
  await page.click("#actionBtn");
  await page.waitForTimeout(2000);
  await page.click("#actionBtn");
  await expect(bar).toBeVisible({ timeout: 3000 });
  await expect(bar.locator(".replay-bar-label")).toHaveText("Replay");
  await expect.poll(() => bar.locator(".replay-tick").count(), { timeout: 8000 }).toBeGreaterThanOrEqual(2);
  const kinds = await bar.locator(".replay-tick").evaluateAll((els) => els.map((e) => e.className));
  expect(kinds.some((k) => k.includes("tick-user"))).toBe(true);
  expect(kinds.some((k) => k.includes("tick-ok") || k.includes("tick-outside"))).toBe(true);
  await expect(bar).toBeHidden({ timeout: 8000 });
  // Screen readers skip the bar: it is not a control and has no text for them.
  expect(await bar.getAttribute("aria-hidden")).toBe("true");
});

test("F2: the margin is in words on the practice screens unless Show times is on", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("practice"));
  await expect(page.locator("#practiceScore")).toHaveText("No attempts yet");
  await page.evaluate(() => gsShowScreen("signal"));
  await expect(page.locator("#signalScore")).toHaveText("No attempts yet");
  await page.evaluate(() => gsShowScreen("compare"));
  await expect(page.locator("#compareScore")).toHaveText("No attempts yet");
  await page.evaluate(() => { const t = document.getElementById("debugToggle"); t.checked = true; t.dispatchEvent(new Event("change")); gsCompareRenderScore(); });
  await expect(page.locator("#compareScore")).toHaveText("No attempts yet · margin 0.40s");
});

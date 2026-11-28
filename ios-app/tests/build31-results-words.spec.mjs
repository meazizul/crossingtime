// Build 31: tracker 28.10 (found by Cindi Lashinsky on build 28; the design
// agreed by her 27 Nov 2026). The results in words are a choice of three,
// where builds 15 to 30 had the tick box "Announce results and describe the
// sounds":
//   Full   the whole sentence for the first three tries in an activity, then
//          the short result; the whole sentence comes back after three days
//          away, or after a try in another activity;
//   Short  the short result on every try (the words the unticked box gave);
//   Off    nothing is said or given to the screen reader after a try; the
//          sounds and the vibration carry the result, and it still shows.
// The short result is said the same way as the whole sentence and to the
// same people: by the screen reader when one is running, otherwise by the
// app's own voice, and never by both.
// Verbosity Low sets Short; Medium and High set Full. A tick box value kept
// by an older build is carried over: ticked is Full, unticked is Short.
import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, watchErrors, tick, waitUntil } from "./helpers.mjs";

const WHOLE = "That was your taps, then the crossing time: within the margin. Ready for another try.";
const SHORT = "Within the margin. Ready for another try.";
const SELF_VOICE = { "om-a11y-self-voice": "true" };
const DAY_MS = 24 * 60 * 60 * 1000;

/** A speech engine that records what is said, and a record of everything given to the screen reader.
 *  With autoEnd false an utterance ends only when the test ends it (window.__pending). */
async function listen(page, { autoEnd = true } = {}) {
  await page.addInitScript((autoEnd) => {
    window.__spoken = [];
    window.__announced = [];
    window.__pending = [];
    const fake = {
      speaking: false,
      cancel() {},
      speak(u) {
        window.__spoken.push(u.text);
        if (autoEnd) setTimeout(() => u.onend && u.onend(), 10);
        else window.__pending.push(u);
      },
      getVoices() { return []; }
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    document.addEventListener("DOMContentLoaded", () => {
      const region = document.getElementById("srAnnouncer");
      if (!region) return;
      new MutationObserver(() => {
        const text = region.textContent.replace(/​/g, "");
        if (text) window.__announced.push(text);
      }).observe(region, { childList: true, characterData: true, subtree: true });
    });
  }, autoEnd);
}

const spoken = (page) => page.evaluate(() => window.__spoken.slice());
const announced = (page) => page.evaluate(() => window.__announced.slice());
const forget = (page) => page.evaluate(() => { window.__spoken = []; window.__announced = []; });
/* "Replay" before a replay is its own setting; it is not a word after a try. */
const afterTry = (list) => list.filter((text) => !/^Replay\.?$/.test(text));

async function openPractice(page, storage = {}) {
  await openApp(page, { storage });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("practice"));
}

/** One Start-to-Halfway try, on time, heard to the end of its replay. */
async function practiceTry(page) {
  await page.click("#actionBtn");                       // Begin
  await tick(page, 4000);
  await page.click("#actionBtn");                       // Mark (Halfway)
  await tick(page, 1500);                               // "Replay" has been said
  await forget(page);
  await tick(page, 9000);
}

const tries = (page, name) => page.evaluate((n) => JSON.parse(localStorage.getItem(`om-results-tries-${n}`) || "null"), name);

async function choose(page, selector, value) {
  await page.evaluate(([sel, v]) => {
    const el = document.querySelector(sel);
    el.value = v;
    el.dispatchEvent(new Event("change"));
  }, [selector, value]);
}

/* ---------------- The setting ---------------- */

test("28.10: Results in words is Full by default, with three choices and no fourth", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await expect(page.locator('label[for="a11yResultsWords"]')).toHaveText("Results in words");
  await expect(page.locator("#a11yResultsWords")).toHaveValue("full");
  await expect(page.locator("#a11yResultsWords option")).toHaveText([
    "Full: the whole sentence for the first three tries, then the short result (default)",
    'Short: only the short result, for example "Within the margin."',
    "Off: no words after a try; the sounds and the vibration carry the result"
  ]);
  await expect(page.locator("#a11yDescribeSounds")).toHaveCount(0);       // the tick box is gone
  expect(await page.evaluate(() => [a11ySettings.resultsWords, gsResultsWords("practice"), gsResultsWordsNow("practice"), localStorage.getItem("om-a11y-results-words")]))
    .toEqual(["full", "full", "full", null]);
  expect(errors).toEqual([]);
});

test("28.10: a new choice is kept, and confirmed in words by the app's voice or the screen reader", async ({ page }) => {
  await listen(page);
  await openApp(page);
  await forget(page);
  await choose(page, "#a11yResultsWords", "off");
  expect(await spoken(page)).toEqual(["Results in words: off."]);
  await choose(page, "#a11yResultsWords", "short");
  await choose(page, "#a11yResultsWords", "full");
  expect(await spoken(page)).toEqual(["Results in words: off.", "Results in words: short.", "Results in words: full."]);
  // With a screen reader the words go to it, and the app's voice stays quiet.
  await page.evaluate(() => { window.__gsScreenReader = true; });
  await forget(page);
  await choose(page, "#a11yResultsWords", "off");
  expect(await spoken(page)).toEqual([]);
  expect(await announced(page)).toEqual(["Results in words: off."]);
  expect(await page.evaluate(() => [a11ySettings.resultsWords, localStorage.getItem("om-a11y-results-words")])).toEqual(["off", "off"]);
  await page.evaluate(() => gsStore?.commitNow?.());
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await expect(page.locator("#a11yResultsWords")).toHaveValue("off");
  expect(await page.evaluate(() => gsResultsWords("signal"))).toBe("off");
});

/* ---------------- Full ---------------- */

test("28.10 Full: the whole sentence on tries one to three, the short result from the fourth", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  const errors = watchErrors(page);
  await openPractice(page, SELF_VOICE);                  // "Speak directions aloud", as on Cindi's phone
  for (let n = 1; n <= 3; n += 1) {
    await practiceTry(page);
    expect(afterTry(await spoken(page)), `try ${n}`).toEqual([WHOLE]);
    expect((await tries(page, "practice")).count).toBe(n);
  }
  for (let n = 4; n <= 5; n += 1) {
    await practiceTry(page);
    expect(afterTry(await spoken(page)), `try ${n}`).toEqual([SHORT]);
    await expect(page.locator("#cueBannerText")).toHaveText(SHORT);
  }
  expect(await history(page)).toHaveLength(5);
  expect(errors).toEqual([]);
});

test("28.10 Full: with a screen reader the same sentences go to it, whole and then short", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  await page.addInitScript(() => { window.__gsScreenReader = true; });
  await openPractice(page, { "om-a11y-say-replay": "false" });
  await practiceTry(page);
  expect(await announced(page)).toEqual([WHOLE]);
  await page.evaluate(() => localStorage.setItem("om-results-tries-practice", JSON.stringify({ count: 3, at: Date.now() })));
  await practiceTry(page);
  expect(await announced(page)).toEqual([SHORT]);
  expect(await spoken(page)).toEqual([]);
});

test("28.10 Full: the whole sentence comes back after three days away", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  await openPractice(page, SELF_VOICE);
  // Seven tries, the last one just under three days ago: still the short result.
  await page.evaluate((ms) => localStorage.setItem("om-results-tries-practice", JSON.stringify({ count: 7, at: Date.now() - ms })), 3 * DAY_MS - 60000);
  expect(await page.evaluate(() => gsResultsWordsNow("practice"))).toBe("short");
  await practiceTry(page);
  expect(afterTry(await spoken(page))).toEqual([SHORT]);
  expect((await tries(page, "practice")).count).toBe(8);
  // Three days since the last try: the whole sentence, and the count starts again.
  await page.evaluate((ms) => localStorage.setItem("om-results-tries-practice", JSON.stringify({ count: 8, at: Date.now() - ms })), 3 * DAY_MS);
  expect(await page.evaluate(() => gsResultsWordsNow("practice"))).toBe("full");
  await practiceTry(page);
  expect(afterTry(await spoken(page))).toEqual([WHOLE]);
  expect((await tries(page, "practice")).count).toBe(1);
});

test("28.10 Full: a try in another activity brings the whole sentence back", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  await openPractice(page, SELF_VOICE);
  await page.evaluate(() => localStorage.setItem("om-results-tries-practice", JSON.stringify({ count: 5, at: Date.now() })));
  await practiceTry(page);
  expect(afterTry(await spoken(page))).toEqual([SHORT]);

  // One try in Comparison preparation: its own first try, in full.
  await page.evaluate(() => gsShowScreen("signal"));
  await page.evaluate(() => {
    gsSignalState.street = "full";
    gsSignalState.style = "continuous";
    gsSignalState.phase = "timing";
    window.__spoken = [];
    gsSignalResolve(8.3);
  });
  await waitUntil(page, () => gsSignalState.phase === "idle", { ms: 20000, step: 250 });
  await tick(page, 300);
  expect(afterTry(await spoken(page))).toEqual(["That was the sample, your stop, and your crossing time: within the margin. Ready for another."]);
  expect(await tries(page, "practice")).toBeNull();
  expect((await tries(page, "signal")).count).toBe(1);

  // Back in Practice my timing the whole sentence is said again.
  await page.evaluate(() => gsShowScreen("practice"));
  await practiceTry(page);
  expect(afterTry(await spoken(page))).toEqual([WHOLE]);
  expect(await tries(page, "signal")).toBeNull();
});

test("28.10 Full: Comparison practice says 'Not correct. It was longer.' three times, then 'Not correct.'", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  await openApp(page, { storage: SELF_VOICE });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  const answer = async () => {
    await page.evaluate(() => {
      gsCompareCancel();
      Object.assign(gsCompareState, { phase: "answering", intervalSec: 10, crossingSec: 8, marginSec: 0.4, rangeSec: 0.96, expected: "longer" });
      window.__spoken = [];
      gsCompareAnswer("same");
    });
    await tick(page, 100);
    return spoken(page);
  };
  for (let n = 1; n <= 3; n += 1) expect(await answer(), `try ${n}`).toEqual(["Not correct. It was longer."]);
  expect(await answer()).toEqual(["Not correct."]);
  await expect(page.locator("#compareStatusText")).toHaveText("Not correct.");
});

/* ---------------- Short ---------------- */

test("28.10 Short: only the short result, from the first try on, said once", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  await openPractice(page, { ...SELF_VOICE, "om-a11y-results-words": "short" });
  await expect(page.locator("#a11yResultsWords")).toHaveValue("short");
  for (let n = 1; n <= 2; n += 1) {
    await practiceTry(page);
    expect(afterTry(await spoken(page)), `try ${n}`).toEqual([SHORT]);
    expect(afterTry(await announced(page)), `try ${n}`).toEqual([]);     // the voice says it; not the live region as well
    await expect(page.locator("#cueBannerText")).toHaveText(SHORT);
  }
});

/* ---------------- The short result is spoken, like the whole sentence ---------------- */

test("28.10: with the settings of a new install the short result is spoken: Short on every try, Full from the fourth; Off says nothing", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  const errors = watchErrors(page);
  await openPractice(page);                              // no "Speak directions aloud", no screen reader
  expect(await page.evaluate(() => [a11ySettings.selfVoice, gsScreenReaderOn(), a11ySettings.resultsWords])).toEqual([false, false, "full"]);

  // Full: the whole sentence three times, then the short result, each by the app's voice only.
  for (let n = 1; n <= 3; n += 1) {
    await practiceTry(page);
    expect(afterTry(await spoken(page)), `Full, try ${n}`).toEqual([WHOLE]);
    expect(afterTry(await announced(page)), `Full, try ${n}`).toEqual([]);
  }
  await practiceTry(page);
  expect(afterTry(await spoken(page)), "Full, try 4").toEqual([SHORT]);
  expect(afterTry(await announced(page)), "Full, try 4").toEqual([]);
  await expect(page.locator("#cueBannerText")).toHaveText(SHORT);

  // Short: the short result on the first try after choosing it.
  await choose(page, "#a11yResultsWords", "short");
  await practiceTry(page);
  expect(afterTry(await spoken(page)), "Short").toEqual([SHORT]);
  expect(afterTry(await announced(page)), "Short").toEqual([]);

  // Off: nothing at all.
  await choose(page, "#a11yResultsWords", "off");
  await practiceTry(page);
  expect(afterTry(await spoken(page)), "Off").toEqual([]);
  expect(afterTry(await announced(page)), "Off").toEqual([]);
  await expect(page.locator("#cueBannerText")).toHaveText(SHORT);
  expect(await history(page)).toHaveLength(6);
  expect(errors).toEqual([]);
});

test("28.10 Short: in the other activities the short result is spoken once, by the app's voice", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  await openApp(page, { storage: { "om-a11y-results-words": "short" } });
  await setTimes(page, "4", "8", "0.4");

  // Comparison preparation.
  await page.evaluate(() => gsShowScreen("signal"));
  await page.evaluate(() => {
    gsSignalState.street = "full";
    gsSignalState.style = "continuous";
    gsSignalState.phase = "timing";
    window.__spoken = [];
    window.__announced = [];
    gsSignalResolve(8.3);
  });
  await waitUntil(page, () => gsSignalState.phase === "idle", { ms: 20000, step: 250 });
  await tick(page, 300);
  expect(afterTry(await spoken(page))).toEqual(["Within the margin. Ready for another."]);
  expect(afterTry(await announced(page))).toEqual([]);
  await expect(page.locator("#signalStatusText")).toHaveText("Within the margin. Ready for another.");

  // Comparison practice: the short result, then the prompt after the replay.
  await page.evaluate(() => gsShowScreen("compare"));
  await page.evaluate(() => {
    Object.assign(gsCompareState, { phase: "answering", intervalSec: 10, crossingSec: 8, marginSec: 0.4, rangeSec: 0.96, expected: "longer" });
    window.__spoken = [];
    window.__announced = [];
    gsCompareAnswer("same");
  });
  await waitUntil(page, () => gsCompareState.phase === "idle", { ms: 25000, step: 250 });
  await tick(page, 300);
  expect(afterTry(await spoken(page))).toEqual(["Not correct.", "Press Play for another."]);
  expect(afterTry(await announced(page))).toEqual([]);
  await expect(page.locator("#compareStatusText")).toHaveText("Press Play for another.");

  // At the street: a judged vehicle with the replay set to always.
  await page.evaluate(() => gsShowScreen("live"));
  await page.evaluate(() => {
    window.__spoken = [];
    window.__announced = [];
    Object.assign(gsLiveState, { phase: "judging", direction: "left", warningSec: 6, crossingSec: 8, marginSec: 0.4, category: "shorter" });
    gsLiveAnswer("shorter");
  });
  await waitUntil(page, () => gsLiveState.phase === "detect", { ms: 25000, step: 250 });
  await tick(page, 300);
  expect(afterTry(await spoken(page))).toEqual(["Correct.", "Ready for the next vehicle."]);
  expect(afterTry(await announced(page))).toEqual([]);
});

test("28.10 Short: the next step waits for the short result to be over, as it does for the whole sentence", async ({ page }) => {
  await page.clock.install();
  await listen(page, { autoEnd: false });
  await openApp(page, { storage: { "om-a11y-results-words": "short", "om-a11y-say-replay": "false" } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  await page.evaluate(() => {
    Object.assign(gsCompareState, { phase: "answering", intervalSec: 10, crossingSec: 8, marginSec: 0.4, rangeSec: 0.96, expected: "longer" });
    window.__spoken = [];
    window.__pending = [];
    gsCompareAnswer("same");
  });
  await tick(page, 50);
  expect(await spoken(page)).toEqual(["Not correct."]);
  // The words have not ended: past the 1.2 s a silent result waits, there
  // is still no replay. (A voice that never reports its end is given up on
  // a little later, as for the whole sentence.)
  await tick(page, 1250);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("judged");
  // The words end: the replay follows.
  await page.evaluate(() => { window.__pending.shift().onend(); });
  await tick(page, 300);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("replaying");
});

test("28.10 Short: with a screen reader the short result goes to it, and the app's voice stays quiet", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  await page.addInitScript(() => { window.__gsScreenReader = true; });
  await openPractice(page, { "om-a11y-results-words": "short", "om-a11y-say-replay": "false" });
  await practiceTry(page);
  expect(await spoken(page)).toEqual([]);
  expect(await announced(page)).toEqual([SHORT]);
});

/* ---------------- Off ---------------- */

test("28.10 Off: after a practice try nothing is spoken or announced; the result shows and the next try starts", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  const errors = watchErrors(page);
  await openPractice(page, { ...SELF_VOICE, "om-a11y-results-words": "off" });
  await practiceTry(page);
  expect(await spoken(page)).toEqual([]);                // not the result, not "Ready for another try"
  expect(await announced(page)).toEqual([]);
  await expect(page.locator("#cueBannerText")).toHaveText(SHORT);
  await expect(page.locator("#practiceScore")).toHaveText("Last 1: 1 within margin");
  // The next try starts and is scored like the first.
  await expect(page.locator("#actionBtn")).toHaveClass(/idle/);
  await practiceTry(page);
  expect(await spoken(page)).toEqual([]);
  expect(await announced(page)).toEqual([]);
  expect(await history(page)).toHaveLength(2);
  expect(errors).toEqual([]);
});

test("28.10 Off: nothing is handed to VoiceOver or TalkBack after a try", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  await page.addInitScript(() => { window.__gsScreenReader = true; });
  await openPractice(page, { "om-a11y-results-words": "off" });
  await practiceTry(page);
  expect(await spoken(page)).toEqual([]);
  expect(await announced(page)).toEqual([]);
  await expect(page.locator("#cueBannerText")).toHaveText(SHORT);
});

test("28.10 Off: Comparison practice shows the result, says nothing, goes on to the replay and to the next sample", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  await openApp(page, { storage: { ...SELF_VOICE, "om-a11y-results-words": "off" } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  await page.evaluate(() => {
    Object.assign(gsCompareState, { phase: "answering", intervalSec: 10, crossingSec: 8, marginSec: 0.4, rangeSec: 0.96, expected: "longer" });
    window.__spoken = [];
    window.__announced = [];
    gsCompareAnswer("same");
  });
  await tick(page, 400);
  await expect(page.locator("#compareStatusText")).toHaveText("Not correct.");
  // The replay still follows, after the same short wait as with nothing to say.
  await tick(page, 1200);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("replaying");
  await waitUntil(page, () => gsCompareState.phase === "idle", { ms: 25000, step: 250 });
  await tick(page, 300);
  await expect(page.locator("#compareStatusText")).toHaveText("Press Play for another.");
  expect(afterTry(await spoken(page))).toEqual([]);
  expect(afterTry(await announced(page))).toEqual([]);
  // Play starts the next sample.
  await page.click("#compareStartBtn");
  await tick(page, 300);
  expect(await page.evaluate(() => gsCompareState.phase)).not.toBe("idle");
  // A message that is not the end of a try is still read.
  await page.evaluate(() => { gsCompareCancel(); window.__announced = []; gsCompareFinish("Cancelled. Not scored. Press Play for another.", "neutral", { focus: "title" }); });
  expect(await announced(page)).toEqual(["Cancelled. Not scored. Press Play for another."]);
});

test("28.10 Off: Comparison preparation and the street show the result and say nothing", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  await openApp(page, { storage: { ...SELF_VOICE, "om-a11y-results-words": "off" } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("signal"));
  await page.evaluate(() => {
    gsSignalState.street = "full";
    gsSignalState.style = "continuous";
    gsSignalState.phase = "timing";
    window.__spoken = [];
    window.__announced = [];
    gsSignalResolve(8.3);
  });
  await waitUntil(page, () => gsSignalState.phase === "idle", { ms: 20000, step: 250 });
  await tick(page, 300);
  await expect(page.locator("#signalStatusText")).toHaveText("Within the margin. Ready for another.");
  expect(afterTry(await spoken(page))).toEqual([]);
  expect(afterTry(await announced(page))).toEqual([]);

  await page.evaluate(() => gsShowScreen("live"));
  await page.evaluate(() => {
    window.__spoken = [];
    window.__announced = [];
    Object.assign(gsLiveState, { phase: "judging", direction: "left", warningSec: 6, crossingSec: 8, marginSec: 0.4, category: "shorter" });
    gsLiveAnswer("shorter");
  });
  await tick(page, 200);
  await expect(page.locator("#liveStatusText")).toHaveText("Correct.");
  await waitUntil(page, () => gsLiveState.phase === "detect", { ms: 25000, step: 250 });
  await tick(page, 300);
  await expect(page.locator("#liveStatusText")).toHaveText("Ready for the next vehicle.");
  expect(afterTry(await spoken(page))).toEqual([]);
  expect(afterTry(await announced(page))).toEqual([]);
});

/* ---------------- Verbosity ---------------- */

test("28.10: verbosity Low sets Short, Medium and High set Full; Off is only chosen by hand", async ({ page }) => {
  await openApp(page);
  const levelAfter = async (verbosity) => {
    await choose(page, "#a11yVerbosity", verbosity);
    return page.evaluate(() => [a11ySettings.resultsWords, document.getElementById("a11yResultsWords").value, localStorage.getItem("om-a11y-results-words")]);
  };
  expect(await levelAfter("low")).toEqual(["short", "short", "short"]);
  expect(await levelAfter("medium")).toEqual(["full", "full", "full"]);
  expect(await levelAfter("low")).toEqual(["short", "short", "short"]);
  expect(await levelAfter("high")).toEqual(["full", "full", "full"]);
  // Off by hand stays until a level is chosen again; no level gives Off.
  await choose(page, "#a11yResultsWords", "off");
  expect(await page.evaluate(() => [a11ySettings.verbosity, a11ySettings.resultsWords])).toEqual(["high", "off"]);
  for (const verbosity of ["low", "medium", "high"]) expect((await levelAfter(verbosity))[0]).not.toBe("off");
  await expect(page.locator("#a11yVerbosity + .setup-note")).toContainText("only the short result after a try");
  await expect(page.locator("#a11yVerbosity + .setup-note")).not.toContainText("no words after them");
});

/* ---------------- Updating from build 30 ---------------- */

test("28.10: a ticked box from build 30 becomes Full", async ({ page }) => {
  await openApp(page, { storage: { "om-a11y-describe-sounds": "true" } });
  await expect(page.locator("#a11yResultsWords")).toHaveValue("full");
  expect(await page.evaluate(() => [a11ySettings.resultsWords, localStorage.getItem("om-a11y-results-words"), localStorage.getItem("om-a11y-describe-sounds")]))
    .toEqual(["full", "full", null]);
});

test("28.10: an unticked box from build 30 becomes Short; nobody is moved to Off", async ({ page }) => {
  await openApp(page, { storage: { "om-a11y-describe-sounds": "false", "om-a11y-verbosity": "low" } });
  await expect(page.locator("#a11yResultsWords")).toHaveValue("short");
  expect(await page.evaluate(() => [a11ySettings.resultsWords, localStorage.getItem("om-a11y-results-words"), localStorage.getItem("om-a11y-describe-sounds")]))
    .toEqual(["short", "short", null]);
  // The choice made in build 31 wins over a tick box value that is still around.
  await page.evaluate(() => {
    localStorage.setItem("om-a11y-results-words", "off");
    localStorage.setItem("om-a11y-describe-sounds", "true");
    return gsStore?.commitNow?.();
  });
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await expect(page.locator("#a11yResultsWords")).toHaveValue("off");
  expect(await page.evaluate(() => localStorage.getItem("om-a11y-describe-sounds"))).toBeNull();
});

test("28.10: each activity's own tick box from build 30 is carried over the same way", async ({ page }) => {
  await openApp(page, { storage: {
    "om-a11y-describe-sounds": "true",
    "om-a11y-describe-where": "each",
    "om-a11y-describe-practice": "true",
    "om-a11y-describe-signal": "true",
    "om-a11y-describe-compare": "false",
    "om-a11y-describe-live": "false"
  } });
  expect(await page.evaluate(() => ["practice", "signal", "compare", "live"].map((n) => gsResultsWords(n)))).toEqual(["full", "full", "short", "short"]);
  expect(await page.evaluate(() => ["practice", "compare"].map((n) => [localStorage.getItem(`om-a11y-results-words-${n}`), localStorage.getItem(`om-a11y-describe-${n}`)])))
    .toEqual([["full", null], ["short", null]]);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("compare"));
  await expect(page.locator('#screen-compare [data-results-words="compare"]')).toHaveValue("short");
});

/* ---------------- On each activity page ---------------- */

test("28.10: on each activity page the choice is the same three, and each page keeps its own", async ({ page }) => {
  await page.clock.install();
  await listen(page);
  await openPractice(page, SELF_VOICE);
  await choose(page, "#a11yDescribeWhere", "each");
  await expect(page.locator("#a11yResultsWords")).toBeDisabled();
  const own = page.locator('#screen-practice [data-results-words="practice"]');
  await expect(own).toBeVisible();
  await expect(own).toHaveValue("full");
  await expect(page.locator('#screen-practice [data-results-words="practice"] option')).toHaveText([
    "Full: the whole sentence, then the short result",
    "Short: only the short result",
    "Off: no words after a try"
  ]);
  await expect(page.locator("#screen-practice .results-words-switch")).toContainText("Results in words");
  await forget(page);
  await own.selectOption("off");
  expect(await announced(page)).toEqual(["Results in words here: off."]);
  expect(await page.evaluate(() => ["practice", "signal", "compare", "live"].map((n) => gsResultsWords(n)))).toEqual(["off", "full", "full", "full"]);
  expect(await page.evaluate(() => localStorage.getItem("om-a11y-results-words-practice"))).toBe("off");

  // Off here: a practice try says nothing. Full in Comparison preparation: the whole sentence.
  await practiceTry(page);
  expect(await spoken(page)).toEqual([]);
  expect(await announced(page)).toEqual([]);
  await page.evaluate(() => gsShowScreen("signal"));
  await page.evaluate(() => {
    gsSignalState.street = "full";
    gsSignalState.style = "continuous";
    gsSignalState.phase = "timing";
    window.__spoken = [];
    gsSignalResolve(8.3);
  });
  await waitUntil(page, () => gsSignalState.phase === "idle", { ms: 20000, step: 250 });
  await tick(page, 300);
  expect(afterTry(await spoken(page))).toEqual(["That was the sample, your stop, and your crossing time: within the margin. Ready for another."]);

  // Back to "Here, for every activity": the choice in Accessibility applies again.
  await choose(page, "#a11yDescribeWhere", "all");
  await expect(page.locator("#screen-practice .results-words-switch")).toBeHidden();
  expect(await page.evaluate(() => gsResultsWords("practice"))).toBe("full");
});

/* ---------------- The recorded voice ---------------- */

test("28.10: every sentence said after a try, and for the new setting, has a recording", async ({ page }) => {
  await openApp(page, { voice: "natural" });
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  const missing = await page.evaluate(() => {
    const margin = ["within the margin", "outside the margin"];
    const cap = (text) => text.replace(/^./, (c) => c.toUpperCase());
    const said = [
      "Results in words: full.", "Results in words: short.", "Results in words: off.",
      "Results in words here: full.", "Results in words here: short.", "Results in words here: off.",
      "Each activity page now has its own choice for results in words.",
      "The choice here now applies to every activity.",
      "Verbosity high.", "Verbosity medium.", "Verbosity low.",
      "Correct.", "Not correct.",
      "Not correct. It was longer.", "Not correct. It was shorter.", "Not correct. It was about the same.",
      "That was the sample warning time, then your own sound where your crossing time ends. Press Play for another.",
      "Press Play for another.", "Ready for another.", "Ready for the next vehicle.",
      "That was the warning time, then your own sound where your crossing time ends. Ready for the next vehicle."
    ];
    margin.forEach((m) => {
      said.push(`That was your taps, then the crossing time: ${m}. Ready for another try.`);
      said.push(`${cap(m)}. Ready for another try.`);
      said.push(`That was the sample, your stop, and your crossing time: ${m}. Ready for another.`);
      said.push(`${cap(m)}. Ready for another.`);
      said.push(`${cap(m)}. Press Play for another.`);
      said.push(`${cap(m)}. Ready for the next vehicle.`);
      margin.forEach((f) => {
        said.push(`That was your taps, then halfway: ${m}, and finish: ${f}. Ready for another try.`);
        said.push(`Halfway: ${m}, finish: ${f}. Ready for another try.`);
      });
    });
    return said.filter((text) => !gsVoiceClipsFor(text));
  });
  expect(missing).toEqual([]);
});

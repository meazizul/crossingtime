import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes, screenVisible, history, tick, announcer, statusText, waitUntil, swipeOn, answerOn, streetGesture } from "./helpers.mjs";

async function openCompare(page, storage = {}) {
  await openApp(page, { storage });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  // Build 14: First half is the default (F6). These tests time against the
  // full street (8 s), so they choose it, as a student would.
  await page.click("input[name='compareStreet'][value='full']");
  await page.evaluate(() => { document.querySelector("#compareOptions").open = true; });
}

/** Replays last up to ~2 x the longest sample; wait for idle rather than guessing. */
async function untilIdle(page) {
  await waitUntil(page, () => gsCompareState.phase === "idle", { ms: 45000, step: 250 });
}

async function playUntilAnswering(page) {
  await page.click("#compareStartBtn");
  await expect(page.locator("#compareStartBtn")).toHaveAttribute("aria-disabled", "true");
  for (let i = 0; i < 100; i += 1) {
    await page.clock.runFor(200);
    if (await page.evaluate(() => gsCompareState.phase === "answering")) break;
  }
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("answering");
}

/** Force the next trial's category: 0.1 → shorter, 0.5 → same, 0.9 → longer. */
async function forceCategory(page, roll) {
  await page.evaluate((r) => { Math.random = () => r; }, roll);
}

/** Record every sound the replay schedules, by kind and time. */
async function recordSounds(page) {
  await page.evaluate(() => {
    window.__sounds = [];
    const wrap = (name, kind) => {
      const real = window[name];
      window[name] = (...args) => {
        window.__sounds.push({ kind: kind(args), at: Number(name === "playCompositeTone" ? args[2] : name === "playFeedbackTone" ? args[1] : args[0]) || 0, len: name === "playCompositeTone" ? args[1] : 0 });
        return real(...args);
      };
    };
    wrap("playFeedbackTone", (a) => a[0]);
    wrap("playUserMarkerTone", () => "user");
    wrap("playCompositeTone", (a) => (a[4] === "steady" ? "sample" : "tone"));
  });
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test("wording: sample warning time, never 'gap'", async ({ page }) => {
  await openCompare(page);
  await expect(page.locator("#compareStartBtn .action-btn-label")).toHaveText("Play a sample warning time");
  const text = await page.locator("#screen-compare").innerText();
  expect(text.toLowerCase()).not.toMatch(/\bgap\b/);
});

test("the 'longer does not mean long enough' note shows until dismissed, and Help brings it back", async ({ page }) => {
  await openCompare(page);
  const note = page.locator("[data-safety-note='compare']");
  await expect(note).toBeVisible();
  await expect(note).toContainText("Longer does not mean long enough");
  await page.click("[data-dismiss-safety='compare']");
  await expect(note).toBeHidden();
  await page.evaluate(() => gsShowScreen("home"));
  await page.evaluate(() => gsShowScreen("compare"));
  await expect(note).toBeHidden();
  await page.evaluate(() => gsShowScreen("help"));
  await page.click("#showSafetyNotesBtn");
  await page.click("#disclaimerAcceptBtn");
  await page.evaluate(() => gsShowScreen("compare"));
  await expect(note).toBeVisible();
});

test("the sample is one steady sound at one loudness (no fade), default 100%", async ({ page }) => {
  await openCompare(page);
  expect(await page.evaluate(() => gsSampleVolume())).toBe(1);
  await recordSounds(page);
  await forceCategory(page, 0.9);
  await playUntilAnswering(page);
  const sample = await page.evaluate(() => window.__sounds.find((s) => s.kind === "sample"));
  expect(sample).toBeTruthy();
  // Render the app's own sample offline and compare its loudness early and
  // late: a steady sound is as loud at the end as at the start.
  const ratio = await page.evaluate(async () => {
    const saved = [audioContext, masterLimiter];
    const offline = new OfflineAudioContext(1, 44100 * 3, 44100);
    audioContext = offline;
    masterLimiter = offline.createGain();
    masterLimiter.connect(offline.destination);
    playCompositeTone.retrying = true;
    playCompositeTone(gsSamplePartials(), 2.0, 0.1, gsSampleLevel(), "steady");
    playCompositeTone.retrying = false;
    [audioContext, masterLimiter] = saved;
    const data = (await offline.startRendering()).getChannelData(0);
    const rms = (from, to) => {
      let sum = 0;
      for (let i = Math.round(from * 44100); i < Math.round(to * 44100); i += 1) sum += data[i] * data[i];
      return Math.sqrt(sum / ((to - from) * 44100));
    };
    return rms(0.3, 0.5) / rms(1.8, 2.0);
  });
  expect(ratio).toBeGreaterThan(0.97);
  expect(ratio).toBeLessThan(1.03);
});

test("answers open a full-screen pad; focus starts on the swipe area, whose label carries the question", async ({ page }) => {
  const errors = watchErrors(page);
  await openCompare(page);
  await playUntilAnswering(page);
  const pad = page.locator("#answerOverlay");
  await expect(pad).toBeVisible();
  const box = await pad.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(389);
  expect(box.height).toBeGreaterThanOrEqual(843);
  await expect(page.locator("#answerSurface")).toBeFocused();
  expect(await page.getAttribute("#answerSurface", "aria-label")).toContain("Was that longer, shorter, or about the same");
  expect(await page.getAttribute("#answerSurface", "aria-label")).toContain("Swipe up for longer");
  expect(await page.evaluate(() => document.getElementById("appMain").inert)).toBe(true);
  // The swipe area fills the pad below the header (12.31).
  const area = await page.locator("#answerSurface").boundingBox();
  expect(area.height).toBeGreaterThan(600);
  expect(errors).toEqual([]);
});

test("a wrong answer: result sound and shape at once, then the judgment replay, then nothing more", async ({ page }) => {
  const errors = watchErrors(page);
  await openCompare(page, { "om-a11y-output-mode": "audio-visual", "om-a11y-sync-visual-replay": "true" });
  await playUntilAnswering(page);
  const expected = await page.evaluate(() => gsCompareState.expected);
  // An answer the app counts as wrong. Since build 24 the true direction is
  // also right inside the "about the same" range, so for a "same" sample
  // "longer" can be right; pick one that is never accepted.
  const wrong = await page.evaluate(() => {
    const accepted = gsAcceptedAnswers(gsCompareState.intervalSec, gsCompareState.crossingSec, gsCompareState.rangeSec);
    return ["longer", "shorter", "same"].find((a) => !accepted.includes(a));
  });
  await answerOn(page, wrong);

  // The triangle shows with the sound, before any replay.
  await tick(page, 200);
  expect(await page.evaluate(() => {
    const s = document.getElementById("visualReplayShape");
    return [document.getElementById("visualReplayOverlay").dataset.active, s.style.display, s.dataset.type];
  })).toEqual(["true", "block", "outside"]);
  expect(await announcer(page)).not.toMatch(/Not quite|Correct/);   // no result words (12.29)
  await expect(page.locator("#answerOverlay")).toBeHidden();
  let log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "compare", answer: wrong, expected, correct: false, marginSec: 0.4 });

  await untilIdle(page);
  await expect(page.locator("#compareStartBtn")).toHaveAttribute("aria-disabled", "false");
  await expect(page.locator("#compareStartBtn")).toBeFocused();
  expect(await statusText(page, "compareStatusText")).toBe("Press Play for another.");
  expect(await page.evaluate(() => suppressSrAnnouncements)).toBe(false);
  await tick(page, 10000);
  log = await history(page);
  expect(log).toHaveLength(1);                          // no auto-advance
  await expect(page.locator("#compareScore")).toContainText("Last 1: 0% correct");
  expect(errors).toEqual([]);
});

test("a correct answer shows the circle; the replay marks the crossing with the student's own sound, never a right/wrong cue", async ({ page }) => {
  await openCompare(page, { "om-a11y-output-mode": "audio-visual" });
  await forceCategory(page, 0.9);                       // longer
  await playUntilAnswering(page);
  await answerOn(page, "longer");
  await tick(page, 200);
  expect(await page.evaluate(() => document.getElementById("visualReplayShape").dataset.type)).toBe("acceptable");
  expect(await announcer(page)).not.toMatch(/Correct|Not quite/);
  await recordSounds(page);
  await tick(page, 1300);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("replaying");
  const sounds = await page.evaluate(() => window.__sounds);
  const kinds = sounds.map((s) => s.kind);
  expect(kinds).toContain("sample");
  expect(kinds).toContain("user");
  expect(kinds).not.toContain("outside");
  expect(kinds).not.toContain("acceptable");
  // The student's sound lands at the crossing time (8 s) after the sample starts.
  const sample = sounds.find((s) => s.kind === "sample");
  const user = sounds.find((s) => s.kind === "user");
  expect(user.at - sample.at).toBeCloseTo(8, 1);
  await untilIdle(page);
  await expect(page.locator("#compareScore")).toContainText("Last 1: 100% correct");
});

test("swipe up answers longer, swipe down answers shorter, tap answers same — anywhere on the pad", async ({ page }) => {
  await openCompare(page);
  for (const [dy, answer] of [[-160, "longer"], [160, "shorter"], [0, "same"]]) {
    await playUntilAnswering(page);
    await swipeOn(page, "#answerSurface", { dy });
    const log = await history(page);
    expect(log[log.length - 1].answer).toBe(answer);
    await untilIdle(page);
  }
  expect(await history(page)).toHaveLength(3);          // a swipe never double-answers
});

test("a swipe on the pad never scrolls the page", async ({ page }) => {
  await openCompare(page);
  await playUntilAnswering(page);
  const before = await page.evaluate(() => window.scrollY);
  expect(await page.evaluate(() => getComputedStyle(document.getElementById("answerOverlay")).touchAction)).toBe("none");
  await swipeOn(page, "#answerSurface", { dy: 200 });
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("arrow keys on the pad answer longer and shorter", async ({ page }) => {
  await openCompare(page);
  await playUntilAnswering(page);
  await page.keyboard.press("ArrowUp");
  expect((await history(page))[0].answer).toBe("longer");
  await untilIdle(page);
  await playUntilAnswering(page);
  await page.keyboard.press("ArrowDown");
  expect((await history(page))[1].answer).toBe("shorter");
});

test("instructor 'buttons only' hides the swipe surface", async ({ page }) => {
  await openCompare(page, { "om-features": JSON.stringify({ options: { compareSwipe: "off" } }) });
  await playUntilAnswering(page);
  await expect(page.locator("#answerSurface")).toBeHidden();
  await expect(page.locator("#answerOverlay .answer-btn")).toHaveCount(3);
});

test("random pause delays the sample", async ({ page }) => {
  await openCompare(page, { "om-compareRandomDelay": "true" });
  await expect(page.locator("#compareRandomDelay")).toBeChecked();
  await page.click("#compareStartBtn");
  expect(await announcer(page)).toContain("after a pause");
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("waiting");
  await tick(page, 4000);
  expect(["playing", "answering"]).toContain(await page.evaluate(() => gsCompareState.phase));
});

test("'how much' is offered only after a correct longer/shorter answer", async ({ page }) => {
  await openCompare(page, { "om-compareFollowUp": "true" });
  // Wrong answer: no "how much".
  await forceCategory(page, 0.9);
  await playUntilAnswering(page);
  await answerOn(page, "shorter");
  await tick(page, 3200);                                // "Not correct. It was longer." is said first (build 15)
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("replaying");
  await untilIdle(page);
  // Correct "about the same": no "how much".
  await forceCategory(page, 0.5);
  await playUntilAnswering(page);
  await answerOn(page, "same");
  await tick(page, 1300);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("replaying");
  await expect(page.locator("#howMuchOverlay")).toBeHidden();
});

test("'how much' with replay (a): steady sound for the WARNING time, student's sound at the crossing and at crossing + estimate, right/wrong cue where the sample ended", async ({ page }) => {
  await openCompare(page, { "om-compareFollowUp": "true" });
  await forceCategory(page, 0.99);                      // clearly longer
  await playUntilAnswering(page);
  const { trueDiff, sampleSec } = await page.evaluate(() => ({
    trueDiff: gsCompareState.intervalSec - gsCompareState.crossingSec,
    sampleSec: gsCompareState.intervalSec
  }));
  await answerOn(page, "longer");
  await tick(page, 1300);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("howmuch");
  await expect(page.locator("#howMuchOverlay")).toBeVisible();
  await expect(page.locator("#howMuchTitle")).toHaveText("How much longer?");
  await expect(page.locator("#compareFollowUpBtn")).toBeFocused();
  await recordSounds(page);
  await page.click("#compareFollowUpBtn");
  await expect(page.locator("#compareFollowUpBtn")).toHaveText("TAP TO END");
  await tick(page, Math.round((trueDiff + 1.5) * 1000));   // estimate 1.5 s too long
  await page.click("#compareFollowUpBtn");
  const log = await history(page);
  expect(log).toHaveLength(1);                            // one try, one record (12.37)
  expect(log[0].howMuch).toMatchObject({ correct: false });
  const sounds = await page.evaluate(() => window.__sounds.filter((s) => s.kind !== "tone"));
  const base = sounds.find((s) => s.kind === "sample");
  expect(base.len).toBeCloseTo(sampleSec, 3);           // the WARNING time, never the crossing time (issue 11)
  const cue = sounds.find((s) => s.kind === "outside");
  expect(cue.at - base.at).toBeCloseTo(sampleSec, 2);   // where the sample ended
  // The two How much taps are the student's sound too (12.35); only the replay's count here.
  const users = sounds.filter((s) => s.kind === "user" && s.at >= base.at).map((s) => s.at - base.at).sort((a, b) => a - b);
  expect(users).toHaveLength(2);
  expect(users[0]).toBeCloseTo(8, 2);                   // the crossing time
  // The replay plays the estimate the student actually produced (the log has
  // it), not the nominal one: real time passes between the two taps.
  expect(users[1]).toBeCloseTo(8 + log[0].howMuch.userSec, 1);
  await untilIdle(page);
  await expect(page.locator("#howMuchOverlay")).toBeHidden();
  expect(await statusText(page, "compareStatusText")).toBe("Press Play for another.");
  await expect(page.locator("#compareScore")).toContainText("Last 1:");
});

test("'how much' with replay (b): practice-style, student's sounds against the real difference", async ({ page }) => {
  await openCompare(page, {
    "om-features": JSON.stringify({ options: { compareHowMuch: "on", magnitudeReplay: "b" } })
  });
  await expect(page.locator("#compareFollowUp")).toBeHidden();   // instructor fixed it on
  await forceCategory(page, 0.01);                      // clearly shorter
  await playUntilAnswering(page);
  const trueDiff = await page.evaluate(() => gsCompareState.crossingSec - gsCompareState.intervalSec);
  await answerOn(page, "shorter");
  await tick(page, 1300);
  await expect(page.locator("#howMuchTitle")).toHaveText("How much shorter?");
  await page.click("#compareFollowUpBtn");
  await tick(page, Math.round(trueDiff * 1000));
  await recordSounds(page);
  await page.click("#compareFollowUpBtn");
  expect((await history(page))[0].howMuch).toMatchObject({ correct: true });
  const kinds = await page.evaluate(() => window.__sounds.map((s) => s.kind));
  expect(kinds.filter((k) => k === "user").length).toBeGreaterThanOrEqual(3);  // judgment replay + two estimate marks
  expect(kinds).toContain("acceptable");
  await untilIdle(page);
  expect(await statusText(page, "compareStatusText")).toBe("Press Play for another.");
});

test("leaving mid-trial cancels everything", async ({ page }) => {
  const errors = watchErrors(page);
  await openCompare(page);
  await page.click("#compareStartBtn");
  await page.clock.runFor(600);
  await page.click("#backBtn");
  await screenVisible(page, "home");
  await tick(page, 15000);
  expect(await history(page)).toEqual([]);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("idle");
  expect(await page.evaluate(() => suppressSrAnnouncements)).toBe(false);
  await expect(page.locator("#answerOverlay")).toBeHidden();
  expect(await page.evaluate(() => document.getElementById("appMain").inert)).toBe(false);
  await page.evaluate(() => gsShowScreen("compare"));
  await expect(page.locator("#compareStartBtn")).toHaveAttribute("aria-disabled", "false");
  expect(errors).toEqual([]);
});

test("pressing Play again while a trial is running does nothing: no overlap, no second sample", async ({ page }) => {
  await openCompare(page);
  await recordSounds(page);
  await page.click("#compareStartBtn");
  await page.clock.runFor(600);
  const samples = await page.evaluate(() => window.__sounds.filter((s) => s.kind === "sample").length);
  // Build 14: the button is busy (aria-disabled), not disabled, so VoiceOver
  // keeps its place on it; a press while busy is ignored (12.27).
  await page.click("#compareStartBtn", { force: true });
  await page.evaluate(() => gsCompareBegin());
  await tick(page, 400);
  expect(await page.evaluate(() => window.__sounds.filter((s) => s.kind === "sample").length)).toBe(samples);
  expect(await history(page)).toEqual([]);
  // The trial then runs to its answer as usual.
  await waitUntil(page, () => gsCompareState.phase === "answering", { ms: 20000, step: 200 });
  await answerOn(page, "same");
  await untilIdle(page);
  expect(await history(page)).toHaveLength(1);
});

test("loudness and pitch controls persist, stay in sync on both screens, and the preview plays", async ({ page }) => {
  const errors = watchErrors(page);
  await openCompare(page);
  await page.locator("#compareVolume").fill("60");
  await page.locator("#compareVolume").dispatchEvent("change");
  expect(await page.evaluate(() => localStorage.getItem("om-sample-volume"))).toBe("0.6");
  await expect(page.locator("#screen-compare .sample-volume-out")).toHaveText("60%");
  await page.locator("#comparePitch").fill("0");
  await page.locator("#comparePitch").dispatchEvent("change");
  expect(await page.evaluate(() => gsSamplePartials()[0].freq)).toBe(165);
  await expect(page.locator("#comparePitch")).toHaveAttribute("aria-valuetext", "Lowest");
  expect(await page.evaluate(() => [document.getElementById("prepVolume").value, document.getElementById("prepPitch").value])).toEqual(["60", "0"]);
  await page.click("#comparePreviewBtn");
  await tick(page, 3000);
  expect(errors).toEqual([]);
});

test("instructor can fix the sample style; the student's choice is then hidden", async ({ page }) => {
  await openCompare(page, { "om-features": JSON.stringify({ options: { compareSound: "ticks" } }) });
  await expect(page.locator("[data-feature-choice='compareSound']")).toBeHidden();
  await expect(page.locator("[data-feature-fixed='compareSound']")).toHaveText("Your instructor set two beeps.");
  expect(await page.evaluate(() => gsCompareStyle())).toBe("ticks");
});

test("trials are always self-consistent", async ({ page }) => {
  await openCompare(page);
  const bad = await page.evaluate(() => {
    let mismatches = 0;
    for (let i = 0; i < 2000; i += 1) {
      const crossing = 2 + Math.random() * 10;
      const margin = 0.1 + Math.random() * 0.5;
      const trial = gsBuildTrial(crossing, margin);
      if (trial.category !== gsClassifyInterval(trial.interval, crossing, margin)) mismatches += 1;
      if (trial.interval < 0.5) mismatches += 1;
    }
    return mismatches;
  });
  expect(bad).toBe(0);
});

import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes } from "./helpers.mjs";

/* Build 28, tracker 27.41: on Android and the web the sound runs on the audio
 * clock and everything else on timers. When the audio clock is stopped at
 * the start of a try (the browser stops it after a few idle minutes), the
 * sound, the vibration, the answer pad and the stop time must still agree. */

/* Stop the audio clock, as the browser does after idle time. `slowMs` makes
 * the clock take that long to start again. */
async function stopClock(page, slowMs = 0) {
  await page.evaluate(async (slow) => {
    ensureAudioContext();
    await audioContext.suspend();
    if (slow > 0 && !audioContext.__slow) {
      const real = audioContext.resume.bind(audioContext);
      audioContext.__slow = true;
      audioContext.resume = () => new Promise((resolve) => setTimeout(resolve, slow)).then(real);
    }
  }, slowMs);
  expect(await page.evaluate(() => audioContext.state)).toBe("suspended");
  // As after real idle time: the clock stopped a while ago, not this instant.
  // (A clock that stops DURING a try cancels the try: tracker 20.11. That
  // check runs 250 ms after the stop, and is not what is being tested here.)
  await page.waitForTimeout(400);
}

test("placing a late sound: what is left of its delay; past its start, a steady sound keeps its end and a short cue plays now", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(() => ({
    onTime: gsPlaceLateSound(0.5, 2, 0, true),
    late: gsPlaceLateSound(0.5, 2, 0.2, true),
    pastSteady: gsPlaceLateSound(0.05, 2, 0.25, true),
    pastCue: gsPlaceLateSound(0.05, 0.12, 0.25, false),
    gone: gsPlaceLateSound(0.05, 0.2, 0.4, true)
  }));
  expect(r.onTime).toEqual({ startTime: 0.5, duration: 2, skipped: 0 });
  expect(r.late.startTime).toBeCloseTo(0.3, 5);
  expect(r.late.duration).toBe(2);
  expect(r.pastSteady.startTime).toBe(0);
  expect(r.pastSteady.duration).toBeCloseTo(1.8, 5);       // still ends 2.05 s after it was asked for
  expect(r.pastCue).toMatchObject({ startTime: 0, duration: 0.12 });
  expect(r.gone).toBeNull();
});

test("gsWhenAudioRunning: at once when the clock runs; with the clock stopped it waits until it runs; it never waits for ever", async ({ page }) => {
  await openApp(page);
  const running = await page.evaluate(() => { ensureAudioContext(); let called = false; gsWhenAudioRunning(() => { called = true; }); return called; });
  expect(running).toBe(true);                                // same step: nothing changes in the usual case
  await stopClock(page, 150);
  const waited = await page.evaluate(() => new Promise((resolve) => {
    const t0 = performance.now();
    let sync = true;
    gsWhenAudioRunning(() => resolve({ sync, state: audioContext.state, ms: performance.now() - t0 }));
    sync = false;
  }));
  expect(waited.sync).toBe(false);
  expect(waited.state).toBe("running");
  expect(waited.ms).toBeGreaterThan(120);
  expect(waited.ms).toBeLessThan(1200);
  // A clock that will not start: the limit ends the wait.
  const stuck = await page.evaluate(async () => {
    await audioContext.suspend();
    audioContext.resume = () => new Promise(() => {});
    const t0 = performance.now();
    return new Promise((resolve) => gsWhenAudioRunning(() => resolve(performance.now() - t0), 300));
  });
  expect(stuck).toBeGreaterThan(280);
  expect(stuck).toBeLessThan(700);
});

test("a touch or a key starts a stopped audio clock again", async ({ page }) => {
  await openApp(page);
  await stopClock(page);
  await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
  await page.waitForFunction(() => audioContext.state === "running");
  await stopClock(page);
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })));
  await page.waitForFunction(() => audioContext.state === "running");
});

test("27.41: a tone asked for on a stopped clock is scheduled where it was meant to be in real time, not late by the start-up time", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await stopClock(page, 200);
  const result = await page.evaluate(() => new Promise((resolve) => {
    const starts = [];
    const real = audioContext.createOscillator.bind(audioContext);
    audioContext.createOscillator = () => {
      const osc = real();
      const start = osc.start.bind(osc), stop = osc.stop.bind(osc);
      const seen = { at: performance.now(), clock: audioContext.currentTime };
      osc.start = (when) => { seen.start = when; start(when); };
      osc.stop = (when) => { seen.stop = when; stop(when); starts.push(seen); };
      return osc;
    };
    const askedAt = performance.now();
    playCompositeTone([{ freq: 440, gain: 0.5 }], 1.0, 0.6, 1, "steady");     // meant to start 0.6 s from now
    playCompositeTone([{ freq: 330, gain: 0.5 }], 1.0, 0.05, 1, "steady");    // meant to start 0.05 s from now
    setTimeout(() => resolve({ askedAt, starts }), 500);
  }));
  expect(result.starts.length).toBe(2);
  const [first, second] = result.starts;
  // First tone: its start, in real time since it was asked for, is still about 0.6 s.
  const firstStartWall = (first.at - result.askedAt) / 1000 + (first.start - first.clock);
  expect(firstStartWall).toBeGreaterThan(0.56);
  expect(firstStartWall).toBeLessThan(0.68);
  expect(first.stop - first.start).toBeGreaterThan(0.99);                    // full length
  // Second tone: its start had passed (clock took ~0.2 s); it plays what is left and ends on time.
  const lateSec = (second.at - result.askedAt) / 1000;
  expect(lateSec).toBeGreaterThan(0.18);
  expect(second.start - second.clock).toBeLessThan(0.02);                    // now
  const length = second.stop - second.start;
  expect(length).toBeLessThan(1.0 - (lateSec - 0.05) + 0.06);
  expect(length).toBeGreaterThan(1.0 - (lateSec - 0.05) - 0.03);
});

test("27.41: Comparison preparation: with the clock stopped, the sound, the stop clock and the vibration start together once it runs", async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => { window.__vibrate = []; navigator.vibrate = (p) => { window.__vibrate.push(performance.now()); return true; }; });
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("signal"));
  await stopClock(page, 250);
  const result = await page.evaluate(() => new Promise((resolve) => {
    a11ySettings.vibrate = true;
    const out = { vibrateBefore: window.__vibrate.length };
    gsSignalState.session += 1;
    gsSignalState.style = "continuous";
    gsSignalState.phase = "waiting";
    const realSustain = startSustainedTone;
    window.startSustainedTone = (...args) => { out.toneAt = performance.now(); out.stateAtTone = audioContext.state; return realSustain(...args); };
    out.firedAt = performance.now();
    gsSignalFire();
    out.phaseRightAfter = gsSignalState.phase;                 // still waiting: nothing has started
    const poll = setInterval(() => {
      if (gsSignalState.phase !== "timing") return;
      clearInterval(poll);
      out.signalAt = gsSignalState.signalAt;
      out.vibrateAt = window.__vibrate[out.vibrateBefore] ?? null;
      gsSignalCancel();
      resolve(out);
    }, 5);
  }));
  expect(result.phaseRightAfter).toBe("waiting");
  expect(result.stateAtTone).toBe("running");
  expect(result.signalAt - result.firedAt).toBeGreaterThan(200);            // waited for the clock
  expect(Math.abs(result.toneAt - result.signalAt)).toBeLessThan(25);       // sound and stop clock: one moment
  if (result.vibrateAt !== null) expect(Math.abs(result.vibrateAt - result.signalAt)).toBeLessThan(25);
  expect(errors).toEqual([]);
});

test("27.41: Comparison preparation with the clock running starts in the same step, as before; a cancel during the wait is honoured", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  const same = await page.evaluate(() => {
    ensureAudioContext();
    gsSignalState.session += 1;
    gsSignalState.style = "continuous";
    gsSignalState.phase = "waiting";
    gsSignalFire();
    const phase = gsSignalState.phase;
    gsSignalCancel();
    return phase;
  });
  expect(same).toBe("timing");
  await stopClock(page, 200);
  const cancelled = await page.evaluate(() => new Promise((resolve) => {
    gsSignalState.session += 1;
    gsSignalState.phase = "waiting";
    gsSignalFire();
    gsSignalCancel();                                          // Back, or the app hidden
    setTimeout(() => resolve(gsSignalState.phase), 600);
  }));
  expect(cancelled).toBe("idle");
});

test("27.41: Comparison practice: the sample, and the timer that opens the answer pad, start only once the audio clock is running", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("compare"));
  await page.evaluate(() => {
    window.__sample = [];
    const real = gsPlaySample;
    window.gsPlaySample = (...args) => { window.__sample.push({ state: audioContext.state, at: performance.now() }); return real(...args); };
  });
  await stopClock(page, 300);
  // Started by code (no touch), so the touch handler cannot have started the clock already.
  await page.evaluate(() => { window.__beganAt = performance.now(); gsCompareBegin(); });
  await page.waitForFunction(() => window.__sample.length === 1, null, { timeout: 15000 });
  const result = await page.evaluate(() => ({ sample: window.__sample[0], phase: gsCompareState.phase }));
  expect(result.sample.state).toBe("running");
  expect(result.phase).toBe("playing");
  await page.evaluate(() => gsCompareCancel());
  expect(errors).toEqual([]);
});

test("27.41: a recorded cue asked for on a stopped clock is also placed in real time", async ({ page }) => {
  await openApp(page);
  await page.waitForFunction(() => Boolean(cueBuffers["bright/right-a"]));
  await stopClock(page, 200);
  const result = await page.evaluate(() => new Promise((resolve) => {
    const seen = [];
    const real = audioContext.createBufferSource.bind(audioContext);
    audioContext.createBufferSource = () => {
      const node = real();
      const start = node.start.bind(node);
      node.start = (when, offset) => { seen.push({ wall: performance.now(), clock: audioContext.currentTime, when, offset }); start(when, offset); };
      return node;
    };
    const askedAt = performance.now();
    gsPlayCue("right-a", 0.6, 1);         // meant for 0.6 s from now
    gsPlayCue("right-a", 0.02, 1);        // its start will have passed
    setTimeout(() => resolve({ askedAt, seen }), 500);
  }));
  expect(result.seen.length).toBe(2);
  const [later, passed] = result.seen;
  const laterWall = (later.wall - result.askedAt) / 1000 + (later.when - later.clock);
  expect(laterWall).toBeGreaterThan(0.56);
  expect(laterWall).toBeLessThan(0.68);
  expect(later.offset).toBe(0);
  expect(passed.when - passed.clock).toBeLessThan(0.02);
  expect(passed.offset).toBeGreaterThan(0.15);               // joined part-way through
});

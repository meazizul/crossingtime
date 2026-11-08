/* ============================================================
 * CrossingTime — Comparison preparation (internal name: signal)
 * ============================================================
 *
 * Cindi's first comparison step: the student "judges time
 * appropriately when NOT controlling when the interval starts". In Practice
 * the student starts the clock themselves; here the app does, after a wait,
 * and the student stops it when they think their crossing time is up. It is
 * how she teaches at the curb: "you hear a car coming… <wait> now."
 *
 * Build 7 changes, from Cindi's further review:
 *   - renamed from "Time it from a signal": "signal" means traffic signal to
 *     an O&M Specialist, and this app is about uncontrolled crossings;
 *   - the sound can be the same steady sound used in Comparison practice,
 *     playing until the student stops it, like hearing a vehicle and
 *     deciding "now is when I would finish crossing";
 *   - the beep on pressing Ready sounded like the other cues; it is now the
 *     spoken words "Get ready" (and two light taps on the hand);
 *   - wait times are more varied: some quick, some long, mixed up.
 *
 * Flow:  Ready → "Get ready" → wait → sound starts → student presses
 *        → replay, as in Practice
 *
 * A press before the sound is a false start; nothing is recorded.
 * ============================================================ */

const gsSignalTimers = [];

const gsSignalState = {
  street: "half", // First half first (Cindi, Oct 20 2026; tracker F6)
  phase: "idle",   // idle | ready | waiting | timing | replaying
  lastDescribe: "", // what the last replay was, in words (build 15)
  signalAt: 0,
  style: "continuous",
  stopTone: null,
  lastBuckets: [],
  session: 0
};

function gsSignalCrossing() {
  return gsCrossingTimeFor(gsSignalState.street);
}

function gsSignalStyle() {
  return gsFeatureStyle("prepSound", "prepSound", "continuous");
}

/**
 * How long to wait before the sound. Three bands, picked at random: quick
 * (0.7–2 s), medium (2–5 s) and long (5–10 s). The same band never comes up
 * three times in a row, so the student cannot settle into a rhythm.
 */
function gsSignalWaitSec() {
  const bands = [
    { name: "quick", lo: 0.7, hi: 2, weight: 0.35 },
    { name: "medium", lo: 2, hi: 5, weight: 0.4 },
    { name: "long", lo: 5, hi: 10, weight: 0.25 }
  ];
  const last = gsSignalState.lastBuckets;
  const blocked = last.length >= 2 && last[last.length - 1] === last[last.length - 2] ? last[last.length - 1] : null;
  const choices = bands.filter((b) => b.name !== blocked);
  const total = choices.reduce((sum, b) => sum + b.weight, 0);
  let roll = Math.random() * total;
  let band = choices[choices.length - 1];
  for (const b of choices) {
    if (roll < b.weight) { band = b; break; }
    roll -= b.weight;
  }
  last.push(band.name);
  if (last.length > 4) last.shift();
  return band.lo + Math.random() * (band.hi - band.lo);
}

function gsSignalStatus(message, tone = "neutral", { announce = true } = {}) {
  const el = document.getElementById("signalStatus");
  const text = document.getElementById("signalStatusText");
  if (!el) return;
  (text || el).textContent = message;
  el.dataset.tone = tone;
  if (announce) announceScreenReader(message);
}

function gsSignalUpdateButton() {
  // Awake from Ready until the replay ends (tracker 20.12).
  if (typeof gsKeepAwakeFor === "function") gsKeepAwakeFor("signal", gsSignalState.phase !== "idle");
  const btn = document.getElementById("signalBtn");
  const label = document.getElementById("signalBtnLabel");
  const hint = document.getElementById("signalBtnHint");
  if (!btn || !label) return;
  btn.classList.remove("running", "stage-start", "stage-finish", "idle");
  gsSetBusy(btn, false);

  const phase = gsSignalState.phase;
  if (phase === "ready" || phase === "waiting") {
    label.textContent = "WAIT";
    if (hint) hint.textContent = "Press only after the sound starts";
    btn.classList.add("running", "stage-start");
    btn.setAttribute("aria-label", "Wait for the sound.");
    return;
  }
  if (phase === "timing") {
    label.textContent = "NOW";
    if (hint) hint.textContent = gsSignalState.style === "continuous"
      ? "Press to stop the sound when your crossing time is up"
      : "Press when your crossing time is up";
    btn.classList.add("running", "stage-finish");
    btn.setAttribute("aria-label", "Press when your crossing time is up.");
    return;
  }
  if (phase === "replaying") {
    label.textContent = "LISTEN";
    if (hint) hint.textContent = "Replaying";
    btn.classList.add("running");
    // Busy, not disabled: the cursor stays on the button through the replay
    // (tracker 12.27).
    gsSetBusy(btn, true);
    btn.setAttribute("aria-label", "Replaying.");
    return;
  }
  label.textContent = "READY";
  if (hint) hint.textContent = "Press, then wait for the sound";
  btn.classList.add("idle");
  btn.setAttribute("aria-label", "Ready. Press, then wait for the sound.");
}

function gsSignalStopTone() {
  if (gsSignalState.stopTone) {
    gsSignalState.stopTone();
    gsSignalState.stopTone = null;
  }
}

/** Cancel the flow. Safe to call at any time. */
function gsSignalCancel() {
  gsPlayAgainShow("signal", false);
  gsClearTimers(gsSignalTimers);
  gsClearHaptics();
  gsSignalStopTone();
  if (typeof stopAllSound === "function") stopAllSound();
  suppressSrAnnouncements = false;
  gsSignalState.phase = "idle";
  gsSignalState.signalAt = 0;
  gsSignalUpdateButton();
  if (typeof gsHideIntervalVisual === "function") gsHideIntervalVisual();
  if (typeof stopVisualReplay === "function") stopVisualReplay();
}

function gsSignalPress(atMs) {
  ensureAudioContext();
  const phase = gsSignalState.phase;

  if (phase === "replaying") return;

  if (phase === "idle") {
    const crossing = gsSignalCrossing();
    if (!Number.isFinite(crossing) || crossing <= 0) {
      gsSignalStatus("Enter your crossing times in Instructor setup first, or open the link your instructor sent.", "warn");
      return;
    }
    gsSignalState.style = gsSignalStyle();
    gsPlayAgainClear("signal");
    // The headphones may have changed since the last attempt.
    if (typeof gsRefreshOutputLatency === "function") gsRefreshOutputLatency();
    gsSignalState.phase = "ready";
    const session = ++gsSignalState.session;
    gsSignalUpdateButton();
    hapticCue("ready");
    // Spoken, not a beep: "Get ready" cannot be mistaken for the start of
    // the interval or for any feedback sound. Shown on screen for everyone.
    // If there is no speech (or visual-only mode), the screen reader says it.
    gsSignalStatus("Get ready. Wait for the sound.", "neutral", { announce: false });
    const startWait = () => {
      if (gsSignalState.phase !== "ready" || session !== gsSignalState.session) return;
      gsSignalState.phase = "waiting";
      gsLater(gsSignalTimers, gsSignalFire, gsSignalWaitSec());
    };
    // With VoiceOver or TalkBack the screen reader says it, never the app's
    // own voice, and the wait starts when the words are over (tracker 22.1,
    // 22.8).
    if (typeof gsScreenReaderOn === "function" && gsScreenReaderOn()) {
      gsScreenReaderSay("Get ready. Wait for the sound.", { onDone: startWait });
      return;
    }
    const spoke = gsSpeak("Get ready", { interrupt: true, maxWaitMs: 2500, onDone: startWait });
    if (!spoke) announceScreenReader("Get ready. Wait for the sound.");
    return;
  }

  if (phase === "ready" || phase === "waiting") {
    // False start. Nothing is recorded.
    gsSignalCancel();
    gsStopSpeech();
    playFeedbackTone("outside", 0.02);
    hapticCue("reference_bad");
    gsSignalStatus("Too early. That was before the sound. Press Ready to try again.", "warn");
    return;
  }

  if (phase === "timing") {
    // From the touch, not the lift (tracker 20.9).
    const pressedAt = Number.isFinite(atMs) ? atMs : performance.now();
    const produced = Math.max(0, pressedAt - gsSignalState.signalAt) / 1000;
    gsSignalStopTone();
    if (typeof gsHideIntervalVisual === "function") gsHideIntervalVisual();
    hapticCue("marker");
    gsSignalResolve(produced);
  }
}

function gsSignalFire() {
  if (gsSignalState.phase !== "waiting") return;
  gsSignalState.phase = "timing";
  gsSignalState.signalAt = performance.now();
  gsSignalUpdateButton();
  gsBeginQuiet();
  hapticCue("start");
  const crossing = gsSignalCrossing();
  // Give up if the student never presses, so a forgotten phone does not
  // play a tone forever.
  const maxSec = Math.max(crossing * 3, crossing + 10);
  if (gsSignalState.style === "continuous") {
    gsSignalState.stopTone = startSustainedTone(gsSamplePartials(), gsSampleLevel());
    if (typeof gsShowIntervalVisual === "function") gsShowIntervalVisual(0, maxSec, "sample");
  } else {
    gsPlaySampleBeep(0);
    if (typeof gsShowIntervalVisual === "function") gsShowIntervalVisual(0, 0.35, "sample");
  }
  gsLater(gsSignalTimers, () => {
    if (gsSignalState.phase !== "timing") return;
    gsSignalCancel();
    gsSignalStatus("No press, so nothing was recorded. Press Ready to try again.", "warn");
  }, maxSec);
}

function gsSignalResolve(producedSec) {
  gsClearTimers(gsSignalTimers);
  const street = gsSignalState.street;
  const crossingSec = gsSignalCrossing();
  const marginSec = gsEffectiveMargin("signal", street);
  // The sound reaches the ear `latency` late (about 0.2 s on Bluetooth), so
  // the student's stop is late by the same amount. Take that off the measured
  // time instead of widening the margin on both sides: a student who stopped
  // 0.6 s early with 0.2 s of delay is outside, not within (Cindi, 16 Oct).
  // Only when the cue being timed is a sound: with visual-only feedback the
  // student reacts to the screen, which has no headphone delay (bug 29,
  // Oct 17 2026 review). With sound and visuals together the sound
  // is taken as the cue; the channel is saved with the attempt.
  const channel = a11ySettings.outputMode === "visual-only" ? "visual" : "audio";
  const latency = channel === "audio" && typeof audioContext !== "undefined" && audioContext
    ? (audioContext.baseLatency || 0) + (audioContext.outputLatency || 0)
    : 0;
  const measuredSec = Math.max(0, producedSec - latency);
  const within = Math.abs(measuredSec - crossingSec) <= marginSec + 0.02;

  gsLogAttempt({
    activity: "signal",
    street,
    userSec: measuredSec,
    refSec: crossingSec,
    diffSec: measuredSec - crossingSec,
    correct: within,
    marginSec,
    channel,
    latencySec: latency
  });
  gsSignalRenderScore();

  gsSignalState.phase = "replaying";
  gsSignalUpdateButton();
  suppressSrAnnouncements = false;
  // The chime or the pulse at the crossing time, and the replay, carry the
  // result; nothing is said before or about it (tracker 12.29).
  gsSignalStatus("", "neutral", { announce: false });
  gsBeginQuiet();

  const params = { producedSec: measuredSec, crossingSec, style: gsSignalState.style, marginSec, within }; // the verdict already given, latency allowance included
  // The replay in words, once it is over (build 15). Never the seconds.
  gsSignalState.lastDescribe = `That was the sample, your stop, and your crossing time: ${gsVerdictWords(within)}.`;
  gsSignalState.lastVerdict = within ? "Within the margin." : "Outside the margin.";
  const doneAt = gsReplayProduction({ ...params, startDelaySec: 1.0 });
  gsPlayAgainSet("signal", () => gsReplayProduction({ ...params, startDelaySec: 0.5 }));
  gsLater(gsSignalTimers, () => {
    suppressSrAnnouncements = false;
    gsSignalState.phase = "idle";
    gsSignalUpdateButton();
    gsSignalFinishStatus();
    gsPlayAgainShow("signal", true);
  }, doneAt + 0.2);
}

/* "Ready for another.", after the replay in words when those are on. */
function gsSignalFinishStatus() {
  const message = "Ready for another.";
  const said = Boolean(gsSignalState.lastDescribe) && a11ySettings.describeSounds && gsDescribe(`${gsSignalState.lastDescribe} ${message}`);
  // Off (Low): the verdict still shows and is read, in short (tracker 20.2).
  const verdict = !said && gsSignalState.lastVerdict ? `${gsSignalState.lastVerdict} ` : "";
  gsSignalStatus(`${verdict}${message}`, "neutral", { announce: !said });
}

/* Play it again (F1): the last try's replay once more, not recorded. */
function gsSignalPlayAgain() {
  const fn = gsPlayAgain.signal;
  if (gsSignalState.phase !== "idle" || typeof fn !== "function") return;
  gsSignalState.phase = "replaying";
  gsSignalUpdateButton();
  gsSetBusy(gsPlayAgainButton("signal"), true);
  gsSignalStatus("", "neutral", { announce: false });
  gsBeginQuiet();
  const doneAt = fn();
  gsLater(gsSignalTimers, () => {
    suppressSrAnnouncements = false;
    gsSignalState.phase = "idle";
    gsSignalUpdateButton();
    gsSignalFinishStatus();
    gsPlayAgainShow("signal", true);
    gsPlayAgainButton("signal")?.focus({ preventScroll: true });
  }, doneAt + 0.2);
}

/* The phone locked or another app came to the front while a sound was being
 * timed: that attempt is dropped unrecorded. */
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  if (gsSignalState.phase === "waiting" || gsSignalState.phase === "timing") {
    gsSignalCancel();
    gsSignalStatus("The app was hidden, so nothing was recorded. Press Ready to try again.", "warn");
  }
});

/* The sound was taken away while the student was waiting for it or timing
 * it (tracker 20.11): nothing is recorded. */
window.addEventListener("gs-audio-interrupted", () => {
  if (gsSignalState.phase === "ready" || gsSignalState.phase === "waiting" || gsSignalState.phase === "timing") {
    gsSignalCancel();
    if (typeof gsHideIntervalVisual === "function") gsHideIntervalVisual();
    gsSignalStatus("The sound was interrupted, so nothing was recorded. Press Ready to try again.", "warn");
  }
});

function gsSignalRenderScore() {
  const el = document.getElementById("signalScore");
  if (!el) return;
  const recent = gsHistoryFor("signal", gsSignalState.street, 10);
  const within = recent.filter((entry) => entry.correct).length;
  const margin = gsEffectiveMargin("signal", gsSignalState.street);
  const note = gsMarginNote(margin, gsAdaptiveEnabled());
  el.textContent = recent.length
    ? `Last ${recent.length}: ${within} within margin${note}`
    : `No attempts yet${note}`;
}

function gsSignalSetStreet(street) {
  gsSignalCancel();
  gsSignalState.street = street;
  gsSignalRenderScore();
  gsSignalStatus(`${street === "half" ? "First half of the street" : "Full street"} selected. Press Ready when you are.`);
}

function gsSignalInit() {
  document.querySelectorAll("input[name='signalStreet']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) gsSignalSetStreet(input.value);
    });
  });
  document.querySelectorAll("input[name='prepSound']").forEach((input) => {
    const stored = localStorage.getItem("om-prep-sound");
    if (stored && input.value === stored) input.checked = true;
    input.addEventListener("change", () => {
      if (input.checked) localStorage.setItem("om-prep-sound", input.value);
    });
  });
  const btn = document.getElementById("signalBtn");
  if (btn) btn.addEventListener("click", () => gsSignalPress(gsPressTime(btn)));
  document.getElementById("signalPlayAgainBtn")?.addEventListener("click", gsSignalPlayAgain);
  gsSignalUpdateButton();
  gsSignalRenderScore();
}

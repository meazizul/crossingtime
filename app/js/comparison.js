/* ============================================================
 * CrossingTime — Comparison tasks
 * ============================================================
 *
 * Knowing your own crossing time is the prerequisite skill. The skill it is a
 * prerequisite *for* is this one: judging whether the WARNING TIME of an
 * approaching vehicle (from first detecting it until it passes in front of
 * you) is longer, shorter, or about the same as the time you need to cross.
 *
 * Vocabulary (Cindi): the sound the app plays is a "sample
 * warning time". It is not a gap. A gap is the interval between two vehicles.
 *
 *   COMPARISON PRACTICE  anywhere, no traffic. The app plays a sample warning
 *                        time; the student judges it on a full-screen pad,
 *                        hears/feels/sees whether they were right, can tap
 *                        out how much longer or shorter (only after a correct
 *                        longer/shorter answer), then feels it in a replay.
 *   AT THE STREET        a real vehicle. The student swipes toward the side
 *                        it comes from when they think they detect it, taps
 *                        when it passes in front of them, then makes the same
 *                        judgment. The app never gives the answer first.
 *
 * Sounds and what they mean (build 7):
 *   the sample            one steady sound, one loudness, no fade
 *   "this is your time"   the student's own marker sound and flash
 *   right / wrong         the within-margin chime / outside-margin pulse,
 *                         with the circle / triangle when visual is on
 *
 * Every timer belonging to a flow is tracked so that restarting, or leaving
 * the screen, cancels the flow cleanly. Nothing auto-advances.
 * ============================================================ */

/* ============================================================
 * Shared
 * ============================================================ */

const GS_ANSWERS = ["shorter", "same", "longer"];

const GS_ANSWER_LABELS = {
  shorter: "Shorter than my crossing",
  same: "About the same",
  longer: "Longer than my crossing"
};

const GS_ANSWER_SHORT = {
  shorter: "shorter than your crossing",
  same: "about the same as your crossing",
  longer: "longer than your crossing"
};

/**
 * Mark moments by touch. For a DeafBlind traveler this is the whole channel:
 * the only thing carrying a duration is the time between two pulses.
 */
const gsHapticTimers = [];

function gsHapticAt(delaySec, cue) {
  gsHapticTimers.push(setTimeout(() => hapticCue(cue), Math.max(0, delaySec) * 1000));
}

function gsClearHaptics() {
  while (gsHapticTimers.length) clearTimeout(gsHapticTimers.pop());
}

/* Flow timers: one list per module so a cancel can clear exactly its own. */
const gsCompareTimers = [];
const gsLiveTimers = [];

function gsLater(list, fn, delaySec) {
  const id = setTimeout(fn, Math.max(0, delaySec) * 1000);
  list.push(id);
  return id;
}

function gsClearTimers(list) {
  while (list.length) clearTimeout(list.pop());
}

/**
 * Run fn once self-voicing has finished speaking, so a spoken direction never
 * lands on top of a sample. Without self-voicing it runs at once.
 */
function gsAfterSpeech(list, fn, maxSec = 5) {
  const speaking = () => a11ySettings.selfVoice && typeof gsSpeechBusy === "function" && gsSpeechBusy();
  if (!speaking()) {
    fn();
    return;
  }
  let waited = 0;
  const poll = () => {
    waited += 0.1;
    if (!speaking() || waited >= maxSec) {
      fn();
      return;
    }
    gsLater(list, poll, 0.1);
  };
  gsLater(list, poll, 0.1);
}

function gsCrossingTimeFor(street) {
  const times = getTimingInputs();
  return street === "half" ? times.clearTime : times.fullTime;
}

/** True category of an interval relative to the crossing time. */
function gsClassifyInterval(intervalSec, crossingSec, marginSec) {
  const diff = intervalSec - crossingSec;
  if (Math.abs(diff) <= marginSec) return "same";
  return diff > 0 ? "longer" : "shorter";
}

/* ---------------- Sample loudness and pitch ----------------
 * Cindi: the sample must be steady and "able to be set at a high volume",
 * with a lower pitch available for students who hear low sounds better. */

const GS_SAMPLE_VOLUME_KEY = "om-sample-volume";
const GS_SAMPLE_VOLUME_DEFAULT = 1;
const GS_SAMPLE_PITCH_KEY = "om-sample-pitch";
const GS_SAMPLE_PITCHES = [
  { hz: 165, label: "Lowest" },
  { hz: 220, label: "Low" },
  { hz: 294, label: "Medium low" },
  { hz: 392, label: "Medium" },
  { hz: 523, label: "High" }
];
const GS_SAMPLE_PITCH_DEFAULT = 3;

function gsSampleVolume() {
  const stored = Number(localStorage.getItem(GS_SAMPLE_VOLUME_KEY));
  if (!Number.isFinite(stored) || stored < 0.2 || stored > 1 || localStorage.getItem(GS_SAMPLE_VOLUME_KEY) === null) {
    return GS_SAMPLE_VOLUME_DEFAULT;
  }
  return stored;
}

function gsSetSampleVolume(value) {
  const clamped = Math.min(1, Math.max(0.2, Number(value) || GS_SAMPLE_VOLUME_DEFAULT));
  localStorage.setItem(GS_SAMPLE_VOLUME_KEY, String(clamped));
  return clamped;
}

function gsSamplePitchIndex() {
  const stored = localStorage.getItem(GS_SAMPLE_PITCH_KEY);
  const index = stored === null ? GS_SAMPLE_PITCH_DEFAULT : Number(stored);
  return Number.isInteger(index) && index >= 0 && index < GS_SAMPLE_PITCHES.length ? index : GS_SAMPLE_PITCH_DEFAULT;
}

function gsSetSamplePitchIndex(index) {
  const clean = Math.min(GS_SAMPLE_PITCHES.length - 1, Math.max(0, Math.round(Number(index) || 0)));
  localStorage.setItem(GS_SAMPLE_PITCH_KEY, String(clean));
  return clean;
}

/* Two sine partials a minor third apart: a fuller sound than one sine, which
 * carries better on phone speakers. Low pitches get a little more of the
 * upper partial, which small speakers reproduce better. Raised in build 9
 * (testers: too quiet at full volume); the soft clipper keeps the peaks
 * under full scale. */
function gsSamplePartials() {
  const base = GS_SAMPLE_PITCHES[gsSamplePitchIndex()].hz;
  const upper = base < 250 ? 0.38 : 0.3;
  return [{ freq: base, gain: 0.55 }, { freq: base * 1.189, gain: upper }];
}

function gsSampleLevel() {
  return gsSampleVolume();
}

/** One short burst of the sample sound: the "beeps" style marks an interval with two of these. */
function gsPlaySampleBeep(atSec) {
  playCompositeTone(gsSamplePartials(), 0.12, atSec, gsSampleLevel(), "steady");
}

/* ---------------- Sample playback ---------------- */

/**
 * Play a sample warning time. "continuous" is one steady sound for the whole
 * interval; "ticks" is two short beeps of the same sound with silence
 * between. Both also show a held bar and give a pulse at each end.
 */
function gsPlaySample(intervalSec, startDelaySec = 0, style = "continuous", options = {}) {
  ensureAudioContext();
  if (style === "ticks") {
    gsPlaySampleBeep(startDelaySec);
    gsPlaySampleBeep(startDelaySec + intervalSec);
  } else {
    playCompositeTone(gsSamplePartials(), intervalSec, startDelaySec, gsSampleLevel(), "steady");
  }
  if (options.visual !== false && typeof gsShowIntervalVisual === "function") {
    gsShowIntervalVisual(startDelaySec, intervalSec, "sample");
  }
  if (options.haptic !== false) {
    gsHapticAt(startDelaySec, "start");
    gsHapticAt(startDelaySec + intervalSec, "start");
  }
}

/**
 * Right or wrong, right now, on every channel: the chime or the low pulse,
 * the three knocks or the long buzz, and (when visual is on) the circle or
 * the triangle on screen. Cindi: with visual on, the brief sound before the
 * replay was the only way to know.
 */
function gsShowResult(correct) {
  playFeedbackTone(correct ? "acceptable" : "outside", 0.05);
  hapticCue(correct ? "reference_ok" : "reference_bad");
  if (typeof gsShowIntervalVisual === "function") {
    gsShowIntervalVisual(0.05, 0.75, correct ? "acceptable" : "outside");
  }
}

/* ---------------- Replays ---------------- */

/**
 * PRODUCTION replay (Comparison preparation): the student produced an
 * interval by stopping a sound. Same vocabulary as Practice my timing: the
 * sample sound for as long as they let it run, their own marker where they
 * stopped it, and the right/wrong cue where their real crossing time ends.
 * Returns the time (seconds from now) at which the replay is over.
 */
function gsReplayProduction({ producedSec, crossingSec, style = "continuous", marginSec, within: verdict, startDelaySec = 0.6, intro = true }) {
  ensureAudioContext();
  // "Replay" first; the tones wait for the word (build 15).
  const t0 = startDelaySec + (intro ? gsReplayIntro() : 0);
  // The caller has already decided right or wrong (with its latency
  // allowance) and told the student. The replay must repeat that verdict,
  // never recompute it: a chime followed by a buzz for the same attempt was
  // a real bug (Cindi, 16 Oct 2026).
  const within = typeof verdict === "boolean" ? verdict : Math.abs(producedSec - crossingSec) <= marginSec;
  const feedbackType = within ? "acceptable" : "outside";

  if (style === "beep" || style === "ticks") {
    gsPlaySampleBeep(t0);
  } else {
    playCompositeTone(gsSamplePartials(), producedSec, t0, gsSampleLevel() * 0.6, "steady");
  }
  playUserMarkerTone(t0 + producedSec);
  playFeedbackTone(feedbackType, t0 + crossingSec);

  gsHapticAt(t0, "start");
  gsHapticAt(t0 + producedSec, "marker");
  gsHapticAt(t0 + crossingSec, within ? "reference_ok" : "reference_bad");

  if (typeof startSynchronizedVisualReplay === "function") {
    startSynchronizedVisualReplay([
      { timeSec: t0, type: "sample", holdSec: style === "continuous" ? Math.max(0.2, producedSec) : 0.2 },
      { timeSec: t0 + producedSec, type: "user" },
      { timeSec: t0 + crossingSec, type: "reference", feedbackType }
    ], t0 + Math.max(producedSec, crossingSec) + 0.6);
  }
  return t0 + Math.max(producedSec, crossingSec) + 0.9;
}

/**
 * JUDGMENT replay (longer / shorter / about the same): the sample warning
 * time and the student's crossing time start together. The sample plays for
 * its length; the student's own "this is your time" sound and flash land
 * where their crossing time ends. Not a right/wrong cue: the answer has
 * already been given, and Cindi found a "wrong" pulse inside the replay of a
 * correct answer confusing.
 */
function gsReplayJudgment({ sampleSec, crossingSec, style = "continuous", startDelaySec = 0.6, intro = true }) {
  ensureAudioContext();
  const t0 = startDelaySec + (intro ? gsReplayIntro() : 0);
  if (style === "ticks") {
    gsPlaySampleBeep(t0);
    gsPlaySampleBeep(t0 + sampleSec);
  } else {
    playCompositeTone(gsSamplePartials(), sampleSec, t0, gsSampleLevel() * 0.6, "steady");
  }
  playUserMarkerTone(t0 + crossingSec);

  gsHapticAt(t0, "start");
  gsHapticAt(t0 + sampleSec, "start");
  gsHapticAt(t0 + crossingSec, "marker");

  if (typeof startSynchronizedVisualReplay === "function") {
    startSynchronizedVisualReplay([
      { timeSec: t0, type: "sample", holdSec: Math.max(0.2, sampleSec) },
      { timeSec: t0 + crossingSec, type: "user" }
    ], t0 + Math.max(sampleSec, crossingSec) + 0.6);
  }
  return t0 + Math.max(sampleSec, crossingSec) + 0.9;
}

/**
 * MAGNITUDE replay, option (a): one replay against the warning time.
 *   - the steady sound for the sample WARNING time: this sound always stands
 *     for the warning time, in the sample, in the longer/shorter replay and
 *     here (Cindi, GitHub issue 11: in builds 10 to 13 it played for the
 *     crossing time, so the same sound changed meaning within one trial),
 *   - the student's own sound (and flash) where their crossing time ends, as
 *     in the longer/shorter replay,
 *   - the student's sound again at the crossing time plus their estimate (for
 *     "longer") or minus it (for "shorter"): where they thought the warning
 *     time ended,
 *   - the right/wrong cue (and circle/triangle) where the warning time really
 *     ended: right if the estimate was within the margin of the true
 *     difference, wrong if not.
 * Example: crossing 6 s, sample 8.5 s, estimate 3.5 s → sound 0–8.5 s,
 * student's sound at 6 s and at 9.5 s, wrong cue at 8.5 s.
 */
function gsReplayMagnitudeA({ crossingSec, sampleSec, estimateSec, direction, marginSec, style = "continuous", startDelaySec = 0.6, intro = true }) {
  ensureAudioContext();
  const t0 = startDelaySec + (intro ? gsReplayIntro() : 0);
  const trueDiff = Math.abs(sampleSec - crossingSec);
  const within = Math.abs(estimateSec - trueDiff) <= marginSec;
  const feedbackType = within ? "acceptable" : "outside";
  const estimateAt = Math.max(0, direction === "shorter" ? crossingSec - estimateSec : crossingSec + estimateSec);

  if (style === "ticks") {
    gsPlaySampleBeep(t0);
    gsPlaySampleBeep(t0 + sampleSec);
  } else {
    playCompositeTone(gsSamplePartials(), sampleSec, t0, gsSampleLevel() * 0.6, "steady");
  }
  playUserMarkerTone(t0 + crossingSec);
  playUserMarkerTone(t0 + estimateAt);
  playFeedbackTone(feedbackType, t0 + sampleSec);

  gsHapticAt(t0, "start");
  gsHapticAt(t0 + sampleSec, "start");
  gsHapticAt(t0 + crossingSec, "marker");
  gsHapticAt(t0 + estimateAt, "marker");
  gsHapticAt(t0 + sampleSec, within ? "reference_ok" : "reference_bad");

  const end = Math.max(crossingSec, sampleSec, estimateAt);
  if (typeof startSynchronizedVisualReplay === "function") {
    startSynchronizedVisualReplay([
      { timeSec: t0, type: "sample", holdSec: Math.max(0.2, sampleSec) },
      { timeSec: t0 + crossingSec, type: "user" },
      { timeSec: t0 + estimateAt, type: "user" },
      { timeSec: t0 + sampleSec, type: "reference", feedbackType }
    ], t0 + end + 0.6);
  }
  return t0 + end + 0.9;
}

/**
 * MAGNITUDE replay, option (b): like Practice my timing. The student's sound
 * at the start and where their tapped-out estimate ended; the right/wrong cue
 * where the true difference ends.
 */
function gsReplayMagnitudeB({ estimateSec, trueDiffSec, marginSec, startDelaySec = 0.6, append = false, intro = !append }) {
  ensureAudioContext();
  const t0 = startDelaySec + (intro ? gsReplayIntro() : 0);
  const within = Math.abs(estimateSec - trueDiffSec) <= marginSec;
  const feedbackType = within ? "acceptable" : "outside";
  playUserMarkerTone(t0);
  playUserMarkerTone(t0 + estimateSec);
  playFeedbackTone(feedbackType, t0 + trueDiffSec);

  gsHapticAt(t0, "marker");
  gsHapticAt(t0 + estimateSec, "marker");
  gsHapticAt(t0 + trueDiffSec, within ? "reference_ok" : "reference_bad");

  const end = Math.max(estimateSec, trueDiffSec);
  if (typeof startSynchronizedVisualReplay === "function") {
    startSynchronizedVisualReplay([
      { timeSec: t0, type: "user" },
      { timeSec: t0 + estimateSec, type: "user" },
      { timeSec: t0 + trueDiffSec, type: "reference", feedbackType }
    ], t0 + end + 0.6, null, { append });
  }
  return t0 + end + 0.9;
}

/* ============================================================
 * Full-screen pads
 * ------------------------------------------------------------
 * Design requirements (Cindi, Oct 2026; tracker 12.27, 12.28, 12.31, 13.7):
 *   - A pad covers the whole screen and never scrolls (a drag is a gesture).
 *   - With swipes on (the default), everything below the pad's header is the
 *     swipe area and there are no answer buttons. With swipes off, set by
 *     the instructor, the pad shows buttons only.
 *   - Back, in the top-left corner of every pad and outside the swipe area,
 *     is the one way out. It goes up one level and records the cancelled
 *     part as cancelled, never scored. Escape, Android's Back and
 *     VoiceOver's two-finger scrub do the same as Back. The way out is for
 *     a try that was interrupted or started by mistake; a student who is
 *     unsure gives their best judgment.
 *   - Focus is never left on a control that is about to disappear: a pad
 *     remembers what opened it and hands focus on before it hides.
 *   - When a pad opens, the screen reader's cursor goes to the swipe area:
 *     on iPhone the native Direct Touch area, elsewhere the page's own.
 * <main> is made inert while a pad is open.
 * ============================================================ */

let gsOpenPads = 0;

/* Pads answer by swipe unless the instructor set buttons only. */
function gsPadSwipesOn() {
  return gsFeature("compareSwipe") !== "off";
}

/* ============================================================
 * DIRECT TOUCH (iPhone app, build 12; cursor and clean-up, build 14)
 * ------------------------------------------------------------
 * Swipes and taps must work the same with VoiceOver on or off. A web page
 * cannot get raw swipes under VoiceOver, so the iPhone app lays a native
 * view marked for direct interaction over the pad's swipe area whenever a
 * pad is open. The student turns Direct Touch on for CrossingTime once
 * (VoiceOver rotor); from then on a swipe in that area reaches the app
 * unchanged. The native side classifies the gesture with the same
 * thresholds as the web pad and reports how long the finger was down, so
 * the vehicle is still timed from the touch, not the lift.
 *
 * Build 14 (tracker 12.28, 13.2, 13.3, 13.6): when a pad opens, the app
 * asks the iPhone to move the VoiceOver cursor onto the area, so VoiceOver
 * reads the area's label first and the first tap or swipe already counts.
 * When a pad closes, the area is taken out of the view tree and VoiceOver
 * is told the layout changed, so no invisible area is left over the screen.
 * ============================================================ */

function gsDirectTouchSupported() {
  return typeof GSNativePlugin?.directTouchShow === "function";
}

const GS_PAD_LABELS = {
  answer: "Answer area. Swipe up for longer, swipe down for shorter, tap for about the same.",
  howMuch: "How much. Tap to start, tap again to end.",
  streetDetect: "Street. Swipe left or right the moment you detect a vehicle, toward the side it is coming from.",
  streetArriving: "Street. Tap when the vehicle passes in front of you. Swipe down if it never comes."
};

/* The hint a screen reader adds after the label. VoiceOver needs Direct Touch
 * on for CrossingTime; TalkBack passes a two-finger swipe through as one finger. */
function gsPadHint() {
  if (gsDirectTouchSupported()) return "Direct touch area. If swipes do not work, turn on Direct Touch for CrossingTime in the VoiceOver rotor.";
  if (typeof nativePlatform !== "undefined" && nativePlatform === "android") return "With TalkBack on, swipe with two fingers, or double-tap to tap.";
  return "";
}

/* Which pad is on top, where its swipe area is, and who handles gestures. */
function gsDirectTouchTarget() {
  const howMuch = document.getElementById("howMuchOverlay");
  if (howMuch && !howMuch.hidden) {
    return {
      area: document.getElementById("compareFollowUpBtn"),
      handlers: () => ({ tap: gsHowMuchTap }),
      label: GS_PAD_LABELS.howMuch
    };
  }
  const answer = document.getElementById("answerOverlay");
  if (answer && !answer.hidden) {
    const surface = document.getElementById("answerSurface");
    if (!surface || surface.hidden) return null;        // buttons only
    return {
      area: surface,
      handlers: () => (gsSwipeHandlers.get(answer) || (() => ({})))(),
      label: GS_PAD_LABELS.answer
    };
  }
  const live = document.getElementById("liveOverlay");
  if (live && !live.hidden) {
    const surface = document.getElementById("liveSurface");
    if (!surface || surface.hidden) return null;        // buttons only
    return {
      area: surface,
      handlers: () => (gsSwipeHandlers.get(live) || (() => ({})))(),
      label: gsLiveState.phase === "arriving" ? GS_PAD_LABELS.streetArriving : GS_PAD_LABELS.streetDetect
    };
  }
  return null;
}

let gsDirectTouchTimer = null;
let gsDirectTouchFocusPending = false;
let gsDirectTouchLast = null;   // what the native side was last told: pad, label, rectangle

/* Place (or remove) the native area after layout. `focus` asks the iPhone to
 * move the VoiceOver cursor onto it: on opening a pad, or when the pad on
 * top changes; never for a mere resize. */
function gsDirectTouchSync({ focus = false } = {}) {
  if (!gsDirectTouchSupported()) return;
  if (focus) gsDirectTouchFocusPending = true;
  clearTimeout(gsDirectTouchTimer);
  gsDirectTouchTimer = setTimeout(() => {
    const wantFocus = gsDirectTouchFocusPending;
    gsDirectTouchFocusPending = false;
    const target = gsDirectTouchTarget();
    const raw = target?.area?.getBoundingClientRect?.();
    // With pinch zoom the native view is in screen points: map the layout
    // rectangle through the visual viewport.
    const vv = window.visualViewport;
    const scale = vv?.scale || 1;
    const box = raw && {
      left: (raw.left - (vv?.offsetLeft || 0)) * scale,
      top: (raw.top - (vv?.offsetTop || 0)) * scale,
      right: (raw.right - (vv?.offsetLeft || 0)) * scale,
      bottom: (raw.bottom - (vv?.offsetTop || 0)) * scale
    };
    // Only the part of the area that is on screen: an area below the bottom
    // edge left a VoiceOver user with nowhere to swipe (bug 24).
    const rect = box && {
      left: Math.max(0, box.left),
      top: Math.max(0, box.top),
      right: Math.min(window.innerWidth, box.right),
      bottom: Math.min(window.innerHeight, box.bottom)
    };
    const width = rect ? rect.right - rect.left : 0;
    const height = rect ? rect.bottom - rect.top : 0;
    if (!target || !rect || width < 1 || height < 1) {
      if (gsDirectTouchLast !== null) GSNativePlugin.directTouchHide({}).catch?.(() => {});
      gsDirectTouchLast = null;
      return;
    }
    // Nothing changed since the last call: leave the area, and VoiceOver's
    // cursor, where they are. (Layout observers fire after every show.)
    const key = `${target.area.id}|${target.label}|${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(width)},${Math.round(height)}`;
    if (key === gsDirectTouchLast && !wantFocus) return;
    gsDirectTouchLast = key;
    GSNativePlugin.directTouchShow({
      x: rect.left, y: rect.top, width, height, label: target.label, hint: gsPadHint(), focus: wantFocus
    }).catch?.(() => {});
  }, 60);
}

/* A gesture from the native area: same handlers as a pointer gesture, timed
 * from the touch-down (now minus how long the finger was down). "escape" is
 * VoiceOver's two-finger scrub, which does what Back does. */
function gsDirectTouchEvent(event) {
  gsGestureLogAdd("native", event?.kind, event?.durationMs);
  if (event?.kind === "escape") return gsPadBack();
  const target = gsDirectTouchTarget();
  if (!target) return false;
  const handlers = target.handlers() || {};
  const fn = handlers[event?.kind];
  if (typeof fn !== "function") return false;
  const durationMs = Number(event?.durationMs) || 0;
  fn(performance.now() - durationMs);
  return true;
}

window.addEventListener("resize", () => { if (gsOpenPads > 0) gsDirectTouchSync(); });
window.visualViewport?.addEventListener("resize", () => { if (gsOpenPads > 0) gsDirectTouchSync(); });
window.visualViewport?.addEventListener("scroll", () => { if (gsOpenPads > 0) gsDirectTouchSync(); });
// The street pad's text changes after a vehicle is detected and the surface
// moves; the native area used to stay where it was (bug 38, Oct 2026 review).
if (typeof ResizeObserver === "function") {
  const gsDirectTouchObserver = new ResizeObserver(() => { if (gsOpenPads > 0) gsDirectTouchSync(); });
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".gesture-overlay, .gesture-overlay > *").forEach((el) => gsDirectTouchObserver.observe(el));
  });
}

/*
 * What the pads receive, for checking screen readers on real phones
 * (tracker 13.4: whether TalkBack passes its gestures to the app is only
 * answerable on a phone). The last 40 gestures, newest last; shown under
 * Settings, Debug.
 */
const gsGestureLog = [];
function gsGestureLogAdd(source, kind, extra) {
  gsGestureLog.push({ at: new Date().toISOString().slice(11, 19), source, kind: String(kind), extra: extra === undefined ? "" : String(Math.round(Number(extra) || 0)) });
  if (gsGestureLog.length > 40) gsGestureLog.shift();
  if (typeof gsRenderGestureLog === "function") gsRenderGestureLog();
}

/* Only the top pad can be reached. The answer pad opens over the street pad,
 * and a screen reader or Tab could reach the pad behind it (bug 28, Oct 2026 review). */
function gsPadStackSync(except = null) {
  const open = [...document.querySelectorAll(".gesture-overlay")].filter((p) => !p.hidden && p !== except);
  const top = open.reduce((best, p) => (!best || Number(getComputedStyle(p).zIndex) >= Number(getComputedStyle(best).zIndex) ? p : best), null);
  open.forEach((p) => {
    const covered = p !== top;
    p.inert = covered;
    if (covered) p.setAttribute("aria-hidden", "true"); else p.removeAttribute("aria-hidden");
  });
  return top;
}

function gsTopPad() {
  return gsPadStackSync();
}

/* A screen reader's cursor should land on the swipe area as the pad opens.
 * On iPhone the native area takes it (gsDirectTouchSync focus); the page
 * focuses the title, which sits outside the area, so nothing under the area
 * is focused. Elsewhere the page's own swipe area is the focus target. */
function gsFocusPadStart(overlay, surface, fallback) {
  const swipeArea = surface && !surface.hidden ? surface : null;
  if (gsDirectTouchSupported() || !swipeArea) {
    (gsDirectTouchSupported() ? overlay.querySelector(".gesture-title") : fallback || overlay.querySelector(".gesture-title"))?.focus({ preventScroll: true });
    return;
  }
  swipeArea.focus({ preventScroll: true });
}

/* The web swipe area: hidden from the iPhone's screen reader (the native
 * area sits on top of it), a labelled, focusable element everywhere else. */
function gsSurfaceAccessibility(surface, label) {
  if (!surface) return;
  const hint = gsPadHint();
  surface.setAttribute("aria-label", hint ? `${label} ${hint}` : label);
  if (gsDirectTouchSupported()) {
    surface.setAttribute("aria-hidden", "true");
    surface.removeAttribute("tabindex");
  } else {
    surface.removeAttribute("aria-hidden");
    surface.setAttribute("tabindex", "-1");
  }
}

function gsShowPad(el, { opener = document.activeElement } = {}) {
  if (!el || !el.hidden) return;
  el.gsOpener = opener && opener !== document.body ? opener : null;
  el.hidden = false;
  gsOpenPads += 1;
  gsPadStackSync();
  if (gsOpenPads === 1 && typeof gsKeepAwakeFor === "function") gsKeepAwakeFor("pad", true);
  gsDirectTouchSync({ focus: true });
  if (typeof setMainContentInert === "function") setMainContentInert(true);
  document.body.classList.add("pad-open");
}

/*
 * Hide a pad. Focus is handed on BEFORE the pad goes: to the pad underneath
 * (its title; on iPhone the native area then takes the cursor), else to the
 * control that opened the pad, else to the screen's title. Hiding first left
 * VoiceOver with nothing to stand on, and it jumped to Back at the top of
 * the screen (tracker 12.27, 13.2).
 */
function gsHidePad(el, { focusTo = null } = {}) {
  if (!el || el.hidden) return;
  const below = gsPadStackSync(el);
  const hadFocus = el.contains(document.activeElement) || document.activeElement === document.body;
  gsOpenPads = Math.max(0, gsOpenPads - 1);
  if (!gsOpenPads) {
    if (typeof gsKeepAwakeFor === "function") gsKeepAwakeFor("pad", false);
    document.body.classList.remove("pad-open");
    const dialogOpen = [...document.querySelectorAll("dialog")].some((d) => d.open);
    if (!dialogOpen && typeof setMainContentInert === "function") setMainContentInert(false);
  }
  if (hadFocus) {
    const opener = el.gsOpener;
    const openerUsable = opener && opener.isConnected && !opener.closest("[hidden], [inert]") && !opener.disabled;
    const next = focusTo
      || (below ? below.querySelector(".gesture-title") : null)
      || (openerUsable ? opener : null)
      || document.getElementById("screenTitle");
    next?.focus({ preventScroll: true });
  }
  el.gsOpener = null;
  el.hidden = true;
  el.inert = false;
  el.removeAttribute("aria-hidden");
  gsDirectTouchSync({ focus: Boolean(below) });
}

/* ---------------- Back: the one way out of a pad ---------------- */

const gsPadBackHandlers = new Map();

/* Back on whichever pad is on top. Returns false when no pad is open. */
function gsPadBack() {
  const top = gsTopPad();
  if (!top) return false;
  const fn = gsPadBackHandlers.get(top.id);
  if (typeof fn === "function") fn();
  return true;
}

/* Escape does what Back does, for keyboard, braille display and switch users. */
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (gsPadBack()) event.preventDefault();
});

const GS_SWIPE_MIN_PX = 36;

/**
 * Read swipes and taps on a surface. handlers: { up, down, left, right, tap }.
 * Pointer events that start on a button, select or link are left alone so
 * the buttons on the pad still work normally.
 */
/* The handler lookups per pad, so the native direct-touch area (iPhone,
 * build 12) can route a gesture to the same code as a web pointer event. */
const gsSwipeHandlers = new Map();

function gsBindSwipeSurface(surface, getHandlers) {
  gsSwipeHandlers.set(surface, getHandlers);
  const swipe = { active: false, x: 0, y: 0, id: null, lastUpAt: 0 };
  // Controls keep their own behavior; the title and Back are excluded so that a
  // screen-reader double tap on them can never count as an answer.
  const isControl = (target) => Boolean(target?.closest?.("button, select, a, input, label, summary, .gesture-title, .gesture-header"));
  surface.addEventListener("pointerdown", (event) => {
    if (isControl(event.target)) return;
    swipe.active = true;
    swipe.x = event.clientX;
    swipe.y = event.clientY;
    swipe.id = event.pointerId;
    // The moment that counts is the touch, not the lift: a 0.3 s swipe must
    // not make the warning time 0.3 s shorter (Cindi, 16 Oct 2026).
    swipe.downAt = performance.now();
    try { surface.setPointerCapture(event.pointerId); } catch (error) { /* optional */ }
  });
  surface.addEventListener("pointerup", (event) => {
    if (!swipe.active || event.pointerId !== swipe.id) return;
    swipe.active = false;
    swipe.lastUpAt = performance.now();
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    const handlers = getHandlers() || {};
    let kind = null;
    if (Math.abs(dx) < GS_SWIPE_MIN_PX && Math.abs(dy) < GS_SWIPE_MIN_PX) kind = "tap";
    else if (Math.abs(dy) >= Math.abs(dx)) kind = dy < 0 ? "up" : "down";
    else kind = dx < 0 ? "left" : "right";
    gsGestureLogAdd(event.pointerType || "pointer", kind, swipe.lastUpAt - swipe.downAt);
    if (typeof handlers[kind] === "function") {
      event.preventDefault();
      handlers[kind](swipe.downAt);
    }
  });
  surface.addEventListener("pointercancel", () => { swipe.active = false; });
  // A screen reader's double-tap arrives as a click with no pointer sequence
  // of its own (TalkBack; VoiceOver with Direct Touch off): it counts as a
  // tap. A click that follows a pointer sequence is that same tap, ignored.
  surface.addEventListener("click", (event) => {
    if (isControl(event.target)) return;
    if (swipe.lastUpAt > 0 && performance.now() - swipe.lastUpAt < 700) return;
    gsGestureLogAdd("click", "tap", 0);
    const handlers = getHandlers() || {};
    if (typeof handlers.tap === "function") handlers.tap(performance.now());
  });
  // Keyboard: the arrows answer; Space or Enter is a tap.
  surface.addEventListener("keydown", (event) => {
    if (isControl(event.target)) return;
    const handlers = getHandlers() || {};
    const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", " ": "tap", Enter: "tap" };
    const kind = map[event.key];
    if (!kind || typeof handlers[kind] !== "function") return;
    event.preventDefault();
    gsGestureLogAdd("key", kind, 0);
    handlers[kind](performance.now());
  });
  // The pad never scrolls the page.
  surface.addEventListener("touchmove", (event) => { event.preventDefault(); }, { passive: false });
}

/* ---------------- Answer pad ---------------- */

const gsAnswerPad = { onAnswer: null, onBack: null };

/*
 * Open the answer pad. onBack: what Back does (cancel the judgment). With
 * swipes on, the whole pad below the header is the swipe area and the
 * question and the instructions are shown in it at the student's text size;
 * with swipes off, the three buttons.
 */
function gsOpenAnswerPad({ title, onAnswer, onBack = null, onSkip = null }) {
  const overlay = document.getElementById("answerOverlay");
  if (!overlay) return;
  gsAnswerPad.onAnswer = onAnswer;
  gsAnswerPad.onBack = onBack || onSkip;
  const question = document.getElementById("answerQuestion");
  if (question) question.textContent = title;
  const surface = document.getElementById("answerSurface");
  const grid = overlay.querySelector(".answer-grid");
  const swipeOn = gsPadSwipesOn();
  if (surface) surface.hidden = !swipeOn;
  if (grid) grid.hidden = swipeOn;
  overlay.classList.toggle("buttons-only", !swipeOn);
  overlay.classList.toggle("swipes", swipeOn);
  gsSurfaceAccessibility(surface, `${title} ${GS_PAD_LABELS.answer}`);
  gsShowPad(overlay);
  // One swipe either way from the middle answer reaches the other two.
  gsFocusPadStart(overlay, surface, document.querySelector("#answerOverlay .answer-btn[data-answer='same']"));
}

function gsCloseAnswerPad(options) {
  gsAnswerPad.onAnswer = null;
  gsAnswerPad.onBack = null;
  gsHidePad(document.getElementById("answerOverlay"), options);
}

/* Back: close the pad and let the activity record the cancelled judgment. */
function gsAnswerPadBack() {
  const back = gsAnswerPad.onBack;
  gsCloseAnswerPad();
  if (typeof back === "function") back();
}

function gsAnswerPadAnswer(answer) {
  const handler = gsAnswerPad.onAnswer;
  if (!handler || !GS_ANSWERS.includes(answer)) return;
  gsCloseAnswerPad();
  handler(answer);
}

/* ---------------- "How much" pad ---------------- */

const gsHowMuchPad = { start: 0, onDone: null, onBack: null };

function gsOpenHowMuchPad({ title, onDone, onBack = null, onSkip = null }) {
  const overlay = document.getElementById("howMuchOverlay");
  const btn = document.getElementById("compareFollowUpBtn");
  if (!overlay || !btn) return;
  gsHowMuchPad.start = 0;
  gsHowMuchPad.onDone = onDone;
  gsHowMuchPad.onBack = onBack || onSkip;
  const titleEl = document.getElementById("howMuchTitle");
  if (titleEl) titleEl.textContent = title;
  btn.textContent = "TAP TO START";
  btn.setAttribute("aria-label", `${title} Tap to start, then tap again to end.`);
  gsShowPad(overlay);
  gsFocusPadStart(overlay, null, btn);
}

function gsCloseHowMuchPad(options) {
  gsHowMuchPad.start = 0;
  gsHowMuchPad.onDone = null;
  gsHowMuchPad.onBack = null;
  gsHidePad(document.getElementById("howMuchOverlay"), options);
}

function gsHowMuchPadBack() {
  const back = gsHowMuchPad.onBack;
  gsCloseHowMuchPad();
  if (typeof back === "function") back();
}

/* atMs: the touch-down time the swipe area or the button passes in (the
 * moment that counts is the touch, tracker 20.9); now when there is none. */
function gsHowMuchTap(atMs) {
  if (!gsHowMuchPad.onDone) return;
  const at = Number.isFinite(atMs) && atMs <= performance.now() ? atMs : performance.now();
  const btn = document.getElementById("compareFollowUpBtn");
  if (!gsHowMuchPad.start) {
    gsHowMuchPad.start = at;
    playStudentTone();
    hapticCue("start");
    if (btn) {
      btn.textContent = "TAP TO END";
      btn.setAttribute("aria-label", "Tap to end.");
    }
    return;
  }
  const produced = Math.max(0, at - gsHowMuchPad.start) / 1000;
  playStudentTone();
  const done = gsHowMuchPad.onDone;
  gsCloseHowMuchPad();
  done(produced);
}

/* Kept for older callers and tests: Skip became Back (tracker 13.7). */
function gsAnswerPadSkip() { gsAnswerPadBack(); }
function gsHowMuchPadSkip() { gsHowMuchPadBack(); }

/* ============================================================
 * Play it again (Cindi, Oct 18 2026; tracker F1)
 * ------------------------------------------------------------
 * After the replay in Comparison preparation, Comparison practice and At the
 * street, the student can hear that same replay again, as many times as they
 * like, until they start a new sample or vehicle. It replays the last try
 * exactly, is never recorded or scored, and sits right after the page's main
 * button (one swipe from Play for VoiceOver users). Not in Practice my
 * timing: there what plays back is clearly the student's own taps.
 * ============================================================ */

const gsPlayAgain = { compare: null, signal: null, live: null };

function gsPlayAgainButton(activity) {
  return document.getElementById({ compare: "comparePlayAgainBtn", signal: "signalPlayAgainBtn", live: "livePlayAgainBtn" }[activity]);
}

/* Remember the replay of the try just finished. */
function gsPlayAgainSet(activity, fn) {
  gsPlayAgain[activity] = typeof fn === "function" ? fn : null;
}

/* Show the button when there is something to play again and the option allows it. */
function gsPlayAgainShow(activity, show) {
  const btn = gsPlayAgainButton(activity);
  if (!btn) return;
  const enabled = typeof gsPlayAgainEnabled === "function" ? gsPlayAgainEnabled() : true;
  btn.hidden = !(show && enabled && gsPlayAgain[activity]);
  gsSetBusy(btn, false);
}

function gsPlayAgainClear(activity) {
  gsPlayAgain[activity] = null;
  gsPlayAgainShow(activity, false);
}

/* The student's own switch, one setting shared by the three activities. */
function gsPlayAgainToggleInit() {
  const toggles = [...document.querySelectorAll(".play-again-toggle")];
  const sync = () => { const on = localStorage.getItem("om-playAgain") !== "false"; toggles.forEach((t) => { t.checked = on; }); };
  sync();
  toggles.forEach((t) => t.addEventListener("change", () => {
    localStorage.setItem("om-playAgain", String(t.checked));
    sync();
    ["compare", "signal", "live"].forEach((a) => { if (gsPlayAgain[a]) gsPlayAgainShow(a, true); });
  }));
}

/* ============================================================
 * COMPARISON PRACTICE
 * ============================================================ */

const gsCompareState = {
  street: "half", // First half first (Cindi, Oct 20 2026; tracker F6)
  intervalSec: 0,
  crossingSec: 0,
  marginSec: 0.4,
  expected: "same",
  phase: "idle", // idle | waiting | playing | answering | judged | howmuch | replaying
  lastDescribe: "" // what the last replay was, in words (build 15)
};

function gsCompareMargin() {
  return gsEffectiveMargin("compare", gsCompareState.street);
}

/**
 * Build a trial. Categories are drawn evenly so the student cannot learn a
 * base rate, and the magnitude is scaled to the crossing time so the task
 * stays proportionally as hard on a wide street as a narrow one. The interval
 * is then re-checked against the margin so the stored category is always the
 * one the student will be judged against.
 */
function gsBuildTrial(crossingSec, marginSec) {
  const category = GS_ANSWERS[Math.floor(Math.random() * GS_ANSWERS.length)];
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  let interval;

  if (category === "same") {
    // Inside the margin, but rarely dead-on: that would be too easy.
    interval = crossingSec + rand(-marginSec * 0.85, marginSec * 0.85);
  } else if (category === "longer") {
    interval = crossingSec + rand(marginSec * 1.4, Math.max(marginSec * 2.2, crossingSec * 0.8));
  } else {
    const floor = Math.max(0.6, crossingSec * 0.35);
    interval = Math.max(floor, crossingSec - rand(marginSec * 1.4, Math.max(marginSec * 2.2, crossingSec * 0.55)));
  }

  interval = Math.max(0.5, interval);
  return { interval, category: gsClassifyInterval(interval, crossingSec, marginSec) };
}

function gsCompareStatus(message, tone = "neutral", { announce = true } = {}) {
  const el = document.getElementById("compareStatus");
  const text = document.getElementById("compareStatusText");
  if (!el) return;
  (text || el).textContent = message;
  el.dataset.tone = tone;
  if (announce) announceScreenReader(message);
}

function gsCompareSetStartEnabled(enabled, label = "Play a sample warning time") {
  // Awake from Play until the try is over (tracker 20.12).
  if (typeof gsKeepAwakeFor === "function") gsKeepAwakeFor("compare", !enabled);
  const btn = document.getElementById("compareStartBtn");
  if (!btn) return;
  // Busy, not disabled: a disabled button drops VoiceOver's cursor to the
  // top of the screen on every try (tracker 12.27).
  gsSetBusy(btn, !enabled);
  const text = btn.querySelector(".action-btn-label") || btn;
  text.textContent = label;
}

function gsCompareStyle() {
  return gsFeatureStyle("compareSound", "gsIntervalStyle", "continuous");
}

/* Kept for older callers. */
function gsIntervalStyle() {
  return gsCompareStyle();
}

function gsCompareRandomDelayEnabled() {
  return gsFeatureActive("compareRandomPause", "compareRandomDelay");
}

function gsCompareHowMuchEnabled() {
  return gsFeatureActive("compareHowMuch", "compareFollowUp");
}

/** Cancel whatever the compare flow is doing. Safe to call at any time. */
function gsCompareCancel() {
  gsClearTimers(gsCompareTimers);
  gsClearHaptics();
  // Sounds already scheduled played on after a cancel (bug 31, Oct 2026 review).
  if (typeof stopAllSound === "function") stopAllSound();
  suppressSrAnnouncements = false;
  gsCompareState.phase = "idle";
  gsCloseAnswerPad();
  gsCloseHowMuchPad();
  gsCompareSetStartEnabled(true);
  if (typeof gsHideIntervalVisual === "function") gsHideIntervalVisual();
  if (typeof stopVisualReplay === "function") stopVisualReplay();
}

function gsCompareBegin() {
  // A press while a sample or replay is playing does nothing (the button is
  // busy, not disabled, so it can still be pressed).
  if (gsCompareState.phase !== "idle") return;
  gsCompareCancel();
  const crossingSec = gsCrossingTimeFor(gsCompareState.street);
  if (!Number.isFinite(crossingSec) || crossingSec <= 0) {
    gsCompareStatus("Enter your crossing times in Instructor setup first, or open the link your instructor sent.", "warn");
    return;
  }

  const margin = gsCompareMargin();
  const trial = gsBuildTrial(crossingSec, margin);
  gsCompareState.intervalSec = trial.interval;
  gsCompareState.crossingSec = crossingSec;
  gsCompareState.marginSec = margin;
  gsCompareState.expected = trial.category;
  gsCompareState.phase = "waiting";
  gsPlayAgainClear("compare");

  gsCompareSetStartEnabled(false, "Listen…");
  const randomPause = gsCompareRandomDelayEnabled();
  // Announced before speech is suppressed, so a screen-reader user hears it.
  gsCompareStatus(randomPause
    ? "Get ready. The sample warning time will start after a pause."
    : "Listen to the sample warning time.");

  gsAfterSpeech(gsCompareTimers, () => {
    const delaySec = randomPause ? 1.2 + Math.random() * 3 : 0.35;
    gsLater(gsCompareTimers, () => {
      gsCompareState.phase = "playing";
      gsBeginQuiet();
      gsPlaySample(trial.interval, 0.05, gsCompareStyle());
      gsLater(gsCompareTimers, gsCompareAskAnswer, 0.05 + trial.interval + 0.4);
    }, delaySec);
  });
}

function gsCompareAskAnswer() {
  suppressSrAnnouncements = false;
  gsCompareState.phase = "answering";
  const title = "Was that longer, shorter, or about the same as your crossing?";
  gsCompareStatus(title, "neutral", { announce: false });
  gsOpenAnswerPad({ title, onAnswer: gsCompareAnswer, onBack: gsCompareBack });
  gsAnnouncePad(title, "Swipe up for longer, down for shorter, or tap for about the same, anywhere on the screen.");
}

/*
 * What a pad says as it opens. A screen reader reads the focused swipe area's
 * label, so nothing else is announced at that moment (tracker 12.28). With
 * buttons only the question is announced. Self-voicing speaks the question
 * and the instructions either way.
 */
function gsAnnouncePad(title, swipeInstructions) {
  if (a11ySettings.selfVoice) {
    gsSpeak(gsPadSwipesOn() ? `${title} ${swipeInstructions}` : title);
    return;
  }
  if (!gsPadSwipesOn()) announceScreenReader(title);
}

function gsCompareAnswer(answer) {
  if (gsCompareState.phase !== "answering") return;
  if (!GS_ANSWERS.includes(answer)) return;
  gsCompareState.phase = "judged";
  gsCloseAnswerPad();

  const correct = answer === gsCompareState.expected;
  const diff = gsCompareState.intervalSec - gsCompareState.crossingSec;

  gsLogAttempt({
    activity: "compare",
    street: gsCompareState.street,
    userSec: gsCompareState.intervalSec,
    refSec: gsCompareState.crossingSec,
    diffSec: diff,
    correct,
    marginSec: gsCompareState.marginSec,
    answer,
    expected: gsCompareState.expected
  });
  gsCompareRenderScore();

  // Right or wrong is the chime or the pulse, the knocks or the buzz, the
  // circle or the triangle, and then the replay. No words, spoken or on
  // screen: they repeated the cue and were cut off by the replay (Cindi,
  // Oct 18 2026; tracker 12.29).
  gsShowResult(correct);
  gsCompareStatus("", "neutral", { announce: false });

  // Build 15: the result in words after the sound, for everyone, and the
  // next step waits for the words, so they are never cut off (the reason
  // words were removed in 12.29). Off under Accessibility > Speech.
  const verdict = correct ? "Correct." : `Not correct. It was ${gsAnswerWords(gsCompareState.expected)}.`;
  gsCompareState.lastDescribe = "That was the sample warning time, then your own sound where your crossing time ends.";

  // "How much" only makes sense when the student got the direction right:
  // if they could not tell longer from shorter, they cannot judge how much.
  const offerHowMuch = correct && gsCompareState.expected !== "same" && gsCompareHowMuchEnabled();
  gsDescribeThen(gsCompareTimers, verdict, () => {
    if (gsCompareState.phase !== "judged") return;
    if (offerHowMuch) gsCompareStartHowMuch();
    else gsCompareReplay();
  }, 1.2, (short) => gsCompareStatus(short, "neutral", { announce: false }));
}

function gsAnswerWords(answer) {
  return answer === "same" ? "about the same" : String(answer || "");
}

/** The judgment replay of this trial, then back to idle. */
function gsCompareReplay(afterSec = 0.1) {
  gsCompareState.phase = "replaying";
  gsBeginQuiet();
  const params = { sampleSec: gsCompareState.intervalSec, crossingSec: gsCompareState.crossingSec, style: gsCompareStyle() };
  const doneAt = gsReplayJudgment({ ...params, startDelaySec: afterSec + 0.4 });
  gsPlayAgainSet("compare", () => gsReplayJudgment({ ...params, startDelaySec: 0.5 }));
  gsLater(gsCompareTimers, () => gsCompareFinish("Press Play for another.", "neutral", { describe: gsCompareState.lastDescribe }), doneAt + 0.2);
}

/* Play it again: the same replay, not recorded, then back to idle. */
function gsComparePlayAgain() {
  const fn = gsPlayAgain.compare;
  if (gsCompareState.phase !== "idle" || typeof fn !== "function") return;
  gsCompareState.phase = "replaying";
  gsCompareSetStartEnabled(false, "Listen…");
  gsSetBusy(gsPlayAgainButton("compare"), true);
  gsCompareStatus("", "neutral", { announce: false });
  gsBeginQuiet();
  const doneAt = fn();
  gsLater(gsCompareTimers, () => gsCompareFinish("Press Play for another.", "neutral", { focus: "playAgain", describe: gsCompareState.lastDescribe }), doneAt + 0.2);
}

function gsCompareFinish(message, tone = "neutral", { focus = "play", describe = "" } = {}) {
  suppressSrAnnouncements = false;
  gsCompareState.phase = "idle";
  gsCompareSetStartEnabled(true);
  // The replay in words, then the prompt, as one utterance (build 15).
  const said = Boolean(describe) && a11ySettings.describeSounds && gsDescribe(`${describe} ${message}`);
  // Off (Speech: Low): the verdict still shows and is read, in short (20.2).
  const verdict = said ? "" : gsVerdictFromDescribe(describe);
  gsCompareStatus(verdict ? `${verdict} ${message}` : message, tone, { announce: !said });
  gsPlayAgainShow("compare", focus !== "title");
  // After Back, focus goes to the screen's title (tracker 13.7); after Play it
  // again, the button itself; otherwise Play, where the student already is.
  const target = focus === "title" ? document.getElementById("screenTitle")
    : focus === "playAgain" ? gsPlayAgainButton("compare")
      : document.getElementById("compareStartBtn");
  target?.focus({ preventScroll: true });
}

function gsCompareStartHowMuch() {
  gsCompareState.phase = "howmuch";
  const direction = gsCompareState.expected;
  const title = `How much ${direction}? Tap to start, tap again to end.`;
  gsCompareStatus(title, "neutral", { announce: false });
  gsOpenHowMuchPad({ title: `How much ${direction}?`, onDone: gsCompareHowMuchDone, onBack: gsCompareHowMuchBack });
  gsAnnouncePad(title, "Tap anywhere on the screen to start, and tap again to end.");
}

/*
 * Back on the answer pad: the try is cancelled. It is recorded as cancelled
 * so the instructor sees it, and never scored (design: Cindi, Oct 16 and
 * Oct 20 2026; tracker 13.7). The stored flag is still `skipped`, so records
 * from builds 11 to 13 read the same way.
 */
function gsCompareBack() {
  if (gsCompareState.phase !== "answering") return;
  gsLogAttempt({
    activity: "compare",
    street: gsCompareState.street,
    userSec: gsCompareState.intervalSec,
    refSec: gsCompareState.crossingSec,
    diffSec: gsCompareState.intervalSec - gsCompareState.crossingSec,
    correct: false,
    marginSec: gsCompareState.marginSec,
    expected: gsCompareState.expected,
    skipped: true,
    skip: "judgment"
  });
  gsCompareCancel();
  gsCompareRenderScore();
  gsCompareFinish("Cancelled. Not scored. Press Play for another.", "neutral", { focus: "title" });
}

/* Back on the How much pad: the judgment stands; the estimate is recorded as cancelled. */
function gsCompareHowMuchBack() {
  if (gsCompareState.phase !== "howmuch") return;
  const trueDiff = Math.abs(gsCompareState.intervalSec - gsCompareState.crossingSec);
  gsLogHowMuch({
    activity: "compare",
    street: gsCompareState.street,
    userSec: 0,
    refSec: trueDiff,
    diffSec: 0,
    correct: false,
    marginSec: gsEffectiveMargin("compare", gsCompareState.street, true),
    skipped: true
  });
  gsCompareFinish("Estimate cancelled. Not scored. Press Play for another.", "neutral", { focus: "title" });
}

/* Kept for older callers. */
function gsCompareSkip() { gsCompareBack(); }
function gsCompareHowMuchSkip() { gsCompareHowMuchBack(); }

function gsCompareHowMuchDone(produced) {
  if (gsCompareState.phase !== "howmuch") return;
  const trueDiff = Math.abs(gsCompareState.intervalSec - gsCompareState.crossingSec);
  // "How much" is its own skill with its own adaptive lane; the judgment's
  // margin (which sets the "about the same" band) is not reused here.
  const margin = gsEffectiveMargin("compare", gsCompareState.street, true);
  const correct = Math.abs(produced - trueDiff) <= margin;

  // One try is one record: the estimate joins the judgment (tracker 12.37).
  gsLogHowMuch({
    activity: "compare",
    street: gsCompareState.street,
    userSec: produced,
    refSec: trueDiff,
    diffSec: produced - trueDiff,
    correct,
    marginSec: margin
  });
  gsCompareRenderScore();

  gsCompareState.phase = "replaying";
  // The right or wrong cue inside the replay says how the estimate went; no
  // words before it (tracker 12.29). After the replay, the replay in words
  // (build 15), with the verdict, never the seconds.
  const closing = "Press Play for another.";
  const tone = "neutral";
  gsCompareStatus("", "neutral", { announce: false });

  if (gsFeature("magnitudeReplay") === "b") {
    gsCompareState.lastDescribe = `That was the sample and your crossing time, then your estimate against the real difference: ${gsVerdictWords(correct)}.`;
    gsBeginQuiet();
    const judgment = { sampleSec: gsCompareState.intervalSec, crossingSec: gsCompareState.crossingSec, style: gsCompareStyle() };
    const estimate = { estimateSec: produced, trueDiffSec: trueDiff, marginSec: margin, append: true };
    const replayB = (startDelaySec) => {
      const first = gsReplayJudgment({ ...judgment, startDelaySec });
      return gsReplayMagnitudeB({ ...estimate, startDelaySec: first + 0.5 });
    };
    const secondDone = replayB(0.8);
    gsPlayAgainSet("compare", () => replayB(0.5));
    gsLater(gsCompareTimers, () => gsCompareFinish(closing, tone, { describe: gsCompareState.lastDescribe }), secondDone + 0.2);
    return;
  }
  gsCompareState.lastDescribe = `That was the sample, your crossing time, where you thought the sample ended, and the sound where it really ended: ${gsVerdictWords(correct)}.`;

  gsBeginQuiet();
  const params = {
    crossingSec: gsCompareState.crossingSec,
    sampleSec: gsCompareState.intervalSec,
    estimateSec: produced,
    direction: gsCompareState.expected,
    marginSec: margin,
    style: gsCompareStyle()
  };
  const doneAt = gsReplayMagnitudeA({ ...params, startDelaySec: 0.8 });
  gsPlayAgainSet("compare", () => gsReplayMagnitudeA({ ...params, startDelaySec: 0.5 }));
  gsLater(gsCompareTimers, () => gsCompareFinish(closing, tone, { describe: gsCompareState.lastDescribe }), doneAt + 0.2);
}

function gsCompareRenderScore() {
  const el = document.getElementById("compareScore");
  if (!el) return;
  // Judgments only, and the last ten OF THOSE: "how much" estimates are a
  // different skill and are shown on their own.
  const recentWindow = gsHistoryFor("compare", gsCompareState.street, 10, false);
  const howMuch = gsHistoryFor("compare", gsCompareState.street, 10, true);
  const accuracy = gsAccuracy(recentWindow);
  const margin = gsCompareMargin();
  const marginNote = gsMarginNote(margin, gsAdaptiveEnabled());
  const howMuchNote = howMuch.length
    ? ` · how much: ${howMuch.filter((e) => e.correct).length} of ${howMuch.length} within margin`
    : "";
  el.textContent = accuracy === null
    ? `No attempts yet${marginNote}`
    : `Last ${recentWindow.length}: ${Math.round(accuracy * 100)}% correct${howMuchNote}${marginNote}`;
}

function gsCompareSetStreet(street) {
  gsCompareCancel();
  gsPlayAgainClear("compare");
  gsCompareState.street = street;
  gsCompareRenderScore();
  gsCompareStatus(`${street === "half" ? "First half of the street" : "Full street"} selected. Press Play when ready.`);
}

/* ============================================================
 * AT THE STREET
 * ------------------------------------------------------------
 * Reworked in build 7, with Cindi and Dona:
 *   - no microphone, no "quiet level": accuracy depended on how the phone
 *     was held, and judging the conditions is taught by the instructor;
 *   - the student marks hearing or vision, saved with each vehicle;
 *   - detection is a swipe toward the side the vehicle comes from (left: the
 *     first half of the street; right: the full street), arrival is a tap,
 *     "it never came" is a swipe down. Buttons do the same for screen
 *     readers;
 *   - after arrival the STUDENT judges longer / shorter / about the same,
 *     exactly as in Comparison practice; the app does not give the answer;
 *   - replays: after every vehicle, only after an error, or never.
 * ============================================================ */

const gsLiveState = {
  lastDescribe: "", // what the last replay was, in words (build 15)
  phase: "closed", // closed | detect | arriving | judging | howmuch | feedback
  direction: "left",
  detectedAt: 0,
  warningSec: 0,
  crossingSec: 0,
  marginSec: 0.4,
  category: "same",
  renderedPhase: ""
};

function gsLiveStreetFor(direction) {
  return direction === "left" ? "half" : "full";
}

function gsLiveSense() {
  return gsFeatureStyle("liveSense", "liveSense", "hearing");
}

function gsLiveJudgeEnabled() {
  return gsFeatureActive("liveJudge", "liveJudgeToggle");
}

function gsLiveHowMuchEnabled() {
  return gsFeatureActive("liveHowMuch", "liveHowMuchToggle");
}

function gsLiveReplayMode() {
  const value = gsFeature("liveReplay");
  if (value !== "choose") return value;
  return document.getElementById("liveReplaySelect")?.value || "always";
}

function gsLiveStatus(message, tone = "neutral", { announce = true } = {}) {
  const el = document.getElementById("liveStatus");
  const text = document.getElementById("liveStatusText");
  if (el) {
    (text || el).textContent = message;
    el.dataset.tone = tone;
  }
  const overlayStatus = document.getElementById("liveOverlayStatus");
  if (overlayStatus) overlayStatus.textContent = message;
  if (announce) announceScreenReader(message);
  if (gsOpenPads > 0) gsDirectTouchSync();
}

function gsLiveRenderPad() {
  const overlay = document.getElementById("liveOverlay");
  const detect = document.getElementById("liveDetectButtons");
  const arrive = document.getElementById("liveArriveButtons");
  const surface = document.getElementById("liveSurface");
  const surfaceText = document.getElementById("liveSurfaceText");
  const phase = gsLiveState.phase;
  const swipeOn = gsPadSwipesOn();
  if (detect) detect.hidden = !swipeOn ? phase !== "detect" : true;
  if (arrive) arrive.hidden = !swipeOn ? phase !== "arriving" : true;
  if (surface) surface.hidden = !swipeOn;
  overlay?.classList.toggle("buttons-only", !swipeOn);
  overlay?.classList.toggle("swipes", swipeOn);
  if (surfaceText) {
    surfaceText.textContent = phase === "arriving"
      ? "Tap when it passes in front of you. Swipe down if it never comes."
      : phase === "detect"
        ? "Swipe left: from the left. Swipe right: from the right."
        : "Listen";
  }
  gsSurfaceAccessibility(surface, phase === "arriving" ? GS_PAD_LABELS.streetArriving : GS_PAD_LABELS.streetDetect);
  // A new step means a new label: VoiceOver's cursor stays on the area and
  // reads it again.
  if (gsLiveState.renderedPhase !== phase && gsOpenPads > 0) gsDirectTouchSync({ focus: true });
  gsLiveState.renderedPhase = phase;
}

/* Where focus belongs on the street pad between steps: the swipe area (the
 * page's own, or on iPhone the title while the native area takes the
 * cursor), or the first button with swipes off. */
function gsLivePadFocus() {
  const overlay = document.getElementById("liveOverlay");
  if (!overlay || overlay.hidden) return;
  const buttons = gsLiveState.phase === "arriving" ? "#liveArrivedBtn" : "[data-live-detect='left']";
  gsFocusPadStart(overlay, document.getElementById("liveSurface"), document.querySelector(buttons));
}

function gsLiveOpen() {
  ensureAudioContext();
  const { clearTime, fullTime } = getTimingInputs();
  if (!(clearTime > 0) || !(fullTime > 0)) {
    gsLiveStatus("Enter your crossing times in Instructor setup first.", "warn");
    return;
  }
  gsLiveState.phase = "detect";
  gsLiveState.renderedPhase = "";
  gsShowPad(document.getElementById("liveOverlay"));
  gsLiveRenderPad();
  gsLivePadFocus();
  const message = "Swipe left or right the moment you think you detect a vehicle, toward the side it is coming from.";
  gsLiveStatus(message, "neutral", { announce: false });
  gsAnnouncePad("At the street.", message);
}

/*
 * Back on the street pad ends the street session (what Done did before).
 * A vehicle in progress is recorded as cancelled, not dropped (Azizul,
 * Oct 22 2026, on tracker 13.7's open point).
 */
function gsLiveClose() {
  gsPlayAgainClear("live");
  if (gsLiveState.phase === "arriving") {
    const street = gsLiveStreetFor(gsLiveState.direction);
    gsLogAttempt({
      activity: "live",
      street,
      direction: gsLiveState.direction,
      sense: gsLiveSense(),
      judged: false,
      skipped: true,
      skip: "vehicle",
      userSec: 0,
      refSec: gsCrossingTimeFor(street),
      diffSec: 0,
      correct: false,
      marginSec: gsEffectiveMargin("live", street)
    });
  }
  gsLiveCancelFlow();
  gsLiveState.phase = "closed";
  gsHidePad(document.getElementById("liveOverlay"), { focusTo: document.getElementById("screenTitle") });
  gsLiveRenderTally();
  gsLiveStatus("Press Start when you are in position.", "neutral", { announce: false });
}

/** Cancel any vehicle in progress. Safe to call at any time. */
function gsLiveCancelFlow() {
  gsClearTimers(gsLiveTimers);
  gsClearHaptics();
  if (typeof stopAllSound === "function") stopAllSound();
  suppressSrAnnouncements = false;
  gsCloseAnswerPad();
  gsCloseHowMuchPad();
  if (typeof stopVisualReplay === "function") stopVisualReplay();
  if (typeof gsHideIntervalVisual === "function") gsHideIntervalVisual();
  if (gsLiveState.phase !== "closed") gsLiveState.phase = "detect";
  gsLiveRenderPad();
}

/*
 * The phone locked or another app came to the front: a vehicle or a sample
 * being timed cannot be finished meaningfully, so it is dropped unrecorded.
 */
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  // At "how much" or a replay the answer is already in the log: say so,
  // rather than telling the student it was lost.
  if (gsLiveState.phase === "arriving" || gsLiveState.phase === "judging") {
    gsLiveCancelFlow();
    gsLiveStatus("The app was hidden, so that vehicle was not recorded. Ready for the next one.");
  } else if (gsLiveState.phase === "howmuch") {
    gsLiveCancelFlow();
    gsLiveStatus("The app was hidden. Your answer was saved; the estimate was not. Ready for the next one.");
  }
  const comparePhase = gsCompareState.phase;
  if (comparePhase !== "idle") {
    gsCompareCancel();
    const answered = comparePhase === "judged" || comparePhase === "howmuch" || comparePhase === "replaying";
    gsCompareFinish(answered
      ? "The app was hidden. Your answer was saved. Press Play for another."
      : "The app was hidden, so that one was not recorded. Press Play for another.");
  }
});

/* The sound was taken away during a sample (tracker 20.11): the sample the
 * student heard is not the one that would be scored. */
window.addEventListener("gs-audio-interrupted", () => {
  const phase = gsCompareState.phase;
  if (phase === "waiting" || phase === "playing") {
    gsCompareCancel();
    gsCompareFinish("The sound was interrupted, so that one was not recorded. Press Play for another.", "warn");
  } else if (phase === "replaying") {
    gsCompareCancel();
    gsCompareFinish("The sound was interrupted during the replay. Your answer was saved. Press Play for another.");
  }
});

/* Called by the shell when leaving the screen. */
function gsLiveLeave() {
  gsPlayAgainClear("live");
  gsLiveCancelFlow();
  gsLiveState.phase = "closed";
  gsHidePad(document.getElementById("liveOverlay"));
}

function gsLiveEnter() {
  gsLiveRenderTally();
}

function gsLiveDetect(direction, atMs) {
  if (gsLiveState.phase !== "detect") return;
  gsPlayAgainClear("live");
  gsLiveState.direction = direction === "right" ? "right" : "left";
  gsLiveState.detectedAt = Number.isFinite(atMs) ? atMs : performance.now();
  gsLiveState.phase = "arriving";
  gsLiveConfirm("start");
  gsLiveRenderPad();
  gsLiveStatus(`From the ${gsLiveState.direction}. Tap when it passes in front of you, or swipe down if it never comes.`, "neutral", { announce: !gsPadSwipesOn() });
  gsLivePadFocus();
}

/*
 * Confirm a street gesture. The student is listening for traffic, so the
 * instructor can make this vibration only (option liveConfirm); the default
 * keeps the short sound as well.
 */
function gsLiveConfirm(cue = "marker") {
  hapticCue(cue);
  if (gsFeature("liveConfirm") !== "vibration") playConfirmTone();
}

function gsLiveNeverCame() {
  if (gsLiveState.phase !== "arriving") return;
  const street = gsLiveStreetFor(gsLiveState.direction);
  gsLogAttempt({
    activity: "live",
    street,
    direction: gsLiveState.direction,
    sense: gsLiveSense(),
    never: true,
    correct: false,
    userSec: 0,
    refSec: gsCrossingTimeFor(street),
    diffSec: 0,
    marginSec: gsEffectiveMargin("live", street)
  });
  gsLiveConfirm("marker");
  gsLiveState.phase = "detect";
  gsLiveRenderPad();
  gsLiveRenderTally();
  gsLiveStatus("Noted: that vehicle never came. Ready for the next one.");
  gsLivePadFocus();
}

function gsLiveArrived(atMs) {
  if (gsLiveState.phase !== "arriving") return;
  const endMs = Number.isFinite(atMs) ? atMs : performance.now();
  const warningSec = Math.max(0, endMs - gsLiveState.detectedAt) / 1000;
  const street = gsLiveStreetFor(gsLiveState.direction);
  gsLiveState.warningSec = warningSec;
  gsLiveState.crossingSec = gsCrossingTimeFor(street);
  gsLiveState.marginSec = gsEffectiveMargin("live", street);
  gsLiveState.category = gsClassifyInterval(warningSec, gsLiveState.crossingSec, gsLiveState.marginSec);
  // One confirmation, like the swipe for a vehicle (it used to vibrate twice).
  gsLiveConfirm("marker");

  if (!gsLiveJudgeEnabled()) {
    gsLiveLog({ judged: false, answer: null, correct: false });
    gsLiveAfterVehicle({ judged: false, correct: true });
    return;
  }

  gsLiveState.phase = "judging";
  gsLiveRenderPad();
  const title = "Was that warning time longer, shorter, or about the same as your crossing?";
  gsLiveStatus(title, "neutral", { announce: false });
  gsOpenAnswerPad({ title, onAnswer: gsLiveAnswer, onBack: gsLiveJudgmentBack });
  gsAnnouncePad(title, "Swipe up for longer, down for shorter, or tap for about the same, anywhere on the screen.");
}

function gsLiveLog({ judged, answer, correct }) {
  const street = gsLiveStreetFor(gsLiveState.direction);
  gsLogAttempt({
    activity: "live",
    street,
    direction: gsLiveState.direction,
    sense: gsLiveSense(),
    judged,
    userSec: gsLiveState.warningSec,
    refSec: gsLiveState.crossingSec,
    diffSec: gsLiveState.warningSec - gsLiveState.crossingSec,
    correct,
    marginSec: gsLiveState.marginSec,
    answer,
    expected: gsLiveState.category
  });
}

function gsLiveAnswer(answer) {
  if (gsLiveState.phase !== "judging") return;
  const correct = answer === gsLiveState.category;
  gsLiveLog({ judged: true, answer, correct });
  // The cue carries the result, then the result in words (build 15); the
  // next step waits for the words so they are never cut off (12.29).
  gsShowResult(correct);
  gsLiveStatus("", "neutral", { announce: false });
  const verdict = correct ? "Correct." : `Not correct. It was ${gsAnswerWords(gsLiveState.category)}.`;

  const offerHowMuch = correct && gsLiveState.category !== "same" && gsLiveHowMuchEnabled();
  if (offerHowMuch) {
    gsLiveState.phase = "howmuch";
    gsDescribeThen(gsLiveTimers, verdict, () => {
      if (gsLiveState.phase !== "howmuch") return;
      const title = `How much ${gsLiveState.category}?`;
      gsOpenHowMuchPad({ title, onDone: gsLiveHowMuchDone, onBack: gsLiveHowMuchBack });
      gsAnnouncePad(`${title} Tap to start, tap again to end.`, "Tap anywhere on the screen to start, and tap again to end.");
    }, 1.2, (short) => gsLiveStatus(short, "neutral", { announce: false }));
    return;
  }
  gsDescribeThen(gsLiveTimers, verdict, () => {
    if (gsLiveState.phase !== "judging") return;
    gsLiveAfterVehicle({ judged: true, correct });
  }, a11ySettings.describeSounds ? 0 : 1.0, (short) => gsLiveStatus(short, "neutral", { announce: false }));
}

/*
 * Back on the answer pad at the street: back to the street pad, ready for the
 * next vehicle. The vehicle stays in the record with its warning time; the
 * judgment is recorded as cancelled, never scored (tracker 13.7).
 */
function gsLiveJudgmentBack() {
  if (gsLiveState.phase !== "judging") return;
  const street = gsLiveStreetFor(gsLiveState.direction);
  gsLogAttempt({
    activity: "live",
    street,
    direction: gsLiveState.direction,
    sense: gsLiveSense(),
    judged: false,
    skipped: true,
    skip: "judgment",
    userSec: gsLiveState.warningSec,
    refSec: gsLiveState.crossingSec,
    diffSec: gsLiveState.warningSec - gsLiveState.crossingSec,
    correct: false,
    marginSec: gsLiveState.marginSec,
    expected: gsLiveState.category
  });
  gsLiveState.phase = "detect";
  gsLiveRenderPad();
  gsLiveRenderTally();
  gsLiveStatus("Cancelled. Not scored. Ready for the next vehicle.");
  gsLivePadFocus();
}

/* Back on the How much pad at the street: the judgment stands, the estimate
 * is recorded as cancelled, and the street pad is ready for the next vehicle. */
function gsLiveHowMuchBack() {
  if (gsLiveState.phase !== "howmuch") return;
  const street = gsLiveStreetFor(gsLiveState.direction);
  const trueDiff = Math.abs(gsLiveState.warningSec - gsLiveState.crossingSec);
  gsLogHowMuch({
    activity: "live",
    street,
    direction: gsLiveState.direction,
    sense: gsLiveSense(),
    userSec: 0,
    refSec: trueDiff,
    diffSec: 0,
    correct: false,
    marginSec: gsEffectiveMargin("live", street, true),
    skipped: true
  });
  gsLiveState.phase = "detect";
  gsLiveRenderPad();
  gsLiveRenderTally();
  gsLiveStatus("Estimate cancelled. Not scored. Ready for the next vehicle.");
  gsLivePadFocus();
}

/* Kept for older callers. */
function gsLiveSkipJudgment() { gsLiveJudgmentBack(); }
function gsLiveHowMuchSkip() { gsLiveHowMuchBack(); }

function gsLiveHowMuchDone(produced) {
  if (gsLiveState.phase !== "howmuch") return;
  const trueDiff = Math.abs(gsLiveState.warningSec - gsLiveState.crossingSec);
  const street = gsLiveStreetFor(gsLiveState.direction);
  const howMuchMargin = gsEffectiveMargin("live", street, true);
  const correct = Math.abs(produced - trueDiff) <= howMuchMargin;
  // One vehicle is one record: the estimate joins the judgment (tracker 12.37).
  gsLogHowMuch({
    activity: "live",
    street,
    direction: gsLiveState.direction,
    sense: gsLiveSense(),
    userSec: produced,
    refSec: trueDiff,
    diffSec: produced - trueDiff,
    correct,
    marginSec: howMuchMargin
  });
  gsLiveAfterVehicle({ judged: true, correct: true, magnitude: { produced, trueDiff, correct, marginSec: howMuchMargin } });
}

/**
 * Feedback and replay after one vehicle, following the replay setting:
 *   always  replay after each vehicle
 *   errors  replay only if the judgment or the "how much" was wrong;
 *           otherwise just the right/wrong sound already given
 *   never   no replays, only the right/wrong sound
 */
function gsLiveAfterVehicle({ judged, correct, magnitude = null }) {
  gsLiveState.phase = "feedback";
  gsLiveRenderPad();
  gsLiveRenderTally();
  const mode = gsLiveReplayMode();

  const wrong = (judged && !correct) || (magnitude && !magnitude.correct);
  const replay = mode === "always" || (mode === "errors" && wrong);
  const replayB = magnitude && gsFeature("magnitudeReplay") === "b";
  // The replay in words, once it is over (build 15). Never the seconds.
  gsLiveState.lastDescribe = !magnitude
    ? "That was the warning time, then your own sound where your crossing time ends."
    : replayB
      ? `That was the warning time and your crossing time, then your estimate against the real difference: ${gsVerdictWords(magnitude.correct)}.`
      : `That was the warning time, your crossing time, where you thought it ended, and the sound where it really ended: ${gsVerdictWords(magnitude.correct)}.`;

  const start = () => {
    if (gsLiveState.phase !== "feedback") return;
    if (!replay) {
      gsLiveReady();
      return;
    }
    gsBeginQuiet();
    const style = "continuous";
    const warningSec = gsLiveState.warningSec;
    const crossingSec = gsLiveState.crossingSec;
    const category = gsLiveState.category;
    const run = (startDelaySec) => {
      if (replayB) {
        const first = gsReplayJudgment({ sampleSec: warningSec, crossingSec, style, startDelaySec });
        return gsReplayMagnitudeB({ estimateSec: magnitude.produced, trueDiffSec: magnitude.trueDiff, marginSec: magnitude.marginSec, startDelaySec: first + 0.5, append: true });
      }
      if (magnitude) {
        return gsReplayMagnitudeA({ crossingSec, sampleSec: warningSec, estimateSec: magnitude.produced, direction: category, marginSec: magnitude.marginSec, style, startDelaySec });
      }
      return gsReplayJudgment({ sampleSec: warningSec, crossingSec, style, startDelaySec });
    };
    const doneAt = run(0.3);
    gsPlayAgainSet("live", () => run(0.5));
    gsLater(gsLiveTimers, () => gsLiveReady({ describe: gsLiveState.lastDescribe }), doneAt + 0.2);
  };

  if (magnitude) {
    // The magnitude estimate gets its own right/wrong sound first, then the
    // verdict in words; the replay waits for the words.
    gsLater(gsLiveTimers, () => {
      gsShowResult(magnitude.correct);
      gsDescribeThen(gsLiveTimers, `${magnitude.correct ? "Within" : "Outside"} the margin.`, start, replay ? 1.4 : 1.2);
    }, 0.2);
    return;
  }
  gsLater(gsLiveTimers, start, replay ? 1.4 : 1.0);
}

/* Play it again at the street: the last vehicle's replay, then ready again. */
function gsLivePlayAgain() {
  const fn = gsPlayAgain.live;
  if (gsLiveState.phase !== "detect" || typeof fn !== "function") return;
  gsLiveState.phase = "feedback";
  gsSetBusy(gsPlayAgainButton("live"), true);
  gsBeginQuiet();
  const doneAt = fn();
  gsLater(gsLiveTimers, () => gsLiveReady({ describe: gsLiveState.lastDescribe }), doneAt + 0.2);
}

function gsLiveReady({ describe = "" } = {}) {
  suppressSrAnnouncements = false;
  if (gsLiveState.phase === "closed") return;
  gsLiveState.phase = "detect";
  gsLiveRenderPad();
  const message = "Ready for the next vehicle.";
  // The replay in words, then the prompt, as one utterance (build 15).
  const said = Boolean(describe) && a11ySettings.describeSounds && gsDescribe(`${describe} ${message}`);
  // Off (Speech: Low): the verdict still shows and is read, in short (20.2).
  const verdict = said ? "" : gsVerdictFromDescribe(describe);
  gsLiveStatus(verdict ? `${verdict} ${message}` : message, "neutral", { announce: !said });
  const playAgain = gsPlayAgainButton("live");
  const wasPlayingAgain = playAgain && !playAgain.hidden && gsIsBusy(playAgain);
  gsPlayAgainShow("live", true);
  if (wasPlayingAgain) playAgain.focus({ preventScroll: true });
  else gsLivePadFocus();
}

function gsLiveRenderTally() {
  const el = document.getElementById("liveTally");
  if (!el) return;
  const entries = gsLoadHistory().filter((e) => e.activity === "live" && e.answer !== "magnitude" && !e.skipped).slice(-20);
  const vehicles = entries.filter((e) => !e.never);
  if (!vehicles.length && !entries.length) {
    el.textContent = "No vehicles timed yet.";
    return;
  }
  const judged = vehicles.filter((e) => e.judged === true);
  const right = judged.filter((e) => e.correct).length;
  const never = entries.length - vehicles.length;
  const parts = [`Last ${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}`];
  if (judged.length) parts.push(`${right} of ${judged.length} judged correctly`);
  if (never) parts.push(`${never} never came`);
  el.textContent = parts.join(" · ");
}

/* ---------------- init ---------------- */

/* The loudness and pitch controls appear in both comparison activities and
 * share one setting. Built here so the two copies cannot drift apart. */
function gsBuildSampleControls() {
  document.querySelectorAll(".sample-sound-controls").forEach((wrap, index) => {
    const prefix = wrap.closest("#screen-signal") ? "prep" : "compare";
    wrap.innerHTML = `
      <label for="${prefix}Volume">Sound loudness</label>
      <div class="range-row">
        <input id="${prefix}Volume" class="sample-volume" type="range" min="20" max="100" step="5" />
        <output for="${prefix}Volume" class="sample-volume-out" aria-hidden="true"></output>
      </div>
      <label for="${prefix}Pitch">Sound pitch</label>
      <div class="range-row">
        <input id="${prefix}Pitch" class="sample-pitch" type="range" min="0" max="${GS_SAMPLE_PITCHES.length - 1}" step="1" />
        <output for="${prefix}Pitch" class="sample-pitch-out" aria-hidden="true"></output>
      </div>
      <p class="field-help">The sound stays at one loudness from start to end. Set it loud enough to hear clearly where you practice. A lower pitch can be easier to hear for some people.</p>
      <button class="settings-action sample-preview-btn" id="${prefix}PreviewBtn" type="button">Play a two-second sample</button>`;
    void index;
  });

  const syncAll = () => {
    const volume = String(Math.round(gsSampleVolume() * 100));
    const pitch = gsSamplePitchIndex();
    document.querySelectorAll(".sample-volume").forEach((input) => { input.value = volume; input.setAttribute("aria-valuetext", `${volume} percent`); });
    document.querySelectorAll(".sample-volume-out").forEach((out) => { out.textContent = `${volume}%`; });
    document.querySelectorAll(".sample-pitch").forEach((input) => {
      input.value = String(pitch);
      input.setAttribute("aria-valuetext", GS_SAMPLE_PITCHES[pitch].label);
    });
    document.querySelectorAll(".sample-pitch-out").forEach((out) => { out.textContent = GS_SAMPLE_PITCHES[pitch].label; });
  };
  syncAll();

  document.querySelectorAll(".sample-volume").forEach((input) => {
    input.addEventListener("input", () => {
      input.closest(".range-row").querySelector("output").textContent = `${input.value}%`;
      input.setAttribute("aria-valuetext", `${input.value} percent`);
    });
    input.addEventListener("change", () => {
      gsSetSampleVolume(Number(input.value) / 100);
      syncAll();
      announceScreenReader(`Sound loudness ${input.value} percent.`);
    });
  });
  document.querySelectorAll(".sample-pitch").forEach((input) => {
    const label = () => GS_SAMPLE_PITCHES[Number(input.value)]?.label || "";
    input.addEventListener("input", () => {
      input.closest(".range-row").querySelector("output").textContent = label();
      input.setAttribute("aria-valuetext", label());
    });
    input.addEventListener("change", () => {
      gsSetSamplePitchIndex(Number(input.value));
      syncAll();
      announceScreenReader(`Sound pitch ${label()}.`);
      gsClearHaptics();
      gsPlaySample(0.6, 0.05, "continuous", { visual: false, haptic: false });
    });
  });
  document.querySelectorAll(".sample-preview-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      gsClearHaptics();
      gsPlaySample(2.0, 0.05, "continuous", { visual: false });
    });
  });
}

function gsComparisonInit() {
  gsBuildSampleControls();

  document.querySelectorAll("input[name='compareStreet']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) gsCompareSetStreet(input.value);
    });
  });

  document.querySelectorAll("input[name='gsIntervalStyle']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) localStorage.setItem("om-sample-style", input.value);
    });
    const storedStyle = localStorage.getItem("om-sample-style");
    if (storedStyle && input.value === storedStyle) input.checked = true;
  });

  document.getElementById("compareStartBtn")?.addEventListener("click", () => gsCompareBegin());

  document.querySelectorAll("#answerOverlay .answer-btn").forEach((btn) => {
    btn.addEventListener("click", () => gsAnswerPadAnswer(btn.dataset.answer));
  });
  // Back, top-left on every pad (tracker 13.7).
  document.getElementById("answerBackBtn")?.addEventListener("click", gsAnswerPadBack);
  document.getElementById("howMuchBackBtn")?.addEventListener("click", gsHowMuchPadBack);
  document.getElementById("liveBackBtn")?.addEventListener("click", gsLiveClose);
  gsPadBackHandlers.set("answerOverlay", gsAnswerPadBack);
  gsPadBackHandlers.set("howMuchOverlay", gsHowMuchPadBack);
  gsPadBackHandlers.set("liveOverlay", gsLiveClose);
  const answerOverlay = document.getElementById("answerOverlay");
  if (answerOverlay) {
    gsBindSwipeSurface(answerOverlay, () => (gsPadSwipesOn() ? {
      up: () => gsAnswerPadAnswer("longer"),
      down: () => gsAnswerPadAnswer("shorter"),
      tap: () => gsAnswerPadAnswer("same")
    } : {}));
    // With buttons only the arrows still answer from any button.
    answerOverlay.addEventListener("keydown", (event) => {
      if (event.defaultPrevented || gsPadSwipesOn()) return;
      if (event.key === "ArrowUp") { event.preventDefault(); gsAnswerPadAnswer("longer"); }
      if (event.key === "ArrowDown") { event.preventDefault(); gsAnswerPadAnswer("shorter"); }
    });
  }

  const followUpBtn = document.getElementById("compareFollowUpBtn");
  followUpBtn?.addEventListener("click", () => gsHowMuchTap(gsPressTime(followUpBtn)));
  const howMuchOverlay = document.getElementById("howMuchOverlay");
  if (howMuchOverlay) gsBindSwipeSurface(howMuchOverlay, () => ({ tap: gsHowMuchTap }));

  // Student-side switches, remembered between visits.
  ["compareFollowUp", "compareRandomDelay", "liveHowMuchToggle"].forEach((id) => {
    const box = document.getElementById(id);
    if (!box) return;
    const key = `om-${id}`;
    box.checked = localStorage.getItem(key) === "true";
    box.addEventListener("change", () => localStorage.setItem(key, String(box.checked)));
  });
  const judge = document.getElementById("liveJudgeToggle");
  if (judge) {
    judge.checked = localStorage.getItem("om-liveJudgeToggle") !== "false";
    judge.addEventListener("change", () => localStorage.setItem("om-liveJudgeToggle", String(judge.checked)));
  }
  const replaySelect = document.getElementById("liveReplaySelect");
  if (replaySelect) {
    const stored = localStorage.getItem("om-live-replay");
    if (["always", "errors", "never"].includes(stored)) replaySelect.value = stored;
    replaySelect.addEventListener("change", () => localStorage.setItem("om-live-replay", replaySelect.value));
  }
  document.querySelectorAll("input[name='liveSense']").forEach((input) => {
    const stored = localStorage.getItem("om-live-sense");
    if (stored && input.value === stored) input.checked = true;
    input.addEventListener("change", () => {
      if (input.checked) localStorage.setItem("om-live-sense", input.value);
    });
  });

  // Play it again (F1).
  gsPlayAgainToggleInit();
  document.getElementById("comparePlayAgainBtn")?.addEventListener("click", gsComparePlayAgain);
  document.getElementById("livePlayAgainBtn")?.addEventListener("click", gsLivePlayAgain);

  // At the street.
  document.getElementById("liveStartBtn")?.addEventListener("click", gsLiveOpen);
  document.querySelectorAll("[data-live-detect]").forEach((btn) => {
    btn.addEventListener("click", () => gsLiveDetect(btn.dataset.liveDetect, gsPressTime(btn)));
  });
  const liveArrivedBtn = document.getElementById("liveArrivedBtn");
  liveArrivedBtn?.addEventListener("click", () => gsLiveArrived(gsPressTime(liveArrivedBtn)));
  document.getElementById("liveNeverBtn")?.addEventListener("click", gsLiveNeverCame);
  const liveOverlay = document.getElementById("liveOverlay");
  if (liveOverlay) {
    gsBindSwipeSurface(liveOverlay, () => {
      if (!gsPadSwipesOn()) return {};
      if (gsLiveState.phase === "detect") {
        return { left: (at) => gsLiveDetect("left", at), right: (at) => gsLiveDetect("right", at) };
      }
      if (gsLiveState.phase === "arriving") {
        return { tap: (at) => gsLiveArrived(at), up: (at) => gsLiveArrived(at), down: gsLiveNeverCame };
      }
      return {};
    });
  }

  // iPhone: gestures from the native direct-touch area.
  if (gsDirectTouchSupported() && typeof GSNativePlugin.addListener === "function") {
    try { GSNativePlugin.addListener("directTouch", (event) => gsDirectTouchEvent(event)); } catch (error) { /* no native events */ }
  }

  gsCompareSetStartEnabled(true);
  gsCompareRenderScore();
  gsLiveRenderTally();
}

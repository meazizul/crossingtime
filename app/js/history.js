/* ============================================================
 * CrossingTime — attempt history, adaptive margin, and reporting
 * ============================================================
 *
 * Every practice attempt is recorded here so that:
 *   1. the adaptive margin-of-error can shape difficulty over time;
 *   2. the instructor can see progress at a lesson;
 *   3. the student can (opt-in) send a summary to their instructor.
 *
 * Everything stays in localStorage on the student's own device. Nothing is
 * transmitted anywhere unless the student explicitly chooses to share it.
 * ============================================================ */

const GS_HISTORY_KEY = "om-attempt-log";
/* Raised from 800 in build 14 (tracker 12.40): one morning of practice was
 * over 20 entries, and nothing may be dropped without the student knowing.
 * Progress warns as the cap approaches, and says so if entries were removed. */
const GS_HISTORY_LIMIT = 5000;
const GS_HISTORY_WARN_AT = 4500;
const GS_HISTORY_TRIMMED_KEY = "om-history-trimmed";
let gsHistorySaveFailed = false;

/**
 * One attempt.
 * @typedef {Object} GsAttempt
 * @property {number} time        epoch ms
 * @property {string} activity    "practice" | "signal" | "compare" | "live"
 *                                ("measure" appears only in logs from builds
 *                                before 10 Oct 2026)
 * @property {string} street      "half" | "full"
 * @property {number} userSec     what the student produced/judged
 * @property {number} refSec      the reference they were judged against
 * @property {number} diffSec     signed: positive = student was long
 * @property {boolean} correct    within the margin in force at the time
 * @property {number} marginSec   the margin in force at the time
 * @property {string} [answer]    comparison tasks: "longer"|"shorter"|"same",
 *                                or "magnitude" for a "how much" estimate
 * @property {string} [expected]  comparison tasks: the true category
 * @property {boolean} [noisy]    live task, builds before 7 only
 * @property {string} [direction] live task: "left" | "right"
 * @property {string} [sense]     live task: "hearing" | "vision"
 * @property {boolean} [judged]   live task: the student judged it (build 7+)
 * @property {boolean} [never]    live task: the vehicle never came
 * @property {boolean} [skipped]  the student backed out (Skip in builds 11 to
 *                                13, Back from build 14): kept in the log and
 *                                the report as cancelled, never scored
 * @property {string}  [skip]     what was cancelled: "judgment" | "magnitude"
 *                                | "vehicle" (backed out before it passed)
 * @property {Object}  [howMuch]  build 14+: the "how much" estimate that
 *                                followed this judgment, in the same record
 *                                (tracker 12.37): { userSec (tapped), refSec
 *                                (real difference), diffSec, correct,
 *                                marginSec, skipped }. Builds 10 to 13 wrote
 *                                the estimate as a second record with
 *                                answer "magnitude"; those still read.
 */

function gsLoadHistory() {
  try {
    const raw = localStorage.getItem(GS_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function gsSaveHistory(entries) {
  try {
    const trimmed = entries.slice(-GS_HISTORY_LIMIT);
    if (trimmed.length < entries.length) {
      // Never silently (tracker 12.40): Progress and the report say so.
      const dropped = Number(localStorage.getItem(GS_HISTORY_TRIMMED_KEY) || 0) + (entries.length - trimmed.length);
      localStorage.setItem(GS_HISTORY_TRIMMED_KEY, String(dropped));
    }
    localStorage.setItem(GS_HISTORY_KEY, JSON.stringify(trimmed));
    gsHistorySaveFailed = false;
    return true;
  } catch (error) {
    // Storage full or unavailable. Practice must still work, but the student
    // is told (tracker 12.40); gsHistorySaveProblem() reads the flag.
    gsHistorySaveFailed = true;
    if (typeof gsOnHistorySaveFailed === "function") gsOnHistorySaveFailed();
    return false;
  }
}

/** True when the last save failed or entries have ever been dropped. */
function gsHistorySaveProblem() {
  if (gsHistorySaveFailed) return "The last practice could not be saved on this phone. Free some space, or send a report now so nothing is lost.";
  const dropped = Number(localStorage.getItem(GS_HISTORY_TRIMMED_KEY) || 0);
  if (dropped > 0) return `The history is full: the oldest ${dropped} entr${dropped === 1 ? "y was" : "ies were"} removed to make room. Send or export a report to keep a copy.`;
  if (gsLoadHistory().length >= GS_HISTORY_WARN_AT) return `The history is nearly full (${gsLoadHistory().length} of ${GS_HISTORY_LIMIT}). Send or export a report to keep a copy before the oldest entries are removed.`;
  return "";
}

function gsLogAttempt(entry) {
  const entries = gsLoadHistory();
  entries.push({ time: Date.now(), ...entry });
  gsSaveHistory(entries);
  // A cancelled attempt is not an attempt at the skill: it moves no lane.
  if (!entry.skipped) gsUpdateAdaptiveMargin(entry.activity, entry.street, gsIsMagnitude(entry));
  return entries.length;
}

/*
 * The "how much" estimate goes into the record of the judgment it followed,
 * so one try, and one vehicle, is one record and one report line (tracker
 * 12.37). It stays scored apart from the judgment. If no matching judgment
 * is found (it should always be the last record), the estimate is kept as a
 * record of its own, as builds 10 to 13 did.
 */
function gsLogHowMuch({ activity, street, userSec, refSec, diffSec, correct, marginSec, skipped = false, direction, sense }) {
  const entries = gsLoadHistory();
  const last = entries[entries.length - 1];
  const howMuch = { userSec, refSec, diffSec, correct, marginSec, skipped: Boolean(skipped), time: Date.now() };
  const matches = last && last.activity === activity && last.street === street && !last.howMuch && !last.skipped
    && last.answer && last.answer !== "magnitude" && last.answer !== "same" && last.correct === true
    && Date.now() - (last.time || 0) < 5 * 60 * 1000;
  if (matches) {
    last.howMuch = howMuch;
    gsSaveHistory(entries);
  } else {
    entries.push({ time: Date.now(), activity, street, direction, sense, judged: true, userSec, refSec, diffSec, correct, marginSec, answer: "magnitude", expected: "magnitude", ...(skipped ? { skipped: true, skip: "magnitude" } : {}) });
    gsSaveHistory(entries);
  }
  if (!skipped) gsUpdateAdaptiveMargin(activity, street, true);
  return entries.length;
}

/*
 * Every scored unit, one per entry: a record with a "how much" estimate
 * inside it yields two, the judgment and the estimate, the estimate shaped
 * like the separate records of builds 10 to 13. Scores, windows and lanes
 * work on this list; the report and Progress list records.
 */
function gsExpandHistory(records = gsLoadHistory()) {
  const out = [];
  records.forEach((record) => {
    out.push(record);
    const h = record.howMuch;
    if (!h) return;
    out.push({
      time: h.time || record.time,
      activity: record.activity,
      street: record.street,
      direction: record.direction,
      sense: record.sense,
      judged: true,
      userSec: h.userSec,
      refSec: h.refSec,
      diffSec: h.diffSec,
      correct: Boolean(h.correct),
      marginSec: h.marginSec,
      answer: "magnitude",
      expected: "magnitude",
      ...(h.skipped ? { skipped: true, skip: "magnitude" } : {}),
      virtual: true
    });
  });
  return out;
}

function gsClearHistory() {
  try {
    // The adaptive margins go back to the instructor's margin, but the
    // instructor's on/off switch stays as it was set (tracker 20.8).
    const adaptiveOn = gsAdaptiveEnabled();
    localStorage.removeItem(GS_HISTORY_KEY);
    localStorage.removeItem(GS_ADAPTIVE_KEY);
    if (adaptiveOn) gsSaveAdaptive({ ...gsAdaptiveDefaults(), enabled: true });
    localStorage.removeItem(GS_HISTORY_TRIMMED_KEY);
    gsHistorySaveFailed = false;
  } catch (error) {
    /* ignore */
  }
}

/*
 * Two skills are recorded under one activity: judging a sample (longer,
 * shorter, about the same) and tapping out HOW MUCH longer or shorter. They
 * are scored, adapted and reported separately (Cindi, 16 Oct 2026).
 */
function gsIsMagnitude(entry) {
  return entry.answer === "magnitude" || entry.skip === "magnitude";
}

/* Skipped attempts (build 11+) are recorded so the instructor sees them, but
 * they are never right or wrong: out of every score, window and lane. */
function gsIsSkipped(entry) {
  return entry.skipped === true;
}

/**
 * Attempts for an activity and street. `magnitude` narrows to one skill:
 * true = only "how much" estimates, false = only judgments and timings,
 * undefined = both. The filter runs BEFORE the window is cut, so "last 10"
 * means the last ten of that skill.
 */
function gsHistoryFor(activity, street, limit = 0, magnitude) {
  const all = gsExpandHistory().filter(
    (e) => !gsIsSkipped(e)
      && (!activity || e.activity === activity)
      && (!street || e.street === street)
      && (magnitude === undefined || gsIsMagnitude(e) === magnitude)
  );
  return limit > 0 ? all.slice(-limit) : all;
}

function gsAccuracy(entries) {
  if (!entries.length) return null;
  const correct = entries.filter((e) => e.correct).length;
  return correct / entries.length;
}

/* ============================================================
 * ADAPTIVE MARGIN OF ERROR
 * ------------------------------------------------------------
 * Cindi's request, and the maths she asked for help with.
 *
 * The idea is behavioral shaping / zone of proximal development: hold the
 * student just past comfortable, but never so tight that the task becomes
 * impossible and demoralising.
 *
 *   CEILING  the margin the instructor set (default 0.40 s). The task never
 *            gets easier than this — it is the clinical target.
 *   FLOOR    a hard 0.10 s. Below this we would be measuring the student's
 *            reaction time and the touchscreen's latency, not their sense of
 *            duration, so tightening further would teach nothing.
 *   WINDOW   the last 10 attempts of the same activity, skill and street type.
 *
 * STATUS: EXPERIMENTAL, off by default. Cindi's review: there is
 * no research support for the window, the step or the stopping rule, and the
 * first version "pinned the learner down" and tightened too fast. What is
 * kept, per her notes:
 *
 *   - one margin PER TASK, SKILL AND STREET TYPE (a "lane"), never one
 *     overall; reproducing an interval, judging one, and tapping out a
 *     difference are different skills, and a 3 s half street is not an 8 s
 *     full street. "How much" estimates have their own lane
 *     ("compare-howmuch:full"), separate from the longer/shorter judgments;
 *   - tighten slowly (x 0.92 per window) and release quickly: a bad window
 *     goes straight back to the instructor's margin, not to a pinned level;
 *   - there is no learner floor any more; nothing holds a student down.
 *
 * Rules, evaluated after each attempt once the window is full:
 *
 *   accuracy >= 80%   tighten:  margin x 0.92, never below the hard floor
 *   accuracy <  60%   release:  margin = the instructor's margin (ceiling)
 *   60-80%            hold
 * ============================================================ */

const GS_ADAPTIVE_KEY = "om-adaptive-margin";
const GS_ADAPTIVE = {
  windowSize: 10,
  tightenAt: 0.8,
  loosenBelow: 0.6,
  factor: 0.92,
  hardFloor: 0.1
};

/* Activities whose attempts can move an adaptive lane. */
const GS_ADAPTIVE_ACTIVITIES = ["practice", "signal", "compare"];

function gsAdaptiveDefaults() {
  return {
    enabled: false,
    // per "activity:street" key
    lanes: {}
  };
}

function gsLoadAdaptive() {
  try {
    const raw = localStorage.getItem(GS_ADAPTIVE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return gsAdaptiveDefaults();
    return { ...gsAdaptiveDefaults(), ...parsed, lanes: parsed.lanes || {} };
  } catch (error) {
    return gsAdaptiveDefaults();
  }
}

function gsSaveAdaptive(state) {
  try {
    localStorage.setItem(GS_ADAPTIVE_KEY, JSON.stringify(state));
  } catch (error) {
    /* ignore */
  }
}

function gsAdaptiveEnabled() {
  return gsLoadAdaptive().enabled === true;
}

function gsSetAdaptiveEnabled(on) {
  const state = gsLoadAdaptive();
  state.enabled = Boolean(on);
  gsSaveAdaptive(state);
}

function gsLaneKey(activity, street, magnitude = false) {
  return `${activity || "practice"}${magnitude ? "-howmuch" : ""}:${street || "full"}`;
}

function gsCeilingMargin() {
  // The instructor-set margin is always the ceiling.
  const value = Number(typeof marginInput !== "undefined" ? marginInput.value : 0.4);
  return Number.isFinite(value) && value > 0 ? value : 0.4;
}

function gsLane(state, activity, street, magnitude = false) {
  const key = gsLaneKey(activity, street, magnitude);
  if (!state.lanes[key]) {
    state.lanes[key] = {
      margin: gsCeilingMargin(),
      attemptsSinceStep: 0
    };
  }
  if (!Number.isFinite(state.lanes[key].attemptsSinceStep)) state.lanes[key].attemptsSinceStep = 0;
  return state.lanes[key];
}

/**
 * The margin actually in force right now for a given activity/street, and
 * skill (`magnitude` true = the "how much" lane).
 * Falls back to the instructor's fixed margin when adaptive mode is off.
 */
function gsEffectiveMargin(activity, street, magnitude = false) {
  const ceiling = gsCeilingMargin();
  const state = gsLoadAdaptive();
  if (!state.enabled) return ceiling;
  const lane = gsLane(state, activity, street, magnitude);
  // The ceiling can be edited at any time; never let a stored value exceed it.
  const margin = Number.isFinite(lane.margin) ? lane.margin : ceiling;
  return Math.min(ceiling, Math.max(GS_ADAPTIVE.hardFloor, margin));
}

/**
 * Pure step function, separated so it can be unit-tested without storage.
 * Returns the new margin for a lane given the window accuracy.
 */
function gsAdaptiveStep(currentMargin, accuracy, ceiling) {
  const bounded = Math.min(ceiling, Math.max(GS_ADAPTIVE.hardFloor, currentMargin));
  if (accuracy >= GS_ADAPTIVE.tightenAt) {
    return Math.max(GS_ADAPTIVE.hardFloor, bounded * GS_ADAPTIVE.factor);
  }
  if (accuracy < GS_ADAPTIVE.loosenBelow) {
    return ceiling;
  }
  return bounded;
}

/**
 * Re-evaluate the lane after an attempt. Safe to call unconditionally.
 */
function gsUpdateAdaptiveMargin(activity, street, magnitude = false) {
  const state = gsLoadAdaptive();
  if (!state.enabled) return;
  if (!GS_ADAPTIVE_ACTIVITIES.includes(activity)) return;

  const lane = gsLane(state, activity, street, magnitude);

  // Evaluate in blocks of `windowSize` attempts, never a sliding window. The
  // first version re-evaluated after every attempt once ten existed, so a
  // student doing well was tightened on attempt 11, 12, 13… — the "reducing
  // too quickly" Cindi saw. Now a lane moves at most once per ten attempts.
  lane.attemptsSinceStep += 1;
  if (lane.attemptsSinceStep < GS_ADAPTIVE.windowSize) {
    gsSaveAdaptive(state);
    return;
  }
  // Only this lane's own skill counts: a student who tells longer from
  // shorter but cannot yet tap out the difference is not mixed into one score.
  const block = gsHistoryFor(activity, street, GS_ADAPTIVE.windowSize, magnitude);
  lane.margin = gsAdaptiveStep(lane.margin, gsAccuracy(block), gsCeilingMargin());
  lane.attemptsSinceStep = 0;
  gsSaveAdaptive(state);
}

/** Instructor action: forget every lane and start again from the set margin. */
function gsResetAdaptiveLanes() {
  const state = gsLoadAdaptive();
  state.lanes = {};
  gsSaveAdaptive(state);
}

/* ============================================================
 * PROGRESS SUMMARY + INSTRUCTOR REPORT
 * ============================================================ */

const GS_ACTIVITY_LABELS = {
  practice: "Practice my timing",
  signal: "Comparison preparation",
  compare: "Comparison practice",
  live: "At the street",
  measure: "Crossing measured" // legacy entries from builds before 10 Oct 2026
};

const GS_STREET_LABELS = { half: "First half", full: "Full street" };

const GS_LANE_LABELS = {
  "practice:half": "Practice my timing, first half",
  "practice:full": "Practice my timing, full street",
  "signal:half": "Comparison preparation, first half",
  "signal:full": "Comparison preparation, full street",
  "compare:half": "Comparison practice, first half",
  "compare:full": "Comparison practice, full street",
  "compare-howmuch:half": "Comparison practice, how much, first half",
  "compare-howmuch:full": "Comparison practice, how much, full street"
};

function gsLaneLabel(key) {
  return GS_LANE_LABELS[key] || key;
}

/*
 * Which entries count towards a score. At the street, only vehicles the
 * student judged (build 7 and later) are right or wrong; vehicles that never
 * came, unjudged vehicles, and entries from earlier builds (where "correct"
 * meant "gave enough warning") are kept in the log but not scored.
 */
function gsIsScored(entry) {
  if (gsIsSkipped(entry)) return false;
  if (entry.activity !== "live") return true;
  return entry.judged === true && !entry.never;
}

/* Skipped attempts per activity, for the "N skipped" notes. A skipped answer
 * and a skipped "how much" estimate are different skills, as their scores
 * are, so they are counted apart. */
function gsSkippedCounts() {
  const counts = {};
  gsExpandHistory().forEach((entry) => {
    if (!gsIsSkipped(entry)) return;
    const c = counts[entry.activity] || (counts[entry.activity] = { judgment: 0, magnitude: 0 });
    c[entry.skip === "magnitude" ? "magnitude" : "judgment"] += 1;
  });
  return counts;
}

/*
 * One vehicle (or one sample) is one attempt. A "how much" estimate that
 * follows a correct judgment is a second entry in the log, but it is the same
 * encounter, so it is counted on its own line (howMuchTotal / howMuchCorrect)
 * and never added to `total` or `correct`.
 */
function gsSummary() {
  const all = gsExpandHistory().filter(gsIsScored);
  const byActivity = {};
  let encounters = 0;
  all.forEach((entry) => {
    const key = entry.activity;
    if (!byActivity[key]) byActivity[key] = { total: 0, correct: 0, howMuchTotal: 0, howMuchCorrect: 0, last: 0 };
    const stats = byActivity[key];
    if (gsIsMagnitude(entry)) {
      stats.howMuchTotal += 1;
      if (entry.correct) stats.howMuchCorrect += 1;
    } else {
      encounters += 1;
      stats.total += 1;
      if (entry.correct) stats.correct += 1;
    }
    stats.last = Math.max(stats.last, entry.time || 0);
  });

  // The phone's own date, not UTC: an evening's practice in New York is one
  // day, not two (Cindi, 16 Oct 2026). Every entry counts as practice, scored
  // or not: a day spent timing vehicles with judging off is a day practiced.
  const everything = gsExpandHistory();
  const days = new Set(everything.map((entry) => gsLocalDay(entry.time)));

  const blank = () => ({ total: 0, correct: 0, howMuchTotal: 0, howMuchCorrect: 0, last: 0 });
  const skipped = gsSkippedCounts();
  Object.entries(skipped).forEach(([key, n]) => {
    if (!byActivity[key]) byActivity[key] = blank();
    byActivity[key].skipped = n.judgment;
    byActivity[key].skippedHowMuch = n.magnitude;
  });
  // Kept but never right or wrong: vehicles that never came, street practice
  // with judging off, and records from builds before 7.
  everything.forEach((entry) => {
    if (gsIsScored(entry) || gsIsSkipped(entry)) return;
    if (!byActivity[entry.activity]) byActivity[entry.activity] = blank();
    byActivity[entry.activity].unscored = (byActivity[entry.activity].unscored || 0) + 1;
  });

  return {
    total: encounters,
    daysPracticed: days.size,
    firstAt: everything.length ? everything[0].time : null,
    lastAt: everything.length ? everything[everything.length - 1].time : null,
    byActivity
  };
}

function gsLocalDay(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function gsFormatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/* "first half" / "full street", for the middle of a sentence. */
const GS_STREET_PHRASES = { half: "first half", full: "full street" };

function gsSec(value) {
  return `${Number(value || 0).toFixed(2)} s`;
}

function gsWhen(ms) {
  const d = new Date(ms);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

/* "0.58 s shorter" / "0.31 s late" / "1.21 s over": the size and the direction of a difference. */
function gsDiffPhrase(diffSec, [positive, negative], same = "the same") {
  const d = Number(diffSec || 0);
  if (Math.abs(d) < 0.005) return same;
  return `${Math.abs(d).toFixed(2)} s ${d > 0 ? positive : negative}`;
}

/*
 * The records as the report lists them: one per try or vehicle. A "how much"
 * estimate written as a record of its own by builds 10 to 13 is folded into
 * the judgment just before it, when the two can be paired (same activity and
 * street, a correct longer/shorter judgment without an estimate, within five
 * minutes); otherwise it stays a line of its own.
 */
function gsReportRecords(records = gsLoadHistory()) {
  const out = [];
  records.forEach((record) => {
    const prev = out[out.length - 1];
    const isLegacyEstimate = record.answer === "magnitude" && !record.virtual;
    const pairable = prev && isLegacyEstimate && prev.activity === record.activity && prev.street === record.street
      && !prev.howMuch && !prev.skipped && prev.answer && prev.answer !== "magnitude" && prev.answer !== "same" && prev.correct === true
      && (record.time || 0) - (prev.time || 0) < 5 * 60 * 1000;
    if (pairable) {
      out[out.length - 1] = { ...prev, howMuch: { userSec: record.userSec, refSec: record.refSec, diffSec: record.diffSec, correct: record.correct, marginSec: record.marginSec, skipped: Boolean(record.skipped), time: record.time } };
      return;
    }
    out.push(record);
  });
  return out;
}

/* The "how much" part of a report line. */
function gsHowMuchPhrase(h) {
  if (!h) return "";
  if (h.skipped) return "; how much: estimate cancelled (not scored)";
  const off = gsDiffPhrase(h.diffSec, ["over", "under"], "exact");
  return `; how much: tapped ${gsSec(h.userSec)}, real difference ${gsSec(h.refSec)} (${off}), margin ${gsSec(h.marginSec)} — ${h.correct ? "within margin" : "outside margin"}`;
}

/* One report line for one record (tracker 12.36, F2): the times it was judged on, labelled. */
function gsReportLine(entry) {
  const label = GS_ACTIVITY_LABELS[entry.activity] || entry.activity;
  const street = GS_STREET_PHRASES[entry.street] || entry.street || "";
  const when = gsWhen(entry.time);
  if (entry.activity === "measure") {
    return `${when}  ${label} (${street}): ${gsSec(entry.userSec)}`;
  }
  if (entry.activity === "practice") {
    const mark = entry.street === "half" ? "halfway" : "finish";
    const verdict = entry.correct ? "within margin" : "outside margin";
    return `${when}  ${label} (${street}): ${mark} at ${gsSec(entry.userSec)}, real ${gsSec(entry.refSec)} (${gsDiffPhrase(entry.diffSec, ["late", "early"], "exact")}), margin ${gsSec(entry.marginSec)} — ${verdict}`;
  }
  if (entry.activity === "signal") {
    const verdict = entry.correct ? "within margin" : "outside margin";
    return `${when}  ${label} (${street}): stopped at ${gsSec(entry.userSec)}, crossing ${gsSec(entry.refSec)} (${gsDiffPhrase(entry.diffSec, ["late", "early"], "exact")}), margin ${gsSec(entry.marginSec)} — ${verdict}`;
  }
  // Comparison practice and At the street: the same vocabulary.
  const context = entry.activity === "live"
    ? [street, entry.direction ? `from the ${entry.direction}` : "", entry.sense ? `by ${entry.sense}` : ""].filter(Boolean).join(", ")
    : street;
  const where = `${label} (${context})`;
  const timeWord = entry.activity === "live" ? "warning time" : "sample";
  if (entry.answer === "magnitude" && !entry.howMuch) {
    // An estimate on its own (builds 10 to 13, or one that could not be paired).
    if (entry.skipped) return `${when}  ${where}, how much: estimate cancelled (not scored)`;
    const off = gsDiffPhrase(entry.diffSec, ["over", "under"], "exact");
    return `${when}  ${where}, how much: tapped ${gsSec(entry.userSec)}, real difference ${gsSec(entry.refSec)} (${off}), margin ${gsSec(entry.marginSec)} — ${entry.correct ? "within margin" : "outside margin"}`;
  }
  if (entry.never) return `${when}  ${where}: vehicle never came`;
  if (entry.skipped && entry.skip === "vehicle") return `${when}  ${where}: cancelled before it passed (not scored)`;
  const compared = `${timeWord} ${gsSec(entry.userSec)}, crossing ${gsSec(entry.refSec)} (${gsDiffPhrase(entry.diffSec, ["longer", "shorter"], "the same")})`;
  if (entry.skipped) return `${when}  ${where}: ${compared} — cancelled (not scored)`;
  if (entry.activity === "live" && entry.judged === false) return `${when}  ${where}: ${compared} (not judged)`;
  if (entry.activity === "live" && entry.judged === undefined && !entry.howMuch) {
    // Builds before 7 recorded the comparison without a judgment. Only the
    // comparison is reported: the app never says whether a warning time was
    // enough to cross on. That is the instructor's call.
    const noisy = entry.noisy ? " [not quiet when started]" : "";
    return `${when}  ${where}: ${compared}${noisy}`;
  }
  const mark = entry.correct ? "correct" : "incorrect";
  return `${when}  ${where}: ${compared}, margin ${gsSec(entry.marginSec)}; answered "${entry.answer}", it was "${entry.expected}" — ${mark}${gsHowMuchPhrase(entry.howMuch)}`;
}

/* The crossing times and margin in force when the report is made. */
function gsReportHeaderTimes() {
  try {
    const times = typeof getTimingInputs === "function" ? getTimingInputs() : null;
    const margin = typeof getMargin === "function" ? getMargin() : NaN;
    if (!times || !(times.fullTime > 0) || !(times.clearTime > 0)) return "";
    return `Crossing times: full street ${gsSec(times.fullTime)}, first half ${gsSec(times.clearTime)}.${Number.isFinite(margin) && margin > 0 ? ` Margin ${gsSec(margin)}.` : ""}`;
  } catch (error) {
    return "";
  }
}

/**
 * Plain-text report for the instructor. Deliberately readable in any email
 * client, with no attachment and no tracking. It may show the numbers (Cindi,
 * Oct 18 2026); the app still never gives feedback in numbers during practice.
 */
function gsBuildReport(options = {}) {
  const summary = gsSummary();
  const lines = [];
  lines.push("CrossingTime — practice report");
  lines.push("=".repeat(34));
  // A short code, never a name: the report travels by plain email.
  if (options.clientCode) lines.push(`Student code: ${options.clientCode}`);
  if (options.started) lines.push(`Date started: ${options.started}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  const header = gsReportHeaderTimes();
  if (header) lines.push(header);
  lines.push("");

  // Entries that are kept but not scored (a vehicle that never came, a
  // warning time recorded with judging off, records from older builds) still
  // belong in the report, so only an empty log means nothing to report.
  if (!gsLoadHistory().length) {
    lines.push("No practice recorded yet.");
    return lines.join("\n");
  }

  lines.push(`Total attempts: ${summary.total}`);
  lines.push(`Days practiced: ${summary.daysPracticed}`);
  lines.push(`First: ${gsFormatDate(summary.firstAt)}`);
  lines.push(`Most recent: ${gsFormatDate(summary.lastAt)}`);
  const problem = gsHistorySaveProblem();
  if (problem) lines.push(`Note: ${problem}`);
  lines.push("");

  lines.push("By activity");
  lines.push("-".repeat(34));
  Object.entries(summary.byActivity).forEach(([activity, stats]) => {
    const label = GS_ACTIVITY_LABELS[activity] || activity;
    if (activity === "measure") {
      lines.push(`${label}: ${stats.total} measurement(s)`);
      return;
    }
    if (stats.total) {
      const pct = Math.round((stats.correct / stats.total) * 100);
      const noun = activity === "practice" || activity === "signal" ? "within margin" : "correct";
      lines.push(`${label}: ${stats.correct}/${stats.total} ${noun} (${pct}%)`);
    }
    if (stats.howMuchTotal) {
      // The same vehicles or samples, a different skill: reported on its own
      // line so the two are never added together.
      const pct = Math.round((stats.howMuchCorrect / stats.howMuchTotal) * 100);
      lines.push(`${label}, how much: ${stats.howMuchCorrect}/${stats.howMuchTotal} within margin (${pct}%)`);
    }
    if (stats.skipped) {
      // Shown, never counted as right or wrong (Cindi's decision, 16 Oct 2026).
      lines.push(`${label}: ${stats.skipped} cancelled`);
    }
    if (stats.skippedHowMuch) {
      lines.push(`${label}, how much: ${stats.skippedHowMuch} cancelled`);
    }
    if (stats.unscored) {
      lines.push(`${label}: ${stats.unscored} not scored (never came, or not judged)`);
    }
  });
  lines.push("");

  // Recent tries, most recent last — useful at a lesson. One line per try or
  // vehicle, with its "how much" on the same line (tracker 12.37).
  const recent = gsReportRecords().slice(-15);
  lines.push("Most recent attempts");
  lines.push("-".repeat(34));
  recent.forEach((entry) => lines.push(gsReportLine(entry)));

  const adaptive = gsLoadAdaptive();
  if (adaptive.enabled) {
    lines.push("");
    lines.push("Adaptive margin (experimental, current per task)");
    lines.push("-".repeat(34));
    Object.entries(adaptive.lanes).forEach(([key, lane]) => {
      lines.push(`${gsLaneLabel(key)}: ${Number(lane.margin).toFixed(2)}s (set margin ${gsCeilingMargin().toFixed(2)}s)`);
    });
  }

  lines.push("");
  lines.push("Sent by the student from CrossingTime. No data leaves the device unless sent.");
  return lines.join("\n");
}

/* ============================================================
 * CSV for Excel, Numbers or Google Sheets (tracker F3)
 * ------------------------------------------------------------
 * One row per try or vehicle, one value per column, comma-separated with
 * quoted fields, so it imports without hand editing. The columns are the
 * ones the instructor asked for, in her order.
 * ============================================================ */

const GS_CSV_COLUMNS = [
  "date", "time", "student code", "build", "activity", "street", "direction", "hearing or vision",
  "sample or warning time (s)", "crossing time (s)", "difference (s)", "margin (s)",
  "answer", "correct answer", "result",
  "how much tapped (s)", "how much real difference (s)", "how much off by (s)", "how much result",
  "cancelled or skipped"
];

function gsCsvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function gsCsvNumber(value) {
  return Number.isFinite(Number(value)) && value !== null && value !== undefined && value !== "" ? Number(value).toFixed(2) : "";
}

function gsCsvRow(entry, { clientCode = "", build = "" } = {}) {
  const d = new Date(entry.time || 0);
  const label = GS_ACTIVITY_LABELS[entry.activity] || entry.activity;
  const street = GS_STREET_PHRASES[entry.street] || entry.street || "";
  const timing = entry.activity === "practice" || entry.activity === "signal";
  const legacyEstimate = entry.answer === "magnitude" && !entry.howMuch;
  let result = "";
  let cancelled = "";
  if (entry.never) result = "never came";
  else if (entry.skipped && entry.skip === "vehicle") { result = "cancelled"; cancelled = "cancelled vehicle"; }
  else if (entry.skipped && legacyEstimate) { result = "cancelled"; cancelled = "cancelled estimate"; }
  else if (entry.skipped) { result = "cancelled"; cancelled = "cancelled judgment"; }
  else if (entry.activity === "live" && entry.judged === false) result = "not judged";
  else if (timing || legacyEstimate) result = entry.correct ? "within margin" : "outside margin";
  else if (entry.answer) result = entry.correct ? "correct" : "incorrect";
  const h = entry.howMuch;
  if (h?.skipped) cancelled = cancelled ? `${cancelled}; cancelled estimate` : "cancelled estimate";
  const main = legacyEstimate
    ? ["", "", "", gsCsvNumber(entry.marginSec), "", "", result]
    : [
      entry.never || (entry.skipped && entry.skip === "vehicle") ? "" : gsCsvNumber(entry.userSec),
      gsCsvNumber(entry.refSec),
      entry.never || (entry.skipped && entry.skip === "vehicle") ? "" : gsCsvNumber(entry.diffSec),
      gsCsvNumber(entry.marginSec),
      timing ? "" : (entry.answer || ""),
      timing ? "" : (entry.expected || ""),
      result
    ];
  const howMuch = legacyEstimate
    ? [entry.skipped ? "" : gsCsvNumber(entry.userSec), entry.skipped ? "" : gsCsvNumber(entry.refSec), entry.skipped ? "" : gsCsvNumber(entry.diffSec), entry.skipped ? "cancelled" : (entry.correct ? "within margin" : "outside margin")]
    : h
      ? [h.skipped ? "" : gsCsvNumber(h.userSec), h.skipped ? "" : gsCsvNumber(h.refSec), h.skipped ? "" : gsCsvNumber(h.diffSec), h.skipped ? "cancelled" : (h.correct ? "within margin" : "outside margin")]
      : ["", "", "", ""];
  return [
    gsCsvDate(d), gsCsvTime(d),
    clientCode, build, label, street, entry.direction || "", entry.sense || "",
    ...main, ...howMuch, cancelled
  ].map(gsCsvCell).join(",");
}

/* The CSV's date and time are the same on every phone, whatever its
 * language: YYYY-MM-DD and 24-hour HH:MM:SS, on the phone's own clock, so
 * Excel reads them as dates and times and files from several testers match
 * (tracker 20.14). The readable report keeps the phone's own formats. */
function gsCsvDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function gsCsvTime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** The whole history as CSV text, newest last. */
function gsBuildCsv(options = {}) {
  const build = options.build || (typeof GS_APP_BUILD !== "undefined" ? GS_APP_BUILD : "");
  const rows = gsReportRecords().map((entry) => gsCsvRow(entry, { clientCode: options.clientCode || "", build }));
  return [GS_CSV_COLUMNS.map(gsCsvCell).join(","), ...rows].join("\r\n") + "\r\n";
}

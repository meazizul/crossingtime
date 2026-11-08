/* ============================================================
 * CrossingTime — Instructor setup: what the student sees and can change
 * ============================================================
 *
 * Cindi: the instructor should be able to choose which
 * activities and options a student has, as on / off / optional, "based on
 * their knowledge of the student", and send it all to the student's phone in
 * the setup link.
 *
 * Three kinds of setting:
 *
 *   activities      which of the four activities appear on Home
 *   practiceModes   which Practice my timing modes can be chosen
 *   options         one value each. For a yes/no feature the value is
 *                   "on" (always on, no switch shown to the student),
 *                   "off" (hidden), or "choose" (the student gets a switch).
 *                   A feature with several styles (the sound) takes the
 *                   style itself, or "choose".
 *
 * Stored in localStorage under om-features. A link from the instructor
 * replaces it wholesale.
 * ============================================================ */

const GS_FEATURES_KEY = "om-features";

/*
 * "About the same" in Comparison practice and At the street (tracker 20.16).
 * Design (Cindi, Nov 7 2026): the range is proportional to the crossing time,
 * Weber's law, so short crossings get narrow ranges and long ones wide ranges:
 * a sample is "about the same" when it is within k x the crossing time. The
 * group (Cindi, Dona, Jolene and the Stevens team) is still choosing k; Cindi
 * suggested 0.10 to 0.12. Until then the instructor picks it here, 12 per cent
 * by default. The list is also the link format (engine.js): add values only at
 * the end, never reorder.
 */
const GS_SAME_RANGE_PERCENTS = ["12", "8", "10", "11", "13", "14", "15", "20", "25"];

const GS_FEATURE_DEFAULTS = Object.freeze({
  activities: { practice: true, signal: true, compare: true, live: true },
  practiceModes: { "2b": true, "2": true, "3": true },
  options: {
    prepSound: "choose",          // continuous | beep | choose
    compareSound: "choose",       // continuous | ticks | choose
    compareSwipe: "on",           // on | off
    compareRandomPause: "choose", // on | off | choose
    compareHowMuch: "choose",     // on | off | choose
    magnitudeReplay: "a",         // a | b
    liveSense: "choose",          // hearing | vision | choose
    liveJudge: "on",              // on | off | choose
    liveHowMuch: "choose",        // on | off | choose
    liveReplay: "always",         // always | errors | never | choose
    liveConfirm: "sound",         // sound | vibration  (confirmation of a street gesture)
    playAgain: "choose",          // on | off | choose  ("Play it again" after a replay, F1)
    trafficSide: "right",         // right | left: the side of the road vehicles drive on (20.13)
    sameRange: "12"               // "about the same" range, percent of the crossing time (20.16)
  }
});

/* The legal values of every option, so a stored or linked value can be checked. */
const GS_FEATURE_VALUES = {
  prepSound: ["continuous", "beep", "choose"],
  compareSound: ["continuous", "ticks", "choose"],
  compareSwipe: ["on", "off"],
  compareRandomPause: ["on", "off", "choose"],
  compareHowMuch: ["on", "off", "choose"],
  magnitudeReplay: ["a", "b"],
  liveSense: ["hearing", "vision", "choose"],
  liveJudge: ["on", "off", "choose"],
  liveHowMuch: ["on", "off", "choose"],
  liveReplay: ["always", "errors", "never", "choose"],
  liveConfirm: ["sound", "vibration"],
  playAgain: ["on", "off", "choose"],
  trafficSide: ["right", "left"],
  sameRange: GS_SAME_RANGE_PERCENTS
};

const GS_ACTIVITY_IDS = ["practice", "signal", "compare", "live"];
const GS_MODE_IDS = ["2b", "2", "3"];

function gsCloneFeatureDefaults() {
  return JSON.parse(JSON.stringify(GS_FEATURE_DEFAULTS));
}

/**
 * Clean any object into a valid feature set: unknown keys dropped, bad values
 * replaced by the default, and at least one practice mode always left on.
 */
function gsNormalizeFeatures(raw) {
  const clean = gsCloneFeatureDefaults();
  if (!raw || typeof raw !== "object") return clean;
  GS_ACTIVITY_IDS.forEach((id) => {
    if (typeof raw.activities?.[id] === "boolean") clean.activities[id] = raw.activities[id];
  });
  GS_MODE_IDS.forEach((id) => {
    if (typeof raw.practiceModes?.[id] === "boolean") clean.practiceModes[id] = raw.practiceModes[id];
  });
  if (!GS_MODE_IDS.some((id) => clean.practiceModes[id])) clean.practiceModes["2b"] = true;
  Object.keys(GS_FEATURE_VALUES).forEach((key) => {
    const value = raw.options?.[key];
    if (GS_FEATURE_VALUES[key].includes(value)) clean.options[key] = value;
  });
  return clean;
}

function gsLoadFeatures() {
  try {
    const raw = localStorage.getItem(GS_FEATURES_KEY);
    return gsNormalizeFeatures(raw ? JSON.parse(raw) : null);
  } catch (error) {
    return gsCloneFeatureDefaults();
  }
}

function gsSaveFeatures(features) {
  try {
    localStorage.setItem(GS_FEATURES_KEY, JSON.stringify(gsNormalizeFeatures(features)));
  } catch (error) {
    /* storage unavailable: the defaults still apply */
  }
}

function gsFeature(key) {
  return gsLoadFeatures().options[key];
}

/* k for the "about the same" range, as a fraction (0.12 for 12 per cent). */
function gsSameRangeK() {
  const percent = Number(gsFeature("sameRange"));
  return Number.isFinite(percent) && percent > 0 ? percent / 100 : 0.12;
}

function gsActivityEnabled(id) {
  return gsLoadFeatures().activities[id] !== false;
}

function gsModeEnabled(id) {
  return gsLoadFeatures().practiceModes[id] !== false;
}

/**
 * Is a yes/no feature in force right now? "on" and "off" are the
 * instructor's word; "choose" defers to the student's own switch.
 */
function gsFeatureActive(key, studentInputId) {
  const value = gsFeature(key);
  if (value === "on") return true;
  if (value === "off") return false;
  return Boolean(document.getElementById(studentInputId)?.checked);
}

/**
 * The style in force for a multi-style feature. With "choose" the student's
 * radio group (named `radioName`) decides.
 */
function gsFeatureStyle(key, radioName, fallback) {
  const value = gsFeature(key);
  if (value !== "choose") return value;
  const checked = document.querySelector(`input[name='${radioName}']:checked`);
  return checked ? checked.value : fallback;
}

/* Wording shown to the student when the instructor has fixed an option. */
const GS_FEATURE_FIXED_TEXT = {
  prepSound: { continuous: "Your instructor set a steady sound.", beep: "Your instructor set one short beep." },
  compareSound: { continuous: "Your instructor set one steady sound.", ticks: "Your instructor set two beeps." },
  liveSense: { hearing: "Your instructor set this to hearing.", vision: "Your instructor set this to vision." },
  liveJudge: { on: "", off: "Your instructor turned off judging after each vehicle." },
  liveReplay: {
    always: "",
    errors: "Your instructor set replays to play only after a wrong answer.",
    never: "Your instructor turned replays off."
  },
  playAgain: { on: "", off: "" }
};

/*
 * "Play it again" (Cindi, Oct 18 2026; tracker F1): after a replay in the
 * three comparison activities the student can hear that same replay again,
 * as often as they like, before moving on. An instructor option (on, off, or
 * the student chooses); with "choose", the student's own switch decides. Never
 * recorded or scored.
 */
function gsPlayAgainEnabled() {
  const value = gsFeature("playAgain");
  if (value === "on") return true;
  if (value === "off") return false;
  return localStorage.getItem("om-playAgain") !== "false";
}

/**
 * Show or hide every student-side control to match the instructor's choices.
 * Elements marked data-feature-choice="key" appear only when the value is
 * "choose"; data-feature-fixed="key" carries a short note when it is fixed.
 */
function gsApplyFeatureVisibility() {
  const features = gsLoadFeatures();
  document.querySelectorAll("[data-feature-choice]").forEach((el) => {
    el.hidden = features.options[el.dataset.featureChoice] !== "choose";
  });
  document.querySelectorAll("[data-feature-fixed]").forEach((el) => {
    const key = el.dataset.featureFixed;
    const value = features.options[key];
    const text = value === "choose" ? "" : (GS_FEATURE_FIXED_TEXT[key]?.[value] || "");
    el.textContent = text;
    el.hidden = !text;
  });

  // Practice modes: hide the ones the instructor turned off, and move the
  // selection to an allowed mode if the current one is gone.
  GS_MODE_IDS.forEach((id) => {
    const label = document.querySelector(`[data-mode-option="${id}"]`);
    if (label) label.hidden = !features.practiceModes[id];
  });
  const current = document.querySelector("input[name='mode']:checked");
  if (current && !features.practiceModes[current.value]) {
    const first = GS_MODE_IDS.find((id) => features.practiceModes[id]);
    const input = document.querySelector(`input[name='mode'][value='${first}']`);
    if (input) {
      input.checked = true;
      input.dispatchEvent(new Event("change"));
    }
  }
}

/*
 * Which side of the street is the first half (Cindi, 4 Nov 2026; tracker
 * 20.13). Where vehicles drive on the right, the near lane's traffic comes
 * from the left, so a vehicle from the left is compared with the first half
 * and one from the right with the full street. Where they drive on the left
 * (the UK, Australia, Japan…) it is the other way round. One setting in
 * Instructor setup; nothing for one-way streets (Cindi).
 */
function gsNearSide() {
  return gsFeature("trafficSide") === "left" ? "right" : "left";
}

function gsFarSide() {
  return gsNearSide() === "left" ? "right" : "left";
}

/* "half" for a vehicle from the near side, "full" from the far side. */
function gsStreetForDirection(direction) {
  return direction === gsNearSide() ? "half" : "full";
}

/* Every "from the left / right" in the screens follows the setting. */
function gsApplyTrafficSide() {
  const near = gsNearSide();
  const far = gsFarSide();
  document.querySelectorAll("[data-near-side]").forEach((el) => { el.textContent = near; });
  document.querySelectorAll("[data-far-side]").forEach((el) => { el.textContent = far; });
}

/* ---------------- Instructor screen ---------------- */

function gsRenderInstructorFeatures() {
  const features = gsLoadFeatures();
  document.querySelectorAll("[data-feature-activity]").forEach((box) => {
    box.checked = features.activities[box.dataset.featureActivity] !== false;
  });
  document.querySelectorAll("[data-feature-mode]").forEach((box) => {
    box.checked = features.practiceModes[box.dataset.featureMode] !== false;
  });
  document.querySelectorAll("select[data-feature]").forEach((select) => {
    select.value = features.options[select.dataset.feature];
  });
}

function gsBindInstructorFeatures() {
  document.querySelectorAll("[data-feature-activity]").forEach((box) => {
    box.addEventListener("change", () => {
      const features = gsLoadFeatures();
      features.activities[box.dataset.featureActivity] = box.checked;
      gsSaveFeatures(features);
      gsFeaturesChanged();
    });
  });
  document.querySelectorAll("[data-feature-mode]").forEach((box) => {
    box.addEventListener("change", () => {
      const features = gsLoadFeatures();
      features.practiceModes[box.dataset.featureMode] = box.checked;
      if (!GS_MODE_IDS.some((id) => features.practiceModes[id])) {
        // At least one mode must stay; undo and say why.
        box.checked = true;
        features.practiceModes[box.dataset.featureMode] = true;
        announceScreenReader("At least one practice mode must stay on.");
      }
      gsSaveFeatures(features);
      gsFeaturesChanged();
    });
  });
  document.querySelectorAll("select[data-feature]").forEach((select) => {
    select.addEventListener("change", () => {
      const features = gsLoadFeatures();
      features.options[select.dataset.feature] = select.value;
      gsSaveFeatures(features);
      gsFeaturesChanged();
    });
  });
}

function gsFeaturesChanged() {
  gsRenderInstructorFeatures();
  gsApplyFeatureVisibility();
  gsApplyTrafficSide();
  if (typeof gsRenderHome === "function") gsRenderHome();
}

/* ---------------- Instructor code (optional lock) ----------------
 * Not security: it keeps a student from changing the setup by accident or
 * curiosity. Stored as a short hash so it is not readable at a glance. */

const GS_PIN_KEY = "om-instructor-pin";
let gsInstructorUnlocked = false;

function gsHashPin(pin) {
  return typeof computeShareChecksum === "function" ? computeShareChecksum(`pin:${pin}`) : pin;
}

function gsPinIsSet() {
  return Boolean(localStorage.getItem(GS_PIN_KEY));
}

/* The stored hash, for a setup link that should lock the student's phone. */
function gsPinHash() {
  return localStorage.getItem(GS_PIN_KEY) || "";
}

/* A setup link carried the instructor's code: lock now. */
function gsInstructorLockNow() {
  gsInstructorUnlocked = false;
  if (document.getElementById("instructorLockedCard")) gsRenderInstructorLock();
}

function gsRenderInstructorLock() {
  const locked = gsPinIsSet() && !gsInstructorUnlocked;
  const card = document.getElementById("instructorLockedCard");
  const body = document.getElementById("instructorBody");
  if (card) card.hidden = !locked;
  if (body) body.hidden = locked;
  const lockNow = document.getElementById("instructorLockNowBtn");
  if (lockNow) lockNow.hidden = !gsPinIsSet();
}

function gsBindInstructorLock() {
  document.getElementById("instructorUnlockBtn")?.addEventListener("click", () => {
    const entry = document.getElementById("instructorPinEntry");
    const note = document.getElementById("instructorLockNote");
    const value = (entry?.value || "").trim();
    if (value && gsHashPin(value) === localStorage.getItem(GS_PIN_KEY)) {
      gsInstructorUnlocked = true;
      if (entry) entry.value = "";
      if (note) note.textContent = "";
      gsRenderInstructorLock();
      announceScreenReader("Unlocked.");
      document.getElementById("clearTime")?.focus();
      return;
    }
    if (note) note.textContent = "That code is not right.";
    announceScreenReader("That code is not right.");
  });

  document.getElementById("instructorPinSaveBtn")?.addEventListener("click", () => {
    const input = document.getElementById("instructorPinSet");
    const value = (input?.value || "").trim();
    if (!value) {
      localStorage.removeItem(GS_PIN_KEY);
      announceScreenReader("Instructor code removed. Anyone can change these settings.");
    } else if (!/^\d{1,8}$/.test(value)) {
      announceScreenReader("Use digits only, up to 8.");
      return;
    } else {
      localStorage.setItem(GS_PIN_KEY, gsHashPin(value));
      gsInstructorUnlocked = true;
      announceScreenReader("Instructor code saved. Instructor setup will ask for it next time.");
    }
    if (input) input.value = "";
    gsRenderInstructorLock();
  });

  document.getElementById("instructorLockNowBtn")?.addEventListener("click", () => {
    gsInstructorUnlocked = false;
    gsRenderInstructorLock();
    announceScreenReader("Instructor setup locked.");
    document.getElementById("instructorPinEntry")?.focus();
  });
}

/* Leaving the screen locks it again. */
function gsInstructorLeave() {
  gsInstructorUnlocked = false;
}

function gsFeaturesInit() {
  gsBindInstructorFeatures();
  gsBindInstructorLock();
  gsRenderInstructorFeatures();
  gsRenderInstructorLock();
  gsApplyFeatureVisibility();
  gsApplyTrafficSide();
}

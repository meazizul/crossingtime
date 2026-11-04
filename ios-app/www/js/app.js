/* ============================================================
 * CrossingTime — shell: navigation, progress, sharing, help
 * ============================================================ */

const GS_SCREENS = ["home", "practice", "signal", "compare", "live", "progress", "help", "instructor", "shortcuts"];

/* The app name lives here and in index.html <title>/manifest only, so a
 * rename (under discussion) is a small change. */
const GS_APP_NAME = "CrossingTime";

const GS_SCREEN_TITLES = {
  home: GS_APP_NAME,
  practice: "Practice my timing",
  signal: "Comparison preparation",
  compare: "Comparison practice",
  live: "At the street",
  progress: "Progress",
  help: "Help",
  instructor: "Instructor setup",
  shortcuts: "Siri and shortcuts"
};

/* The four activities, in the order the skill is taught. Crossing times are
 * measured and set by the O&M Specialist (Instructor setup, or a link). */
const GS_STEP_ORDER = ["practice", "signal", "compare", "live"];

let gsCurrentScreen = "home";

/* Shown under Help → About so a tester can confirm which build they have.
 * Bump GS_APP_BUILD with CURRENT_PROJECT_VERSION (iOS), versionCode (Android)
 * and CACHE_VERSION (sw.js). In the native app the real bundle values are
 * read from the App plugin and override these. */
const GS_APP_VERSION = "1.0";
const GS_APP_BUILD = "21";
const GS_APP_DATE = "4 November 2026";

async function gsRenderAbout() {
  const el = document.getElementById("aboutVersion");
  if (!el) return;
  let version = GS_APP_VERSION;
  let build = GS_APP_BUILD;
  let channel = "web";
  try {
    const AppPlugin = window.Capacitor?.Plugins?.App;
    if (window.Capacitor?.isNativePlatform?.() && AppPlugin?.getInfo) {
      const info = await AppPlugin.getInfo();
      if (info?.version) version = info.version;
      if (info?.build) build = info.build;
      channel = window.Capacitor.getPlatform?.() === "android" ? "Android app" : "iPhone app";
    }
  } catch (error) {
    /* fall back to the constants */
  }
  el.textContent = `${GS_APP_NAME} version ${version}, build ${build} (${channel}), ${GS_APP_DATE}.`;
  const storage = document.getElementById("aboutStorage");
  if (storage && window.gsStore) storage.textContent = window.gsStore.describe();
}

/*
 * Stop whatever any activity is doing. Called on every screen change so that
 * leaving mid-run never leaves timers firing, speech suppressed, Settings
 * locked, or a gesture pad open.
 */
function gsCancelActivities() {
  if (typeof cancelPractice === "function") cancelPractice();
  if (typeof gsCompareCancel === "function") gsCompareCancel();
  if (typeof gsLiveLeave === "function") gsLiveLeave();
  if (typeof gsSignalCancel === "function") gsSignalCancel();
  if (typeof gsClearHaptics === "function") gsClearHaptics();
  // Sounds already scheduled used to play on into the next screen for up to
  // the length of a replay; now Back silences them at once.
  if (typeof stopAllSound === "function") stopAllSound();
  if (typeof gsStopSpeech === "function") gsStopSpeech();
  suppressSrAnnouncements = false;
  stopVisualReplay();
  gsHideIntervalVisual();
}

/*
 * Each settings box is a labelled group: its heading (a real h2/h3 since
 * build 10) names the group, so VoiceOver reads "Crossing times, group" on
 * entering it and the headings rotor can jump between sections.
 */
function gsLabelSections() {
  let n = 0;
  document.querySelectorAll(".setup-heading, .card-label").forEach((heading) => {
    const group = heading.closest(".setup-group, .card, .help-card, .progress-section") || heading.parentElement;
    if (!group || group === document.body || group.tagName === "SECTION") return;
    if (!heading.id) heading.id = `gsSectionHeading${++n}`;
    if (!group.hasAttribute("role")) group.setAttribute("role", "group");
    if (!group.hasAttribute("aria-labelledby")) group.setAttribute("aria-labelledby", heading.id);
  });
}

/* What self-voicing says on arrival at each screen. */
function gsScreenIntro(name) {
  // Low verbosity: the name of the screen only (build 20).
  if (a11ySettings.verbosity === "low") return GS_SCREEN_TITLES[name] || "";
  const intro = document.querySelector(`#screen-${name} .screen-intro`);
  return [GS_SCREEN_TITLES[name], intro ? intro.textContent.trim() : ""].filter(Boolean).join(". ");
}

/* High verbosity (build 20): what is on a screen, in the order it is laid
 * out: the section headings, then the buttons. Read from the page itself, so
 * it always matches what is shown. */
function gsVisible(el) {
  if (!el || el.hidden || el.closest("[hidden]")) return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

function gsScreenLayout(name) {
  const screen = document.getElementById(`screen-${name}`);
  if (!screen) return "";
  const clean = (text) => String(text || "").replace(/\s+/g, " ").trim().replace(/[.:]$/, "");
  const headings = [...screen.querySelectorAll("h2, h3")].filter(gsVisible).map((h) => clean(h.textContent)).filter(Boolean);
  const buttons = [...screen.querySelectorAll("button, a.settings-action")]
    .filter(gsVisible)
    .map((b) => clean(b.getAttribute("aria-label") || b.textContent))
    .filter(Boolean);
  const unique = (list) => [...new Set(list)];
  const parts = [];
  if (headings.length) parts.push(`Sections: ${unique(headings).slice(0, 8).join(", ")}.`);
  const shown = unique(buttons);
  if (shown.length) parts.push(`Buttons: ${shown.slice(0, 10).join(", ")}${shown.length > 10 ? `, and ${shown.length - 10} more` : ""}.`);
  return parts.length ? `On this screen. ${parts.join(" ")}` : "";
}

function gsShowScreen(name) {
  if (!GS_SCREENS.includes(name)) name = "home";
  // An activity the instructor turned off cannot be opened by a link or a
  // shortcut either.
  if (GS_STEP_ORDER.includes(name) && typeof gsActivityEnabled === "function" && !gsActivityEnabled(name)) {
    name = "home";
  }
  // Build 16: the four activities wait for the session code (SOMA/SWOMA
  // 2026). Links, Siri and the Home buttons all come through here.
  let wantedLocked = false;
  if (GS_STEP_ORDER.includes(name) && !gsIsUnlocked()) {
    name = "home";
    wantedLocked = true;
  }
  // The same setup check as Home's buttons, for every route: a shortcut,
  // Siri or a link used to open an activity Home would refuse (tracker
  // 20.16). Home then shows "Start here" and the way to Instructor setup.
  let wantedSetup = "";
  if (GS_STEP_ORDER.includes(name) && typeof gsHasTimes === "function" && !gsHasTimes()) {
    wantedSetup = (typeof gsSetupProblem === "function" && gsSetupProblem()) || "The crossing times are not set yet.";
    name = "home";
  }
  const leaving = gsCurrentScreen;
  gsCancelActivities();
  if (leaving === "instructor" && name !== "instructor" && typeof gsInstructorLeave === "function") gsInstructorLeave();
  gsCurrentScreen = name;

  GS_SCREENS.forEach((screen) => {
    const el = document.getElementById(`screen-${screen}`);
    if (el) el.hidden = screen !== name;
  });

  const back = document.getElementById("backBtn");
  if (back) back.hidden = name === "home";

  const title = document.getElementById("screenTitle");
  if (title) title.textContent = GS_SCREEN_TITLES[name];

  if (name === "progress") gsRenderProgress();
  if (name === "home") gsRenderHome();
  if (name === "help") gsRenderAbout();
  if (name === "practice" && typeof renderPracticeScore === "function") renderPracticeScore();
  if (name === "signal" && typeof gsSignalRenderScore === "function") gsSignalRenderScore();
  if (name === "compare" && typeof gsCompareRenderScore === "function") gsCompareRenderScore();
  if (name === "live" && typeof gsLiveEnter === "function") gsLiveEnter();
  if (name === "instructor") {
    if (typeof gsRenderInstructorFeatures === "function") gsRenderInstructorFeatures();
    if (typeof gsRenderInstructorLock === "function") gsRenderInstructorLock();
    if (typeof gsRenderStudents === "function") gsRenderStudents();
  }
  if (name === "shortcuts") gsRenderShortcuts();
  gsRenderSafetyNotes();
  gsRenderOwnSoundWording();

  // Focus the one visible heading, so a screen reader announces where the
  // student has arrived and the next swipe reaches the first control.
  if (title) title.focus({ preventScroll: true });
  window.scrollTo(0, 0);

  if (a11ySettings.selfVoice && name !== "home") {
    const layout = a11ySettings.verbosity === "high" ? gsScreenLayout(name) : "";
    gsSpeak([gsScreenIntro(name), layout].filter(Boolean).join(" "));
  } else if (a11ySettings.verbosity === "high" && typeof gsScreenReaderOn === "function" && gsScreenReaderOn()) {
    // With VoiceOver or TalkBack, after the heading has been read.
    const layout = gsScreenLayout(name);
    if (layout) setTimeout(() => { if (gsCurrentScreen === name) announceScreenReader(layout, { speak: false }); }, 1500);
  }
  if (wantedLocked) gsSessionCodeAsk();
  else if (wantedSetup) {
    const message = `${wantedSetup} Set them in Instructor setup first.`;
    setTimeout(() => announceScreenReader(message), 400);
  }
}

/* ============================================================
 * Session code (build 16)
 * ------------------------------------------------------------
 * For the SOMA/SWOMA 2026 session: participants install the app at home,
 * where they can read Help, set accessibility and even enter crossing
 * times, but the four practice activities open only with the code given
 * out in the room. The check is on the phone (no network in the room), the
 * code is kept as a hash, and once entered the phone stays unlocked; the
 * flag travels with the durable copy like every other om-* key. Installs
 * that already had crossing times or history before this build are
 * unlocked on their first start, so nobody who is already testing is shut
 * out (Cindi's and Jonggi's groups).
 * ============================================================ */

// Build 19: the code is entered once and the phone stays unlocked (Cindi,
// 1 Nov: "a permanent unlock - not something the person needs to enter
// every time"). The flag is an om-* key, so it travels with the durable
// copy and survives the app being closed or the web view being cleared.
// Builds 16-18 flags ("om-unlocked", the session flag) do not count: every
// phone enters one of the build 19 codes once, because the old code was
// exposed.
//
// Three codes, each kept only as a hash:
//   tester    works any time (the team and invited O&M testers)
//   session1  works only during the first run of the SOMA session
//   session2  works only during the repeat
// The windows are read on the phone's own clock, in its own time zone, so
// at the venue they are venue time. SOMA 2026, Saturday 5 December: the
// session runs 1:30-3:00 and is repeated 3:30-5:00. A shared session code
// stops working after its window; a phone already unlocked stays unlocked.
// After the second presentation the lock is switched off with
// GS_SESSION_LOCK_ENABLED = false (branch release/no-code).
const GS_SESSION_LOCK_ENABLED = true;
const GS_UNLOCK_KEY = "om-session-unlock";
const GS_SESSION_CODES = [
  { id: "tester",
    sha256: "f8b4b02c09cf57b204db3b18aa763786d15574ec0824e3639e10afc54990d52d" },
  { id: "session1", from: [2026, 12, 5, 12, 30], to: [2026, 12, 5, 15, 30],
    sha256: "24a63ec7c93bdbb5b5dea931017f958545ef99af8d6f09a8260115a2a1c976cf" },
  { id: "session2", from: [2026, 12, 5, 15, 0], to: [2026, 12, 5, 18, 30],
    sha256: "4b3d0e48caf0f1eef87000c663d60d0a880d65475b9440a1b7c2a8bc0ae15c2f" }
];

function gsIsUnlocked() {
  if (!GS_SESSION_LOCK_ENABLED) return true;
  try { return Boolean(localStorage.getItem(GS_UNLOCK_KEY)); } catch (error) { return true; }
}

function gsSetUnlocked(codeId = "tester") {
  try {
    localStorage.setItem(GS_UNLOCK_KEY, JSON.stringify({ code: codeId, at: new Date().toISOString() }));
  } catch (error) { /* unlocked for this run anyway */ }
  try {
    localStorage.removeItem("om-unlocked");
    localStorage.removeItem("om-lock-seen");
    sessionStorage.removeItem("gs-session-unlocked");
  } catch (error) { /* ignore */ }
}

function gsLocalTime(parts) {
  const [y, mo, d, h, mi] = parts;
  return new Date(y, mo - 1, d, h, mi).getTime();
}

/* Which code was typed, and whether it may unlock now.
 * Returns { id, ok, reason } with reason "early" / "late" outside a window,
 * or null when the code matches none of them. */
async function gsCodeCheck(raw, now = Date.now()) {
  const code = String(raw || "").replace(/\s+/g, "");
  if (!code) return null;
  let hex = null;
  try {
    if (window.crypto?.subtle && window.isSecureContext) {
      const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
      hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (error) {
    hex = null;
  }
  // No 32-bit fallback any more (tracker 20.7): it also accepted other
  // inputs that shared its short hash. Every place the app runs (the iPhone
  // and Android apps, https://crossingtime.app) is a secure context.
  if (!hex) return null;
  const hit = GS_SESSION_CODES.find((c) => c.sha256 === hex);
  if (!hit) return null;
  if (hit.from && now < gsLocalTime(hit.from)) return { id: hit.id, ok: false, reason: "early" };
  if (hit.to && now > gsLocalTime(hit.to)) return { id: hit.id, ok: false, reason: "late" };
  return { id: hit.id, ok: true };
}

async function gsCodeMatches(raw) {
  const result = await gsCodeCheck(raw);
  return Boolean(result && result.ok);
}

const GS_CODE_OUTSIDE = "That session code works only during its session. Ask Azizul Haque or your O&M specialist for help.";
const GS_CODE_WRONG = "That code did not match. Ask Azizul Haque or your O&M specialist for the session code.";

/* The two places the code can be typed: the pop-up at start, and the card
 * on Home. Each has its own input, button and note. */
function gsCodeField(which) {
  const modal = which === "modal";
  return {
    input: document.getElementById(modal ? "sessionCodeModalInput" : "sessionCodeInput"),
    note: document.getElementById(modal ? "sessionCodeModalNote" : "sessionCodeNote")
  };
}

function gsSessionCodeNote(message, tone = "neutral", which = "card") {
  const { note } = gsCodeField(which);
  if (note) {
    note.textContent = message;
    note.dataset.tone = tone;
  }
  if (typeof announceScreenReader === "function" && message) announceScreenReader(message);
}

/* A locked activity was asked for: open the pop-up with the field focused. */
function gsSessionCodeAsk() {
  gsShowSessionCodeModal("The activities open with your session code. Enter it here.");
}

function gsShowSessionCodeModal(message = "") {
  const dialog = document.getElementById("sessionCodeModal");
  if (!dialog || typeof dialog.showModal !== "function") {
    const { input } = gsCodeField("card");
    if (message) gsSessionCodeNote(message);
    if (input) setTimeout(() => input.focus(), 50);
    return;
  }
  if (!dialog.open) {
    lockPageScroll();
    setMainContentInert(true);
    dialog.showModal();
  }
  gsSessionCodeNote(message, "neutral", "modal");
  document.getElementById("sessionCodeModalTitle")?.focus();
}

function gsCloseSessionCodeModal() {
  const dialog = document.getElementById("sessionCodeModal");
  if (dialog?.open) dialog.close();
}

async function gsSessionCodeSubmit(which = "card") {
  const { input } = gsCodeField(which);
  const value = input ? input.value : "";
  if (!value.trim()) {
    gsSessionCodeNote("Type the code first.", "warn", which);
    input?.focus();
    return;
  }
  const result = await gsCodeCheck(value, typeof window.__gsNow === "number" ? window.__gsNow : Date.now());
  if (!result || !result.ok) {
    gsSessionCodeNote(result ? GS_CODE_OUTSIDE : GS_CODE_WRONG, "warn", which);
    if (input) { input.select?.(); input.focus(); }
    return;
  }
  gsSetUnlocked(result.id);
  ["card", "modal"].forEach((w) => { const f = gsCodeField(w); if (f.input) f.input.value = ""; });
  gsCloseSessionCodeModal();
  gsRenderHome();
  gsSessionCodeNote("Unlocked. The activities are open.", "ok");
  const first = document.querySelector(".step-card:not([hidden]) .step-button");
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 300);
}

function gsRenderLock() {
  const locked = !gsIsUnlocked();
  const card = document.getElementById("sessionCodeCard");
  if (card) card.hidden = !locked;
  const note = document.getElementById("homeLockedNote");
  if (note) note.hidden = !locked;
  const demo = document.getElementById("tryDemoBtn");
  if (demo && locked) demo.hidden = true;
  return locked;
}

/* ============================================================
 * Visual channel for intervals
 * ------------------------------------------------------------
 * The replay overlay is driven by the AudioContext clock and owned by the
 * practice engine. Playing a sample, or showing a right/wrong result, needs
 * something simpler: hold a visual on screen for exactly as long as it lasts.
 *   type "sample"                 the sample warning time: a held bar
 *   type "user"                   the student's flash
 *   type "acceptable" / "outside" the circle / the triangle
 * ============================================================ */

let gsIntervalVisualTimers = [];

function gsHideIntervalVisual() {
  gsIntervalVisualTimers.forEach((id) => clearTimeout(id));
  gsIntervalVisualTimers = [];
  const overlay = document.getElementById("visualReplayOverlay");
  const flash = document.getElementById("visualReplayFlash");
  const shape = document.getElementById("visualReplayShape");
  const sample = document.getElementById("visualReplaySample");
  if (!overlay) return;
  overlay.dataset.active = "false";
  if (flash) flash.style.background = "transparent";
  if (shape) shape.style.display = "none";
  if (sample) sample.style.display = "none";
}

function gsShowIntervalVisual(startDelaySec, durationSec, type = "user") {
  if (!visualOutputEnabled()) return;
  const overlay = document.getElementById("visualReplayOverlay");
  const flash = document.getElementById("visualReplayFlash");
  const shape = document.getElementById("visualReplayShape");
  const sample = document.getElementById("visualReplaySample");
  if (!overlay || !flash || !shape) return;

  gsIntervalVisualTimers.push(setTimeout(() => {
    overlay.dataset.active = "true";
    flash.style.background = "#000000";
    shape.style.display = "none";
    if (sample) sample.style.display = "none";
    if (type === "user") {
      flash.style.background = getUserFlashColor();
    } else if (type === "sample") {
      if (sample) sample.style.display = "block";
    } else {
      shape.dataset.type = type;
      shape.dataset.outsideVariant = a11ySettings.outsideVisualVariant;
      shape.style.display = "block";
    }
  }, startDelaySec * 1000));

  gsIntervalVisualTimers.push(setTimeout(() => {
    gsHideIntervalVisual();
  }, (startDelaySec + durationSec) * 1000));
}

/* ============================================================
 * Home
 * ============================================================ */

function gsHasTimes() {
  const { clearTime, fullTime } = getTimingInputs();
  const present = Number.isFinite(clearTime) && clearTime > 0 && Number.isFinite(fullTime) && fullTime > 0;
  return present && (typeof gsSetupProblem !== "function" || !gsSetupProblem());
}

function gsRenderHome() {
  if (typeof gsRenderStudentLine === "function") gsRenderStudentLine();
  const locked = gsRenderLock();
  const ready = gsHasTimes() && !locked;
  const banner = document.getElementById("homeSetupBanner");
  if (banner) banner.hidden = gsHasTimes() || locked;

  // Every activity compares against the crossing times, so all of them wait
  // until the times exist. Activities the instructor turned off are hidden.
  let shown = 0;
  GS_STEP_ORDER.forEach((step) => {
    const card = document.querySelector(`.step-card[data-screen="${step}"]`);
    if (!card) return;
    const enabled = typeof gsActivityEnabled !== "function" || gsActivityEnabled(step);
    card.hidden = !enabled;
    if (enabled) shown += 1;
    card.classList.toggle("locked", !ready);
    const btn = card.querySelector("button");
    if (btn) {
      btn.disabled = !ready;
      btn.setAttribute("aria-disabled", String(!ready));
    }
  });
  const none = document.getElementById("homeNoActivities");
  if (none) none.hidden = shown > 0;

  // Number the visible activities 1, 2, 3… so a hidden one leaves no gap.
  let number = 0;
  document.querySelectorAll(".step-card").forEach((card) => {
    if (card.hidden) return;
    number += 1;
    const badge = card.querySelector(".step-number");
    if (badge) badge.textContent = String(number);
  });

  const summary = gsSummary();
  const el = document.getElementById("homeProgressNote");
  if (el) {
    el.textContent = summary.total
      ? `${summary.total} attempts over ${summary.daysPracticed} day${summary.daysPracticed === 1 ? "" : "s"}`
      : "No practice recorded yet";
  }

  gsRenderDemoNote();
  if (locked) {
    const demo = document.getElementById("tryDemoBtn");
    if (demo) demo.hidden = true;
  }

  // The numbers themselves stay in Instructor setup. A student who reads
  // "8.0 s" on the home screen is invited to count, which is the one thing
  // the method forbids.
  const times = document.getElementById("homeTimes");
  if (times) {
    times.textContent = ready
      ? (gsUsingDemoTimes() ? "Using example crossing times" : "Crossing times set")
      : "Crossing times not set";
  }
}

/* ============================================================
 * Safety notes: "longer does not mean long enough"
 * ------------------------------------------------------------
 * Cindi: make it very clear, on At the street and Comparison practice, that
 * a longer warning time is not by itself long enough. Shown until the
 * student dismisses it; Help can bring it back.
 * ============================================================ */

function gsSafetyKey(name) {
  return `om-safety-dismissed-${name}`;
}

function gsRenderSafetyNotes() {
  document.querySelectorAll("[data-safety-note]").forEach((note) => {
    note.hidden = localStorage.getItem(gsSafetyKey(note.dataset.safetyNote)) === "true";
  });
}

function gsBindSafetyNotes() {
  document.querySelectorAll("[data-dismiss-safety]").forEach((btn) => {
    btn.addEventListener("click", () => {
      localStorage.setItem(gsSafetyKey(btn.dataset.dismissSafety), "true");
      gsRenderSafetyNotes();
      announceScreenReader("Note hidden. You can show it again from Help.");
      document.getElementById("screenTitle")?.focus({ preventScroll: true });
    });
  });
  document.getElementById("showSafetyNotesBtn")?.addEventListener("click", () => {
    ["compare", "live"].forEach((name) => localStorage.removeItem(gsSafetyKey(name)));
    localStorage.removeItem(GS_DISCLAIMER_KEY);
    gsRenderSafetyNotes();
    gsShowDisclaimer({ thenTutorial: false });
  });
}

/* ============================================================
 * First run: use with an O&M Specialist
 * ============================================================ */

const GS_DISCLAIMER_KEY = "om-disclaimer-ack";

function gsShowDisclaimer({ thenTutorial = false } = {}) {
  const dialog = document.getElementById("disclaimerModal");
  if (!dialog || typeof dialog.showModal !== "function") return;
  dialog.dataset.thenTutorial = String(thenTutorial);
  if (!dialog.open) {
    lockPageScroll();
    setMainContentInert(true);
    dialog.showModal();
  }
  document.getElementById("disclaimerTitle")?.focus();
  if (a11ySettings.selfVoice) {
    gsSpeak([...dialog.querySelectorAll(".disclaimer-text")].map((p) => p.textContent).join(" "));
  }
}

function gsBindDisclaimer() {
  const dialog = document.getElementById("disclaimerModal");
  if (!dialog) return;
  // Escape must not skip it.
  dialog.addEventListener("cancel", (event) => event.preventDefault());
  document.getElementById("disclaimerAcceptBtn")?.addEventListener("click", () => {
    localStorage.setItem(GS_DISCLAIMER_KEY, "true");
    const thenTutorial = dialog.dataset.thenTutorial === "true";
    dialog.close();
    if (thenTutorial && !localStorage.getItem(GS_TUTORIAL_KEY)) {
      setTimeout(() => gsRunTutorial(), 250);
    } else if (typeof offerOpenInApp === "function") {
      offerOpenInApp();
    }
  });
  dialog.addEventListener("close", () => {
    if (!gsAnyDialogOpen()) {
      unlockPageScroll();
      setMainContentInert(false);
      document.getElementById("screenTitle")?.focus({ preventScroll: true });
    }
  });

  const openInApp = document.getElementById("openInAppModal");
  document.getElementById("openInAppClose")?.addEventListener("click", () => openInApp?.close());
  document.getElementById("openInAppLink")?.addEventListener("click", () => {
    setTimeout(() => openInApp?.close(), 300);
  });
  openInApp?.addEventListener("close", () => {
    if (!gsAnyDialogOpen()) {
      unlockPageScroll();
      setMainContentInert(false);
    }
  });
}

/*
 * Android's Back button or back gesture. With no handler, Capacitor's default
 * only steps back through web history, and this app has none, so Back did
 * nothing at all (bug 20). Back now does what the screen's own way out does:
 * closes a dialog, does what a pad's own Back does (one level at a time),
 * goes Home, and only from Home leaves the app (to the background, not
 * killed).
 */
function gsHandleBack() {
  const dialogs = [...document.querySelectorAll("dialog")].filter((d) => d.open);
  if (dialogs.length) {
    const top = dialogs[dialogs.length - 1];
    // The first-run notice cannot be skipped, by Back either.
    if (top.id !== "disclaimerModal") top.close();
    return "dialog";
  }
  // A pad's Back (tracker 13.7): the pad on top goes, one level at a time.
  if (typeof gsPadBack === "function" && gsPadBack()) return "pad";
  if (gsCurrentScreen !== "home") { gsShowScreen("home"); return "home"; }
  const AppPlugin = window.Capacitor?.Plugins?.App;
  if (typeof AppPlugin?.minimizeApp === "function") AppPlugin.minimizeApp();
  else AppPlugin?.exitApp?.();
  return "exit";
}

function gsBindAndroidBack() {
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.() || cap.getPlatform?.() !== "android") return;
  try { cap.Plugins?.App?.addListener?.("backButton", () => gsHandleBack()); } catch (error) { /* no back handling */ }
}

function gsAnyDialogOpen() {
  return [...document.querySelectorAll("dialog")].some((d) => d.open);
}

/* ============================================================
 * Progress
 * ============================================================ */

function gsRenderProgress() {
  const summary = gsSummary();
  const wrap = document.getElementById("progressBody");
  if (!wrap) return;

  // Only an empty log means nothing to show: cancelled answers, vehicles that
  // never came and street practice with judging off are kept but not scored,
  // and they belong here as they do in the report.
  if (!gsLoadHistory().length) {
    wrap.innerHTML = `<p class="field-help">Nothing recorded yet. Practice will show up here.</p>`;
    return;
  }

  /*
   * Each activity is ONE sentence inside ONE heading, so a screen reader reads
   * it in one stop ("Comparison practice: 56 percent, 9 of 16 correct. How
   * much longer or shorter: 0 of 5 estimates within margin.") and the Headings
   * rotor jumps box to box. The large number and the small note are the same
   * sentence laid out for the eye; the dash and the dots are never read
   * (tracker 12.41, 12.32).
   */
  const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cards = GS_STEP_ORDER.map((activity) => {
    const stats = summary.byActivity[activity];
    const label = GS_ACTIVITY_LABELS[activity] || activity;
    if (!stats) {
      return `<li class="progress-card"><h2 class="progress-sentence">
        <span class="progress-label" aria-hidden="true">${esc(label)}</span>
        <span class="progress-value" aria-hidden="true">—</span>
        <span class="progress-note" aria-hidden="true">not started</span>
        <span class="sr-only">${esc(label)}: not started.</span></h2></li>`;
    }
    const pct = stats.total ? Math.round((stats.correct / stats.total) * 100) : null;
    const noun = activity === "practice" || activity === "signal" ? "within margin" : "correct";
    const main = stats.total ? `${stats.correct} of ${stats.total} ${noun}` : "no judgments yet";
    // "How much" estimates are the same vehicles or samples judged a second
    // way, so they get their own clause and are never added to the count.
    const howMuchVisual = stats.howMuchTotal ? ` · how much: ${stats.howMuchCorrect} of ${stats.howMuchTotal} within margin` : "";
    const howMuchSpoken = stats.howMuchTotal ? ` How much longer or shorter: ${stats.howMuchCorrect} of ${stats.howMuchTotal} estimates within margin.` : "";
    const cancelledTotal = (stats.skipped || 0) + (stats.skippedHowMuch || 0);
    const cancelled = cancelledTotal ? ` · ${cancelledTotal} cancelled` : "";
    const cancelledSpoken = cancelledTotal ? ` ${cancelledTotal} cancelled, not scored.` : "";
    const unscored = stats.unscored ? ` · ${stats.unscored} not scored` : "";
    const unscoredSpoken = stats.unscored ? ` ${stats.unscored} not scored.` : "";
    const spoken = `${label}: ${pct === null ? "" : `${pct} percent, `}${main}.${howMuchSpoken}${cancelledSpoken}${unscoredSpoken}`;
    return `<li class="progress-card"><h2 class="progress-sentence">
      <span class="progress-label" aria-hidden="true">${esc(label)}</span>
      <span class="progress-value" aria-hidden="true">${pct === null ? "—" : `${pct}%`}</span>
      <span class="progress-note" aria-hidden="true">${esc(main + howMuchVisual + cancelled + unscored)}</span>
      <span class="sr-only">${esc(spoken)}</span></h2></li>`;
  }).join("");

  // A small run of the last 20 timing attempts (practice and preparation).
  const recent = gsLoadHistory()
    .filter((e) => e.activity === "practice" || e.activity === "signal")
    .slice(-20);
  const dots = recent
    .map((e) => `<span class="run-dot ${e.correct ? "ok" : "miss"}" aria-hidden="true"></span>`)
    .join("");
  const runLabel = recent.length
    ? `<p class="field-help">Last ${recent.length} timing attempts, oldest first:
       ${recent.filter((e) => e.correct).length} within margin.</p>
       <div class="run-strip" role="img" aria-label="Recent attempts: ${recent
         .map((e) => (e.correct ? "within" : "outside"))
         .join(", ")}">${dots}</div>`
    : "";

  const adaptive = gsLoadAdaptive();
  let adaptiveNote = "";
  if (adaptive.enabled) {
    const lanes = Object.entries(adaptive.lanes)
      .map(([key, lane]) => `<li>${gsLaneLabel(key)}: margin now <strong>${Number(lane.margin).toFixed(2)}s</strong></li>`)
      .join("");
    adaptiveNote = lanes
      ? `<div class="setup-group"><p class="setup-heading">Adaptive margin (experimental)</p><ul class="plain-list">${lanes}</ul></div>`
      : "";
  }

  // Storage trouble is said here, never hidden (tracker 12.40).
  const problem = typeof gsHistorySaveProblem === "function" ? gsHistorySaveProblem() : "";
  const problemNote = problem ? `<p class="setup-required-prompt" role="status">${esc(problem)}</p>` : "";

  wrap.innerHTML = `${problemNote}<ul class="progress-grid" aria-label="Progress by activity">${cards}</ul>${runLabel}${adaptiveNote}`;
}

/* ============================================================
 * Sending a report to the instructor
 * ------------------------------------------------------------
 * Cindi: copy and paste, especially with VoiceOver, is beyond students with
 * emerging technology skills, and not everyone has Mail set up. So: one
 * button shows the report and asks to confirm; "Send it" opens the phone's
 * share sheet (Messages, Mail, WhatsApp, anything). Nothing is sent by the
 * app itself and nothing passes through any server. Identity is the short
 * student code, never a name.
 * ============================================================ */

function gsReportText() {
  return gsBuildReport({
    clientCode: typeof getClientCode === "function" ? getClientCode() : "",
    started: typeof gsStudentStarted === "function" ? gsStudentStarted() : ""
  });
}

function gsReportSubject() {
  const code = typeof getClientCode === "function" ? getClientCode() : "";
  return `${GS_APP_NAME} practice report${code ? ` — ${code}` : ""}`;
}

/*
 * Only ways that can work are offered (Cindi, Oct 18 2026; tracker 12.38,
 * F4): "Text to my instructor" always (Messages opens with the report, and
 * the instructor's number when the setup has one); "Email to
 * my instructor" only when an email is set up and a mail app can open; the
 * share menu stays for anything else. Builds 14-19 also had "Show to my
 * instructor", the report as QR codes; removed in build 20 at Cindi's request
 * (1 Nov 2026): a long report needed many codes and nothing joined them again.
 */
let gsMailAvailable = null;   // null = not checked yet (web, Android: assumed possible)

async function gsCheckMailAvailable() {
  const plugin = window.Capacitor?.Plugins?.GSNative;
  if (!window.Capacitor?.isNativePlatform?.() || typeof plugin?.canOpen !== "function") return null;
  try {
    const result = await plugin.canOpen({ scheme: "mailto" });
    return typeof result?.canOpen === "boolean" ? result.canOpen : null;
  } catch (error) {
    return null;
  }
}

async function gsRenderReportControls() {
  const email = typeof getInstructorEmail === "function" ? getInstructorEmail() : "";
  const phone = typeof getInstructorPhone === "function" ? getInstructorPhone() : "";
  if (gsMailAvailable === null) gsMailAvailable = await gsCheckMailAvailable();
  const emailBtn = document.getElementById("emailReportBtn");
  if (emailBtn) emailBtn.hidden = !email || gsMailAvailable === false;
  const whom = document.getElementById("reportRecipient");
  if (whom) {
    const parts = [];
    if (phone) parts.push(`Your instructor's number: ${phone}`);
    if (email) parts.push(`Your instructor's email: ${email}`);
    whom.textContent = parts.join(" · ");
    whom.hidden = !parts.length;
  }
  const textBtn = document.getElementById("textReportBtn");
  if (textBtn) textBtn.textContent = phone ? "Text to my instructor" : "Text to my instructor (you choose the number)";
}

/* The report is shown first; nothing is sent until the student chooses how (tracker 12.39). */
function gsPreviewReport() {
  const box = document.getElementById("reportPreview");
  const wrap = document.getElementById("reportPreviewWrap");
  if (!box || !wrap) return;
  box.value = gsReportText();
  wrap.hidden = false;
  const show = document.getElementById("sendReportBtn");
  if (show) show.hidden = true;   // once the report is open, only the send controls say Send
  gsRenderReportControls();
  const note = document.getElementById("reportNote");
  if (note) note.textContent = "";
  announceScreenReader("Your report is ready. Check it, then choose how to send it.");
  box.focus({ preventScroll: true });
  try { box.setSelectionRange(0, 0); } catch (error) { /* some browsers */ }
}

function gsCloseReport() {
  const wrap = document.getElementById("reportPreviewWrap");
  if (wrap) wrap.hidden = true;
  const show = document.getElementById("sendReportBtn");
  if (show) show.hidden = false;
  show?.focus({ preventScroll: true });
}

function gsReportNote(message) {
  const note = document.getElementById("reportNote");
  if (note) note.textContent = message;
  announceScreenReader(message);
}

async function gsConfirmSendReport() {
  const box = document.getElementById("reportPreview");
  if (!box?.value) gsPreviewReport();
  const outcome = await gsShareText({ title: gsReportSubject(), text: document.getElementById("reportPreview").value });
  const messages = {
    shared: "Report handed to the app you chose. Check it there, then send.",
    copied: "Your device cannot open a share menu here, so the report was copied. Paste it into a message or email.",
    cancelled: "Not sent.",
    failed: "Could not share or copy. Select the report text above and copy it."
  };
  gsReportNote(messages[outcome] || messages.failed);
}

async function gsCopyReport() {
  const box = document.getElementById("reportPreview");
  if (!box || !box.value) gsPreviewReport();
  const copied = await copyTextToClipboard(document.getElementById("reportPreview").value);
  gsReportNote(copied
    ? "Copied. Paste it into an email or message to send it."
    : "Could not copy. Select the report text above and copy it.");
}

/* Text: Messages opens with the report filled in, and the instructor's number when set (F4). */
function gsTextReport() {
  const box = document.getElementById("reportPreview");
  if (!box || !box.value) gsPreviewReport();
  const phone = typeof getInstructorPhone === "function" ? getInstructorPhone() : "";
  gsOpenSms(document.getElementById("reportPreview").value, phone);
  gsReportNote(phone
    ? "Opening Messages with the report, addressed to your instructor. Check it, then press Send."
    : "Opening Messages with the report. Choose your instructor, then press Send.");
}

/*
 * Email: only when a mail app can open. On iPhone the app asks first; in a
 * browser or on Android the page watches whether anything took over the
 * screen, and says so when nothing did (tracker 12.38).
 */
async function gsEmailReport() {
  const email = typeof getInstructorEmail === "function" ? getInstructorEmail() : "";
  if (!email) return;
  const box = document.getElementById("reportPreview");
  if (!box || !box.value) gsPreviewReport();
  const body = document.getElementById("reportPreview").value;
  const cannot = "No mail app is set up on this phone. Use Text to my instructor, or Send with another app.";
  const available = await gsCheckMailAvailable();
  if (available === false) {
    gsMailAvailable = false;
    gsRenderReportControls();
    gsReportNote(cannot);
    return;
  }
  let left = false;
  const onHide = () => { left = true; };
  document.addEventListener("visibilitychange", onHide, { once: true });
  window.addEventListener("blur", onHide, { once: true });
  // Opens the student's own mail app with everything filled in. They still
  // press Send themselves; the app sends nothing.
  gsNavigateTo(`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(gsReportSubject())}&body=${encodeURIComponent(body)}`);
  setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("blur", onHide);
    gsReportNote(left || document.hidden
      ? "Your mail app opened with the report. Check it, then send."
      : cannot);
  }, 1800);
}

/* CSV for Excel: a file through the share menu (phone apps) or a download (browser) (F3). */
async function gsExportCsv() {
  const code = typeof getClientCode === "function" ? getClientCode() : "";
  const csv = gsBuildCsv({ clientCode: code });
  const stamp = typeof gsCsvDate === "function" ? gsCsvDate(new Date()) : new Date().toISOString().slice(0, 10);
  const name = `crossingtime-report${code ? `-${code}` : ""}-${stamp}.csv`;
  const outcome = await gsShareFile({ name, text: csv, mime: "text/csv", title: `${gsReportSubject()} (CSV)` });
  const messages = {
    shared: "The CSV file was handed to the app you chose. It opens in Excel, Numbers or Google Sheets, one try per row.",
    downloaded: `Downloaded ${name}. It opens in Excel, Numbers or Google Sheets, one try per row.`,
    copied: "The CSV text was copied. In Excel, paste it, then use Data, Text to Columns, with commas.",
    cancelled: "Not exported.",
    failed: "Could not export. Use Copy report instead."
  };
  const message = messages[outcome] || messages.failed;
  gsReportNote(message);
  return { outcome, message };
}

/*
 * Delete all my practice history (tracker 14.2 and 14.4, build 15). One tap
 * deletes nothing: it opens a warning that says where the history is deleted
 * from, with Cancel first and Delete history second. Only Delete history
 * deletes, and the emptied history goes to the durable copy at once
 * (store.js), so it cannot come back on the next start, even when the app is
 * closed straight after.
 */
function gsDataOnPhone() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function gsRenderDataPlace() {
  const phone = gsDataOnPhone();
  const note = document.getElementById("myDataNote");
  if (note) note.textContent = phone ? "Kept on this phone, and in your phone's own backup if it is on." : "Kept only in this browser.";
  const where = document.getElementById("deleteHistoryWhere");
  if (where) where.textContent = phone ? "It is deleted from this phone now, and from your phone's backup at its next backup." : "It is deleted from this browser.";
  // Several students on one phone: say whose history goes (tracker 20.3).
  const student = gsHistoryStudentName();
  const title = document.getElementById("deleteHistoryTitle");
  if (title) title.textContent = student ? `Delete all practice history for student ${student}?` : "Delete all your practice history?";
  const what = document.getElementById("deleteHistoryWhat");
  if (what) what.textContent = student
    ? `This deletes every try recorded for student ${student}. The other students' practice stays. It cannot be undone.`
    : "This deletes every try you have recorded. It cannot be undone.";
}

/* The active student's code when the phone has several students, else "". */
function gsHistoryStudentName() {
  if (typeof gsActiveStudent !== "function") return "";
  const active = gsActiveStudent();
  return active ? (typeof gsStudentLabel === "function" ? gsStudentLabel(active) : active.code || "") : "";
}

function gsClearData() {
  const dialog = document.getElementById("deleteHistoryModal");
  if (!dialog || typeof dialog.showModal !== "function") { gsConfirmDeleteHistory(); return; }
  gsRenderDataPlace();
  if (!dialog.open) {
    lockPageScroll();
    setMainContentInert(true);
    dialog.showModal();
  }
  document.getElementById("deleteHistoryTitle")?.focus();
}

function gsCloseDeleteHistory() {
  const dialog = document.getElementById("deleteHistoryModal");
  if (dialog?.open) dialog.close();
}

async function gsConfirmDeleteHistory() {
  gsClearHistory();
  // Instructor setup's checkbox always shows the real state (tracker 20.8).
  const adaptiveToggle = document.getElementById("adaptiveMarginToggle");
  if (adaptiveToggle) adaptiveToggle.checked = gsAdaptiveEnabled();
  // A preview made before the delete still held the deleted practice, and
  // Send it would send it (bug 35, Oct 2026 review).
  const preview = document.getElementById("reportPreview");
  if (preview) preview.value = "";
  gsCloseReport();
  gsRenderProgress();
  gsRenderHome();
  const student = gsHistoryStudentName();
  const whose = student ? `Practice history for student ${student}` : "All practice history";
  const message = gsDataOnPhone()
    ? `${whose} deleted from this phone. Your phone's backup will no longer have it after its next backup.`
    : `${whose} deleted from this browser.`;
  const note = document.getElementById("reportNote");
  if (note) note.textContent = message;
  gsCloseDeleteHistory();
  announceScreenReader(message);
  // The durable copy is rewritten now, not after the usual wait (14.4).
  try { await window.gsStore?.clearHistoryNow?.(); } catch (error) { /* the copy follows on the next change */ }
}

/* ============================================================
 * Gesture log (Settings, Debug): what the pads received
 * ============================================================ */

function gsRenderGestureLog() {
  const el = document.getElementById("gestureLog");
  if (!el || typeof gsGestureLog === "undefined") return;
  el.textContent = gsGestureLog.length
    ? gsGestureLog.map((g) => `${g.at}  ${g.source.padEnd(7)} ${g.kind.padEnd(6)} ${g.extra ? `${g.extra} ms` : ""}`.trimEnd()).join("\n")
    : "None yet.";
}

/*
 * The replay explanations name the student's own channel: sound, or sound
 * with flash and vibration when those are on (tracker 12.29).
 */
function gsRenderOwnSoundWording() {
  const parts = ["your own sound"];
  if (typeof visualOutputEnabled === "function" && visualOutputEnabled()) parts.push("flash");
  if (a11ySettings.vibrate && typeof hapticsAvailable === "function" && hapticsAvailable()) parts.push("vibration");
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}`;
  document.querySelectorAll("[data-own-sound]").forEach((el) => { el.textContent = text; });
}

/* ============================================================
 * Siri and shortcuts
 * ============================================================ */

function gsRenderShortcuts() {
  const native = Boolean(window.Capacitor?.isNativePlatform?.());
  const platform = native ? (window.Capacitor.getPlatform?.() || "") : "web";
  const ios = document.getElementById("shortcutsIos");
  const android = document.getElementById("shortcutsAndroid");
  const web = document.getElementById("shortcutsWeb");
  if (ios) ios.hidden = platform !== "ios";
  if (android) android.hidden = platform !== "android";
  if (web) web.hidden = native;
}

/*
 * Siri and app shortcuts arrive two ways: as a gapsense://open/<screen> URL
 * (Android shortcuts, and the Shortcuts app's "Open URL"), handled in
 * engine.js, or from the iOS App Shortcuts through the GSNative plugin.
 */
function gsBindNativeShortcuts() {
  const plugin = window.Capacitor?.Plugins?.GSNative;
  if (!plugin) return;
  try {
    plugin.addListener?.("openScreen", (event) => {
      if (event?.screen) gsShowScreen(event.screen);
    });
    const pending = plugin.pendingScreen?.();
    if (pending && typeof pending.then === "function") {
      pending.then((result) => {
        if (result?.screen) gsShowScreen(result.screen);
      }).catch(() => {});
    }
  } catch (error) {
    /* non-fatal */
  }
}

/* ============================================================
 * Sound tutorial
 * ============================================================ */

const GS_TUTORIAL_KEY = "om-tutorial-seen";

function gsRunTutorial() {
  const dialog = document.getElementById("tutorialModal");
  if (!dialog) return;
  lockPageScroll();
  setMainContentInert(true);
  dialog.showModal();
  document.getElementById("tutorialTitle")?.focus();
  localStorage.setItem(GS_TUTORIAL_KEY, "true");
}

function gsTutorialDemo(kind) {
  ensureAudioContext();
  if (kind === "acceptable") {
    playFeedbackTone("acceptable", 0.05);
    announceScreenReader("That is the within-margin sound.");
  } else if (kind === "outside") {
    playFeedbackTone("outside", 0.05);
    announceScreenReader("That is the outside-margin sound.");
  } else if (kind === "sample") {
    if (typeof gsPlaySample === "function") gsPlaySample(2.0, 0.05, "continuous", { visual: false, haptic: false });
    announceScreenReader("That is a sample warning time. One steady sound, then it stops.");
  } else if (kind === "ready") {
    hapticCue("ready");
    if (!gsSpeak("Get ready")) announceScreenReader("Get ready.");
  } else {
    playUserMarkerTone(0.05);
    announceScreenReader("That is your own sound.");
  }
}

/* ============================================================
 * QUICK-START / DEMO MODE
 * ------------------------------------------------------------
 * A conference participant has about thirty seconds and is often using a
 * screen reader on a phone they are holding one-handed. Example times can be
 * loaded in one tap, and the conference link carries "?demo=1" to do it
 * automatically.
 * ============================================================ */

const GS_DEMO_KEY = "om-demo-times";
const GS_DEMO_CLEAR = "4.0";   // typical first-half time
const GS_DEMO_FULL = "8.0";    // typical full-street crossing
const GS_DEMO_MARGIN = "0.5";  // the value historically taught in workshops

function gsUsingDemoTimes() {
  return localStorage.getItem(GS_DEMO_KEY) === "true";
}

function gsLoadDemoTimes({ goToPractice = true } = {}) {
  setReferenceTimes(GS_DEMO_CLEAR, GS_DEMO_FULL, GS_DEMO_MARGIN, { source: "demo" });
  if (goToPractice) {
    gsShowScreen(typeof gsActivityEnabled === "function" && !gsActivityEnabled("practice") ? "home" : "practice");
    announceScreenReader(
      "Example times loaded. Press the big button to begin, then press it again when you think you would have reached the other side."
    );
  }
}

function gsRenderDemoNote() {
  document.querySelectorAll(".demo-note").forEach((el) => {
    el.hidden = !gsUsingDemoTimes();
  });
  const btn = document.getElementById("tryDemoBtn");
  // Locked installs (build 16) have no shortcut into practice.
  if (btn) btn.hidden = (gsHasTimes() && !gsUsingDemoTimes()) || !gsIsUnlocked();
}

/* ============================================================
 * Boot
 * ============================================================ */

function gsBindShell() {
  document.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", () => gsShowScreen(el.dataset.goto));
  });

  const back = document.getElementById("backBtn");
  if (back) back.addEventListener("click", () => gsShowScreen("home"));

  document.getElementById("homeOpenSettingsBtn")?.addEventListener("click", () => gsShowScreen("instructor"));
  document.getElementById("openInstructorSetupBtn")?.addEventListener("click", () => {
    // The dialog's close handler returns focus to whatever opened it; send it
    // to the new screen's heading instead.
    lastDialogTrigger = document.getElementById("screenTitle");
    settingsModal.close();
    gsShowScreen("instructor");
  });

  const adaptiveToggle = document.getElementById("adaptiveMarginToggle");
  if (adaptiveToggle) {
    adaptiveToggle.checked = gsAdaptiveEnabled();
    adaptiveToggle.addEventListener("change", () => {
      gsSetAdaptiveEnabled(adaptiveToggle.checked);
      if (typeof gsCompareRenderScore === "function") gsCompareRenderScore();
      if (typeof gsSignalRenderScore === "function") gsSignalRenderScore();
      if (typeof renderPracticeScore === "function") renderPracticeScore();
      announceScreenReader(
        adaptiveToggle.checked
          ? "Adaptive margin on. Experimental: each task's margin tightens slowly as accuracy improves and releases to the set margin when it drops."
          : "Adaptive margin off. The margin stays as set."
      );
    });
  }

  const resetLanes = document.getElementById("resetAdaptiveBtn");
  if (resetLanes) {
    resetLanes.addEventListener("click", () => {
      gsResetAdaptiveLanes();
      announceScreenReader("Adaptive margins reset to the set margin.");
    });
  }

  document.getElementById("sendReportBtn")?.addEventListener("click", gsPreviewReport);
  document.getElementById("confirmSendReportBtn")?.addEventListener("click", gsConfirmSendReport);
  document.getElementById("cancelSendReportBtn")?.addEventListener("click", gsCloseReport);
  document.getElementById("copyReportBtn")?.addEventListener("click", gsCopyReport);
  document.getElementById("emailReportBtn")?.addEventListener("click", gsEmailReport);
  document.getElementById("textReportBtn")?.addEventListener("click", gsTextReport);
  document.getElementById("csvReportBtn")?.addEventListener("click", gsExportCsv);
  document.getElementById("clearDataBtn")?.addEventListener("click", gsClearData);
  document.getElementById("cancelDeleteHistoryBtn")?.addEventListener("click", gsCloseDeleteHistory);
  document.getElementById("confirmDeleteHistoryBtn")?.addEventListener("click", gsConfirmDeleteHistory);
  document.getElementById("deleteHistoryModal")?.addEventListener("close", () => {
    if (!gsAnyDialogOpen()) {
      unlockPageScroll();
      setMainContentInert(false);
    }
    document.getElementById("clearDataBtn")?.focus({ preventScroll: true });
  });
  gsRenderDataPlace();
  // A failed save is said at once, wherever the student is (tracker 12.40).
  window.gsOnHistorySaveFailed = () => announceScreenReader("Your practice could not be saved on this phone. Free some space, or send a report now.");

  document.getElementById("openTutorialBtn")?.addEventListener("click", gsRunTutorial);
  document.getElementById("closeTutorial")?.addEventListener("click", () => {
    document.getElementById("tutorialModal")?.close();
  });
  document.getElementById("tutorialModal")?.addEventListener("close", () => {
    if (!gsAnyDialogOpen()) {
      unlockPageScroll();
      setMainContentInert(false);
    }
    // First run: the sound tutorial, then the session code until it has been entered once.
    if (!gsIsUnlocked()) {
      setTimeout(() => gsShowSessionCodeModal("Enter your session code to start practicing."), 300);
      return;
    }
    if (typeof offerOpenInApp === "function") offerOpenInApp();
  });
  document.querySelectorAll("[data-demo]").forEach((btn) => {
    btn.addEventListener("click", () => gsTutorialDemo(btn.dataset.demo));
  });

  document.getElementById("tryDemoBtn")?.addEventListener("click", () => gsLoadDemoTimes());

  document.getElementById("openShortcutsAppBtn")?.addEventListener("click", () => {
    window.location.href = "shortcuts://";
  });

  // Times edited by hand are no longer the example values.
  [clearTimeInput, fullTimeInput].forEach((input) => {
    input?.addEventListener("change", () => {
      localStorage.removeItem(GS_DEMO_KEY);
      gsRenderHome();
    });
  });
  // Instructor details may have changed.
  [instructorEmailInput, clientCodeInput, marginInput, document.getElementById("instructorPhone")].forEach((input) => {
    input?.addEventListener("change", () => {
      gsRenderReportControls();
      if (typeof renderPracticeScore === "function") renderPracticeScore();
      if (typeof gsCompareRenderScore === "function") gsCompareRenderScore();
      if (typeof gsSignalRenderScore === "function") gsSignalRenderScore();
    });
  });

  settingsModal?.addEventListener("close", () => {
    gsRenderHome();
    gsRenderReportControls();
  });
  document.getElementById("gestureLogWrap")?.addEventListener("toggle", gsRenderGestureLog);
  document.getElementById("a11yModal")?.addEventListener("close", gsRenderOwnSoundWording);

  gsBindSafetyNotes();
  gsBindDisclaimer();
}

function gsBoot() {
  gsLabelSections();
  gsBindShell();
  document.getElementById("sessionCodeBtn")?.addEventListener("click", () => { gsSessionCodeSubmit("card"); });
  document.getElementById("sessionCodeInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); gsSessionCodeSubmit("card"); }
  });
  document.getElementById("sessionCodeModalBtn")?.addEventListener("click", () => { gsSessionCodeSubmit("modal"); });
  document.getElementById("sessionCodeModalInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); gsSessionCodeSubmit("modal"); }
  });
  document.getElementById("sessionCodeLaterBtn")?.addEventListener("click", () => { gsCloseSessionCodeModal(); });
  const codeModal = document.getElementById("sessionCodeModal");
  codeModal?.addEventListener("close", () => {
    unlockPageScroll();
    setMainContentInert(false);
    // Focus lands on the Home card's field when still locked, so the next
    // swipe is the code, or on the first activity once unlocked.
    const target = gsIsUnlocked()
      ? document.querySelector(".step-card:not([hidden]) .step-button")
      : document.getElementById("sessionCodeInput");
    target?.focus({ preventScroll: true });
  });
  if (typeof gsFeaturesInit === "function") gsFeaturesInit();
  gsComparisonInit();
  gsSignalInit();
  if (typeof renderPracticeScore === "function") renderPracticeScore();
  gsRenderReportControls();
  gsBindNativeShortcuts();
  gsBindAndroidBack();

  // ?demo=1 — the conference link. Straight in, nothing to set up.
  const params = new URLSearchParams(window.location.search);
  const wantsDemo = params.get("demo") === "1";
  const needsDisclaimer = !localStorage.getItem(GS_DISCLAIMER_KEY);

  if (wantsDemo) {
    localStorage.setItem(GS_TUTORIAL_KEY, "true"); // no tutorial in the way
    if (!gsHasTimes() || gsUsingDemoTimes()) {
      gsLoadDemoTimes();
    } else {
      gsShowScreen("practice");
    }
    gsRenderDemoNote();
    // The O&M guidance is shown on first run even from the conference link.
    if (needsDisclaimer) setTimeout(() => gsShowDisclaimer({ thenTutorial: false }), 300);
    return;
  }

  gsShowScreen("home");
  gsRenderDemoNote();

  if (needsDisclaimer) {
    // Let the first paint settle before taking over the screen.
    setTimeout(() => gsShowDisclaimer({ thenTutorial: true }), 500);
  } else if (!localStorage.getItem(GS_TUTORIAL_KEY)) {
    setTimeout(() => gsRunTutorial(), 700);
  } else if (!gsIsUnlocked()) {
    // Still locked: ask for the session code (it is entered only once, build 19).
    setTimeout(() => gsShowSessionCodeModal("Enter your session code to start practicing."), 400);
  } else if (typeof offerOpenInApp === "function") {
    offerOpenInApp();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", gsBoot);
} else {
  gsBoot();
}

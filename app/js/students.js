/* ============================================================
 * CrossingTime — several students on one phone (build 20)
 * ============================================================
 *
 * Cindi, 1 Nov 2026: not every student has a phone, so the instructor's
 * phone keeps several students apart, each with their own code, start date,
 * crossing times, settings and practice history. In Instructor setup the
 * instructor chooses a student and the whole app starts again with that
 * student's data. Add asks for a code (never a name) and the date started
 * (today, on the phone's own clock, unless changed). Remove offers to export
 * the report first and asks for confirmation.
 *
 * How: the app keeps reading and writing localStorage exactly as before; that
 * is always the active student. The other students wait in one registry
 * key, om-students:
 *
 *   { active: id, list: [{ id, code, started }], data: { id: { key: value } } }
 *
 * Switching saves the active student's keys into the registry, puts the
 * chosen student's keys in their place, writes the durable copy at once
 * (store.js) and reloads, so every screen starts from the chosen student.
 *
 * Per student: every om-* key except the phone's own ones below, the
 * accessibility settings (om-a11y-*) included. Until build 21 those stayed
 * with the phone; Cindi, 4 Nov 2026 (tracker 20.5): when the instructor
 * selects a student, use that student's accessibility preferences. A new
 * student starts with the accessibility settings in use when they are added,
 * so nothing on the screen changes under the instructor; they are then
 * changed for that student alone. Students saved before build 22 get the
 * phone's settings once (gsStudentsLoad), so nobody's settings disappear.
 * ============================================================ */

const GS_STUDENTS_KEY = "om-students";
const GS_DEVICE_KEYS = new Set([
  GS_STUDENTS_KEY,
  "om-session-unlock", "om-unlocked", "om-lock-seen",
  "om-disclaimer-ack", "om-tutorial-seen", "om-settings-version",
  "om-instructor-pin", "om-instructor-phone", "om-instructor-email",
  "om-debug-replay"
]);

function gsIsStudentKey(key) {
  return typeof key === "string" && key.startsWith("om-") && !GS_DEVICE_KEYS.has(key);
}

/* The accessibility settings in use now, to give to a new student. */
function gsCurrentA11y() {
  const snap = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (typeof key === "string" && key.startsWith("om-a11y-")) snap[key] = localStorage.getItem(key);
  }
  return snap;
}

function gsStudentsLoad() {
  try {
    const raw = JSON.parse(localStorage.getItem(GS_STUDENTS_KEY) || "null");
    if (raw && Array.isArray(raw.list) && raw.list.length) {
      const registry = { active: raw.active, list: raw.list, data: raw.data && typeof raw.data === "object" ? raw.data : {} };
      if (raw.a11y !== 1) {
        // Saved before build 22, when accessibility stayed with the phone:
        // every waiting student gets the settings in use now, once.
        const a11y = gsCurrentA11y();
        registry.list.forEach((entry) => {
          if (entry.id === registry.active) return;
          registry.data[entry.id] = { ...a11y, ...(registry.data[entry.id] || { "om-client-code": entry.code }) };
        });
        try { gsStudentsSave(registry); } catch (error) { /* tried again next time */ }
      }
      registry.a11y = 1;
      return registry;
    }
  } catch (error) { /* a damaged registry means one student, as before */ }
  return null;
}

function gsStudentsSave(registry) {
  if (!registry || !registry.list.length) localStorage.removeItem(GS_STUDENTS_KEY);
  else localStorage.setItem(GS_STUDENTS_KEY, JSON.stringify({ ...registry, a11y: 1 }));
}

const GS_STUDENTS_FULL = "The phone's storage for this app is full, so nothing was changed. Export and remove a student you no longer need, or delete old practice history, then try again.";

/*
 * Every change to the students is one step that either happens completely or
 * not at all (tracker 20.1). The registry is saved first, with the student
 * who is leaving already inside it; only then is the live data swapped. If
 * either write fails (the storage is full), the registry and the live data
 * are put back exactly as they were and the instructor is told.
 */
function gsStudentsTransaction(registry, nextSnap) {
  const oldRaw = localStorage.getItem(GS_STUDENTS_KEY);
  const before = gsCaptureStudent();
  try {
    gsStudentsSave(registry);
  } catch (error) {
    try { if (oldRaw === null) localStorage.removeItem(GS_STUDENTS_KEY); else localStorage.setItem(GS_STUDENTS_KEY, oldRaw); } catch (e) { /* unchanged */ }
    return { ok: false, message: GS_STUDENTS_FULL };
  }
  try {
    gsApplyStudent(nextSnap);
  } catch (error) {
    // Put everything back: first free the half-written student, then the
    // old registry, then the student who was in use. All of it fitted before.
    try { gsApplyStudent({}); } catch (e) { /* keep going */ }
    try { if (oldRaw === null) localStorage.removeItem(GS_STUDENTS_KEY); else localStorage.setItem(GS_STUDENTS_KEY, oldRaw); } catch (e) { /* keep going */ }
    try { gsApplyStudent(before); } catch (e) { /* keep going */ }
    return { ok: false, message: GS_STUDENTS_FULL };
  }
  return { ok: true };
}

/* The other student on this phone who has this code, if any. */
function gsStudentsOwnerOf(rawCode, registry = gsStudentsLoad()) {
  const code = gsStudentCodeClean(rawCode);
  if (!registry || !code) return null;
  return registry.list.find((s) => s.code === code && s.id !== registry.active) || null;
}

/* The date on the phone's own clock, as YYYY-MM-DD (not UTC). */
function gsTodayLocal(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function gsStudentCodeClean(raw) {
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function gsStudentLabel(entry) {
  return entry && entry.code ? entry.code : "Student without a code";
}

function gsCaptureStudent() {
  const snap = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (gsIsStudentKey(key)) snap[key] = localStorage.getItem(key);
  }
  return snap;
}

function gsApplyStudent(snap) {
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (gsIsStudentKey(key)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
  Object.entries(snap || {}).forEach(([key, value]) => {
    if (gsIsStudentKey(key) && typeof value === "string") localStorage.setItem(key, value);
  });
}

function gsActiveStudent() {
  const registry = gsStudentsLoad();
  if (!registry) return null;
  return registry.list.find((s) => s.id === registry.active) || null;
}

/* The start date of the active student, for the report header. */
function gsStudentStarted() {
  return gsActiveStudent()?.started || "";
}

function gsNewStudentId() {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* Write the durable copy now, then start the app again with the new data. */
async function gsStudentsCommitAndReload(message) {
  try { sessionStorage.setItem("gs-students-note", message || ""); } catch (error) { /* ignore */ }
  try {
    if (window.gsStore?.commitNow) await window.gsStore.commitNow();
  } catch (error) { /* the reload still shows the data in localStorage */ }
  if (typeof window.__gsStudentsReload === "function") window.__gsStudentsReload();
  else window.location.reload();
}

/* The registry with the active student's code kept in step with the
 * Student code field (Instructor setup, or a setup link, may change it).
 * A code that another student on this phone already has is refused, and the
 * field goes back to the active student's own code (tracker 20.4). */
let gsStudentsRefusedCode = "";
function gsStudentsSynced() {
  const registry = gsStudentsLoad();
  if (!registry) return null;
  const active = registry.list.find((s) => s.id === registry.active);
  const code = gsStudentCodeClean(localStorage.getItem("om-client-code") || "");
  if (active && active.code !== code) {
    if (gsStudentsOwnerOf(code, registry)) {
      gsStudentsRefusedCode = code;
      try { localStorage.setItem("om-client-code", active.code || ""); } catch (error) { /* unchanged */ }
      const field = document.getElementById("clientCode");
      if (field) field.value = active.code || "";
      return registry;
    }
    active.code = code;
    try { gsStudentsSave(registry); } catch (error) { /* the code is saved with the next change */ }
  }
  return registry;
}

function gsStudentsAdd(rawCode, started) {
  const code = gsStudentCodeClean(rawCode);
  if (!code) return { ok: false, message: "Type a student code: letters and digits, up to 8. Never a name." };
  let registry = gsStudentsSynced();
  if (registry && registry.list.some((s) => s.code === code)) {
    return { ok: false, message: `There is already a student ${code} on this phone. Choose a different code.` };
  }
  const day = /^\d{4}-\d{2}-\d{2}$/.test(started || "") ? started : gsTodayLocal();
  if (!registry) {
    // The first time: the practice already on this phone becomes the first
    // student, under the code it already has (it may have none).
    registry = {
      active: gsNewStudentId(),
      list: [],
      data: {}
    };
    registry.list.push({
      id: registry.active,
      code: gsStudentCodeClean(localStorage.getItem("om-client-code") || ""),
      started: ""
    });
  }
  const id = gsNewStudentId();
  registry.list.push({ id, code, started: day });
  registry.data[registry.active] = gsCaptureStudent();
  registry.active = id;
  delete registry.data[id];
  const done = gsStudentsTransaction(registry, { ...gsCurrentA11y(), "om-client-code": code });
  return done.ok ? { ok: true, code } : done;
}

/* Returns { ok: true } or { ok: false, message }. */
function gsStudentsSwitch(id) {
  const registry = gsStudentsSynced();
  if (!registry || id === registry.active) return { ok: false, message: "" };
  const target = registry.list.find((s) => s.id === id);
  if (!target) return { ok: false, message: "" };
  const nextSnap = registry.data[id] || { "om-client-code": target.code };
  registry.data[registry.active] = gsCaptureStudent();
  delete registry.data[id];
  registry.active = id;
  return gsStudentsTransaction(registry, nextSnap);
}

/* Removes the active student and everything of theirs. Another student
 * becomes active; with none left the phone is back to one empty student. */
function gsStudentsRemoveActive() {
  const registry = gsStudentsSynced();
  if (!registry) return null;
  const leaving = registry.list.find((s) => s.id === registry.active);
  registry.list = registry.list.filter((s) => s.id !== registry.active);
  delete registry.data[registry.active];
  const next = registry.list[0] || null;
  // With nobody left, the accessibility settings in use stay on the phone.
  const nextSnap = next ? (registry.data[next.id] || { "om-client-code": next.code }) : gsCurrentA11y();
  if (next) {
    delete registry.data[next.id];
    registry.active = next.id;
  }
  // Removing frees space, so it fits; still all or nothing.
  const done = gsStudentsTransaction(next ? registry : null, nextSnap);
  return done.ok ? { removed: leaving, next } : { removed: null, next: null, message: done.message };
}

function gsStudentsSetStarted(day) {
  const registry = gsStudentsSynced();
  if (!registry) return;
  const active = registry.list.find((s) => s.id === registry.active);
  if (!active || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  active.started = day;
  try { gsStudentsSave(registry); } catch (error) { gsStudentsNote(GS_STUDENTS_FULL); }
}

/*
 * A setup link on a phone with several students (tracker 20.4). The link is
 * made for one student, by code:
 *   - another student on this phone has that code: switch to that student
 *     first, then the link is applied to them (after the restart);
 *   - no student has it and the student in use already has a different code:
 *     the link is for a new student, who is added and then set up;
 *   - otherwise (the student in use has that code, or no code yet, or the
 *     phone has one student): the link is applied as before.
 * Returns true when the app is restarting to do it; the link stays in the
 * address so it is applied after the restart.
 */
function gsStudentsRouteSetupLink(code) {
  const registry = gsStudentsSynced();
  const clean = gsStudentCodeClean(code);
  if (!registry || !clean) return false;
  const active = registry.list.find((s) => s.id === registry.active);
  const owner = gsStudentsOwnerOf(clean, registry);
  let result = null;
  let message = "";
  if (owner) {
    result = gsStudentsSwitch(owner.id);
    message = `This setup link is for student ${clean}. The app now shows ${clean}'s practice, with the instructor's setup.`;
  } else if (active && active.code && active.code !== clean) {
    result = gsStudentsAdd(clean, gsTodayLocal());
    message = `This setup link is for student ${clean}, who was not on this phone. Student ${clean} was added, with the instructor's setup.`;
  } else {
    return false;
  }
  if (!result.ok) {
    try { sessionStorage.setItem("gs-students-note", result.message || GS_STUDENTS_FULL); } catch (error) { /* ignore */ }
    return false;
  }
  gsStudentsCommitAndReload(message);
  return true;
}

/* ---------------- screen ---------------- */

function gsStudentsNote(message) {
  const note = document.getElementById("studentsNote");
  if (note) note.textContent = message || "";
  if (message && typeof announceScreenReader === "function") announceScreenReader(message);
}

function gsRenderStudents() {
  const registry = gsStudentsSynced();
  const many = Boolean(registry);
  const none = document.getElementById("studentsNone");
  const pickWrap = document.getElementById("studentPickWrap");
  const select = document.getElementById("studentSelect");
  const started = document.getElementById("studentStarted");
  const remove = document.getElementById("removeStudentBtn");
  if (none) none.hidden = many;
  if (pickWrap) pickWrap.hidden = !many;
  if (remove) remove.hidden = !many;
  if (many && select) {
    select.innerHTML = "";
    registry.list.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = gsStudentLabel(entry);
      option.selected = entry.id === registry.active;
      select.appendChild(option);
    });
  }
  const active = many ? registry.list.find((s) => s.id === registry.active) : null;
  if (started) started.value = active?.started || "";
  if (remove) remove.textContent = active ? `Remove student ${gsStudentLabel(active)}` : "Remove this student";
  gsRenderStudentLine();
}

/* Home says whose practice this is, once there is more than one student. */
function gsRenderStudentLine() {
  const line = document.getElementById("homeStudent");
  if (!line) return;
  const registry = gsStudentsLoad();
  const active = registry ? registry.list.find((s) => s.id === registry.active) : null;
  line.hidden = !active;
  line.textContent = active ? `Student: ${gsStudentLabel(active)}. Change it in Instructor setup.` : "";
}

function gsOpenAddStudent() {
  const form = document.getElementById("addStudentForm");
  if (!form) return;
  form.hidden = false;
  const code = document.getElementById("newStudentCode");
  const day = document.getElementById("newStudentStarted");
  if (code) code.value = "";
  if (day) day.value = gsTodayLocal();
  gsStudentsNote("");
  code?.focus();
}

function gsCloseAddStudent() {
  const form = document.getElementById("addStudentForm");
  if (form) form.hidden = true;
  document.getElementById("addStudentBtn")?.focus({ preventScroll: true });
}

function gsSaveNewStudent() {
  const code = document.getElementById("newStudentCode")?.value || "";
  const day = document.getElementById("newStudentStarted")?.value || "";
  const result = gsStudentsAdd(code, day);
  if (!result.ok) {
    gsStudentsNote(result.message);
    document.getElementById("newStudentCode")?.focus();
    return;
  }
  gsStudentsCommitAndReload(`Student ${result.code} added. The app now shows ${result.code}'s practice. Set the crossing times for ${result.code} below.`);
}

function gsOpenRemoveStudent() {
  const active = gsActiveStudent();
  const dialog = document.getElementById("removeStudentModal");
  if (!active || !dialog || typeof dialog.showModal !== "function") return;
  const name = gsStudentLabel(active);
  const title = document.getElementById("removeStudentTitle");
  if (title) title.textContent = `Remove student ${name}?`;
  const what = document.getElementById("removeStudentWhat");
  // Where it goes, as Delete history says it (tracker 20.3).
  const phone = Boolean(window.Capacitor?.isNativePlatform?.());
  const where = phone ? "from this phone now, and from your phone's backup at its next backup" : "from this browser";
  if (what) what.textContent = `This deletes ${name}'s crossing times, settings and practice history ${where}. It cannot be undone.`;
  if (!dialog.open) {
    if (typeof lockPageScroll === "function") lockPageScroll();
    if (typeof setMainContentInert === "function") setMainContentInert(true);
    dialog.showModal();
  }
  title?.focus();
}

function gsCloseRemoveStudent() {
  const dialog = document.getElementById("removeStudentModal");
  if (dialog?.open) dialog.close();
}

function gsConfirmRemoveStudent() {
  const result = gsStudentsRemoveActive();
  if (result && !result.removed) {
    const note = document.getElementById("removeStudentNote");
    if (note) note.textContent = result.message;
    return;
  }
  gsCloseRemoveStudent();
  if (!result) return;
  const gone = gsStudentLabel(result.removed);
  gsStudentsCommitAndReload(result.next
    ? `Student ${gone} removed. The app now shows ${gsStudentLabel(result.next)}'s practice.`
    : `Student ${gone} removed. No students are left; the app starts empty.`);
}

function gsBindStudents() {
  document.getElementById("addStudentBtn")?.addEventListener("click", gsOpenAddStudent);
  document.getElementById("cancelNewStudentBtn")?.addEventListener("click", gsCloseAddStudent);
  document.getElementById("saveNewStudentBtn")?.addEventListener("click", gsSaveNewStudent);
  document.getElementById("newStudentCode")?.addEventListener("input", (event) => {
    const cleaned = gsStudentCodeClean(event.target.value);
    if (event.target.value !== cleaned) event.target.value = cleaned;
  });
  document.getElementById("studentSelect")?.addEventListener("change", (event) => {
    const registry = gsStudentsLoad();
    const target = registry?.list.find((s) => s.id === event.target.value);
    if (!target) return;
    const result = gsStudentsSwitch(target.id);
    if (!result.ok) {
      if (result.message) gsStudentsNote(result.message);
      gsRenderStudents();
      return;
    }
    gsStudentsCommitAndReload(`Now showing student ${gsStudentLabel(target)}.`);
  });
  document.getElementById("studentStarted")?.addEventListener("change", (event) => {
    gsStudentsSetStarted(event.target.value);
    gsStudentsNote(event.target.value ? "Date started saved." : "");
  });
  document.getElementById("removeStudentBtn")?.addEventListener("click", gsOpenRemoveStudent);
  document.getElementById("cancelRemoveStudentBtn")?.addEventListener("click", gsCloseRemoveStudent);
  document.getElementById("confirmRemoveStudentBtn")?.addEventListener("click", gsConfirmRemoveStudent);
  // Waits for the export and says what really happened (tracker 20.15).
  document.getElementById("exportRemoveStudentBtn")?.addEventListener("click", async () => {
    const note = document.getElementById("removeStudentNote");
    const button = document.getElementById("exportRemoveStudentBtn");
    if (typeof gsExportCsv !== "function") return;
    if (note) note.textContent = "Exporting…";
    if (button) button.disabled = true;
    let result = null;
    try { result = await gsExportCsv(); } catch (error) { result = null; }
    if (button) button.disabled = false;
    const outcome = result?.outcome || "failed";
    const said = result?.message || "Could not export.";
    const text = outcome === "cancelled" || outcome === "failed"
      ? `${said} The practice history has not been saved anywhere else.`
      : `${said} When it is saved or sent, you can remove the student.`;
    if (note) note.textContent = text;
    if (typeof announceScreenReader === "function") announceScreenReader(text);
  });
  document.getElementById("removeStudentModal")?.addEventListener("close", () => {
    const note = document.getElementById("removeStudentNote");
    if (note) note.textContent = "";
    if (typeof gsAnyDialogOpen === "function" && !gsAnyDialogOpen()) {
      if (typeof unlockPageScroll === "function") unlockPageScroll();
      if (typeof setMainContentInert === "function") setMainContentInert(false);
    }
    document.getElementById("removeStudentBtn")?.focus({ preventScroll: true });
  });
  document.getElementById("clientCode")?.addEventListener("change", () => {
    gsStudentsRefusedCode = "";
    gsRenderStudents();
    if (gsStudentsRefusedCode) {
      const code = gsStudentsRefusedCode;
      gsStudentsRefusedCode = "";
      gsStudentsNote(`There is already a student ${code} on this phone. To work with ${code}, choose them under Students on this phone.`);
    }
  });

  gsRenderStudents();
  // Said once after the switch that reloaded the app.
  let note = "";
  try {
    note = sessionStorage.getItem("gs-students-note") || "";
    sessionStorage.removeItem("gs-students-note");
  } catch (error) { /* ignore */ }
  if (note) {
    window.__gsStudentsAfterReload = note;
    setTimeout(() => {
      if (typeof gsShowScreen === "function") gsShowScreen("instructor");
      gsStudentsNote(note);
    }, 300);
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", gsBindStudents);
else gsBindStudents();

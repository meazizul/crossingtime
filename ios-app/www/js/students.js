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
 * Per student: every om-* key except the phone's own ones below. The
 * accessibility settings (om-a11y-*) stay with the phone: they describe how
 * the phone is being used, and the instructor may use it with VoiceOver.
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
  return typeof key === "string" && key.startsWith("om-") && !key.startsWith("om-a11y-") && !GS_DEVICE_KEYS.has(key);
}

function gsStudentsLoad() {
  try {
    const raw = JSON.parse(localStorage.getItem(GS_STUDENTS_KEY) || "null");
    if (raw && Array.isArray(raw.list) && raw.list.length) {
      return { active: raw.active, list: raw.list, data: raw.data && typeof raw.data === "object" ? raw.data : {} };
    }
  } catch (error) { /* a damaged registry means one student, as before */ }
  return null;
}

function gsStudentsSave(registry) {
  if (!registry || !registry.list.length) localStorage.removeItem(GS_STUDENTS_KEY);
  else localStorage.setItem(GS_STUDENTS_KEY, JSON.stringify(registry));
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
 * Student code field (Instructor setup, or a setup link, may change it). */
function gsStudentsSynced() {
  const registry = gsStudentsLoad();
  if (!registry) return null;
  const active = registry.list.find((s) => s.id === registry.active);
  const code = gsStudentCodeClean(localStorage.getItem("om-client-code") || "");
  if (active && active.code !== code) {
    active.code = code;
    gsStudentsSave(registry);
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
  gsApplyStudent({ "om-client-code": code });
  registry.active = id;
  delete registry.data[id];
  gsStudentsSave(registry);
  return { ok: true, code };
}

function gsStudentsSwitch(id) {
  const registry = gsStudentsSynced();
  if (!registry || id === registry.active) return false;
  const target = registry.list.find((s) => s.id === id);
  if (!target) return false;
  registry.data[registry.active] = gsCaptureStudent();
  gsApplyStudent(registry.data[id] || { "om-client-code": target.code });
  delete registry.data[id];
  registry.active = id;
  gsStudentsSave(registry);
  return true;
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
  gsApplyStudent(next ? (registry.data[next.id] || { "om-client-code": next.code }) : {});
  if (next) {
    delete registry.data[next.id];
    registry.active = next.id;
  }
  gsStudentsSave(next ? registry : null);
  return { removed: leaving, next };
}

function gsStudentsSetStarted(day) {
  const registry = gsStudentsSynced();
  if (!registry) return;
  const active = registry.list.find((s) => s.id === registry.active);
  if (!active || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  active.started = day;
  gsStudentsSave(registry);
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
  if (what) what.textContent = `This deletes ${name}'s crossing times, settings and practice history from this phone. It cannot be undone.`;
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
    if (!target || !gsStudentsSwitch(target.id)) return;
    gsStudentsCommitAndReload(`Now showing student ${gsStudentLabel(target)}.`);
  });
  document.getElementById("studentStarted")?.addEventListener("change", (event) => {
    gsStudentsSetStarted(event.target.value);
    gsStudentsNote(event.target.value ? "Date started saved." : "");
  });
  document.getElementById("removeStudentBtn")?.addEventListener("click", gsOpenRemoveStudent);
  document.getElementById("cancelRemoveStudentBtn")?.addEventListener("click", gsCloseRemoveStudent);
  document.getElementById("confirmRemoveStudentBtn")?.addEventListener("click", gsConfirmRemoveStudent);
  document.getElementById("exportRemoveStudentBtn")?.addEventListener("click", () => {
    if (typeof gsExportCsv === "function") gsExportCsv();
    const note = document.getElementById("removeStudentNote");
    if (note) note.textContent = "The report file was handed to your phone. When it is saved or sent, you can remove the student.";
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
  document.getElementById("clientCode")?.addEventListener("change", () => gsRenderStudents());

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

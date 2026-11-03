// Build 20 (Cindi, 1 Nov 2026): verbosity levels with the replay word and the
// spoken results as their own switches, no separate visual replay switch,
// several students on one phone, no QR codes (build14-reports.spec.mjs).
import { test, expect } from "@playwright/test";
import { openApp, setTimes, watchErrors } from "./helpers.mjs";

async function openA11y(page) {
  await page.evaluate(() => document.getElementById("a11yModal").showModal());
}

test("verbosity: Medium by default; Low turns off the replay word and the spoken results, High turns them on; each stays its own switch", async ({ page }) => {
  await openApp(page);
  await openA11y(page);
  await expect(page.locator("#a11yVerbosity")).toHaveValue("medium");
  await expect(page.locator("#a11ySayReplay")).toBeChecked();
  await expect(page.locator("#a11yDescribeSounds")).toBeChecked();
  await expect(page.locator("label:has(#a11yDescribeSounds)")).toContainText("Announce results and describe the sounds");

  await page.selectOption("#a11yVerbosity", "low");
  await expect(page.locator("#a11ySayReplay")).not.toBeChecked();
  await expect(page.locator("#a11yDescribeSounds")).not.toBeChecked();
  expect(await page.evaluate(() => [a11ySettings.verbosity, a11ySettings.sayReplay, a11ySettings.describeSounds])).toEqual(["low", false, false]);

  // A switch can still be turned on by itself at Low.
  await page.check("#a11ySayReplay");
  expect(await page.evaluate(() => a11ySettings.sayReplay)).toBe(true);

  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  expect(await page.evaluate(() => [a11ySettings.verbosity, a11ySettings.sayReplay, a11ySettings.describeSounds])).toEqual(["low", true, false]);

  await openA11y(page);
  await page.selectOption("#a11yVerbosity", "high");
  await expect(page.locator("#a11ySayReplay")).toBeChecked();
  await expect(page.locator("#a11yDescribeSounds")).toBeChecked();
});

test("verbosity: Low says only the screen's name, High adds what is on the screen", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  const spoken = await page.evaluate(() => {
    const said = [];
    window.gsSpeak = (text) => { said.push(text); return true; };
    a11ySettings.selfVoice = true;
    a11ySettings.verbosity = "low";
    gsShowScreen("progress");
    a11ySettings.verbosity = "medium";
    gsShowScreen("instructor");
    a11ySettings.verbosity = "high";
    gsShowScreen("instructor");
    return said;
  });
  expect(spoken[0]).toBe("Progress");
  expect(spoken[1]).toMatch(/^Instructor setup\. For the O&M Specialist/);
  expect(spoken[1]).not.toContain("On this screen");
  expect(spoken[2]).toContain("On this screen. Sections: Students on this phone, Crossing times");
  expect(spoken[2]).toMatch(/Buttons: .*Add a student/);
});

test("High verbosity with a screen reader: the layout goes to the screen reader after the heading", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { window.__gsScreenReader = true; a11ySettings.verbosity = "high"; gsShowScreen("help"); });
  await page.waitForTimeout(1700);
  expect(await page.evaluate(() => document.getElementById("srAnnouncer").textContent)).toContain("On this screen.");
});

test("no synchronized visual replay switch: the on-screen replay follows the feedback mode, and an old 'off' no longer hides it", async ({ page }) => {
  await openApp(page, { storage: { "om-a11y-output-mode": "audio-visual", "om-a11y-sync-visual-replay": "false" } });
  await openA11y(page);
  await expect(page.locator("#a11ySyncVisualReplay")).toHaveCount(0);
  await expect(page.locator("#a11yModal")).toContainText("every replay is also shown on the screen");
  expect(await page.evaluate(() => a11ySettings.syncVisualReplay)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("om-a11y-sync-visual-replay"))).toBeNull();
});

/* ---------------- several students ---------------- */

async function reloadAfter(page, action) {
  await Promise.all([page.waitForEvent("load"), action()]);
  await page.waitForFunction(() => typeof gsBoot === "function" && typeof gsRenderStudents === "function");
}

async function addStudent(page, code, day = null) {
  await page.click("#addStudentBtn");
  await page.fill("#newStudentCode", code);
  if (day) await page.fill("#newStudentStarted", day);
  await reloadAfter(page, () => page.click("#saveNewStudentBtn"));
}

async function chooseStudent(page, code) {
  const value = await page.evaluate((c) => gsStudentsLoad().list.find((s) => s.code === c).id, code);
  await page.evaluate(() => gsShowScreen("instructor"));
  await reloadAfter(page, () => page.selectOption("#studentSelect", value));
}

const one = { time: Date.now(), activity: "compare", street: "full", userSec: 9, refSec: 8, diffSec: 1, correct: true, marginSec: 0.4, answer: "longer", expected: "longer" };

test("several students: the practice already here stays with the first student; a new one starts empty with today's date", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { storage: { "om-client-code": "AB1", "om-attempt-log": JSON.stringify([one]), "om-a11y-text-size": "large" } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await expect(page.locator("#studentsNone")).toBeVisible();
  await expect(page.locator("#studentPickWrap")).toBeHidden();
  await expect(page.locator("#removeStudentBtn")).toBeHidden();

  await page.click("#addStudentBtn");
  const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  await expect(page.locator("#newStudentStarted")).toHaveValue(today);
  await page.fill("#newStudentCode", "cd 2!");
  await expect(page.locator("#newStudentCode")).toHaveValue("CD2");
  await reloadAfter(page, () => page.click("#saveNewStudentBtn"));

  // The app starts again as CD2: no times, no history, today's date.
  await expect(page.locator("#screen-instructor")).toBeVisible();
  await expect(page.locator("#studentsNote")).toContainText("Student CD2 added");
  expect(await page.evaluate(() => [localStorage.getItem("om-client-code"), gsHasTimes(), gsLoadHistory().length])).toEqual(["CD2", false, 0]);
  await expect(page.locator("#studentSelect option")).toHaveText(["AB1", "CD2"]);
  await expect(page.locator("#studentSelect")).toHaveValue(await page.evaluate(() => gsStudentsLoad().active));
  await expect(page.locator("#studentStarted")).toHaveValue(today);
  await expect(page.locator("#clientCode")).toHaveValue("CD2");
  // Accessibility stays with the phone.
  expect(await page.evaluate(() => localStorage.getItem("om-a11y-text-size"))).toBe("large");
  // The report carries the code and the date started.
  expect(await page.evaluate(() => gsReportText())).toContain(`Student code: CD2\nDate started: ${today}`);

  await page.evaluate(() => gsShowScreen("home"));
  await expect(page.locator("#homeStudent")).toHaveText("Student: CD2. Change it in Instructor setup.");

  // Back to AB1: everything of AB1's returns.
  await chooseStudent(page, "AB1");
  expect(await page.evaluate(() => [localStorage.getItem("om-client-code"), gsHasTimes(), gsLoadHistory().length, localStorage.getItem("om-full-time")]))
    .toEqual(["AB1", true, 1, "8"]);
  await expect(page.locator("#studentsNote")).toContainText("Now showing student AB1");
  expect(errors).toEqual([]);
});

test("several students: a code is required and must be new; the date started can be changed", async ({ page }) => {
  await openApp(page, { storage: { "om-client-code": "AB1" } });
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.click("#addStudentBtn");
  await page.click("#saveNewStudentBtn");
  await expect(page.locator("#studentsNote")).toContainText("Type a student code");
  await addStudent(page, "CD2", "2026-10-01");
  await page.click("#addStudentBtn");
  await page.fill("#newStudentCode", "AB1");
  await page.click("#saveNewStudentBtn");
  await expect(page.locator("#studentsNote")).toContainText("already a student AB1");
  await page.click("#cancelNewStudentBtn");
  await expect(page.locator("#addStudentForm")).toBeHidden();
  await expect(page.locator("#studentStarted")).toHaveValue("2026-10-01");
  await page.fill("#studentStarted", "2026-10-15");
  await page.locator("#studentStarted").dispatchEvent("change");
  expect(await page.evaluate(() => gsStudentStarted())).toBe("2026-10-15");
});

test("several students: a changed student code follows the student in the list", async ({ page }) => {
  await openApp(page, { storage: { "om-client-code": "AB1" } });
  await page.evaluate(() => gsShowScreen("instructor"));
  await addStudent(page, "CD2");
  await page.fill("#clientCode", "CD3");
  await page.locator("#clientCode").dispatchEvent("change");
  await expect(page.locator("#studentSelect option")).toHaveText(["AB1", "CD3"]);
});

test("several students: the durable copy keeps every student, and a new empty student is still saved", async ({ page }) => {
  await openApp(page, { storage: { "om-client-code": "AB1", "om-attempt-log": JSON.stringify([one]) } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await addStudent(page, "CD2");
  await page.evaluate(async () => { await gsStore.syncNow(); gsStore.simulateLoss(); });
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function" && gsStore.status().restored === false && localStorage.getItem("om-students"));
  expect(await page.evaluate(() => [localStorage.getItem("om-client-code"), gsStudentsLoad().list.map((s) => s.code)])).toEqual(["CD2", ["AB1", "CD2"]]);
  // AB1's data is still there, waiting.
  await chooseStudent(page, "AB1");
  expect(await page.evaluate(() => [gsHasTimes(), gsLoadHistory().length])).toEqual([true, 1]);
});

test("several students: Remove offers the report first, asks to confirm, and deletes only that student", async ({ page }) => {
  await openApp(page, { storage: { "om-client-code": "AB1", "om-attempt-log": JSON.stringify([one]) } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await addStudent(page, "CD2");
  await setTimes(page, "3", "6", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await expect(page.locator("#removeStudentBtn")).toHaveText("Remove student CD2");
  await page.click("#removeStudentBtn");
  await expect(page.locator("#removeStudentModal")).toBeVisible();
  await expect(page.locator("#removeStudentTitle")).toHaveText("Remove student CD2?");
  await expect(page.locator("#removeStudentTitle")).toBeFocused();
  // Export first: the CSV of CD2 downloads in a browser.
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#exportRemoveStudentBtn")]);
  expect(download.suggestedFilename()).toMatch(/CD2/);
  // Cancel keeps everything.
  await page.click("#cancelRemoveStudentBtn");
  await expect(page.locator("#removeStudentModal")).toBeHidden();
  expect(await page.evaluate(() => gsStudentsLoad().list.length)).toBe(2);
  // Remove.
  await page.click("#removeStudentBtn");
  await reloadAfter(page, () => page.click("#confirmRemoveStudentBtn"));
  await expect(page.locator("#studentsNote")).toContainText("Student CD2 removed. The app now shows AB1's practice.");
  expect(await page.evaluate(() => [localStorage.getItem("om-client-code"), localStorage.getItem("om-full-time"), gsLoadHistory().length, gsStudentsLoad().list.map((s) => s.code)]))
    .toEqual(["AB1", "8", 1, ["AB1"]]);
  // The last one: back to one empty student, no list.
  await page.click("#removeStudentBtn");
  await reloadAfter(page, () => page.click("#confirmRemoveStudentBtn"));
  expect(await page.evaluate(() => [gsStudentsLoad(), localStorage.getItem("om-client-code"), gsHasTimes(), gsLoadHistory().length])).toEqual([null, null, false, 0]);
  await expect(page.locator("#studentsNone")).toBeVisible();
  await page.evaluate(() => gsShowScreen("home"));
  await expect(page.locator("#homeStudent")).toBeHidden();
});

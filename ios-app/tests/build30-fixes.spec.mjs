// Build 30: Cindi's three build 29 entries.
//   29.1  on first launch of a locked phone, the session code comes first;
//         then the O&M notice and the tutorial, each once.
//   29.2  the link the installed app was opened with is applied once, so a
//         student switch or add is not undone by the restart that follows.
//   29.3  a setup link opened in a browser offers the app first, before the
//         notice, tutorial and code; the offer is still there after the code.
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openApp, setTimes, watchErrors } from "./helpers.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const codesFile = process.env.GS_CODES_FILE || path.resolve(here, "../../../machine-setup/session-codes.env");
const CODES = {};
try {
  for (const line of fs.readFileSync(codesFile, "utf8").split("\n")) {
    const m = line.match(/^GS_(TESTER)_CODE=(\S+)/);
    if (m) CODES[m[1].toLowerCase()] = m[2];
  }
} catch { /* public clone: no codes */ }
const lockOff = /const GS_SESSION_LOCK_ENABLED = false/.test(fs.readFileSync(path.resolve(here, "../www/js/app.js"), "utf8"));

const isOpen = (page, id) => page.evaluate((i) => Boolean(document.getElementById(i)?.open), id);

/* ---------------- 29.1: the session code first ---------------- */

test("29.1: first launch of a locked phone opens the session code first; Later goes on to the notice, then the tutorial, each once", async ({ page }) => {
  test.skip(lockOff, "lock switched off");
  const errors = watchErrors(page);
  await openApp(page, { locked: true, disclaimerSeen: false, tutorialSeen: false });
  await expect(page.locator("#sessionCodeModal")).toBeVisible();
  expect(await isOpen(page, "disclaimerModal")).toBe(false);
  expect(await isOpen(page, "tutorialModal")).toBe(false);

  await page.click("#sessionCodeLaterBtn");
  await expect(page.locator("#disclaimerModal")).toBeVisible();
  await page.click("#disclaimerAcceptBtn");
  await expect(page.locator("#tutorialModal")).toBeVisible();
  await page.click("#closeTutorial");
  // The code is not asked for a second time in the same start.
  await page.waitForTimeout(800);
  expect(await isOpen(page, "sessionCodeModal")).toBe(false);
  expect(await isOpen(page, "disclaimerModal")).toBe(false);
  await expect(page.locator("#sessionCodeCard")).toBeVisible();
  expect(errors).toEqual([]);
});

test("29.1: entering the code in the first pop-up unlocks, then the notice and the tutorial follow", async ({ page }) => {
  test.skip(lockOff, "lock switched off");
  test.skip(!CODES.tester, "no session codes in a public clone");
  await openApp(page, { locked: true, disclaimerSeen: false, tutorialSeen: false });
  await expect(page.locator("#sessionCodeModal")).toBeVisible();
  await page.fill("#sessionCodeModalInput", CODES.tester);
  await page.click("#sessionCodeModalBtn");
  await expect(page.locator("#disclaimerModal")).toBeVisible();
  expect(await page.evaluate(() => gsIsUnlocked())).toBe(true);
  await page.click("#disclaimerAcceptBtn");
  await expect(page.locator("#tutorialModal")).toBeVisible();
  await page.click("#closeTutorial");
  await page.waitForTimeout(800);
  expect(await isOpen(page, "sessionCodeModal")).toBe(false);
});

test("29.1: a later start goes straight to the code while still locked, with no notice or tutorial again", async ({ page }) => {
  test.skip(lockOff, "lock switched off");
  await openApp(page, { locked: true });
  await expect(page.locator("#sessionCodeModal")).toBeVisible();
  await page.click("#sessionCodeLaterBtn");
  await page.waitForTimeout(800);
  expect(await isOpen(page, "disclaimerModal")).toBe(false);
  expect(await isOpen(page, "tutorialModal")).toBe(false);
});

/* ---------------- 29.3: a setup link in a browser offers the app first ---------------- */

async function makeLink(page) {
  await openApp(page);
  await setTimes(page, "3.5", "7.2", "0.3");
  return page.evaluate(() => buildShareTimingLink());
}

test("29.3: a setup link in a browser with no saved data offers the app first, before the code, notice and tutorial", async ({ page }) => {
  test.skip(lockOff, "lock switched off");
  const errors = watchErrors(page);
  const link = await makeLink(page);
  // A private window: nothing saved, still locked.
  await openApp(page, { locked: true, disclaimerSeen: false, tutorialSeen: false });
  // A query makes this a fresh page load, as a tapped link is.
  await page.goto(link.replace("index.html#", "index.html?from=link#"));
  await page.waitForFunction(() => typeof gsBoot === "function");
  await expect(page.locator("#openInAppModal")).toHaveJSProperty("open", true);
  expect(await isOpen(page, "sessionCodeModal")).toBe(false);
  expect(await isOpen(page, "disclaimerModal")).toBe(false);
  expect(await page.getAttribute("#openInAppLink", "href")).toMatch(/^gapsense:\/\/setup\?ts=4[A-Za-z0-9_-]+$/);

  // "Not now": the browser carries on with its own first run.
  await page.click("#openInAppClose");
  await expect(page.locator("#sessionCodeModal")).toBeVisible();
  await page.click("#sessionCodeLaterBtn");
  await expect(page.locator("#disclaimerModal")).toBeVisible();
  await page.click("#disclaimerAcceptBtn");
  await expect(page.locator("#tutorialModal")).toBeVisible();
  await page.click("#closeTutorial");
  await page.waitForTimeout(800);
  expect(await isOpen(page, "openInAppModal")).toBe(false);   // offered once per start
  expect(errors).toEqual([]);
});

test("29.3: after the code is entered on Home, the offer to open the app is still there", async ({ page }) => {
  test.skip(lockOff, "lock switched off");
  test.skip(!CODES.tester, "no session codes in a public clone");
  const link = await makeLink(page);
  await openApp(page, { locked: true });
  await page.goto(link.replace("index.html#", "index.html?from=link#"));
  await page.waitForFunction(() => typeof gsBoot === "function");
  await expect(page.locator("#openInAppModal")).toHaveJSProperty("open", true);
  await page.click("#openInAppClose");
  await expect(page.locator("#sessionCodeModal")).toBeVisible();
  await page.click("#sessionCodeLaterBtn");
  // The pop-up's close hands focus to the Home field; type once it has it.
  await expect(page.locator("#sessionCodeInput")).toBeFocused();
  await page.fill("#sessionCodeInput", CODES.tester);
  await page.click("#sessionCodeBtn");
  await expect(page.locator("#sessionCodeNote")).toContainText("Unlocked");
  await expect(page.locator("#openInAppModal")).toHaveJSProperty("open", true);
});

/* ---------------- 29.2: the launch link is applied once ---------------- */

async function reloadAfter(page, action) {
  await Promise.all([page.waitForEvent("load"), action()]);
  await page.waitForFunction(() => typeof gsBoot === "function" && typeof gsRenderStudents === "function");
}

async function addStudent(page, code) {
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.click("#addStudentBtn");
  await page.fill("#newStudentCode", code);
  await reloadAfter(page, () => page.click("#saveNewStudentBtn"));
}

const idOf = (page, code) => page.evaluate((c) => gsStudentsLoad().list.find((s) => s.code === c).id, code);
const activeCode = (page) => page.evaluate(() => gsStudentsLoad().list.find((s) => s.id === gsStudentsLoad().active).code);

test("29.2: opened from a setup link, the installed app still switches students, and stays in Instructor setup", async ({ page }) => {
  // Two students; a setup link made for CD2.
  await openApp(page, { storage: { "om-client-code": "AB1" } });
  await setTimes(page, "4", "8", "0.4");
  await addStudent(page, "CD2");
  await setTimes(page, "5", "9", "0.5");
  const token = (await page.evaluate(() => buildShareTimingLink())).split("#ts=")[1];
  await page.evaluate(() => gsShowScreen("instructor"));
  await reloadAfter(page, async () => page.selectOption("#studentSelect", await idOf(page, "AB1")));
  expect(await activeCode(page)).toBe("AB1");

  // From now on this is the installed app, opened from that link. The phone
  // hands back the same launch link on every start of the page.
  await page.addInitScript((url) => {
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      Plugins: {
        App: {
          getInfo: async () => ({ version: "1.0", build: "30" }),
          addListener: () => {},
          getLaunchUrl: async () => ({ url })
        },
        StatusBar: { setStyle: async () => {} }
      }
    };
  }, `gapsense://setup?ts=${token}`);

  // The link switches to CD2 (one restart) and the student stays on Home.
  await reloadAfter(page, () => page.reload());
  await page.waitForFunction(() => gsStudentsLoad().list.find((s) => s.id === gsStudentsLoad().active).code === "CD2");
  await page.waitForLoadState("load");
  await page.waitForFunction(() => typeof gsRenderStudents === "function");
  await page.waitForTimeout(600);
  expect(await activeCode(page)).toBe("CD2");

  // The instructor now chooses AB1. Before build 30 the restart applied the
  // launch link again and the app went back to CD2, on Home.
  await page.evaluate(() => gsShowScreen("instructor"));
  await reloadAfter(page, async () => page.selectOption("#studentSelect", await idOf(page, "AB1")));
  await page.waitForTimeout(800);
  expect(await activeCode(page)).toBe("AB1");
  await expect(page.locator("#screen-instructor")).toBeVisible();
  await expect(page.locator("#clientCode")).toHaveValue("AB1");
  expect(await page.evaluate(() => [clearTimeInput.value, fullTimeInput.value])).toEqual(["4", "8"]);
});

test("29.2: an instructor's switch lands in Instructor setup even when a refused link left the stay-on-Home mark", async ({ page }) => {
  await openApp(page, { storage: { "om-client-code": "AB1" } });
  await setTimes(page, "4", "8", "0.4");
  await addStudent(page, "CD2");
  await page.evaluate(() => sessionStorage.setItem("gs-students-note-where", "home"));
  await page.evaluate(() => gsShowScreen("instructor"));
  await reloadAfter(page, async () => page.selectOption("#studentSelect", await idOf(page, "AB1")));
  await page.waitForTimeout(600);
  await expect(page.locator("#screen-instructor")).toBeVisible();
  expect(await activeCode(page)).toBe("AB1");
});

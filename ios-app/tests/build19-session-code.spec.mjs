// Build 19: the session code is entered once (a pop-up until then), the
// four activities wait for it, and the app is CrossingTime. Three codes:
// tester (any time) and one per SOMA presentation (only in its window).
// The real codes are private: they are read from the hub's
// machine-setup/session-codes.env, and the tests that need them are skipped
// when that file is not there (a clone of the public repo).
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openApp, setTimes, screenVisible, announcer, watchErrors } from "./helpers.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const codesFile = process.env.GS_CODES_FILE || path.resolve(here, "../../../machine-setup/session-codes.env");
const CODES = {};
try {
  for (const line of fs.readFileSync(codesFile, "utf8").split("\n")) {
    const m = line.match(/^GS_(TESTER|SESSION1|SESSION2)_CODE=(\S+)/);
    if (m) CODES[m[1].toLowerCase()] = m[2];
  }
} catch { /* public clone: no codes */ }
const haveCodes = Boolean(CODES.tester && CODES.session1 && CODES.session2);
// After the presentations the lock is switched off (branch release/no-code):
// then there is nothing to ask for, and only the no-lock test applies.
const lockOff = /const GS_SESSION_LOCK_ENABLED = false/.test(fs.readFileSync(path.resolve(here, "../www/js/app.js"), "utf8"));
test.beforeEach(({}, info) => { if (lockOff && !info.title.startsWith("lock off")) test.skip(true, "lock switched off"); });

test("lock off: no pop-up, every activity open, no code card", async ({ page }) => {
  test.skip(!lockOff, "the lock is on in this build");
  await openApp(page, { locked: true, disclaimerSeen: false, tutorialSeen: false });
  await page.click("#disclaimerAcceptBtn");
  await page.click("#closeTutorial");
  await page.waitForTimeout(800);
  await expect(page.locator("#sessionCodeModal")).toBeHidden();
  await expect(page.locator("#sessionCodeCard")).toBeHidden();
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("practice"));
  await screenVisible(page, "practice");
});
const local = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi).getTime();

async function submit(page, code, now) {
  await page.evaluate((n) => { window.__gsNow = n; }, now ?? null);
  await page.fill("#sessionCodeModalInput", code);
  await page.click("#sessionCodeModalBtn");
}

test("locked: the pop-up asks for the code; Later leaves Home usable but locked", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { locked: true });
  const modal = page.locator("#sessionCodeModal");
  await expect(modal).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("sessionCodeModalTitle");
  expect(await page.evaluate(() => document.querySelector("main")?.inert)).toBe(true);
  await page.click("#sessionCodeLaterBtn");
  await expect(modal).toBeHidden();
  await expect(page.locator("#sessionCodeCard")).toBeVisible();
  await expect(page.locator("#homeLockedNote")).toBeVisible();
  await expect(page.locator("#tryDemoBtn")).toBeHidden();
  for (const step of ["practice", "signal", "compare", "live"]) {
    await expect(page.locator(`.step-card[data-screen="${step}"] button`)).toHaveAttribute("aria-disabled", "true");
  }
  await page.evaluate(() => gsShowScreen("practice"));
  await screenVisible(page, "home");
  await expect(modal).toBeVisible();
  await page.click("#sessionCodeLaterBtn");
  for (const other of ["help", "instructor", "progress", "shortcuts"]) {
    await page.evaluate((s) => gsShowScreen(s), other);
    await screenVisible(page, other);
  }
  expect(errors).toEqual([]);
});

test("the retired code 2026 and a wrong code are refused with who to ask", async ({ page }) => {
  await openApp(page, { locked: true });
  for (const code of ["1234", "2026"]) {
    await submit(page, code);
    await expect(page.locator("#sessionCodeModalNote")).toContainText("Ask Azizul Haque or your O&M specialist");
    await expect(page.locator("#sessionCodeModal")).toBeVisible();
  }
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("sessionCodeModalInput");
});

test("the tester code unlocks once and for good: closing the app does not ask again", async ({ page }) => {
  test.skip(!haveCodes, "session codes file not present");
  await openApp(page, { locked: true });
  await setTimes(page);
  await page.evaluate(() => { window.__gsNow = null; });
  await page.fill("#sessionCodeModalInput", ` ${CODES.tester} `);
  await page.press("#sessionCodeModalInput", "Enter");
  await expect(page.locator("#sessionCodeModal")).toBeHidden();
  await expect(page.locator("#sessionCodeCard")).toBeHidden();
  await expect(page.locator('.step-card[data-screen="practice"] button')).toHaveAttribute("aria-disabled", "false");
  await expect.poll(() => page.evaluate(() => document.activeElement?.className)).toContain("step-button");
  const flag = JSON.parse(await page.evaluate(() => localStorage.getItem("om-session-unlock")));
  expect(flag.code).toBe("tester");
  // A new start, as when the app is closed and opened (build 18's session flag gone): still open.
  await page.evaluate(() => sessionStorage.removeItem("gs-session-unlocked"));
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await expect(page.locator("#sessionCodeModal")).toBeHidden();
  await page.evaluate(() => gsShowScreen("practice"));
  await screenVisible(page, "practice");
  // The flag is part of the durable copy (om-* key).
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k === "om-session-unlock").length)).toBe(1);
});

test("each presentation code works only in its own window on the phone's clock", async ({ page }) => {
  test.skip(!haveCodes, "session codes file not present");
  const cases = [
    { code: CODES.session1, now: local(2026, 12, 5, 11, 0), ok: false },
    { code: CODES.session1, now: local(2026, 12, 5, 13, 45), ok: true },
    { code: CODES.session1, now: local(2026, 12, 5, 16, 30), ok: false },
    { code: CODES.session1, now: local(2026, 12, 6, 10, 0), ok: false },
    { code: CODES.session2, now: local(2026, 12, 5, 13, 0), ok: false },
    { code: CODES.session2, now: local(2026, 12, 5, 16, 0), ok: true },
    { code: CODES.session2, now: local(2026, 12, 5, 19, 0), ok: false },
    { code: CODES.tester, now: local(2027, 3, 1, 9, 0), ok: true }
  ];
  for (const c of cases) {
    await openApp(page, { locked: true });
    await submit(page, c.code, c.now);
    if (c.ok) {
      await expect(page.locator("#sessionCodeModal")).toBeHidden();
      expect(await page.evaluate(() => Boolean(localStorage.getItem("om-session-unlock")))).toBe(true);
    } else {
      await expect(page.locator("#sessionCodeModalNote")).toContainText("works only during its session");
      expect(await page.evaluate(() => localStorage.getItem("om-session-unlock"))).toBeNull();
    }
  }
});

test("the Home card works too, and old installs with a build 16-18 flag are asked once like everyone", async ({ page }) => {
  test.skip(!haveCodes, "session codes file not present");
  await openApp(page, { locked: true, storage: { "om-unlocked": "true", "om-lock-seen": "1", "om-clear-time": "4", "om-full-time": "8", "om-margin": "0.4" } });
  await expect(page.locator("#sessionCodeModal")).toBeVisible();
  await page.click("#sessionCodeLaterBtn");
  await expect(page.locator("#sessionCodeModal")).toBeHidden();
  await expect(page.locator("#sessionCodeInput")).toBeFocused();
  await page.evaluate(() => { window.__gsNow = null; sessionStorage.setItem("gs-session-unlocked", "true"); });
  await page.fill("#sessionCodeInput", CODES.tester);
  await page.click("#sessionCodeBtn");
  await expect(page.locator("#sessionCodeCard")).toBeHidden();
  await expect(page.locator("#sessionCodeNote")).toContainText("Unlocked");
  expect(await page.evaluate(() => localStorage.getItem("om-unlocked"))).toBeNull();
  expect(await announcer(page)).toContain("Unlocked");
});

test("first run: guidance, tutorial, then the code pop-up", async ({ page }) => {
  await openApp(page, { locked: true, disclaimerSeen: false, tutorialSeen: false });
  await expect(page.locator("#disclaimerModal")).toBeVisible();
  await page.click("#disclaimerAcceptBtn");
  await expect(page.locator("#tutorialModal")).toBeVisible();
  await page.click("#closeTutorial");
  await expect(page.locator("#sessionCodeModal")).toBeVisible();
});

test("no double-tap zoom: every element opts out, the swipe pads keep touch-action none", async ({ page }) => {
  await openApp(page);
  const values = await page.evaluate(() => ({
    body: getComputedStyle(document.body).touchAction,
    intro: getComputedStyle(document.querySelector(".om-guidance")).touchAction,
    title: getComputedStyle(document.getElementById("screenTitle")).touchAction,
    pad: getComputedStyle(document.getElementById("answerSurface")).touchAction,
    live: getComputedStyle(document.getElementById("liveSurface")).touchAction
  }));
  expect(values.body).toBe("manipulation");
  expect(values.intro).toBe("manipulation");
  expect(values.title).toBe("manipulation");
  expect(values.pad).toBe("none");
  expect(values.live).toBe("none");
});

test("the app is CrossingTime everywhere a user reads the name", async ({ page }) => {
  await openApp(page);
  expect(await page.title()).toContain("CrossingTime");
  await expect(page.locator("#screenTitle")).toHaveText("CrossingTime");
  await page.evaluate(() => gsShowScreen("help"));
  await expect(page.locator("#aboutVersion")).toContainText("CrossingTime version 1.0, build 21");
  const manifest = await page.evaluate(async () => (await (await fetch("manifest.webmanifest")).json()));
  expect(manifest.name).toBe("CrossingTime");
  expect(await page.evaluate(() => document.body.innerText.includes("Gap Sense"))).toBe(false);
});

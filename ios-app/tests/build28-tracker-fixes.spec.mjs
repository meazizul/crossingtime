import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes } from "./helpers.mjs";

/* Build 28: items from the build 27 review in Cindi's tracker (27.x). */

test("27.10: the first extra student cannot be given the code of the student already on the phone", async ({ page }) => {
  await openApp(page, { storage: { "om-client-code": "AB1" } });
  const result = await page.evaluate(() => {
    const same = gsStudentsAdd("ab1", "");
    const registryAfterSame = localStorage.getItem("om-students");
    const other = gsStudentsAdd("CD2", "");
    return { same, registryAfterSame, other: other.ok };
  });
  expect(result.same.ok).toBe(false);
  expect(result.same.message).toContain("already a student AB1");
  expect(result.registryAfterSame).toBeNull();          // nothing was created
  expect(result.other).toBe(true);
});

test("27.24: the Copy buttons in Instructor setup say so when nothing was copied", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) }, configurable: true });
    document.execCommand = () => false;
    document.getElementById("copyPracticeTimingMessage").click();
  });
  await expect(page.locator("#shareNote")).toHaveText("Could not copy. Select the text in the box and copy it by hand.");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.resolve() }, configurable: true });
    document.getElementById("copyPracticeTimingMessage").click();
  });
  await expect(page.locator("#shareNote")).toHaveText("Copied the practice link.");
});

test("27.30: 'Test haptic pulse' pressed twice leaves the vibration setting as it was", async ({ page }) => {
  await page.addInitScript(() => { navigator.vibrate = () => true; });
  await openApp(page);
  await page.clock.install();
  const before = await page.evaluate(() => { a11ySettings.vibrate = false; return a11ySettings.vibrate; });
  await page.evaluate(() => { const b = document.getElementById("hapticsTestBtn"); b.click(); b.click(); });
  expect(await page.evaluate(() => a11ySettings.vibrate)).toBe(true);     // on only for the test
  await page.clock.runFor(1500);
  expect(before).toBe(false);
  expect(await page.evaluate(() => a11ySettings.vibrate)).toBe(false);
  // And the test can be run again afterwards.
  await page.evaluate(() => document.getElementById("hapticsTestBtn").click());
  expect(await page.evaluate(() => a11ySettings.vibrate)).toBe(true);
  await page.clock.runFor(1500);
  expect(await page.evaluate(() => a11ySettings.vibrate)).toBe(false);
});

test("27.22: Comparison preparation is cancelled when the app is hidden during 'Get ready'", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => {
    // A voice that never finishes, so the activity stays in "Get ready".
    window.__spoken = [];
    const fake = { speaking: true, cancel() { window.__spoken.push("<cancel>"); }, speak(u) { window.__spoken.push(u.text); }, getVoices() { return []; } };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    gsShowScreen("signal");
  });
  await page.locator("#signalBtn").click();
  expect(await page.evaluate(() => gsSignalState.phase)).toBe("ready");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await page.evaluate(() => gsSignalState.phase)).toBe("idle");
  expect(await page.evaluate(() => window.__spoken.includes("<cancel>"))).toBe(true);
  await expect(page.locator("#signalStatus")).toContainText("nothing was recorded");
  await page.waitForTimeout(3200);                        // past the 2.5 s the words are given
  expect(await page.evaluate(() => gsSignalState.phase)).toBe("idle");
  expect(errors).toEqual([]);
});

test("27.40: on the How much pad a second tap right after the first is ignored", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(() => {
    const out = {};
    gsHowMuchPad.start = 0;
    gsHowMuchPad.onDone = (seconds) => { out.done = seconds; };
    const t0 = performance.now() - 2000;
    gsHowMuchTap(t0);
    gsHowMuchTap(t0 + 120);                 // a double tap
    out.afterDouble = "done" in out;
    out.stillOpen = Boolean(gsHowMuchPad.onDone);
    gsHowMuchTap(t0 + 1500);
    return out;
  });
  expect(result.afterDouble).toBe(false);
  expect(result.stillOpen).toBe(true);
  expect(result.done).toBeCloseTo(1.5, 2);
});

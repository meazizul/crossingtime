import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes, screenVisible, history, tick, announcer, waitUntil } from "./helpers.mjs";

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test("practice logs a within-margin attempt, shows a score line, and unlocks settings", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("practice"));
  await expect(page.locator("#practiceScore")).toHaveText("No attempts yet");   // the margin in seconds only with Show times on (F2, build 15)

  // Stop the fake clock flowing in real time: starting the audio on the first
  // press can take ~0.1 s on a busy Mac, which would otherwise be counted.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.click("#actionBtn");                       // Begin
  await expect(page.locator("#settingsTrigger")).toBeDisabled();
  await tick(page, 4000);                                // exactly the half-street time
  await page.click("#actionBtn");                       // Mark (Halfway)
  await expect(page.locator("#actionBtn")).toHaveAttribute("aria-disabled", "true");   // busy, never disabled (12.27)
  await tick(page, 8000);                                // replay lead-in + replay + pad

  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "practice", street: "half", correct: true, marginSec: 0.4 });
  expect(Math.abs(log[0].userSec - 4)).toBeLessThan(0.05);
  await expect(page.locator("#practiceScore")).toHaveText("Last 1: 1 within margin");
  await expect(page.locator("#settingsTrigger")).toBeEnabled();
  await expect(page.locator("#actionBtn")).toHaveAttribute("aria-disabled", "false");
  expect(errors).toEqual([]);
});

test("practice logs an outside-margin attempt and both marks in the three-point mode", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("practice"));
  await page.click("label:has(#mode-start-halfway-finish)");
  await expect(page.locator("#mode-start-halfway-finish")).toBeChecked();
  await page.click("#actionBtn");
  await tick(page, 3000);                                // 1 s early for halfway
  await page.click("#actionBtn");
  await tick(page, 5000);                                // 8.0 s total: on time for finish
  await page.click("#actionBtn");
  await tick(page, 12000);
  const log = await history(page);
  expect(log).toHaveLength(2);
  expect(log[0]).toMatchObject({ activity: "practice", street: "half", correct: false });
  expect(log[1]).toMatchObject({ activity: "practice", street: "full", correct: true });
  expect(log[0].diffSec).toBeLessThan(-0.9);
});

test("leaving practice mid-run unlocks settings and mode selection everywhere", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("practice"));
  await page.click("#actionBtn");                       // Begin
  await expect(page.locator("#settingsTrigger")).toBeDisabled();
  await page.click("#backBtn");
  await screenVisible(page, "home");
  await expect(page.locator("#settingsTrigger")).toBeEnabled();
  await expect(page.locator("#a11yTrigger")).toBeEnabled();
  await expect(page.locator("#mode-start-finish")).toBeEnabled();
  await tick(page, 10000);
  expect(await history(page)).toEqual([]);              // nothing half-recorded
  expect(await page.evaluate(() => suppressSrAnnouncements)).toBe(false);
  expect(errors).toEqual([]);
});

test("adaptive margin applies to practice per lane", async ({ page }) => {
  await openApp(page, { storage: {
    "om-adaptive-margin": JSON.stringify({ enabled: true, lanes: { "practice:half": { margin: 0.1, lastEvaluatedAt: 0 } } })
  } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("practice"));
  await expect(page.locator("#practiceScore")).toContainText("adaptive margin");
  await page.evaluate(() => { const t = document.getElementById("debugToggle"); t.checked = true; t.dispatchEvent(new Event("change")); });
  await expect(page.locator("#practiceScore")).toContainText("margin 0.10s (adaptive)");
  await page.evaluate(() => { const t = document.getElementById("debugToggle"); t.checked = false; t.dispatchEvent(new Event("change")); });
  await page.click("#actionBtn");
  await tick(page, 4300);                                // 0.3 s late: fine at 0.4, outside at 0.1
  await page.click("#actionBtn");
  await tick(page, 8000);
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ correct: false, marginSec: 0.1 });
});

test("screen-reader messages are announced synchronously and suppressed during replay", async ({ page }) => {
  // With a screen reader running (build 15), the replay in words goes to the
  // live region once the replay is over, with the prompt.
  await page.addInitScript(() => { window.__gsScreenReader = true; });
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("practice"));
  await page.click("#actionBtn");
  expect(await announcer(page)).toBe("Started.");
  await tick(page, 4000);
  await page.click("#actionBtn");
  // The last things spoken before suppression: the marker, then "Replay."
  // Nothing else is announced while the tones play.
  expect(await announcer(page)).toBe("Replay.");
  await tick(page, 2500);
  expect(await announcer(page)).toBe("Replay.");
  await waitUntil(page, () => document.getElementById("srAnnouncer").textContent.includes("That was your taps"), { ms: 8000, step: 100 });
  expect(await announcer(page)).toBe("That was your taps, then the crossing time: within the margin. Ready for another try.");
});

test("progress page shows practice attempts and the run strip", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("practice"));
  await page.click("#actionBtn");
  await tick(page, 4000);
  await page.click("#actionBtn");
  await tick(page, 8000);
  await page.evaluate(() => gsShowScreen("progress"));
  await expect(page.locator(".progress-card").first()).toContainText("Practice my timing");
  await expect(page.locator(".progress-card").first()).toContainText("100%");
  await expect(page.locator(".run-dot")).toHaveCount(1);
  await expect(page.locator("#studentName")).toHaveCount(0);
});

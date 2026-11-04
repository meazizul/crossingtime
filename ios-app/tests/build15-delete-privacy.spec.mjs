// Build 15: Delete all my practice history asks first (tracker 14.2), the
// deleted history never comes back from the durable copy (14.4), and the
// text says where the data is kept (14.1).
import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, announcer, watchErrors } from "./helpers.mjs";

const ENTRY = { time: Date.now(), activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 };

async function openProgressWithHistory(page, { times = true } = {}) {
  await openApp(page, { storage: { "om-attempt-log": JSON.stringify([ENTRY]) } });
  if (times) await setTimes(page);
  await page.evaluate(() => gsShowScreen("progress"));
}

test("14.2: one tap deletes nothing, it opens the warning with the heading focused and Cancel before Delete history", async ({ page }) => {
  const errors = watchErrors(page);
  await openProgressWithHistory(page);
  await page.click("#clearDataBtn");
  const dialog = page.locator("#deleteHistoryModal");
  await expect(dialog).toBeVisible();
  expect(await history(page)).toHaveLength(1);
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("deleteHistoryTitle");
  await expect(page.locator("#deleteHistoryTitle")).toHaveText("Delete all your practice history?");
  await expect(page.locator("#deleteHistoryText")).toContainText("It cannot be undone");
  await expect(page.locator("#deleteHistoryWhere")).toHaveText("It is deleted from this browser.");
  await expect(page.locator("#deleteHistoryText")).toContainText("Your settings, crossing times and instructor setup stay.");
  // Cancel first in the reading order, Delete history second.
  const order = await page.evaluate(() => [...document.querySelectorAll("#deleteHistoryModal button")].map((b) => b.id));
  expect(order).toEqual(["cancelDeleteHistoryBtn", "confirmDeleteHistoryBtn"]);
  await expect(page.locator("#confirmDeleteHistoryBtn")).toHaveText("Delete history");
  expect(await page.evaluate(() => document.querySelector("main")?.inert)).toBe(true);
  expect(errors).toEqual([]);
});

test("14.2: Cancel, Escape and Android Back delete nothing, and focus returns to the button", async ({ page }) => {
  await openProgressWithHistory(page);
  await page.click("#clearDataBtn");
  await page.click("#cancelDeleteHistoryBtn");
  await expect(page.locator("#deleteHistoryModal")).toBeHidden();
  expect(await history(page)).toHaveLength(1);
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("clearDataBtn");

  await page.click("#clearDataBtn");
  await page.keyboard.press("Escape");
  await expect(page.locator("#deleteHistoryModal")).toBeHidden();
  expect(await history(page)).toHaveLength(1);

  await page.click("#clearDataBtn");
  expect(await page.evaluate(() => gsHandleBack())).toBe("dialog");
  await expect(page.locator("#deleteHistoryModal")).toBeHidden();
  expect(await history(page)).toHaveLength(1);
  expect(await page.evaluate(() => localStorage.getItem("om-full-time"))).not.toBeNull();
});

test("14.2: Delete history deletes the history only, says where from, and leaves settings, times and instructor setup", async ({ page }) => {
  await openApp(page, { storage: {
    "om-attempt-log": JSON.stringify([ENTRY]),
    "om-adaptive-margin": JSON.stringify({ enabled: true, lanes: { "practice:half": { margin: 0.2 } } }),
    "om-instructor-code": "AB12",
    "om-haptics": "true"
  } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("progress"));
  await page.click("#clearDataBtn");
  await page.click("#confirmDeleteHistoryBtn");
  await expect(page.locator("#deleteHistoryModal")).toBeHidden();
  expect(await history(page)).toEqual([]);
  // Tracker 20.8: the lanes go back to the instructor's margin, the switch stays on.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("om-adaptive-margin")))).toEqual({ enabled: true, lanes: {} });
  await expect(page.locator("#reportNote")).toHaveText("All practice history deleted from this browser.");
  expect(await announcer(page)).toContain("deleted from this browser");
  await expect(page.locator("#progressBody")).toContainText("Nothing recorded yet");
  const kept = await page.evaluate(() => ({
    full: localStorage.getItem("om-full-time"), clear: localStorage.getItem("om-clear-time"),
    code: localStorage.getItem("om-instructor-code"), haptics: localStorage.getItem("om-haptics")
  }));
  expect(kept).toEqual({ full: "8", clear: "4", code: "AB12", haptics: "true" });
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("clearDataBtn");
});

test("14.4: with no crossing times saved, deleted history does not come back on the next start", async ({ page }) => {
  await openProgressWithHistory(page, { times: false });
  expect(await history(page)).toHaveLength(1);
  const before = await page.evaluate(() => gsStore.status().writes);
  await page.click("#clearDataBtn");
  await page.click("#confirmDeleteHistoryBtn");
  // Written at once, not after the 400 ms wait.
  await expect.poll(() => page.evaluate(() => gsStore.status().writes)).toBeGreaterThan(before);
  expect(await page.evaluate(() => gsStore.status().pending)).toBe(false);
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await page.waitForTimeout(600);
  expect(await history(page)).toEqual([]);
  expect(await page.evaluate(() => gsStore.status().restored)).toBe(false);
});

test("14.4: the app closed straight after the delete: the next start still has no history, with times saved", async ({ page }) => {
  await openProgressWithHistory(page);
  await page.click("#clearDataBtn");
  // Confirm and leave at once (pagehide flushes the copy; the session flag
  // stops a restore even if it did not).
  await page.evaluate(() => { gsConfirmDeleteHistory(); });
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await page.waitForTimeout(600);
  expect(await history(page)).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("om-full-time"))).toBe("8");
  // And once more, now that the one-time flag is gone: the copy itself is empty.
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await page.waitForTimeout(600);
  expect(await history(page)).toEqual([]);
  const copy = await page.evaluate(async () => { const r = await gsStore.restoreIfNeeded(); return { restored: r, hist: localStorage.getItem("om-attempt-log") }; });
  expect(copy.restored).toBe(false);
  expect(copy.hist).toBeNull();
});

test("14.1: the Progress text says where the data is kept, for the browser", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => gsShowScreen("progress"));
  await expect(page.locator("#myDataNote")).toHaveText("Kept only in this browser.");
  expect(await page.evaluate(() => document.body.textContent)).not.toContain("stays on this device");
});

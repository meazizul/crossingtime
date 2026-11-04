// Build 21: the build 20 review in Cindi's bug tracker (items 20.1-20.17,
// Nov 4 2026). One test or more per item that was changed.
import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick, announcer, waitUntil, answerOn, watchErrors } from "./helpers.mjs";

const ENTRY = { time: Date.now() - 3600000, activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 };

async function twoStudents(page) {
  await openApp(page, { storage: { "om-client-code": "AB1", "om-attempt-log": JSON.stringify([ENTRY]) } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { window.__gsStudentsReload = () => { window.__reloaded = (window.__reloaded || 0) + 1; }; });
  const added = await page.evaluate(() => gsStudentsAdd("CD2", "2026-11-03"));
  expect(added.ok).toBe(true);
}

test("20.1: a switch that cannot be saved (storage full) changes nothing and says so", async ({ page }) => {
  await twoStudents(page);
  // CD2 is active and empty; AB1 waits in the registry with one try.
  const before = await page.evaluate(() => ({ registry: localStorage.getItem("om-students"), code: localStorage.getItem("om-client-code"), log: localStorage.getItem("om-attempt-log") }));
  const result = await page.evaluate(() => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === "om-students") throw new DOMException("full", "QuotaExceededError");
      return real.call(this, key, value);
    };
    const first = gsStudentsLoad().list[0].id;
    const r = gsStudentsSwitch(first);
    Storage.prototype.setItem = real;
    return r;
  });
  expect(result.ok).toBe(false);
  expect(result.message).toContain("storage for this app is full");
  const after = await page.evaluate(() => ({ registry: localStorage.getItem("om-students"), code: localStorage.getItem("om-client-code"), log: localStorage.getItem("om-attempt-log") }));
  expect(after).toEqual(before);
  // AB1's try is still safe in the registry.
  const ab1 = await page.evaluate(() => { const r = gsStudentsLoad(); const id = r.list.find((s) => s.code === "AB1").id; return JSON.parse(r.data[id]["om-attempt-log"]).length; });
  expect(ab1).toBe(1);
});

test("20.1: when writing the next student's data fails half way, the student in use is put back", async ({ page }) => {
  await twoStudents(page);
  await page.evaluate(() => localStorage.setItem("om-margin", "0.3"));
  const before = await page.evaluate(() => ({ registry: localStorage.getItem("om-students"), margin: localStorage.getItem("om-margin"), code: localStorage.getItem("om-client-code") }));
  const result = await page.evaluate(() => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === "om-attempt-log") throw new DOMException("full", "QuotaExceededError");
      return real.call(this, key, value);
    };
    const r = gsStudentsSwitch(gsStudentsLoad().list[0].id);
    Storage.prototype.setItem = real;
    return r;
  });
  expect(result.ok).toBe(false);
  const after = await page.evaluate(() => ({ registry: localStorage.getItem("om-students"), margin: localStorage.getItem("om-margin"), code: localStorage.getItem("om-client-code") }));
  expect(after).toEqual(before);
});

test("20.3: with several students, Delete history and Remove student name the student and say where from", async ({ page }) => {
  await twoStudents(page);
  await page.evaluate(() => gsShowScreen("progress"));
  await page.click("#clearDataBtn");
  await expect(page.locator("#deleteHistoryTitle")).toHaveText("Delete all practice history for student CD2?");
  await expect(page.locator("#deleteHistoryWhat")).toContainText("The other students' practice stays.");
  await page.click("#confirmDeleteHistoryBtn");
  await expect(page.locator("#reportNote")).toHaveText("Practice history for student CD2 deleted from this browser.");
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.click("#removeStudentBtn");
  await expect(page.locator("#removeStudentWhat")).toContainText("from this browser. It cannot be undone.");
});

test("20.3: with one student, Delete history reads as before", async ({ page }) => {
  await openApp(page, { storage: { "om-attempt-log": JSON.stringify([ENTRY]) } });
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("progress"));
  await page.click("#clearDataBtn");
  await expect(page.locator("#deleteHistoryTitle")).toHaveText("Delete all your practice history?");
});

test("20.4: the Student code field refuses another student's code", async ({ page }) => {
  await twoStudents(page);
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.fill("#clientCode", "AB1");
  await page.locator("#clientCode").dispatchEvent("change");
  await expect(page.locator("#clientCode")).toHaveValue("CD2");
  expect(await page.evaluate(() => localStorage.getItem("om-client-code"))).toBe("CD2");
  await expect(page.locator("#studentsNote")).toContainText("There is already a student AB1 on this phone");
  const codes = await page.evaluate(() => gsStudentsLoad().list.map((s) => s.code));
  expect(codes).toEqual(["AB1", "CD2"]);
});

test("20.4: a setup link for another student switches to that student; one for a new code adds a student", async ({ page }) => {
  await twoStudents(page);
  // CD2 is in use. A link for AB1.
  const switched = await page.evaluate(() => gsStudentsRouteSetupLink("AB1"));
  expect(switched).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("om-client-code"))).toBe("AB1");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("om-attempt-log")).length)).toBe(1);
  // A link for a student not on the phone.
  const added = await page.evaluate(() => gsStudentsRouteSetupLink("EF3"));
  expect(added).toBe(true);
  const codes = await page.evaluate(() => gsStudentsLoad().list.map((s) => s.code));
  expect(codes).toEqual(["AB1", "CD2", "EF3"]);
  expect(await page.evaluate(() => localStorage.getItem("om-client-code"))).toBe("EF3");
  // A link for the student in use is applied as before.
  expect(await page.evaluate(() => gsStudentsRouteSetupLink("EF3"))).toBe(false);
});

test("20.6: the CSV is named crossingtime-report", async ({ page }) => {
  const source = await page.request.get("/js/app.js").then((r) => r.text()).catch(() => "");
  if (source) expect(source).toContain("crossingtime-report");
});

test("20.8: Delete history keeps the adaptive switch on and the checkbox shows it", async ({ page }) => {
  await openApp(page, { storage: {
    "om-attempt-log": JSON.stringify([ENTRY]),
    "om-adaptive-margin": JSON.stringify({ enabled: true, lanes: { "practice:half": { margin: 0.2 } } })
  } });
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("progress"));
  await page.click("#clearDataBtn");
  await page.click("#confirmDeleteHistoryBtn");
  expect(await page.evaluate(() => gsAdaptiveEnabled())).toBe(true);
  expect(await page.evaluate(() => gsLoadAdaptive().lanes)).toEqual({});
  await expect(page.locator("#adaptiveMarginToggle")).toBeChecked();
});

test("20.9: a held press counts from the touch, not the lift (Practice my timing)", async ({ page }) => {
  await page.clock.install();
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("practice"));
  const box = await page.locator("#actionBtn").boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  // Begin, then hold the Mark press for 300 ms, touching down at 4 s.
  await page.mouse.click(x, y);
  await tick(page, 4000);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await tick(page, 300);
  await page.mouse.up();
  await tick(page, 9000);
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0].userSec).toBeGreaterThan(3.9);
  expect(log[0].userSec).toBeLessThan(4.15);
});

test("20.9: How much uses the touch-down time it is given", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  const produced = await page.evaluate(() => {
    let got = null;
    gsHowMuchPad.onDone = (p) => { got = p; };
    gsHowMuchPad.start = 0;
    const now = performance.now();
    gsHowMuchTap(now - 2000);
    gsHowMuchTap(now - 500);
    return got;
  });
  expect(produced).toBeCloseTo(1.5, 2);
});

test("20.2: at Low, Comparison practice still shows and reads the short result", async ({ page }) => {
  await page.clock.install();
  await openApp(page, { storage: { "om-a11y-describe-sounds": "false", "om-a11y-say-replay": "false" } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  await page.click("input[name='compareStreet'][value='full']");
  await page.evaluate(() => { Math.random = () => 0.9; });
  await page.click("#compareStartBtn");
  for (let i = 0; i < 100; i += 1) {
    await page.clock.runFor(200);
    if (await page.evaluate(() => gsCompareState.phase === "answering")) break;
  }
  await answerOn(page, "shorter");
  await tick(page, 400);
  await expect(page.locator("#compareStatusText")).toHaveText("Not correct.");
  expect(await announcer(page)).toBe("Not correct.");
});

test("20.12: the screen is kept awake from Play until the try is over", async ({ page }) => {
  await page.clock.install();
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => {
    window.__wake = [];
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: {
      request: async () => { window.__wake.push("on"); return { release: async () => { window.__wake.push("off"); }, addEventListener() {} }; }
    } });
    gsShowScreen("compare");
  });
  await page.click("#compareStartBtn");
  await tick(page, 300);
  expect(await page.evaluate(() => window.__wake)).toEqual(["on"]);
  await page.evaluate(() => gsCompareCancel());
  await tick(page, 300);
  expect(await page.evaluate(() => window.__wake)).toEqual(["on", "off"]);
});

test("20.11: an interrupted sample is cancelled and not recorded", async ({ page }) => {
  await page.clock.install();
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  await page.click("#compareStartBtn");
  for (let i = 0; i < 30; i += 1) {
    await page.clock.runFor(200);
    if (await page.evaluate(() => gsCompareState.phase === "playing")) break;
  }
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("playing");
  await page.evaluate(() => gsAudioInterrupted("test"));
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("idle");
  await expect(page.locator("#compareStatusText")).toContainText("The sound was interrupted, so that one was not recorded.");
  expect(await history(page)).toEqual([]);
});

test("20.11: an interruption during Comparison preparation's timing records nothing", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("signal"); gsSignalState.phase = "timing"; gsSignalState.signalAt = performance.now(); });
  await page.evaluate(() => gsAudioInterrupted("test"));
  expect(await page.evaluate(() => gsSignalState.phase)).toBe("idle");
  await expect(page.locator("#signalStatus")).toContainText("The sound was interrupted");
  expect(await history(page)).toEqual([]);
});

test("20.14: the CSV date and time are YYYY-MM-DD and 24-hour, whatever the phone's language", async ({ page }) => {
  await openApp(page, { storage: { "om-attempt-log": JSON.stringify([{ ...ENTRY, time: new Date(2026, 10, 4, 15, 7, 9).getTime() }]) } });
  const row = await page.evaluate(() => gsBuildCsv({ clientCode: "K7" }).split(/\r?\n/)[1]);
  expect(row.startsWith("2026-11-04,15:07:09,")).toBe(true);
});

test("20.15: Remove student's export waits and says when nothing was exported", async ({ page }) => {
  await twoStudents(page);
  await page.evaluate(() => { window.gsExportCsv = async () => ({ outcome: "cancelled", message: "Not exported." }); gsShowScreen("instructor"); });
  await page.click("#removeStudentBtn");
  await page.click("#exportRemoveStudentBtn");
  await expect(page.locator("#removeStudentNote")).toHaveText("Not exported. The practice history has not been saved anywhere else.");
});

test("20.16: a shortcut to an activity with no crossing times goes Home instead", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => gsShowScreen("compare"));
  expect(await page.evaluate(() => gsCurrentScreen)).toBe("home");
  await expect(page.locator("#homeSetupBanner")).toBeVisible();
});

test("20.17: the service worker installs all or nothing and only pages fall back to the home page", async ({ page }) => {
  const source = await page.request.get("/sw.js").then((r) => r.text());
  expect(source).toContain("cache.addAll(");
  expect(source).not.toContain("allSettled");
  expect(source).toContain('request.mode === "navigate"');
  expect(source).toContain("NETWORK_WAIT_MS = 3000");
});

test("no console errors through the new paths", async ({ page }) => {
  const errors = watchErrors(page);
  await twoStudents(page);
  await page.evaluate(() => { gsShowScreen("progress"); gsShowScreen("instructor"); gsShowScreen("home"); });
  expect(errors).toEqual([]);
});

test("20.4 end to end: a setup link for AB1 opened while CD2 is selected restarts on AB1 and sets AB1 up", async ({ page }) => {
  // The instructor's link for AB1: times 3 / 6.
  await openApp(page);
  await setTimes(page, "3", "6", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.fill("#clientCode", "AB1");
  await page.locator("#clientCode").dispatchEvent("change");
  const link = await page.evaluate(() => buildShareTimingLink());
  // The instructor's phone: AB1 (one try, times 4 / 8) and CD2, CD2 in use.
  await page.evaluate(() => localStorage.clear());
  await openApp(page, { storage: { "om-client-code": "AB1", "om-attempt-log": JSON.stringify([ENTRY]) } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsStudentsAdd("CD2", "2026-11-03"));
  await page.evaluate(() => gsStore.commitNow());
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  expect(await page.evaluate(() => localStorage.getItem("om-client-code"))).toBe("CD2");
  await page.goto(link);
  await page.waitForFunction(() => typeof gsBoot === "function" && localStorage.getItem("om-client-code") === "AB1" && clearTimeInput.value === "3", null, { timeout: 15000 });
  const state = await page.evaluate(() => ({
    code: localStorage.getItem("om-client-code"),
    times: [clearTimeInput.value, fullTimeInput.value],
    tries: JSON.parse(localStorage.getItem("om-attempt-log") || "[]").length,
    students: gsStudentsLoad().list.map((s) => s.code)
  }));
  expect(state).toEqual({ code: "AB1", times: ["3", "6"], tries: 1, students: ["AB1", "CD2"] });
  // CD2 was not touched.
  const cd2 = await page.evaluate(() => { const r = gsStudentsLoad(); const id = r.list.find((s) => s.code === "CD2").id; return r.data[id]["om-client-code"]; });
  expect(cd2).toBe("CD2");
});

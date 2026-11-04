import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick } from "./helpers.mjs";

/*
 * Build 14: Progress, the report and the ways to send it
 * (tracker 12.36, 12.37, 12.38, 12.39, 12.40, 12.41, F2, F3, F4).
 */

const day = 24 * 3600 * 1000;

function sampleLog() {
  const now = Date.now();
  return [
    { time: now - 5000, activity: "practice", street: "half", userSec: 4.31, refSec: 4, diffSec: 0.31, correct: true, marginSec: 0.4 },
    { time: now - 4000, activity: "compare", street: "half", userSec: 3.42, refSec: 4, diffSec: -0.58, correct: false, marginSec: 0.4, answer: "same", expected: "shorter" },
    // Builds 10 to 13 wrote the estimate as a second record: paired on reading.
    { time: now - 3000, activity: "compare", street: "half", userSec: 6.5, refSec: 4, diffSec: 2.5, correct: true, marginSec: 0.4, answer: "longer", expected: "longer" },
    { time: now - 2900, activity: "compare", street: "half", userSec: 1.85, refSec: 2.5, diffSec: -0.65, correct: false, marginSec: 0.4, answer: "magnitude", expected: "magnitude" },
    // Build 14 writes one record.
    { time: now - 2000, activity: "live", street: "full", direction: "right", sense: "hearing", judged: true, userSec: 6.2, refSec: 8, diffSec: -1.8, correct: true, marginSec: 0.4, answer: "shorter", expected: "shorter", howMuch: { userSec: 2.1, refSec: 1.8, diffSec: 0.3, correct: true, marginSec: 0.4, skipped: false, time: now - 1900 } },
    { time: now - 1000, activity: "live", street: "half", direction: "left", sense: "vision", judged: false, skipped: true, skip: "judgment", userSec: 5, refSec: 4, diffSec: 1, correct: false, marginSec: 0.4, expected: "longer" }
  ];
}

async function openProgress(page, extra = {}) {
  await openApp(page, { storage: { "om-attempt-log": JSON.stringify(sampleLog()), "om-client-code": "K7", ...extra } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("progress"));
}

test("12.37: one try is one record and one report line; old two-record tries are paired on reading; scores are unchanged", async ({ page }) => {
  await openProgress(page);
  const summary = await page.evaluate(() => gsSummary());
  expect(summary.byActivity.compare).toMatchObject({ total: 2, correct: 1, howMuchTotal: 1, howMuchCorrect: 0 });
  expect(summary.byActivity.live).toMatchObject({ total: 1, correct: 1, howMuchTotal: 1, howMuchCorrect: 1, skipped: 1 });
  expect(summary.total).toBe(4);
  expect(await page.evaluate(() => gsReportRecords().length)).toBe(5);   // six records, one pair folded
  const report = await page.evaluate(() => gsBuildReport({ clientCode: "K7" }));
  const lines = report.split("\n").filter((l) => /Comparison practice \(first half\)/.test(l));
  expect(lines).toHaveLength(2);
  expect(lines[1]).toMatch(/sample 6\.50 s, crossing 4\.00 s \(2\.50 s longer\), margin 0\.40 s; answered "longer", it was "longer" — correct; how much: tapped 1\.85 s, real difference 2\.50 s \(0\.65 s under\), margin 0\.40 s — outside margin$/);
  expect(report).toMatch(/At the street \(full street, from the right, by hearing\): warning time 6\.20 s, crossing 8\.00 s \(1\.80 s shorter\), margin 0\.40 s; answered "shorter", it was "shorter" — correct; how much: tapped 2\.10 s, real difference 1\.80 s \(0\.30 s over\), margin 0\.40 s — within margin/);
  expect(report).toContain("At the street (first half, from the left, by vision): warning time 5.00 s, crossing 4.00 s (1.00 s longer) — cancelled (not scored)");
  expect(report).toContain("At the street: 1 cancelled");
  expect(report).not.toMatch(/skipped/);
});

test("F2 and 12.36: the report shows the real numbers, labelled, with the time of day, and a header with the crossing times", async ({ page }) => {
  await openProgress(page);
  const report = await page.evaluate(() => gsBuildReport({ clientCode: "K7" }));
  expect(report).toContain("Crossing times: full street 8.00 s, first half 4.00 s. Margin 0.40 s.");
  expect(report).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d\d [AP]M  Practice my timing \(first half\): halfway at 4\.31 s, real 4\.00 s \(0\.31 s late\), margin 0\.40 s — within margin/);
  expect(report).toContain('Comparison practice (first half): sample 3.42 s, crossing 4.00 s (0.58 s shorter), margin 0.40 s; answered "same", it was "shorter" — incorrect');
  // The "how much" line names what was tapped, the real difference and how far off: never the error labelled as the tapped time.
  expect(report).not.toMatch(/tapped out the difference/);
  expect(report).toMatch(/how much: tapped 1\.85 s, real difference 2\.50 s \(0\.65 s under\)/);
});

test("12.41: each Progress box is one heading that reads as a sentence; nothing reads 'em dash' or 'dot'", async ({ page }) => {
  await openProgress(page);
  const headings = await page.evaluate(() => [...document.querySelectorAll("#progressBody h2")].map((h) => {
    const spoken = [...h.childNodes].filter((n) => !(n.getAttribute && n.getAttribute("aria-hidden") === "true")).map((n) => n.textContent.trim()).join(" ").replace(/\s+/g, " ");
    return spoken.trim();
  }));
  expect(headings).toHaveLength(4);
  expect(headings[0]).toBe("Practice my timing: 100 percent, 1 of 1 within margin.");
  expect(headings[1]).toBe("Comparison preparation: not started.");
  expect(headings[2]).toBe("Comparison practice: 50 percent, 1 of 2 correct. How much longer or shorter: 0 of 1 estimates within margin.");
  expect(headings[3]).toBe("At the street: 100 percent, 1 of 1 correct. How much longer or shorter: 1 of 1 estimates within margin. 1 cancelled, not scored.");
  expect(headings.join(" ")).not.toMatch(/—|·/);
  expect(await page.getAttribute("#progressBody ul", "aria-label")).toBe("Progress by activity");
  // The visual layout is still label, value, note.
  await expect(page.locator(".progress-card").nth(1).locator(".progress-value")).toHaveText("—");
});

test("12.39: 'Show my report to send' opens the report with the cursor at its start, hides itself, and only send controls say Send", async ({ page }) => {
  await openProgress(page);
  await expect(page.locator("#sendReportBtn")).toHaveText("Show my report to send");
  await page.click("#sendReportBtn");
  await expect(page.locator("#reportPreview")).toBeFocused();
  expect(await page.evaluate(() => document.getElementById("reportPreview").selectionStart)).toBe(0);
  await expect(page.locator("#sendReportBtn")).toBeHidden();
  const sendControls = await page.evaluate(() => [...document.querySelectorAll("#reportPreviewWrap button")].filter((b) => !b.hidden).map((b) => b.textContent.trim()));
  expect(sendControls.filter((t) => /^Send/.test(t))).toEqual(["Send with another app"]);
  expect(await page.locator("#reportNote").innerText()).toBe("");
  await page.click("#cancelSendReportBtn");               // Hide report
  await expect(page.locator("#reportPreviewWrap")).toBeHidden();
  await expect(page.locator("#sendReportBtn")).toBeVisible();
  await expect(page.locator("#sendReportBtn")).toBeFocused();
});

test("F4: Text to my instructor opens Messages with the report, addressed to the number from the setup", async ({ page }) => {
  await openProgress(page, { "om-instructor-phone": "+1 (717) 555-0100" });
  await expect(page.locator("#reportRecipient")).toContainText("+1 (717) 555-0100");
  await page.click("#sendReportBtn");
  await page.evaluate(() => { window.__href = null; window.gsNavigateTo = (url) => { window.__href = url; }; });
  await page.click("#textReportBtn");
  const href = await page.evaluate(() => window.__href);
  expect(href).toMatch(/^sms:\+17175550100[?&]body=/);
  expect(decodeURIComponent(href)).toContain("Student code: K7");
  await expect(page.locator("#reportNote")).toContainText("addressed to your instructor");
});

test("F4: the instructor's number travels in the setup link and is validated", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { document.getElementById("instructorPhone").value = "717-555-0100"; document.getElementById("instructorPhone").dispatchEvent(new Event("change")); });
  expect(await page.evaluate(() => localStorage.getItem("om-instructor-phone"))).toBe("717-555-0100");
  const token = await page.evaluate(() => buildShareTimingToken({ times: true, contact: true, features: false, lock: false }));
  const parsed = await page.evaluate((t) => parseShareToken(t), token);
  expect(parsed.phone).toBe("717-555-0100");
  await openApp(page);
  await page.evaluate((t) => applyShareToken(t), token);
  expect(await page.evaluate(() => document.getElementById("instructorPhone").value)).toBe("717-555-0100");
  expect(await page.evaluate(() => isValidPhone("12"))).toBe(false);
  expect(await page.evaluate(() => isValidPhone(""))).toBe(true);
});

test("F4 (build 20): the report is no longer shown as QR codes; text, email, file and share stay", async ({ page }) => {
  // Cindi, 1 Nov 2026: a long report needed many codes and nothing joined them again.
  await openProgress(page);
  await page.click("#sendReportBtn");
  await expect(page.locator("#showQrBtn")).toHaveCount(0);
  await expect(page.locator("#qrModal")).toHaveCount(0);
  expect(await page.evaluate(() => typeof qrcode)).toBe("undefined");
  await expect(page.locator("#textReportBtn")).toBeVisible();
  await expect(page.locator("#csvReportBtn")).toBeVisible();
  await expect(page.locator("#confirmSendReportBtn")).toBeVisible();
  await expect(page.locator("#screen-progress")).not.toContainText("code to scan");
});

test("F3: Export for Excel gives a CSV file, one try per row, one value per column", async ({ page }) => {
  await openProgress(page);
  const csv = await page.evaluate(() => gsBuildCsv({ clientCode: "K7", build: "14" }));
  const rows = csv.trim().split("\r\n");
  expect(rows[0]).toBe("date,time,student code,build,activity,street,direction,hearing or vision,sample or warning time (s),crossing time (s),difference (s),margin (s),answer,correct answer,result,how much tapped (s),how much real difference (s),how much off by (s),how much result,cancelled or skipped");
  expect(rows).toHaveLength(6);                           // five tries, one header
  const cols = rows.map((r) => r.split(",").length);
  expect(new Set(cols)).toEqual(new Set([20]));
  const street = rows.find((r) => r.includes("At the street,full street,right"));
  expect(street).toContain("K7,14,At the street,full street,right,hearing,6.20,8.00,-1.80,0.40,shorter,shorter,correct,2.10,1.80,0.30,within margin,");
  const cancelled = rows.slice(1).find((r) => r.includes("vision"));
  expect(cancelled).toMatch(/cancelled,,,,,cancelled judgment$/);
  // In a browser the file downloads.
  await page.click("#sendReportBtn");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#csvReportBtn")]);
  expect(download.suggestedFilename()).toMatch(/^crossingtime-report-K7-\d{4}-\d\d-\d\d\.csv$/);
  await expect(page.locator("#reportNote")).toContainText("Downloaded");
});

test("12.38: Email to my instructor is offered only when a mail app can open; otherwise the app says so", async ({ page }) => {
  // iPhone app, no mail account.
  await page.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios", Plugins: {
      GSNative: { canOpen: async () => ({ canOpen: false }), haptic: async () => {}, tone: async () => ({ id: 1 }), sustainStart: async () => ({ id: 1 }), sustainStop: async () => {}, stopSound: async () => {}, keepAwake: async () => {}, speak: async () => {}, stopSpeaking: async () => {}, pendingScreen: async () => ({}), audioStatus: async () => ({ engineRunning: true, outputVolume: 1, outputLatency: 0 }), addListener: () => ({ remove() {} }), directTouchShow: async () => ({ shown: true }), directTouchHide: async () => {} },
      App: { getInfo: async () => ({ version: "1.0", build: "14" }), addListener: () => {}, getLaunchUrl: async () => ({}) }, StatusBar: { setStyle: async () => {} } } };
  });
  await openProgress(page, { "om-instructor-email": "oms@example.org" });
  await page.click("#sendReportBtn");
  await page.waitForTimeout(100);
  await expect(page.locator("#emailReportBtn")).toBeHidden();
  await expect(page.locator("#textReportBtn")).toBeVisible();
  await expect(page.locator("#confirmSendReportBtn")).toBeVisible();
});

test("12.38 in a browser: when nothing opens for mailto, the app says no mail app is set up", async ({ page }) => {
  await openProgress(page, { "om-instructor-email": "oms@example.org" });
  await page.click("#sendReportBtn");
  await expect(page.locator("#emailReportBtn")).toBeVisible();
  await page.evaluate(() => { window.__href = null; window.gsNavigateTo = (url) => { window.__href = url; }; });
  await page.click("#emailReportBtn");
  expect(await page.evaluate(() => window.__href)).toMatch(/^mailto:oms%40example\.org\?subject=/);
  await tick(page, 2000);
  await expect(page.locator("#reportNote")).toContainText("No mail app is set up on this phone");
  await expect(page.locator("#reportNote")).not.toContainText("should open");
});

test("12.40: the history cap is 5000, Progress and the report warn before it, and dropped entries are counted, never silent", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  expect(await page.evaluate(() => GS_HISTORY_LIMIT)).toBe(5000);
  await page.evaluate(() => {
    const many = []; const now = Date.now();
    for (let i = 0; i < 4600; i += 1) many.push({ time: now - i * 1000, activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 });
    gsSaveHistory(many.reverse());
  });
  expect(await page.evaluate(() => gsHistorySaveProblem())).toContain("nearly full");
  await page.evaluate(() => {
    const many = gsLoadHistory(); const now = Date.now();
    for (let i = 0; i < 500; i += 1) many.push({ time: now + i, activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 });
    gsSaveHistory(many);
  });
  expect(await page.evaluate(() => gsLoadHistory().length)).toBe(5000);
  expect(await page.evaluate(() => gsHistorySaveProblem())).toContain("oldest 100 entries were removed");
  await page.evaluate(() => gsShowScreen("progress"));
  await expect(page.locator("#progressBody")).toContainText("oldest 100 entries were removed");
  expect(await page.evaluate(() => gsBuildReport())).toContain("Note: The history is full");
  // A save that fails is reported too.
  await page.evaluate(() => { window.__announced = []; const real = window.announceScreenReader; window.announceScreenReader = (m) => { window.__announced.push(m); return real(m); }; const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "om-attempt-log") throw new Error("QuotaExceededError"); return orig.call(this, k, v); }; gsLogAttempt({ activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 }); });
  expect(await page.evaluate(() => gsHistorySaveProblem())).toContain("could not be saved");
  expect(await page.evaluate(() => window.__announced.join(" "))).toContain("could not be saved");
});

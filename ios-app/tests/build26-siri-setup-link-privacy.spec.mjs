// Build 26: tracker 25.2 (a Siri page like Seeing AI's: the four activities,
// a check mark on each one with a Siri phrase, and Apple's sheet to add,
// change or remove it), 20.4 (the installed app's gapsense://setup link goes
// to the student it was made for, as the web link does) and 14.1 (the last
// three texts that said the data never leaves the device).
import { test, expect } from "@playwright/test";
import { openApp, setTimes, watchErrors } from "./helpers.mjs";

const ENTRY = { time: Date.now() - 3600000, activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 };

/* The installed iPhone app, with a Siri that remembers phrases. */
function stubIosShell(page, { siri = true, phrases = {} } = {}) {
  return page.addInitScript(({ siri, phrases }) => {
    window.__siriCalls = [];
    window.__phrases = Object.assign({}, phrases);
    const titles = { practice: "Practice my timing", signal: "Comparison preparation", compare: "Comparison practice", live: "At the street" };
    const GSNative = {
      haptic: async () => {},
      pendingScreen: async () => ({}),
      accessibilityStatus: async () => ({ screenReader: false }),
      addListener: () => ({ remove() {} })
    };
    if (siri) {
      GSNative.siriShortcuts = async () => ({
        shortcuts: Object.keys(titles).map((screen) => (window.__phrases[screen]
          ? { screen, title: titles[screen], added: true, phrase: window.__phrases[screen] }
          : { screen, title: titles[screen], added: false }))
      });
      GSNative.siriShortcut = async ({ screen }) => {
        window.__siriCalls.push(screen);
        const next = window.__nextSiri || { result: "added", phrase: titles[screen] };
        if (next.result === "added" || next.result === "updated") window.__phrases[screen] = next.phrase;
        if (next.result === "removed") delete window.__phrases[screen];
        return next;
      };
    }
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      Plugins: {
        GSNative,
        App: {
          getInfo: async () => ({ version: "1.0", build: "26" }),
          addListener: (name, fn) => { if (name === "appUrlOpen") window.__appUrl = fn; },
          getLaunchUrl: async () => ({})
        },
        StatusBar: { setStyle: async () => {} }
      }
    };
  }, { siri, phrases });
}

async function siriRows(page) {
  return page.$$eval("#siriList [data-siri]", (buttons) => buttons.map((b) => ({
    screen: b.dataset.siri,
    label: b.getAttribute("aria-label"),
    check: b.querySelector(".siri-check").textContent
  })));
}

/* ---------------- 25.2: the Siri page ---------------- */

test("25.2: the Siri page lists the four activities, with a check mark and the phrase on those that have one", async ({ page }) => {
  const errors = watchErrors(page);
  await stubIosShell(page, { phrases: { compare: "Compare times" } });
  await openApp(page);
  await page.evaluate(() => gsShowScreen("shortcuts"));
  await expect(page.locator("#siriList [data-siri]")).toHaveCount(4);
  const rows = await siriRows(page);
  expect(rows).toEqual([
    { screen: "practice", label: "Practice my timing. No Siri phrase yet", check: "" },
    { screen: "signal", label: "Comparison preparation. No Siri phrase yet", check: "" },
    { screen: "compare", label: 'Comparison practice. Siri phrase: "Compare times"', check: "✓" },
    { screen: "live", label: "At the street. No Siri phrase yet", check: "" }
  ]);
  // The old button is only the fallback now; the page no longer says "without any setup".
  await expect(page.locator("#openShortcutsAppBtn")).toBeHidden();
  await expect(page.locator("#screen-shortcuts")).not.toContainText("without any setup");
  // The four ready-made phrases are still listed.
  await expect(page.locator("#shortcutsIos")).toContainText('"At the street in CrossingTime"');
  expect(errors).toEqual([]);
});

test("25.2: choosing an activity shows Apple's sheet; adding, changing and removing update the row and are announced", async ({ page }) => {
  await stubIosShell(page);
  await openApp(page);
  await page.evaluate(() => gsShowScreen("shortcuts"));
  const practice = page.locator('#siriList [data-siri="practice"]');
  await practice.click();
  await expect(practice).toHaveAttribute("aria-label", 'Practice my timing. Siri phrase: "Practice my timing"');
  await expect(practice.locator(".siri-check")).toHaveText("✓");
  await expect(page.locator("#siriNote")).toHaveText('Practice my timing added to Siri. Say "Practice my timing" to open it.');
  expect(await page.evaluate(() => window.__siriCalls)).toEqual(["practice"]);

  await page.evaluate(() => { window.__nextSiri = { result: "updated", phrase: "Time my crossing" }; });
  await practice.click();
  await expect(practice).toHaveAttribute("aria-label", 'Practice my timing. Siri phrase: "Time my crossing"');
  await expect(page.locator("#siriNote")).toHaveText('The Siri phrase for Practice my timing is now "Time my crossing".');

  await page.evaluate(() => { window.__nextSiri = { result: "removed" }; });
  await practice.click();
  await expect(practice).toHaveAttribute("aria-label", "Practice my timing. No Siri phrase yet");
  await expect(practice.locator(".siri-check")).toHaveText("");
  await expect(page.locator("#siriNote")).toHaveText("The Siri phrase for Practice my timing was removed.");

  // Closing Apple's sheet without a change says nothing.
  await page.evaluate(() => { window.__nextSiri = { result: "cancelled" }; });
  await practice.click();
  await expect(page.locator("#siriNote")).toHaveText("");
  // The same button stays in place (VoiceOver's focus is not lost).
  expect(await page.evaluate(() => document.querySelectorAll("#siriList [data-siri]").length)).toBe(4);
});

test("25.2: an app without the Siri page falls back to the Shortcuts app button", async ({ page }) => {
  await stubIosShell(page, { siri: false });
  await openApp(page);
  await page.evaluate(() => gsShowScreen("shortcuts"));
  await expect(page.locator("#openShortcutsAppBtn")).toBeVisible();
  await expect(page.locator("#siriList")).toBeHidden();
});

test("25.2: the web page has no Siri list (iPhone only)", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => gsShowScreen("shortcuts"));
  await expect(page.locator("#shortcutsWeb")).toBeVisible();
  await expect(page.locator("#shortcutsIos")).toBeHidden();
  await expect(page.locator("#siriList [data-siri]")).toHaveCount(0);
});

/* ---------------- 20.4: the installed app's setup link ---------------- */

async function linkFor(page, code, clear, full) {
  await openApp(page);
  await setTimes(page, clear, full, "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.fill("#clientCode", code);
  await page.locator("#clientCode").dispatchEvent("change");
  const link = await page.evaluate(() => buildShareTimingLink());
  return link.split("ts=")[1];
}

async function phoneWithAb1AndCd2(page) {
  await page.evaluate(() => localStorage.clear());
  await openApp(page, { storage: { "om-client-code": "AB1", "om-attempt-log": JSON.stringify([ENTRY]) } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsStudentsAdd("CD2", "2026-11-03"));
  await page.evaluate(() => gsStore.commitNow());
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function" && typeof window.__appUrl === "function");
  expect(await page.evaluate(() => localStorage.getItem("om-client-code"))).toBe("CD2");
}

test("20.4: gapsense://setup for AB1, opened while CD2 is selected, restarts on AB1 and sets AB1 up; CD2 is untouched", async ({ page }) => {
  await stubIosShell(page);
  const token = await linkFor(page, "AB1", "3", "6");
  await phoneWithAb1AndCd2(page);
  await page.evaluate((t) => window.__appUrl({ url: `gapsense://setup?ts=${t}` }), token);
  await page.waitForFunction(() => typeof gsBoot === "function" && localStorage.getItem("om-client-code") === "AB1" && clearTimeInput.value === "3", null, { timeout: 15000 });
  const state = await page.evaluate(() => ({
    code: localStorage.getItem("om-client-code"),
    times: [clearTimeInput.value, fullTimeInput.value],
    tries: JSON.parse(localStorage.getItem("om-attempt-log") || "[]").length,
    students: gsStudentsLoad().list.map((s) => s.code),
    hash: window.location.hash
  }));
  expect(state).toEqual({ code: "AB1", times: ["3", "6"], tries: 1, students: ["AB1", "CD2"], hash: "" });
  const cd2 = await page.evaluate(() => {
    const r = gsStudentsLoad();
    const id = r.list.find((s) => s.code === "CD2").id;
    return { code: r.data[id]["om-client-code"], clear: r.data[id]["om-clear-time"] ?? null };
  });
  expect(cd2.code).toBe("CD2");
  expect(cd2.clear).not.toBe("3");
});

test("20.4: gapsense://setup for a code not on the phone adds that student instead of relabelling the one in use", async ({ page }) => {
  await stubIosShell(page);
  const token = await linkFor(page, "EF3", "5", "9");
  await phoneWithAb1AndCd2(page);
  await page.evaluate((t) => window.__appUrl({ url: `gapsense://setup?ts=${t}` }), token);
  await page.waitForFunction(() => typeof gsBoot === "function" && localStorage.getItem("om-client-code") === "EF3" && clearTimeInput.value === "5", null, { timeout: 15000 });
  const students = await page.evaluate(() => gsStudentsLoad().list.map((s) => s.code));
  expect(students).toEqual(["AB1", "CD2", "EF3"]);
});

test("20.4: gapsense://setup for the student in use is applied at once, with no restart", async ({ page }) => {
  await stubIosShell(page);
  const token = await linkFor(page, "CD2", "3.5", "7");
  await phoneWithAb1AndCd2(page);
  await page.evaluate(() => { window.__notReloaded = true; });
  await page.evaluate((t) => window.__appUrl({ url: `gapsense://setup?ts=${t}` }), token);
  await expect(page.locator("#clearTime")).toHaveValue("3.5");
  expect(await page.evaluate(() => ({ still: window.__notReloaded, code: localStorage.getItem("om-client-code"), hash: window.location.hash }))).toEqual({ still: true, code: "CD2", hash: "" });
});

/* ---------------- 14.1: the last three texts ---------------- */

test("14.1: About and the instructor notes say where the data is, including the phone's own backup", async ({ page }) => {
  await stubIosShell(page);
  await openApp(page);
  await page.evaluate(() => gsShowScreen("help"));
  const about = page.locator("#aboutPrivacy");
  await expect(about).toHaveText("Free, open source, and private. The app collects no data: everything is kept on this phone, and in your phone's own backup if it is on. Nothing is sent unless you send it.");
  await expect(page.locator("#screen-help")).toContainText("kept on their phone, and in the phone's own backup if it is on");
  const html = await page.content();
  expect(html).not.toContain("Nothing leaves this device");
  expect(html).not.toContain("Data never leaves their device");
});

test("14.1: in a browser, About says the data is kept only in this browser", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => gsShowScreen("help"));
  await expect(page.locator("#aboutPrivacy")).toHaveText("Free, open source, and private. The app collects no data: everything is kept only in this browser. Nothing is sent unless you send it.");
});

test("14.1: the written report's footer no longer says no data leaves the device", async ({ page }) => {
  await openApp(page, { storage: { "om-attempt-log": JSON.stringify([ENTRY]) } });
  await setTimes(page);
  const report = await page.evaluate(() => gsBuildReport());
  expect(report).not.toContain("No data leaves the device");
  expect(report).toContain("Sent by the student from CrossingTime. The app collects no data; this report reached you because the student sent it.");
});

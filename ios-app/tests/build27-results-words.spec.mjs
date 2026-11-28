// Build 27: tracker F12 (Cindi, 15 Nov 2026). The results in words can be
// chosen in Accessibility for every activity, or on each activity page; only
// then does each page show its own choice. Build 31 (tracker 28.10): the
// choice is Full, Short or Off, where it was a tick box.
import { test, expect } from "@playwright/test";
import { openApp, setTimes, watchErrors } from "./helpers.mjs";

const PAGES = ["practice", "signal", "compare", "live"];

async function chooseWhere(page, value) {
  await page.evaluate((v) => {
    const sel = document.getElementById("a11yDescribeWhere");
    sel.value = v;
    sel.dispatchEvent(new Event("change"));
  }, value);
}

test("F12: by default the choice in Accessibility applies to every activity and no page shows its own", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page);
  expect(await page.evaluate(() => [a11ySettings.describeWhere, document.getElementById("a11yDescribeWhere").value])).toEqual(["all", "all"]);
  for (const name of PAGES) {
    await page.evaluate((n) => gsShowScreen(n), name);
    await expect(page.locator(`#screen-${name} .results-words-switch`)).toBeHidden();
  }
  await expect(page.locator("#a11yResultsWords")).toBeEnabled();
  expect(errors).toEqual([]);
});

test("F12: 'On each activity page' shows a choice on every activity page, starting from the current choice", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await chooseWhere(page, "each");
  await expect(page.locator("#a11yResultsWords")).toBeDisabled();
  for (const name of PAGES) {
    await page.evaluate((n) => gsShowScreen(n), name);
    const box = page.locator(`#screen-${name} [data-results-words="${name}"]`);
    await expect(box).toBeVisible();
    await expect(box).toHaveValue("full");
    await expect(page.locator(`#screen-${name} .results-words-switch`)).toContainText("Results in words");
  }
});

test("F12: each page keeps its own choice, and descriptions follow the page on screen", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await chooseWhere(page, "each");
  await page.evaluate(() => gsShowScreen("compare"));
  await page.locator('#screen-compare [data-results-words="compare"]').selectOption("short");
  const state = await page.evaluate(() => ({
    compare: gsDescribeOn("compare"),
    practice: gsDescribeOn("practice"),
    onScreen: gsDescribeOn(),
    saidOnCompare: gsDescribe("That was the sample."),
    stored: localStorage.getItem("om-a11y-results-words-compare")
  }));
  expect(state).toEqual({ compare: false, practice: true, onScreen: false, saidOnCompare: false, stored: "short" });
  await page.evaluate(() => gsShowScreen("practice"));
  expect(await page.evaluate(() => gsDescribeOn())).toBe(true);
});

test("F12: the choice survives a restart", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await chooseWhere(page, "each");
  await page.evaluate(() => gsShowScreen("live"));
  await page.locator('#screen-live [data-results-words="live"]').selectOption("short");
  await page.evaluate(() => gsStore?.commitNow?.());
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await page.evaluate(() => gsShowScreen("live"));
  await expect(page.locator('#screen-live [data-results-words="live"]')).toHaveValue("short");
  await expect(page.locator("#a11yDescribeWhere")).toHaveValue("each");
  expect(await page.evaluate(() => [gsDescribeOn("live"), gsDescribeOn("compare")])).toEqual([false, true]);
});

test("F12: back to 'Here, for every activity' hides the page choices and the choice in Accessibility applies again", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await chooseWhere(page, "each");
  await page.evaluate(() => gsShowScreen("practice"));
  await page.locator('#screen-practice [data-results-words="practice"]').selectOption("short");
  await chooseWhere(page, "all");
  await expect(page.locator("#screen-practice .results-words-switch")).toBeHidden();
  await expect(page.locator("#a11yResultsWords")).toBeEnabled();
  expect(await page.evaluate(() => gsDescribeOn("practice"))).toBe(true);
});

test("F12: a verbosity level resets every page to that level", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await chooseWhere(page, "each");
  await page.evaluate(() => {
    const v = document.getElementById("a11yVerbosity");
    v.value = "low";
    v.dispatchEvent(new Event("change"));
  });
  expect(await page.evaluate(() => ["practice", "signal", "compare", "live"].map((n) => gsDescribeOn(n)))).toEqual([false, false, false, false]);
  await page.evaluate(() => gsShowScreen("signal"));
  await expect(page.locator('#screen-signal [data-results-words="signal"]')).toHaveValue("short");
});

/* ---------------- 22.5: follow the phone's text size and contrast ---------------- */

function stubShell(page, platform, { phoneScale = null, androidScale = null, announceNever = false } = {}) {
  return page.addInitScript(({ platform, phoneScale, androidScale, announceNever }) => {
    if (phoneScale !== null) window.__gsPhoneTextScale = phoneScale;
    window.__announced = [];
    const plugins = {
      GSNative: {
        haptic: async () => {},
        pendingScreen: async () => ({}),
        accessibilityStatus: async () => ({ screenReader: true }),
        announce: ({ text }) => { window.__announced.push(text); return announceNever ? new Promise(() => {}) : Promise.resolve({ finished: true }); },
        addListener: () => ({ remove() {} })
      },
      App: { getInfo: async () => ({ version: "1.0", build: "27" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
      StatusBar: { setStyle: async () => {} }
    };
    if (platform === "android") {
      plugins.GSAndroid = { textScale: async () => ({ scale: androidScale ?? 1 }), accessibilityStatus: async () => ({ screenReader: false }), setWindowBackground: async () => {} };
    }
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => platform, Plugins: plugins };
  }, { platform, phoneScale, androidScale, announceNever });
}

const rootPx = (page) => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));

test("22.5: a new install follows the phone's text size; in a browser the choice is called 'Same as my browser'", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#a11yTextSize")).toHaveValue("system");
  await expect(page.locator('#a11yTextSize option[value="system"]')).toHaveText("Same as my browser");
  expect(await rootPx(page)).toBeCloseTo(18, 1);
});

test("22.5: on an iPhone set to larger text, the app is larger too, and the large-text layout turns on", async ({ page }) => {
  await stubShell(page, "ios", { phoneScale: 1.5 });
  await openApp(page);
  await expect(page.locator('#a11yTextSize option[value="system"]')).toHaveText("Same as my phone");
  expect(await rootPx(page)).toBeCloseTo(27, 1);
  expect(await page.evaluate(() => document.body.classList.contains("large-text-layout"))).toBe(true);
  // A size picked in the app wins over the phone's.
  await page.evaluate(() => { const s = document.getElementById("a11yTextSize"); s.value = "default"; s.dispatchEvent(new Event("change")); });
  expect(await rootPx(page)).toBeCloseTo(18, 1);
  expect(await page.evaluate(() => localStorage.getItem("om-a11y-text-size"))).toBe("default");
});

test("22.5: on Android the app asks the phone for its font size", async ({ page }) => {
  await stubShell(page, "android", { androidScale: 2 });
  await openApp(page);
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.documentElement).fontSize) > 30);
  expect(await rootPx(page)).toBeCloseTo(36, 1);
});

test("22.5: a size chosen before build 27 is kept", async ({ page }) => {
  await openApp(page, { storage: { "om-a11y-text-size": "xl" } });
  await expect(page.locator("#a11yTextSize")).toHaveValue("xl");
  expect(await rootPx(page)).toBeCloseTo(36, 1);
});

test("22.5: High contrast follows the phone's Increase Contrast until the student sets it", async ({ page }) => {
  await page.emulateMedia({ contrast: "more" });
  await openApp(page);
  expect(await page.evaluate(() => document.body.classList.contains("high-contrast"))).toBe(true);
  await expect(page.locator("#a11yHighContrast")).toBeChecked();
  await page.emulateMedia({ contrast: "no-preference" });
  await expect.poll(() => page.evaluate(() => document.body.classList.contains("high-contrast"))).toBe(false);
  // Once set in the app, the phone no longer changes it.
  await page.evaluate(() => { const b = document.getElementById("a11yHighContrast"); b.checked = true; b.dispatchEvent(new Event("change")); });
  await page.emulateMedia({ contrast: "no-preference" });
  expect(await page.evaluate(() => document.body.classList.contains("high-contrast"))).toBe(true);
});

/* ---------------- Sharon, Nov 17: never stall waiting for VoiceOver ---------------- */

test("VoiceOver that never says it has finished: the app moves on after a few seconds, not 16", async ({ page }) => {
  await stubShell(page, "ios", { announceNever: true });
  await openApp(page);
  const ms = await page.evaluate(() => new Promise((resolve) => {
    const t0 = performance.now();
    gsScreenReaderSay("Get ready.", { onDone: () => resolve(performance.now() - t0) });
  }));
  expect(ms).toBeGreaterThan(3500);
  expect(ms).toBeLessThan(6000);
});

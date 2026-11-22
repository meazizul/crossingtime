import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick, waitUntil, swipeOn, answerOn, streetGesture, statusText, announcer } from "./helpers.mjs";

/*
 * Build 14: the pads after Cindi's VoiceOver tests of builds 12 and 13
 * (tracker 12.27, 12.28, 12.29, 12.31, 12.32, 13.2, 13.3, 13.5, 13.6, 13.7, F6).
 */

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

/* The iPhone's native side, stood in for: records what the page asks of it. */
function nativeIos() {
  return () => {
    window.__native = { shows: [], hides: 0, listeners: {} };
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      Plugins: {
        GSNative: {
          haptic: async () => {}, pendingScreen: async () => ({}),
          tone: async () => ({ id: 1 }), sustainStart: async () => ({ id: 2 }), sustainStop: async () => {}, stopSound: async () => {},
          keepAwake: async () => {},
          directTouchShow: async (args) => { window.__native.shows.push(args); return { shown: true }; },
          directTouchHide: async () => { window.__native.hides += 1; },
          audioStatus: async () => ({ engineRunning: true, category: "AVAudioSessionCategoryPlayback", ignoresSilentSwitch: true, outputVolume: 1, outputLatency: 0.01, route: "Speaker", peak: 0 }),
          speak: async () => {}, stopSpeaking: async () => {}, canOpen: async () => ({ canOpen: true }),
          addListener: (name, fn) => { window.__native.listeners[name] = fn; return { remove: () => {} }; }
        },
        App: { getInfo: async () => ({ version: "1.0", build: "14" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  };
}

async function openCompare(page, storage = {}) {
  await openApp(page, { storage });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
}

async function openAnswerPad(page) {
  await page.evaluate(() => { Object.assign(gsCompareState, { intervalSec: 10, crossingSec: 4, expected: "longer", phase: "answering" }); gsCompareAskAnswer(); });
  await expect(page.locator("#answerOverlay")).toBeVisible();
}

test("F6: First half is listed first and selected on both comparison screens", async ({ page }) => {
  await openCompare(page);
  for (const name of ["compareStreet", "signalStreet"]) {
    const values = await page.evaluate((n) => [...document.querySelectorAll(`input[name='${n}']`)].map((i) => i.value), name);
    expect(values).toEqual(["half", "full"]);
    expect(await page.evaluate((n) => document.querySelector(`input[name='${n}']:checked`).value, name)).toBe("half");
  }
  expect(await page.evaluate(() => gsCompareState.street)).toBe("half");
  expect(await page.evaluate(() => gsSignalState.street)).toBe("half");
});

test("13.7: Back on the answer pad cancels the try, records it as cancelled, never scores it, and puts focus on the screen's title", async ({ page }) => {
  await openCompare(page);
  await openAnswerPad(page);
  const back = page.locator("#answerBackBtn");
  await expect(back).toHaveAttribute("aria-label", "Back");
  const box = await back.boundingBox();
  expect(box.x).toBeLessThan(40);                        // top-left corner, outside the swipe area
  expect(box.y).toBeLessThan(80);
  const area = await page.locator("#answerSurface").boundingBox();
  expect(area.y).toBeGreaterThanOrEqual(box.y + box.height - 1);
  await back.click();
  await expect(page.locator("#answerOverlay")).toBeHidden();
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "compare", skipped: true, skip: "judgment", correct: false });
  expect(await page.evaluate(() => gsSummary().total)).toBe(0);
  expect(await statusText(page, "compareStatusText")).toBe("Cancelled. Not scored. Press Play for another.");
  await expect(page.locator("#screenTitle")).toBeFocused();
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("idle");
});

test("13.7: Back on How much keeps the judgment and cancels only the estimate; Escape does the same as Back", async ({ page }) => {
  await openCompare(page, { "om-compareFollowUp": "true" });
  await openAnswerPad(page);
  await answerOn(page, "longer");
  await tick(page, 1300);
  await expect(page.locator("#howMuchOverlay")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#howMuchOverlay")).toBeHidden();
  const log = await history(page);
  expect(log).toHaveLength(1);                            // one try, one record (12.37)
  expect(log[0]).toMatchObject({ answer: "longer", correct: true });
  expect(log[0].howMuch).toMatchObject({ skipped: true });
  expect(await page.evaluate(() => gsSummary().byActivity.compare)).toMatchObject({ total: 1, correct: 1, skippedHowMuch: 1 });
  expect(await statusText(page, "compareStatusText")).toContain("Estimate cancelled");
  await expect(page.locator("#screenTitle")).toBeFocused();
});

test("13.7 at the street: Back on the answer pad returns to the street pad; Back on the street pad with a vehicle in progress records it as cancelled", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("live"));
  await page.click("#liveStartBtn");
  await streetGesture(page, "left");
  await tick(page, 3000);
  await streetGesture(page, "tap");
  await expect(page.locator("#answerOverlay")).toBeVisible();
  await page.click("#answerBackBtn");
  await expect(page.locator("#answerOverlay")).toBeHidden();
  await expect(page.locator("#liveOverlay")).toBeVisible();
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("detect");
  expect(await page.evaluate(() => document.getElementById("liveOverlay").contains(document.activeElement))).toBe(true);
  expect(await statusText(page, "liveOverlayStatus")).toContain("Cancelled");
  let log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "live", skipped: true, skip: "judgment", judged: false });
  expect(log[0].userSec).toBeGreaterThan(2.8);          // the warning time stays in the record
  // A vehicle in progress, then Back on the street pad.
  await streetGesture(page, "right");
  await page.click("#liveBackBtn");
  await expect(page.locator("#liveOverlay")).toBeHidden();
  log = await history(page);
  expect(log).toHaveLength(2);
  expect(log[1]).toMatchObject({ activity: "live", direction: "right", skipped: true, skip: "vehicle" });
  expect(await page.evaluate(() => gsSummary().total)).toBe(0);
  await expect(page.locator("#screenTitle")).toBeFocused();
});

test("12.31: with swipes on the whole pad below the header is the swipe area, there are no buttons, and the question is shown at the student's size", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openCompare(page, { "om-a11y-text-size": "max" });
  await openAnswerPad(page);
  await expect(page.locator("#answerOverlay .answer-grid")).toBeHidden();
  const pad = await page.locator("#answerOverlay").boundingBox();
  const area = await page.locator("#answerSurface").boundingBox();
  expect(area.width).toBeGreaterThan(pad.width - 40);
  expect(area.height).toBeGreaterThan(pad.height * 0.75);
  expect(area.y + area.height).toBeLessThanOrEqual(667 + 0.5);   // fits without scrolling
  const fontPx = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById("answerQuestion")).fontSize));
  expect(fontPx).toBeGreaterThan(36);                    // at 300%, text well above the old ~22 px cap
  // A swipe anywhere, even at the far edge, answers.
  await page.mouse.move(area.x + 20, area.y + area.height - 30);
  await page.mouse.down();
  await page.mouse.move(area.x + 20, area.y + area.height - 200, { steps: 4 });
  await page.mouse.up();
  expect((await history(page))[0]).toMatchObject({ answer: "longer" });
});

test("12.31: with buttons only (instructor), the three buttons show and the swipe area is gone, at the street too", async ({ page }) => {
  await openCompare(page, { "om-features": JSON.stringify({ options: { compareSwipe: "off" } }) });
  await openAnswerPad(page);
  await expect(page.locator("#answerSurface")).toBeHidden();
  await expect(page.locator("#answerOverlay .answer-btn")).toHaveCount(3);
  await expect(page.locator("#answerOverlay .answer-btn[data-answer='same']")).toBeFocused();
  await page.click("#answerBackBtn");
  await page.evaluate(() => gsShowScreen("live"));
  await page.click("#liveStartBtn");
  await expect(page.locator("#liveSurface")).toBeHidden();
  await expect(page.locator("#liveDetectButtons")).toBeVisible();
  await page.click("[data-live-detect='left']");
  await expect(page.locator("#liveArriveButtons")).toBeVisible();
});

test("12.27: after a try in Comparison practice, focus is still on Play, which was busy and never disabled", async ({ page }) => {
  await openCompare(page);
  await page.click("input[name='compareStreet'][value='full']");
  // A focus watchdog: a drop is focus landing on the body or on a hidden or disabled control.
  await page.evaluate(() => {
    window.__drops = [];
    document.addEventListener("focusout", () => setTimeout(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el.disabled || el.closest("[hidden],[inert]")) window.__drops.push(el ? el.id || el.tagName : "none");
    }, 0));
  });
  await page.focus("#compareStartBtn");
  await page.click("#compareStartBtn");
  await expect(page.locator("#compareStartBtn")).toHaveAttribute("aria-disabled", "true");
  expect(await page.evaluate(() => document.getElementById("compareStartBtn").disabled)).toBe(false);
  await waitUntil(page, () => gsCompareState.phase === "answering", { ms: 20000, step: 200 });
  await expect(page.locator("#answerSurface")).toBeFocused();
  await answerOn(page, "same");
  await waitUntil(page, () => gsCompareState.phase === "idle", { ms: 45000, step: 250 });
  await expect(page.locator("#compareStartBtn")).toBeFocused();
  expect(await page.evaluate(() => window.__drops)).toEqual([]);
});

test("12.27: Comparison preparation and Practice keep their button focusable through the replay", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("signal"); gsSignalState.phase = "timing"; gsSignalResolve(4.1); });
  await expect(page.locator("#signalBtn")).toHaveAttribute("aria-disabled", "true");
  expect(await page.evaluate(() => document.getElementById("signalBtn").disabled)).toBe(false);
  await tick(page, 9000);
  await expect(page.locator("#signalBtn")).toHaveAttribute("aria-disabled", "false");
  await page.evaluate(() => gsShowScreen("practice"));
  await page.click("#actionBtn");
  await tick(page, 4000);
  await page.click("#actionBtn");
  await expect(page.locator("#actionBtn")).toHaveAttribute("aria-disabled", "true");
  expect(await page.evaluate(() => document.getElementById("actionBtn").disabled)).toBe(false);
  // A press while busy does nothing: no extra mark, no restart.
  const before = await page.evaluate(() => [stage, markerTimes.length]);
  await page.click("#actionBtn", { force: true });
  expect(await page.evaluate(() => [stage, markerTimes.length])).toEqual(before);
  await tick(page, 8000);
  await expect(page.locator("#actionBtn")).toHaveAttribute("aria-disabled", "false");
});

test("12.29, revised in build 15: the result is said only after its sound, the replay waits for the words, and each page explains its replay up front", async ({ page }) => {
  // Words came back in build 15 (Jonggi, 25 Oct 2026), but never cut off: the
  // verdict is spoken after the right/wrong sound, the replay starts when
  // the words are over, and the replay is described once it has ended.
  await page.addInitScript(() => {
    window.__spoken = [];
    const fake = { speaking: false, cancel() {}, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 10); }, getVoices() { return []; } };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  });
  await openCompare(page);
  expect(await page.locator("#screen-compare .screen-intro").innerText()).toMatch(/the sample plays again, with your own sound( or vibration|, flash or vibration)? where your crossing time ends/);
  expect(await page.locator("#screen-signal .screen-intro").innerText()).toContain("you hear it again");
  expect(await page.locator("#screen-live .screen-intro").innerText()).toContain("plays again as a sound");
  await openAnswerPad(page);
  await page.evaluate(() => { window.__spoken = []; window.__said = []; const el = document.getElementById("srAnnouncer"); new MutationObserver(() => window.__said.push(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true }); });
  await answerOn(page, "shorter");                       // wrong
  await tick(page, 50);
  const spoken = () => page.evaluate(() => window.__spoken);
  expect((await spoken())[0]).toMatch(/^(Correct\.|Not correct\. It was (longer|shorter|about the same)\.)$/);
  // The replay has not started while the words are being said.
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("judged");
  await waitUntil(page, () => gsCompareState.phase === "idle", { ms: 45000, step: 250 });
  const all = await spoken();
  expect(all[1]).toBe("Replay");
  expect(all[all.length - 1]).toBe("That was the sample warning time, then your own sound where your crossing time ends. Press Play for another.");
  // Nothing went to the live region as well: the app spoke for itself.
  const said = await page.evaluate(() => window.__said.map((s) => s.replace(/​/g, "")));
  expect(said.join(" | ")).not.toMatch(/Correct|It was|That was/);
  expect(await statusText(page, "compareStatusText")).toBe("Press Play for another.");
});

test("12.32: the safety notes and the sections on the activity pages are headings, and the Options arrow is not text", async ({ page }) => {
  await openCompare(page);
  await page.evaluate(() => { localStorage.removeItem("om-safety-dismissed-compare"); gsRenderSafetyNotes(); });
  const headings = await page.evaluate(() => [...document.querySelectorAll("#screen-compare h2")].filter((h) => h.offsetParent !== null).map((h) => h.textContent.trim()));
  expect(headings).toEqual(expect.arrayContaining(["Which crossing", "Longer does not mean long enough", "Options: sound, loudness, pauses, how much"]));
  expect(await page.evaluate(() => document.querySelector("[data-safety-note='compare']").getAttribute("aria-labelledby"))).toBe("safetyNoteCompareTitle");
  expect(await page.evaluate(() => getComputedStyle(document.querySelector("#compareOptions > summary"), "::before").content)).toBe('""');
  for (const screen of ["signal", "live"]) {
    await page.evaluate((s) => gsShowScreen(s), screen);
    const hs = await page.evaluate((s) => [...document.querySelectorAll(`#screen-${s} h2`)].filter((h) => h.offsetParent !== null).length, screen);
    expect(hs).toBeGreaterThanOrEqual(2);
  }
});

test("12.33: Comparison practice's Play is the same big button as Practice and is on screen when the page opens", async ({ page }) => {
  await openCompare(page);
  const play = await page.locator("#compareStartBtn").boundingBox();
  await page.evaluate(() => gsShowScreen("practice"));
  const begin = await page.locator("#actionBtn").boundingBox();
  expect(play.height).toBeGreaterThanOrEqual(begin.height - 1);
  expect(play.y + play.height).toBeLessThanOrEqual(844);
  await page.evaluate(() => gsShowScreen("live"));
  const start = await page.locator("#liveStartBtn").boundingBox();
  expect(start.y + start.height).toBeLessThanOrEqual(844);
});

test("13.5: nothing credits Cindi with 'never made to guess'", async ({ page }) => {
  await openApp(page);
  const text = await page.evaluate(() => document.body.innerText);
  expect(text).not.toMatch(/made to guess/i);
});

test("iPhone (12.28, 13.2, 13.6): the cursor is sent to the native area as a pad opens, the web area is hidden from VoiceOver, and the area is removed when the pad closes", async ({ page }) => {
  await page.addInitScript(nativeIos());
  await openCompare(page, { "om-compareFollowUp": "true" });
  await openAnswerPad(page);
  await page.waitForTimeout(150);
  const shows = await page.evaluate(() => window.__native.shows);
  // Build 28 (tracker 27.19): the label now starts with the question, then
  // the same instructions as before.
  const answerShow = shows.find((s) => s.label.includes("Answer area"));
  expect(answerShow.label.startsWith("Answer area")).toBe(false);
  expect(answerShow.focus).toBe(true);
  expect(answerShow.hint).toContain("Direct Touch");
  // Nothing under the area is focused: the page's title holds web focus, the
  // web area is hidden from VoiceOver.
  await expect(page.locator("#answerOverlayTitle")).toBeFocused();
  expect(await page.getAttribute("#answerSurface", "aria-hidden")).toBe("true");
  // How much: the cursor goes to the area, not to the web button under it,
  // so the first tap already counts (13.6).
  await page.evaluate(() => window.__native.listeners.directTouch({ kind: "up", durationMs: 80 }));
  await tick(page, 1300);
  await expect(page.locator("#howMuchOverlay")).toBeVisible();
  await page.waitForTimeout(150);
  const howMuchShow = (await page.evaluate(() => window.__native.shows)).find((s) => s.label.startsWith("How much"));
  expect(howMuchShow.focus).toBe(true);
  await expect(page.locator("#howMuchTitle")).toBeFocused();
  await page.evaluate(() => window.__native.listeners.directTouch({ kind: "tap", durationMs: 40 }));
  await expect(page.locator("#compareFollowUpBtn")).toHaveText("TAP TO END");
  await tick(page, 2000);
  const hidesBefore = await page.evaluate(() => window.__native.hides);
  await page.evaluate(() => window.__native.listeners.directTouch({ kind: "tap", durationMs: 40 }));
  await expect(page.locator("#howMuchOverlay")).toBeHidden();
  await page.waitForTimeout(150);
  // The pad is gone: the area is taken down (13.2).
  expect(await page.evaluate(() => window.__native.hides)).toBeGreaterThan(hidesBefore);
  expect((await history(page))[0].howMuch).toBeTruthy();
});

test("iPhone: VoiceOver's two-finger scrub on the area does what Back does", async ({ page }) => {
  await page.addInitScript(nativeIos());
  await openCompare(page);
  await openAnswerPad(page);
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__native.listeners.directTouch({ kind: "escape", durationMs: 0 }));
  await expect(page.locator("#answerOverlay")).toBeHidden();
  expect((await history(page))[0]).toMatchObject({ skipped: true, skip: "judgment" });
  await expect(page.locator("#screenTitle")).toBeFocused();
});

test("TalkBack and the web (13.4): the swipe area is a labelled, focusable element, a double-tap click counts as a tap, and the gesture log records it", async ({ page }) => {
  await openCompare(page);
  await openAnswerPad(page);
  expect(await page.getAttribute("#answerSurface", "aria-hidden")).toBeNull();
  expect(await page.getAttribute("#answerSurface", "role")).toBe("group");
  await expect(page.locator("#answerSurface")).toBeFocused();
  // A screen reader's activation arrives as a click with no pointer sequence.
  await page.evaluate(() => document.getElementById("answerSurface").dispatchEvent(new MouseEvent("click", { bubbles: true })));
  expect((await history(page))[0]).toMatchObject({ answer: "same" });
  expect(await page.evaluate(() => gsGestureLog.map((g) => `${g.source}:${g.kind}`))).toContain("click:tap");
  await page.evaluate(() => document.getElementById("gestureLogWrap").open = true);
  await page.evaluate(() => gsRenderGestureLog());
  expect(await page.locator("#gestureLog").innerText()).toContain("click");
});

test("end of page (Cindi and a coworker, Oct 20): the announcer region empties after it has spoken, so a swipe past the last control is not a stop on an old message", async ({ page }) => {
  await openCompare(page);
  await page.evaluate(() => announceScreenReader("Your phone volume is low. Press the volume up button on the side of the phone."));
  expect(await announcer(page)).toContain("Your phone volume is low");
  await tick(page, 4500);
  expect(await announcer(page)).toBe("");
  // Nothing readable follows the last control of a screen: the pads are hidden, the announcer is empty.
  const after = await page.evaluate(() => {
    const main = document.getElementById("appMain");
    let el = main.nextElementSibling; const found = [];
    while (el) { if (!el.hidden && !el.closest("[hidden]") && el.tagName !== "SCRIPT" && el.tagName !== "DIALOG" && (el.textContent || "").trim()) found.push(el.id || el.tagName); el = el.nextElementSibling; }
    return found;
  });
  expect(after).toEqual([]);
});

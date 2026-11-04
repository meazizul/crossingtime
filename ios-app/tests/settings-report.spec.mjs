import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes, history, screenVisible } from "./helpers.mjs";

test("setup link carries times, margin, instructor email, student code and the instructor's choices, and imports them", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page, "3.5", "7.2", "0.3");
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.fill("#instructorEmail", "oms@example.org");
  await page.locator("#instructorEmail").dispatchEvent("change");
  await page.fill("#clientCode", "ab-12x!");
  await page.locator("#clientCode").dispatchEvent("change");
  await expect(page.locator("#clientCode")).toHaveValue("AB12X");
  await page.uncheck("[data-feature-activity='live']");
  await page.selectOption("#ftCompareHowMuch", "on");
  await page.selectOption("#ftMagnitudeReplay", "b");
  const link = await page.evaluate(() => buildShareTimingLink());
  // v4: no periods inside the token, and short enough for one text.
  expect(link).toMatch(/#ts=4[A-Za-z0-9_-]+$/);
  expect(link.length).toBeLessThan(200);

  // A fresh device opens the link.
  await openApp(page);
  await page.goto(link);
  await page.waitForFunction(() => typeof gsBoot === "function");
  expect(await page.evaluate(() => [clearTimeInput.value, fullTimeInput.value, marginInput.value])).toEqual(["3.5", "7.2", "0.3"]);
  expect(await page.evaluate(() => [instructorEmailInput.value, clientCodeInput.value])).toEqual(["oms@example.org", "AB12X"]);
  expect(await page.evaluate(() => [gsActivityEnabled("live"), gsFeature("compareHowMuch"), gsFeature("magnitudeReplay")])).toEqual([false, "on", "b"]);
  expect(await page.evaluate(() => localStorage.getItem("om-demo-times"))).toBeNull();
  await expect(page.locator("#homeTimes")).toHaveText("Crossing times set");
  await expect(page.locator(".step-card[data-screen='live']")).toBeHidden();
  await expect(page.locator("#cueBannerText")).toHaveText("Your instructor's setup is now on this device.");
  expect(page.url()).not.toContain("#ts=");
  // The browser offers to hand the same setup to the installed app.
  await expect(page.locator("#openInAppModal")).toHaveJSProperty("open", true);
  expect(await page.getAttribute("#openInAppLink", "href")).toMatch(/^gapsense:\/\/setup\?ts=4[A-Za-z0-9_-]+$/);
  await page.click("#openInAppClose");
  await expect(page.locator("#openInAppModal")).toHaveJSProperty("open", false);
  expect(errors).toEqual([]);
});

test("the instructor chooses what the link carries", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "3", "6", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.uncheck("#shareIncludeTimes");
  await page.uncheck("#shareIncludeContact");
  const payload = await page.evaluate(() => {
    const token = buildShareTimingToken();
    return JSON.parse(decodeBase64Url(token.slice(1, -7)));
  });
  expect(payload.t).toBeUndefined();
  expect(payload.e).toBeUndefined();
  expect(await page.evaluate((f) => decodeLinkFeatures(f).activities.practice, payload.f)).toBe(true);
  // Features only: the student's own times stay as they were.
  const link = await page.evaluate(() => buildShareTimingLink());
  await openApp(page);
  await setTimes(page, "5", "9", "0.5");
  await page.goto(link);
  await page.waitForFunction(() => typeof gsBoot === "function");
  expect(await page.evaluate(() => [clearTimeInput.value, fullTimeInput.value])).toEqual(["5", "9"]);
  await page.click("#openInAppClose");
  // Nothing at all to carry is refused.
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.uncheck("#shareIncludeTimes");
  await page.uncheck("#shareIncludeContact");
  await page.uncheck("#shareIncludeFeatures");
  await page.click("#shareTimingSettings");
  await expect(page.locator("#shareNote")).toHaveText("Choose at least one thing for the link to carry.");
});

test("sharing opens the share sheet, or copies when there is none; texting opens Messages", async ({ page }) => {
  await page.addInitScript(() => {
    window.__shared = null;
    navigator.share = async (data) => { window.__shared = data; };
  });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.click("#shareTimingSettings");
  // No instructor code is set, so the note also says the link locks nothing.
  await expect(page.locator("#shareNote")).toHaveText("Setup link shared. It does not lock Instructor setup: set an instructor code first.");
  const shared = await page.evaluate(() => window.__shared);
  expect(shared.text).toMatch(/#ts=4[A-Za-z0-9_-]+$/);
  expect(shared.title).toBe("CrossingTime setup");
  // Texting: the sms: URL carries the message, no number.
  const smsUrl = await page.evaluate(() => {
    let captured = "";
    const real = window.gsOpenSms;
    window.gsOpenSms = (text) => { captured = text; };
    textSetupToStudent();
    window.gsOpenSms = real;
    return captured;
  });
  expect(smsUrl).toContain("CrossingTime setup from your instructor. Tap the link below once.");
});

test("old v1 and v2 links still import; tampered or oversized links are rejected", async ({ page }) => {
  await openApp(page);
  const v1 = await page.evaluate(() => {
    const payload = encodeBase64Url("4|8|0.4");
    return `${location.origin}/index.html#ts=v1.${payload}.${computeShareChecksum(payload)}`;
  });
  await openApp(page);
  await page.goto(v1);
  await page.waitForFunction(() => typeof gsBoot === "function");
  expect(await page.evaluate(() => [clearTimeInput.value, fullTimeInput.value])).toEqual(["4", "8"]);

  const v2 = await page.evaluate(() => {
    const payload = encodeBase64Url("3|7|0.3|a@b.org|Z9");
    return `${location.origin}/index.html#ts=v2.${payload}.${computeShareChecksum(payload)}`;
  });
  await openApp(page);
  await page.goto(v2);
  await page.waitForFunction(() => typeof gsBoot === "function");
  expect(await page.evaluate(() => [clearTimeInput.value, clientCodeInput.value])).toEqual(["3", "Z9"]);

  const bad = await page.evaluate(() => {
    const make = (v, raw) => { const p = encodeBase64Url(raw); return `${location.origin}/index.html#ts=${v}.${p}.${computeShareChecksum(p)}`; };
    return {
      badCode: make("v2", "4|8|0.4||TOO_LONG_CODE"),
      badEmail: make("v2", "4|8|0.4|not-an-email|AB"),
      huge: make("v2", "4000|8|0.4||"),
      badSum: `${location.origin}/index.html#ts=v2.${encodeBase64Url("4|8|0.4||")}.zzzzzzz`,
      v3BadJson: make("v3", "{not json"),
      v3Empty: make("v3", "{}"),
      v3HugeTime: make("v3", JSON.stringify({ t: ["4", "8000", "0.4"] }))
    };
  });
  for (const url of Object.values(bad)) {
    await openApp(page);
    await page.goto(url);
    await page.waitForFunction(() => typeof gsBoot === "function");
    expect(await page.evaluate(() => clearTimeInput.value)).toBe("");
    await expect(page.locator("#cueBannerText")).toHaveText("This setup link is invalid.");
  }
});

test("a linked feature set is cleaned: unknown keys and bad values fall back to the defaults", async ({ page }) => {
  await openApp(page);
  const clean = await page.evaluate(() => gsNormalizeFeatures({
    activities: { practice: "yes", live: false, hacker: true },
    practiceModes: { "2b": false, "2": false, "3": false },
    options: { compareSound: "<script>", liveReplay: "errors", extra: 1 }
  }));
  expect(clean.activities).toEqual({ practice: true, signal: true, compare: true, live: false });
  expect(clean.practiceModes["2b"]).toBe(true);           // at least one mode stays
  expect(clean.options.compareSound).toBe("choose");
  expect(clean.options.liveReplay).toBe("errors");
  expect(clean.options.extra).toBeUndefined();
});

test("instructor setup: activities and practice modes the instructor turns off disappear for the student", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.uncheck("[data-feature-activity='signal']");
  await page.uncheck("[data-feature-mode='3']");
  await page.uncheck("[data-feature-mode='2']");
  // The last mode cannot be turned off.
  await page.click("[data-feature-mode='2b']");
  await expect(page.locator("[data-feature-mode='2b']")).toBeChecked();
  await page.click("#backBtn");
  await expect(page.locator(".step-card[data-screen='signal']")).toBeHidden();
  // Numbers close up: Comparison practice is now 2.
  await expect(page.locator(".step-card[data-screen='compare'] .step-number")).toHaveText("2");
  await page.evaluate(() => gsShowScreen("practice"));
  await expect(page.locator("[data-mode-option='3']")).toBeHidden();
  await expect(page.locator("[data-mode-option='2']")).toBeHidden();
  await expect(page.locator("[data-mode-option='2b']")).toBeVisible();
  // A turned-off activity cannot be reached by a shortcut either.
  await page.evaluate(() => gsShowScreen("signal"));
  await screenVisible(page, "home");
  expect(errors).toEqual([]);
});

test("instructor code: locks the setup, unlocks with the right code only, relocks on leaving", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.fill("#instructorPinSet", "2468");
  await page.click("#instructorPinSaveBtn");
  await page.click("#backBtn");
  await page.evaluate(() => gsShowScreen("instructor"));
  await expect(page.locator("#instructorLockedCard")).toBeVisible();
  await expect(page.locator("#instructorBody")).toBeHidden();
  await page.fill("#instructorPinEntry", "1111");
  await page.click("#instructorUnlockBtn");
  await expect(page.locator("#instructorLockNote")).toHaveText("That code is not right.");
  await page.fill("#instructorPinEntry", "2468");
  await page.click("#instructorUnlockBtn");
  await expect(page.locator("#instructorBody")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("om-instructor-pin"))).not.toBe("2468");
  // Clearing the code removes the lock.
  await page.fill("#instructorPinSet", "");
  await page.click("#instructorPinSaveBtn");
  await page.click("#backBtn");
  await page.evaluate(() => gsShowScreen("instructor"));
  await expect(page.locator("#instructorBody")).toBeVisible();
});

test("instructor email is validated and the student code is limited to 8 letters and digits", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.fill("#instructorEmail", "nope");
  await page.locator("#instructorEmail").dispatchEvent("change");
  expect(await page.evaluate(() => localStorage.getItem("om-instructor-email"))).toBeNull();
  await page.fill("#instructorEmail", "ok@example.org");
  await page.locator("#instructorEmail").dispatchEvent("change");
  expect(await page.evaluate(() => localStorage.getItem("om-instructor-email"))).toBe("ok@example.org");
  await page.fill("#clientCode", "abcdefghijk");
  await expect(page.locator("#clientCode")).toHaveValue("ABCDEFGH");
});

test("sending a report: confirm first, then the share sheet; never a name; street records show direction, sense and judgment", async ({ page }) => {
  await page.addInitScript(() => {
    window.__shared = null;
    navigator.share = async (data) => { window.__shared = data; };
  });
  await openApp(page, { storage: {
    "om-instructor-email": "oms@example.org",
    "om-client-code": "K7",
    "om-attempt-log": JSON.stringify([
      { time: Date.now() - 1000, activity: "practice", street: "half", userSec: 4.1, refSec: 4, diffSec: 0.1, correct: true, marginSec: 0.4 },
      { time: Date.now() - 900, activity: "signal", street: "full", userSec: 7, refSec: 8, diffSec: -1, correct: false, marginSec: 0.4 },
      { time: Date.now() - 800, activity: "compare", street: "full", userSec: 9, refSec: 8, diffSec: 1, correct: false, marginSec: 0.4, answer: "same", expected: "longer" },
      { time: Date.now() - 700, activity: "compare", street: "full", userSec: 1.1, refSec: 1, diffSec: 0.1, correct: true, marginSec: 0.4, answer: "magnitude", expected: "magnitude" },
      { time: Date.now() - 650, activity: "live", street: "half", userSec: 3, refSec: 4, diffSec: -1, correct: false, marginSec: 0.4, answer: "shorter", expected: "shorter", noisy: true },
      { time: Date.now() - 600, activity: "live", street: "half", direction: "left", sense: "hearing", judged: true, userSec: 6, refSec: 4, diffSec: 2, correct: true, marginSec: 0.4, answer: "longer", expected: "longer" },
      { time: Date.now() - 500, activity: "live", street: "full", direction: "right", sense: "vision", never: true, correct: false, userSec: 0, refSec: 8, diffSec: 0, marginSec: 0.4 }
    ])
  } });
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("progress"));
  await expect(page.locator(".progress-card")).toHaveCount(4);
  // Only the judged street vehicle is scored.
  await expect(page.locator(".progress-card").nth(3)).toContainText("1 of 1 correct");
  await expect(page.locator("#reportRecipient")).toContainText("oms@example.org");
  await page.click("#sendReportBtn");
  // Build 14 (12.39): the report itself takes focus, the Show button goes, and only send controls say Send.
  await expect(page.locator("#reportPreview")).toBeFocused();
  await expect(page.locator("#sendReportBtn")).toBeHidden();
  expect(await page.evaluate(() => window.__shared)).toBeNull();     // nothing sent yet
  const report = await page.inputValue("#reportPreview");
  expect(report).toContain("Student code: K7");
  expect(report).toContain("Crossing times: full street 8.00 s, first half 4.00 s. Margin 0.40 s.");
  expect(report).not.toMatch(/Name:|Client code/);
  // Numbers on every line (F2), the time of day, one line per vehicle (12.37).
  expect(report).toMatch(/\d+:\d\d [AP]M  At the street \(first half, from the left, by hearing\): warning time 6\.00 s, crossing 4\.00 s \(2\.00 s longer\), margin 0\.40 s; answered "longer", it was "longer" — correct/);
  expect(report).toContain("At the street (full street, from the right, by vision): vehicle never came");
  expect(report).toContain("warning time 3.00 s, crossing 4.00 s (1.00 s shorter) [not quiet when started]");
  expect(report).not.toMatch(/enough warning/);
  expect(report).toContain('sample 9.00 s, crossing 8.00 s (1.00 s longer), margin 0.40 s; answered "same", it was "longer" — incorrect');
  expect(report).toContain("Comparison practice (full street), how much: tapped 1.10 s, real difference 1.00 s (0.10 s over), margin 0.40 s — within margin");
  expect(report).toContain("Practice my timing (first half): halfway at 4.10 s, real 4.00 s (0.10 s late), margin 0.40 s — within margin");
  expect(report).toContain("Comparison preparation (full street): stopped at 7.00 s, crossing 8.00 s (1.00 s early), margin 0.40 s — outside margin");
  expect(report).toContain("Days practiced");
  await page.click("#confirmSendReportBtn");
  const shared = await page.evaluate(() => window.__shared);
  expect(shared.title).toBe("CrossingTime practice report — K7");
  expect(shared.text).toBe(report);
  await expect(page.locator("#reportNote")).toContainText("Report handed to the app you chose");
  await expect(page.locator("#emailReportBtn")).toBeVisible();
  await page.click("#copyReportBtn");
  await expect(page.locator("#reportNote")).toContainText("Copied");
});

test("deleting history clears attempts and adaptive lanes, and keeps the adaptive switch on", async ({ page }) => {
  await openApp(page, { storage: {
    "om-attempt-log": JSON.stringify([{ time: Date.now(), activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 }]),
    "om-adaptive-margin": JSON.stringify({ enabled: true, lanes: { "practice:half": { margin: 0.2 } } })
  } });
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("progress"));
  await page.click("#clearDataBtn");
  // Build 15 (14.2): the button opens the warning; only Delete history deletes.
  await page.click("#confirmDeleteHistoryBtn");
  expect(await history(page)).toEqual([]);
  // Tracker 20.8: the lanes go back to the instructor's margin, the switch stays on.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("om-adaptive-margin")))).toEqual({ enabled: true, lanes: {} });
  await expect(page.locator("#progressBody")).toContainText("Nothing recorded yet");
});

test("adaptive margin maths: slow tightening, full release, hard floor, per lane", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  const r = await page.evaluate(() => ({
    tighten: gsAdaptiveStep(0.4, 0.9, 0.4),
    hold: gsAdaptiveStep(0.3, 0.7, 0.4),
    release: gsAdaptiveStep(0.2, 0.5, 0.4),
    floor: gsAdaptiveStep(0.1, 1, 0.4),
    neverAboveCeiling: gsAdaptiveStep(0.9, 0.7, 0.4)
  }));
  expect(r.tighten).toBeCloseTo(0.368, 3);
  expect(r.hold).toBeCloseTo(0.3, 6);
  expect(r.release).toBeCloseTo(0.4, 6);
  expect(r.floor).toBeCloseTo(0.1, 6);
  expect(r.neverAboveCeiling).toBeCloseTo(0.4, 6);

  // Ten good attempts in one lane move only that lane.
  await page.evaluate(() => {
    gsSetAdaptiveEnabled(true);
    for (let i = 0; i < 10; i += 1) {
      gsLogAttempt({ activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 });
    }
  });
  expect(await page.evaluate(() => gsEffectiveMargin("practice", "half"))).toBeCloseTo(0.368, 3);
  expect(await page.evaluate(() => gsEffectiveMargin("practice", "full"))).toBeCloseTo(0.4, 6);
  expect(await page.evaluate(() => gsEffectiveMargin("compare", "half"))).toBeCloseTo(0.4, 6);
  // Steps: 0.4 → 0.368 → 0.339 after two full windows; one bad window releases to 0.4.
  await page.evaluate(() => {
    for (let i = 0; i < 10; i += 1) gsLogAttempt({ activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 });
  });
  expect(await page.evaluate(() => gsEffectiveMargin("practice", "half"))).toBeCloseTo(0.3386, 3);
  await page.evaluate(() => {
    for (let i = 0; i < 10; i += 1) gsLogAttempt({ activity: "practice", street: "half", userSec: 6, refSec: 4, diffSec: 2, correct: false, marginSec: 0.3 });
  });
  expect(await page.evaluate(() => gsEffectiveMargin("practice", "half"))).toBeCloseTo(0.4, 6);
  // Reset from Instructor setup.
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.click("#resetAdaptiveBtn");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("om-adaptive-margin")).lanes)).toEqual({});
});

test("accessibility modes: visual-only, 300% text, high contrast, and reduced motion run clean", async ({ page }) => {
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page, { storage: { "om-a11y-output-mode": "visual-only", "om-a11y-text-size": "max", "om-a11y-high-contrast": "true" } });
  await setTimes(page);
  expect(await page.evaluate(() => document.body.classList.contains("large-text-layout"))).toBe(true);
  expect(await page.evaluate(() => document.body.classList.contains("high-contrast"))).toBe(true);
  await page.clock.install();
  await page.evaluate(() => gsShowScreen("practice"));
  await page.click("#actionBtn");
  await page.clock.runFor(4000);
  await page.click("#actionBtn");
  await page.clock.runFor(2500);
  expect(await page.evaluate(() => document.getElementById("visualReplayOverlay").dataset.active)).toBe("true");
  await page.clock.runFor(8000);
  expect(await history(page)).toHaveLength(1);
  await page.evaluate(() => gsShowScreen("compare"));
  await page.click("#compareStartBtn");
  await page.clock.runFor(12000);
  // The sample shows as the held bar, not the student's flash.
  expect(errors).toEqual([]);
});

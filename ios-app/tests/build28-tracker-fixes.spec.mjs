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

/* ---------------- second batch: 27.2, 27.3, 27.5, 27.6, 27.7, 27.8, 27.9, 27.11 ---------------- */

async function linkFor(page, code, clear, full, margin) {
  // A real setup link for another student, made by the app's own code.
  return page.evaluate(([c, a, b, m]) => {
    const keep = [localStorage.getItem("om-client-code"), clearTimeInput.value, fullTimeInput.value, marginInput.value];
    document.getElementById("clientCode").value = c;
    clearTimeInput.value = a; fullTimeInput.value = b; marginInput.value = m;
    const token = buildShareTimingToken({ times: true, contact: true, features: false, lock: false });
    document.getElementById("clientCode").value = keep[0] || "";
    [clearTimeInput.value, fullTimeInput.value, marginInput.value] = keep.slice(1);
    return token;
  }, [code, clear, full, margin]);
}

test("27.2: a setup link for a student who cannot be added changes nothing and says why; the open student's own link still applies", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { storage: { "om-client-code": "AB1" } });
  // Several students on this phone; AB1 is open.
  await page.evaluate(() => {
    const first = gsNewStudentId(), second = gsNewStudentId();
    localStorage.setItem("om-students", JSON.stringify({ active: first, list: [{ id: first, code: "AB1", started: "" }, { id: second, code: "XY9", started: "" }], data: {}, a11y: 1 }));
  });
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await setTimes(page, "4", "8", "0.4");
  const other = await linkFor(page, "CD2", "6", "12", "0.5");
  const own = await linkFor(page, "AB1", "5", "10", "0.5");
  expect(await page.evaluate((t) => parseShareToken(t)?.code, other)).toBe("CD2");
  // The phone cannot add the student (the list is full, the storage is full).
  await page.evaluate(() => { window.gsStudentsAdd = () => ({ ok: false, message: "This phone has the most students it can hold." }); });
  await page.evaluate((t) => { window.location.hash = `ts=${t}`; }, other);
  await expect(page.locator("#cueBannerText")).toContainText("Nothing was changed");
  await expect(page.locator("#cueBannerText")).toContainText("could not add that student");
  const after = await page.evaluate(() => ({ clear: localStorage.getItem("om-clear-time"), full: localStorage.getItem("om-full-time"), margin: localStorage.getItem("om-margin"), code: localStorage.getItem("om-client-code"), hash: location.hash }));
  expect(after).toMatchObject({ clear: "4", full: "8", margin: "0.4", code: "AB1" });
  expect(after.hash).not.toContain("ts=");
  // A link for the student who is open is applied as before.
  await page.evaluate((t) => { window.location.hash = `ts=${t}`; }, own);
  await page.waitForFunction(() => localStorage.getItem("om-full-time") === "10");
  expect(await page.evaluate(() => localStorage.getItem("om-clear-time"))).toBe("5");
  expect(errors).toEqual([]);
});

test("27.3: when the backup copy cannot be rewritten, the app does not claim the history is gone for good, and it never comes back", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await page.evaluate(async () => {
    localStorage.setItem("om-attempt-log", JSON.stringify([{ time: Date.now(), activity: "practice", street: "full", userSec: 8, refSec: 8, diffSec: 0, correct: true, marginSec: 0.4 }]));
    await gsStore.syncNow();
  });
  // Every write of the copy now fails, as with no space left.
  await page.evaluate(() => {
    window.__realPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () { throw new Error("QuotaExceededError"); };
  });
  await page.evaluate(() => gsConfirmDeleteHistory());
  await expect(page.locator("#reportNote")).toContainText("could not be rewritten");
  await expect(page.locator("#reportNote")).toContainText("will not come back");
  expect(await page.evaluate(() => gsStore.deletionPending())).toBe(true);
  // The app is closed and opened again, twice; the copy still holds the old history.
  for (let i = 0; i < 2; i += 1) {
    await page.evaluate(() => { sessionStorage.clear(); localStorage.removeItem("om-attempt-log"); });
    await page.addInitScript(() => { if (window.__failPut) IDBObjectStore.prototype.put = function () { throw new Error("QuotaExceededError"); }; });
    await page.evaluate(() => { window.__failPut = true; });
    await page.reload();
    await page.waitForFunction(() => typeof gsBoot === "function" && window.gsStore?.restoreChecked);
    expect(await page.evaluate(() => gsStore.restoreChecked)).toBe(false);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("om-attempt-log") || "[]").length)).toBe(0);
  }
  // Once the copy can be written, the pending mark goes.
  await page.evaluate(async () => { await gsStore.syncNow(); });
  expect(await page.evaluate(() => gsStore.deletionPending())).toBe(false);
});

test("27.3: after a normal delete the app says deleted, nothing is pending, and a restart keeps it deleted", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await page.evaluate(async () => {
    localStorage.setItem("om-attempt-log", JSON.stringify([{ time: Date.now(), activity: "practice", street: "full", userSec: 8, refSec: 8, diffSec: 0, correct: true, marginSec: 0.4 }]));
    await gsStore.syncNow();
    await gsConfirmDeleteHistory();
  });
  await expect(page.locator("#reportNote")).toHaveText("All practice history deleted from this browser.");
  expect(await page.evaluate(() => gsStore.deletionPending())).toBe(false);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await page.evaluate(() => gsStore.restoreChecked);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("om-attempt-log") || "[]").length)).toBe(0);
});

test("27.5: a try finished in a tab left on another student is not saved, and that tab starts again on the selected student", async ({ page }) => {
  await openApp(page, { storage: { "om-client-code": "AB1" } });
  await setTimes(page);
  // Two students; this tab shows the first.
  await page.evaluate(() => { window.__gsStudentsReload = () => { window.__reloads = (window.__reloads || 0) + 1; }; });
  const ids = await page.evaluate(() => {
    const first = gsNewStudentId(), second = gsNewStudentId();
    localStorage.setItem("om-students", JSON.stringify({ active: first, list: [{ id: first, code: "AB1", started: "" }, { id: second, code: "CD2", started: "" }], data: {}, a11y: 1 }));
    return { first, second };
  });
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await page.evaluate(() => { window.__reloads = 0; window.__gsStudentsReload = () => { window.__reloads += 1; }; });
  expect(await page.evaluate(() => gsStudentChangedElsewhere())).toBe(false);
  const before = await page.evaluate(() => gsLogAttempt({ activity: "practice", street: "full", userSec: 8, refSec: 8, diffSec: 0, correct: true, marginSec: 0.4 }));
  expect(before).toBe(1);
  // Another tab switches to the second student: storage changes under this tab.
  await page.evaluate((second) => {
    const registry = JSON.parse(localStorage.getItem("om-students"));
    registry.active = second;
    Storage.prototype.setItem.call(localStorage, "om-students", JSON.stringify(registry));
    localStorage.setItem("om-attempt-log", "[]");                 // the second student's (empty) history
  }, ids.second);
  const saved = await page.evaluate(() => gsLogAttempt({ activity: "practice", street: "full", userSec: 9, refSec: 8, diffSec: 1, correct: false, marginSec: 0.4 }));
  expect(saved).toBe(0);                                            // not written into CD2's history
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("om-attempt-log")).length)).toBe(0);
  expect(await page.evaluate(() => window.__reloads)).toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem("gs-students-note"))).toContain("that try was not saved");
});

test("27.5: a tab that hears another tab switch student starts again", async ({ page, context }) => {
  await openApp(page, { storage: { "om-client-code": "AB1" } });
  await page.evaluate(() => {
    const first = gsNewStudentId(), second = gsNewStudentId();
    localStorage.setItem("om-students", JSON.stringify({ active: first, list: [{ id: first, code: "AB1", started: "" }, { id: second, code: "CD2", started: "" }], data: {}, a11y: 1 }));
    window.__second = second;
  });
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await page.evaluate(() => { window.__reloads = 0; window.__gsStudentsReload = () => { window.__reloads += 1; }; });
  const other = await context.newPage();
  await other.goto("/index.html");
  await other.waitForFunction(() => typeof gsBoot === "function");
  await other.evaluate(() => {
    const registry = JSON.parse(localStorage.getItem("om-students"));
    registry.active = registry.list[1].id;
    localStorage.setItem("om-students", JSON.stringify(registry));
  });
  await page.waitForFunction(() => window.__reloads === 1);
  expect(await page.evaluate(() => sessionStorage.getItem("gs-students-note"))).toContain("changed in another tab");
  await other.close();
});

test("27.6: with the browser's data lost and a backup present, the demo link brings back the real times and does not replace them", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "5.5", "11", "0.4");
  await page.evaluate(async () => { await gsStore.syncNow(); gsStore.simulateLoss(); });
  await page.goto("/index.html?demo=1");
  await page.waitForFunction(() => localStorage.getItem("om-full-time") === "11", null, { timeout: 15000 });
  await page.waitForFunction(() => typeof gsBoot === "function" && document.getElementById("screen-practice") && !document.getElementById("screen-practice").hidden);
  const state = await page.evaluate(async () => {
    await gsStore.syncNow();
    return { clear: localStorage.getItem("om-clear-time"), full: localStorage.getItem("om-full-time"), demo: localStorage.getItem("om-demo-times") };
  });
  expect(state).toEqual({ clear: "5.5", full: "11", demo: null });
});

test("27.6: a new visitor on the demo link still gets the example times and goes straight to practice", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { query: "?demo=1" });
  await expect(page.locator("#screen-practice")).toBeVisible();
  expect(await page.evaluate(() => [localStorage.getItem("om-clear-time"), localStorage.getItem("om-full-time")])).toEqual(["4.0", "8.0"]);
  expect(errors).toEqual([]);
});

test("27.7 and 27.9: a right code that cannot be saved, or cannot be checked, says so instead of 'Unlocked' or 'did not match'", async ({ page }) => {
  await openApp(page, { locked: true });
  await page.locator("#sessionCodeModalBtn, #sessionCodeLater").first().waitFor();
  // 27.7: the code is right but the phone cannot save the unlock.
  await page.evaluate(() => {
    window.gsCodeCheck = async () => ({ id: "tester", ok: true });
    const real = Storage.prototype.setItem;
    window.__realSet = real;
    Storage.prototype.setItem = function (key, value) { if (key === "om-session-unlock") throw new Error("QuotaExceededError"); return real.call(this, key, value); };
    document.getElementById("sessionCodeModalInput").value = "any";
  });
  await page.evaluate(() => gsSessionCodeSubmit("modal"));
  await expect(page.locator("#sessionCodeModalNote")).toHaveText("The code is right, but this phone could not save it. Free some space and try again.");
  expect(await page.evaluate(() => ({ open: document.getElementById("sessionCodeModal").open, value: document.getElementById("sessionCodeModalInput").value, unlocked: gsIsUnlocked() })))
    .toEqual({ open: true, value: "any", unlocked: false });
  // 27.9: the page cannot check codes at all (http over Wi-Fi).
  await page.evaluate(() => { window.gsCodeCheck = async () => ({ id: null, ok: false, reason: "unavailable" }); });
  await page.evaluate(() => gsSessionCodeSubmit("modal"));
  await expect(page.locator("#sessionCodeModalNote")).toContainText("This page cannot check codes");
});

test("27.9: the code check itself reports 'unavailable' on a page that is not secure", async ({ page }) => {
  await openApp(page, { locked: true });
  const result = await page.evaluate(async () => {
    Object.defineProperty(window, "isSecureContext", { value: false, configurable: true });
    return [await gsCodeCheck("12345"), await gsCodeCheck("")];
  });
  expect(result[0]).toEqual({ id: null, ok: false, reason: "unavailable" });
  expect(result[1]).toBeNull();
});

test("27.8: after a valid code with no crossing times, focus lands on a control that works and the message says what is needed", async ({ page }) => {
  await openApp(page, { locked: true });
  await page.locator("#sessionCodeModalInput").waitFor();
  await page.evaluate(() => { window.gsCodeCheck = async () => ({ id: "tester", ok: true }); document.getElementById("sessionCodeModalInput").value = "any"; });
  await page.evaluate(() => gsSessionCodeSubmit("modal"));
  await page.waitForFunction(() => ["homeOpenSettingsBtn", "tryDemoBtn"].includes(document.activeElement?.id));
  const note = await page.evaluate(() => [...document.querySelectorAll("#sessionCodeNote, #sessionCodeModalNote")].map((n) => n.textContent).join(" "));
  expect(note).toContain("Crossing times are needed before the activities open");
  expect(await page.evaluate(() => gsIsUnlocked())).toBe(true);
});

test("27.8: with crossing times set, focus still goes to the first activity", async ({ page }) => {
  await openApp(page, { locked: true, storage: { "om-clear-time": "4", "om-full-time": "8", "om-margin": "0.4" } });
  await page.locator("#sessionCodeModalInput").waitFor();
  await page.evaluate(() => { window.gsCodeCheck = async () => ({ id: "tester", ok: true }); document.getElementById("sessionCodeModalInput").value = "any"; });
  await page.evaluate(() => gsSessionCodeSubmit("modal"));
  await page.waitForFunction(() => document.activeElement?.classList.contains("step-button"));
  expect(await page.evaluate(() => document.activeElement.disabled)).toBe(false);
});

test("27.11: with visual feedback on, the replay bar stays on screen for the replay", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  const result = await page.evaluate(async () => {
    a11ySettings.outputMode = "audio-visual";
    a11ySettings.syncVisualReplay = true;
    startSynchronizedVisualReplay([{ type: "user", timeSec: 0.2 }, { type: "acceptable", timeSec: 0.6 }], 1.5);
    const startedBar = gsReplayBar.rafId !== null;
    await new Promise((r) => setTimeout(r, 300));
    return { startedBar, barStill: gsReplayBar.rafId !== null, flashes: visualReplayState.rafId !== null, events: gsReplayBar.events.length };
  });
  expect(result).toEqual({ startedBar: true, barStill: true, flashes: true, events: 2 });
});

/* ---------------- third batch: 27.17, 27.19, 27.20, 27.21, 27.26 ---------------- */

test("27.26: with a finger down on the pad a second touch changes nothing; the first finger's lift answers, timed from its touch", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    const surface = document.createElement("div");
    surface.style.cssText = "position:fixed;left:0;top:0;width:300px;height:300px;";
    document.body.appendChild(surface);
    const got = [];
    gsBindSwipeSurface(surface, () => ({ up: (at) => got.push(["up", at]), tap: (at) => got.push(["tap", at]), down: (at) => got.push(["down", at]) }));
    const fire = (type, id, x, y, primary) => surface.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, isPrimary: primary, bubbles: true, pointerType: "touch" }));
    const t0 = performance.now();
    fire("pointerdown", 1, 150, 250, true);            // the answering finger
    await new Promise((r) => setTimeout(r, 120));
    fire("pointerdown", 2, 20, 20, false);             // a resting finger or the palm
    fire("pointerup", 2, 20, 20, false);
    await new Promise((r) => setTimeout(r, 60));
    fire("pointerup", 1, 150, 100, true);              // swipe up with the first finger
    return { got, t0, t1: performance.now() };
  });
  expect(result.got.length).toBe(1);
  expect(result.got[0][0]).toBe("up");
  expect(result.got[0][1] - result.t0).toBeLessThan(60);     // from the first touch, not the second
});

test("27.21: the pad behind 'Read it larger' cannot be reached while the panel is open, and focus goes back where it was", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  const result = await page.evaluate(() => {
    gsOpenAnswerPad({ title: "Was the sample longer or shorter than your crossing?", onAnswer: () => {} });
    const overlay = document.getElementById("answerOverlay");
    const surface = document.getElementById("answerSurface");
    surface.focus();
    const out = { before: document.activeElement === surface };
    out.opened = gsPadReadOpen(overlay);
    out.inertWhileOpen = overlay.inert === true;
    out.focusInPanel = document.getElementById("padReadOverlay").contains(document.activeElement);
    gsPadReadClose();
    out.inertAfter = overlay.inert === true;
    out.focusBack = document.activeElement === surface;
    return out;
  });
  expect(result).toEqual({ before: true, opened: true, inertWhileOpen: true, focusInPanel: true, inertAfter: false, focusBack: true });
});

test("27.19: the label sent to the iPhone's touch area starts with the question", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  const label = await page.evaluate(() => {
    gsOpenAnswerPad({ title: "Was the sample longer or shorter than your crossing?", onAnswer: () => {} });
    return gsDirectTouchTarget()?.label || "";
  });
  expect(label.startsWith("Was the sample longer or shorter than your crossing? ")).toBe(true);
  expect(label).toContain(await page.evaluate(() => GS_PAD_LABELS.answer));
});

test("27.20: when the iPhone says VoiceOver did not finish, the replay tones wait a bounded time; when it finished, they do not", async ({ page }) => {
  await page.addInitScript(() => {
    window.__finished = false;
    window.Capacitor = {
      isNativePlatform: () => true, getPlatform: () => "ios",
      Plugins: {
        GSNative: {
          haptic: async () => {}, pendingScreen: async () => ({}), tone: async () => ({ id: 1 }), sustainStart: async () => ({ id: 1 }), sustainStop: async () => {}, stopSound: async () => {},
          audioStatus: async () => ({ engineRunning: true, ignoresSilentSwitch: true, outputVolume: 1, outputLatency: 0, route: "Speaker", peak: 0, tonesStarted: 0 }),
          speak: async () => {}, stopSpeaking: async () => {}, accessibilityStatus: async () => ({ voiceOver: true }),
          announce: async () => ({ finished: window.__finished }),
          addListener: () => ({ remove: () => {} })
        },
        App: { getInfo: async () => ({ version: "1.0", build: "28" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  });
  await openApp(page);
  const timeFor = (finished) => page.evaluate((f) => new Promise((resolve) => {
    window.__finished = f;
    const t0 = performance.now();
    gsScreenReaderSay("Replay.", { onDone: () => resolve(performance.now() - t0) });
  }), finished);
  const cut = await timeFor(false);
  const whole = await timeFor(true);
  expect(cut).toBeGreaterThan(550);        // waited for the words
  expect(cut).toBeLessThan(2700);          // but never long
  expect(whole).toBeLessThan(200);
});

test("27.17: on Android, cancelling a try stops the vibration pulses still to come", async ({ page }) => {
  await page.addInitScript(() => {
    window.__vibrations = [];
    window.Capacitor = {
      isNativePlatform: () => true, getPlatform: () => "android",
      Plugins: {
        Haptics: { vibrate: async (a) => { window.__vibrations.push(a.duration); }, impact: async () => {} },
        GSAndroid: { speak: async () => ({}), stopSpeaking: async () => {}, accessibilityStatus: async () => ({ screenReader: false }), setWindowBackground: async () => {}, textScale: async () => ({ scale: 1 }), speechStatus: async () => ({ ready: true, failed: false }), addListener: () => ({ remove: () => {} }) },
        App: { getInfo: async () => ({ version: "1.0", build: "28" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  });
  await openApp(page);
  await page.clock.install();
  const pulses = await page.evaluate(() => ANDROID_VIBRATION_PULSES.reference_ok.length);
  expect(pulses).toBeGreaterThan(1);
  await page.evaluate(() => { a11ySettings.vibrate = true; window.__vibrations = []; hapticCue("reference_ok"); });
  await page.clock.runFor(20);
  const first = await page.evaluate(() => window.__vibrations.length);
  await page.evaluate(() => gsClearHaptics());              // the try is cancelled
  await page.clock.runFor(2000);
  expect(await page.evaluate(() => window.__vibrations.length)).toBe(first);
  expect(first).toBeLessThan(pulses);
  // Left alone, the whole pattern plays.
  await page.evaluate(() => { window.__vibrations = []; hapticCue("reference_ok"); });
  await page.clock.runFor(2000);
  expect(await page.evaluate(() => window.__vibrations.length)).toBe(pulses);
});

/* ---------------- fourth batch: Android shell and exports (27.14, 27.15, 27.16, 27.25, 27.31, 27.37) ---------------- */

function androidShell({ vibrator = true, spoken = true, speech = { ready: true, failed: false, starting: false }, startScale = 1 } = {}) {
  return ([hasVibrator, isSpoken, speechStatus, scale]) => {
    window.__android = { speak: [], awake: [], files: {}, deleted: [], shared: [], listeners: {} };
    window.GSAndroidStart = { textScale: () => scale };
    window.Capacitor = {
      isNativePlatform: () => true, getPlatform: () => "android",
      Plugins: {
        Haptics: { vibrate: async () => {}, impact: async () => {} },
        GSAndroid: {
          speak: async (a) => { window.__android.speak.push(a.text); return { spoken: isSpoken }; },
          stopSpeaking: async () => {}, accessibilityStatus: async () => ({ screenReader: false }), setWindowBackground: async () => {},
          textScale: async () => ({ scale }), speechStatus: async () => speechStatus,
          deviceStatus: async () => ({ hasVibrator }),
          keepAwake: async (a) => { window.__android.awake.push(a.on); return { on: a.on }; },
          addListener: (name, fn) => { window.__android.listeners[name] = fn; return { remove: () => {} }; }
        },
        Filesystem: {
          writeFile: async ({ path }) => { window.__android.files[path] = true; return { uri: `file:///cache/${path}` }; },
          deleteFile: async ({ path }) => { if (!window.__android.files[path]) throw new Error("no file"); delete window.__android.files[path]; window.__android.deleted.push(path); },
          rmdir: async ({ path }) => { Object.keys(window.__android.files).filter((f) => f.startsWith(`${path}/`)).forEach((f) => { delete window.__android.files[f]; window.__android.deleted.push(f); }); },
          readdir: async () => ({ files: Object.keys(window.__android.files).filter((f) => !f.includes("/")).map((name) => ({ name })) }),
          readFile: async () => { throw new Error("no file"); }
        },
        Preferences: { get: async () => ({ value: null }), set: async () => {} },
        Share: { share: async (a) => { window.__android.shared.push(a.files[0]); } },
        App: { getInfo: async () => ({ version: "1.0", build: "28" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  };
}
const shellArgs = (o = {}) => [o.vibrator ?? true, o.spoken ?? true, o.speech ?? { ready: true, failed: false, starting: false }, o.startScale ?? 1];

test("27.14: a device that cannot vibrate says so in Accessibility, and the test button does not claim pulses", async ({ page }) => {
  await page.addInitScript(androidShell(), shellArgs({ vibrator: false }));
  await openApp(page);
  await page.waitForFunction(() => gsDeviceCanVibrate === false);
  await expect(page.locator("#hapticsSupportNote")).toHaveText("This device cannot vibrate. Use sound or the screen.");
  await page.evaluate(() => document.getElementById("hapticsTestBtn").click());
  await expect(page.locator("#cueBannerText")).toHaveText("This device cannot vibrate. Use sound or the screen.");
  expect(await page.evaluate(() => hapticsAvailable())).toBe(false);
});

test("27.14: a phone with a vibrator is unchanged", async ({ page }) => {
  await page.addInitScript(androidShell(), shellArgs({ vibrator: true }));
  await openApp(page);
  await page.waitForFunction(() => gsDeviceCanVibrate === true);
  await expect(page.locator("#hapticsSupportNote")).toContainText("Native vibration active");
  expect(await page.evaluate(() => hapticsAvailable())).toBe(true);
});

test("27.15: when Android spoke nothing, the words reach the student through the live region and Accessibility says why", async ({ page }) => {
  await page.addInitScript(androidShell(), shellArgs({ spoken: false, speech: { ready: false, failed: true, starting: false } }));
  await openApp(page);
  await page.waitForFunction(() => gsSpeechUnavailable === true);
  await expect(page.locator("#speechVoiceNote")).toBeHidden();      // inside the closed Accessibility pop-up
  expect(await page.evaluate(() => document.getElementById("speechVoiceNote").textContent)).toContain("no English voice");
  await page.evaluate(() => gsSpeak("You were 0.4 seconds early."));
  await page.waitForFunction(() => document.getElementById("srAnnouncer").textContent.includes("0.4 seconds early"));
  expect(await page.evaluate(() => window.__android.speak)).toEqual(["You were 0.4 seconds early."]);
});

test("27.15: with a working voice nothing is repeated in the live region and no note shows", async ({ page }) => {
  await page.addInitScript(androidShell(), shellArgs());
  await openApp(page);
  await page.evaluate(() => gsSpeak("You were 0.4 seconds early."));
  await page.waitForFunction(() => window.__android.speak.length === 1);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => ({ live: document.getElementById("srAnnouncer").textContent, flag: gsSpeechUnavailable, note: document.getElementById("speechVoiceNote").hidden })))
    .toEqual({ live: "", flag: false, note: true });
});

test("27.16: on Android the screen is kept awake through the app's own call, on and off", async ({ page }) => {
  await page.addInitScript(androidShell(), shellArgs());
  await openApp(page);
  await page.evaluate(async () => { await gsKeepAwake(true); await gsKeepAwake(false); });
  expect(await page.evaluate(() => window.__android.awake)).toEqual([true, false]);
});

test("27.25: the phone's font size is there before the first screen, and a change while the app is open is followed", async ({ page }) => {
  await page.addInitScript(androidShell(), shellArgs({ startScale: 2 }));
  await openApp(page);
  expect(await page.evaluate(() => gsPhoneTextScale)).toBe(2);
  const before = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  await page.evaluate(() => window.__android.listeners.textScale({ scale: 1.3 }));
  const after = await page.evaluate(() => ({ scale: gsPhoneTextScale, px: parseFloat(getComputedStyle(document.documentElement).fontSize) }));
  expect(after.scale).toBe(1.3);
  expect(after.px).toBeLessThan(before);
});

test("27.18: on Android a change of sound output during a timed sound cancels the try", async ({ page }) => {
  await page.addInitScript(androidShell(), shellArgs());
  await openApp(page);
  await setTimes(page);
  const heard = await page.evaluate(() => new Promise((resolve) => {
    window.addEventListener("gs-audio-interrupted", () => resolve(true), { once: true });
    window.__android.listeners.audioInterrupted({ reason: "route" });
    setTimeout(() => resolve(false), 500);
  }));
  expect(heard).toBe(true);
});

test("27.31 and 27.37: an exported file is written in the reports folder and deleted once the share sheet closes; Delete history clears what is left", async ({ page }) => {
  await page.addInitScript(androidShell(), shellArgs());
  await openApp(page);
  await setTimes(page);
  const outcome = await page.evaluate(() => gsShareFile({ name: "crossingtime-report-AB1-2026-11-22.csv", text: "a,b", mime: "text/csv" }));
  expect(outcome).toBe("shared");
  let state = await page.evaluate(() => window.__android);
  expect(state.shared).toEqual(["file:///cache/reports/crossingtime-report-AB1-2026-11-22.csv"]);
  expect(state.deleted).toEqual(["reports/crossingtime-report-AB1-2026-11-22.csv"]);
  expect(Object.keys(state.files)).toEqual([]);
  // Left over from an earlier build (top of the cache) and from a share that never returned.
  await page.evaluate(async () => {
    window.__android.files["crossingtime-report-2026-11-01.csv"] = true;
    window.__android.files["reports/crossingtime-report-old.csv"] = true;
    window.__android.files["something-else.txt"] = true;
    await gsConfirmDeleteHistory();
  });
  state = await page.evaluate(() => window.__android);
  // (The mock also holds the app's own history copy, which is not an export.)
  expect(Object.keys(state.files).filter((f) => /\.(csv|txt)$/.test(f))).toEqual(["something-else.txt"]);
});

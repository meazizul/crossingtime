import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes, screenVisible } from "./helpers.mjs";

test("boots with no console errors and shows home with every activity locked", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await screenVisible(page, "home");
  await expect(page.locator("#homeSetupBanner")).toBeVisible();
  await expect(page.locator("#homeTimes")).toHaveText("Crossing times not set");
  for (const step of ["practice", "signal", "compare", "live"]) {
    await expect(page.locator(`.step-card[data-screen="${step}"] button`)).toBeDisabled();
  }
  await expect(page.locator(".step-card")).toHaveCount(4);
  await expect(page.locator("#screen-measure")).toHaveCount(0);
  await expect(page.locator("#homeGuidance")).toContainText("Orientation and Mobility Specialist");
  expect(errors).toEqual([]);
});

test("home activities are single buttons named by title and description (VoiceOver reads one item per activity)", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  const practice = page.getByRole("button", { name: /^Practice my timing Develop an accurate sense of your crossing times/ });
  await expect(practice).toBeVisible();
  await expect(page.getByRole("button", { name: /^Comparison preparation Get ready to compare/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Comparison practice Is the sample warning time longer/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^At the street Get warning times of actual vehicles/ })).toBeVisible();
  // No hidden "Home" heading for VoiceOver to land on; the one heading is
  // the visible screen title.
  await expect(page.locator("h2.sr-only")).toHaveCount(0);
  // Only the visible screen's headings count: hidden screens keep their own
  // section headings (h2) for VoiceOver's headings rotor.
  await expect(page.locator("main h1:visible, main h2:visible")).toHaveCount(1);
  await practice.click();
  await screenVisible(page, "practice");
  await expect(page.locator("#screenTitle")).toBeFocused();
});

test("every screen opens and closes without errors, focusing the screen title", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page);
  for (const name of ["practice", "signal", "compare", "live", "progress", "help", "instructor", "shortcuts"]) {
    await page.evaluate((n) => gsShowScreen(n), name);
    await screenVisible(page, name);
    await expect(page.locator("#screenTitle")).not.toHaveText("");
    await expect(page.locator("#screenTitle")).toBeFocused();
    await page.click("#backBtn");
    await screenVisible(page, "home");
  }
  expect(errors).toEqual([]);
});

test("names: Practice my timing, Comparison preparation, Comparison practice", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  const titles = {};
  for (const name of ["practice", "signal", "compare", "live"]) {
    await page.evaluate((n) => gsShowScreen(n), name);
    titles[name] = await page.locator("#screenTitle").innerText();
  }
  expect(titles).toEqual({
    practice: "Practice my timing",
    signal: "Comparison preparation",
    compare: "Comparison practice",
    live: "At the street"
  });
  const all = await page.evaluate(() => document.body.textContent);
  expect(all).not.toMatch(/Time it from a signal/i);
});

test("American English throughout the visible text", async ({ page }) => {
  await openApp(page);
  const text = await page.evaluate(() => document.body.textContent);
  expect(text).not.toMatch(/practis|kerb|traveller|judgement|colour|analys/i);
});

test("settings and accessibility dialogs open, close, and restore focus", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await page.click("#settingsTrigger");
  await expect(page.locator("#settingsModal")).toHaveJSProperty("open", true);
  await expect(page.locator("#openInstructorSetupBtn")).toBeVisible();
  await page.click("#closeSettings");
  await expect(page.locator("#settingsModal")).toHaveJSProperty("open", false);
  await expect(page.locator("#settingsTrigger")).toBeFocused();
  await page.click("#a11yTrigger");
  await expect(page.locator("#a11yModal")).toHaveJSProperty("open", true);
  await expect(page.locator("#a11ySelfVoice")).toBeVisible();
  await page.click("#closeA11y");
  await expect(page.locator("#a11yModal")).toHaveJSProperty("open", false);
  expect(errors).toEqual([]);
});

test("home 'Open Instructor setup' and the Settings button both reach Instructor setup", async ({ page }) => {
  await openApp(page);
  await page.click("#homeOpenSettingsBtn");
  await screenVisible(page, "instructor");
  await expect(page.locator("#clearTime")).toBeVisible();
  await page.click("#backBtn");
  await page.click("#settingsTrigger");
  await page.click("#openInstructorSetupBtn");
  await expect(page.locator("#settingsModal")).toHaveJSProperty("open", false);
  await screenVisible(page, "instructor");
  await expect(page.locator("#screenTitle")).toBeFocused();
});

test("first run: the O&M guidance comes first, then the tutorial, each once", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { tutorialSeen: false, disclaimerSeen: false });
  await expect(page.locator("#disclaimerModal")).toHaveJSProperty("open", true, { timeout: 5000 });
  await expect(page.locator("#disclaimerModal")).toContainText("Orientation and Mobility (O&M) Specialist");
  await expect(page.locator("#disclaimerModal")).toContainText("not a replacement for O&M instruction");
  await expect(page.locator("#disclaimerModal")).toContainText("Got a link from your instructor?");
  // Escape does not skip it.
  await page.keyboard.press("Escape");
  await expect(page.locator("#disclaimerModal")).toHaveJSProperty("open", true);
  await page.click("#disclaimerAcceptBtn");
  await expect(page.locator("#tutorialModal")).toHaveJSProperty("open", true, { timeout: 5000 });
  await page.click("[data-demo='sample']");
  await page.click("[data-demo='ready']");
  await page.click("#closeTutorial");
  expect(await page.evaluate(() => [localStorage.getItem("om-disclaimer-ack"), localStorage.getItem("om-tutorial-seen")])).toEqual(["true", "true"]);
  await page.reload();
  await page.waitForTimeout(1200);
  await expect(page.locator("#disclaimerModal")).toHaveJSProperty("open", false);
  await expect(page.locator("#tutorialModal")).toHaveJSProperty("open", false);
  expect(errors).toEqual([]);
});

test("the conference link still shows the O&M guidance on first run", async ({ page }) => {
  await openApp(page, { query: "?demo=1", disclaimerSeen: false });
  await expect(page.locator("#disclaimerModal")).toHaveJSProperty("open", true, { timeout: 5000 });
  await page.click("#disclaimerAcceptBtn");
  await screenVisible(page, "practice");
});

test("demo link loads example times and lands on practice", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { query: "?demo=1" });
  await screenVisible(page, "practice");
  expect(await page.evaluate(() => localStorage.getItem("om-demo-times"))).toBe("true");
  expect(await page.evaluate(() => [clearTimeInput.value, fullTimeInput.value, marginInput.value])).toEqual(["4.0", "8.0", "0.5"]);
  await page.click("#backBtn");
  await expect(page.locator("#homeTimes")).toHaveText("Using example crossing times");
  await expect(page.locator("#screen-home .demo-note")).toBeVisible();
  // Setting real times clears the demo note, whichever path sets them.
  await setTimes(page, "3", "6.5");
  await expect(page.locator("#homeTimes")).toHaveText("Crossing times set");
  await expect(page.locator("#screen-home .demo-note")).toBeHidden();
  expect(errors).toEqual([]);
});

test("vibration is on by default, an old stored 'off' is cleared once, and a new opt-out is kept", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#a11yVibrate")).toBeChecked();
  expect(await page.evaluate(() => a11ySettings.vibrate)).toBe(true);
  // A tester upgrading from an older build with vibration stored off: on again.
  await openApp(page, { storage: { "om-a11y-vibrate": "false" } });
  await expect(page.locator("#a11yVibrate")).toBeChecked();
  expect(await page.evaluate(() => a11ySettings.vibrate)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("om-settings-version"))).toBe("7");
  // Turning it off from build 7 on is respected after a reload.
  await page.click("#a11yTrigger");
  await page.uncheck("#a11yVibrate");
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  expect(await page.evaluate(() => a11ySettings.vibrate)).toBe(false);
});

test("self-voicing speaks announcements and stays quiet while a sound is timed", async ({ page }) => {
  await page.addInitScript(() => {
    window.__spoken = [];
    const fake = {
      speaking: false,
      cancel() { window.__spoken.push("<cancel>"); },
      speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 10); },
      getVoices() { return []; }
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  });
  await openApp(page, { storage: { "om-a11y-self-voice": "true" } });
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("compare"));
  let spoken = await page.evaluate(() => window.__spoken);
  expect(spoken.join(" | ")).toContain("Comparison practice. The app plays a sample warning time");
  await page.evaluate(() => { window.__spoken = []; announceScreenReader("Hello there."); });
  expect(await page.evaluate(() => window.__spoken)).toContain("Hello there.");
  await page.evaluate(() => { window.__spoken = []; gsBeginQuiet(); announceScreenReader("Should not speak."); suppressSrAnnouncements = false; });
  spoken = await page.evaluate(() => window.__spoken);
  expect(spoken).not.toContain("Should not speak.");
  expect(spoken).toContain("<cancel>");
});

test("web build keeps pinch zoom but blocks double-tap zoom; Help shows the build", async ({ page }) => {
  await openApp(page);
  const meta = await page.getAttribute("meta[name='viewport']", "content");
  expect(meta).not.toContain("user-scalable=no");
  expect(await page.evaluate(() => getComputedStyle(document.body).touchAction)).toBe("manipulation");
  expect(await page.evaluate(() => getComputedStyle(document.getElementById("settingsTrigger")).touchAction)).toBe("manipulation");
  await page.evaluate(() => gsShowScreen("help"));
  await expect(page.locator("#aboutVersion")).toHaveText("CrossingTime version 1.0, build 25 (web), 8 November 2026.");
});

test("native shell: pinch zoom allowed, bundle version, CrossingTime haptics plugin, playback audio session", async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    window.__haptics = [];
    Object.defineProperty(navigator, "audioSession", { value: { type: "auto" }, configurable: true });
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      Plugins: {
        Haptics: { impact: async () => { window.__haptics.push("stock"); }, vibrate: async () => {} },
        GSNative: {
          haptic: async ({ type }) => { window.__haptics.push(type); },
          pendingScreen: async () => ({}),
          addListener: () => {}
        },
        App: { getInfo: async () => ({ version: "1.0", build: "13" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  });
  await openApp(page);
  const meta = await page.getAttribute("meta[name='viewport']", "content");
  // Pinch zoom stays available for low-vision students (bug 37); double-tap
  // zoom is off through touch-action in the stylesheet.
  expect(meta).not.toContain("user-scalable=no");
  expect(meta).not.toContain("maximum-scale=1");
  await page.evaluate(() => gsShowScreen("help"));
  await expect(page.locator("#aboutVersion")).toHaveText("CrossingTime version 1.0, build 13 (iPhone app), 8 November 2026.");   // the stubbed App plugin reports build 13
  await expect(page.locator("#hapticsSupportNote")).toContainText("Native haptics active");
  await page.evaluate(() => { hapticCue("marker"); hapticCue("reference_ok"); hapticCue("reference_bad"); hapticCue("ready"); });
  expect(await page.evaluate(() => window.__haptics)).toEqual(["marker", "reference_ok", "reference_bad", "ready"]);
  expect(await page.evaluate(() => navigator.audioSession.type)).toBe("playback");
  await page.evaluate(() => gsShowScreen("shortcuts"));
  await expect(page.locator("#shortcutsIos")).toBeVisible();
  await expect(page.locator("#shortcutsIos")).toContainText("Practice my timing in CrossingTime");
  expect(errors).toEqual([]);
});

test("native shell: Siri / shortcut requests open the activity, cold and warm", async ({ page }) => {
  await page.addInitScript(() => {
    window.__listeners = {};
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      Plugins: {
        GSNative: {
          haptic: async () => {},
          pendingScreen: async () => ({ screen: "compare" }),
          addListener: (name, fn) => { window.__listeners[name] = fn; }
        },
        App: { getInfo: async () => ({ version: "1.0", build: "13" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  });
  await openApp(page, { storage: { "om-clear-time": "4", "om-full-time": "8" } });
  await screenVisible(page, "compare");
  await page.evaluate(() => window.__listeners.openScreen({ screen: "live" }));
  await screenVisible(page, "live");
});

test("native shell: gapsense:// links apply a setup and open activities", async ({ page }) => {
  await page.addInitScript(() => {
    window.__appListeners = {};
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "android",
      Plugins: {
        Haptics: { impact: async () => {}, vibrate: async () => {} },
        App: {
          getInfo: async () => ({ version: "1.0", build: "13" }),
          addListener: (name, fn) => { window.__appListeners[name] = fn; },
          getLaunchUrl: async () => ({})
        },
        StatusBar: { setStyle: async () => {} }
      }
    };
  });
  await openApp(page);
  const token = await page.evaluate(() => {
    const payload = encodeBase64Url(JSON.stringify({ t: ["3", "6", "0.5"], k: "Q1" }));
    return `v3.${payload}.${computeShareChecksum(payload)}`;
  });
  await page.evaluate((t) => window.__appListeners.appUrlOpen({ url: `gapsense://setup?ts=${t}` }), token);
  expect(await page.evaluate(() => [clearTimeInput.value, fullTimeInput.value, marginInput.value, clientCodeInput.value])).toEqual(["3", "6", "0.5", "Q1"]);
  await page.evaluate(() => window.__appListeners.appUrlOpen({ url: "gapsense://open/signal" }));
  await screenVisible(page, "signal");
  // Links made inside the app point at the public web address, never localhost.
  expect(await page.evaluate(() => buildShareTimingLink())).toMatch(/^https:\/\/crossingtime\.app\/app\/#ts=4[A-Za-z0-9_-]+$/);
});

test("the web build does not take over the audio session", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "audioSession", { value: { type: "auto" }, configurable: true });
  });
  await openApp(page);
  expect(await page.evaluate(() => navigator.audioSession.type)).toBe("auto");
});

test("sound engine resumes after an iOS interruption instead of going silent", async ({ page }) => {
  await openApp(page);
  const resumed = await page.evaluate(() => {
    const ctx = ensureAudioContext();
    let count = 0;
    const realResume = ctx.resume.bind(ctx);
    // Simulate WebKit's "interrupted" state.
    Object.defineProperty(ctx, "state", { configurable: true, get: () => "interrupted" });
    ctx.resume = () => { count += 1; return realResume(); };
    ensureAudioContext();
    delete ctx.state;
    return count;
  });
  expect(resumed).toBeGreaterThan(0);
});

test("Siri and shortcuts page explains the web build honestly", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => gsShowScreen("shortcuts"));
  await expect(page.locator("#shortcutsWeb")).toBeVisible();
  await expect(page.locator("#shortcutsIos")).toBeHidden();
});

test("sound test and haptics test run without errors", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await page.click("#a11yTrigger");
  await page.click("#soundTestBtn");
  await expect(page.locator("#soundTestNote")).toContainText("Sound engine");
  await page.click("#hapticsTestBtn");
  expect(errors).toEqual([]);
});

test("service worker: fetches fresh files online and still works offline", async ({ page, context }) => {
  await page.goto("/index.html");
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    localStorage.setItem("om-tutorial-seen", "true");
    localStorage.setItem("om-disclaimer-ack", "true");
  });
  await page.goto("/index.html");
  await page.waitForFunction(async () => (await navigator.serviceWorker.ready).active?.state === "activated", null, { timeout: 15000 });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15000 });
  expect(await page.evaluate(async () => (await caches.keys()))).toContain("gapsense-v26");
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#screen-home")).toBeVisible();
  await expect(page.locator(".step-card")).toHaveCount(4);
  await expect(page.locator("#screen-home")).toContainText("Comparison preparation");
  await context.setOffline(false);
});

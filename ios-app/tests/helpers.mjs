import { expect } from "@playwright/test";

/** Collect every console error and page error so a test can assert none. */
export function watchErrors(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

/** Open the app fresh: clear storage, mark the tutorial seen, reload. */
export async function openApp(page, { query = "", tutorialSeen = true, disclaimerSeen = true, storage = {}, locked = false } = {}) {
  await page.goto(`/index.html${query}`);
  // No service worker between tests: a cache-first worker would serve stale
  // files after an edit and hide the very bugs these tests look for.
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  });
  await page.evaluate(async ({ tutorialSeen, disclaimerSeen, storage, locked }) => {
    localStorage.clear();
    if (tutorialSeen) localStorage.setItem("om-tutorial-seen", "true");
    if (disclaimerSeen) localStorage.setItem("om-disclaimer-ack", "true");
    // Build 19: the session code is entered once; tests start past it.
    sessionStorage.removeItem("gs-session-unlocked");
    if (!locked) localStorage.setItem("om-session-unlock", JSON.stringify({ code: "tester", at: "test" }));
    Object.entries(storage).forEach(([k, v]) => localStorage.setItem(k, v));
    // Build 14: the durable copy (store.js) follows; written now so the next
    // load starts from exactly this state.
    if (window.gsStore?.syncNow) await window.gsStore.syncNow();
  }, { tutorialSeen, disclaimerSeen, storage, locked });
  await page.goto(`/index.html${query}`);
  await page.waitForFunction(() => typeof gsBoot === "function" && document.getElementById("screen-home"));
}

/** Set crossing times through the public engine API, as Settings or a link would. */
export async function setTimes(page, clear = "4", full = "8", margin = "0.4") {
  await page.evaluate(([c, f, m]) => setReferenceTimes(c, f, m, { source: "settings" }), [clear, full, margin]);
}

export async function screenVisible(page, name) {
  await expect(page.locator(`#screen-${name}`)).toBeVisible();
  for (const other of ["home", "practice", "signal", "compare", "live", "progress", "help", "instructor", "shortcuts"]) {
    if (other !== name) await expect(page.locator(`#screen-${other}`)).toBeHidden();
  }
}

export async function history(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("om-attempt-log") || "[]"));
}

export async function announcer(page) {
  return page.evaluate(() => document.getElementById("srAnnouncer").textContent.replace(/​/g, ""));
}

/** Advance the fake clock in steps, giving timers and rAF a chance to run. */
export async function tick(page, ms, step = 250) {
  let left = ms;
  while (left > 0) {
    const d = Math.min(step, left);
    await page.clock.runFor(d);
    left -= d;
  }
}

export async function statusText(page, id) {
  return page.locator(`#${id}`).innerText();
}

/** Poll a page condition while advancing the fake clock (waitForFunction cannot, under page.clock). */
export async function waitUntil(page, fn, { ms = 10000, step = 100 } = {}) {
  let left = ms;
  while (left > 0) {
    if (await page.evaluate(fn)) return;
    await page.clock.runFor(step);
    left -= step;
  }
  throw new Error("condition not met in time");
}

/** Answer on the full-screen pad with a real swipe (dy < 0 up, > 0 down, 0 tap). */
export async function swipeOn(page, selector, { dx = 0, dy = 0 } = {}) {
  const box = await page.locator(selector).boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  if (dx || dy) await page.mouse.move(x + dx, y + dy, { steps: 4 });
  await page.mouse.up();
}

/*
 * Build 14: with swipes on (the default) the pads have no buttons; the whole
 * pad is the swipe area. These answer the way a student would: a swipe or a
 * tap on the area, or the button when the instructor set buttons only.
 */
export async function answerOn(page, answer) {
  const buttons = page.locator("#answerOverlay .answer-grid");
  if (await buttons.isVisible()) {
    await page.click(`#answerOverlay .answer-btn[data-answer='${answer}']`);
    return;
  }
  const dy = answer === "longer" ? -160 : answer === "shorter" ? 160 : 0;
  await swipeOn(page, "#answerSurface", { dy });
}

/** Street pad gestures: left/right (vehicle detected), tap (it passed), down (never came). */
export async function streetGesture(page, kind) {
  const detect = page.locator("#liveDetectButtons");
  const arrive = page.locator("#liveArriveButtons");
  if (kind === "left" || kind === "right") {
    if (await detect.isVisible()) { await page.click(`[data-live-detect='${kind}']`); return; }
    await swipeOn(page, "#liveSurface", { dx: kind === "left" ? -160 : 160 });
    return;
  }
  if (await arrive.isVisible()) {
    await page.click(kind === "down" ? "#liveNeverBtn" : "#liveArrivedBtn");
    return;
  }
  await swipeOn(page, "#liveSurface", { dy: kind === "down" ? 160 : 0 });
}

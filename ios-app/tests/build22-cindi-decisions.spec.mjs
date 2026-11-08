// Build 22: Cindi's decisions of 4 Nov 2026 on tracker items 20.5
// (accessibility settings follow the student) and 20.13 (traffic that
// drives on the left).
import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick, answerOn, streetGesture, watchErrors } from "./helpers.mjs";

async function twoStudents(page, storage = {}) {
  await openApp(page, { storage: { "om-client-code": "AB1", ...storage } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { window.__gsStudentsReload = () => { window.__reloaded = (window.__reloaded || 0) + 1; }; });
  const added = await page.evaluate(() => gsStudentsAdd("CD2", "2026-11-03"));
  expect(added.ok).toBe(true);
}

test("20.5: each student keeps their own accessibility settings", async ({ page }) => {
  await twoStudents(page, { "om-a11y-text-size": "large", "om-a11y-verbosity": "low" });
  // CD2 starts with the settings that were in use.
  expect(await page.evaluate(() => localStorage.getItem("om-a11y-text-size"))).toBe("large");
  // Change them for CD2 only.
  await page.evaluate(() => { localStorage.setItem("om-a11y-text-size", "xlarge"); localStorage.setItem("om-a11y-vibrate", "false"); });
  const ab1 = await page.evaluate(() => gsStudentsLoad().list.find((s) => s.code === "AB1").id);
  expect((await page.evaluate((id) => gsStudentsSwitch(id), ab1)).ok).toBe(true);
  expect(await page.evaluate(() => ({
    size: localStorage.getItem("om-a11y-text-size"),
    vibrate: localStorage.getItem("om-a11y-vibrate"),
    verbosity: localStorage.getItem("om-a11y-verbosity")
  }))).toEqual({ size: "large", vibrate: null, verbosity: "low" });
  const cd2 = await page.evaluate(() => gsStudentsLoad().list.find((s) => s.code === "CD2").id);
  expect((await page.evaluate((id) => gsStudentsSwitch(id), cd2)).ok).toBe(true);
  expect(await page.evaluate(() => ({ size: localStorage.getItem("om-a11y-text-size"), vibrate: localStorage.getItem("om-a11y-vibrate") })))
    .toEqual({ size: "xlarge", vibrate: "false" });
});

test("20.5: students saved by build 21 get the phone's settings once, so nobody loses theirs", async ({ page }) => {
  // A build 21 registry: AB1 waiting, without any accessibility keys.
  const registry = { active: "s2", list: [{ id: "s1", code: "AB1", started: "" }, { id: "s2", code: "CD2", started: "2026-11-03" }], data: { s1: { "om-client-code": "AB1", "om-clear-time": "4" } } };
  await openApp(page, { storage: { "om-client-code": "CD2", "om-students": JSON.stringify(registry), "om-a11y-theme": "dark" } });
  await page.evaluate(() => { window.__gsStudentsReload = () => {}; });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("om-students")));
  expect(saved.a11y).toBe(1);
  expect(saved.data.s1["om-a11y-theme"]).toBe("dark");
  expect(saved.data.s1["om-clear-time"]).toBe("4");
  expect((await page.evaluate(() => gsStudentsSwitch("s1"))).ok).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("om-a11y-theme"))).toBe("dark");
});

test("20.5: removing the last other student keeps the settings in use", async ({ page }) => {
  await twoStudents(page, { "om-a11y-output-mode": "visual" });
  await page.evaluate(() => gsStudentsRemoveActive());
  expect(await page.evaluate(() => localStorage.getItem("om-a11y-output-mode"))).toBe("visual");
});

async function openLive(page, side) {
  await openApp(page, { storage: { "om-live-sense": "hearing" } });
  await setTimes(page, "4", "8", "0.4");
  if (side) {
    // As the Instructor setup select does on change.
    await page.evaluate((s) => {
      const select = document.getElementById("ftTrafficSide");
      select.value = s;
      select.dispatchEvent(new Event("change"));
    }, side);
  }
  await page.evaluate(() => gsShowScreen("live"));
}

test("20.13: driving on the right (default), from the left is the first half", async ({ page }) => {
  await openLive(page, null);
  await page.click("#liveStartBtn");
  await streetGesture(page, "left");
  await tick(page, 6000);
  await streetGesture(page, "tap");
  await answerOn(page, "longer");
  expect((await history(page))[0]).toMatchObject({ street: "half", direction: "left", correct: true });
});

test("20.13: driving on the left, from the right is the first half and from the left the full street", async ({ page }) => {
  const errors = watchErrors(page);
  await openLive(page, "left");
  expect(await page.evaluate(() => gsLoadFeatures().options.trafficSide)).toBe("left");
  await page.click("#liveStartBtn");
  await streetGesture(page, "right");
  await tick(page, 6000);                                // 6 s vs 4 s first half: longer
  await streetGesture(page, "tap");
  await answerOn(page, "longer");
  expect((await history(page))[0]).toMatchObject({ street: "half", direction: "right", expected: "longer", correct: true });
  expect(errors).toEqual([]);
});

test("20.13: the labels say the right side, and the setting travels in the setup link", async ({ page }) => {
  await openLive(page, "left");
  const labels = await page.evaluate(() => ({
    clear: document.querySelector("label[for='clearTime']").textContent,
    full: document.querySelector("label[for='fullTime']").textContent,
    compare: document.querySelector("input[name='compareStreet'][value='half']").parentElement.textContent
  }));
  expect(labels.clear).toContain("traffic from the right");
  expect(labels.full).toContain("traffic from the left");
  expect(labels.compare).toContain("traffic from the right");
  const back = await page.evaluate(() => gsNormalizeFeatures(decodeLinkFeatures(encodeLinkFeatures(gsLoadFeatures()))).options.trafficSide);
  expect(back).toBe("left");
  // A link made before build 22 has no digit for it: right, as before. (Build
  // 24 added one more digit after it, the "about the same" range.)
  const old = await page.evaluate(() => gsNormalizeFeatures(decodeLinkFeatures(encodeLinkFeatures(gsLoadFeatures()).slice(0, -2))).options.trafficSide);
  expect(old).toBe("right");
});

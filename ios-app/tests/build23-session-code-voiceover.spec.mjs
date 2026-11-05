// Build 23: the session code pop-up with VoiceOver (Cindi and a tester,
// 4 Nov 2026). Self-voicing talked over VoiceOver, and the field was not
// announced as a text field: the dialog's description was read again first.
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openApp, watchErrors } from "./helpers.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const lockOff = /const GS_SESSION_LOCK_ENABLED = false/.test(fs.readFileSync(path.resolve(here, "../www/js/app.js"), "utf8"));

function fakeSpeech(page) {
  return page.addInitScript(() => {
    window.__spoken = [];
    const fake = {
      speaking: false,
      cancel() {},
      speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 10); },
      getVoices() { return []; }
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  });
}

test("self-voicing stays quiet while VoiceOver or TalkBack is running", async ({ page }) => {
  await fakeSpeech(page);
  await openApp(page, { storage: { "om-a11y-self-voice": "true" } });
  await page.evaluate(() => { window.__gsScreenReader = true; window.__spoken = []; announceScreenReader("Hello there."); gsShowScreen("help"); });
  expect(await page.evaluate(() => window.__spoken)).toEqual([]);
  // The screen reader still gets the message through the live region.
  await expect(page.locator("#srAnnouncer, [aria-live]").first()).toBeAttached();
  // Without a screen reader, self-voicing speaks as before.
  await page.evaluate(() => { window.__gsScreenReader = false; window.__spoken = []; announceScreenReader("Hello there."); });
  expect(await page.evaluate(() => window.__spoken)).toContain("Hello there.");
});

test("session code pop-up: the field is a labelled text field and gets focus, nothing is said twice", async ({ page }) => {
  test.skip(lockOff, "lock switched off");
  const errors = watchErrors(page);
  await fakeSpeech(page);
  await page.addInitScript(() => { window.__gsScreenReader = true; });
  await openApp(page, { locked: true, storage: { "om-a11y-self-voice": "true" } });
  const modal = page.locator("#sessionCodeModal");
  await expect(modal).toBeVisible();
  expect(await modal.getAttribute("aria-describedby")).toBeNull();
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("sessionCodeModalInput");
  const field = page.getByRole("textbox", { name: "Session code" });
  await expect(field).toBeVisible();
  expect(await field.getAttribute("aria-describedby")).toBeNull();
  await expect(page.locator("#sessionCodeModalNote")).toHaveText("");
  expect(await page.evaluate(() => window.__spoken)).toEqual([]);
  // The field takes typing, and a wrong code is still reported.
  await field.fill("1234");
  await page.click("#sessionCodeModalBtn");
  await expect(page.locator("#sessionCodeModalNote")).toContainText("did not match");
  expect(errors).toEqual([]);
});

test("session code pop-up without a screen reader: self-voicing reads the instruction once", async ({ page }) => {
  test.skip(lockOff, "lock switched off");
  await fakeSpeech(page);
  await page.addInitScript(() => { window.__gsScreenReader = false; });
  await openApp(page, { locked: true, storage: { "om-a11y-self-voice": "true" } });
  await expect(page.locator("#sessionCodeModal")).toBeVisible();
  await page.waitForTimeout(300);
  const spoken = await page.evaluate(() => window.__spoken.filter((t) => /session code/i.test(t)));
  expect(spoken.length).toBe(1);
});

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { watchErrors, openApp, setTimes } from "./helpers.mjs";

/* Build 29 (24 Nov 2026): Cindi's build 28 entries 28.1, 28.4, 28.5, 28.6,
 * her note of 22 Nov on the length of the sounds, her answer on 27.27, and
 * the feedback link Azizul asked for. */

const WWW = new URL("../www/", import.meta.url);

/* A stand-in for the phone's voice that records what it is asked to say. */
async function fakePhoneVoice(page) {
  await page.evaluate(() => {
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

const RESULT = "That was your taps, then the crossing time: within the margin. Ready for another try.";

test("28.1: the words about the last try stop when the next try begins", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { voice: "natural" });
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  await fakePhoneVoice(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("practice"));
  await page.evaluate((text) => { gsSpeak(text, { maxWaitMs: 15000 }); }, RESULT);
  await page.waitForFunction(() => !gsVoiceAudio().paused);
  await page.locator("#actionBtn").click();            // Begin: the next try
  expect(await page.evaluate(() => ({ busy: gsSpeechBusy(), paused: gsVoiceAudio().paused })))
    .toEqual({ busy: false, paused: true });
  expect(await page.evaluate(() => window.__spoken)).toEqual([]);   // and it is not said again
  expect(errors).toEqual([]);
});

test("28.1: a quiet stretch stops the result being spoken, with 'Speak directions aloud' off too", async ({ page }) => {
  await openApp(page, { voice: "natural" });
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  await fakePhoneVoice(page);
  expect(await page.evaluate(() => a11ySettings.selfVoice)).toBe(false);
  await page.evaluate((text) => { gsSpeak(text, { maxWaitMs: 15000 }); }, RESULT);
  await page.waitForFunction(() => !gsVoiceAudio().paused);
  await page.evaluate(() => { gsBeginQuiet(); suppressSrAnnouncements = false; });
  expect(await page.evaluate(() => ({ busy: gsSpeechBusy(), paused: gsVoiceAudio().paused })))
    .toEqual({ busy: false, paused: true });
});

test("28.4: the Start, Halfway, Finish result and 'How much longer?' have recordings", async ({ page }) => {
  await openApp(page, { voice: "natural" });
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  const clips = await page.evaluate(() => {
    const words = ["within the margin", "outside the margin"];
    const out = {};
    for (const half of words) {
      for (const finish of words) {
        const full = `That was your taps, then halfway: ${half}, and finish: ${finish}. Ready for another try.`;
        const short = `Halfway: ${half}, finish: ${finish}. Ready for another try.`;
        out[full] = gsVoiceClipsFor(full)?.length || 0;
        out[short] = gsVoiceClipsFor(short)?.length || 0;
      }
    }
    for (const direction of ["longer", "shorter"]) {
      const title = `How much ${direction}? Tap to start, tap again to end.`;
      out[title] = gsVoiceClipsFor(title)?.length || 0;
      out[`How much ${direction}?`] = gsVoiceClipsFor(`How much ${direction}?`)?.length || 0;
    }
    return out;
  });
  for (const [sentence, count] of Object.entries(clips)) expect(count, sentence).toBeGreaterThan(0);
  // The files are on disk.
  const manifest = JSON.parse(readFileSync(new URL("voice/manifest.json", WWW), "utf8")).clips;
  for (const key of ["how much longer?", "how much shorter?", "halfway: within the margin, finish: outside the margin"]) {
    expect(readFileSync(new URL(`voice/${manifest[key]}.mp3`, WWW)).length).toBeGreaterThan(500);
  }
});

test("28.5: a recorded sentence cut off by one in the phone's voice is not said again", async ({ page }) => {
  await openApp(page, { voice: "natural" });
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  await fakePhoneVoice(page);
  await page.evaluate((text) => {
    window.__done = 0;
    gsSpeak(text, { onDone: () => { window.__done += 1; }, maxWaitMs: 15000 });
  }, RESULT);
  await page.waitForFunction(() => !gsVoiceAudio().paused);
  // A sentence with a number in it has no recording: the phone's voice says it.
  await page.evaluate(() => gsSpeak("You were 0.4 seconds early."));
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({ spoken: window.__spoken, paused: gsVoiceAudio().paused, done: window.__done, active: Boolean(gsVoiceClipActive) }));
  expect(after.spoken).toEqual(["You were 0.4 seconds early."]);   // only the new sentence
  expect(after.paused).toBe(true);                                  // the recording stopped: one voice
  expect(after.done).toBe(1);                                       // and its caller was released
  expect(after.active).toBe(false);
});

test("28.5 on iPhone: the cut-off recording comes back 'not completed' and is still not said again", async ({ page }) => {
  await openApp(page, { voice: "natural" });
  await page.waitForFunction(() => Boolean(gsVoiceManifest));
  // What the iPhone app does: speakClips resolves completed: false when a
  // later speak() stops it. Played here through the same page functions.
  const result = await page.evaluate(async (text) => {
    const said = [];
    let release = null;
    const realClips = gsPlayVoiceClips;
    const active = { ended: false, stop: null };
    // Stand in for the native path of gsPlayVoiceClips.
    gsVoiceClipActive = active;
    let fellBack = false;
    const end = (how) => {
      if (active.ended) return;
      active.ended = true;
      if (gsVoiceClipActive === active) gsVoiceClipActive = null;
      if (how === "fail") fellBack = true;
    };
    active.stop = () => end("done");
    const native = new Promise((resolve) => { release = resolve; }).then((r) => end(r.completed === false ? "fail" : "done"));
    // The new sentence, in the phone's voice, interrupting.
    Object.defineProperty(window, "speechSynthesis", { value: { speaking: false, cancel() {}, speak(u) { said.push(u.text); }, getVoices() { return []; } }, configurable: true });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    gsSpeak("You were 0.4 seconds early.");
    release({ completed: false });          // the iPhone reports the stopped recording
    await native;
    return { said, fellBack, text };
  }, RESULT);
  expect(result.said).toEqual(["You were 0.4 seconds early."]);
  expect(result.fellBack).toBe(false);
});

test("sounds: the long right and wrong sounds are now under half a second, and still start on their first sample", async () => {
  for (const name of ["bright/right-a", "bright/right-b", "bright/wrong-a", "bright/wrong-b", "warm/right-a", "warm/right-b"]) {
    const wav = readFileSync(new URL(`sounds/${name}.wav`, WWW));
    const rate = wav.readUInt32LE(24);
    const dataAt = wav.indexOf("data") + 8;
    const seconds = (wav.length - dataAt) / 2 / rate;
    expect(seconds, name).toBeLessThanOrEqual(0.5);
    expect(seconds, name).toBeGreaterThan(0.3);
    // Heard from the first hundredth of a second: no silence before the sound.
    let peak = 0;
    for (let i = 0; i < rate / 100; i += 1) peak = Math.max(peak, Math.abs(wav.readInt16LE(dataAt + i * 2)));
    expect(peak, name).toBeGreaterThan(3000);
  }
});

test("feedback: Help has a link to the feedback form, opened outside the app", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => gsShowScreen("help"));
  const link = page.locator("#feedbackLink");
  await expect(link).toBeVisible();
  await expect(link).toHaveText("Give feedback");
  expect(await link.getAttribute("href")).toMatch(/^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/viewform$/);
  expect(await link.getAttribute("target")).toBe("_blank");
  expect(await link.getAttribute("rel")).toContain("noopener");
});

test("27.27: on the website the first-run box asks once about a screen reader, and the answer sets the Accessibility setting", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { disclaimerSeen: false, tutorialSeen: true });
  await expect(page.locator("#disclaimerModal")).toBeVisible();
  await expect(page.locator("#disclaimerScreenReader")).toBeVisible();
  await expect(page.locator("#disclaimerScreenReaderNo")).toBeChecked();
  await page.locator("#disclaimerScreenReaderYes").check();
  await page.locator("#disclaimerAcceptBtn").click();
  expect(await page.evaluate(() => localStorage.getItem("om-a11y-web-screen-reader"))).toBe("true");
  expect(await page.evaluate(() => gsScreenReaderOn())).toBe(true);
  expect(await page.evaluate(() => document.getElementById("a11yWebScreenReader").checked)).toBe(true);
  // "Show the safety notes again" opens the same box: it shows the answer
  // already given, and pressing "I understand" does not undo it.
  await page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach((d) => d.close()); gsShowScreen("help"); });
  await page.locator("#showSafetyNotesBtn").click();
  await expect(page.locator("#disclaimerScreenReaderYes")).toBeChecked();
  await page.locator("#disclaimerAcceptBtn").click();
  expect(await page.evaluate(() => localStorage.getItem("om-a11y-web-screen-reader"))).toBe("true");
  expect(errors).toEqual([]);
});

test("27.27: answering No leaves the app's own voice as it was", async ({ page }) => {
  await openApp(page, { disclaimerSeen: false, tutorialSeen: true });
  await page.locator("#disclaimerAcceptBtn").click();
  expect(await page.evaluate(() => localStorage.getItem("om-a11y-web-screen-reader"))).toBe("false");
  expect(await page.evaluate(() => gsScreenReaderOn())).toBe(false);
});

test("28.6: the page cannot be drawn smaller than the screen, and the date box stays inside its card", async ({ page }) => {
  await openApp(page);
  const viewport = await page.evaluate(() => document.querySelector('meta[name="viewport"]').content);
  expect(viewport).toContain("minimum-scale=1");
  expect(viewport).not.toContain("user-scalable=no");       // pinch to zoom in stays
  await page.evaluate(() => gsShowScreen("instructor"));
  const box = await page.evaluate(() => {
    const input = document.getElementById("studentStarted");
    const style = getComputedStyle(input);
    const card = input.parentElement.getBoundingClientRect();
    const r = input.getBoundingClientRect();
    return { minWidth: style.minWidth, inside: r.right <= card.right + 0.5, pageWide: document.documentElement.scrollWidth <= window.innerWidth };
  });
  expect(box.minWidth).toBe("0px");
  expect(box.inside).toBe(true);
  expect(box.pageWide).toBe(true);
});

test("28.6: a drop-down with a long choice is cut off inside its box and never widens the page", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => gsShowScreen("instructor"));
  const result = await page.evaluate(() => {
    const select = document.getElementById("ftTrafficSide");
    const style = getComputedStyle(select);
    const r = select.getBoundingClientRect();
    return { overflow: style.overflowX, ellipsis: style.textOverflow, minWidth: style.minWidth, right: r.right, screen: window.innerWidth, page: document.documentElement.scrollWidth };
  });
  expect(["hidden", "clip"]).toContain(result.overflow);   // Chrome reports clip for a drop-down
  expect(result.ellipsis).toBe("ellipsis");
  expect(result.minWidth).toBe("0px");
  expect(result.right).toBeLessThanOrEqual(result.screen);
  expect(result.page).toBeLessThanOrEqual(result.screen);
});

test("28.6: after a link, the page starts again only once the app is on screen", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    let reloads = 0;
    window.__gsStudentsReload = () => { reloads += 1; };
    let state = "hidden";
    Object.defineProperty(document, "visibilityState", { get: () => state, configurable: true });
    await gsStudentsCommitAndReload("Now showing student TEST1.");
    const whileHidden = reloads;
    state = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    const atOnce = reloads;
    await new Promise((r) => setTimeout(r, 400));
    const afterShown = reloads;
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((r) => setTimeout(r, 400));
    // Already on screen: at once, as before.
    await gsStudentsCommitAndReload("Now showing student TEST1.");
    return { whileHidden, atOnce, afterShown, again: reloads };
  });
  expect(result).toEqual({ whileHidden: 0, atOnce: 0, afterShown: 1, again: 2 });
});

import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes } from "./helpers.mjs";

/* Build 28, tracker 27.38: a waiting student's practice history is its own
 * record (a file on the phone, an entry in the browser's database), and
 * om-students keeps only a small index. */

const boot = (page) => page.waitForFunction(() => typeof gsBoot === "function" && document.getElementById("screen-home"));

/* What is in the browser's database under a key. */
const durable = (page, key) => page.evaluate((k) => new Promise((resolve, reject) => {
  const request = indexedDB.open("gapsense", 1);
  request.onupgradeneeded = () => { request.result.createObjectStore("kv"); };
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
    const db = request.result;
    const get = db.transaction("kv", "readonly").objectStore("kv").get(k);
    get.onsuccess = () => { resolve(get.result ?? null); db.close(); };
    get.onerror = () => { reject(get.error); db.close(); };
  };
}), key);

/* Tries, as the app stores them. `tag` goes in userSec so each student's
 * history can be told apart. */
const tries = (count, tag) => Array.from({ length: count }, (_, i) => ({
  time: 1790000000000 + i * 60000, activity: i % 2 ? "practice" : "compare", street: i % 3 ? "full" : "half",
  userSec: tag, refSec: 8, diffSec: Number((tag - 8).toFixed(2)), correct: i % 4 !== 0, marginSec: 0.4, answer: "longer", expected: "longer"
}));

/* Several students, the first in use, every history still inside om-students
 * (as build 27 left it). Returns their ids. */
async function seedInline(page, students) {
  return page.evaluate(async (list) => {
    const ids = list.map(() => gsNewStudentId());
    const registry = { active: ids[0], list: list.map((s, i) => ({ id: ids[i], code: s.code, started: "" })), data: {}, a11y: 1 };
    list.forEach((s, i) => {
      if (i === 0) return;
      registry.data[ids[i]] = { "om-client-code": s.code, "om-clear-time": "4", "om-full-time": String(s.full), "om-margin": "0.4", "om-attempt-log": JSON.stringify(s.history) };
    });
    localStorage.setItem("om-client-code", list[0].code);
    localStorage.setItem("om-clear-time", "4"); localStorage.setItem("om-full-time", String(list[0].full)); localStorage.setItem("om-margin", "0.4");
    localStorage.setItem("om-attempt-log", JSON.stringify(list[0].history));
    localStorage.setItem("om-students", JSON.stringify(registry));
    await gsStore.syncNow();
    return ids;
  }, students);
}

const registryOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("om-students")));
const liveHistory = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("om-attempt-log") || "[]"));

test("at start, histories left inside om-students by an earlier build move to their own records, and only a mark stays", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  const ids = await seedInline(page, [
    { code: "AB1", full: 8, history: tries(30, 7) },
    { code: "CD2", full: 9, history: tries(120, 9) },
    { code: "EF3", full: 10, history: [] }
  ]);
  const before = (await page.evaluate(() => localStorage.getItem("om-students"))).length;
  await page.reload();
  await boot(page);
  await page.waitForFunction((id) => JSON.parse(localStorage.getItem("om-students")).data[id]["gs-history-record"] === "1", ids[1]);
  const registry = await registryOf(page);
  expect(registry.data[ids[1]]["om-attempt-log"]).toBeUndefined();
  expect(registry.data[ids[1]]["om-full-time"]).toBe("9");                 // the rest of the student's data stays
  expect(registry.data[ids[2]]["gs-history-record"]).toBeUndefined();      // nothing to move for an empty history
  const record = JSON.parse(await durable(page, `student-history:${ids[1]}`));
  expect(record.length).toBe(120);
  expect(record[0].userSec).toBe(9);
  expect((await page.evaluate(() => localStorage.getItem("om-students"))).length).toBeLessThan(before / 10);
  expect((await liveHistory(page)).length).toBe(30);                       // the student in use is untouched
  expect(errors).toEqual([]);
});

test("switching students brings that student's history back, puts the other's away, and a round trip loses nothing", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  const ids = await seedInline(page, [
    { code: "AB1", full: 8, history: tries(30, 7) },
    { code: "CD2", full: 9, history: tries(120, 9) }
  ]);
  await page.reload();
  await boot(page);
  await page.waitForFunction((id) => JSON.parse(localStorage.getItem("om-students")).data[id]["gs-history-record"] === "1", ids[1]);

  // To CD2.
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.locator("#studentSelect").selectOption(ids[1]);
  await page.waitForFunction((id) => typeof gsBoot === "function" && typeof gsTabStudentId === "string" && gsTabStudentId === id && document.readyState === "complete" && document.getElementById("screen-home"), ids[1]);
  let history = await liveHistory(page);
  expect(history.length).toBe(120);
  expect(history.every((t) => t.userSec === 9)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("om-full-time"))).toBe("9");
  let registry = await registryOf(page);
  expect(registry.data[ids[0]]["gs-history-record"]).toBe("1");
  expect(registry.data[ids[0]]["om-attempt-log"]).toBeUndefined();
  expect(JSON.parse(await durable(page, `student-history:${ids[0]}`)).length).toBe(30);
  expect(await durable(page, `student-history:${ids[1]}`)).toBeNull();      // no old copy of the student in use

  // CD2 practises once, then back to AB1.
  expect(await page.evaluate(() => gsLogAttempt({ activity: "practice", street: "full", userSec: 9.5, refSec: 9, diffSec: 0.5, correct: false, marginSec: 0.4 }))).toBe(121);
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.locator("#studentSelect").selectOption(ids[0]);
  await page.waitForFunction((id) => typeof gsBoot === "function" && typeof gsTabStudentId === "string" && gsTabStudentId === id && document.readyState === "complete" && document.getElementById("screen-home"), ids[0]);
  history = await liveHistory(page);
  expect(history.length).toBe(30);
  expect(history.every((t) => t.userSec === 7)).toBe(true);
  registry = await registryOf(page);
  expect(registry.data[ids[1]]["gs-history-record"]).toBe("1");
  const cd2 = JSON.parse(await durable(page, `student-history:${ids[1]}`));
  expect(cd2.length).toBe(121);
  expect(cd2[120].userSec).toBe(9.5);
  expect(errors).toEqual([]);
});

test("if a student's record cannot be read, the switch is refused and nothing changes", async ({ page }) => {
  await openApp(page);
  const ids = await seedInline(page, [
    { code: "AB1", full: 8, history: tries(30, 7) },
    { code: "CD2", full: 9, history: tries(40, 9) }
  ]);
  await page.reload();
  await boot(page);
  await page.waitForFunction((id) => JSON.parse(localStorage.getItem("om-students")).data[id]["gs-history-record"] === "1", ids[1]);
  const before = await page.evaluate(() => localStorage.getItem("om-students"));
  for (const broken of ["null", "throw", "damaged"]) {
    await page.evaluate((how) => {
      window.__realLoad = window.__realLoad || gsStore.loadStudentHistory;
      gsStore.loadStudentHistory = async () => { if (how === "throw") throw new Error("disk"); return how === "damaged" ? "{not json" : null; };
      window.__reloads = 0;
      window.__gsStudentsReload = () => { window.__reloads += 1; };
      gsShowScreen("instructor");
    }, broken);
    await page.locator("#studentSelect").selectOption(ids[1]);
    await expect(page.locator("#studentsNote")).toContainText("could not read that student's practice history");
    expect(await page.evaluate(() => ({ active: gsActiveStudentIdNow(), reloads: window.__reloads, tries: JSON.parse(localStorage.getItem("om-attempt-log")).length })))
      .toEqual({ active: ids[0], reloads: 0, tries: 30 });
    expect(await page.evaluate(() => localStorage.getItem("om-students"))).toBe(before);
    expect(await page.locator("#studentSelect").inputValue()).toBe(ids[0]);   // the list shows who is really open
  }
  // The record itself was never touched.
  await page.evaluate(() => { gsStore.loadStudentHistory = window.__realLoad; });
  expect(JSON.parse(await durable(page, `student-history:${ids[1]}`)).length).toBe(40);
});

test("a history is taken out of om-students only after its record was written and read back", async ({ page }) => {
  await openApp(page);
  const ids = await seedInline(page, [
    { code: "AB1", full: 8, history: tries(5, 7) },
    { code: "CD2", full: 9, history: tries(40, 9) }
  ]);
  // The write fails; then it "succeeds" but reads back differently.
  const moved = await page.evaluate(async () => {
    const out = {};
    const realSave = gsStore.saveStudentHistory;
    gsStore.saveStudentHistory = async () => { throw new Error("QuotaExceededError"); };
    out.failed = await gsStudentsPutAway();
    gsStore.saveStudentHistory = realSave;
    const realLoad = gsStore.loadStudentHistory;
    out.direct = await realSave("zz9test", "[1,2,3]").then(() => "ok", (e) => String(e.message));
    out.back = await realLoad("zz9test");
    await gsStore.deleteStudentHistory("zz9test");
    out.gone = await realLoad("zz9test");
    out.badId = await realSave("../../x", "[]").then(() => "ok", (e) => String(e.message));
    return out;
  });
  expect(moved.failed).toBe(0);
  expect(moved.direct).toBe("ok");
  expect(moved.back).toBe("[1,2,3]");
  expect(moved.gone).toBeNull();
  expect(moved.badId).toBe("not a student id");
  const registry = await registryOf(page);
  expect(JSON.parse(registry.data[ids[1]]["om-attempt-log"]).length).toBe(40);   // still inside: nothing lost
  expect(registry.data[ids[1]]["gs-history-record"]).toBeUndefined();
  // With the storage working again it is moved.
  expect(await page.evaluate(() => gsStudentsPutAway())).toBe(1);
});

test("removing the student in use brings the next student's history back first, and deletes any record of the removed one", async ({ page }) => {
  await openApp(page);
  const ids = await seedInline(page, [
    { code: "AB1", full: 8, history: tries(30, 7) },
    { code: "CD2", full: 9, history: tries(40, 9) }
  ]);
  await page.reload();
  await boot(page);
  await page.waitForFunction((id) => JSON.parse(localStorage.getItem("om-students")).data[id]["gs-history-record"] === "1", ids[1]);
  await page.evaluate(async (id) => { await gsStore.saveStudentHistory(id, "[]"); }, ids[0]);   // an old record of AB1
  await page.evaluate(() => gsConfirmRemoveStudent());
  await page.waitForFunction(() => typeof gsBoot === "function" && localStorage.getItem("om-client-code") === "CD2" && document.getElementById("screen-home"));
  expect((await liveHistory(page)).length).toBe(40);
  expect(await durable(page, `student-history:${ids[0]}`)).toBeNull();
  expect(await durable(page, `student-history:${ids[1]}`)).toBeNull();
});

test("a setup link for a student whose history is in a record switches to that student with the history in place", async ({ page }) => {
  await openApp(page);
  const ids = await seedInline(page, [
    { code: "AB1", full: 8, history: tries(30, 7) },
    { code: "CD2", full: 9, history: tries(40, 9) }
  ]);
  await page.reload();
  await boot(page);
  await page.waitForFunction((id) => JSON.parse(localStorage.getItem("om-students")).data[id]["gs-history-record"] === "1", ids[1]);
  const token = await page.evaluate(() => {
    const code = document.getElementById("clientCode");
    const keep = [code.value, clearTimeInput.value, fullTimeInput.value, marginInput.value];
    code.value = "CD2"; clearTimeInput.value = "6"; fullTimeInput.value = "12"; marginInput.value = "0.5";
    const made = buildShareTimingToken({ times: true, contact: true, features: false, lock: false });
    [code.value, clearTimeInput.value, fullTimeInput.value, marginInput.value] = keep;
    return made;
  });
  await page.evaluate((t) => { window.location.hash = `ts=${t}`; }, token);
  await page.waitForFunction(() => typeof gsBoot === "function" && localStorage.getItem("om-client-code") === "CD2" && localStorage.getItem("om-full-time") === "12", null, { timeout: 15000 });
  expect((await liveHistory(page)).length).toBe(40);
  await expect(page.locator("#screen-home")).toBeVisible();

  // And when the record cannot be read, the link is refused and AB1's times stay.
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.locator("#studentSelect").selectOption(ids[0]);
  await page.waitForFunction((id) => typeof gsBoot === "function" && typeof gsTabStudentId === "string" && gsTabStudentId === id && document.readyState === "complete" && document.getElementById("screen-home"), ids[0]);
  await page.evaluate((t) => {
    gsStore.loadStudentHistory = async () => null;
    window.location.hash = `ts=${t}`;
  }, token);
  await expect(page.locator("#cueBannerText")).toContainText("could not switch to that student");
  expect(await page.evaluate(() => ({ code: localStorage.getItem("om-client-code"), full: localStorage.getItem("om-full-time"), hash: location.hash.includes("ts=") })))
    .toEqual({ code: "AB1", full: "8", hash: false });
});

test("Delete history also removes an old record of the student in use", async ({ page }) => {
  await openApp(page);
  const ids = await seedInline(page, [
    { code: "AB1", full: 8, history: tries(30, 7) },
    { code: "CD2", full: 9, history: tries(40, 9) }
  ]);
  await page.evaluate(async (id) => { await gsStore.saveStudentHistory(id, JSON.stringify([{ time: 1, activity: "practice" }])); }, ids[0]);
  await page.evaluate(() => gsConfirmDeleteHistory());
  expect(await durable(page, `student-history:${ids[0]}`)).toBeNull();
  expect((await liveHistory(page)).length).toBe(0);
});

test("27.38: five students with 4,500 tries each: the app starts, saves a new try, and the settings record stays small", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page);
  const ids = await page.evaluate(async (make) => {
    // eslint-disable-next-line no-new-func
    const tries = new Function(`return ${make}`)();
    const codes = ["AB1", "CD2", "EF3", "GH4", "JK5"];
    const ids = codes.map(() => gsNewStudentId());
    const registry = { active: ids[0], list: codes.map((code, i) => ({ id: ids[i], code, started: "" })), data: {}, a11y: 1 };
    for (let i = 1; i < codes.length; i += 1) {
      await gsStore.saveStudentHistory(ids[i], JSON.stringify(tries(4500, 8 + i)));
      registry.data[ids[i]] = { "om-client-code": codes[i], "om-clear-time": "4", "om-full-time": String(8 + i), "om-margin": "0.4", "gs-history-record": "1" };
    }
    localStorage.setItem("om-client-code", codes[0]);
    localStorage.setItem("om-attempt-log", JSON.stringify(tries(4500, 8)));
    localStorage.setItem("om-students", JSON.stringify(registry));
    await gsStore.syncNow();
    return ids;
  }, tries.toString());

  await page.reload();
  await boot(page);
  await expect(page.locator("#screen-home")).toBeVisible();
  await expect(page.locator(".step-card")).toHaveCount(4);

  // A new try is saved.
  expect(await page.evaluate(() => gsLogAttempt({ activity: "practice", street: "full", userSec: 8.2, refSec: 8, diffSec: 0.2, correct: true, marginSec: 0.4 }))).toBe(4501);
  expect(await page.evaluate(() => gsHistorySaveProblem().includes("could not be saved"))).toBe(false);

  // What goes to the phone's Preferences (here: the browser's settings record) is small.
  await page.evaluate(() => gsStore.syncNow());
  const settings = await durable(page, "gs-settings");
  expect(JSON.stringify(settings).length).toBeLessThan(20000);
  expect(settings["om-students"].length).toBeLessThan(3000);
  expect(await page.evaluate(() => gsStore.status().lastError)).toBe("");

  // A waiting student's 4,500 tries are all there when they are opened.
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.locator("#studentSelect").selectOption(ids[3]);
  await page.waitForFunction((id) => typeof gsBoot === "function" && typeof gsTabStudentId === "string" && gsTabStudentId === id && document.readyState === "complete" && document.getElementById("screen-home"), ids[3], { timeout: 30000 });
  const opened = await liveHistory(page);
  expect(opened.length).toBe(4500);
  expect(opened[4499].userSec).toBe(11);
  // The student who was in use, with the new try, is now a record of 4,501.
  expect(JSON.parse(await durable(page, `student-history:${ids[0]}`)).length).toBe(4501);
  expect((await page.evaluate(() => localStorage.getItem("om-students"))).length).toBeLessThan(3000);
  expect(errors).toEqual([]);
});

test("iPhone and Android: the record is a file in the app's data folder, gapsense/students/<id>.json", async ({ page }) => {
  await page.addInitScript(() => {
    window.__files = {};
    window.__prefs = {};
    window.Capacitor = {
      isNativePlatform: () => true, getPlatform: () => "android",
      Plugins: {
        Haptics: { vibrate: async () => {}, impact: async () => {} },
        GSAndroid: { speak: async () => ({ spoken: true }), stopSpeaking: async () => {}, accessibilityStatus: async () => ({ screenReader: false }), setWindowBackground: async () => {}, textScale: async () => ({ scale: 1 }), speechStatus: async () => ({ ready: true }), deviceStatus: async () => ({ hasVibrator: true }), keepAwake: async () => ({}), addListener: () => ({ remove: () => {} }) },
        Filesystem: {
          writeFile: async ({ path, data, directory }) => { window.__files[`${directory}:${path}`] = data; return { uri: `file:///${path}` }; },
          readFile: async ({ path, directory }) => { const key = `${directory}:${path}`; if (!(key in window.__files)) throw new Error("File does not exist"); return { data: window.__files[key] }; },
          deleteFile: async ({ path, directory }) => { delete window.__files[`${directory}:${path}`]; },
          rmdir: async () => {}, readdir: async () => ({ files: [] })
        },
        Preferences: { get: async ({ key }) => ({ value: window.__prefs[key] ?? null }), set: async ({ key, value }) => { window.__prefs[key] = value; } },
        App: { getInfo: async () => ({ version: "1.0", build: "28" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  });
  await openApp(page);
  const ids = await seedInline(page, [
    { code: "AB1", full: 8, history: tries(5, 7) },
    { code: "CD2", full: 9, history: tries(40, 9) }
  ]);
  expect(await page.evaluate(() => gsStudentsPutAway())).toBe(1);
  const state = await page.evaluate(async () => { await gsStore.syncNow(); return { files: Object.keys(window.__files), prefs: window.__prefs["gs-settings"] }; });
  expect(state.files).toContain(`DATA:gapsense/students/${ids[1]}.json`);
  expect(state.prefs.includes('\\"om-attempt-log\\"')).toBe(false);       // no history inside the Preferences value
  expect(state.prefs.length).toBeLessThan(6000);
  const ready = await page.evaluate((id) => gsStudentsBringIn(id), ids[1]);
  expect(ready).toEqual({ ok: true });
  expect(await page.evaluate((id) => JSON.parse(JSON.parse(localStorage.getItem("om-students")).data[id]["om-attempt-log"]).length, ids[1])).toBe(40);
  expect(await page.evaluate(() => Object.keys(window.__files).filter((f) => f.includes("students/")))).toEqual([]);
});

test("a last guard: switching or removing without bringing the history in first is refused, never done with an empty history", async ({ page }) => {
  await openApp(page);
  const ids = await seedInline(page, [
    { code: "AB1", full: 8, history: tries(30, 7) },
    { code: "CD2", full: 9, history: tries(40, 9) }
  ]);
  expect(await page.evaluate(() => gsStudentsPutAway())).toBe(1);
  const result = await page.evaluate((id) => ({ switched: gsStudentsSwitch(id), removed: gsStudentsRemoveActive(), active: gsActiveStudentIdNow() }), ids[1]);
  expect(result.switched.ok).toBe(false);
  expect(result.removed.removed).toBeNull();
  expect(result.active).toBe(ids[0]);
  expect(JSON.parse(await durable(page, `student-history:${ids[1]}`)).length).toBe(40);
});

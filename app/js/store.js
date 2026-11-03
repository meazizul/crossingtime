/* ============================================================
 * CrossingTime — durable copy of everything the app keeps
 * ============================================================
 *
 * Everything (settings, crossing times, the instructor's setup, the practice
 * history) is written through localStorage, which the app reads
 * synchronously everywhere. That storage is not durable: iOS and Android can
 * reclaim a web view's local storage when the phone runs low on space, and
 * Safari deletes a site's data after seven days without use (Cindi, tracker
 * 12.40, P0).
 *
 * This module keeps a second, durable copy and restores from it:
 *
 *   iPhone and Android apps   settings in the phone's native preferences
 *                             (UserDefaults / SharedPreferences, through
 *                             Capacitor Preferences) and the practice history
 *                             in a file in the app's own data directory
 *                             (Capacitor Filesystem). Both survive low space
 *                             and app updates, and go only when the app is
 *                             deleted.
 *   web                       IndexedDB, with persistent storage requested
 *                             (navigator.storage.persist()), which keeps
 *                             Safari from clearing it after seven days once
 *                             granted.
 *
 * How: every localStorage write is mirrored a moment later (debounced). At
 * start, if localStorage has lost the app's keys but the durable copy has
 * them, the copy is written back and the page reloads once, so the rest of
 * the app starts with the data in place. The first launch of this build makes
 * the first copy, which is the one-time migration of existing data.
 *
 * Loaded before everything else; nothing here depends on the other files.
 * ============================================================ */

(function gsStoreModule() {
  const PREFIX = "om-";
  const HISTORY_KEY = "om-attempt-log";
  const SETTINGS_RECORD = "gs-settings";          // every om-* key except the history
  const HISTORY_FILE = "gapsense/history.json";
  const RESTORED_FLAG = "gs-restored-once";
  const CLEARED_FLAG = "gs-cleared";              // the page itself emptied localStorage: do not restore on the next load
  const DEBOUNCE_MS = 400;

  const cap = window.Capacitor;
  const native = Boolean(cap?.isNativePlatform?.());
  const Preferences = cap?.Plugins?.Preferences;
  const Filesystem = cap?.Plugins?.Filesystem;
  const useNative = native && Preferences && Filesystem;

  const state = {
    backend: useNative ? "native" : (typeof indexedDB !== "undefined" ? "indexeddb" : "none"),
    lastSavedAt: 0,
    lastError: "",
    pending: false,
    restored: false,
    persisted: null,
    writes: 0
  };

  /* ---------------- the durable copy ---------------- */

  function openDb() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open("gapsense", 1);
        request.onupgradeneeded = () => { request.result.createObjectStore("kv"); };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  function idbGet(key) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readonly");
      const req = tx.objectStore("kv").get(key);
      req.onsuccess = () => { resolve(req.result ?? null); db.close(); };
      req.onerror = () => { reject(req.error); db.close(); };
    }));
  }

  function idbSet(key, value) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(value, key);
      tx.oncomplete = () => { resolve(); db.close(); };
      tx.onerror = () => { reject(tx.error); db.close(); };
    }));
  }

  async function readCopy() {
    if (state.backend === "none") return { settings: null, history: null };
    if (useNative) {
      const settingsRaw = (await Preferences.get({ key: SETTINGS_RECORD }))?.value || null;
      let history = null;
      try {
        const file = await Filesystem.readFile({ path: HISTORY_FILE, directory: "DATA", encoding: "utf8" });
        history = typeof file?.data === "string" ? file.data : null;
      } catch (error) {
        history = null;   // no file yet
      }
      return { settings: settingsRaw ? JSON.parse(settingsRaw) : null, history };
    }
    const settings = await idbGet(SETTINGS_RECORD);
    const history = await idbGet(HISTORY_KEY);
    return { settings: settings || null, history: typeof history === "string" ? history : null };
  }

  async function writeCopy({ settings, history }) {
    if (state.backend === "none") return;
    if (useNative) {
      await Preferences.set({ key: SETTINGS_RECORD, value: JSON.stringify(settings) });
      await Filesystem.writeFile({ path: HISTORY_FILE, directory: "DATA", data: history || "[]", encoding: "utf8", recursive: true });
      return;
    }
    await idbSet(SETTINGS_RECORD, settings);
    await idbSet(HISTORY_KEY, history || "[]");
  }

  /* ---------------- what to copy ---------------- */

  function snapshot() {
    const settings = {};
    let history = null;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      if (key === HISTORY_KEY) history = localStorage.getItem(key);
      else settings[key] = localStorage.getItem(key);
    }
    return { settings, history };
  }

  let timer = null;
  let clearedHere = false;          // localStorage.clear() was called by this page
  let restorePromise = Promise.resolve(false);
  let reloading = false;
  function scheduleSync() {
    if (state.backend === "none") return;
    state.pending = true;
    clearTimeout(timer);
    timer = setTimeout(syncNow, DEBOUNCE_MS);
  }

  async function syncNow() {
    clearTimeout(timer);
    state.pending = false;
    // Never before the restore check has finished (the app writes its
    // defaults at once, and they must not overwrite the copy of real data),
    // and never when a restore is reloading the page.
    await restorePromise.catch(() => false);
    if (reloading) return state;
    const current = snapshot();
    // A snapshot with no crossing times and no history is an empty app. It
    // only replaces a copy when the page itself emptied the storage: a wiped
    // web view must not wipe its own backup.
    // A phone with several students (build 20) is never empty: a new student
    // starts with no times and no history, and must still be saved.
    const empty = !current.settings["om-full-time"] && !current.settings["om-clear-time"] && (!current.history || current.history === "[]") && !current.settings["om-students"];
    if (empty && !clearedHere) {
      try {
        const copy = await readCopy();
        const copyHasData = (copy.settings && Object.keys(copy.settings).length) || (copy.history && copy.history !== "[]");
        if (copyHasData) return state;
      } catch (error) { /* fall through and write */ }
    }
    try {
      await writeCopy(current);
      state.lastSavedAt = Date.now();
      state.lastError = "";
      state.writes += 1;
    } catch (error) {
      state.lastError = String(error?.message || error);
    }
    return state;
  }

  /* ---------------- mirror every write ---------------- */

  const proto = Storage.prototype;
  const originalSet = proto.setItem;
  const originalRemove = proto.removeItem;
  const originalClear = proto.clear;
  proto.setItem = function setItem(key, value) {
    originalSet.call(this, key, value);
    if (this === window.localStorage && String(key).startsWith(PREFIX)) scheduleSync();
  };
  proto.removeItem = function removeItem(key) {
    originalRemove.call(this, key);
    if (this === window.localStorage && String(key).startsWith(PREFIX)) scheduleSync();
  };
  proto.clear = function clear() {
    originalClear.call(this);
    if (this === window.localStorage) {
      // An intentional wipe (a test, a reset) must not come back from the copy
      // on the next load, even if the copy was not rewritten in time.
      clearedHere = true;
      try { sessionStorage.setItem(CLEARED_FLAG, "1"); } catch (error) { /* no session storage */ }
      scheduleSync();
    }
  };
  window.addEventListener("pagehide", () => { if (state.pending) syncNow(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state.pending) syncNow(); });

  /* ---------------- restore at start ---------------- */

  async function restoreIfNeeded() {
    if (state.backend === "none") return false;
    try {
      if (sessionStorage.getItem(CLEARED_FLAG) === "1") {
        sessionStorage.removeItem(CLEARED_FLAG);
        return false;
      }
    } catch (error) { /* no session storage */ }
    let copy;
    try {
      copy = await readCopy();
    } catch (error) {
      state.lastError = String(error?.message || error);
      return false;
    }
    const copyHasData = (copy.settings && Object.keys(copy.settings).length) || (copy.history && copy.history !== "[]");
    if (!copyHasData) return false;
    // Only when the web storage has lost the app's data: never overwrite a
    // value that is there. By the time this runs the app has already written
    // its own defaults (a settings version, say), so "lost" means the keys
    // that matter are gone: the crossing times and the history.
    const historyMissing = !localStorage.getItem(HISTORY_KEY) && copy.history && copy.history !== "[]";
    const settingsMissing = !localStorage.getItem("om-full-time") && !localStorage.getItem("om-clear-time") && !localStorage.getItem(HISTORY_KEY) && !localStorage.getItem("om-students");
    if (!historyMissing && !settingsMissing) return false;
    let restoredSomething = false;
    if (settingsMissing && copy.settings) {
      Object.entries(copy.settings).forEach(([key, value]) => {
        if (localStorage.getItem(key) === null) { originalSet.call(localStorage, key, value); restoredSomething = true; }
      });
    }
    if (historyMissing) {
      originalSet.call(localStorage, HISTORY_KEY, copy.history);
      restoredSomething = true;
    }
    if (!restoredSomething) return false;
    state.restored = true;
    // The rest of the app has already read localStorage by now: start once
    // more with the data in place. The flag stops a loop.
    try {
      if (sessionStorage.getItem(RESTORED_FLAG) !== "1") {
        sessionStorage.setItem(RESTORED_FLAG, "1");
        reloading = true;
        clearTimeout(timer);
        window.location.reload();
      }
    } catch (error) { /* no session storage: carry on */ }
    return true;
  }

  async function requestPersistence() {
    try {
      if (!useNative && navigator.storage?.persist) {
        state.persisted = await navigator.storage.persist();
      }
    } catch (error) {
      state.persisted = null;
    }
  }

  /* What Help shows under About, and what the tests read. */
  window.gsStore = {
    status: () => ({ ...state }),
    syncNow,
    restoreIfNeeded,
    /* Delete all my practice history (tracker 14.4): the emptied history is
     * written to the copy now, not after the wait, and the copy is never
     * restored over it on the next load. Settings stay in the copy. */
    clearHistoryNow() {
      clearedHere = true;
      try { sessionStorage.setItem(CLEARED_FLAG, "1"); } catch (error) { /* no session storage */ }
      return syncNow();
    },
    /* Switching or removing a student (build 20): the new state goes to the
     * copy now, before the app starts again, and is never replaced by the
     * old copy on the next load. */
    commitNow() {
      clearedHere = true;
      try { sessionStorage.setItem(CLEARED_FLAG, "1"); } catch (error) { /* no session storage */ }
      return syncNow();
    },
    /* Tests only: the web view's storage vanishes behind the app's back, as
     * when the phone reclaims it. Not an intentional clear. */
    simulateLoss() {
      originalClear.call(localStorage);
      try { sessionStorage.removeItem(CLEARED_FLAG); sessionStorage.removeItem(RESTORED_FLAG); } catch (error) { /* ignore */ }
    },
    describe() {
      const where = state.backend === "native" ? "the phone's own storage" : state.backend === "indexeddb" ? "the browser's database" : "this page only";
      const when = state.lastSavedAt ? ` Last saved ${new Date(state.lastSavedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.` : "";
      const persist = state.backend === "indexeddb" && state.persisted === false ? " The browser has not promised to keep it: adding the app to the Home Screen helps." : "";
      return `Backup copy: ${where}.${when}${persist}`;
    }
  };

  requestPersistence();
  restorePromise = restoreIfNeeded();
  restorePromise.then((restored) => {
    // The first copy (and the one-time migration) happens here.
    if (!restored) scheduleSync();
  }).catch(() => {});
})();

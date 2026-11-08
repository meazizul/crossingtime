    /* ============================================================
     * LocalStorage keys (all prefixed om-):
     *   om-clear-time, om-full-time, om-margin, om-mode,
     *   om-replay-use-confirm, om-debug-replay,
     *   om-feedback-acceptable, om-feedback-outside,
     *   om-a11y-output-mode, om-a11y-show-banner, om-a11y-flash-action,
     *   om-a11y-vibrate, om-a11y-use-text-labels, om-a11y-theme,
     *   om-a11y-text-size, om-a11y-high-contrast, om-a11y-focus-boost,
     *   om-a11y-announce-cues, (om-a11y-sync-visual-replay until build 19),
     *   om-a11y-outside-visual-variant, om-a11y-user-flash-contrast,
     *   om-a11y-say-replay, om-a11y-describe-sounds (build 15),
     *   om-a11y-verbosity (build 20)
     * Cue types: start, marker, replay_start, replay_end,
     *            validation_error, reference_ok, reference_bad
     * ============================================================ */

    const appMain = document.getElementById("appMain");
    const actionBtn = document.getElementById("actionBtn");
    const actionBtnLabel = actionBtn.querySelector(".action-btn-label");
    const actionBtnIndicator = document.getElementById("actionBtnIndicator");
    const actionBtnHint = document.getElementById("actionBtnHint");
    const markersEl = document.getElementById("markers");
    const debugText = document.getElementById("debugText");
    const modeInputs = [...document.querySelectorAll("input[name='mode']")];
    const timingRequiredPrompt = document.getElementById("timingRequiredPrompt");
    const timingRequiredPromptText = document.getElementById("timingRequiredPromptText");
    const timingRequiredPromptButton = document.getElementById("timingRequiredPromptButton");
    const settingsTrigger = document.getElementById("settingsTrigger");
    const settingsModal = document.getElementById("settingsModal");
    const closeSettings = document.getElementById("closeSettings");
    const a11yTrigger = document.getElementById("a11yTrigger");
    const a11yModal = document.getElementById("a11yModal");
    const closeA11y = document.getElementById("closeA11y");
    const settingsTitle = document.getElementById("settingsTitle");
    const a11yTitle = document.getElementById("a11yTitle");
    const cueBanner = document.getElementById("cueBanner");
    const cueBannerText = document.getElementById("cueBannerText");
    const srAnnouncer = document.getElementById("srAnnouncer");
    const outputModeInputs = [...document.querySelectorAll("input[name='a11yOutputMode']")];
    const a11yShowBanner = document.getElementById("a11yShowBanner");
    const a11yFlashAction = document.getElementById("a11yFlashAction");
    const a11yVibrate = document.getElementById("a11yVibrate");
    const a11yUseTextLabels = document.getElementById("a11yUseTextLabels");
    const a11yTheme = document.getElementById("a11yTheme");
    const a11yTextSize = document.getElementById("a11yTextSize");
    const textSizeLandscapeHint = document.getElementById("textSizeLandscapeHint");
    const a11yHighContrast = document.getElementById("a11yHighContrast");
    const a11yFocusBoost = document.getElementById("a11yFocusBoost");
    const a11yAnnounceCues = document.getElementById("a11yAnnounceCues");
    const a11ySelfVoice = document.getElementById("a11ySelfVoice");
    const a11ySayReplay = document.getElementById("a11ySayReplay");
    const a11yVerbosity = document.getElementById("a11yVerbosity");
    const a11yDescribeSounds = document.getElementById("a11yDescribeSounds");
    const a11ySpeechRate = document.getElementById("a11ySpeechRate");
    const soundTestBtn = document.getElementById("soundTestBtn");
    const soundTestNote = document.getElementById("soundTestNote");
    const textSetupBtn = document.getElementById("textSetupBtn");
    const hapticsTestBtn = document.getElementById("hapticsTestBtn");
    const hapticsSupportNote = document.getElementById("hapticsSupportNote");
    const previewUserSoundBtn = document.getElementById("previewUserSound");
    const replayUsesConfirm = document.getElementById("replayUsesConfirm");
    const debugToggle = document.getElementById("debugToggle");
    const shareTimingSettingsBtn = document.getElementById("shareTimingSettings");
    const setupTimingMessage = document.getElementById("setupTimingMessage");
    const practiceTimingMessage = document.getElementById("practiceTimingMessage");
    const copySetupTimingMessageBtn = document.getElementById("copySetupTimingMessage");
    const copyPracticeTimingMessageBtn = document.getElementById("copyPracticeTimingMessage");
    const clearTimeInput = document.getElementById("clearTime");
    const fullTimeInput = document.getElementById("fullTime");
    const marginInput = document.getElementById("marginInput");
    const instructorEmailInput = document.getElementById("instructorEmail");
    const instructorPhoneInput = document.getElementById("instructorPhone");
    const clientCodeInput = document.getElementById("clientCode");
    const numberInputs = [...document.querySelectorAll("input[type='number']")];
    const acceptableInputs = [...document.querySelectorAll("input[name='acceptableSound']")];
    const outsideInputs = [...document.querySelectorAll("input[name='outsideSound']")];
    const previewButtons = [...document.querySelectorAll(".preview-btn")];
    const exemplarButtons = [...document.querySelectorAll(".exemplar-btn")];
    const visualPreviewButtons = [...document.querySelectorAll(".visual-preview-btn")];
    const outsideVisualVariantInputs = [...document.querySelectorAll("input[name='outsideVisualVariant']")];
    const userFlashContrastInputs = [...document.querySelectorAll("input[name='userFlashContrast']")];
    const visualReplayOverlay = document.getElementById("visualReplayOverlay");
    const visualReplayFlash = document.getElementById("visualReplayFlash");
    const visualReplayShape = document.getElementById("visualReplayShape");
    const settingsVisualPreview = document.getElementById("settingsVisualPreview");
    const settingsVisualPreviewFlash = document.getElementById("settingsVisualPreviewFlash");
    const settingsVisualPreviewShape = document.getElementById("settingsVisualPreviewShape");

    const setupControls = [
      settingsTrigger,
      previewUserSoundBtn,
      clearTimeInput,
      fullTimeInput,
      marginInput,
      instructorEmailInput,
      instructorPhoneInput,
      clientCodeInput,
      replayUsesConfirm,
      debugToggle,
      shareTimingSettingsBtn,
      textSetupBtn,
      copySetupTimingMessageBtn,
      copyPracticeTimingMessageBtn,
      ...acceptableInputs,
      ...outsideInputs,
      ...previewButtons,
      ...visualPreviewButtons,
      ...outsideVisualVariantInputs,
      ...userFlashContrastInputs,
      ...exemplarButtons
    ].filter(Boolean);

    const a11yControls = [
      a11yTrigger,
      a11yShowBanner,
      a11yFlashAction,
      a11yVibrate,
      a11yUseTextLabels,
      a11yTheme,
      a11yTextSize,
      a11yHighContrast,
      a11yFocusBoost,
      a11yAnnounceCues,
      a11ySelfVoice,
      a11ySayReplay,
      a11yDescribeSounds,
      a11ySpeechRate,
      soundTestBtn,
      hapticsTestBtn,
      ...outputModeInputs
    ].filter(Boolean);

    const modes = {
      "2": { labels: ["Start", "Finish"] },
      "2b": { labels: ["Start", "Halfway"] },
      "3": { labels: ["Start", "Halfway", "Finish"] }
    };

    let audioContext;
    let masterLimiter;
    let markerTimes = [];
    let currentMode = "2b";
    let stage = 0;
    let started = false;
    let replayTimeout;
    let practiceReplayToken = 0;   // build 25: a new try or Back cancels a replay still waiting for "Replay"
    let exemplarTimeout;
    let exemplarVisualTimeouts = [];
    let replayUsesConfirmTone = false;
    let showDebug = false;
    let suppressSrAnnouncements = false;
    let pendingStatusMessage = "";
    let lastDialogTrigger = null;
    let lockedScrollY = 0;
    let flashTimeout;
    let startTimestamp = 0;

    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const VISUAL_PULSE_SEC = 0.2;
    const VISUAL_REPLAY_PRE_DELAY_SEC = 0.5; // screen stays normal this long before going black
    const VISUAL_USER_FLASH_COLORS = {
      soft: "#8c8c8c",
      balanced: "#bcbcbc",
      high: "#e6e6e6"
    };

    const visualReplayState = {
      rafId: null,
      nextIndex: 0,
      events: [],
      endAtSec: 0,
      replayStartTime: 0,
      userFlashUntilSec: 0,
      referenceUntilSec: 0,
      sampleUntilSec: 0,
      currentReferenceType: null,
      target: null
    };

    const a11ySettings = {
      outputMode: "audio-only",
      showBanner: true,
      flashAction: false,
      // On by default (10 Oct 2026): vibration is the whole interface for a
      // DeafBlind user and the user asked that nobody should have to find the
      // switch. A stored "false" from an explicit opt-out still wins.
      vibrate: true,
      useTextLabels: true,
      syncVisualReplay: true,
      outsideVisualVariant: "up",
      userFlashContrast: "soft",
      theme: "system",
      textSize: "default",
      highContrast: false,
      focusBoost: false,
      announceCues: true,
      // Self-voicing (build 7): the app speaks its own directions for
      // students who are still learning VoiceOver or TalkBack. Off by default
      // so it never doubles up with a screen reader.
      selfVoice: false,
      // Build 15 (Jonggi's test of build 14, 25 Oct 2026): the word "Replay"
      // before every replay, and a plain-words description after the
      // right-or-wrong sound and after each replay, for everyone, whether or
      // not a screen reader is running. Never a number of seconds.
      sayReplay: true,
      describeSounds: true,
      verbosity: "medium",
      speechRate: 1
    };

    /*
     * One-time settings migrations, keyed by build. Build 7: vibration must be
     * on for everyone. Older builds could leave a stored "false" behind (the
     * switch defaulted off before build 4), which silently kept haptics off
     * for testers who never touched it. Clear it once; a student who turns
     * vibration off again from build 7 on keeps that choice.
     */
    const GS_SETTINGS_VERSION_KEY = "om-settings-version";
    const GS_SETTINGS_VERSION = 7;
    (function migrateStoredSettings() {
      try {
        const stored = Number(localStorage.getItem(GS_SETTINGS_VERSION_KEY) || 0);
        if (stored < 7) localStorage.removeItem("om-a11y-vibrate");
        if (stored < GS_SETTINGS_VERSION) localStorage.setItem(GS_SETTINGS_VERSION_KEY, String(GS_SETTINGS_VERSION));
      } catch (error) {
        /* storage unavailable: defaults apply */
      }
    })();

    /* ============================================================
     * NATIVE HAPTICS BRIDGE
     * navigator.vibrate() does not exist in Safari/WKWebView on iOS —
     * Apple has never implemented the Vibration API. Inside the
     * Capacitor shell we reach the real Taptic Engine instead; on the
     * web we fall back to navigator.vibrate (Android) and degrade to
     * nothing on iOS Safari.
     * ============================================================ */
    const CapacitorGlobal = window.Capacitor;
    const isNativeShell = Boolean(CapacitorGlobal?.isNativePlatform?.());
    const nativePlatform = isNativeShell ? (CapacitorGlobal.getPlatform?.() || "") : "web";
    const HapticsPlugin = CapacitorGlobal?.Plugins?.Haptics;
    // CrossingTime's own native plugin (iOS, build 7+): one long-lived Core
    // Haptics engine that plays haptics only and never touches the audio
    // session. The stock plugin built a new engine for every long buzz and let
    // it be freed at once, and its engine shared the audio session with the
    // web view's sound.
    const GSNativePlugin = CapacitorGlobal?.Plugins?.GSNative;
    const hasWebVibrate = typeof navigator.vibrate === "function";

    // Lengths raised in build 9: testers found the short ticks too faint.
    const WEB_VIBRATION_PATTERNS = {
      start: [60],
      // Two knocks = "get ready, the clock is armed".
      ready: [50, 90, 50],
      // One knock = "this is you".
      marker: [100],
      // Three knocks = within the margin.
      reference_ok: [70, 90, 70, 90, 70],
      // One long buzz = outside the margin. Deliberately several times
      // longer than anything else so it cannot be mistaken by touch alone.
      reference_bad: [550]
    };

    // [start ms, length ms] for each vibration in the Android app.
    const ANDROID_VIBRATION_PULSES = {
      start: [[0, 60]],
      ready: [[0, 50], [140, 50]],
      marker: [[0, 100]],
      reference_ok: [[0, 70], [160, 70], [320, 70]],
      reference_bad: [[0, 550]]
    };

    function hapticsAvailable() {
      return (isNativeShell && Boolean(GSNativePlugin || HapticsPlugin)) || hasWebVibrate;
    }

    /*
     * Inside the native shell a double tap zoomed the web view and there was
     * no way back short of relaunching. WKWebView, unlike Safari, honors
     * user-scalable=no, so the viewport is locked there. On the web the meta
     * tag is left alone: browsers need pinch-zoom for accessibility, and the
     * app's own text-size setting goes to 300%. touch-action: manipulation in
     * the stylesheet removes double-tap zoom everywhere without touching
     * pinch.
     */
    /*
     * Pinch zoom stays on in the phone apps too (bug 37, Oct 2026 review): many
     * low-vision students rely on it. Double-tap zoom, which trapped the
     * shell in a zoomed state, stays off through touch-action: manipulation
     * in the stylesheet. The Direct Touch area follows the zoom.
     */

    function describeHapticsSupport() {
      if (isNativeShell && GSNativePlugin) {
        return "Native haptics active. If you feel nothing, check iPhone Settings, Accessibility, Touch, Vibration, and Settings, Sounds and Haptics, System Haptics.";
      }
      if (isNativeShell && HapticsPlugin) {
        return nativePlatform === "android"
          ? "Native vibration active. If you feel nothing, check that vibration is on in your phone's sound settings."
          : "Native haptics active.";
      }
      if (hasWebVibrate) {
        return "Web vibration available. Patterns are coarse on/off only (typical on Android browsers).";
      }
      return "No haptics on this browser. iOS Safari has never supported web vibration — install the native app build to feel cues.";
    }

    function hapticCue(type) {
      if (!a11ySettings.vibrate) return;
      if (isNativeShell && GSNativePlugin) {
        // Patterns live in the native plugin (GSNativePlugin.swift) so each
        // one plays as a single Core Haptics pattern with exact spacing.
        const known = ["start", "ready", "marker", "reference_ok", "reference_bad"];
        if (known.includes(type)) {
          try {
            const result = GSNativePlugin.haptic({ type });
            if (result && typeof result.catch === "function") result.catch(() => {});
          } catch (error) {
            /* non-fatal */
          }
        }
        return;
      }
      if (isNativeShell && HapticsPlugin) {
        try {
          // iOS's "notification" haptics are deliberately subtle, and MEDIUM
          // impacts barely register through fabric. These are tuned for a
          // hand in a pocket or holding a cane, not a palm in a quiet room.
          if (nativePlatform === "android") {
            // Android: impact() is a click too short to feel through a
            // pocket. Timed vibrations instead, same rhythms as the iPhone.
            const pulses = ANDROID_VIBRATION_PULSES[type] || [];
            pulses.forEach(([atMs, lengthMs]) => {
              setTimeout(() => HapticsPlugin.vibrate({ duration: lengthMs }), atMs);
            });
            return;
          }
          if (type === "reference_bad") {
            // One long, full-intensity buzz via Core Haptics: the plugin's
            // vibrate(duration) runs a continuous event at intensity 1.0.
            // Several times longer than anything else, so it cannot be
            // mistaken by touch alone.
            HapticsPlugin.vibrate({ duration: 450 });
          } else if (type === "reference_ok") {
            // Three heavy knocks, spaced so they read as a rhythm, not a lump.
            HapticsPlugin.impact({ style: "HEAVY" });
            setTimeout(() => HapticsPlugin.impact({ style: "HEAVY" }), 110);
            setTimeout(() => HapticsPlugin.impact({ style: "HEAVY" }), 220);
          } else if (type === "marker") {
            HapticsPlugin.impact({ style: "HEAVY" });
          } else if (type === "start") {
            HapticsPlugin.impact({ style: "MEDIUM" });
          } else if (type === "ready") {
            HapticsPlugin.impact({ style: "LIGHT" });
            setTimeout(() => HapticsPlugin.impact({ style: "LIGHT" }), 95);
          }
          return;
        } catch (error) {
          /* fall through to the web path */
        }
      }
      if (hasWebVibrate) {
        const pattern = WEB_VIBRATION_PATTERNS[type];
        if (pattern) navigator.vibrate(pattern);
      }
    }

    /* ---------------- Layout / viewport ---------------- */
    function lockPageScroll() {
      lockedScrollY = window.scrollY;
      document.body.classList.add("dialog-open");
      document.body.style.top = `-${lockedScrollY}px`;
    }

    function unlockPageScroll() {
      document.body.classList.remove("dialog-open");
      document.body.style.top = "";
      window.scrollTo(0, lockedScrollY);
    }

    function syncViewportHeight() {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--viewport-height", `${viewportHeight}px`);
      applyLayoutMode();
    }

    function setMainContentInert(isInert) {
      appMain.inert = isInert;
      if (isInert) {
        appMain.setAttribute("aria-hidden", "true");
        return;
      }
      appMain.removeAttribute("aria-hidden");
    }

    function applyLayoutMode() {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const coarsePointer = window.matchMedia("(any-pointer: coarse)").matches || navigator.maxTouchPoints > 0;
      const largeTextLayout = ["largest", "huge", "xl", "xxl", "max"].includes(a11ySettings.textSize);
      const phoneSafeLayout = coarsePointer || viewportWidth <= 430 || viewportHeight <= 500 || largeTextLayout;
      document.body.classList.toggle("phone-safe-layout", phoneSafeLayout);
      document.body.classList.toggle("short-screen-layout", viewportHeight <= 500);
      document.body.classList.toggle("large-text-layout", largeTextLayout);
      document.body.classList.toggle("landscape-layout", viewportWidth > viewportHeight);
    }

    function syncCueBannerVisibility() {
      const hasMessage = Boolean(cueBannerText.textContent.trim());
      cueBanner.dataset.visible = String(a11ySettings.showBanner && hasMessage);
    }

    /* ---------------- Audio ---------------- */
    /*
     * The student's own sound ("this is me") was a 410 Hz beep, which sat
     * between the default sample's two layers (392 and 466 Hz) and merged
     * with it into one chord (Cindi, tracker 12.34). It is now a short, bright
     * two-partial tone at 1047 Hz (C6), well above every sample pitch and its
     * upper layer (165 to 622 Hz) and above the chimes (523 to 823 Hz), and
     * the steady sound dips for the moment it plays (gsDuckSteadyAround).
     */
    const tones = {
      confirm: { base: 350, harmonic: 700 },
      user: { base: 1047, harmonic: 1570 }
    };

    /*
     * ============================================================
     * SOUND / TIMING TUNING GUIDE (edit here, no code changes needed)
     * ============================================================
     *
     * 1) TEST_TUNING: timing and loudness controls
     * ------------------------------------------------------------
     * replayLeadInSec    delay before replay starts. Typical 0.4-1.2 s.
     * exemplarLeadInSec  delay before exemplar playback. Typical 0.3-0.8 s.
     * replayEndPadSec /
     * exemplarEndPadSec  extra time after the final cue before reset.
     *                    Typical 0.8-1.5 s.
     *
     * masterVolume       scales all sounds. Typical 0.7-1.0.
     * userVolume         scales the user marker tone. Typical 0.8-1.0.
     * feedbackVolume     scales acceptable/outside cues. Typical 0.8-1.0.
     * confirmVolume      scales the button chime. Typical 0.6-1.0 — keep
     *                    below feedbackVolume so the cues stand out.
     *
     * Presets are normalized so 1 plays at (near) full scale. Values above
     * 1 hit the master limiter: no distortion, but no extra loudness
     * either. Stay at or below 1.
     *
     * visualPreviewTimingMs  Settings-preview timing for the visual samples.
     *                    enter/visible/exit in ms. Typical 250-600.
     *
     * 2) SOUND_PRESET_LIBRARY: named tone families
     * ------------------------------------------------------------
     * Each preset has a duration (seconds, before the release tail) and
     * partials (freq + gain layers that shape the timbre).
     * Easiest path for non-musicians:
     *   A) pick a different preset name in SOUND_FALLBACK_TONES
     *   B) then tweak gainScale / durationScale in presetTone(...)
     *
     * 3) SOUND_FALLBACK_TONES: assign presets to roles
     * ------------------------------------------------------------
     * acceptable-a / acceptable-b   within-margin feedback options
     * outside-a / outside-b         outside-margin feedback options
     * user-marker                   replay marker tone (default)
     * user-confirm                  optional replay alternative
     *
     * 4) presetTone(...) options
     * ------------------------------------------------------------
     * transposeSemitones  pitch shift; +12 = one octave up. Typical -3..+3.
     * gainScale           multiplier for partial gains. Typical 0.8-1.3.
     * durationScale       multiplier for duration. Typical 0.8-1.4.
     */
    const TEST_TUNING = {
      replayLeadInSec: 1.5,
      exemplarLeadInSec: 0.5,
      replayEndPadSec: 1.2,
      exemplarEndPadSec: 0.9,
      masterVolume: 1,
      userVolume: 1,
      feedbackVolume: 1,
      confirmVolume: 0.8,
      visualPreviewTimingMs: {
        userEnter: 500,
        userVisible: 280,
        userExit: 500,
        shapeEnter: 500,
        shapeVisible: 280,
        shapeExit: 500
      }
    };

    // Gain budget: keep the SUM of a preset's partial gains at or below ~0.8.
    // That leaves headroom for a user marker and a feedback cue landing at the
    // same moment during replay (the accurate case); the master limiter
    // catches anything beyond it.
    const SOUND_PRESET_LIBRARY = {
      // "Acceptable" cues: short, pure, high two-note chimes.
      chime_soft: {
        duration: 0.12,
        partials: [{ freq: 659, gain: 0.55 }, { freq: 823, gain: 0.25 }]
      },
      chime_bright: {
        duration: 0.12,
        partials: [{ freq: 523, gain: 0.55 }, { freq: 659, gain: 0.25 }]
      },
      // "Outside" cues: longer, rough, buzzing pulses. Two closely spaced
      // frequencies beat against each other (harsh texture), pitched near
      // ~300-350 Hz — dark next to the chimes, but high enough for a phone
      // speaker to actually reproduce (240-260 Hz fell below small-speaker
      // response and was partly lost in the speaker itself).
      pulse_low: {
        duration: 0.3,
        partials: [{ freq: 330, gain: 0.42 }, { freq: 349, gain: 0.38 }]
      },
      pulse_dull: {
        duration: 0.3,
        partials: [{ freq: 294, gain: 0.42 }, { freq: 311, gain: 0.38 }]
      },
      marker_tone: {
        duration: 0.14,
        partials: [{ freq: tones.user.base, gain: 0.6 }, { freq: tones.user.harmonic, gain: 0.22 }]
      },
      // Neutral reference tick: marks "this is the real crossing time" in the
      // comparison replays. Played as two very short blips so it is told apart
      // by rhythm from the single marker tone and from the feedback cues. It
      // must never be the "acceptable" chime, which means "you were close".
      reference_tick: {
        duration: 0.05,
        partials: [{ freq: 494, gain: 0.5 }, { freq: 988, gain: 0.18 }]
      },
      confirm_chime: {
        duration: 0.18,
        partials: [{ freq: tones.confirm.base, gain: 0.5 }, { freq: tones.confirm.harmonic, gain: 0.22 }]
      }
    };

    function presetTone(name, options = {}) {
      const base = SOUND_PRESET_LIBRARY[name] || SOUND_PRESET_LIBRARY.marker_tone;
      const transposeSemitones = Number(options.transposeSemitones || 0);
      const transpose = Math.pow(2, transposeSemitones / 12);
      const gainScale = Number(options.gainScale || 1);
      const durationScale = Number(options.durationScale || 1);
      return {
        duration: base.duration * durationScale,
        partials: base.partials.map((partial) => ({
          freq: partial.freq * transpose,
          gain: partial.gain * gainScale
        }))
      };
    }

    const SOUND_FALLBACK_TONES = {
      "acceptable-a": presetTone("chime_soft"),
      "acceptable-b": presetTone("chime_bright"),
      "outside-a": presetTone("pulse_low"),
      "outside-b": presetTone("pulse_dull"),
      "user-marker": presetTone("marker_tone"),
      "user-confirm": presetTone("confirm_chime"),
      "reference-tick": presetTone("reference_tick")
    };

    const feedbackOptions = {
      acceptable: {
        "acceptable-a": {
          label: "Chime A",
          duration: SOUND_FALLBACK_TONES["acceptable-a"].duration,
          partials: SOUND_FALLBACK_TONES["acceptable-a"].partials
        },
        "acceptable-b": {
          label: "Chime B",
          duration: SOUND_FALLBACK_TONES["acceptable-b"].duration,
          partials: SOUND_FALLBACK_TONES["acceptable-b"].partials
        }
      },
      outside: {
        "outside-a": {
          label: "Low Pulse A",
          duration: SOUND_FALLBACK_TONES["outside-a"].duration,
          partials: SOUND_FALLBACK_TONES["outside-a"].partials
        },
        "outside-b": {
          label: "Low Pulse B",
          duration: SOUND_FALLBACK_TONES["outside-b"].duration,
          partials: SOUND_FALLBACK_TONES["outside-b"].partials
        }
      }
    };

    const userSoundOptions = {
      marker: {
        duration: SOUND_FALLBACK_TONES["user-marker"].duration,
        partials: SOUND_FALLBACK_TONES["user-marker"].partials
      },
      confirm: {
        duration: SOUND_FALLBACK_TONES["user-confirm"].duration,
        partials: SOUND_FALLBACK_TONES["user-confirm"].partials
      }
    };

    let audioWarmedUp = false;

    /*
     * The first tone used to land late: the AudioContext is created suspended,
     * resume() is asynchronous, and the first tap's tone waited for it. So the
     * context is created at load, resumed on the very first touch (pointerdown
     * fires before click), and a silent buffer is played once to spin the
     * output up. By the time the click handler runs, the clock is live.
     */
    function warmUpAudio() {
      const context = ensureAudioContext();
      if (audioWarmedUp || nativeSound) return;
      try {
        const buffer = context.createBuffer(1, 1, context.sampleRate);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
        audioWarmedUp = true;
      } catch (error) {
        /* non-fatal: the next tone will still play */
      }
    }

    function softClipCurve(drive) {
      const points = 2049;
      const curve = new Float32Array(points);
      const norm = Math.tanh(drive);
      for (let i = 0; i < points; i += 1) {
        const x = (i / (points - 1)) * 2 - 1;
        curve[i] = Math.tanh(drive * x) / norm;
      }
      return curve;
    }

    /*
     * Native sound (iPhone app, build 9+). Inside the web view, WebKit owns
     * the Web Audio session and can fall back to the one the ring/silent
     * switch mutes; Cindi felt the cues but heard nothing. The app's own
     * player (GapSenseAudio.swift) plays through the app's playback session,
     * which the switch never mutes, so on iPhone every tone and spoken prompt
     * goes there. The web build and Android keep Web Audio.
     */
    const nativeSound = isNativeShell && nativePlatform === "ios" && typeof GSNativePlugin?.tone === "function";

    function nativeCall(method, args) {
      try {
        const result = GSNativePlugin[method](args);
        if (result && typeof result.catch === "function") result.catch(() => {});
        return result;
      } catch (error) {
        return null;
      }
    }

    /*
     * In the iPhone app no Web Audio is created at all: a running web audio
     * context lets WebKit change the app's audio session, which could put the
     * silent switch back in charge. Callers still get an object with a clock
     * (for the visual replays) and the output latency (for fair timing).
     */
    function nativeClock() {
      return {
        state: "running",
        get currentTime() { return performance.now() / 1000; },
        baseLatency: 0,
        outputLatency: nativeOutputLatency,
        resume: () => Promise.resolve(),
        addEventListener: () => {}
      };
    }
    let nativeOutputLatency = 0;

    function ensureAudioContext() {
      if (nativeSound) {
        if (!audioContext) audioContext = nativeClock();
        audioContext.outputLatency = nativeOutputLatency;
        return audioContext;
      }
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Safety limiter on the master output: individual cues are tuned to
        // pass through untouched, but overlapping cues (user marker + feedback
        // tone landing together during replay) are caught here instead of
        // hard-clipping into distortion.
        const limiter = audioContext.createDynamicsCompressor();
        limiter.threshold.value = -2;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.001;
        limiter.release.value = 0.05;
        limiter.connect(audioContext.destination);
        // Loudness: every cue goes through a soft clipper before the limiter.
        // Against build 8 the steady sample is about 7 dB louder and the
        // chimes about 5 dB, peaks stay just under full scale, and the added
        // overtones carry better on a phone speaker.
        // Testers found the sound too quiet at full phone volume. The iPhone
        // app does the same in GapSenseAudio.swift. `masterLimiter` is the
        // input every cue connects to.
        masterLimiter = audioContext.createWaveShaper();
        masterLimiter.curve = softClipCurve(3);
        masterLimiter.oversample = "2x";
        masterLimiter.connect(limiter);
        // iOS moves a context to "interrupted" (not "suspended") when
        // something else takes the audio hardware for a moment: a call, Siri,
        // another app, a haptic engine starting. The old check only resumed
        // "suspended", so after one interruption every later tone was
        // scheduled on a stopped clock and the app went silent until it was
        // relaunched. Resume from any state that is not running or closed.
        audioContext.addEventListener?.("statechange", () => {
          // The clock stopped while the app is on screen: a call, Siri, an
          // alarm or another app took the sound. A timed sample or replay
          // is cut (tracker 20.11).
          // A blip the resume below recovers at once is not counted.
          if (audioContext.state !== "running" && audioContext.state !== "closed" && !document.hidden) {
            setTimeout(() => {
              if (audioContext.state !== "running" && audioContext.state !== "closed" && !document.hidden) gsAudioInterrupted("web");
            }, 250);
          }
          if (audioContext.state === "interrupted") {
            audioContext.resume().catch(() => {});
          }
        });
      }
      if (audioContext.state !== "running" && audioContext.state !== "closed") {
        const pending = audioContext.resume();
        if (pending && typeof pending.catch === "function") pending.catch(() => {});
      }
      return audioContext;
    }

    /*
     * Tell WebKit this is a playback app (iOS 17+, Safari and the native web
     * view). Without it, Web Audio plays in the "ambient" category, which the
     * ringer switch mutes. Set in the installed app only: on a website it
     * would pause the person's own music.
     */
    function configureWebAudioSession() {
      if (!isNativeShell || nativeSound) return;
      try {
        if (navigator.audioSession && "type" in navigator.audioSession) {
          navigator.audioSession.type = "playback";
        }
      } catch (error) {
        /* older WebKit: AVAudioSession in the app delegate still applies */
      }
    }
    configureWebAudioSession();

    /*
     * envelope: "pulse" (default) is the short attack/release used by every
     * cue. "steady" holds one level from the first moment to the last, with
     * only a few milliseconds of ramp at each end to avoid clicks: the sample
     * warning time in the comparison tasks. Cindi: a student with
     * any hearing loss may not hear a sound while it is quiet, so the sample
     * must be "a single steady sound and able to be set at a high volume".
     * "rising" (quiet to loud, an earlier design) is kept for reference only.
     */
    /*
     * Every scheduled or sustained sound is remembered here so that leaving a
     * screen can silence it at once. Before build 10 a replay kept playing on
     * the Home screen for up to its full length after Back was pressed.
     */
    const scheduledSounds = [];
    const activeSustains = new Set();
    /* Steady sounds now playing or scheduled: { gain, level, startAt, endAt }. */
    const steadySounds = [];

    /*
     * Lower every steady sound under a short cue for as long as the cue lasts
     * (to 30%, with 15 ms ramps), so the student's own sound and the right or
     * wrong cue stay clean over the sample instead of melting into it
     * (tracker 12.34). The iPhone app does the same in its mixer.
     */
    const GS_DUCK_LEVEL = 0.3;
    function gsDuckSteadyAround(atSec, durationSec) {
      if (nativeSound || !audioContext) return;
      const from = atSec - 0.015;
      const until = atSec + durationSec + 0.05;
      for (let i = steadySounds.length - 1; i >= 0; i -= 1) {
        const s = steadySounds[i];
        if (s.endAt <= audioContext.currentTime) { steadySounds.splice(i, 1); continue; }
        if (until <= s.startAt + 0.02 || from >= s.endAt - 0.02) continue;
        const start = Math.max(from, s.startAt + 0.01);
        const end = Math.min(until, s.endAt - 0.02);
        if (end <= start) continue;
        try {
          s.gain.gain.setValueAtTime(s.level, start);
          s.gain.gain.linearRampToValueAtTime(s.level * GS_DUCK_LEVEL, start + 0.015);
          s.gain.gain.setValueAtTime(s.level * GS_DUCK_LEVEL, end);
          s.gain.gain.linearRampToValueAtTime(s.level, end + 0.07);
        } catch (error) { /* the sound ended */ }
      }
    }

    function rememberScheduledSound(entry) {
      const now = audioContext ? audioContext.currentTime : 0;
      for (let i = scheduledSounds.length - 1; i >= 0; i -= 1) {
        if (scheduledSounds[i].endAt < now) scheduledSounds.splice(i, 1);
      }
      scheduledSounds.push(entry);
    }

    /** Silence every tone now: scheduled cues, replays and the steady sample. */
    function stopAllSound() {
      steadySounds.length = 0;
      if (nativeSound) nativeCall("stopSound", {});
      activeSustains.forEach((stop) => { try { stop(); } catch (error) { /* already stopped */ } });
      activeSustains.clear();
      if (audioContext && !nativeSound) {
        const now = audioContext.currentTime;
        scheduledSounds.forEach(({ gain, oscillators }) => {
          try {
            gain.gain.cancelScheduledValues(0);
            gain.gain.setValueAtTime(0, now);
            oscillators.forEach((osc) => osc.stop(now));
          } catch (error) { /* already finished */ }
        });
      }
      scheduledSounds.length = 0;
    }

    function playCompositeTone(partials, duration = 0.16, startTime = 0, volumeScale = 1, envelope = "pulse") {
      if (a11ySettings.outputMode === "visual-only") return;
      if (nativeSound) {
        nativeCall("tone", {
          partials: partials.map((p) => ({ freq: p.freq, gain: p.gain })),
          duration,
          delay: Math.max(0, startTime),
          level: TEST_TUNING.masterVolume * volumeScale,
          envelope: envelope === "pulse" ? "pulse" : "steady"
        });
        return;
      }
      const context = ensureAudioContext();
      if (context.state !== "running" && !playCompositeTone.retrying) {
        // Suspended or interrupted: wait for the clock to run, then schedule
        // once. A second failure plays on whatever clock there is rather than
        // looping.
        context.resume().then(() => {
          playCompositeTone.retrying = true;
          try {
            playCompositeTone(partials, duration, startTime, volumeScale, envelope);
          } finally {
            playCompositeTone.retrying = false;
          }
        }).catch(() => {});
        return;
      }
      const now = context.currentTime + startTime;
      const gain = context.createGain();
      const attack = envelope === "steady" ? 0.006 : 0.01;
      const release = envelope === "pulse" ? 0.07 : 0.012;
      const outputLevel = TEST_TUNING.masterVolume * volumeScale;
      gain.gain.setValueAtTime(0, now);
      if (envelope === "rising") {
        gain.gain.linearRampToValueAtTime(outputLevel * 0.22, now + attack);
        gain.gain.linearRampToValueAtTime(outputLevel, now + duration);
      } else if (envelope === "steady") {
        gain.gain.linearRampToValueAtTime(outputLevel, now + attack);
        gain.gain.setValueAtTime(outputLevel, now + Math.max(attack, duration));
      } else {
        gain.gain.linearRampToValueAtTime(outputLevel, now + attack);
      }
      gain.gain.linearRampToValueAtTime(0, now + duration + release);
      const oscillators = partials.map((partial) => {
        const osc = context.createOscillator();
        osc.type = "sine";
        osc.frequency.value = partial.freq;
        const oscGain = context.createGain();
        oscGain.gain.setValueAtTime(partial.gain, now);
        osc.connect(oscGain).connect(gain);
        osc.start(now);
        osc.stop(now + duration + release + 0.02);
        return osc;
      });
      gain.connect(masterLimiter);
      rememberScheduledSound({ gain, oscillators, endAt: now + duration + release + 0.02 });
      if (envelope === "steady") {
        steadySounds.push({ gain, level: outputLevel, startAt: now, endAt: now + duration });
      } else {
        gsDuckSteadyAround(now, duration + release);
      }
    }

    /*
     * A steady tone with no set length: starts now, keeps going until the
     * returned stop() is called. Used by Comparison preparation, where the
     * sound plays until the student stops it. Returns a no-op stop in
     * visual-only mode so callers never need to check.
     */
    function startSustainedTone(partials, volumeScale = 1) {
      if (a11ySettings.outputMode === "visual-only") return () => {};
      if (nativeSound) {
        // The stop can be called before the id comes back; remember it.
        let stopRequested = false;
        let nativeId = null;
        const pending = nativeCall("sustainStart", {
          partials: partials.map((p) => ({ freq: p.freq, gain: p.gain })),
          level: TEST_TUNING.masterVolume * volumeScale
        });
        Promise.resolve(pending).then((result) => {
          nativeId = result?.id ?? null;
          if (stopRequested && nativeId !== null) nativeCall("sustainStop", { id: nativeId });
        }).catch(() => {});
        const stopNative = () => {
          if (stopRequested) return;
          stopRequested = true;
          activeSustains.delete(stopNative);
          if (nativeId !== null) nativeCall("sustainStop", { id: nativeId });
        };
        activeSustains.add(stopNative);
        return stopNative;
      }
      const context = ensureAudioContext();
      const now = context.currentTime;
      const gain = context.createGain();
      const level = TEST_TUNING.masterVolume * volumeScale;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(level, now + 0.006);
      const oscillators = partials.map((partial) => {
        const osc = context.createOscillator();
        osc.type = "sine";
        osc.frequency.value = partial.freq;
        const oscGain = context.createGain();
        oscGain.gain.setValueAtTime(partial.gain, now);
        osc.connect(oscGain).connect(gain);
        osc.start(now);
        return osc;
      });
      gain.connect(masterLimiter);
      let stopped = false;
      const stopWeb = () => {
        if (stopped) return;
        stopped = true;
        activeSustains.delete(stopWeb);
        const end = context.currentTime;
        try {
          gain.gain.cancelScheduledValues(end);
          gain.gain.setValueAtTime(gain.gain.value, end);
          gain.gain.linearRampToValueAtTime(0, end + 0.012);
          oscillators.forEach((osc) => osc.stop(end + 0.03));
        } catch (error) {
          /* already stopped */
        }
      };
      activeSustains.add(stopWeb);
      return stopWeb;
    }

    function playSoundOption(option, startTime = 0, volumeScale = 1) {
      if (!option) return;
      playCompositeTone(option.partials, option.duration || 0.12, startTime, volumeScale);
    }

    function playConfirmTone(startTime = 0) {
      playSoundOption(userSoundOptions.confirm, startTime, TEST_TUNING.confirmVolume);
    }

    function playUserMarkerTone(startTime = 0) {
      playSoundOption(userSoundOptions.marker, startTime, TEST_TUNING.userVolume);
    }

    /*
     * The student's own sound, the same when they tap and when that tap is
     * replayed (design: the student's sound marks the student's taps, and the
     * same sound marks them again in the replay; tracker 12.35). The marker
     * tone by default; the button chime if the student chose it in Settings.
     */
    function playStudentTone(startTime = 0) {
      if (replayUsesConfirmTone) playConfirmTone(startTime);
      else playUserMarkerTone(startTime);
    }

    /** Two quick blips: "this is the real crossing time". Never a feedback cue. */
    function playReferenceTick(startTime = 0) {
      const option = SOUND_FALLBACK_TONES["reference-tick"];
      playSoundOption(option, startTime, TEST_TUNING.feedbackVolume);
      playSoundOption(option, startTime + 0.11, TEST_TUNING.feedbackVolume);
    }

    function playFeedbackTone(type, startTime = 0) {
      const selection = getSelectedSound(type);
      const option = feedbackOptions[type][selection];
      playSoundOption(option, startTime, TEST_TUNING.feedbackVolume);
    }

    function getSelectionStorageKey(category) {
      return category === "acceptable" ? "om-feedback-acceptable" : "om-feedback-outside";
    }

    function getSelectedSound(category) {
      const key = getSelectionStorageKey(category);
      const inputs = category === "acceptable" ? acceptableInputs : outsideInputs;
      const stored = localStorage.getItem(key);
      const fallback = inputs.find((input) => input.value.endsWith("-a"))?.value || inputs[0]?.value;
      if (stored && feedbackOptions[category][stored]) {
        return stored;
      }
      return fallback;
    }

    function storeSelection(category, value) {
      localStorage.setItem(getSelectionStorageKey(category), value);
    }

    function applyStoredSelections() {
      const acceptableSelection = getSelectedSound("acceptable");
      const outsideSelection = getSelectedSound("outside");
      acceptableInputs.forEach((input) => {
        input.checked = input.value === acceptableSelection;
      });
      outsideInputs.forEach((input) => {
        input.checked = input.value === outsideSelection;
      });
      if (acceptableSelection) storeSelection("acceptable", acceptableSelection);
      if (outsideSelection) storeSelection("outside", outsideSelection);
    }

    /*
     * Busy, not disabled (tracker 12.27). While a try or a replay plays the
     * main button must stay focusable: a disabled control drops VoiceOver's
     * cursor to the first item on the screen, which is Back, after every
     * try. aria-disabled keeps the button where it is; each click handler
     * checks gsIsBusy and ignores the press.
     */
    function gsSetBusy(button, busy) {
      if (!button) return;
      button.setAttribute("aria-disabled", String(Boolean(busy)));
      button.classList.toggle("is-busy", Boolean(busy));
    }

    function gsIsBusy(button) {
      return Boolean(button) && button.getAttribute("aria-disabled") === "true";
    }

    /* ---------------- Setup / timing ---------------- */
    function lockSettings(lock) {
      setupControls.forEach((control) => { control.disabled = lock; });
      a11yControls.forEach((control) => { control.disabled = lock; });
    }

    function getTimingInputs() {
      return {
        clearTime: Number(clearTimeInput.value),
        fullTime: Number(fullTimeInput.value)
      };
    }

    function getMargin() {
      return Number(marginInput.value);
    }

    function normalizeTimingValue(value) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return "";
      return String(parsed);
    }

    function encodeBase64Url(value) {
      const bytes = new TextEncoder().encode(value);
      let binary = "";
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    function decodeBase64Url(value) {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }

    function computeShareChecksum(value) {
      let hash = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(36).padStart(7, "0").slice(0, 7);
    }

    /*
     * Identity in the share link and the report is a short code, never a name.
     * The link travels by plain email or text, so nothing in it may identify a
     * person. Letters and digits only, at most 8 characters.
     */
    const CLIENT_CODE_MAX = 8;
    const CLIENT_CODE_PATTERN = /^[A-Z0-9]{0,8}$/;
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function sanitizeClientCode(value) {
      return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CLIENT_CODE_MAX);
    }

    function isValidEmail(value) {
      return value === "" || (value.length <= 120 && EMAIL_PATTERN.test(value));
    }

    function getInstructorEmail() {
      return (instructorEmailInput?.value || "").trim();
    }

    /* Digits, plus, spaces, dashes, brackets, dots; at most 24 characters. */
    const PHONE_PATTERN = /^[+]?[0-9 ().-]{0,24}$/;
    function sanitizePhone(value) {
      return String(value || "").replace(/[^0-9+ ().-]/g, "").slice(0, 24).trim();
    }
    function isValidPhone(value) {
      return value === "" || (PHONE_PATTERN.test(value) && value.replace(/\D/g, "").length >= 7);
    }
    function getInstructorPhone() {
      return sanitizePhone(instructorPhoneInput?.value || "");
    }

    function getClientCode() {
      return sanitizeClientCode(clientCodeInput?.value || "");
    }

    /*
     * Single entry point for setting the reference times, whether from the
     * Settings form, an instructor's link, or the demo button. The demo flag
     * used to clear only on a manual input change, so times set any other way
     * left "Using example times" on screen.
     */
    function setReferenceTimes(clearValue, fullValue, marginValue, { source = "settings" } = {}) {
      clearTimeInput.value = clearValue;
      fullTimeInput.value = fullValue;
      if (marginValue !== undefined && marginValue !== "") marginInput.value = marginValue;
      localStorage.setItem("om-clear-time", clearTimeInput.value);
      localStorage.setItem("om-full-time", fullTimeInput.value);
      localStorage.setItem("om-margin", marginInput.value);
      if (source === "demo") {
        localStorage.setItem("om-demo-times", "true");
      } else {
        localStorage.removeItem("om-demo-times");
      }
      refreshTimingRequirementPrompt();
      updateNextPrompt();
      if (typeof gsRenderHome === "function") gsRenderHome();
      if (typeof gsRenderDemoNote === "function") gsRenderDemoNote();
    }

    /*
     * The public address of the web app. Links made inside the installed app
     * must point here, not at the app's own internal address
     * (capacitor://localhost on iOS, https://localhost on Android), which
     * means nothing on anyone else's phone.
     */
    const GS_PUBLIC_URL = "https://crossingtime.app/app/";
    const GS_APP_SCHEME = "gapsense";

    function shareBaseUrl() {
      if (isNativeShell || !/^https?:$/.test(window.location.protocol)) return new URL(GS_PUBLIC_URL);
      const url = new URL(window.location.href);
      url.search = "";
      url.hash = "";
      return url;
    }

    function shareIncludes() {
      return {
        times: document.getElementById("shareIncludeTimes")?.checked !== false,
        contact: document.getElementById("shareIncludeContact")?.checked !== false,
        features: document.getElementById("shareIncludeFeatures")?.checked !== false,
        lock: document.getElementById("shareIncludeLock")?.checked !== false
      };
    }

    /*
     * Setup link token.
     *   v1/v2  "clear|full|margin|email|code" (still imported)
     *   v3     JSON with any of: t (times: [clear, full, margin]),
     *          e (instructor email), k (student code), f (feature set),
     *          l (lock hash). "v3.payload.checksum" (still imported).
     *   4      the same JSON, but t holds numbers and f is a short code
     *          (see encodeLinkFeatures). "4" + payload + 7-character
     *          checksum, with no separators: a period in the middle of the
     *          link let Messages cut it short, and the v3 link ran to about
     *          600 characters, which carriers split across texts.
     * The payload is base64url (the email address must not show as an
     * address inside the link); the checksum is FNV, as before.
     */
    const SHARE_CHECKSUM_LENGTH = 7;

    /*
     * The feature set as one short string, for v4 links: one digit per
     * activity and per practice mode (1 on, 0 off), then one digit per
     * option, its position in LINK_FEATURE_CODES. These lists are part of the
     * link format: add new entries only at the end, never reorder. They are
     * kept here, not read from features.js, because a link is applied at
     * boot, before features.js has loaded (a test checks they agree).
     */
    const LINK_FEATURE_CODES = Object.freeze({
      activities: ["practice", "signal", "compare", "live"],
      practiceModes: ["2b", "2", "3"],
      options: [
        ["prepSound", ["continuous", "beep", "choose"]],
        ["compareSound", ["continuous", "ticks", "choose"]],
        ["compareSwipe", ["on", "off"]],
        ["compareRandomPause", ["on", "off", "choose"]],
        ["compareHowMuch", ["on", "off", "choose"]],
        ["magnitudeReplay", ["a", "b"]],
        ["liveSense", ["hearing", "vision", "choose"]],
        ["liveJudge", ["on", "off", "choose"]],
        ["liveHowMuch", ["on", "off", "choose"]],
        ["liveReplay", ["always", "errors", "never", "choose"]],
        ["liveConfirm", ["sound", "vibration"]],
        ["playAgain", ["on", "off", "choose"]],
        ["trafficSide", ["right", "left"]],
        ["sameRange", ["12", "8", "10", "11", "13", "14", "15", "20", "25"]]
      ]
    });

    function encodeLinkFeatures(features) {
      const codes = LINK_FEATURE_CODES;
      const bits = (group, ids) => ids.map((id) => (features?.[group]?.[id] === false ? "0" : "1")).join("");
      const options = codes.options.map(([key, values]) => {
        const index = values.indexOf(features?.options?.[key]);
        return String(Math.max(0, index));
      }).join("");
      return bits("activities", codes.activities) + bits("practiceModes", codes.practiceModes) + options;
    }

    /* Back to a feature object. Unknown or missing digits are left out, so
     * features.js fills them with its defaults. */
    function decodeLinkFeatures(code) {
      if (typeof code !== "string" || !/^\d{1,64}$/.test(code)) return null;
      const codes = LINK_FEATURE_CODES;
      const features = { activities: {}, practiceModes: {}, options: {} };
      let at = 0;
      codes.activities.forEach((id) => { if (at < code.length) features.activities[id] = code[at] !== "0"; at += 1; });
      codes.practiceModes.forEach((id) => { if (at < code.length) features.practiceModes[id] = code[at] !== "0"; at += 1; });
      codes.options.forEach(([key, values]) => {
        const value = values[Number(code[at])];
        if (at < code.length && value) features.options[key] = value;
        at += 1;
      });
      return features;
    }

    function buildShareTimingToken(includes = shareIncludes()) {
      const payload = {};
      if (includes.times) {
        payload.t = [
          Number(normalizeTimingValue(clearTimeInput.value)),
          Number(normalizeTimingValue(fullTimeInput.value)),
          Number(normalizeTimingValue(marginInput.value))
        ];
      }
      if (includes.contact) {
        const email = getInstructorEmail();
        const phone = getInstructorPhone();
        const code = getClientCode();
        if (email) payload.e = email;
        if (phone) payload.p = phone;
        if (code) payload.k = code;
      }
      if (includes.features && typeof gsLoadFeatures === "function") {
        payload.f = encodeLinkFeatures(gsLoadFeatures());
      }
      if (includes.lock && typeof gsPinHash === "function") {
        // The stored hash, never the code itself. On the student's phone it
        // locks Instructor setup until the instructor's code is entered.
        const hash = gsPinHash();
        if (hash) payload.l = hash;
      }
      const encodedPayload = encodeBase64Url(JSON.stringify(payload));
      return `4${encodedPayload}${computeShareChecksum(encodedPayload)}`;
    }

    /*
     * The token as it arrived, cleaned of what a messaging app or a copy and
     * paste can add: spaces or line breaks inside it, and punctuation after
     * it (a link at the end of a sentence picks up the full stop).
     */
    function cleanShareToken(token) {
      let raw = String(token || "");
      try { raw = decodeURIComponent(raw); } catch (error) { /* keep as is */ }
      raw = raw.replace(/\s+/g, "");
      if (/^v[123]\./.test(raw)) return raw.replace(/[^A-Za-z0-9_-]+$/, "");
      const match = raw.match(/^[A-Za-z0-9_-]+/);
      return match ? match[0] : "";
    }

    /* Split a token into [version, payload, checksum], or null. */
    function splitShareToken(token) {
      if (/^v[123]\./.test(token)) {
        const [version, encodedPayload, checksum] = token.split(".");
        return [version, encodedPayload, checksum];
      }
      if (token.startsWith("4") && token.length > 1 + SHARE_CHECKSUM_LENGTH) {
        return ["v4", token.slice(1, -SHARE_CHECKSUM_LENGTH), token.slice(-SHARE_CHECKSUM_LENGTH)];
      }
      return null;
    }

    function buildShareTimingLink(includes = shareIncludes()) {
      const url = shareBaseUrl();
      url.hash = `ts=${buildShareTimingToken(includes)}`;
      return url.toString();
    }

    function buildRegularSiteLink() {
      return shareBaseUrl().toString();
    }

    /* The link stands alone on the last line: nothing after it for a
     * messaging app to take as part of it. */
    function buildSetupTimingMessage() {
      return ["CrossingTime setup from your instructor. Tap the link below once.", "", buildShareTimingLink()].join("\n");
    }

    function buildPracticeTimingMessage() {
      return ["Save this link to practice in a browser:", buildRegularSiteLink()].join("\n");
    }

    function populateShareMessagePreviews() {
      setupTimingMessage.value = buildSetupTimingMessage();
      practiceTimingMessage.value = buildPracticeTimingMessage();
    }

    async function copyTextToClipboard(text) {
      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard API unavailable.");
        }
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        // The old fallback reported success even when nothing was copied
        // (bug 36, Oct 2026 review).
        const helper = document.createElement("textarea");
        helper.value = text;
        helper.setAttribute("readonly", "");
        helper.style.position = "absolute";
        helper.style.left = "-9999px";
        document.body.appendChild(helper);
        helper.select();
        let copied = false;
        try { copied = document.execCommand("copy") === true; } catch (fallbackError) { copied = false; }
        document.body.removeChild(helper);
        return copied;
      }
    }

    /*
     * Hand text to the phone's share sheet: Messages, Mail, WhatsApp, Notes,
     * anything. Native app: Capacitor's Share plugin. Browser: the Web Share
     * API. Neither available (a desktop browser): copy instead. Returns
     * "shared", "copied", or "cancelled".
     */
    async function gsShareText({ title, text }) {
      const SharePlugin = CapacitorGlobal?.Plugins?.Share;
      try {
        if (isNativeShell && SharePlugin?.share) {
          await SharePlugin.share({ title, text, dialogTitle: title });
          return "shared";
        }
        if (typeof navigator.share === "function") {
          await navigator.share({ title, text });
          return "shared";
        }
      } catch (error) {
        const message = String(error?.message || error || "");
        if (/cancel|abort/i.test(message) || error?.name === "AbortError") return "cancelled";
        /* fall through to copying */
      }
      return (await copyTextToClipboard(text)) ? "copied" : "failed";
    }

    /* Hand the page to another app's link (sms:, mailto:). One place, so a test can watch it. */
    function gsNavigateTo(url) {
      window.location.href = url;
    }

    /* Open the Messages app with the text filled in, and the number when there is one. */
    function gsOpenSms(text, number = "") {
      const apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
      const to = String(number || "").replace(/[^0-9+]/g, "");
      const separator = apple ? "&" : "?";
      gsNavigateTo(`sms:${to}${separator}body=${encodeURIComponent(text)}`);
    }

    /*
     * Hand a text file to the phone's share sheet (the apps write it to their
     * cache first), or download it in a browser. Returns "shared",
     * "downloaded", "copied", "cancelled" or "failed" (tracker F3).
     */
    async function gsShareFile({ name, text, mime = "text/plain", title = name }) {
      const SharePlugin = CapacitorGlobal?.Plugins?.Share;
      const Filesystem = CapacitorGlobal?.Plugins?.Filesystem;
      try {
        if (isNativeShell && SharePlugin?.share && Filesystem?.writeFile) {
          const written = await Filesystem.writeFile({ path: name, data: text, directory: "CACHE", encoding: "utf8", recursive: true });
          await SharePlugin.share({ title, dialogTitle: title, files: [written.uri] });
          return "shared";
        }
      } catch (error) {
        const message = String(error?.message || error || "");
        if (/cancel|abort/i.test(message) || error?.name === "AbortError") return "cancelled";
        /* fall through to the browser path */
      }
      try {
        // The phone's share sheet in a mobile browser; a desktop browser downloads.
        const mobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
        if (mobile && typeof navigator.share === "function" && typeof File === "function" && navigator.canShare?.({ files: [new File([text], name, { type: mime })] })) {
          await navigator.share({ title, files: [new File([text], name, { type: mime })] });
          return "shared";
        }
      } catch (error) {
        if (error?.name === "AbortError") return "cancelled";
      }
      try {
        const url = URL.createObjectURL(new Blob([text], { type: mime }));
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        return "downloaded";
      } catch (error) {
        return (await copyTextToClipboard(text)) ? "copied" : "failed";
      }
    }

    function clearImportedHash() {
      const cleanedUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState({}, document.title, cleanedUrl);
    }

    /* The token from the last successful import, so a browser can offer to
     * hand the same setup to the installed app. */
    let lastImportedToken = "";

    /**
     * Parse and validate a token. Returns { times, email, code, features }
     * (any may be null) or null if the token is invalid.
     */
    function parseShareToken(token) {
      const parts = splitShareToken(cleanShareToken(token));
      if (!parts) return null;
      const [version, encodedPayload, checksum] = parts;
      if (!["v1", "v2", "v3", "v4"].includes(version) || !encodedPayload || !checksum) return null;
      if (encodedPayload.length > 6000) return null;
      if (computeShareChecksum(encodedPayload) !== checksum) return null;

      let decoded;
      try {
        decoded = decodeBase64Url(encodedPayload);
      } catch (error) {
        return null;
      }

      let clearValue, fullValue, marginValue, emailValue = "", codeValue = "", features = null, lock = "", phoneValue = "";
      let hasTimes = true;
      if (version === "v3" || version === "v4") {
        let payload;
        try {
          payload = JSON.parse(decoded);
        } catch (error) {
          return null;
        }
        if (!payload || typeof payload !== "object") return null;
        hasTimes = Array.isArray(payload.t);
        if (hasTimes) [clearValue, fullValue, marginValue] = payload.t;
        emailValue = typeof payload.e === "string" ? payload.e : "";
        phoneValue = typeof payload.p === "string" ? payload.p : "";
        codeValue = typeof payload.k === "string" ? payload.k : "";
        if (version === "v4") features = decodeLinkFeatures(payload.f);
        else if (payload.f && typeof payload.f === "object") features = payload.f;
        if (typeof payload.l === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(payload.l)) lock = payload.l;
        if (!hasTimes && !emailValue && !phoneValue && !codeValue && !features && !lock) return null;
      } else {
        [clearValue, fullValue, marginValue, emailValue = "", codeValue = ""] = decoded.split("|");
      }

      const email = String(emailValue).trim();
      const phone = sanitizePhone(phoneValue);
      const code = String(codeValue).trim().toUpperCase();
      if (!isValidEmail(email) || !isValidPhone(phone) || !CLIENT_CODE_PATTERN.test(code)) return null;

      let times = null;
      if (hasTimes) {
        const normalizedClear = normalizeTimingValue(clearValue);
        const normalizedFull = normalizeTimingValue(fullValue);
        const normalizedMargin = normalizeTimingValue(marginValue);
        const clearNumber = Number(normalizedClear);
        const fullNumber = Number(normalizedFull);
        const marginNumber = Number(normalizedMargin);
        if (
          !normalizedClear || !normalizedFull || !normalizedMargin ||
          !Number.isFinite(clearNumber) || !Number.isFinite(fullNumber) || !Number.isFinite(marginNumber) ||
          clearNumber <= 0 || fullNumber <= 0 ||
          gsSetupProblem({ clear: normalizedClear, full: normalizedFull, margin: normalizedMargin })
        ) {
          return null;
        }
        times = [normalizedClear, normalizedFull, normalizedMargin];
      }
      return { times, email, phone, code, features, lock };
    }

    /** Apply a token. Returns true if it was valid and applied. */
    function applyShareToken(token) {
      const parsed = parseShareToken(token);
      if (!parsed) {
        pendingStatusMessage = "This setup link is invalid.";
        return false;
      }
      if (parsed.times) setReferenceTimes(...parsed.times, { source: "link" });
      if (instructorEmailInput && parsed.email) {
        instructorEmailInput.value = parsed.email;
        localStorage.setItem("om-instructor-email", parsed.email);
      }
      if (instructorPhoneInput && parsed.phone) {
        instructorPhoneInput.value = parsed.phone;
        localStorage.setItem("om-instructor-phone", parsed.phone);
      }
      if (clientCodeInput && parsed.code) {
        clientCodeInput.value = parsed.code;
        localStorage.setItem("om-client-code", parsed.code);
      }
      if (parsed.features) {
        // At boot this runs before features.js has loaded, so store the raw
        // set; features.js validates whatever it reads.
        if (typeof gsSaveFeatures === "function") {
          gsSaveFeatures(parsed.features);
        } else {
          try { localStorage.setItem("om-features", JSON.stringify(parsed.features)); } catch (error) { /* ignore */ }
        }
        if (typeof gsFeaturesChanged === "function") gsFeaturesChanged();
      }
      if (parsed.lock) {
        // Cindi: a link that turns activities off must also keep the student
        // from turning them back on. Instructor setup now asks for the code.
        try { localStorage.setItem("om-instructor-pin", parsed.lock); } catch (error) { /* ignore */ }
        if (typeof gsInstructorLockNow === "function") gsInstructorLockNow();
      }
      lastImportedToken = cleanShareToken(token);
      pendingStatusMessage = "Your instructor's setup is now on this device.";
      return true;
    }

    function importSharedTimingSettings() {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash.startsWith("ts=")) return false;
      // Several students on this phone: a link is applied to the student it
      // was made for, never to whoever is selected (tracker 20.4). When that
      // means a switch, the app restarts and the link is applied after it.
      const parsedForStudent = parseShareToken(hash.slice(3));
      if (parsedForStudent?.code && typeof gsStudentsRouteSetupLink === "function" && gsStudentsRouteSetupLink(parsedForStudent.code)) return true;
      applyShareToken(hash.slice(3));
      clearImportedHash();
      return true;
    }

    /*
     * gapsense://setup?ts=TOKEN   apply an instructor's setup
     * gapsense://open/practice    open an activity (app shortcuts)
     * Handled in the installed app only.
     */
    function handleAppUrl(rawUrl) {
      if (!rawUrl) return false;
      let url;
      try {
        url = new URL(rawUrl);
      } catch (error) {
        return false;
      }
      if (url.protocol !== `${GS_APP_SCHEME}:`) return false;
      const route = `${url.host}${url.pathname}`.replace(/^\/+|\/+$/g, "");
      const token = url.searchParams.get("ts") || (url.hash.startsWith("#ts=") ? url.hash.slice(4) : "");
      if (route === "setup" && token) {
        const ok = applyShareToken(token);
        const message = ok ? "Your instructor's setup is now on this device." : "This setup link is invalid.";
        setStatus(message, ok ? "neutral" : "warn");
        announceScreenReader(message);
        if (ok && typeof gsShowScreen === "function") gsShowScreen("home");
        return true;
      }
      const match = route.match(/^open\/(practice|signal|compare|live|progress|help)$/);
      if (match && typeof gsShowScreen === "function") {
        gsShowScreen(match[1]);
        return true;
      }
      return false;
    }

    function bindNativeAppUrls() {
      const AppPlugin = CapacitorGlobal?.Plugins?.App;
      if (!isNativeShell || !AppPlugin) return;
      try {
        AppPlugin.addListener?.("appUrlOpen", (event) => handleAppUrl(event?.url));
        const launch = AppPlugin.getLaunchUrl?.();
        if (launch && typeof launch.then === "function") {
          launch.then((result) => {
            // Wait for the shell to finish booting before navigating.
            if (result?.url) setTimeout(() => handleAppUrl(result.url), 0);
          }).catch(() => {});
        }
      } catch (error) {
        /* non-fatal */
      }
    }

    /* After a browser imports a setup, offer to open the same setup in the app. */
    function offerOpenInApp() {
      if (isNativeShell || !lastImportedToken) return;
      const dialog = document.getElementById("openInAppModal");
      const link = document.getElementById("openInAppLink");
      if (!dialog || !link || typeof dialog.showModal !== "function") return;
      link.href = `${GS_APP_SCHEME}://setup?ts=${lastImportedToken}`;
      if (dialog.open) return;
      lockPageScroll();
      setMainContentInert(true);
      dialog.showModal();
      document.getElementById("openInAppTitle")?.focus();
    }

    function validateShareSetup() {
      const includes = shareIncludes();
      const lockTravels = includes.lock && typeof gsPinHash === "function" && Boolean(gsPinHash());
      if (!includes.times && !includes.contact && !includes.features && !lockTravels) {
        setShareNote("Choose at least one thing for the link to carry.");
        return false;
      }
      if (includes.times && !validateSetup()) return false;
      if (includes.contact && !isValidEmail(getInstructorEmail())) {
        setShareNote("Check the instructor email address before sharing.");
        instructorEmailInput?.focus();
        return false;
      }
      if (includes.contact && !isValidPhone(getInstructorPhone())) {
        setShareNote("Check the instructor mobile number before sharing: digits only, at least 7.");
        instructorPhoneInput?.focus();
        return false;
      }
      return true;
    }

    function setShareNote(message) {
      const note = document.getElementById("shareNote");
      if (note) note.textContent = message;
      announceScreenReader(message);
    }

    /* The lock box is ticked by default, but only a code set on this phone
     * can travel. Without one, the instructor must be told the link will not
     * lock anything (bug 21). */
    function shareLockNote() {
      const wantsLock = shareIncludes().lock;
      const hasCode = typeof gsPinHash === "function" && Boolean(gsPinHash());
      return wantsLock && !hasCode
        ? " It does not lock Instructor setup: set an instructor code first."
        : "";
    }

    async function copyShareTimingLink() {
      if (!validateShareSetup()) return;
      populateShareMessagePreviews();
      const outcome = await gsShareText({ title: "CrossingTime setup", text: setupTimingMessage.value });
      if (outcome === "shared") setShareNote(`Setup link shared.${shareLockNote()}`);
      else if (outcome === "copied") setShareNote(`Setup message copied. Paste it into a text or email to the student.${shareLockNote()}`);
      else if (outcome === "failed") {
        const details = document.querySelector(".share-details");
        if (details) details.open = true;
        setShareNote("Could not copy. The message is shown below: select it and copy it.");
      } else setShareNote("Not shared.");
    }

    function textSetupToStudent() {
      if (!validateShareSetup()) return;
      populateShareMessagePreviews();
      setShareNote(`Opening Messages. Add the student's number, then send.${shareLockNote()}`);
      gsOpenSms(setupTimingMessage.value);
    }

    function getMissingTimingFields() {
      const { clearTime, fullTime } = getTimingInputs();
      const missing = [];
      if (!Number.isFinite(clearTime) || clearTime <= 0) missing.push("clear");
      if (!Number.isFinite(fullTime) || fullTime <= 0) missing.push("full");
      return missing;
    }

    /*
     * One check for the setup, used by manual entry, Home, the activities and
     * setup links alike (bugs 32 and 33, Oct 17 2026). A margin of 0 or an
     * empty margin used to become 0.4 s without a word, and impossible times
     * (601 s, a first half longer than the full street) were accepted here
     * but refused by the app's own link. Returns "" when the setup is usable.
     */
    function gsSetupProblem({ clear = clearTimeInput.value, full = fullTimeInput.value, margin = marginInput.value } = {}) {
      const c = Number(clear), f = Number(full);
      const m = String(margin).trim() === "" ? NaN : Number(margin);
      if (!(c > 0) || !(f > 0)) return "";            // missing: reported by the caller
      if (c > 600 || f > 600) return "Crossing times can be at most 600 seconds.";
      if (c >= f) return "The first-half time must be shorter than the full-street time.";
      if (!Number.isFinite(m)) return "Enter a margin of error, in seconds.";
      if (m <= 0) return "The margin of error must be more than 0 seconds.";
      if (m > 60) return "The margin of error can be at most 60 seconds.";
      return "";
    }

    function getTimingRequirementMessage() {
      const missing = getMissingTimingFields();
      if (missing.length === 0) return "";
      if (missing.length === 2) {
        return "Enter your first-half and full-street crossing times in Instructor setup, or open the link your instructor sent, before practicing.";
      }
      if (missing.length === 1 && missing[0] === "clear") {
        return "Enter your first-half crossing time in Instructor setup before practicing.";
      }
      if (missing.length === 1) {
        return "Enter your full-street crossing time in Instructor setup before practicing.";
      }
      const problem = gsSetupProblem();
      return problem ? `${problem} Check Instructor setup before practicing.` : "";
    }

    function refreshTimingRequirementPrompt() {
      const message = getTimingRequirementMessage();
      const hasMissingTimes = Boolean(message);
      timingRequiredPrompt.hidden = !hasMissingTimes;
      timingRequiredPromptText.textContent = message || "Enter both crossing times in Instructor setup before practicing.";
      return !hasMissingTimes;
    }

    function focusFirstMissingTimingField() {
      const missing = getMissingTimingFields();
      const target = missing[0] === "clear"
        ? clearTimeInput
        : missing[0] === "full"
          ? fullTimeInput
          : clearTimeInput;
      target.focus();
      target.select?.();
    }

    /* Crossing times live in Instructor setup (build 7), not Settings. */
    function instructorScreenShowing() {
      return typeof gsCurrentScreen !== "undefined" && gsCurrentScreen === "instructor";
    }

    function openSettingsForTimingEntry() {
      if (settingsModal.open) {
        lastDialogTrigger = document.getElementById("screenTitle");
        settingsModal.close();
      }
      if (typeof gsShowScreen === "function") gsShowScreen("instructor");
      requestAnimationFrame(() => {
        if (!document.getElementById("instructorBody")?.hidden) focusFirstMissingTimingField();
      });
    }

    function requireTimingInputs() {
      const message = getTimingRequirementMessage();
      if (!message) {
        refreshTimingRequirementPrompt();
        if (!started) setStatus("");
        return true;
      }
      refreshTimingRequirementPrompt();
      setStatus("");
      announceScreenReader(message);
      if (instructorScreenShowing()) {
        focusFirstMissingTimingField();
      } else {
        timingRequiredPromptButton.focus();
      }
      return false;
    }

    function getTextSizeScale(size) {
      if (size === "smaller") return 16 / 18;
      if (size === "large") return 1.15;
      if (size === "largest") return 1.3;
      if (size === "huge") return 1.5;
      if (size === "xl") return 2;
      if (size === "xxl") return 2.5;
      if (size === "max") return 3;
      return 1;
    }

    function validateSetup() {
      if (!requireTimingInputs()) return false;
      const problem = gsSetupProblem();
      if (problem) {
        setStatus(problem, "warn");
        emitCue("validation_error", { message: problem });
        return false;
      }
      return true;
    }

    // Single source of truth for reference times — the old build had two
    // near-identical copies of this that could drift apart.
    function getReferenceTimes(mode = currentMode) {
      const { clearTime, fullTime } = getTimingInputs();
      if (mode === "2") return [0, fullTime];
      if (mode === "2b") return [0, clearTime];
      return [0, clearTime, fullTime];
    }

    // Single source of truth for acceptable-vs-outside. The old build computed
    // this twice inside beginReplay (once for audio, once for the visual event
    // list); if one copy were tuned, sound and visuals would silently disagree.
    // `street` selects the margin lane ("half" for the Halfway mark, "full" for
    // Finish). With the adaptive margin on, each activity and street type has
    // its own margin; with it off, this is simply the instructor's margin.
    function marginFor(activity, street) {
      if (typeof gsEffectiveMargin === "function") return gsEffectiveMargin(activity, street);
      return getMargin();
    }

    function streetForLabel(label) {
      return String(label || "").toLowerCase() === "halfway" ? "half" : "full";
    }

    function classifyMark(userTime, referenceTime, street = "full", activity = "practice") {
      const diff = Math.abs((userTime ?? 0) - referenceTime);
      // Practice times the student's own taps against each other; no sound
      // is being timed, so the headphone delay plays no part here. Only a
      // small allowance for the touchscreen remains.
      const timingEpsilon = 0.02;
      const marginSec = marginFor(activity, street);
      const feedbackType = diff <= marginSec + timingEpsilon ? "acceptable" : "outside";
      return { diff, feedbackType, marginSec };
    }

    /* ---------------- Visual replay ---------------- */
    function getUserFlashColor() {
      return VISUAL_USER_FLASH_COLORS[a11ySettings.userFlashContrast] || VISUAL_USER_FLASH_COLORS.soft;
    }

    function applyVisualReplayFrame(elapsedSec) {
      if (elapsedSec < VISUAL_REPLAY_PRE_DELAY_SEC) return;
      const overlay = visualReplayState.target?.overlay || visualReplayOverlay;
      const flash = visualReplayState.target?.flash || visualReplayFlash;
      const shape = visualReplayState.target?.shape || visualReplayShape;
      const isUserPulseActive = elapsedSec < visualReplayState.userFlashUntilSec;
      const isReferencePulseActive = elapsedSec < visualReplayState.referenceUntilSec;
      const isSampleActive = elapsedSec < visualReplayState.sampleUntilSec;
      overlay.dataset.active = "true";
      flash.style.background = isUserPulseActive ? getUserFlashColor() : "#000000";
      const sample = overlay.querySelector(".visual-replay-sample");
      if (sample) sample.style.display = isSampleActive ? "block" : "none";
      if (isReferencePulseActive && visualReplayState.currentReferenceType) {
        shape.style.display = "block";
        shape.dataset.type = visualReplayState.currentReferenceType;
        shape.dataset.outsideVariant = a11ySettings.outsideVisualVariant;
      } else {
        shape.style.display = "none";
      }
    }

    function hideVisualReplayFrame() {
      const overlay = visualReplayState.target?.overlay || visualReplayOverlay;
      const flash = visualReplayState.target?.flash || visualReplayFlash;
      const shape = visualReplayState.target?.shape || visualReplayShape;
      overlay.dataset.active = "false";
      flash.style.background = "transparent";
      shape.style.display = "none";
      const sample = overlay.querySelector(".visual-replay-sample");
      if (sample) sample.style.display = "none";
      visualReplayState.userFlashUntilSec = 0;
      visualReplayState.referenceUntilSec = 0;
      visualReplayState.sampleUntilSec = 0;
      visualReplayState.currentReferenceType = null;
      visualReplayState.target = null;
    }

    function playVisualPreview(type) {
      const previewTarget = {
        overlay: settingsVisualPreview,
        flash: settingsVisualPreviewFlash,
        shape: settingsVisualPreviewShape
      };
      const timing = TEST_TUNING.visualPreviewTimingMs;
      const leadInMs = type === "user" ? timing.userEnter : timing.shapeEnter;
      const visibleMs = type === "user" ? timing.userVisible : timing.shapeVisible;
      const exitMs = type === "user" ? timing.userExit : timing.shapeExit;
      const totalMs = leadInMs + visibleMs + exitMs;

      previewTarget.overlay.dataset.active = "true";
      previewTarget.flash.style.background = "#000000";
      previewTarget.shape.style.display = "none";

      setTimeout(() => {
        if (type === "user") {
          previewTarget.flash.style.background = getUserFlashColor();
          return;
        }
        previewTarget.shape.dataset.type = type;
        previewTarget.shape.dataset.outsideVariant = a11ySettings.outsideVisualVariant;
        previewTarget.shape.style.display = "block";
      }, leadInMs);

      setTimeout(() => {
        previewTarget.flash.style.background = "#000000";
        previewTarget.shape.style.display = "none";
      }, leadInMs + visibleMs);

      setTimeout(() => {
        previewTarget.overlay.dataset.active = "false";
        previewTarget.flash.style.background = "transparent";
        previewTarget.shape.style.display = "none";
      }, totalMs);
    }

    // event.holdSec lets a "user" flash stay on for a whole interval (the
    // comparison tasks show the sample warning time as one held flash) instead
    // of the default short pulse.
    function triggerVisualReplayEvent(event, elapsedSec) {
      const hold = Number.isFinite(event.holdSec) ? event.holdSec : VISUAL_PULSE_SEC;
      if (event.type === "user") {
        visualReplayState.userFlashUntilSec = Math.max(
          visualReplayState.userFlashUntilSec,
          elapsedSec + hold
        );
        return;
      }
      if (event.type === "sample") {
        // The sample warning time: a held bar across the screen, never the
        // student's own flash, which now means "this is your time".
        visualReplayState.sampleUntilSec = Math.max(visualReplayState.sampleUntilSec, elapsedSec + hold);
        return;
      }
      if (event.type === "reference") {
        visualReplayState.currentReferenceType = event.feedbackType;
        visualReplayState.referenceUntilSec = Math.max(
          visualReplayState.referenceUntilSec,
          elapsedSec + hold
        );
      }
    }

    function stopVisualReplay() {
      if (visualReplayState.rafId !== null) {
        cancelAnimationFrame(visualReplayState.rafId);
        visualReplayState.rafId = null;
      }
      hideVisualReplayFrame();
      gsReplayBarStop();
    }

    function startSynchronizedVisualReplay(events, endAtSec, target = null, { append = false } = {}) {
      // The bar on the screen runs whenever anything is shown at all; the
      // full-screen flashes only with the synchronized visual replay on.
      if (!target) gsReplayBarStart(events, endAtSec, { append });
      if (!visualOutputEnabled() || !a11ySettings.syncVisualReplay) return;
      const context = ensureAudioContext();
      // Replay B schedules two replays back to back; the second used to stop
      // the first, so its visuals vanished (bug 30, Oct 2026 review). With
      // append, the new events join the timeline already running.
      if (append && visualReplayState.rafId) {
        const offset = context.currentTime - visualReplayState.replayStartTime;
        visualReplayState.events = [
          ...visualReplayState.events,
          ...events.map((event) => ({ ...event, timeSec: event.timeSec + offset }))
        ].sort((a, b) => a.timeSec - b.timeSec);
        visualReplayState.endAtSec = Math.max(visualReplayState.endAtSec, endAtSec + offset);
        return;
      }
      stopVisualReplay();
      visualReplayState.events = [...events].sort((a, b) => a.timeSec - b.timeSec);
      visualReplayState.nextIndex = 0;
      visualReplayState.endAtSec = endAtSec;
      visualReplayState.replayStartTime = context.currentTime;
      visualReplayState.userFlashUntilSec = 0;
      visualReplayState.referenceUntilSec = 0;
      visualReplayState.sampleUntilSec = 0;
      visualReplayState.currentReferenceType = null;
      visualReplayState.target = target;

      const frame = () => {
        const elapsedSec = context.currentTime - visualReplayState.replayStartTime;
        while (
          visualReplayState.nextIndex < visualReplayState.events.length &&
          elapsedSec >= visualReplayState.events[visualReplayState.nextIndex].timeSec
        ) {
          triggerVisualReplayEvent(visualReplayState.events[visualReplayState.nextIndex], elapsedSec);
          visualReplayState.nextIndex += 1;
        }
        applyVisualReplayFrame(elapsedSec);
        const done =
          elapsedSec >= visualReplayState.endAtSec &&
          visualReplayState.nextIndex >= visualReplayState.events.length &&
          elapsedSec >= visualReplayState.userFlashUntilSec &&
          elapsedSec >= visualReplayState.referenceUntilSec &&
          elapsedSec >= visualReplayState.sampleUntilSec;
        if (done) {
          stopVisualReplay();
          return;
        }
        visualReplayState.rafId = requestAnimationFrame(frame);
      };

      visualReplayState.rafId = requestAnimationFrame(frame);
    }

    /* ---------------- Exemplars ---------------- */
    function playExemplar(mode) {
      const labels = modes[mode]?.labels;
      if (!labels) return;
      if (!requireTimingInputs()) {
        emitCue("validation_error", { message: getTimingRequirementMessage() });
        return;
      }
      const times = getReferenceTimes(mode);

      clearTimeout(exemplarTimeout);
      clearExemplarVisuals();
      gsBeginQuiet();
      actionBtn.classList.remove("idle");
      actionBtn.classList.add("running");
      gsSetBusy(actionBtn, true);
      setActionButtonLabel("Exemplar");
      setActionButtonHint("Listen");
      const sequenceLabel = labels.join(" to ");
      setStatus(`Playing exemplar: ${sequenceLabel}.`);
      emitCue("replay_start", { mode, exemplar: true });

      const baseDelay = TEST_TUNING.exemplarLeadInSec;
      const visualEvents = labels.map((_, index) => ({
        timeSec: baseDelay + (times[index] ?? 0),
        type: "user"
      }));
      const doneAtSec = baseDelay + Math.max(...times) + TEST_TUNING.exemplarEndPadSec;
      const exemplarVisualTarget = settingsModal.open ? {
        overlay: settingsVisualPreview,
        flash: settingsVisualPreviewFlash,
        shape: settingsVisualPreviewShape
      } : null;
      startSynchronizedVisualReplay(visualEvents, doneAtSec, exemplarVisualTarget);

      labels.forEach((label, index) => {
        const time = times[index] ?? 0;
        exemplarVisualTimeouts.push(
          setTimeout(() => {
            setActionButtonStageByLabel(label);
            hapticCue("marker");
          }, (baseDelay + time) * 1000)
        );
        playUserMarkerTone(baseDelay + time);
      });

      exemplarTimeout = setTimeout(() => {
        suppressSrAnnouncements = false;
        actionBtn.classList.remove("running");
        actionBtn.classList.add("idle");
        gsSetBusy(actionBtn, false);
        setActionButtonLabel("Begin");
        setActionButtonHint("Tap when you step off");
        setActionButtonStageByLabel("");
        setStatus("Exemplar complete. Ready.");
        emitCue("replay_end", { message: "Exemplar complete. Ready." });
      }, doneAtSec * 1000);
    }

    /* ---------------- Markers / stage UI ---------------- */
    function updateMode() {
      const selected = modeInputs.find((input) => input.checked);
      currentMode = selected?.value || "2b";
      localStorage.setItem("om-mode", currentMode);
      renderMarkers();
      resetState();
      renderPracticeScore();
    }

    function renderMarkers() {
      markersEl.innerHTML = "";
      const { labels } = modes[currentMode];
      labels.forEach((label, index) => {
        const item = document.createElement("div");
        item.className = "marker";
        item.dataset.index = String(index);
        item.dataset.label = label;
        const shape = document.createElement("div");
        shape.className = "marker-shape";
        shape.setAttribute("aria-hidden", "true");
        shape.textContent = getIndicatorSymbolForLabel(label);
        const text = document.createElement("span");
        text.className = "marker-label";
        text.setAttribute("aria-hidden", "true");
        text.textContent = label;
        item.append(shape, text);
        markersEl.appendChild(item);
      });
      updateMarkerStates();
    }

    function updateMarkerStates() {
      const markerNodes = [...markersEl.querySelectorAll(".marker")];
      markerNodes.forEach((node, index) => {
        node.classList.toggle("complete", index < stage);
        node.classList.toggle("current", index === stage && started);
      });
      updateMarkersSummary();
      updateActionButtonStage();
    }

    function updateMarkersSummary() {
      const markerNodes = [...markersEl.querySelectorAll(".marker")];
      const summaries = markerNodes.map((node) => {
        const label = node.dataset.label || "";
        if (node.classList.contains("complete")) return `${label} complete`;
        if (node.classList.contains("current")) return `${label} current`;
        return `${label} not reached`;
      });
      markersEl.setAttribute("aria-label", `Progress markers: ${summaries.join(", ")}`);
    }

    function getStageClassForLabel(label) {
      const normalized = String(label || "").trim().toLowerCase();
      if (normalized === "start") return "stage-start";
      if (normalized === "halfway") return "stage-halfway";
      if (normalized === "finish") return "stage-finish";
      return "";
    }

    function getIndicatorSymbolForLabel(label) {
      const normalized = String(label || "").trim().toLowerCase();
      if (normalized === "start") return "●";
      if (normalized === "halfway") return "▲";
      if (normalized === "finish") return "■";
      return "○";
    }

    function setActionButtonStageByLabel(label) {
      actionBtn.classList.remove("stage-start", "stage-halfway", "stage-finish");
      const stageClass = getStageClassForLabel(label);
      if (stageClass) actionBtn.classList.add(stageClass);
      actionBtnIndicator.textContent = getIndicatorSymbolForLabel(label);
    }

    function updateActionButtonStage() {
      setActionButtonStageByLabel("");
      if (!started || stage <= 0) return;
      const labels = modes[currentMode]?.labels || [];
      if (labels.length === 0) return;
      const clampedIndex = Math.min(stage - 1, labels.length - 1);
      setActionButtonStageByLabel(labels[clampedIndex]);
    }

    function clearExemplarVisuals() {
      exemplarVisualTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      exemplarVisualTimeouts = [];
      stopVisualReplay();
    }

    function setStatus(message, tone = "neutral") {
      cueBannerText.textContent = message;
      cueBanner.dataset.tone = tone;
      syncCueBannerVisibility();
    }

    /*
     * Synchronous on purpose. The old version cleared the live region and set
     * the text 20 ms later, re-checking the suppression flag inside the
     * timeout. Every flow that announced something and then suppressed speech
     * on the next line ("Listen…", "That was longer. Listen to the
     * difference…") lost its message, so a VoiceOver user was never told the
     * correct answer. A zero-width space is toggled on alternate calls so an
     * identical message still counts as a change and is re-announced.
     */
    let srAnnounceToggle = false;
    let srAnnounceClearTimer = null;
    function announceScreenReader(message, { force = false, speak = true } = {}) {
      if (!message) return;
      // Nothing is said while the app is not the screen in front: VoiceOver
      // would read it over another app (tracker 22.1).
      if (document.hidden) return;
      // force: the replay word and the descriptions (build 15) are meant for
      // the quiet stretch; speak: false when the text is already being spoken
      // by the app itself, so self-voicing does not say it twice.
      if (suppressSrAnnouncements && !force) return;
      // Self-voicing speaks every announcement aloud, whether or not a screen
      // reader is running. It is the student's choice, under Accessibility.
      // Never while a practice crossing is being timed.
      if (speak && gsSelfVoiceOn() && !started) gsSpeak(message);
      if (!a11ySettings.announceCues) return;
      srAnnounceToggle = !srAnnounceToggle;
      srAnnouncer.textContent = srAnnounceToggle ? message : `${message}​`;
      // The live region sits after every screen in the page. While it holds
      // text, a VoiceOver user swiping past the last control lands on it and
      // hears the old message ("Your phone volume is low") instead of the
      // end-of-page sound (Cindi and a coworker, Oct 20 2026). Once it has
      // been spoken it is emptied, and an empty element is not a stop.
      clearTimeout(srAnnounceClearTimer);
      srAnnounceClearTimer = setTimeout(() => {
        if (srAnnouncer.textContent.replace(/\u200b/g, "") === message) srAnnouncer.textContent = "";
      }, 4000);
    }

    /* ---------------- Speech ----------------
     * The browser's own text-to-speech (Web Speech API). Works in Safari, the
     * iOS and Android web views, and Chrome. Used for two things: self-voicing
     * (above), and the spoken "Get ready" in Comparison preparation, which
     * replaced a beep that sounded too much like the other cues.
     */
    let nativeSpeechToken = null;

    /*
     * Who speaks for the app. On iPhone the GSNative plugin (with the tones,
     * build 9). On Android, Android's own text-to-speech through the
     * GSAndroid plugin (build 15): the Android web view has no web speech
     * engine at all, so until now nothing the app "said" on Android, from
     * "Get ready" to the directions, was ever heard. In a browser, web speech.
     */
    const nativeSpeech = nativeSound
      ? GSNativePlugin
      : (isNativeShell && nativePlatform === "android" && typeof CapacitorGlobal?.Plugins?.GSAndroid?.speak === "function"
        ? CapacitorGlobal.Plugins.GSAndroid
        : null);

    function nativeSpeechCall(method, args) {
      try {
        const result = nativeSpeech[method](args);
        if (result && typeof result.catch === "function") result.catch(() => {});
        return result;
      } catch (error) {
        return null;
      }
    }

    function speechAvailable() {
      if (nativeSpeech) return true;
      return typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance === "function";
    }

    function pickEnglishVoice() {
      try {
        const voices = window.speechSynthesis.getVoices() || [];
        return voices.find((v) => v.lang === "en-US" && v.localService)
          || voices.find((v) => v.lang === "en-US")
          || voices.find((v) => /^en/i.test(v.lang))
          || null;
      } catch (error) {
        return null;
      }
    }

    /**
     * Speak text. Calls onDone when finished (or after a safety timeout, since
     * some web views never fire "end"). Returns false when there is no speech.
     */
    function gsSpeak(text, { onDone = null, interrupt = true, maxWaitMs = 4000 } = {}) {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        if (typeof onDone === "function") onDone();
      };
      if (!text || !speechAvailable() || a11ySettings.outputMode === "visual-only") {
        if (onDone) setTimeout(done, 0);
        return false;
      }
      if (nativeSpeech) {
        // Spoken by the app itself: on iPhone through the same session as the
        // tones, so the silent switch cannot mute "Get ready" either; on
        // Android through the system text-to-speech engine.
        const token = {};
        nativeSpeechToken = token;
        const finish = () => {
          if (nativeSpeechToken === token) nativeSpeechToken = null;
          done();
        };
        Promise.resolve(nativeSpeechCall("speak", { text, rate: Number(a11ySettings.speechRate) || 1, interrupt }))
          .then(finish, finish);
        if (onDone) setTimeout(done, maxWaitMs);
        return true;
      }
      try {
        if (interrupt) window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        const voice = pickEnglishVoice();
        if (voice) utterance.voice = voice;
        utterance.rate = Number(a11ySettings.speechRate) || 1;
        utterance.volume = 1;
        utterance.onend = done;
        utterance.onerror = done;
        window.speechSynthesis.speak(utterance);
        if (onDone) setTimeout(done, maxWaitMs);
        return true;
      } catch (error) {
        if (onDone) setTimeout(done, 0);
        return false;
      }
    }

    /** Is anything being spoken right now? */
    function gsSpeechBusy() {
      if (nativeSpeech) return nativeSpeechToken !== null;
      try {
        return speechAvailable() && window.speechSynthesis.speaking;
      } catch (error) {
        return false;
      }
    }

    function gsStopSpeech() {
      if (nativeSpeech) {
        nativeSpeechToken = null;
        nativeSpeechCall("stopSpeaking", {});
        return;
      }
      try {
        if (speechAvailable()) window.speechSynthesis.cancel();
      } catch (error) {
        /* ignore */
      }
    }

    /** Start a stretch where nothing may talk over the timing sounds. */
    function gsBeginQuiet() {
      suppressSrAnnouncements = true;
      if (a11ySettings.selfVoice) gsStopSpeech();
    }

    /* ---------------- Spoken replay word and descriptions (build 15) ----------------
     * Jonggi tested build 14 on Android without TalkBack and heard nothing
     * at the start of a replay: "Replay." went to the screen-reader live
     * region only, and the app's own speech was blocked until the replay
     * ended. Now, for everyone:
     *   - "Replay" is said before every replay (gsReplayIntro), with the
     *     tones held back until the word is over;
     *   - after the right-or-wrong sound and after each replay, the app says
     *     in words what the sounds were (gsDescribe), never a number of
     *     seconds (Cindi's rule), and the next step waits for the words
     *     (gsDescribeThen) so they are never cut off by the replay (the
     *     reason words were removed in October 2026, tracker 12.29).
     * With VoiceOver or TalkBack running the same text goes to the live
     * region instead, in the voice the student already uses. */
    const GS_REPLAY_INTRO_SEC = 1.0;
    let gsScreenReaderRunning = false;

    function gsScreenReaderOn() {
      return typeof window.__gsScreenReader === "boolean" ? window.__gsScreenReader : gsScreenReaderRunning;
    }

    /* Self-voicing is "for use without VoiceOver or TalkBack" (Settings).
     * With a screen reader running the app stays quiet and leaves the
     * talking to the screen reader, so the two never speak over each other
     * (Cindi and a tester, 4 Nov 2026, on the session code pop-up). */
    function gsSelfVoiceOn() {
      return Boolean(a11ySettings.selfVoice) && !gsScreenReaderOn();
    }

    /* Asks the native shell whether VoiceOver or TalkBack is on. The web
     * build cannot know, so it speaks for itself.
     * Build 24 (tracker 22.2): the shells also report every change while the
     * app is open ("screenReader" events), and gsScreenReaderKnown resolves
     * once the first answer is in, so nothing that depends on it (the first
     * thing said at launch) runs on a guess. */
    function gsScreenReaderPlugin() {
      if (!isNativeShell) return null;
      const plugin = nativePlatform === "android" ? CapacitorGlobal?.Plugins?.GSAndroid : GSNativePlugin;
      return plugin && typeof plugin.accessibilityStatus === "function" ? plugin : null;
    }
    let gsScreenReaderKnownResolve = null;
    const gsScreenReaderKnown = new Promise((resolve) => { gsScreenReaderKnownResolve = resolve; });
    function gsScreenReaderAnswered() {
      if (gsScreenReaderKnownResolve) { gsScreenReaderKnownResolve(gsScreenReaderOn()); gsScreenReaderKnownResolve = null; }
    }
    function gsRefreshScreenReader() {
      const plugin = gsScreenReaderPlugin();
      if (!plugin) { gsScreenReaderAnswered(); return Promise.resolve(gsScreenReaderOn()); }
      try {
        return Promise.resolve(plugin.accessibilityStatus()).then((status) => {
          if (status && typeof status.screenReader === "boolean") gsScreenReaderRunning = status.screenReader;
          gsScreenReaderAnswered();
          return gsScreenReaderOn();
        }).catch(() => { gsScreenReaderAnswered(); return gsScreenReaderOn(); });
      } catch (error) {
        gsScreenReaderAnswered();
        return Promise.resolve(gsScreenReaderOn());
      }
    }
    (function gsListenForScreenReader() {
      const plugin = gsScreenReaderPlugin();
      if (!plugin || typeof plugin.addListener !== "function") return;
      try {
        plugin.addListener("screenReader", (event) => {
          if (typeof event?.screenReader === "boolean") gsScreenReaderRunning = event.screenReader;
        });
      } catch (error) { /* older shell: checked again on return to the app */ }
    })();
    // An older shell that never answers must not hold anything up for long.
    setTimeout(gsScreenReaderAnswered, 1500);

    /*
     * Says something through the screen reader and calls onDone when it is
     * over (tracker 22.8). On iPhone VoiceOver reports the end of an
     * announcement, so the tones that follow wait for the words. Where the
     * end cannot be known (TalkBack, a browser), the wait is worked out from
     * the number of words at a slow speaking rate, so a tone is not started
     * on a guess that is too short.
     */
    function gsScreenReaderWaitSec(text) {
      const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
      return Math.max(1.5, 0.6 + words * 0.45);
    }
    function gsScreenReaderSay(text, { onDone = null } = {}) {
      let finished = false;
      const done = () => { if (finished) return; finished = true; if (typeof onDone === "function") onDone(); };
      if (!text || document.hidden) { if (onDone) setTimeout(done, 0); return; }
      const plugin = nativePlatform === "ios" ? GSNativePlugin : null;
      if (plugin && typeof plugin.announce === "function") {
        try {
          Promise.resolve(plugin.announce({ text })).then(done, done);
          // Never stuck: the shell has its own timeout too.
          setTimeout(done, 16000);
          return;
        } catch (error) { /* fall through to the live region */ }
      }
      announceScreenReader(text, { force: true, speak: false });
      const estimateMs = gsScreenReaderWaitSec(text) * 1000;
      // Build 25 (tracker 22.8): Android does not say when TalkBack has
      // finished, but it does say when its voice is playing. The shell waits
      // for TalkBack's voice to start and then to go quiet; if it never
      // hears it (an older phone, TalkBack's voice off), the estimate stays.
      const android = nativePlatform === "android" ? CapacitorGlobal?.Plugins?.GSAndroid : null;
      if (android && typeof android.waitForSpeech === "function") {
        const sentAt = performance.now();
        const rest = () => setTimeout(done, Math.max(0, estimateMs - (performance.now() - sentAt)));
        try {
          // Not heard by the time the estimate is over: the phone does not
          // report it, so never wait longer than build 24 did.
          Promise.resolve(android.waitForSpeech({ startWithinMs: Math.min(2500, estimateMs), quietMs: 450, maxMs: Math.max(8000, estimateMs * 3) }))
            .then((result) => { if (result && result.heard) done(); else rest(); }, rest);
          setTimeout(done, Math.max(16000, estimateMs * 3));   // never stuck
          return;
        } catch (error) { /* older shell: the estimate */ }
      }
      setTimeout(done, estimateMs);
    }

    /* Build 25 (tracker 22.8): "Replay" through the screen reader first, and
     * the replay's sounds only once it is over (on iPhone, when VoiceOver
     * reports it; on Android, when TalkBack's voice goes quiet). run(intro)
     * starts the replay, with its own "Replay" when intro is true, and
     * returns when it ends (seconds from now); then(doneAt) gets that time.
     * stillWanted() is asked again after the word: Back while "Replay" is
     * being read means no replay. Without a screen reader, or with "Say
     * Replay" off, the replay starts at once, as before. */
    function gsReplayWordFirst() {
      return Boolean(a11ySettings.sayReplay) && gsScreenReaderOn();
    }
    function gsReplayAfterWord(run, then, { stillWanted = () => true } = {}) {
      const start = (intro) => {
        const doneAt = run(intro);
        if (typeof then === "function") then(doneAt);
        return doneAt;
      };
      if (!gsReplayWordFirst()) return start(true);
      gsScreenReaderSay("Replay.", { onDone: () => { if (stillWanted()) start(false); } });
      return null;
    }

    function gsCanSpeakAloud() {
      return speechAvailable() && a11ySettings.outputMode !== "visual-only";
    }

    /* Says "Replay" and returns how long the tones must wait for it. With a
     * screen reader the live region says it; `announced` when the caller has
     * already put it there (Practice's replay_start cue). */
    function gsReplayIntro({ announced = false } = {}) {
      if (!a11ySettings.sayReplay) return 0;
      if (gsScreenReaderOn() || !gsCanSpeakAloud()) {
        if (!announced) announceScreenReader("Replay.", { force: true, speak: false });
        // Long enough for "Replay" at a slow speaking rate (tracker 22.8;
        // it was 0.6 s).
        return gsScreenReaderOn() ? gsScreenReaderWaitSec("Replay.") : 0;
      }
      gsSpeak("Replay", { interrupt: true });
      return GS_REPLAY_INTRO_SEC;
    }

    /* Speaks a description (or hands it to the screen reader). onDone runs
     * when the words are over and at least minSec have passed. Returns
     * whether anything was said. */
    function gsDescribe(text, { onDone = null, minSec = 0 } = {}) {
      const finish = (afterMs) => { if (onDone) setTimeout(onDone, Math.max(0, afterMs)); };
      if (!a11ySettings.describeSounds || !text) {
        finish(minSec * 1000);
        return false;
      }
      if (gsScreenReaderOn()) {
        // The next step waits for the screen reader to finish the words
        // (tracker 22.8; it used to wait a fixed 1.5 s).
        const saidAt = performance.now();
        gsScreenReaderSay(text, { onDone: () => finish(minSec * 1000 - (performance.now() - saidAt)) });
        return true;
      }
      if (!gsCanSpeakAloud()) {
        announceScreenReader(text, { force: true, speak: false });
        finish(minSec * 1000);
        return true;
      }
      // If the speech engine never reports the end (some Android engines,
      // headless browsers), move on when the words should be over.
      const rate = Number(a11ySettings.speechRate) || 1;
      const maxWaitMs = Math.min(7000, (400 + text.length * 80) / rate);
      const spokeAt = performance.now();
      gsSpeak(text, {
        interrupt: true,
        maxWaitMs,
        onDone: () => finish(minSec * 1000 - (performance.now() - spokeAt))
      });
      return true;
    }

    /* The next step of an activity after a description: with nothing to say
     * it is an ordinary (cancellable) timer; after words, the words end it. */
    function gsDescribeThen(timers, text, fn, minSec, show = null) {
      if (!a11ySettings.describeSounds || !text) {
        // Off (Speech: Low): the result is still shown and read in its short
        // form, "Correct." or "Not correct.", as Settings and the App Guide
        // say; only the description of the sounds is left out (tracker 20.2).
        if (text && typeof show === "function") gsShowShortResult(gsShortResult(text), show);
        const id = setTimeout(fn, Math.max(0, minSec) * 1000);
        if (Array.isArray(timers)) timers.push(id);
        return;
      }
      gsDescribe(text, { onDone: fn, minSec });
    }

    /*
     * The moment that counts is the touch, not the lift (Cindi, Oct 16 2026;
     * tracker 20.9). Buttons still act on click, so a screen reader's
     * double-tap and the keyboard keep working, but a timed button asks for
     * the moment the finger came down: the last pointerdown on that same
     * button, if it was within a few seconds and was not cancelled. With no
     * pointer sequence of its own (VoiceOver, TalkBack, a keyboard) the
     * click's own time is used. Each touch counts once.
     */
    let gsLastPress = null;
    document.addEventListener("pointerdown", (event) => {
      if (event.isPrimary === false) return;
      gsLastPress = { target: event.target, at: performance.now() };
    }, { capture: true, passive: true });
    document.addEventListener("pointercancel", () => { gsLastPress = null; }, { capture: true, passive: true });

    function gsPressTime(el) {
      const now = performance.now();
      const press = gsLastPress;
      gsLastPress = null;
      if (press && el && (press.target === el || el.contains(press.target)) && now - press.at >= 0 && now - press.at < 5000) {
        return press.at;
      }
      return now;
    }

    /* The first sentence of a result: "Not correct. It was longer." gives
     * "Not correct." */
    function gsShortResult(text) {
      const match = String(text || "").match(/^[^.]*\./);
      return match ? match[0] : String(text || "");
    }

    /* Shows the short result in the activity's status line and hands it to
     * the screen reader (and self-voicing), also in the quiet stretch. */
    function gsShowShortResult(short, show) {
      if (!short) return;
      try { show(short); } catch (error) { /* the screen is closing */ }
      announceScreenReader(short, { force: true });
    }

    /* "Within the margin." from a replay description that ends with the
     * verdict; "" when it has none. For Speech: Low (tracker 20.2). */
    function gsVerdictFromDescribe(describe) {
      const m = String(describe || "").match(/(within|outside) the margin\.$/);
      return m ? `${m[1] === "within" ? "Within" : "Outside"} the margin.` : "";
    }

    function gsVerdictWords(within) {
      return within ? "within the margin" : "outside the margin";
    }

    /* The margin on a practice screen, in words. The number of seconds shows
     * only with "Show user times" on: Cindi's rule is that nothing during
     * practice shows a number of seconds (tracker F2, build 15). */
    function gsMarginNote(marginSec, adaptive) {
      if (showDebug) return ` · margin ${Number(marginSec).toFixed(2)}s${adaptive ? " (adaptive)" : ""}`;
      return adaptive ? " · adaptive margin" : "";
    }

    /* ---------------- Replay bar (build 15) ----------------
     * A progress bar under the main button (and in the street pad) for the
     * length of every replay: the replay is a thing on screen of its own,
     * not just the button's label (Jonggi, 25 Oct 2026). It fills over the
     * replay; each sound leaves a mark where it played (your sound, the
     * sample, the chime or the pulse). The time in seconds appears only
     * with "Show user times" on. Screen readers skip it: they get the words. */
    const gsReplayBar = { rafId: null, startAt: 0, endAtSec: 0, events: [], next: 0, bars: [] };

    function gsReplayBarEls() {
      return [...document.querySelectorAll(".replay-bar")];
    }

    function gsReplayBarStop() {
      if (gsReplayBar.rafId !== null) {
        cancelAnimationFrame(gsReplayBar.rafId);
        gsReplayBar.rafId = null;
      }
      gsReplayBarEls().forEach((bar) => {
        bar.hidden = true;
        const fill = bar.querySelector(".replay-bar-fill");
        const ticks = bar.querySelector(".replay-bar-ticks");
        if (fill) fill.style.width = "0%";
        if (ticks) ticks.textContent = "";
      });
    }

    function gsReplayBarTick(event, totalSec) {
      const left = Math.max(0, Math.min(100, (event.timeSec / totalSec) * 100));
      const kind = event.type === "user" ? "tick-user"
        : event.type === "sample" ? "tick-sample"
          : event.feedbackType === "acceptable" ? "tick-ok" : "tick-outside";
      gsReplayBar.bars.forEach((bar) => {
        const ticks = bar.querySelector(".replay-bar-ticks");
        if (!ticks) return;
        const tick = document.createElement("span");
        tick.className = `replay-tick ${kind}`;
        tick.style.left = `${left}%`;
        if (event.type === "sample") {
          const hold = Number.isFinite(event.holdSec) ? event.holdSec : 0.2;
          tick.style.width = `${Math.max(1, Math.min(100 - left, (hold / totalSec) * 100))}%`;
        }
        ticks.appendChild(tick);
      });
    }

    function gsReplayBarStart(events, endAtSec, { append = false } = {}) {
      // In every output mode: the bar is the replay's place on the screen,
      // not the full-screen visual feedback (which stays an option).
      const clock = ensureAudioContext();
      if (append && gsReplayBar.rafId !== null) {
        const offset = clock.currentTime - gsReplayBar.startAt;
        gsReplayBar.events = [
          ...gsReplayBar.events,
          ...events.map((event) => ({ ...event, timeSec: event.timeSec + offset }))
        ].sort((a, b) => a.timeSec - b.timeSec);
        gsReplayBar.endAtSec = Math.max(gsReplayBar.endAtSec, endAtSec + offset);
        return;
      }
      gsReplayBarStop();
      gsReplayBar.startAt = clock.currentTime;
      gsReplayBar.endAtSec = Math.max(0.1, endAtSec);
      gsReplayBar.events = [...events].sort((a, b) => a.timeSec - b.timeSec);
      gsReplayBar.next = 0;
      gsReplayBar.bars = gsReplayBarEls();
      gsReplayBar.bars.forEach((bar) => { bar.hidden = false; });

      const frame = () => {
        const elapsed = clock.currentTime - gsReplayBar.startAt;
        const total = gsReplayBar.endAtSec;
        while (gsReplayBar.next < gsReplayBar.events.length && elapsed >= gsReplayBar.events[gsReplayBar.next].timeSec) {
          gsReplayBarTick(gsReplayBar.events[gsReplayBar.next], total);
          gsReplayBar.next += 1;
        }
        const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
        const label = showDebug ? `${Math.max(0, elapsed).toFixed(1)} s of ${total.toFixed(1)} s` : "Replay";
        gsReplayBar.bars.forEach((bar) => {
          const fill = bar.querySelector(".replay-bar-fill");
          const text = bar.querySelector(".replay-bar-label");
          if (fill) fill.style.width = `${pct}%`;
          if (text && text.textContent !== label) text.textContent = label;
        });
        if (elapsed >= total) {
          gsReplayBarStop();
          return;
        }
        gsReplayBar.rafId = requestAnimationFrame(frame);
      };
      gsReplayBar.rafId = requestAnimationFrame(frame);
    }

    function visualOutputEnabled() {
      return a11ySettings.outputMode !== "audio-only";
    }

    function applyDebugAccessibility() {
      debugText.setAttribute("aria-live", showDebug ? "polite" : "off");
      debugText.setAttribute("aria-hidden", showDebug ? "false" : "true");
      if (!showDebug) debugText.textContent = "";
    }

    function lockModeSelection(lock) {
      modeInputs.forEach((input) => { input.disabled = lock; });
    }

    function setActionButtonLabel(label) {
      actionBtnLabel.textContent = label;
      actionBtn.setAttribute("aria-label", label);
    }

    function setActionButtonHint(hint) {
      actionBtnHint.textContent = hint;
      actionBtnHint.style.display = hint ? "" : "none";
    }

    function resetState(message = "Ready.") {
      gsKeepAwakeFor("practice", false);
      practiceReplayToken += 1;
      clearTimeout(exemplarTimeout);
      clearExemplarVisuals();
      suppressSrAnnouncements = false;
      markerTimes = [];
      stage = 0;
      started = false;
      gsSetBusy(actionBtn, false);
      actionBtn.classList.remove("running");
      actionBtn.classList.add("idle");
      setActionButtonLabel("Begin");
      setActionButtonHint("Tap when you step off");
      setStatus(message);
      updateNextPrompt();
      debugText.textContent = "";
      updateMarkerStates();
      lockModeSelection(false);
      lockSettings(false);
      setActionButtonStageByLabel("");
    }

    function updateNextPrompt(justMarkedLabel = "") {
      if (!started) {
        if (!refreshTimingRequirementPrompt()) {
          setStatus("");
          return;
        }
        setStatus("");
        return;
      }
      const labels = modes[currentMode].labels;
      const nextLabel = labels[stage] || "Next";
      // The old build emitted a "Marker recorded" banner and then overwrote it
      // on the very next statement, so it was never actually readable. Both
      // facts now live in one message.
      const prefix = justMarkedLabel ? `${justMarkedLabel} marked. ` : "";
      setStatus(`${prefix}Press Mark for ${nextLabel}.`);
    }

    /* ---------------- Practice flow ---------------- */
    function recordMarker(atMs = performance.now()) {
      if (!started) {
        if (!validateSetup()) return;
        started = true;
        gsKeepAwakeFor("practice", true);
        lockModeSelection(true);
        lockSettings(true);
        markerTimes = [0];
        stage = 1;
        setActionButtonLabel("Mark");
        setActionButtonHint("Tap at each point");
        playStudentTone();
        actionBtn.classList.remove("idle");
        actionBtn.classList.add("running");
        emitCue("start", { mode: currentMode });
        updateNextPrompt();
        updateMarkerStates();
        return;
      }

      const elapsed = Math.max(0, atMs - startTimestamp) / 1000;
      markerTimes.push(elapsed);
      playStudentTone();
      stage += 1;
      const markedLabel = modes[currentMode].labels[stage - 1];
      // skipBanner: the banner text is owned by updateNextPrompt / the replay
      // message below. Haptics and the screen-reader announcement still fire.
      emitCue("marker", { stageLabel: markedLabel, skipBanner: true });

      if (stage >= modes[currentMode].labels.length) {
        gsSetBusy(actionBtn, true);
        setActionButtonLabel("Replay");
        setActionButtonHint("Listen");
        setStatus("Replaying your markers and the reference.");
        updateMarkerStates();
        beginReplay();
      } else {
        updateNextPrompt(markedLabel);
        updateMarkerStates();
      }
    }

    function beginReplay() {
      const reference = getReferenceTimes();
      const labels = modes[currentMode].labels;
      clearExemplarVisuals();
      // Build 25 (tracker 22.8): with a screen reader the word "Replay" goes
      // through it first, and the replay is scheduled once it is over.
      const wordFirst = gsReplayWordFirst();
      emitCue("replay_start", { referenceTimes: reference, markerTimes, skipAnnounce: wordFirst });
      gsBeginQuiet();
      if (wordFirst) {
        const token = ++practiceReplayToken;
        const taps = markerTimes.slice();
        gsScreenReaderSay("Replay.", { onDone: () => {
          if (token === practiceReplayToken) scheduleReplay(0.5, reference, labels, taps);
          else logPracticeMarks(classifyPracticeMarks(reference, labels, taps));   // left during the word: still recorded
        } });
        return;
      }
      // "Replay" is said first and the tones wait for the word (build 15).
      // The word takes the place of most of the old lead-in: half a second of
      // silence after it, instead of a second and a half on top (build 18;
      // Azizul found the wait before the replay long).
      const intro = gsReplayIntro({ announced: true });
      scheduleReplay(intro > 0 ? intro + 0.5 : TEST_TUNING.replayLeadInSec, reference, labels, markerTimes);
    }

    /* The Practice attempt, mark by mark: the reference, the student's time
     * and whether it was within the margin. */
    function classifyPracticeMarks(reference, labels, taps) {
      return reference.slice(1).map((time, index) => {
        const label = labels[index + 1] || "Reference";
        const street = streetForLabel(label);
        return {
          time,
          index,
          label,
          street,
          userTime: taps[index + 1] ?? 0,
          ...classifyMark(taps[index + 1], time, street)
        };
      });
    }

    // Record every mark. Until build 13 Practice never wrote to the log, so
    // the Progress page stayed empty and the adaptive margin could not see it.
    function logPracticeMarks(marks) {
      if (typeof gsLogAttempt !== "function") return;
      marks.forEach(({ street, userTime, time, feedbackType, marginSec }) => {
        gsLogAttempt({
          activity: "practice",
          street,
          userSec: userTime,
          refSec: time,
          diffSec: userTime - time,
          correct: feedbackType === "acceptable",
          marginSec
        });
      });
    }

    function scheduleReplay(baseDelay, reference, labels, markerTimes) {
      const maxTime = Math.max(...markerTimes, ...reference);
      if (labels[0]) {
        exemplarVisualTimeouts.push(
          setTimeout(() => { setActionButtonStageByLabel(labels[0]); }, baseDelay * 1000)
        );
      }

      markerTimes.forEach((time) => {
        playStudentTone(baseDelay + time);
        // Vibrate at the user's own tap too. Without this a DeafBlind user
        // feels only the reference pulse, with nothing to compare it against —
        // and the gap between the two IS the feedback.
        exemplarVisualTimeouts.push(
          setTimeout(() => { hapticCue("marker"); }, (baseDelay + time) * 1000)
        );
      });

      if (showDebug) {
        const userTimes = markerTimes.map((time) => time.toFixed(2)).join(", ");
        const refTimes = reference.map((time) => time.toFixed(2)).join(", ");
        debugText.textContent = `User: ${userTimes}s | Ref: ${refTimes}s`;
      } else {
        debugText.textContent = "";
      }

      // One classification pass drives audio, visuals, cues, haptics and the
      // attempt log.
      const marks = classifyPracticeMarks(reference, labels, markerTimes);

      marks.forEach(({ time, index, label, diff, feedbackType }) => {
        playFeedbackTone(feedbackType, baseDelay + time);
        exemplarVisualTimeouts.push(
          setTimeout(() => { setActionButtonStageByLabel(labels[index + 1]); }, (baseDelay + time) * 1000)
        );
        const cueType = feedbackType === "acceptable" ? "reference_ok" : "reference_bad";
        exemplarVisualTimeouts.push(
          setTimeout(() => { emitCue(cueType, { stageLabel: label, diff }); }, (baseDelay + time) * 1000)
        );
      });

      const visualEvents = [
        ...markerTimes.map((time) => ({ timeSec: baseDelay + time, type: "user" })),
        ...marks.map(({ time, feedbackType }) => ({
          timeSec: baseDelay + time,
          type: "reference",
          feedbackType
        }))
      ];
      const replayDoneAtSec = maxTime + baseDelay + TEST_TUNING.replayEndPadSec;
      startSynchronizedVisualReplay(visualEvents, replayDoneAtSec);

      // Saved only after every replay sound and visual is scheduled: saving
      // rewrites the whole history, and anything scheduled after it came late
      // by that long, more so with a long history (tracker 20.10).
      logPracticeMarks(marks);

      clearTimeout(replayTimeout);
      // What the replay was, in words, once it is over (build 15): your taps,
      // then each crossing time with its verdict. Never a number of seconds.
      const verdicts = marks.map(({ label, feedbackType }) => `${label.toLowerCase()}: ${gsVerdictWords(feedbackType === "acceptable")}`);
      const describe = marks.length > 1
        ? `That was your taps, then ${verdicts.slice(0, -1).join(", ")}, and ${verdicts[verdicts.length - 1]}.`
        : `That was your taps, then the crossing time: ${gsVerdictWords(marks[0]?.feedbackType === "acceptable")}.`;
      replayTimeout = setTimeout(() => {
        suppressSrAnnouncements = false;
        resetState("Ready for another try.");
        renderPracticeScore();
        const said = a11ySettings.describeSounds && gsDescribe(`${describe} Ready for another try.`);
        // Off (Low): the verdict still shows and is read, in short (20.2).
        const shortVerdict = marks.length > 1 ? verdicts.join(", ") : gsVerdictWords(marks[0]?.feedbackType === "acceptable");
        const short = said ? "" : `${shortVerdict.replace(/^./, (c) => c.toUpperCase())}. Ready for another try.`;
        if (short) setStatus(short);
        emitCue("replay_end", { message: short || "Ready for another try.", skipAnnounce: Boolean(said) });
      }, replayDoneAtSec * 1000);
    }

    /* Score line under the practice button, like the one on Compare. */
    function renderPracticeScore() {
      const el = document.getElementById("practiceScore");
      if (!el || typeof gsHistoryFor !== "function") return;
      const adaptive = typeof gsAdaptiveEnabled === "function" && gsAdaptiveEnabled();
      // One line per mark the mode has: halfway-and-finish used to show the
      // halfway marks only (bug 29, Oct 17 2026).
      const labels = modes[currentMode].labels.slice(1);
      const parts = labels.map((label) => {
        const street = streetForLabel(label);
        const recent = gsHistoryFor("practice", street, 10);
        const within = recent.filter((entry) => entry.correct).length;
        const margin = marginFor("practice", street);
        const marginNote = gsMarginNote(margin, adaptive);
        const name = labels.length > 1 ? `${label}: ` : "";
        return recent.length
          ? `${name}Last ${recent.length}: ${within} within margin${marginNote}`
          : `${name}No attempts yet${marginNote}`;
      });
      el.textContent = parts.join(". ");
    }

    /*
     * Called by the shell on every screen change. Leaving Practice mid-run used
     * to leave Settings and Accessibility disabled on every other screen,
     * because Begin locks the shared app bar and only a finished replay
     * unlocked it. This also stops a replay that is still playing.
     */
    function cancelPractice() {
      const busy = started || gsIsBusy(actionBtn) || suppressSrAnnouncements;
      clearTimeout(replayTimeout);
      if (busy) resetState("Ready.");
    }

    /* ---------------- Cues ---------------- */
    function emitCue(type, detail = {}) {
      const messages = {
        start: "Started.",
        marker: `Marker recorded${detail.stageLabel ? `: ${detail.stageLabel}` : ""}.`,
        replay_start: "Replay.",
        replay_end: detail.message || "Ready for another try.",
        validation_error: detail.message || "Need more information to start.",
        reference_ok: `Reference: acceptable${detail.stageLabel ? ` for ${detail.stageLabel}` : ""}.`,
        reference_bad: `Reference: outside tolerance${detail.stageLabel ? ` for ${detail.stageLabel}` : ""}.`
      };
      // Named bannerTones, not tones — the module-level `tones` object holds
      // oscillator frequencies and must not be shadowed here.
      const bannerTones = {
        reference_ok: "ok",
        reference_bad: "warn",
        validation_error: "warn"
      };
      const message = messages[type] || "Updated.";

      // During replay the banner is the only visual channel a Deaf or
      // DeafBlind user has, so reference results are allowed through even
      // while screen-reader speech is suppressed.
      const isReplayResult = type === "reference_ok" || type === "reference_bad";
      const bannerAllowed = a11ySettings.showBanner && !detail.skipBanner &&
        (!suppressSrAnnouncements || isReplayResult);
      if (bannerAllowed) {
        cueBannerText.textContent = message;
        cueBanner.dataset.tone = bannerTones[type] || "neutral";
      }
      syncCueBannerVisibility();
      if (!detail.skipAnnounce) announceScreenReader(message);
      hapticCue(type);

      if (a11ySettings.flashAction && !prefersReducedMotion.matches) {
        actionBtn.classList.add("flash");
        clearTimeout(flashTimeout);
        flashTimeout = setTimeout(() => { actionBtn.classList.remove("flash"); }, 160);
      }
    }

    /* ---------------- Settings application ---------------- */
    function applyA11ySettings() {
      document.body.dataset.textSize = a11ySettings.textSize;
      document.documentElement.style.fontSize = `${18 * getTextSizeScale(a11ySettings.textSize)}px`;
      cueBannerText.classList.toggle("sr-only", !a11ySettings.useTextLabels);
      document.body.classList.toggle("high-contrast", a11ySettings.highContrast);
      document.body.classList.toggle("focus-boost", a11ySettings.focusBoost);
      const resolvedTheme = a11ySettings.theme === "system"
        ? (prefersDarkScheme.matches ? "dark" : "light")
        : a11ySettings.theme;
      document.body.dataset.theme = resolvedTheme;
      textSizeLandscapeHint.hidden = !["huge", "xl", "xxl", "max"].includes(a11ySettings.textSize);
      textSizeLandscapeHint.textContent = textSizeLandscapeHint.hidden
        ? ""
        : "At this size, portrait orientation keeps every control reachable.";
      syncCueBannerVisibility();
      applyLayoutMode();
      updateNativeStatusBar(resolvedTheme);
    }

    function updateNativeStatusBar(resolvedTheme) {
      const StatusBar = CapacitorGlobal?.Plugins?.StatusBar;
      if (!isNativeShell || !StatusBar) return;
      try {
        StatusBar.setStyle({ style: resolvedTheme === "light" ? "LIGHT" : "DARK" });
      } catch (error) {
        /* non-fatal */
      }
      updateAndroidWindowBackground();
    }

    /*
     * Android 15 and 16 draw the app edge to edge; Capacitor keeps the page
     * clear of the status and navigation bars with margins, and the window
     * background shows in them. It takes the page's own background colour,
     * so the strip above the header matches the theme and the status bar
     * icons (dark on light, light on dark) stay readable (build 15, 14.5).
     */
    function updateAndroidWindowBackground() {
      const GSAndroid = CapacitorGlobal?.Plugins?.GSAndroid;
      if (nativePlatform !== "android" || typeof GSAndroid?.setWindowBackground !== "function") return;
      const color = cssColorToHex(getComputedStyle(document.body).backgroundColor);
      if (!color) return;
      try {
        const result = GSAndroid.setWindowBackground({ color });
        if (result && typeof result.catch === "function") result.catch(() => {});
      } catch (error) {
        /* non-fatal */
      }
    }

    function cssColorToHex(value) {
      const m = /rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value || "");
      if (!m) return "";
      return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
    }

    function restoreStoredSettings() {
      const storedClear = localStorage.getItem("om-clear-time");
      const storedFull = localStorage.getItem("om-full-time");
      const storedMargin = localStorage.getItem("om-margin");
      const storedMode = localStorage.getItem("om-mode");
      const storedReplay = localStorage.getItem("om-replay-use-confirm");
      const storedDebug = localStorage.getItem("om-debug-replay");
      const storedOutputMode = localStorage.getItem("om-a11y-output-mode");
      const storedShowBanner = localStorage.getItem("om-a11y-show-banner");
      const storedFlashAction = localStorage.getItem("om-a11y-flash-action");
      const storedVibrate = localStorage.getItem("om-a11y-vibrate");
      const storedUseTextLabels = localStorage.getItem("om-a11y-use-text-labels");
      const storedTheme = localStorage.getItem("om-a11y-theme");
      const storedTextSize = localStorage.getItem("om-a11y-text-size");
      const storedHighContrast = localStorage.getItem("om-a11y-high-contrast");
      const storedFocusBoost = localStorage.getItem("om-a11y-focus-boost");
      const storedAnnounceCues = localStorage.getItem("om-a11y-announce-cues");
      const storedOutsideVisualVariant = localStorage.getItem("om-a11y-outside-visual-variant");
      const storedUserFlashContrast = localStorage.getItem("om-a11y-user-flash-contrast");
      const storedSelfVoice = localStorage.getItem("om-a11y-self-voice");
      const storedSpeechRate = Number(localStorage.getItem("om-a11y-speech-rate"));
      const storedSayReplay = localStorage.getItem("om-a11y-say-replay");
      const storedDescribeSounds = localStorage.getItem("om-a11y-describe-sounds");

      if (storedClear) clearTimeInput.value = storedClear;
      if (storedFull) fullTimeInput.value = storedFull;
      if (storedMargin) marginInput.value = storedMargin;
      if (instructorEmailInput) instructorEmailInput.value = localStorage.getItem("om-instructor-email") || "";
      if (instructorPhoneInput) instructorPhoneInput.value = sanitizePhone(localStorage.getItem("om-instructor-phone") || "");
      if (clientCodeInput) clientCodeInput.value = sanitizeClientCode(localStorage.getItem("om-client-code") || "");
      if (storedMode && modes[storedMode]) {
        currentMode = storedMode;
        modeInputs.forEach((input) => { input.checked = input.value === storedMode; });
      }
      replayUsesConfirmTone = storedReplay === "true";
      replayUsesConfirm.checked = replayUsesConfirmTone;
      showDebug = storedDebug === "true";
      debugToggle.checked = showDebug;
      applyDebugAccessibility();

      if (storedOutputMode) {
        a11ySettings.outputMode = storedOutputMode;
        outputModeInputs.forEach((input) => { input.checked = input.value === storedOutputMode; });
      }
      if (storedShowBanner) a11ySettings.showBanner = storedShowBanner === "true";
      if (storedFlashAction) a11ySettings.flashAction = storedFlashAction === "true";
      if (storedVibrate) a11ySettings.vibrate = storedVibrate === "true";
      if (storedUseTextLabels) a11ySettings.useTextLabels = storedUseTextLabels === "true";
      if (storedTheme) a11ySettings.theme = storedTheme;
      if (storedTextSize) a11ySettings.textSize = storedTextSize;
      if (storedHighContrast) a11ySettings.highContrast = storedHighContrast === "true";
      if (storedFocusBoost) a11ySettings.focusBoost = storedFocusBoost === "true";
      if (storedAnnounceCues) a11ySettings.announceCues = storedAnnounceCues === "true";
      if (storedSelfVoice) a11ySettings.selfVoice = storedSelfVoice === "true";
      if ([0.8, 1, 1.25].includes(storedSpeechRate)) a11ySettings.speechRate = storedSpeechRate;
      if (storedSayReplay) a11ySettings.sayReplay = storedSayReplay === "true";
      if (storedDescribeSounds) a11ySettings.describeSounds = storedDescribeSounds === "true";
      const storedVerbosity = localStorage.getItem("om-a11y-verbosity");
      if (["high", "medium", "low"].includes(storedVerbosity)) a11ySettings.verbosity = storedVerbosity;
      // No switch since build 20 (Cindi, 1 Nov 2026): the on-screen replay
      // follows the feedback mode. An old "off" no longer hides it.
      a11ySettings.syncVisualReplay = true;
      localStorage.removeItem("om-a11y-sync-visual-replay");
      if (storedOutsideVisualVariant === "up" || storedOutsideVisualVariant === "down") {
        a11ySettings.outsideVisualVariant = storedOutsideVisualVariant;
      }
      if (storedUserFlashContrast && VISUAL_USER_FLASH_COLORS[storedUserFlashContrast]) {
        a11ySettings.userFlashContrast = storedUserFlashContrast;
      }

      a11yShowBanner.checked = a11ySettings.showBanner;
      a11yFlashAction.checked = a11ySettings.flashAction;
      a11yVibrate.checked = a11ySettings.vibrate;
      a11yUseTextLabels.checked = a11ySettings.useTextLabels;
      outsideVisualVariantInputs.forEach((input) => {
        input.checked = input.value === a11ySettings.outsideVisualVariant;
      });
      userFlashContrastInputs.forEach((input) => {
        input.checked = input.value === a11ySettings.userFlashContrast;
      });
      a11yTheme.value = a11ySettings.theme;
      a11yTextSize.value = a11ySettings.textSize;
      a11yHighContrast.checked = a11ySettings.highContrast;
      a11yFocusBoost.checked = a11ySettings.focusBoost;
      a11yAnnounceCues.checked = a11ySettings.announceCues;
      if (a11ySelfVoice) a11ySelfVoice.checked = a11ySettings.selfVoice;
      if (a11ySpeechRate) a11ySpeechRate.value = String(a11ySettings.speechRate);
      if (a11ySayReplay) a11ySayReplay.checked = a11ySettings.sayReplay;
      if (a11yDescribeSounds) a11yDescribeSounds.checked = a11ySettings.describeSounds;
      if (a11yVerbosity) a11yVerbosity.value = a11ySettings.verbosity;
      applyA11ySettings();
    }

    /* ---------------- Event wiring ---------------- */
    actionBtn.addEventListener("click", () => {
      // A press during the replay or an exemplar does nothing; the button is
      // busy, not disabled, so VoiceOver keeps its place on it.
      if (gsIsBusy(actionBtn)) return;
      ensureAudioContext();
      const at = gsPressTime(actionBtn);
      if (!started) startTimestamp = at;
      recordMarker(at);
    });

    modeInputs.forEach((input) => { input.addEventListener("change", updateMode); });

    settingsTrigger.addEventListener("click", () => {
      lastDialogTrigger = settingsTrigger;
      lockPageScroll();
      setMainContentInert(true);
      settingsModal.showModal();
      settingsTitle.focus();
    });

    closeSettings.addEventListener("click", () => { settingsModal.close(); });

    a11yTrigger.addEventListener("click", () => {
      lastDialogTrigger = a11yTrigger;
      lockPageScroll();
      setMainContentInert(true);
      a11yModal.showModal();
      a11yTitle.focus();
    });

    closeA11y.addEventListener("click", () => { a11yModal.close(); });

    timingRequiredPromptButton.addEventListener("click", () => { openSettingsForTimingEntry(); });

    settingsModal.addEventListener("close", () => {
      settingsVisualPreview.dataset.active = "false";
      settingsVisualPreviewFlash.style.background = "transparent";
      settingsVisualPreviewShape.style.display = "none";
      if (!a11yModal.open) {
        unlockPageScroll();
        setMainContentInert(false);
      }
      lastDialogTrigger?.focus();
    });

    a11yModal.addEventListener("close", () => {
      if (!settingsModal.open) {
        unlockPageScroll();
        setMainContentInert(false);
      }
      lastDialogTrigger?.focus();
    });

    acceptableInputs.forEach((input) => {
      input.addEventListener("change", () => { storeSelection("acceptable", input.value); });
    });

    outsideInputs.forEach((input) => {
      input.addEventListener("change", () => { storeSelection("outside", input.value); });
    });

    previewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        ensureAudioContext();
        const soundId = button.dataset.sound;
        if (feedbackOptions.acceptable[soundId]) {
          playSoundOption(feedbackOptions.acceptable[soundId], 0, TEST_TUNING.feedbackVolume);
          return;
        }
        if (feedbackOptions.outside[soundId]) {
          playSoundOption(feedbackOptions.outside[soundId], 0, TEST_TUNING.feedbackVolume);
        }
      });
    });

    previewUserSoundBtn.addEventListener("click", () => {
      ensureAudioContext();
      playStudentTone(0);
    });

    visualPreviewButtons.forEach((button) => {
      button.addEventListener("click", () => { playVisualPreview(button.dataset.visualType); });
    });

    outsideVisualVariantInputs.forEach((input) => {
      input.addEventListener("change", () => {
        a11ySettings.outsideVisualVariant = input.value;
        localStorage.setItem("om-a11y-outside-visual-variant", a11ySettings.outsideVisualVariant);
      });
    });

    userFlashContrastInputs.forEach((input) => {
      input.addEventListener("change", () => {
        a11ySettings.userFlashContrast = input.value;
        localStorage.setItem("om-a11y-user-flash-contrast", a11ySettings.userFlashContrast);
      });
    });

    exemplarButtons.forEach((button) => {
      button.addEventListener("click", () => {
        ensureAudioContext();
        playExemplar(button.dataset.exemplarMode);
      });
    });

    replayUsesConfirm.addEventListener("change", () => {
      replayUsesConfirmTone = replayUsesConfirm.checked;
      localStorage.setItem("om-replay-use-confirm", String(replayUsesConfirmTone));
    });

    debugToggle.addEventListener("change", () => {
      showDebug = debugToggle.checked;
      localStorage.setItem("om-debug-replay", String(showDebug));
      applyDebugAccessibility();
      // The margin in seconds on the practice screens follows this switch (F2).
      renderPracticeScore();
      if (typeof gsSignalRenderScore === "function") gsSignalRenderScore();
      if (typeof gsCompareRenderScore === "function") gsCompareRenderScore();
    });

    clearTimeInput.addEventListener("input", () => { refreshTimingRequirementPrompt(); });
    clearTimeInput.addEventListener("change", () => {
      localStorage.setItem("om-clear-time", clearTimeInput.value);
      refreshTimingRequirementPrompt();
      updateNextPrompt();
    });

    fullTimeInput.addEventListener("input", () => { refreshTimingRequirementPrompt(); });
    fullTimeInput.addEventListener("change", () => {
      localStorage.setItem("om-full-time", fullTimeInput.value);
      refreshTimingRequirementPrompt();
      updateNextPrompt();
    });

    marginInput.addEventListener("change", () => {
      localStorage.setItem("om-margin", marginInput.value);
      renderPracticeScore();
    });

    instructorEmailInput?.addEventListener("change", () => {
      const email = getInstructorEmail();
      if (!isValidEmail(email)) {
        instructorEmailInput.setCustomValidity("Enter a valid email address, or leave it empty.");
        instructorEmailInput.reportValidity();
        return;
      }
      instructorEmailInput.setCustomValidity("");
      localStorage.setItem("om-instructor-email", email);
    });

    instructorPhoneInput?.addEventListener("change", () => {
      const phone = getInstructorPhone();
      instructorPhoneInput.value = phone;
      if (!isValidPhone(phone)) {
        instructorPhoneInput.setCustomValidity("Enter a mobile number with at least 7 digits, or leave it empty.");
        instructorPhoneInput.reportValidity();
        return;
      }
      instructorPhoneInput.setCustomValidity("");
      localStorage.setItem("om-instructor-phone", phone);
    });

    clientCodeInput?.addEventListener("input", () => {
      const cleaned = sanitizeClientCode(clientCodeInput.value);
      if (clientCodeInput.value !== cleaned) clientCodeInput.value = cleaned;
    });
    clientCodeInput?.addEventListener("change", () => {
      clientCodeInput.value = sanitizeClientCode(clientCodeInput.value);
      localStorage.setItem("om-client-code", clientCodeInput.value);
    });

    outputModeInputs.forEach((input) => {
      input.addEventListener("change", () => {
        a11ySettings.outputMode = input.value;
        localStorage.setItem("om-a11y-output-mode", input.value);
        applyA11ySettings();
      });
    });

    a11yShowBanner.addEventListener("change", () => {
      a11ySettings.showBanner = a11yShowBanner.checked;
      localStorage.setItem("om-a11y-show-banner", String(a11ySettings.showBanner));
      applyA11ySettings();
    });

    a11yFlashAction.addEventListener("change", () => {
      a11ySettings.flashAction = a11yFlashAction.checked;
      localStorage.setItem("om-a11y-flash-action", String(a11ySettings.flashAction));
    });

    a11yVibrate.addEventListener("change", () => {
      a11ySettings.vibrate = a11yVibrate.checked;
      localStorage.setItem("om-a11y-vibrate", String(a11ySettings.vibrate));
    });

    a11yUseTextLabels.addEventListener("change", () => {
      a11ySettings.useTextLabels = a11yUseTextLabels.checked;
      localStorage.setItem("om-a11y-use-text-labels", String(a11ySettings.useTextLabels));
      applyA11ySettings();
    });

    a11yTheme.addEventListener("change", () => {
      a11ySettings.theme = a11yTheme.value;
      localStorage.setItem("om-a11y-theme", a11ySettings.theme);
      applyA11ySettings();
    });

    a11yTextSize.addEventListener("change", () => {
      a11ySettings.textSize = a11yTextSize.value;
      localStorage.setItem("om-a11y-text-size", a11ySettings.textSize);
      applyA11ySettings();
    });

    a11yHighContrast.addEventListener("change", () => {
      a11ySettings.highContrast = a11yHighContrast.checked;
      localStorage.setItem("om-a11y-high-contrast", String(a11ySettings.highContrast));
      applyA11ySettings();
    });

    a11yFocusBoost.addEventListener("change", () => {
      a11ySettings.focusBoost = a11yFocusBoost.checked;
      localStorage.setItem("om-a11y-focus-boost", String(a11ySettings.focusBoost));
      applyA11ySettings();
    });

    a11yAnnounceCues.addEventListener("change", () => {
      a11ySettings.announceCues = a11yAnnounceCues.checked;
      localStorage.setItem("om-a11y-announce-cues", String(a11ySettings.announceCues));
    });

    a11ySelfVoice?.addEventListener("change", () => {
      a11ySettings.selfVoice = a11ySelfVoice.checked;
      localStorage.setItem("om-a11y-self-voice", String(a11ySettings.selfVoice));
      if (a11ySettings.selfVoice) {
        gsSpeak(speechAvailable()
          ? "Speaking directions aloud is on."
          : "");
        if (!speechAvailable()) setStatus("Speech is not available on this device.", "warn");
      } else {
        gsStopSpeech();
      }
    });

    a11ySpeechRate?.addEventListener("change", () => {
      const rate = Number(a11ySpeechRate.value);
      a11ySettings.speechRate = [0.8, 1, 1.25].includes(rate) ? rate : 1;
      localStorage.setItem("om-a11y-speech-rate", String(a11ySettings.speechRate));
      gsSpeak("This is the speaking rate.");
    });

    /* Verbosity (build 20, Cindi 1 Nov 2026): High, Medium (what builds 15-19
     * did, the default) or Low. A level sets the replay word and the
     * spoken results; each can then be changed on its own. */
    a11yVerbosity?.addEventListener("change", () => {
      const level = ["high", "medium", "low"].includes(a11yVerbosity.value) ? a11yVerbosity.value : "medium";
      a11ySettings.verbosity = level;
      localStorage.setItem("om-a11y-verbosity", level);
      const more = level !== "low";
      a11ySettings.sayReplay = more;
      a11ySettings.describeSounds = more;
      localStorage.setItem("om-a11y-say-replay", String(more));
      localStorage.setItem("om-a11y-describe-sounds", String(more));
      if (a11ySayReplay) a11ySayReplay.checked = more;
      if (a11yDescribeSounds) a11yDescribeSounds.checked = more;
      gsSpeak({ high: "Verbosity high.", medium: "Verbosity medium.", low: "Verbosity low." }[level]);
    });

    a11ySayReplay?.addEventListener("change", () => {
      a11ySettings.sayReplay = a11ySayReplay.checked;
      localStorage.setItem("om-a11y-say-replay", String(a11ySettings.sayReplay));
      if (a11ySettings.sayReplay) gsSpeak("Replay");
    });

    a11yDescribeSounds?.addEventListener("change", () => {
      a11ySettings.describeSounds = a11yDescribeSounds.checked;
      localStorage.setItem("om-a11y-describe-sounds", String(a11ySettings.describeSounds));
      if (a11ySettings.describeSounds) gsSpeak("The app will announce results and describe the sounds.");
    });

    /*
     * A one-tap check that sound works, with the state of the sound engine in
     * words. If a tester hears nothing, the note tells us why.
     */
    soundTestBtn?.addEventListener("click", () => {
      if (a11ySettings.outputMode === "visual-only") {
        if (soundTestNote) soundTestNote.textContent = "Visual-only mode is on, so the app makes no sounds.";
        return;
      }
      if (nativeSound) {
        playCompositeTone(gsSamplePartials(), 1.0, 0.05, gsSampleLevel(), "steady");
        playFeedbackTone("acceptable", 1.3);
        setTimeout(async () => {
          const status = await gsNativeAudioStatus();
          if (!soundTestNote || !status) return;
          const parts = [
            status.engineRunning ? "Sound is on." : "Sound engine stopped.",
            status.ignoresSilentSwitch ? "It plays even with the silent switch on." : "The silent switch may mute it.",
            `Phone volume ${Math.round((status.outputVolume || 0) * 100)}%.`
          ];
          soundTestNote.textContent = parts.join(" ");
          announceScreenReader(soundTestNote.textContent);
        }, 400);
        return;
      }
      const context = ensureAudioContext();
      const note = () => {
        if (!soundTestNote) return;
        const state = context.state === "running" ? "on" : context.state;
        soundTestNote.textContent = `Sound engine: ${state}. You should hear a steady tone, then a chime.`;
      };
      const play = () => {
        playCompositeTone(gsSamplePartials(), 1.0, 0.05, gsSampleLevel(), "steady");
        playFeedbackTone("acceptable", 1.3);
        note();
      };
      if (context.state !== "running") {
        context.resume().then(play).catch(play);
      } else {
        play();
      }
    });

    hapticsTestBtn.addEventListener("click", () => {
      if (!hapticsAvailable()) {
        setStatus("No haptics available on this platform.", "warn");
        announceScreenReader("No haptics available on this platform.");
        return;
      }
      const wasEnabled = a11ySettings.vibrate;
      a11ySettings.vibrate = true;
      hapticCue("marker");
      setTimeout(() => { hapticCue("reference_ok"); }, 420);
      setTimeout(() => {
        hapticCue("reference_bad");
        a11ySettings.vibrate = wasEnabled;
      }, 900);
      setStatus("Playing three test pulses: marker, acceptable, outside.");
      announceScreenReader("Playing three test pulses: marker, acceptable, outside.");
    });

    prefersDarkScheme.addEventListener("change", () => {
      if (a11ySettings.theme === "system") applyA11ySettings();
    });

    window.addEventListener("hashchange", () => {
      if (!importSharedTimingSettings()) return;
      if (pendingStatusMessage) {
        setStatus(pendingStatusMessage);
        announceScreenReader(pendingStatusMessage);
      }
      offerOpenInApp();
    });

    window.addEventListener("resize", syncViewportHeight);
    window.visualViewport?.addEventListener("resize", syncViewportHeight);
    window.visualViewport?.addEventListener("scroll", syncViewportHeight);

    numberInputs.forEach((input) => {
      input.addEventListener("focus", () => {
        setTimeout(() => { input.select(); }, 0);
      });
    });

    /* ------------------------------------------------------------------
     * iOS silent-switch keep-alive.
     * On iOS, WebKit plays Web Audio through its own *ambient* session, which
     * obeys the hardware silent switch no matter what the host app sets. But
     * once a media element is playing, WebKit moves to a *playback* session
     * and the Web Audio tones follow. So: loop a silent clip, started from the
     * first user gesture (autoplay rules require it). It pauses whenever the
     * page is hidden, so it costs nothing in the background. For a tool used
     * at a curb with the switch flipped, this is the difference between
     * hearing the cues and hearing nothing.
     * ------------------------------------------------------------------ */
    const isApplePlatform = isNativeShell || /iPhone|iPad|iPod/.test(navigator.userAgent);
    let silentKeepAlive = null;

    function buildSilentWavUrl() {
      // 0.5 s of 8 kHz 8-bit mono silence; tiny and unambiguous.
      const sampleRate = 8000, samples = 4000;
      const buf = new ArrayBuffer(44 + samples);
      const v = new DataView(buf);
      const str = (o, t) => { for (let i = 0; i < t.length; i += 1) v.setUint8(o + i, t.charCodeAt(i)); };
      str(0, "RIFF"); v.setUint32(4, 36 + samples, true); str(8, "WAVE");
      str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate, true);
      v.setUint16(32, 1, true); v.setUint16(34, 8, true);
      str(36, "data"); v.setUint32(40, samples, true);
      new Uint8Array(buf, 44).fill(128);
      return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
    }

    function startSilentKeepAlive() {
      if (!isApplePlatform || silentKeepAlive) return;
      try {
        const audio = new Audio(buildSilentWavUrl());
        audio.loop = true;
        audio.volume = 0.01; // not 0: some WebKit builds treat volume 0 as not playing
        audio.setAttribute("playsinline", "");
        audio.play().catch(() => { /* best effort */ });
        silentKeepAlive = audio;
      } catch (error) {
        /* best effort */
      }
    }

    document.addEventListener("visibilitychange", () => {
      if (!silentKeepAlive) return;
      if (document.hidden) silentKeepAlive.pause();
      else silentKeepAlive.play().catch(() => {});
    });

    /*
     * Keep the screen awake while a full-screen pad is open: at the street a
     * student may wait minutes for a vehicle, and a locked phone would stop
     * the pad from taking the swipe. The iPhone app sets the idle timer; the
     * web and Android builds use the Screen Wake Lock API when they have it.
     */
    let gsWakeLock = null;
    let gsWakeWanted = false;

    /* Several reasons can each keep the screen awake: an open pad, and a try
     * from its start until its replay ends, in all four activities. A long
     * sample on a wide street passes the 30-second auto-lock, and a locked
     * screen hides the app and throws the try away (tracker 20.12). */
    /*
     * Something took the sound away in the middle of a try without hiding
     * the app: Siri, an incoming-call banner, an alarm, another app's sound,
     * headphones or hearing aids connecting or dropping (tracker 20.11). The
     * sample's length is no longer what the student heard, so the activity
     * in progress cancels the try, unrecorded, as it does when the app is
     * hidden. Each activity listens for this event.
     */
    function gsAudioInterrupted(reason) {
      const at = performance.now();
      if (gsAudioInterrupted.lastAt && at - gsAudioInterrupted.lastAt < 300) return;
      gsAudioInterrupted.lastAt = at;
      try { window.dispatchEvent(new CustomEvent("gs-audio-interrupted", { detail: { reason } })); } catch (error) { /* ignore */ }
    }

    function gsKeepAwakeFor(reason, on) {
      // Kept on the function itself: this can run while the app is still
      // starting, before the variables above exist.
      const reasons = gsKeepAwakeFor.reasons || (gsKeepAwakeFor.reasons = new Set());
      if (on) reasons.add(reason);
      else reasons.delete(reason);
      try {
        const want = reasons.size > 0;
        if (want !== gsWakeWanted) gsKeepAwake(want);
      } catch (error) { /* still starting: nothing is awake yet */ }
    }
    async function gsKeepAwake(on) {
      gsWakeWanted = Boolean(on);
      if (isNativeShell && nativePlatform === "ios" && typeof GSNativePlugin?.keepAwake === "function") {
        nativeCall("keepAwake", { on: gsWakeWanted });
        return;
      }
      try {
        if (gsWakeWanted && !gsWakeLock && navigator.wakeLock) {
          const lock = await navigator.wakeLock.request("screen");
          // The pad may have closed while the phone was answering.
          if (!gsWakeWanted) {
            await lock.release();
            return;
          }
          gsWakeLock = lock;
          gsWakeLock.addEventListener?.("release", () => { gsWakeLock = null; });
        } else if (!gsWakeWanted && gsWakeLock) {
          const lock = gsWakeLock;
          gsWakeLock = null;
          await lock.release();
        }
      } catch (error) {
        gsWakeLock = null;
      }
    }
    document.addEventListener("visibilitychange", () => {
      // The system drops a wake lock when the app is hidden; take it again.
      if (!document.hidden && gsWakeWanted) gsKeepAwake(true);
      // A practice run cannot continue meaningfully from the background, and
      // a replay or exemplar hidden half way used to leave its remaining
      // sounds scheduled (bug 31, Oct 2026). "Busy" is what cancelPractice
      // itself treats as busy: a run in progress, or the button held
      // disabled while a replay or exemplar plays.
      if (document.hidden && typeof cancelPractice === "function") {
        const running = typeof started !== "undefined" && started;
        const busy = running || (typeof actionBtn !== "undefined" && gsIsBusy(actionBtn));
        if (busy) {
          cancelPractice();
          if (typeof stopAllSound === "function") stopAllSound();
        }
        if (running) pendingStatusMessage = "The app was hidden, so that run was not recorded.";
      }
    });

    /*
     * Build 24 (tracker 22.7): no volume tip. Design (Cindi, Nov 4 and 7
     * 2026): the app does not tell the user to raise the phone's volume; a
     * spoken tip cannot help someone whose volume is too low to hear it, and
     * some students use the app visually and need no sound. "Play a test
     * sound" under Accessibility is there for anyone who wants to check.
     */

    async function gsNativeAudioStatus() {
      if (!nativeSound || typeof GSNativePlugin?.audioStatus !== "function") return null;
      try {
        return await GSNativePlugin.audioStatus();
      } catch (error) {
        return null;
      }
    }

    /*
     * The headphone delay changes when AirPods connect or disconnect, which
     * need not change the volume. Comparison preparation reads it again on
     * every Ready, before the wait, so the attempt is judged with the delay
     * of the headphones in use now (bug 19, Oct 17 2026).
     */
    async function gsRefreshOutputLatency() {
      const status = await gsNativeAudioStatus();
      if (!status || !Number.isFinite(status.outputLatency)) return;
      nativeOutputLatency = status.outputLatency;
      if (audioContext && nativeSound) audioContext.outputLatency = nativeOutputLatency;
    }

    /* The output delay is read again whenever the sound route may have
     * changed. Nothing is shown or said about the volume (22.7). */
    async function gsRefreshAudioStatus() {
      const status = await gsNativeAudioStatus();
      if (status && Number.isFinite(status.outputLatency)) nativeOutputLatency = status.outputLatency;
    }
    if (nativeSound && typeof GSNativePlugin?.addListener === "function") {
      try {
        // The iPhone app says when a call, Siri or an alarm takes the sound,
        // or the output changes (AirPods, hearing aids) (tracker 20.11).
        GSNativePlugin.addListener("audioInterrupted", (event) => { gsAudioInterrupted(event?.reason || "native"); });
      } catch (error) { /* older app: the web clock check still runs */ }
      try {
        GSNativePlugin.addListener("volume", () => { gsRefreshAudioStatus(); });
      } catch (error) {
        /* the check on returning to the app still runs */
      }
    }
    // Checked again on returning to the app, in case headphones changed.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) gsRefreshAudioStatus();
    });

    const unlockAudio = () => {
      warmUpAudio();
      gsRefreshAudioStatus();
      // Only the native shell on iOS 16 needs the keep-alive. From iOS 17 the
      // web view takes navigator.audioSession.type = "playback" instead (see
      // configureWebAudioSession), and a looping media element alongside Web
      // Audio is one more thing that can take the audio route. In Safari on
      // the web a playing media element would silence the user's own music.
      if (isNativeShell && nativePlatform === "ios" && !navigator.audioSession && !nativeSound) startSilentKeepAlive();
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
    document.addEventListener("pointerdown", unlockAudio, { once: true });
    document.addEventListener("keydown", unlockAudio, { once: true });

    shareTimingSettingsBtn.addEventListener("click", () => { copyShareTimingLink(); });
    textSetupBtn?.addEventListener("click", () => { textSetupToStudent(); });

    copySetupTimingMessageBtn.addEventListener("click", async () => {
      if (!validateShareSetup()) return;
      populateShareMessagePreviews();
      await copyTextToClipboard(setupTimingMessage.value);
      setShareNote("Copied the setup message.");
    });

    copyPracticeTimingMessageBtn.addEventListener("click", async () => {
      populateShareMessagePreviews();
      await copyTextToClipboard(practiceTimingMessage.value);
      setShareNote("Copied the practice link.");
    });

    // Keep the previews current while the instructor changes what to include.
    ["shareIncludeTimes", "shareIncludeContact", "shareIncludeFeatures"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => {
        if (setupTimingMessage.value) populateShareMessagePreviews();
      });
    });

    /* ---------------- Boot ---------------- */
    syncViewportHeight();
    importSharedTimingSettings();
    bindNativeAppUrls();
    applyStoredSelections();
    restoreStoredSettings();
    renderMarkers();
    updateNextPrompt();
    hapticsSupportNote.textContent = describeHapticsSupport();

    if (pendingStatusMessage) {
      // Shown, not announced on its own at launch (tracker 22.1): VoiceOver
      // reads it where it is. Self-voicing still says it, once the app knows
      // that no screen reader is running.
      const message = pendingStatusMessage;
      setStatus(message);
      gsScreenReaderKnown.then(() => { if (gsSelfVoiceOn() && !document.hidden) gsSpeak(message); });
    }

    // Is VoiceOver or TalkBack on? Asked at start and whenever the app comes
    // back to the front (build 15: the replay word and the descriptions go
    // to the screen reader when there is one, else the app speaks them).
    gsRefreshScreenReader();
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) gsRefreshScreenReader();
    });

    // Offline support for the web/PWA build. Harmless inside the native shell,
    // where files are already local.
    if ("serviceWorker" in navigator && location.protocol !== "file:" && !isNativeShell) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
          .then((registration) => registration.update())
          .catch(() => { /* offline is best-effort */ });
      });
      // When an updated worker takes over a page that an older worker served,
      // reload once so the tester sees the new version straight away.
      const hadController = Boolean(navigator.serviceWorker.controller);
      let reloadedForUpdate = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController || reloadedForUpdate) return;
        reloadedForUpdate = true;
        window.location.reload();
      });
    }

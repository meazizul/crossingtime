package com.gapsense.crossingpractice;

import android.content.Context;
import android.content.res.Configuration;
import android.media.AudioDeviceCallback;
import android.media.AudioDeviceInfo;
import android.os.Vibrator;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.AudioPlaybackConfiguration;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.Window;
import android.view.accessibility.AccessibilityManager;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import androidx.core.graphics.ColorUtils;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/*
 * Android-only helpers for the web app.
 *
 * setWindowBackground (build 15, tracker 14.5): with Android 15 and 16 the app
 * is drawn edge to edge, and Capacitor keeps the page clear of the status and
 * navigation bars by adding margins around the web view. What shows in those
 * margins is the window background, white by default, so on the dark theme
 * the strip above the header stayed white and the light status bar icons on
 * it could not be seen. The page tells us its background colour whenever its
 * theme is applied, and the window takes the same colour.
 *
 * accessibilityStatus (build 15): is TalkBack (touch exploration) on? The
 * page then hands the replay word and the sound descriptions to TalkBack's
 * own voice instead of speaking them itself.
 *
 * speak / stopSpeaking (build 15): the Android web view has no web speech
 * engine, so everything the app says ("Get ready", "Replay", the directions,
 * the descriptions) goes through Android's own text-to-speech here. speak
 * resolves when the utterance is over, or at once if there is no engine.
 */
@CapacitorPlugin(name = "GSAndroid")
public class GSAndroidPlugin extends Plugin {

    private TextToSpeech tts;
    private boolean ttsReady = false;
    private boolean ttsFailed = false;
    private boolean ttsStarting = true;
    private Runnable pendingSpeak = null;
    private AudioDeviceCallback deviceCallback;
    private boolean devicesSeen = false;
    private final Handler speechHandler = new Handler(Looper.getMainLooper());
    private int utteranceCounter = 0;
    private final Map<String, PluginCall> speaking = new ConcurrentHashMap<>();
    private AccessibilityManager accessibilityManager;
    private AccessibilityManager.TouchExplorationStateChangeListener touchListener;
    private AccessibilityManager.AccessibilityStateChangeListener stateListener;

    @Override
    public void load() {
        super.load();
        // Build 27 (tracker 22.5): the page applies the phone's font size
        // itself ("Same as my phone"), so the web view must not scale the
        // text a second time.
        try {
            getActivity().runOnUiThread(() -> {
                try { getBridge().getWebView().getSettings().setTextZoom(100); } catch (Exception ignored) { }
            });
        } catch (Exception ignored) { }
        // Build 28 (tracker 27.25): the phone's font size, there before the
        // page first draws, so the first screen is the right size at once.
        try {
            getBridge().getWebView().addJavascriptInterface(new Object() {
                @JavascriptInterface
                public float textScale() {
                    try { return getContext().getResources().getConfiguration().fontScale; } catch (RuntimeException error) { return 1f; }
                }
            }, "GSAndroidStart");
        } catch (Exception ignored) { }
        // Build 28 (tracker 27.18): headphones, Bluetooth or hearing aids
        // connecting or dropping while a sound is being timed. The page
        // cancels the try, as the iPhone app already does. The first report,
        // which Android sends for the outputs already there, is skipped.
        try {
            final AudioManager audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (audio != null) {
                deviceCallback = new AudioDeviceCallback() {
                    @Override public void onAudioDevicesAdded(AudioDeviceInfo[] added) { routeChanged(added); }
                    @Override public void onAudioDevicesRemoved(AudioDeviceInfo[] removed) { routeChanged(removed); }
                };
                audio.registerAudioDeviceCallback(deviceCallback, speechHandler);
            }
        } catch (RuntimeException ignored) { }
        try {
            tts = new TextToSpeech(getContext(), status -> {
                if (status == TextToSpeech.SUCCESS && tts != null) {
                    // Build 28 (tracker 27.15): the phone's own English when
                    // it is set to English (UK, Australia, India), else US.
                    Locale phone = Locale.getDefault();
                    int lang = TextToSpeech.LANG_NOT_SUPPORTED;
                    if (phone != null && "en".equals(phone.getLanguage())) lang = tts.setLanguage(phone);
                    if (lang == TextToSpeech.LANG_MISSING_DATA || lang == TextToSpeech.LANG_NOT_SUPPORTED) lang = tts.setLanguage(Locale.US);
                    ttsReady = lang != TextToSpeech.LANG_MISSING_DATA && lang != TextToSpeech.LANG_NOT_SUPPORTED;
                    ttsFailed = !ttsReady;
                    tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override public void onStart(String id) { }
                        @Override public void onDone(String id) { finish(id); }
                        @Override public void onError(String id) { finish(id); }
                        @Override public void onError(String id, int code) { finish(id); }
                        @Override public void onStop(String id, boolean interrupted) { finish(id); }
                    });
                } else {
                    ttsFailed = true;
                }
                ttsStarting = false;
                // Anything asked for while the engine was starting (the first
                // "Get ready" after a cold start) is spoken now, or reported
                // as not spoken.
                Runnable waiting = pendingSpeak;
                pendingSpeak = null;
                if (waiting != null) speechHandler.post(waiting);
            });
        } catch (RuntimeException error) {
            ttsFailed = true;
            ttsStarting = false;
        }
        // Build 24 (tracker 22.2): tell the page whenever TalkBack is turned on
        // or off, so the app changes at once instead of on the next launch.
        try {
            accessibilityManager = (AccessibilityManager) getContext().getSystemService(Context.ACCESSIBILITY_SERVICE);
            if (accessibilityManager != null) {
                touchListener = enabled -> notifyScreenReader();
                stateListener = enabled -> notifyScreenReader();
                accessibilityManager.addTouchExplorationStateChangeListener(touchListener);
                accessibilityManager.addAccessibilityStateChangeListener(stateListener);
            }
        } catch (RuntimeException ignored) { }
    }

    private boolean screenReaderOn() {
        try {
            AccessibilityManager manager = accessibilityManager != null
                ? accessibilityManager
                : (AccessibilityManager) getContext().getSystemService(Context.ACCESSIBILITY_SERVICE);
            return manager != null && manager.isEnabled() && manager.isTouchExplorationEnabled();
        } catch (RuntimeException error) {
            return false;
        }
    }

    private void notifyScreenReader() {
        com.getcapacitor.JSObject data = new com.getcapacitor.JSObject();
        data.put("screenReader", screenReaderOn());
        notifyListeners("screenReader", data);
    }

    private void finish(String id) {
        PluginCall call = speaking.remove(id);
        if (call != null) resolveSpoken(call, true);
    }

    /* Tracker 27.15: the page must know when nothing was said, so the words
     * can reach the student another way. */
    private void resolveSpoken(PluginCall call, boolean spoken) {
        com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
        result.put("spoken", spoken);
        call.resolve(result);
    }

    private void routeChanged(AudioDeviceInfo[] devices) {
        if (!devicesSeen) { devicesSeen = true; return; }
        boolean output = false;
        if (devices != null) {
            for (AudioDeviceInfo device : devices) {
                if (device != null && device.isSink()) { output = true; break; }
            }
        }
        if (!output) return;
        com.getcapacitor.JSObject data = new com.getcapacitor.JSObject();
        data.put("reason", "route");
        notifyListeners("audioInterrupted", data);
    }

    /* Tracker 27.25: Font size, Display size or Bold text changed while the
     * app is open. The activity now stays (see the manifest), and the page is
     * told the new size. */
    @Override
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        super.handleOnConfigurationChanged(newConfig);
        try {
            com.getcapacitor.JSObject data = new com.getcapacitor.JSObject();
            data.put("scale", (double) newConfig.fontScale);
            notifyListeners("textScale", data);
        } catch (RuntimeException ignored) { }
    }

    @Override
    protected void handleOnDestroy() {
        if (accessibilityManager != null) {
            try {
                if (touchListener != null) accessibilityManager.removeTouchExplorationStateChangeListener(touchListener);
                if (stateListener != null) accessibilityManager.removeAccessibilityStateChangeListener(stateListener);
            } catch (RuntimeException ignored) { }
        }
        if (tts != null) {
            try { tts.stop(); tts.shutdown(); } catch (RuntimeException ignored) { }
            tts = null;
        }
        if (deviceCallback != null) {
            try {
                AudioManager audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
                if (audio != null) audio.unregisterAudioDeviceCallback(deviceCallback);
            } catch (RuntimeException ignored) { }
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        float rate = call.getFloat("rate", 1f);
        boolean interrupt = call.getBoolean("interrupt", true);
        final boolean accessibilityStream = "accessibility".equals(call.getString("usage", ""));
        if (text == null || text.isEmpty()) {
            resolveSpoken(call, false);
            return;
        }
        if (tts != null && !ttsReady && !ttsFailed && ttsStarting) {
            // Still starting (27.15): wait for it, for 3 seconds at most. A
            // newer request replaces an older one that is still waiting.
            final Runnable retry = () -> speak(call);
            pendingSpeak = retry;
            speechHandler.postDelayed(() -> {
                if (pendingSpeak == retry) {
                    pendingSpeak = null;
                    resolveSpoken(call, false);
                }
            }, 3000);
            return;
        }
        if (tts == null || !ttsReady) {
            // No engine, or no English voice: say so, and the page shows the
            // words or hands them to the screen reader.
            resolveSpoken(call, false);
            return;
        }
        final String id = "gs-" + (++utteranceCounter);
        // Resolve the calls an interruption cuts short, so nothing waits on them.
        if (interrupt) {
            for (String pending : speaking.keySet()) finish(pending);
        }
        speaking.put(id, call);
        getActivity().runOnUiThread(() -> {
            try {
                tts.setSpeechRate(Math.max(0.5f, Math.min(2f, rate)));
                Bundle params = new Bundle();
                // Self-test only (build 25): speak as accessibility audio, the
                // way TalkBack's voice plays, so waitForSpeech can be checked
                // on a phone or emulator without TalkBack.
                if (accessibilityStream && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    params.putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_ACCESSIBILITY);
                }
                int queued = tts.speak(text, interrupt ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD, params, id);
                if (queued != TextToSpeech.SUCCESS) finish(id);
            } catch (RuntimeException error) {
                finish(id);
            }
        });
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        if (tts != null) {
            try { tts.stop(); } catch (RuntimeException ignored) { }
        }
        for (String pending : speaking.keySet()) finish(pending);
        call.resolve();
    }

    @PluginMethod
    public void speechStatus(PluginCall call) {
        com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
        result.put("ready", ttsReady);
        result.put("failed", ttsFailed);
        result.put("starting", ttsStarting && !ttsReady && !ttsFailed);
        call.resolve(result);
    }

    /* keepAwake (build 28, tracker 27.16): the screen stays on while a try or
     * a pad needs it, as on the iPhone. The web wake lock that was used until
     * now is refused under Battery Saver and by some web view versions. */
    @PluginMethod
    public void keepAwake(PluginCall call) {
        final boolean on = call.getBoolean("on", false);
        getActivity().runOnUiThread(() -> {
            try {
                Window window = getActivity().getWindow();
                if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
                result.put("on", on);
                call.resolve(result);
            } catch (RuntimeException error) {
                call.reject("keep awake failed");
            }
        });
    }

    /* deviceStatus (build 28, tracker 27.14): can this device vibrate at all?
     * A tablet often cannot, and the app used to say vibration was working. */
    @PluginMethod
    public void deviceStatus(PluginCall call) {
        com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
        boolean vibrator = true;
        try {
            Vibrator service = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
            vibrator = service != null && service.hasVibrator();
        } catch (RuntimeException ignored) { }
        result.put("hasVibrator", vibrator);
        call.resolve(result);
    }

    @PluginMethod
    public void setWindowBackground(PluginCall call) {
        String color = call.getString("color");
        if (color == null || color.isEmpty()) {
            call.reject("color is required");
            return;
        }
        final int parsed;
        try {
            parsed = Color.parseColor(color);
        } catch (IllegalArgumentException error) {
            call.reject("not a colour: " + color);
            return;
        }
        // Icons dark on a light colour, light on a dark one. Set here, with the
        // colour, so the two can never disagree whatever order the status bar
        // plugin and the page's own call land in at start-up.
        final boolean lightBackground = ColorUtils.calculateLuminance(parsed) > 0.5;
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            window.getDecorView().setBackgroundColor(parsed);
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setBackgroundColor(parsed);
            }
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(lightBackground);
            controller.setAppearanceLightNavigationBars(lightBackground);
        });
        call.resolve();
    }

    /*
     * textScale (build 27, tracker 22.5): the phone's font size, as a scale
     * (1.0 is standard). The page uses it for "Same as my phone" in its own
     * text size setting, so the app follows the size chosen in Android
     * settings by default.
     */
    @PluginMethod
    public void textScale(PluginCall call) {
        com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
        result.put("scale", (double) getContext().getResources().getConfiguration().fontScale);
        call.resolve(result);
    }

    @PluginMethod
    public void accessibilityStatus(PluginCall call) {
        com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
        result.put("screenReader", screenReaderOn());
        call.resolve(result);
    }

    /*
     * waitForSpeech (build 25, tracker 22.8): Android never tells an app when
     * TalkBack has finished reading something, but it does say which sounds
     * are playing and what they are for, and TalkBack's voice plays as
     * accessibility audio. After the page has handed TalkBack some text, this
     * waits for that audio to start and then to stay quiet for quietMs, and
     * resolves { heard: true }. If none starts within startWithinMs (TalkBack's
     * voice muted, an older phone, a phone that does not report it), it
     * resolves { heard: false } and the page keeps its estimate. maxMs is the
     * longest it ever waits.
     */
    private boolean accessibilityAudioPlaying(AudioManager audio) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false;
        try {
            for (AudioPlaybackConfiguration config : audio.getActivePlaybackConfigurations()) {
                AudioAttributes attributes = config.getAudioAttributes();
                if (attributes != null && attributes.getUsage() == AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY) return true;
            }
        } catch (RuntimeException ignored) { }
        return false;
    }

    @PluginMethod
    public void waitForSpeech(PluginCall call) {
        final int startWithinMs = call.getInt("startWithinMs", 2500);
        final int quietMs = call.getInt("quietMs", 450);
        final int maxMs = call.getInt("maxMs", 15000);
        final AudioManager audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audio == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
            result.put("heard", false);
            result.put("supported", false);
            call.resolve(result);
            return;
        }
        final long startedAt = SystemClock.uptimeMillis();
        speechHandler.post(new Runnable() {
            boolean heard = false;
            long lastPlayingAt = 0;

            private void finish(boolean ended) {
                com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
                result.put("heard", heard);
                result.put("ended", ended);
                result.put("ms", SystemClock.uptimeMillis() - startedAt);
                call.resolve(result);
            }

            @Override
            public void run() {
                long now = SystemClock.uptimeMillis();
                if (accessibilityAudioPlaying(audio)) {
                    heard = true;
                    lastPlayingAt = now;
                }
                if (heard && now - lastPlayingAt >= quietMs) { finish(true); return; }
                if (!heard && now - startedAt >= startWithinMs) { finish(false); return; }
                if (now - startedAt >= maxMs) { finish(false); return; }
                speechHandler.postDelayed(this, 50);
            }
        });
    }
}

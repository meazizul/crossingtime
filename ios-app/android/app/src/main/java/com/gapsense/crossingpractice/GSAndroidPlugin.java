package com.gapsense.crossingpractice;

import android.content.Context;
import android.graphics.Color;
import android.os.Bundle;
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
    private int utteranceCounter = 0;
    private final Map<String, PluginCall> speaking = new ConcurrentHashMap<>();
    private AccessibilityManager accessibilityManager;
    private AccessibilityManager.TouchExplorationStateChangeListener touchListener;
    private AccessibilityManager.AccessibilityStateChangeListener stateListener;

    @Override
    public void load() {
        super.load();
        try {
            tts = new TextToSpeech(getContext(), status -> {
                if (status == TextToSpeech.SUCCESS && tts != null) {
                    int lang = tts.setLanguage(Locale.US);
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
            });
        } catch (RuntimeException error) {
            ttsFailed = true;
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
        if (call != null) call.resolve();
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
        super.handleOnDestroy();
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        float rate = call.getFloat("rate", 1f);
        boolean interrupt = call.getBoolean("interrupt", true);
        if (text == null || text.isEmpty() || tts == null || !ttsReady) {
            // No engine (or not ready yet): the page's own timeout takes over.
            call.resolve();
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

    @PluginMethod
    public void accessibilityStatus(PluginCall call) {
        com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
        result.put("screenReader", screenReaderOn());
        call.resolve(result);
    }
}

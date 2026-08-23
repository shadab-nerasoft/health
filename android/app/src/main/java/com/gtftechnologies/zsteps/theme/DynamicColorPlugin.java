package com.gtftechnologies.zsteps.theme;

import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;

/**
 * Material You: hands the web layer Android's own dynamic colour palette.
 *
 * From Android 12 the system derives a full set of tonal palettes from the
 * user's wallpaper and exposes them as framework colour resources. Reading them
 * directly is better than deriving a palette from a single seed in JavaScript,
 * because these are the exact tones every other app on the device is using — so
 * ZSTEPS matches the system rather than merely resembling it.
 *
 * The resource suffixes run opposite to M3 tone numbers: suffix 0 is white and
 * 1000 is black, so tone T lives at suffix (1000 - T * 10).
 */
@CapacitorPlugin(name = "DynamicColor")
public class DynamicColorPlugin extends Plugin {

    /** M3 tone numbers, in the order TONE_RESOURCES lists their resources. */
    private static final int[] TONES = { 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100 };

    private static final int[] ACCENT1 = {
        android.R.color.system_accent1_1000, android.R.color.system_accent1_900,
        android.R.color.system_accent1_800, android.R.color.system_accent1_700,
        android.R.color.system_accent1_600, android.R.color.system_accent1_500,
        android.R.color.system_accent1_400, android.R.color.system_accent1_300,
        android.R.color.system_accent1_200, android.R.color.system_accent1_100,
        android.R.color.system_accent1_50, android.R.color.system_accent1_10,
        android.R.color.system_accent1_0,
    };

    private static final int[] ACCENT2 = {
        android.R.color.system_accent2_1000, android.R.color.system_accent2_900,
        android.R.color.system_accent2_800, android.R.color.system_accent2_700,
        android.R.color.system_accent2_600, android.R.color.system_accent2_500,
        android.R.color.system_accent2_400, android.R.color.system_accent2_300,
        android.R.color.system_accent2_200, android.R.color.system_accent2_100,
        android.R.color.system_accent2_50, android.R.color.system_accent2_10,
        android.R.color.system_accent2_0,
    };

    private static final int[] ACCENT3 = {
        android.R.color.system_accent3_1000, android.R.color.system_accent3_900,
        android.R.color.system_accent3_800, android.R.color.system_accent3_700,
        android.R.color.system_accent3_600, android.R.color.system_accent3_500,
        android.R.color.system_accent3_400, android.R.color.system_accent3_300,
        android.R.color.system_accent3_200, android.R.color.system_accent3_100,
        android.R.color.system_accent3_50, android.R.color.system_accent3_10,
        android.R.color.system_accent3_0,
    };

    private static final int[] NEUTRAL1 = {
        android.R.color.system_neutral1_1000, android.R.color.system_neutral1_900,
        android.R.color.system_neutral1_800, android.R.color.system_neutral1_700,
        android.R.color.system_neutral1_600, android.R.color.system_neutral1_500,
        android.R.color.system_neutral1_400, android.R.color.system_neutral1_300,
        android.R.color.system_neutral1_200, android.R.color.system_neutral1_100,
        android.R.color.system_neutral1_50, android.R.color.system_neutral1_10,
        android.R.color.system_neutral1_0,
    };

    private static final int[] NEUTRAL2 = {
        android.R.color.system_neutral2_1000, android.R.color.system_neutral2_900,
        android.R.color.system_neutral2_800, android.R.color.system_neutral2_700,
        android.R.color.system_neutral2_600, android.R.color.system_neutral2_500,
        android.R.color.system_neutral2_400, android.R.color.system_neutral2_300,
        android.R.color.system_neutral2_200, android.R.color.system_neutral2_100,
        android.R.color.system_neutral2_50, android.R.color.system_neutral2_10,
        android.R.color.system_neutral2_0,
    };

    @PluginMethod
    public void getPalette(PluginCall call) {
        JSObject result = new JSObject();
        boolean supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S;
        result.put("supported", supported);

        if (!supported) {
            // Pre-Android 12: no system palette. The web layer keeps its own
            // brand colours, which is the correct fallback rather than an error.
            call.resolve(result);
            return;
        }

        result.put("primary", palette(ACCENT1));
        result.put("secondary", palette(ACCENT2));
        result.put("tertiary", palette(ACCENT3));
        result.put("neutral", palette(NEUTRAL1));
        result.put("neutralVariant", palette(NEUTRAL2));
        call.resolve(result);
    }

    private JSObject palette(int[] resources) {
        JSObject tones = new JSObject();
        for (int index = 0; index < TONES.length; index += 1) {
            tones.put(String.valueOf(TONES[index]), hex(resources[index]));
        }
        return tones;
    }

    private String hex(int resourceId) {
        int color = ContextCompat.getColor(getContext(), resourceId);
        return String.format(Locale.US, "#%06X", color & 0xFFFFFF);
    }
}

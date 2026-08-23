package com.gtftechnologies.zsteps.stepcounter;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import com.gtftechnologies.zsteps.widget.StepWidgetProvider;

import org.json.JSONObject;

import java.util.Iterator;
import java.util.regex.Pattern;

/**
 * The only surface the web layer sees.
 *
 * It deliberately exposes step totals and a status object, and nothing else —
 * no SensorManager handle, no raw baseline arithmetic, no way for JavaScript to
 * write a step count. Native owns the number; the WebView reads it.
 */
@CapacitorPlugin(
    name = "StepCounter",
    permissions = {
        @Permission(alias = "activityRecognition", strings = { Manifest.permission.ACTIVITY_RECOGNITION }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class StepCounterPlugin extends Plugin implements StepTracker.StepListener {

    public static final String ACTIVITY_ALIAS = "activityRecognition";
    public static final String NOTIFICATIONS_ALIAS = "notifications";

    private static final Pattern DAY_KEY = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");
    private static final int MAX_HISTORY_DAYS = 120;

    private StepTracker tracker;

    @Override
    public void load() {
        tracker = StepTracker.getInstance(getContext());
        tracker.addListener(this);
    }

    @Override
    protected void handleOnResume() {
        // Re-attaching makes the sensor deliver its current cumulative value,
        // which is exactly how steps taken while the screen was off get folded in.
        if (tracker.store().isTracking()) tracker.start();
        notifyStatus();
    }

    @Override
    protected void handleOnPause() {
        // Nothing needs to stay attached: the hardware counter keeps running and
        // is reconciled on the next resume. The one exception is the opt-in
        // background service, which owns its own registration.
        if (!tracker.store().isBackgroundServiceEnabled()) tracker.detach();
    }

    @Override
    protected void handleOnDestroy() {
        tracker.removeListener(this);
    }

    // ------------------------------------------------------------------ status

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!tracker.isSensorAvailable()) {
            call.reject("This device has no step counter sensor.", "SENSOR_UNAVAILABLE");
            return;
        }
        if (!tracker.hasPermission()) {
            call.reject("Physical activity permission is required.", "PERMISSION_REQUIRED");
            return;
        }
        tracker.start();
        if (tracker.store().isBackgroundServiceEnabled()) StepCounterService.start(getContext());
        call.resolve(status());
    }

    @PluginMethod
    public void stop(PluginCall call) {
        tracker.stop();
        StepCounterService.stop(getContext());
        call.resolve(status());
    }

    // ------------------------------------------------------------------- reads

    @PluginMethod
    public void getTodaySteps(PluginCall call) {
        JSObject result = new JSObject();
        result.put("date", tracker.store().currentDayKey());
        result.put("steps", tracker.store().todaySteps());
        result.put("lastUpdated", tracker.store().lastUpdated());
        call.resolve(result);
    }

    @PluginMethod
    public void getSteps(PluginCall call) {
        String date = call.getString("date");
        if (date == null || !DAY_KEY.matcher(date).matches()) {
            call.reject("Expected a date in YYYY-MM-DD form.", "INVALID_ARGUMENT");
            return;
        }
        JSObject result = new JSObject();
        result.put("date", date);
        result.put("steps", tracker.store().stepsOn(date));
        call.resolve(result);
    }

    /**
     * Per-day totals for offline backfill. The web layer uses these to reconcile
     * days it never saw because the app was closed.
     */
    @PluginMethod
    public void getHistory(PluginCall call) {
        int days = call.getInt("days", 30);
        if (days < 1) days = 1;
        if (days > MAX_HISTORY_DAYS) days = MAX_HISTORY_DAYS;

        long now = System.currentTimeMillis();
        String cutoff = StepStore.dayKeyFor(StepStore.startOfDay(now) - (long) (days - 1) * 24 * 60 * 60 * 1000);

        JSObject dayTotals = new JSObject();
        JSONObject history = tracker.store().history();
        Iterator<String> keys = history.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            if (key.compareTo(cutoff) >= 0) dayTotals.put(key, history.optLong(key, 0L));
        }
        dayTotals.put(tracker.store().currentDayKey(), tracker.store().todaySteps());

        JSObject result = new JSObject();
        result.put("days", dayTotals);
        call.resolve(result);
    }

    /**
     * Push metrics the native layer cannot measure itself.
     *
     * Steps stay native-owned and are never writable from here. Water comes from
     * the web UI and heart rate from a Bluetooth monitor, so both are handed
     * down and cached for the widget and the ongoing notification, which have to
     * render while no WebView is alive.
     */
    @PluginMethod
    public void setMetrics(PluginCall call) {
        long stepGoal = clamp(call.getInt("stepGoal", 0), 0, 500000);
        long waterMl = clamp(call.getInt("waterMl", -1), -1, 50000);
        long waterGoalMl = clamp(call.getInt("waterGoalMl", 0), 0, 50000);
        int heartRate = (int) clamp(call.getInt("heartRate", 0), 0, 250);

        tracker.store().setMetrics(stepGoal, waterMl, waterGoalMl, heartRate);
        StepWidgetProvider.refresh(getContext());
        call.resolve(status());
    }

    /** Bridge input is untrusted; clamp rather than trusting the caller. */
    private long clamp(Integer value, long min, long max) {
        if (value == null) return min;
        return Math.max(min, Math.min(max, value.longValue()));
    }

    // -------------------------------------------------------------- permissions

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (tracker.hasPermission()) {
            call.resolve(status());
            return;
        }
        tracker.store().markPermissionRequested();
        requestPermissionForAlias(ACTIVITY_ALIAS, call, "activityPermissionCallback");
    }

    @PermissionCallback
    private void activityPermissionCallback(PluginCall call) {
        if (tracker.hasPermission() && tracker.store().isTracking()) tracker.start();
        call.resolve(status());
    }

    /** Deep-link to app settings, the only route back from a blocked permission. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    // -------------------------------------------------- optional background mode

    @PluginMethod
    public void setBackgroundService(PluginCall call) {
        Boolean requested = call.getBoolean("enabled");
        if (requested == null) {
            call.reject("Expected a boolean 'enabled'.", "INVALID_ARGUMENT");
            return;
        }

        if (requested) {
            if (!tracker.hasPermission()) {
                call.reject("Physical activity permission is required.", "PERMISSION_REQUIRED");
                return;
            }
            tracker.store().setBackgroundServiceEnabled(true);
            StepCounterService.start(getContext());
        } else {
            tracker.store().setBackgroundServiceEnabled(false);
            StepCounterService.stop(getContext());
        }
        call.resolve(status());
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve(status());
            return;
        }
        requestPermissionForAlias(NOTIFICATIONS_ALIAS, call, "notificationPermissionCallback");
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        call.resolve(status());
    }

    // ------------------------------------------------------------------ events

    @Override
    public void onStepsChanged(long todaySteps, long sensorTotal) {
        JSObject payload = new JSObject();
        payload.put("date", tracker.store().currentDayKey());
        payload.put("steps", todaySteps);
        payload.put("lastUpdated", System.currentTimeMillis());
        notifyListeners("stepsChanged", payload);
    }

    private void notifyStatus() {
        notifyListeners("statusChanged", status());
    }

    private JSObject status() {
        StepStore store = tracker.store();
        JSObject result = new JSObject();
        result.put("platform", "android");
        result.put("sensorAvailable", tracker.isSensorAvailable());
        result.put("permission", permissionState());
        result.put("tracking", store.isTracking() && tracker.isRegistered());
        result.put("trackingEnabled", store.isTracking());
        result.put("backgroundService", store.isBackgroundServiceEnabled());
        result.put("steps", store.todaySteps());
        result.put("date", store.currentDayKey());
        result.put("trackingStartDate", store.trackingStartDate());
        result.put("lastUpdated", store.lastUpdated());
        result.put("lastEvent", store.lastEvent());
        result.put("calories", store.caloriesToday());
        result.put("waterMl", store.waterMl());
        result.put("heartRate", store.heartRate());
        return result;
    }

    /**
     * granted / prompt / denied / blocked.
     *
     * "blocked" means Android will no longer show the system dialog, so the UI
     * has to send the user to app settings instead of asking again.
     */
    private String permissionState() {
        if (tracker.hasPermission()) return "granted";
        if (!tracker.store().hasRequestedPermission()) return "prompt";
        if (getActivity() != null
            && !ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.ACTIVITY_RECOGNITION)) {
            return "blocked";
        }
        return "denied";
    }
}

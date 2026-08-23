package com.gtftechnologies.zsteps.stepcounter;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.SystemClock;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Iterator;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Durable step state, persisted in SharedPreferences.
 *
 * The hardware TYPE_STEP_COUNTER sensor reports steps since the last reboot and
 * keeps counting while the screen is off and even while this process is dead.
 * It is therefore the source of truth for how many steps happened, but it knows
 * nothing about calendar days, reboots or the user timezone. This class turns
 * that raw cumulative counter into a per-local-day total that survives:
 *
 *   - the app being backgrounded, killed or updated
 *   - the screen being locked for hours
 *   - device reboots (the counter restarts at zero)
 *   - vendor sensor resets (the counter jumps backwards)
 *   - midnight rollovers and timezone / manual clock changes
 *
 * Rather than storing only daySteps = sensorTotal - baseline, it keeps an
 * accumulator advanced by each observed delta. Baseline arithmetic alone breaks
 * the moment the counter resets underneath it; an accumulator does not.
 */
public final class StepStore {

    private static final String PREFS = "zsteps_step_counter";

    private static final String KEY_TRACKING = "tracking";
    private static final String KEY_TRACKING_START = "trackingStartDate";
    private static final String KEY_SENSOR_TOTAL = "sensorTotal";
    private static final String KEY_HAS_SENSOR_TOTAL = "hasSensorTotal";
    private static final String KEY_DAY_KEY = "dayKey";
    private static final String KEY_DAY_BASELINE = "dayBaseline";
    private static final String KEY_DAY_STEPS = "daySteps";
    private static final String KEY_BOOT_REFERENCE = "bootReference";
    private static final String KEY_LAST_UPDATED = "lastUpdated";
    private static final String KEY_HISTORY = "history";
    private static final String KEY_BACKGROUND_SERVICE = "backgroundService";
    private static final String KEY_LAST_EVENT = "lastEvent";
    private static final String KEY_PERMISSION_REQUESTED = "permissionRequested";
    private static final String KEY_STEP_GOAL = "stepGoal";
    private static final String KEY_WATER_ML = "waterMl";
    private static final String KEY_WATER_GOAL_ML = "waterGoalMl";
    private static final String KEY_HEART_RATE = "heartRate";
    private static final String KEY_HEART_RATE_AT = "heartRateAt";

    /**
     * Two wall-clock estimates of boot time drift by a second or so between
     * readings; anything larger than this means the device actually rebooted.
     */
    private static final long BOOT_DRIFT_TOLERANCE_MS = 5000L;

    /**
     * A single sensor delta larger than this is treated as a vendor glitch
     * rather than real walking, and is dropped instead of poisoning the day.
     */
    private static final long MAX_PLAUSIBLE_DELTA = 25000L;

    /*
     * Derived-metric constants, kept in step with lib/wellness/store.ts. The
     * widget and the ongoing notification have to render calories and distance
     * while no WebView exists, so the same arithmetic lives on both sides.
     */
    public static final double KCAL_PER_STEP = 0.04;
    public static final double STRIDE_METERS = 0.762;
    public static final int STEPS_PER_ACTIVE_MINUTE = 110;

    /** A heart-rate reading older than this is stale and not worth showing. */
    private static final long HEART_RATE_TTL_MS = 60 * 60 * 1000L;

    /** Days of per-day totals kept for offline backfill and sync. */
    private static final int HISTORY_DAYS = 120;

    private final SharedPreferences prefs;

    public StepStore(Context context) {
        this.prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    // ---------------------------------------------------------------- day keys

    /** Local calendar day, matching the yyyy-MM-dd keys the web store uses. */
    public static String dayKeyFor(long millis) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        format.setTimeZone(TimeZone.getDefault());
        return format.format(millis);
    }

    public static long startOfDay(long millis) {
        Calendar calendar = Calendar.getInstance(TimeZone.getDefault());
        calendar.setTimeInMillis(millis);
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar.getTimeInMillis();
    }

    /** Just after the next local midnight, when the day accumulator rolls over. */
    public static long nextRolloverAt(long millis) {
        Calendar calendar = Calendar.getInstance(TimeZone.getDefault());
        calendar.setTimeInMillis(startOfDay(millis));
        calendar.add(Calendar.DAY_OF_YEAR, 1);
        calendar.add(Calendar.SECOND, 30);
        return calendar.getTimeInMillis();
    }

    // ------------------------------------------------------------ simple state

    public synchronized boolean isTracking() {
        return prefs.getBoolean(KEY_TRACKING, false);
    }

    public synchronized void setTracking(boolean tracking) {
        SharedPreferences.Editor editor = prefs.edit().putBoolean(KEY_TRACKING, tracking);
        if (tracking && prefs.getString(KEY_TRACKING_START, null) == null) {
            editor.putString(KEY_TRACKING_START, dayKeyFor(System.currentTimeMillis()));
        }
        editor.apply();
    }

    public synchronized String trackingStartDate() {
        return prefs.getString(KEY_TRACKING_START, null);
    }

    public synchronized boolean isBackgroundServiceEnabled() {
        return prefs.getBoolean(KEY_BACKGROUND_SERVICE, false);
    }

    public synchronized void setBackgroundServiceEnabled(boolean enabled) {
        prefs.edit().putBoolean(KEY_BACKGROUND_SERVICE, enabled).apply();
    }

    /**
     * Whether the activity permission has ever been asked for. Needed to tell a
     * first-run prompt apart from a permanently blocked grant, because
     * shouldShowRequestPermissionRationale returns false in both cases.
     */
    public synchronized boolean hasRequestedPermission() {
        return prefs.getBoolean(KEY_PERMISSION_REQUESTED, false);
    }

    public synchronized void markPermissionRequested() {
        prefs.edit().putBoolean(KEY_PERMISSION_REQUESTED, true).apply();
    }

    /*
     * Metrics the native layer cannot measure itself. Water is logged in the
     * web UI and heart rate arrives over Bluetooth, so both are pushed down
     * here and cached — otherwise the widget and notification could only ever
     * show steps.
     */
    public synchronized void setMetrics(long stepGoal, long waterMl, long waterGoalMl, int heartRate) {
        SharedPreferences.Editor editor = prefs.edit();
        if (stepGoal > 0) editor.putLong(KEY_STEP_GOAL, stepGoal);
        if (waterMl >= 0) editor.putLong(KEY_WATER_ML, waterMl);
        if (waterGoalMl > 0) editor.putLong(KEY_WATER_GOAL_ML, waterGoalMl);
        if (heartRate > 0) {
            editor.putInt(KEY_HEART_RATE, heartRate);
            editor.putLong(KEY_HEART_RATE_AT, System.currentTimeMillis());
        }
        editor.apply();
    }

    public synchronized long stepGoal() {
        return prefs.getLong(KEY_STEP_GOAL, 10000L);
    }

    public synchronized long waterMl() {
        return prefs.getLong(KEY_WATER_ML, 0L);
    }

    public synchronized long waterGoalMl() {
        return prefs.getLong(KEY_WATER_GOAL_ML, 2500L);
    }

    /** Latest heart rate, or 0 when there is none or it has gone stale. */
    public synchronized int heartRate() {
        int value = prefs.getInt(KEY_HEART_RATE, 0);
        if (value <= 0) return 0;
        long age = System.currentTimeMillis() - prefs.getLong(KEY_HEART_RATE_AT, 0L);
        return age <= HEART_RATE_TTL_MS ? value : 0;
    }

    public synchronized int caloriesToday() {
        return (int) Math.round(todaySteps() * KCAL_PER_STEP);
    }

    public synchronized double distanceKmToday() {
        return todaySteps() * STRIDE_METERS / 1000.0;
    }

    public synchronized int activeMinutesToday() {
        return (int) Math.round((double) todaySteps() / STEPS_PER_ACTIVE_MINUTE);
    }

    public synchronized long sensorTotal() {
        return prefs.getLong(KEY_SENSOR_TOTAL, 0L);
    }

    public synchronized long dayBaseline() {
        return prefs.getLong(KEY_DAY_BASELINE, 0L);
    }

    public synchronized long lastUpdated() {
        return prefs.getLong(KEY_LAST_UPDATED, 0L);
    }

    /** Why the last reading changed the total. Surfaced for diagnostics only. */
    public synchronized String lastEvent() {
        return prefs.getString(KEY_LAST_EVENT, "none");
    }

    // -------------------------------------------------------------- day totals

    /** Today's steps, after applying any pending midnight/timezone rollover. */
    public synchronized long todaySteps() {
        rollIfNeeded(System.currentTimeMillis());
        return prefs.getLong(KEY_DAY_STEPS, 0L);
    }

    public synchronized String currentDayKey() {
        rollIfNeeded(System.currentTimeMillis());
        return prefs.getString(KEY_DAY_KEY, dayKeyFor(System.currentTimeMillis()));
    }

    public synchronized long stepsOn(String dayKey) {
        rollIfNeeded(System.currentTimeMillis());
        if (dayKey.equals(prefs.getString(KEY_DAY_KEY, null))) {
            return prefs.getLong(KEY_DAY_STEPS, 0L);
        }
        return history().optLong(dayKey, 0L);
    }

    public synchronized JSONObject history() {
        try {
            return new JSONObject(prefs.getString(KEY_HISTORY, "{}"));
        } catch (JSONException error) {
            return new JSONObject();
        }
    }

    // ------------------------------------------------------------------- core

    /**
     * Fold a raw cumulative sensor reading into the persisted day total.
     *
     * @param total raw TYPE_STEP_COUNTER value (steps since boot)
     * @param now   wall-clock time of the reading
     * @return today's step total after the reading is applied
     */
    public synchronized long recordSensorTotal(long total, long now) {
        boolean rebooted = consumeBootChange(now);
        rollIfNeeded(now);

        SharedPreferences.Editor editor = prefs.edit();
        long daySteps = prefs.getLong(KEY_DAY_STEPS, 0L);
        String event;

        if (!prefs.getBoolean(KEY_HAS_SENSOR_TOTAL, false)) {
            // First reading ever: nothing to compare against, so this only
            // establishes the baseline. Steps taken before install are not ours.
            event = "baseline";
            editor.putLong(KEY_DAY_BASELINE, total);
        } else if (rebooted) {
            // The counter restarted at zero, so total is steps taken since boot.
            // Credit them only when the device booted today, since a post-boot
            // count that spans days cannot be split and we would rather
            // undercount than invent steps for today.
            long bootedAt = now - SystemClock.elapsedRealtime();
            boolean bootedToday = bootedAt >= startOfDay(now);
            if (bootedToday && total <= MAX_PLAUSIBLE_DELTA) {
                daySteps += total;
                event = "reboot-credited";
                editor.putLong(KEY_DAY_BASELINE, 0L);
            } else {
                event = "reboot-rebaselined";
                editor.putLong(KEY_DAY_BASELINE, total);
            }
        } else {
            long delta = total - prefs.getLong(KEY_SENSOR_TOTAL, 0L);
            if (delta < 0) {
                // Counter went backwards without a detected reboot: a vendor
                // sensor reset. Re-anchor rather than crediting a huge jump.
                event = "sensor-reset";
                editor.putLong(KEY_DAY_BASELINE, total);
            } else if (delta > MAX_PLAUSIBLE_DELTA) {
                event = "implausible-delta-dropped";
            } else if (delta > 0) {
                daySteps += delta;
                event = "steps";
            } else {
                event = "no-change";
            }
        }

        editor
            .putLong(KEY_SENSOR_TOTAL, total)
            .putBoolean(KEY_HAS_SENSOR_TOTAL, true)
            .putLong(KEY_DAY_STEPS, daySteps)
            .putLong(KEY_LAST_UPDATED, now)
            .putString(KEY_LAST_EVENT, event)
            .apply();

        return daySteps;
    }

    /**
     * Close out the previous day and open the current one when the local
     * calendar date has changed: at midnight, on a timezone change, or when the
     * user moves the system clock.
     */
    public synchronized boolean rollIfNeeded(long now) {
        String today = dayKeyFor(now);
        String stored = prefs.getString(KEY_DAY_KEY, null);
        if (today.equals(stored)) return false;

        JSONObject history = history();
        long carried = 0L;
        if (stored != null) {
            try {
                history.put(stored, prefs.getLong(KEY_DAY_STEPS, 0L));
            } catch (JSONException ignored) {
                // A day we cannot archive is dropped rather than failing the roll.
            }
        }
        // Travelling west, or a clock rollback, can land us back on a day we
        // already archived; resume that day's total instead of zeroing it.
        if (history.has(today)) {
            carried = history.optLong(today, 0L);
            history.remove(today);
        }

        prefs.edit()
            .putString(KEY_DAY_KEY, today)
            .putLong(KEY_DAY_STEPS, carried)
            .putLong(KEY_DAY_BASELINE, prefs.getLong(KEY_SENSOR_TOTAL, 0L))
            .putString(KEY_HISTORY, trimHistory(history, now).toString())
            .apply();
        return true;
    }

    /**
     * True the first time it is called after a reboot. Boot time is derived from
     * wall clock minus uptime, which is stable to within a second or two while
     * the device stays up and shifts sharply across a restart.
     */
    private boolean consumeBootChange(long now) {
        long bootReference = now - SystemClock.elapsedRealtime();
        long stored = prefs.getLong(KEY_BOOT_REFERENCE, 0L);
        prefs.edit().putLong(KEY_BOOT_REFERENCE, bootReference).apply();
        if (stored == 0L) return false;
        return Math.abs(bootReference - stored) > BOOT_DRIFT_TOLERANCE_MS;
    }

    private JSONObject trimHistory(JSONObject history, long now) {
        String cutoff = dayKeyFor(startOfDay(now) - (long) HISTORY_DAYS * 24 * 60 * 60 * 1000);
        JSONObject trimmed = new JSONObject();
        Iterator<String> keys = history.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            if (key.compareTo(cutoff) >= 0) {
                try {
                    trimmed.put(key, history.optLong(key, 0L));
                } catch (JSONException ignored) {
                    // Skip unparseable entries instead of losing the whole map.
                }
            }
        }
        return trimmed;
    }
}

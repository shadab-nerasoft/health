package com.gtftechnologies.zsteps.stepcounter;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.gtftechnologies.zsteps.widget.StepWidgetProvider;

import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Owns the device step sensor and the persisted step state.
 *
 * Design note, because it is the whole point of this module: TYPE_STEP_COUNTER
 * is a hardware-backed cumulative counter. The sensor hub keeps incrementing it
 * while the screen is off, while the app is backgrounded, and while this process
 * is not running at all. Nothing has to stay awake to *collect* steps. All this
 * class has to do is read the counter whenever it gets the chance and fold the
 * difference into the persisted day total.
 *
 * That is why there is no polling loop, no wake lock and no mandatory service:
 * a listener is registered while the UI is in front (so the dashboard updates
 * live), released when it goes away, and re-registered on resume — at which
 * point the counter hands back every step taken in between.
 */
public final class StepTracker implements SensorEventListener {

    public static final String TAG = "ZstepsStepTracker";

    /** Foreground reads are prompt; the optional service batches to save power. */
    private static final int BATCH_LATENCY_US = 5 * 60 * 1000 * 1000;

    private static final int ROLLOVER_REQUEST_CODE = 4711;

    /** How long a background one-shot read waits before giving up. */
    private static final long SNAPSHOT_TIMEOUT_MS = 6000L;

    public interface StepListener {
        void onStepsChanged(long todaySteps, long sensorTotal);
    }

    private static StepTracker instance;

    private final Context context;
    private final StepStore store;
    private final SensorManager sensorManager;
    private final Sensor stepCounter;
    private final CopyOnWriteArraySet<StepListener> listeners = new CopyOnWriteArraySet<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private boolean registered;

    public static synchronized StepTracker getInstance(Context context) {
        if (instance == null) instance = new StepTracker(context.getApplicationContext());
        return instance;
    }

    private StepTracker(Context context) {
        this.context = context;
        this.store = new StepStore(context);
        this.sensorManager = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        this.stepCounter = sensorManager == null ? null : sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
    }

    public StepStore store() {
        return store;
    }

    // ------------------------------------------------------- capability checks

    /** False on devices with no hardware/composite step counter at all. */
    public boolean isSensorAvailable() {
        return stepCounter != null;
    }

    /**
     * ACTIVITY_RECOGNITION became a runtime permission in Android 10. Below that
     * the step counter is readable without any grant.
     */
    public boolean hasPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true;
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION)
            == PackageManager.PERMISSION_GRANTED;
    }

    public boolean isRegistered() {
        return registered;
    }

    // ------------------------------------------------------------- lifecycle

    /**
     * Begin tracking. Registering the listener makes the sensor deliver its
     * current cumulative value almost immediately, which is what reconciles any
     * steps taken while the app was closed or the screen was off.
     *
     * @return true if the listener is now attached
     */
    public synchronized boolean start() {
        if (!isSensorAvailable() || !hasPermission()) return false;
        store.setTracking(true);
        scheduleDayRollover();
        return attach(0);
    }

    /** Detach from the sensor but keep the persisted totals and the day alarm. */
    public synchronized void detach() {
        if (!registered || sensorManager == null) return;
        sensorManager.unregisterListener(this);
        registered = false;
    }

    /** Stop tracking entirely: detach, cancel the rollover alarm, clear the flag. */
    public synchronized void stop() {
        detach();
        store.setTracking(false);
        cancelDayRollover();
    }

    /** Re-attach after a resume if the user had tracking switched on. */
    public synchronized boolean resumeIfTracking() {
        if (!store.isTracking()) return false;
        return start();
    }

    private boolean attach(int batchLatencyUs) {
        if (sensorManager == null || stepCounter == null) return false;
        if (registered) return true;
        registered = sensorManager.registerListener(
            this, stepCounter, SensorManager.SENSOR_DELAY_NORMAL, batchLatencyUs);
        return registered;
    }

    /** Used by the optional foreground service: same stream, batched for power. */
    public synchronized boolean attachBatched() {
        detach();
        return attach(BATCH_LATENCY_US);
    }

    // ----------------------------------------------------------- sensor events

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;
        long total = (long) event.values[0];
        long todaySteps = store.recordSensorTotal(total, System.currentTimeMillis());
        for (StepListener listener : listeners) {
            listener.onStepsChanged(todaySteps, total);
        }
        // Keep any placed home screen widget in step with the real total.
        StepWidgetProvider.refresh(context);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // TYPE_STEP_COUNTER does not report meaningful accuracy transitions.
    }

    public void addListener(StepListener listener) {
        listeners.add(listener);
    }

    public void removeListener(StepListener listener) {
        listeners.remove(listener);
    }

    // --------------------------------------------------------- one-shot reads

    /**
     * Read the counter once and fold it in, without leaving a listener attached.
     * Used by the midnight rollover and boot receivers, which have to finish
     * quickly and must not hold the sensor open.
     */
    public void snapshotOnce(final Runnable onComplete) {
        if (sensorManager == null || stepCounter == null || !hasPermission()) {
            store.rollIfNeeded(System.currentTimeMillis());
            if (onComplete != null) onComplete.run();
            return;
        }

        final SensorEventListener oneShot = new SensorEventListener() {
            private boolean done;

            @Override
            public void onSensorChanged(SensorEvent event) {
                if (done) return;
                done = true;
                store.recordSensorTotal((long) event.values[0], System.currentTimeMillis());
                sensorManager.unregisterListener(this);
                if (onComplete != null) onComplete.run();
            }

            @Override
            public void onAccuracyChanged(Sensor sensor, int accuracy) {
            }
        };

        boolean attached = sensorManager.registerListener(oneShot, stepCounter, SensorManager.SENSOR_DELAY_FASTEST);
        if (!attached) {
            store.rollIfNeeded(System.currentTimeMillis());
            if (onComplete != null) onComplete.run();
            return;
        }

        // Android restricts sensor delivery to idle background apps, so a
        // background snapshot can simply never arrive. Roll the day anyway
        // rather than leaving a listener dangling.
        mainHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                sensorManager.unregisterListener(oneShot);
                store.rollIfNeeded(System.currentTimeMillis());
                if (onComplete != null) onComplete.run();
            }
        }, SNAPSHOT_TIMEOUT_MS);
    }

    // ------------------------------------------------------ day rollover alarm

    /**
     * Wake just after local midnight to close the day out at the right boundary.
     *
     * Deliberately an inexact alarm: setExactAndAllowWhileIdle would need
     * SCHEDULE_EXACT_ALARM, which Play restricts to alarm-clock style apps, and
     * a few minutes of slack at 00:00 costs at most a handful of steps.
     */
    public void scheduleDayRollover() {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        long triggerAt = StepStore.nextRolloverAt(System.currentTimeMillis());
        try {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, rolloverIntent());
        } catch (SecurityException error) {
            Log.w(TAG, "Could not schedule the midnight rollover alarm", error);
        }
    }

    public void cancelDayRollover() {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) alarmManager.cancel(rolloverIntent());
    }

    private PendingIntent rolloverIntent() {
        Intent intent = new Intent(context, StepEventReceiver.class);
        intent.setAction(StepEventReceiver.ACTION_DAY_ROLLOVER);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, ROLLOVER_REQUEST_CODE, intent, flags);
    }
}

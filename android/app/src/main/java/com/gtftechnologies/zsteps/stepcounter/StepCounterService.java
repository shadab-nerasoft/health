package com.gtftechnologies.zsteps.stepcounter;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import java.util.Locale;

import androidx.core.app.NotificationCompat;

import com.gtftechnologies.zsteps.MainActivity;
import com.gtftechnologies.zsteps.R;

/**
 * OPTIONAL, OFF BY DEFAULT.
 *
 * Screen-off step counting does not need this service. TYPE_STEP_COUNTER is a
 * hardware counter that keeps accumulating with no process alive, so the app
 * reconciles everything by reading it on resume. This service exists only for
 * the cases where the app must *react* to steps while it is in the background:
 *
 *   - live goal / streak notifications without the user opening the app
 *   - exact day boundaries on devices where the inexact midnight alarm is
 *     suppressed by aggressive vendor battery management
 *
 * Cost of switching it on, which the UI states plainly before enabling it:
 *   - a permanent, user-visible notification (Android requires it and it must
 *     not be hidden)
 *   - a process that stays resident, so some extra battery drain
 *   - a Play Store declaration for the health foreground service type, which
 *     needs a demo video and a stated justification at review time
 *
 * Sensor events are batched at a five-minute latency, so the CPU wakes a
 * handful of times an hour rather than on every footfall.
 */
public class StepCounterService extends Service implements StepTracker.StepListener {

    private static final String CHANNEL_ID = "zsteps_step_tracking";
    private static final int NOTIFICATION_ID = 8021;

    private StepTracker tracker;

    public static void start(Context context) {
        Intent intent = new Intent(context, StepCounterService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception error) {
            // Android 12+ blocks most background service starts. The counter
            // keeps working without the service, so this is not fatal.
            Log.w(StepTracker.TAG, "Could not start the step service", error);
        }
    }

    public static void stop(Context context) {
        context.stopService(new Intent(context, StepCounterService.class));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        tracker = StepTracker.getInstance(this);
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        long steps = tracker.store().todaySteps();
        startInForeground(buildNotification(steps));

        if (!tracker.hasPermission() || !tracker.isSensorAvailable()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        tracker.addListener(this);
        tracker.attachBatched();
        tracker.scheduleDayRollover();
        return START_STICKY;
    }

    private void startInForeground(Notification notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    @Override
    public void onDestroy() {
        if (tracker != null) {
            tracker.removeListener(this);
            // Drop the batched registration; the UI re-attaches its own on resume.
            tracker.detach();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onStepsChanged(long todaySteps, long sensorTotal) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification(todaySteps));
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID, "Step tracking", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Shows the running step count while background tracking is on.");
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    /**
     * Collapsed: steps and calories on one line. Expanded: the full picture —
     * steps, calories, distance, water and heart rate.
     *
     * All of it comes from SharedPreferences, so the notification stays accurate
     * while the app is closed and no WebView exists to ask.
     */
    private Notification buildNotification(long steps) {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent open = PendingIntent.getActivity(
            this, 0, new Intent(this, MainActivity.class), flags);

        StepStore store = tracker.store();
        long goal = store.stepGoal();
        int percent = goal > 0 ? (int) Math.min(100, (steps * 100) / goal) : 0;
        int calories = store.caloriesToday();
        int heartRate = store.heartRate();

        String title = String.format(Locale.US, "%,d steps today", steps);
        String summary = String.format(Locale.US, "%d%% of goal · %,d kcal", percent, calories);

        StringBuilder detail = new StringBuilder();
        detail.append(String.format(Locale.US, "%,d steps · %d%% of %,d", steps, percent, goal));
        detail.append(String.format(Locale.US, "%n%,d kcal · %.2f km · %d active min",
            calories, store.distanceKmToday(), store.activeMinutesToday()));
        detail.append(String.format(Locale.US, "%nWater %.1f L of %.1f L",
            store.waterMl() / 1000.0, store.waterGoalMl() / 1000.0));
        detail.append(heartRate > 0
            ? String.format(Locale.US, "%nHeart rate %d bpm", heartRate)
            : String.format(Locale.US, "%nHeart rate — connect a monitor"));

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(summary)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(detail.toString()))
            .setSmallIcon(R.drawable.ic_stat_steps)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setProgress(100, percent, false)
            .setOngoing(true)
            .setShowWhen(false)
            .setOnlyAlertOnce(true)
            .setContentIntent(open)
            .build();
    }
}

package com.gtftechnologies.zsteps.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;

import com.gtftechnologies.zsteps.MainActivity;
import com.gtftechnologies.zsteps.R;
import com.gtftechnologies.zsteps.stepcounter.StepStore;
import com.gtftechnologies.zsteps.stepcounter.StepTracker;

import java.util.Locale;

/**
 * Home screen widget showing today's steps.
 *
 * It reads the same SharedPreferences the plugin writes, so the widget and the
 * app can never disagree. Nothing here talks to the WebView — the widget stays
 * correct while the app is closed, because the step total it renders was
 * written by the native layer in the first place.
 *
 * Refreshes come from three places: the system's own periodic update, a tap on
 * the widget, and an explicit broadcast whenever the tracker folds in a new
 * reading. There is no timer.
 */
public class StepWidgetProvider extends AppWidgetProvider {

    /** Sent by the app when the step total changes. */
    public static final String ACTION_REFRESH = "com.gtftechnologies.zsteps.WIDGET_REFRESH";

    /** Ask every placed widget to redraw. Safe to call from any thread. */
    public static void refresh(Context context) {
        Intent intent = new Intent(context, StepWidgetProvider.class);
        intent.setAction(ACTION_REFRESH);
        context.sendBroadcast(intent);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null || !ACTION_REFRESH.equals(intent.getAction())) return;

        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, StepWidgetProvider.class));
        onUpdate(context, manager, ids);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            manager.updateAppWidget(appWidgetId, buildViews(context));
        }
    }

    private RemoteViews buildViews(Context context) {
        StepStore store = new StepStore(context);
        long steps = store.todaySteps();

        // Goal is mirrored from the web store; 10,000 matches the app default
        // until the user changes it.
        long goal = 10000;
        int percent = goal > 0 ? (int) Math.min(100, (steps * 100) / goal) : 0;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_steps);
        views.setTextViewText(R.id.widget_steps, String.format(Locale.getDefault(), "%,d", steps));
        views.setTextViewText(R.id.widget_caption, percent + "% of " + String.format(Locale.getDefault(), "%,d", goal));
        views.setProgressBar(R.id.widget_progress, 100, percent, false);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent open = PendingIntent.getActivity(
            context, 0, new Intent(context, MainActivity.class), flags);
        views.setOnClickPendingIntent(R.id.widget_root, open);

        return views;
    }

    @Override
    public void onEnabled(Context context) {
        // A placed widget is a reason to keep the sensor state current even if
        // the user rarely opens the app.
        StepTracker tracker = StepTracker.getInstance(context);
        if (tracker.store().isTracking()) tracker.scheduleDayRollover();
    }
}

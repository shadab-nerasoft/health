package com.gtftechnologies.zsteps.stepcounter;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Handles the system events that can invalidate the persisted day total.
 *
 *   BOOT_COMPLETED / MY_PACKAGE_REPLACED
 *       The step counter restarted at zero. Re-anchor the baseline and put the
 *       midnight alarm back, since both are lost across a reboot or reinstall.
 *
 *   ACTION_DAY_ROLLOVER (our own inexact alarm, just after local midnight)
 *       Take one sensor reading so yesterday closes at the right number, then
 *       arm tomorrow's alarm.
 *
 *   TIMEZONE_CHANGED / TIME_SET / DATE_CHANGED
 *       The local calendar day may have moved under us. Re-evaluate it and
 *       re-arm the alarm against the new local midnight.
 */
public class StepEventReceiver extends BroadcastReceiver {

    public static final String ACTION_DAY_ROLLOVER = "com.gtftechnologies.zsteps.DAY_ROLLOVER";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (action == null) return;

        final StepTracker tracker = StepTracker.getInstance(context);
        if (!tracker.store().isTracking()) return;

        // Broadcast receivers are killed as soon as onReceive returns, and the
        // sensor read is asynchronous, so hold the process open until it lands.
        final PendingResult pending = goAsync();
        Log.i(StepTracker.TAG, "Step event: " + action);

        tracker.snapshotOnce(new Runnable() {
            @Override
            public void run() {
                tracker.scheduleDayRollover();
                if (tracker.store().isBackgroundServiceEnabled()) {
                    StepCounterService.start(context);
                }
                pending.finish();
            }
        });
    }
}

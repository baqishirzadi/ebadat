package com.afghandev.ebadat.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import com.afghandev.ebadat.WidgetRefreshScheduler;
import com.reactnativeandroidwidget.RNWidgetProvider;

public class PrayerTimesWidget extends RNWidgetProvider {
    /**
     * RNWidgetProvider only forwards its own package-scoped widget actions to
     * the headless JS task. Android still delivers date/time broadcasts to the
     * receiver, so explicitly turn those broadcasts into a normal widget
     * update. Prayer-boundary alarms advance the current-prayer highlight
     * while the app is closed.
     */
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (WidgetRefreshScheduler.ACTION.equals(action)) {
            WidgetRefreshScheduler.INSTANCE.onRollover(context);
            return;
        }
        if (Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, PrayerTimesWidget.class));
            if (ids.length > 0) {
                onUpdate(context, manager, ids);
            }
            return;
        }
        super.onReceive(context, intent);
    }
}

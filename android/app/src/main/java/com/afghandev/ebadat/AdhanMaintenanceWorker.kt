package com.afghandev.ebadat

import android.content.Context
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters

class AdhanMaintenanceWorker(
  appContext: Context,
  workerParams: WorkerParameters,
) : Worker(appContext, workerParams) {
  override fun doWork(): Result {
    return try {
      val result = AdhanScheduleManager.ensureScheduled(applicationContext, "workmanager-periodic")
      Log.i(
        "AdhanMaintenanceWorker",
        "Maintenance complete scheduled=${result.scheduledCount} expected=${result.expectedCount}",
      )
      Result.success()
    } catch (error: Exception) {
      Log.e("AdhanMaintenanceWorker", "Maintenance failed", error)
      Result.retry()
    }
  }
}

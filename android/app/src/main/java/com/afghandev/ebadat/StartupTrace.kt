package com.afghandev.ebadat

import android.os.SystemClock
import android.util.Log

/**
 * Monotonic process-local timestamps for Android cold-start diagnostics.
 * Keep the output compact so it is safe to leave enabled in release builds.
 */
object StartupTrace {
  private val processEpochMs = SystemClock.elapsedRealtime()

  fun mark(phase: String) {
    val elapsedMs = SystemClock.elapsedRealtime() - processEpochMs
    Log.i("EbadatStartup", "[$elapsedMs ms] $phase")
  }
}

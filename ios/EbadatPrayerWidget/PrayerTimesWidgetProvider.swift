import SwiftUI
import WidgetKit

struct PrayerTimesWidgetEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
}

struct PrayerTimesWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> PrayerTimesWidgetEntry {
    PrayerTimesWidgetEntry(date: Date(), snapshot: sampleSnapshot())
  }

  func getSnapshot(in context: Context, completion: @escaping (PrayerTimesWidgetEntry) -> Void) {
    completion(PrayerTimesWidgetEntry(date: Date(), snapshot: WidgetShared.loadSnapshot() ?? sampleSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerTimesWidgetEntry>) -> Void) {
    let now = Date()
    let snapshot = WidgetShared.loadSnapshot()
    let entry = PrayerTimesWidgetEntry(date: now, snapshot: snapshot)

    let refreshDate: Date
    if let nextMs = snapshot?.nextRefreshAtMs, nextMs > now.timeIntervalSince1970 * 1000 {
      refreshDate = Date(timeIntervalSince1970: nextMs / 1000)
    } else {
      refreshDate = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now.addingTimeInterval(1800)
    }

    completion(Timeline(entries: [entry], policy: .after(refreshDate)))
  }

  private func sampleSnapshot() -> WidgetSnapshot {
    WidgetSnapshot(
      version: 1,
      updatedAt: ISO8601DateFormatter().string(from: Date()),
      cityName: "کابل",
      weekdayDari: "چهارشنبه",
      shamsiDisplay: "۱۴۰۴/۰۱/۱۸",
      hijriDisplay: "۱۵ رمضان ۱۴۴۷",
      currentPrayer: "dhuhr",
      prayers: [
        WidgetPrayerEntry(key: "fajr", labelDari: "صبح", time12h: "۴:۳۰", atMs: 0),
        WidgetPrayerEntry(key: "dhuhr", labelDari: "ظهر", time12h: "۱۲:۱۵", atMs: 0),
        WidgetPrayerEntry(key: "asr", labelDari: "عصر", time12h: "۳:۴۵", atMs: 0),
        WidgetPrayerEntry(key: "maghrib", labelDari: "شام", time12h: "۶:۱۰", atMs: 0),
        WidgetPrayerEntry(key: "isha", labelDari: "خفتن", time12h: "۷:۳۰", atMs: 0),
      ],
      nextRefreshAtMs: Date().addingTimeInterval(3600).timeIntervalSince1970 * 1000
    )
  }
}

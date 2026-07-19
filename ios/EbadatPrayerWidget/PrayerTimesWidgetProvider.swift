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
    let now = Date()
    let stored = WidgetShared.loadSnapshot()
    let snapshot = stored.map { WidgetShared.derivedSnapshot(from: $0, at: now) } ?? sampleSnapshot()
    completion(PrayerTimesWidgetEntry(date: now, snapshot: snapshot))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerTimesWidgetEntry>) -> Void) {
    let now = Date()
    guard let stored = WidgetShared.loadSnapshot() else {
      let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now.addingTimeInterval(1800)
      completion(Timeline(entries: [PrayerTimesWidgetEntry(date: now, snapshot: nil)], policy: .after(refresh)))
      return
    }

    let dates = WidgetShared.timelineDates(from: stored, now: now)
    let entries: [PrayerTimesWidgetEntry] = dates.prefix(40).map { date in
      PrayerTimesWidgetEntry(
        date: date,
        snapshot: WidgetShared.derivedSnapshot(from: stored, at: date)
      )
    }

    let refreshDate: Date
    if let last = entries.last?.date, last > now {
      refreshDate = last
    } else if stored.nextRefreshAtMs > now.timeIntervalSince1970 * 1000 {
      refreshDate = Date(timeIntervalSince1970: stored.nextRefreshAtMs / 1000)
    } else {
      refreshDate = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now.addingTimeInterval(1800)
    }

    completion(Timeline(entries: entries, policy: .after(refreshDate)))
  }

  private func sampleSnapshot() -> WidgetSnapshot {
    WidgetSnapshot(
      version: 2,
      updatedAt: ISO8601DateFormatter().string(from: Date()),
      cityName: "کابل",
      timezone: "Asia/Kabul",
      policyVersion: 3,
      sourceLabel: "Karachi+AF",
      days: nil,
      weekdayDari: "چهارشنبه",
      shamsiDisplay: "۱۴۰۴/۰۱/۱۸",
      hijriDisplay: "۱۵ رمضان ۱۴۴۷",
      gregorianDisplay: "19 Jul 2026",
      currentPrayer: "dhuhr",
      prayers: [
        WidgetPrayerEntry(key: "fajr", labelDari: "صبح", time12h: "۴:۳۰", atMs: 0),
        WidgetPrayerEntry(key: "dhuhr", labelDari: "ظهر", time12h: "۱۲:۳۰", atMs: 0),
        WidgetPrayerEntry(key: "asr", labelDari: "عصر", time12h: "۳:۴۵", atMs: 0),
        WidgetPrayerEntry(key: "maghrib", labelDari: "شام", time12h: "۶:۱۰", atMs: 0),
        WidgetPrayerEntry(key: "isha", labelDari: "خفتن", time12h: "۷:۳۰", atMs: 0),
      ],
      nextRefreshAtMs: Date().addingTimeInterval(3600).timeIntervalSince1970 * 1000
    )
  }
}

import Foundation

enum WidgetShared {
  static let appGroupId = "group.com.afghandev.ebadat"
  static let snapshotKey = "ebadat_widget_snapshot_v1"

  static func loadSnapshot() -> WidgetSnapshot? {
    guard
      let defaults = UserDefaults(suiteName: appGroupId),
      let raw = defaults.string(forKey: snapshotKey),
      let data = raw.data(using: .utf8)
    else {
      return nil
    }

    return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
  }

  static func derivedSnapshot(from stored: WidgetSnapshot, at date: Date) -> WidgetSnapshot {
    let timezone = TimeZone(identifier: stored.timezone.isEmpty ? "Asia/Kabul" : stored.timezone) ?? .current
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timezone

    let day: WidgetDaySnapshot
    if let days = stored.days, !days.isEmpty {
      let formatter = DateFormatter()
      formatter.calendar = calendar
      formatter.timeZone = timezone
      formatter.dateFormat = "yyyy-MM-dd"
      let todayKey = formatter.string(from: date)
      day = days.first(where: { $0.dateKey == todayKey }) ?? days[0]
    } else {
      day = WidgetDaySnapshot(
        dateKey: "",
        weekdayDari: stored.weekdayDari,
        shamsiDisplay: stored.shamsiDisplay,
        hijriDisplay: stored.hijriDisplay,
        gregorianDisplay: stored.gregorianDisplay,
        prayers: stored.prayers
      )
    }

    let nowMs = date.timeIntervalSince1970 * 1000
    let order = ["fajr", "dhuhr", "asr", "maghrib", "isha"]
    var current: String? = nil
    for key in order {
      if let entry = day.prayers.first(where: { $0.key == key }), entry.atMs <= nowMs {
        current = key
      }
    }

    var nextRefresh = stored.nextRefreshAtMs
    let future = day.prayers.map { $0.atMs }.filter { $0 > nowMs }.sorted()
    if let first = future.first {
      nextRefresh = min(nextRefresh, first)
    }

    return WidgetSnapshot(
      version: max(stored.version, 2),
      updatedAt: stored.updatedAt,
      cityName: stored.cityName,
      timezone: stored.timezone,
      policyVersion: stored.policyVersion,
      sourceLabel: stored.sourceLabel,
      days: stored.days,
      weekdayDari: day.weekdayDari,
      shamsiDisplay: day.shamsiDisplay,
      hijriDisplay: day.hijriDisplay,
      gregorianDisplay: day.gregorianDisplay,
      currentPrayer: current,
      prayers: day.prayers,
      nextRefreshAtMs: nextRefresh
    )
  }

  static func timelineDates(from stored: WidgetSnapshot, now: Date) -> [Date] {
    var dates = Set<Date>()
    dates.insert(now)
    let nowMs = now.timeIntervalSince1970 * 1000
    let days = stored.days ?? []
    for day in days {
      for prayer in day.prayers where prayer.atMs >= nowMs - 60_000 {
        dates.insert(Date(timeIntervalSince1970: prayer.atMs / 1000))
      }
    }
    // Local midnights across horizon
    let timezone = TimeZone(identifier: stored.timezone.isEmpty ? "Asia/Kabul" : stored.timezone) ?? .current
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timezone
    for offset in 0..<(max(days.count, 1) + 1) {
      if let day = calendar.date(byAdding: .day, value: offset, to: now),
         let midnight = calendar.date(bySettingHour: 0, minute: 0, second: 0, of: day),
         midnight > now {
        dates.insert(midnight)
      }
    }
    return dates.sorted()
  }
}

struct WidgetPrayerEntry: Codable {
  let key: String
  let labelDari: String
  let time12h: String
  let atMs: Double
}

struct WidgetDaySnapshot: Codable {
  let dateKey: String
  let weekdayDari: String
  let shamsiDisplay: String
  let hijriDisplay: String
  let gregorianDisplay: String
  let prayers: [WidgetPrayerEntry]
}

struct WidgetSnapshot: Codable {
  let version: Int
  let updatedAt: String
  let cityName: String
  let timezone: String
  let policyVersion: Int?
  let sourceLabel: String?
  let days: [WidgetDaySnapshot]?
  let weekdayDari: String
  let shamsiDisplay: String
  let hijriDisplay: String
  let gregorianDisplay: String
  let currentPrayer: String?
  let prayers: [WidgetPrayerEntry]
  let nextRefreshAtMs: Double

  enum CodingKeys: String, CodingKey {
    case version, updatedAt, cityName, timezone, policyVersion, sourceLabel, days
    case weekdayDari, shamsiDisplay, hijriDisplay, gregorianDisplay
    case currentPrayer, prayers, nextRefreshAtMs
  }

  init(
    version: Int,
    updatedAt: String,
    cityName: String,
    timezone: String = "Asia/Kabul",
    policyVersion: Int? = nil,
    sourceLabel: String? = nil,
    days: [WidgetDaySnapshot]? = nil,
    weekdayDari: String,
    shamsiDisplay: String,
    hijriDisplay: String,
    gregorianDisplay: String,
    currentPrayer: String?,
    prayers: [WidgetPrayerEntry],
    nextRefreshAtMs: Double
  ) {
    self.version = version
    self.updatedAt = updatedAt
    self.cityName = cityName
    self.timezone = timezone
    self.policyVersion = policyVersion
    self.sourceLabel = sourceLabel
    self.days = days
    self.weekdayDari = weekdayDari
    self.shamsiDisplay = shamsiDisplay
    self.hijriDisplay = hijriDisplay
    self.gregorianDisplay = gregorianDisplay
    self.currentPrayer = currentPrayer
    self.prayers = prayers
    self.nextRefreshAtMs = nextRefreshAtMs
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    version = try container.decode(Int.self, forKey: .version)
    updatedAt = try container.decode(String.self, forKey: .updatedAt)
    cityName = try container.decode(String.self, forKey: .cityName)
    timezone = try container.decodeIfPresent(String.self, forKey: .timezone) ?? "Asia/Kabul"
    policyVersion = try container.decodeIfPresent(Int.self, forKey: .policyVersion)
    sourceLabel = try container.decodeIfPresent(String.self, forKey: .sourceLabel)
    days = try container.decodeIfPresent([WidgetDaySnapshot].self, forKey: .days)
    weekdayDari = try container.decode(String.self, forKey: .weekdayDari)
    shamsiDisplay = try container.decode(String.self, forKey: .shamsiDisplay)
    hijriDisplay = try container.decode(String.self, forKey: .hijriDisplay)
    gregorianDisplay = try container.decode(String.self, forKey: .gregorianDisplay)
    currentPrayer = try container.decodeIfPresent(String.self, forKey: .currentPrayer)
    prayers = try container.decode([WidgetPrayerEntry].self, forKey: .prayers)
    nextRefreshAtMs = try container.decode(Double.self, forKey: .nextRefreshAtMs)
  }
}

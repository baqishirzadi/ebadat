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

    // Version 3 snapshots contain all inputs needed to calculate a fresh day.
    // This is the normal path and does not depend on the app process running.
    if stored.hasCalculationInputs {
      let calculated = authoritativeDaySnapshot(snapshot: stored, date: date)
      let nowMs = date.timeIntervalSince1970 * 1000
      // Between local midnight and Fajr, Isha from the previous local day is
      // still the active prayer. The old implementation searched only today's
      // entries and left the widget with no highlight until Fajr.
      let current = calculated.prayers.last(where: { $0.atMs <= nowMs })?.key
        ?? previousDaySnapshot(snapshot: stored, date: date).prayers.last(where: { $0.key == "isha" && $0.atMs <= nowMs })?.key
      let next = calculated.prayers.first(where: { $0.atMs > nowMs })?.atMs
        ?? calendar.date(byAdding: .day, value: 1, to: date).map { $0.timeIntervalSince1970 * 1000 }
        ?? stored.nextRefreshAtMs
      return WidgetSnapshot(
        version: max(stored.version, 3),
        updatedAt: stored.updatedAt,
        cityName: stored.cityName,
        timezone: stored.timezone,
        policyVersion: stored.policyVersion,
        sourceLabel: stored.sourceLabel,
        latitude: stored.latitude,
        longitude: stored.longitude,
        altitude: stored.altitude,
        calculationMethod: stored.calculationMethod,
        asrMethod: stored.asrMethod,
        maghribOffsetMinutes: stored.maghribOffsetMinutes,
        fixedDhuhrLocalTime: stored.fixedDhuhrLocalTime,
        days: nil,
        weekdayDari: calculated.weekdayDari,
        shamsiDisplay: calculated.shamsiDisplay,
        hijriDisplay: calculated.hijriDisplay,
        gregorianDisplay: calculated.gregorianDisplay,
        sunriseDisplay: calculated.sunriseDisplay,
        currentPrayer: current,
        prayers: calculated.prayers,
        nextRefreshAtMs: next
      )
    }

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
        sunriseDisplay: stored.sunriseDisplay,
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
    if current == nil, let previous = stored.days?.first(where: { $0.dateKey < day.dateKey }),
       let previousIsha = previous.prayers.first(where: { $0.key == "isha" && $0.atMs <= nowMs }) {
      current = previousIsha.key
    }
    var nextRefresh = stored.nextRefreshAtMs
    let future = day.prayers.map { $0.atMs }.filter { $0 > nowMs }.sorted()
    if let first = future.first {
      nextRefresh = min(nextRefresh, first)
    }

    return WidgetSnapshot(
      version: max(stored.version, 3),
      updatedAt: stored.updatedAt,
      cityName: stored.cityName,
      timezone: stored.timezone,
      policyVersion: stored.policyVersion,
      sourceLabel: stored.sourceLabel,
      latitude: stored.latitude,
      longitude: stored.longitude,
      altitude: stored.altitude,
      calculationMethod: stored.calculationMethod,
      asrMethod: stored.asrMethod,
      maghribOffsetMinutes: stored.maghribOffsetMinutes,
      fixedDhuhrLocalTime: stored.fixedDhuhrLocalTime,
      days: stored.days,
      weekdayDari: day.weekdayDari,
      shamsiDisplay: day.shamsiDisplay,
      hijriDisplay: day.hijriDisplay,
      gregorianDisplay: day.gregorianDisplay,
      sunriseDisplay: day.sunriseDisplay.isEmpty ? stored.sunriseDisplay : day.sunriseDisplay,
      currentPrayer: current,
      prayers: day.prayers,
      nextRefreshAtMs: nextRefresh
    )
  }

  private static func authoritativeDaySnapshot(snapshot: WidgetSnapshot, date: Date) -> WidgetDaySnapshot {
    let timezone = TimeZone(identifier: snapshot.timezone.isEmpty ? "Asia/Kabul" : snapshot.timezone) ?? .current
    let key = WidgetPrayerCalculator.dateKey(for: date, timezone: timezone)
    if let storedDay = snapshot.days?.first(where: { $0.dateKey == key }) {
      return storedDay
    }
    return WidgetPrayerCalculator.daySnapshot(snapshot: snapshot, date: date)
  }

  private static func previousDaySnapshot(snapshot: WidgetSnapshot, date: Date) -> WidgetDaySnapshot {
    let timezone = TimeZone(identifier: snapshot.timezone.isEmpty ? "Asia/Kabul" : snapshot.timezone) ?? .current
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timezone
    let previous = calendar.date(byAdding: .day, value: -1, to: date) ?? date
    return authoritativeDaySnapshot(snapshot: snapshot, date: previous)
  }

  static func timelineDates(from stored: WidgetSnapshot, now: Date) -> [Date] {
    var dates = Set<Date>()
    dates.insert(now)
    let nowMs = now.timeIntervalSince1970 * 1000
    let days = stored.days ?? []
    if stored.hasCalculationInputs {
      let timezone = TimeZone(identifier: stored.timezone.isEmpty ? "Asia/Kabul" : stored.timezone) ?? .current
      var calendar = Calendar(identifier: .gregorian)
      calendar.timeZone = timezone
      let start = calendar.date(bySettingHour: 12, minute: 0, second: 0, of: now) ?? now
      // A bounded horizon keeps WidgetKit payloads small while guaranteeing
      // that every prayer boundary and local midnight has a fresh entry.
      for offset in 0...14 {
        guard let day = calendar.date(byAdding: .day, value: offset, to: start) else { continue }
        let calculated = authoritativeDaySnapshot(snapshot: stored, date: day)
        for prayer in calculated.prayers where prayer.atMs >= nowMs - 60_000 {
          dates.insert(Date(timeIntervalSince1970: prayer.atMs / 1000))
        }
        if let midnight = calendar.date(bySettingHour: 0, minute: 0, second: 0, of: day), midnight > now {
          dates.insert(midnight)
        }
      }
      return dates.sorted()
    }
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
  let sunriseDisplay: String
  let prayers: [WidgetPrayerEntry]

  enum CodingKeys: String, CodingKey {
    case dateKey, weekdayDari, shamsiDisplay, hijriDisplay, gregorianDisplay, sunriseDisplay, prayers
  }

  init(
    dateKey: String,
    weekdayDari: String,
    shamsiDisplay: String,
    hijriDisplay: String,
    gregorianDisplay: String,
    sunriseDisplay: String = "",
    prayers: [WidgetPrayerEntry]
  ) {
    self.dateKey = dateKey
    self.weekdayDari = weekdayDari
    self.shamsiDisplay = shamsiDisplay
    self.hijriDisplay = hijriDisplay
    self.gregorianDisplay = gregorianDisplay
    self.sunriseDisplay = sunriseDisplay
    self.prayers = prayers
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    dateKey = try container.decode(String.self, forKey: .dateKey)
    weekdayDari = try container.decode(String.self, forKey: .weekdayDari)
    shamsiDisplay = try container.decode(String.self, forKey: .shamsiDisplay)
    hijriDisplay = try container.decode(String.self, forKey: .hijriDisplay)
    gregorianDisplay = try container.decode(String.self, forKey: .gregorianDisplay)
    sunriseDisplay = try container.decodeIfPresent(String.self, forKey: .sunriseDisplay) ?? ""
    prayers = try container.decode([WidgetPrayerEntry].self, forKey: .prayers)
  }
}

struct WidgetSnapshot: Codable {
  let version: Int
  let updatedAt: String
  let cityName: String
  let timezone: String
  let policyVersion: Int?
  let sourceLabel: String?
  let latitude: Double
  let longitude: Double
  let altitude: Double
  let calculationMethod: String
  let asrMethod: String
  let maghribOffsetMinutes: Int
  let fixedDhuhrLocalTime: String?
  let days: [WidgetDaySnapshot]?
  let weekdayDari: String
  let shamsiDisplay: String
  let hijriDisplay: String
  let gregorianDisplay: String
  let sunriseDisplay: String
  let currentPrayer: String?
  let prayers: [WidgetPrayerEntry]
  let nextRefreshAtMs: Double

  enum CodingKeys: String, CodingKey {
    case version, updatedAt, cityName, timezone, policyVersion, sourceLabel, latitude, longitude, altitude
    case calculationMethod, asrMethod, maghribOffsetMinutes, fixedDhuhrLocalTime, days
    case weekdayDari, shamsiDisplay, hijriDisplay, gregorianDisplay, sunriseDisplay
    case currentPrayer, prayers, nextRefreshAtMs
  }

  init(
    version: Int,
    updatedAt: String,
    cityName: String,
    timezone: String = "Asia/Kabul",
    policyVersion: Int? = nil,
    sourceLabel: String? = nil,
    latitude: Double = 34.5553,
    longitude: Double = 69.2075,
    altitude: Double = 1791,
    calculationMethod: String = "Karachi",
    asrMethod: String = "Hanafi",
    maghribOffsetMinutes: Int = 0,
    fixedDhuhrLocalTime: String? = nil,
    days: [WidgetDaySnapshot]? = nil,
    weekdayDari: String,
    shamsiDisplay: String,
    hijriDisplay: String,
    gregorianDisplay: String,
    sunriseDisplay: String = "",
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
    self.latitude = latitude
    self.longitude = longitude
    self.altitude = altitude
    self.calculationMethod = calculationMethod
    self.asrMethod = asrMethod
    self.maghribOffsetMinutes = maghribOffsetMinutes
    self.fixedDhuhrLocalTime = fixedDhuhrLocalTime
    self.days = days
    self.weekdayDari = weekdayDari
    self.shamsiDisplay = shamsiDisplay
    self.hijriDisplay = hijriDisplay
    self.gregorianDisplay = gregorianDisplay
    self.sunriseDisplay = sunriseDisplay
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
    latitude = try container.decodeIfPresent(Double.self, forKey: .latitude) ?? 34.5553
    longitude = try container.decodeIfPresent(Double.self, forKey: .longitude) ?? 69.2075
    altitude = try container.decodeIfPresent(Double.self, forKey: .altitude) ?? 1791
    calculationMethod = try container.decodeIfPresent(String.self, forKey: .calculationMethod) ?? "Karachi"
    asrMethod = try container.decodeIfPresent(String.self, forKey: .asrMethod) ?? "Hanafi"
    maghribOffsetMinutes = try container.decodeIfPresent(Int.self, forKey: .maghribOffsetMinutes) ?? 0
    fixedDhuhrLocalTime = try container.decodeIfPresent(String.self, forKey: .fixedDhuhrLocalTime)
    days = try container.decodeIfPresent([WidgetDaySnapshot].self, forKey: .days)
    weekdayDari = try container.decode(String.self, forKey: .weekdayDari)
    shamsiDisplay = try container.decode(String.self, forKey: .shamsiDisplay)
    hijriDisplay = try container.decode(String.self, forKey: .hijriDisplay)
    gregorianDisplay = try container.decode(String.self, forKey: .gregorianDisplay)
    sunriseDisplay = try container.decodeIfPresent(String.self, forKey: .sunriseDisplay)
      ?? days?.first?.sunriseDisplay
      ?? ""
    currentPrayer = try container.decodeIfPresent(String.self, forKey: .currentPrayer)
    prayers = try container.decode([WidgetPrayerEntry].self, forKey: .prayers)
    nextRefreshAtMs = try container.decode(Double.self, forKey: .nextRefreshAtMs)
  }

  var hasCalculationInputs: Bool {
    latitude.isFinite && longitude.isFinite && abs(latitude) <= 90 && abs(longitude) <= 180
  }
}

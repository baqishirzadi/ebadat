import Foundation

/// Offline Karachi/Hanafi-compatible calculator used by the widget extension.
/// It intentionally mirrors the app's deterministic fallback equations and has
/// no dependency on the main app process or network.
struct WidgetPrayerTimes {
  let fajr: Date
  let sunrise: Date
  let dhuhr: Date
  let asr: Date
  let maghrib: Date
  let isha: Date
}

enum WidgetPrayerCalculator {
  private static let degToRad = Double.pi / 180
  private static let radToDeg = 180 / Double.pi
  private static let solarMonths = ["حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله", "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت"]
  private static let hijriMonths = ["محرم", "صفر", "ربیع‌الاول", "ربیع‌الثانی", "جمادی‌الاول", "جمادی‌الثانی", "رجب", "شعبان", "رمضان", "شوال", "ذوالقعده", "ذوالحجه"]
  private static let gregorianMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  private static let weekdays = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"]

  static func calculate(snapshot: WidgetSnapshot, date: Date) -> WidgetPrayerTimes {
    let timezone = TimeZone(identifier: snapshot.timezone.isEmpty ? "Asia/Kabul" : snapshot.timezone) ?? .current
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timezone
    let components = calendar.dateComponents([.year, .month, .day], from: date)
    let year = components.year ?? 2000
    let month = components.month ?? 1
    let day = components.day ?? 1
    let noon = calendar.date(from: DateComponents(year: year, month: month, day: day, hour: 12)) ?? date

    let jd = julianDate(year: year, month: month, day: day) - snapshot.longitude / (15 * 24)
    let sun = sunPosition(jd)
    let timezoneHours = Double(timezone.secondsFromGMT(for: noon)) / 3600
    let noonHour = fixedDhuhrHour(snapshot.fixedDhuhrLocalTime) ?? (12 - sun.equation + timezoneHours - snapshot.longitude / 15)
    let latitude = snapshot.latitude
    let altitude = max(0, snapshot.altitude)
    let method = snapshot.calculationMethod.lowercased()
    let fajrAngle: Double = method == "mwl" ? 18.0 : 18.0
    let ishaAngle: Double = method == "makkah" ? 0.0 : 18.0
    let sunriseAngle = 0.833 + 0.0347 * sqrt(altitude)
    let fajrHour = computeTime(angle: fajrAngle, time: noonHour, clockwise: false, latitude: latitude, declination: sun.declination)
    let sunriseHour = computeTime(angle: sunriseAngle, time: noonHour, clockwise: false, latitude: latitude, declination: sun.declination)
    let asrFactor = snapshot.asrMethod == "Hanafi" ? 2.0 : 1.0
    let asrAngle = -atan(1 / (asrFactor + tan(abs(latitude - sun.declination)))) * radToDeg
    let asrHour = computeTime(angle: asrAngle, time: noonHour, clockwise: true, latitude: latitude, declination: sun.declination)
    let maghribHour = computeTime(angle: sunriseAngle, time: noonHour, clockwise: true, latitude: latitude, declination: sun.declination)
    let rawIshaHour = ishaAngle > 0
      ? computeTime(angle: ishaAngle, time: noonHour, clockwise: true, latitude: latitude, declination: sun.declination)
      : maghribHour + 1.5

    let fajr = localDate(hour: fajrHour, on: noon, calendar: calendar)
    let sunrise = localDate(hour: sunriseHour, on: noon, calendar: calendar)
    let dhuhr = localDate(hour: noonHour, on: noon, calendar: calendar)
    let asr = localDate(hour: asrHour, on: noon, calendar: calendar)
    let maghrib = localDate(hour: maghribHour, on: noon, calendar: calendar).addingTimeInterval(Double(snapshot.maghribOffsetMinutes) * 60)
    let isha = localDate(hour: rawIshaHour, on: noon, calendar: calendar)
    return WidgetPrayerTimes(fajr: fajr, sunrise: sunrise, dhuhr: dhuhr, asr: asr, maghrib: maghrib, isha: isha)
  }

  static func daySnapshot(snapshot: WidgetSnapshot, date: Date) -> WidgetDaySnapshot {
    let timezone = TimeZone(identifier: snapshot.timezone.isEmpty ? "Asia/Kabul" : snapshot.timezone) ?? .current
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timezone
    let times = calculate(snapshot: snapshot, date: date)
    let parts = calendar.dateComponents([.year, .month, .day, .weekday], from: date)
    let dateKey = String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    let prayers: [WidgetPrayerEntry] = [
      ("fajr", "صبح", times.fajr),
      ("dhuhr", "ظهر", times.dhuhr),
      ("asr", "عصر", times.asr),
      ("maghrib", "شام", times.maghrib),
      ("isha", "خفتن", times.isha)
    ].map { key, label, value in
      WidgetPrayerEntry(key: key, labelDari: label, time12h: formatTime(value, timezone: timezone), atMs: value.timeIntervalSince1970 * 1000)
    }
    return WidgetDaySnapshot(
      dateKey: dateKey,
      weekdayDari: weekdays[max(0, min(6, (parts.weekday ?? 1) - 1))],
      shamsiDisplay: solarDisplay(date: date, timezone: timezone),
      hijriDisplay: hijriDisplay(date: date, timezone: timezone),
      gregorianDisplay: gregorianDisplay(date: date, calendar: calendar),
      sunriseDisplay: "طلوع آفتاب \(formatTime(times.sunrise, timezone: timezone))",
      prayers: prayers
    )
  }

  static func dateForKey(_ key: String, timezone: TimeZone) -> Date? {
    let values = key.split(separator: "-").compactMap { Int($0) }
    guard values.count == 3 else { return nil }
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timezone
    return calendar.date(from: DateComponents(year: values[0], month: values[1], day: values[2], hour: 12))
  }

  private static func sin(_ degrees: Double) -> Double { Foundation.sin(degrees * degToRad) }
  private static func cos(_ degrees: Double) -> Double { Foundation.cos(degrees * degToRad) }
  private static func tan(_ degrees: Double) -> Double { Foundation.tan(degrees * degToRad) }
  private static func asin(_ value: Double) -> Double { Foundation.asin(max(-1, min(1, value))) * radToDeg }
  private static func acos(_ value: Double) -> Double { Foundation.acos(max(-1, min(1, value))) * radToDeg }

  private static func julianDate(year: Int, month: Int, day: Int) -> Double {
    var y = year
    var m = month
    if m <= 2 { y -= 1; m += 12 }
    let a = floor(Double(y) / 100)
    let b = 2 - a + floor(a / 4)
    return floor(365.25 * Double(y + 4716)) + floor(30.6001 * Double(m + 1)) + Double(day) + b - 1524.5
  }

  private static func sunPosition(_ jd: Double) -> (declination: Double, equation: Double) {
    let d = jd - 2451545.0
    let g = fixAngle(357.529 + 0.98560028 * d)
    let q = fixAngle(280.459 + 0.98564736 * d)
    let l = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g))
    let e = 23.439 - 0.00000036 * d
    let rightAscension = atan2(cos(e) * sin(l), cos(l)) * radToDeg / 15
    let equation = q / 15 - fixHour(rightAscension)
    return (asin(sin(e) * sin(l)), equation)
  }

  private static func fixAngle(_ value: Double) -> Double { value - 360 * floor(value / 360) }
  private static func fixHour(_ value: Double) -> Double { value - 24 * floor(value / 24) }

  private static func computeTime(angle: Double, time: Double, clockwise: Bool, latitude: Double, declination: Double) -> Double {
    let denominator = cos(latitude) * cos(declination)
    if abs(denominator) < 0.0001 { return time + (clockwise ? 1 : -1) }
    let ratio = (-sin(angle) - sin(latitude) * sin(declination)) / denominator
    let hourAngle = acos(ratio) / 15
    let value = time + (clockwise ? hourAngle : -hourAngle)
    return value.isFinite ? value : time + (clockwise ? 1 : -1)
  }

  private static func localDate(hour: Double, on anchor: Date, calendar: Calendar) -> Date {
    let safeHour = hour.isFinite ? hour : 12
    let dayOffset = Int(floor(safeHour / 24))
    var normalized = safeHour - Double(dayOffset * 24)
    if normalized < 0 { normalized += 24 }
    let wholeHour = min(23, max(0, Int(floor(normalized))))
    let minute = min(59, max(0, Int(floor((normalized - Double(wholeHour)) * 60))))
    let base = calendar.date(bySettingHour: wholeHour, minute: minute, second: 0, of: anchor) ?? anchor
    return calendar.date(byAdding: .day, value: dayOffset, to: base) ?? base
  }

  private static func fixedDhuhrHour(_ value: String?) -> Double? {
    guard let value, let separator = value.firstIndex(of: ":") else { return nil }
    guard let hour = Double(value[..<separator]), let minute = Double(value[value.index(after: separator)...]), hour >= 0, hour < 24, minute >= 0, minute < 60 else { return nil }
    return hour + minute / 60
  }

  private static func formatTime(_ date: Date, timezone: TimeZone) -> String {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timezone
    let parts = calendar.dateComponents([.hour, .minute], from: date)
    var hour = parts.hour ?? 0
    if hour == 0 { hour = 12 } else if hour > 12 { hour -= 12 }
    return persianDigits(String(format: "%d:%02d", hour, parts.minute ?? 0))
  }

  private static func gregorianDisplay(date: Date, calendar: Calendar) -> String {
    let parts = calendar.dateComponents([.year, .month, .day], from: date)
    let monthIndex = max(1, min(12, parts.month ?? 1)) - 1
    return "\(parts.day ?? 1) \(gregorianMonths[monthIndex]) \(parts.year ?? 0)"
  }

  private static func solarDisplay(date: Date, timezone: TimeZone) -> String {
    var calendar = Calendar(identifier: .persian)
    calendar.timeZone = timezone
    let parts = calendar.dateComponents([.year, .month, .day], from: date)
    let month = max(1, min(12, parts.month ?? 1))
    return "\(persianDigits(String(parts.day ?? 1))) \(solarMonths[month - 1]) \(persianDigits(String(parts.year ?? 0)))"
  }

  private static func hijriDisplay(date: Date, timezone: TimeZone) -> String {
    var calendar = Calendar(identifier: .islamicUmmAlQura)
    calendar.timeZone = timezone
    let shifted = calendar.date(byAdding: .day, value: -1, to: date) ?? date
    let parts = calendar.dateComponents([.year, .month, .day], from: shifted)
    let month = max(1, min(12, parts.month ?? 1))
    return "\(persianDigits(String(parts.day ?? 1))) \(hijriMonths[month - 1]) \(persianDigits(String(parts.year ?? 0)))"
  }

  private static func persianDigits(_ value: String) -> String {
    let map: [Character: Character] = ["0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴", "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹"]
    return String(value.map { map[$0] ?? $0 })
  }
}

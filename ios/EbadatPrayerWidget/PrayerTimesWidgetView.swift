import SwiftUI
import WidgetKit

/// Every line of the medium widget is sized by this Dari Nastaliq reference,
/// so Dari, Pashto and English share one frame and nothing moves when the
/// app language changes.
private let referenceFont = "NotoNastaliqUrdu"
private let referenceSample = "صبح ظهر"

struct PrayerTimesWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: PrayerTimesWidgetEntry

  private var snapshot: WidgetSnapshot? { entry.snapshot }
  private var isPashto: Bool { snapshot?.appLanguage == "pashto" }
  private var isEnglish: Bool { snapshot?.appLanguage == "english" }
  private var isTurkish: Bool { snapshot?.appLanguage == "turkish" }
  private var isArabic: Bool { snapshot?.appLanguage == "arabic" }
  private var isLatin: Bool { isEnglish || isTurkish }
  private var isDari: Bool { !isLatin && !isPashto && !isArabic }
  private var hijriPrimary: Bool { isEnglish || isTurkish || isArabic }
  private var uiFontRegular: String {
    if isLatin { return "Vazirmatn" }
    if isArabic { return "NotoNaskhArabic-Regular" }
    if isDari { return "NotoNastaliqUrdu" }
    guard let snapshot, snapshot.version >= 7 else { return "NotoNaskhArabic-Regular" }
    return snapshot.pashtoFont == "amiri" ? "Amiri" : "NotoNaskhArabic-Regular"
  }
  private var uiFontBold: String {
    switch uiFontRegular {
    case "Vazirmatn": return "Vazirmatn-Bold"
    case "Amiri": return "Amiri-Bold"
    case "NotoNastaliqUrdu": return "NotoNastaliqUrdu"
    default: return "NotoNaskhArabic-Bold"
    }
  }
  /// Naskh sits small inside the Nastaliq line box. Draw Pashto larger in that same box.
  private var pashtoGlyphScale: CGFloat {
    guard isPashto else { return 1 }
    return snapshot?.pashtoFont == "amiri" ? 1.15 : 1.25
  }

  private static let weekdayEnglish: [String: String] = [
    "یکشنبه": "Sun", "دوشنبه": "Mon", "سه‌شنبه": "Tue", "سې‌شنبه": "Tue",
    "چهارشنبه": "Wed", "پنجشنبه": "Thu", "جمعه": "Fri", "شنبه": "Sat",
  ]
  private static let solarMonthEnglish: [String: String] = [
    "حمل": "Hamal", "ثور": "Sawr", "جوزا": "Jawza", "سرطان": "Saratan",
    "اسد": "Asad", "سنبله": "Sonbola", "میزان": "Mizan", "عقرب": "Aqrab",
    "قوس": "Qaws", "جدی": "Jadi", "دلو": "Dalw", "حوت": "Hut",
  ]
  private static let hijriMonthEnglish: [String: String] = [
    "محرم": "Muharram", "صفر": "Safar", "ربیع‌الاول": "Rabi I", "ربیع‌الثانی": "Rabi II",
    "جمادی‌الاول": "Jumada I", "جمادی‌الثانی": "Jumada II", "رجب": "Rajab", "شعبان": "Shaban",
    "رمضان": "Ramadan", "شوال": "Shawwal", "ذوالقعده": "Dhul Qadah", "ذوالحجه": "Dhul Hijjah",
  ]
  private static let gregMonthDari: [String: String] = [
    "JAN": "جنوری", "FEB": "فبروری", "MAR": "مارچ", "APR": "اپریل",
    "MAY": "می", "JUN": "جون", "JUL": "جولای", "AUG": "اگست",
    "SEP": "سپتمبر", "OCT": "اکتوبر", "NOV": "نومبر", "DEC": "دسمبر",
  ]
  private static let gregMonthPashto: [String: String] = [
    "JAN": "جنوري", "FEB": "فبروري", "MAR": "مارچ", "APR": "اپرېل",
    "MAY": "مۍ", "JUN": "جون", "JUL": "جولای", "AUG": "اګست",
    "SEP": "سپتمبر", "OCT": "اکتوبر", "NOV": "نومبر", "DEC": "ډسمبر",
  ]
  private static let prayerEnglish: [String: String] = [
    "fajr": "Fajr", "dhuhr": "Dhuhr", "asr": "Asr", "maghrib": "Maghrib", "isha": "Isha",
  ]

  private func easternDigits(_ value: String) -> String {
    let map: [Character: Character] = [
      "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤",
      "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩",
    ]
    return String(value.map { map[$0] ?? $0 })
  }

  private func latinDigits(_ value: String) -> String {
    let map: [Character: Character] = [
      "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
      "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    ]
    return String(value.map { map[$0] ?? $0 })
  }

  private func tokens(_ value: String) -> [String] {
    value.trimmingCharacters(in: .whitespacesAndNewlines)
      .split(whereSeparator: { $0.isWhitespace })
      .map(String.init)
  }

  /// "day month year" with the month translated to English and Latin digits.
  private func englishDate(_ value: String, months: [String: String]) -> String {
    let parts = tokens(value)
    guard parts.count >= 2 else { return latinDigits(value) }
    let day = latinDigits(parts[0])
    let lastIsYear = parts.count >= 3 && Int(latinDigits(parts[parts.count - 1])) != nil
    let monthRaw = (lastIsYear ? parts[1..<(parts.count - 1)] : parts[1...]).joined(separator: " ")
    let month = months[monthRaw] ?? monthRaw
    let year = lastIsYear ? latinDigits(parts[parts.count - 1]) : ""
    return [day, month, year].filter { !$0.isEmpty }.joined(separator: " ")
  }

  private static let weekdayTurkish: [String: String] = [
    "یکشنبه": "Paz", "دوشنبه": "Pzt", "سه‌شنبه": "Sal", "سې‌شنبه": "Sal", "چهارشنبه": "Çar",
    "پنجشنبه": "Per", "جمعه": "Cum", "شنبه": "Cmt",
  ]
  private static let gregorianMonthTurkish: [String: String] = [
    "JAN": "Ocak", "FEB": "Şubat", "MAR": "Mart", "APR": "Nisan",
    "MAY": "Mayıs", "JUN": "Haziran", "JUL": "Temmuz", "AUG": "Ağustos",
    "SEP": "Eylül", "OCT": "Ekim", "NOV": "Kasım", "DEC": "Aralık",
  ]
  private static let weekdayArabic: [String: String] = [
    "یکشنبه": "الأحد", "دوشنبه": "الإثنين", "سه‌شنبه": "الثلاثاء", "چهارشنبه": "الأربعاء",
    "پنجشنبه": "الخميس", "جمعه": "الجمعة", "شنبه": "السبت",
  ]
  private static let solarMonthTurkish: [String: String] = [
    "حمل": "Hamel", "ثور": "Sevr", "جوزا": "Cevza", "سرطان": "Seretan",
    "اسد": "Esed", "سنبله": "Sünbüle", "میزان": "Mizan", "عقرب": "Akrep",
    "قوس": "Kavs", "جدی": "Cedi", "دلو": "Delv", "حوت": "Hut",
  ]
  private static let solarMonthArabic: [String: String] = [
    "حمل": "الحمل", "ثور": "الثور", "جوزا": "الجوزاء", "سرطان": "السرطان",
    "اسد": "الأسد", "سنبله": "السنبلة", "میزان": "الميزان", "عقرب": "العقرب",
    "قوس": "القوس", "جدی": "الجدي", "دلو": "الدلو", "حوت": "الحوت",
  ]
  private static let hijriMonthTurkish: [String: String] = [
    "محرم": "Muharrem", "صفر": "Safer", "ربیع‌الاول": "Rebiülevvel", "ربیع‌الثانی": "Rebiülahir",
    "جمادی‌الاول": "Cemaziyelevvel", "جمادی‌الثانی": "Cemaziyelahir", "رجب": "Recep", "شعبان": "Şaban",
    "رمضان": "Ramazan", "شوال": "Şevval", "ذوالقعده": "Zilkade", "ذوالحجه": "Zilhicce",
  ]
  private static let hijriMonthArabic: [String: String] = [
    "محرم": "المحرم", "صفر": "صفر", "ربیع‌الاول": "ربيع الأول", "ربیع‌الثانی": "ربيع الثاني",
    "جمادی‌الاول": "جمادى الأولى", "جمادی‌الثانی": "جمادى الثانية", "رجب": "رجب", "شعبان": "شعبان",
    "رمضان": "رمضان", "شوال": "شوال", "ذوالقعده": "ذو القعدة", "ذوالحجه": "ذو الحجة",
  ]
  private static let prayerTurkish: [String: String] = [
    "fajr": "İmsak", "dhuhr": "Öğle", "asr": "İkindi", "maghrib": "Akşam", "isha": "Yatsı",
  ]
  private static let prayerArabic: [String: String] = [
    "fajr": "الفجر", "dhuhr": "الظهر", "asr": "العصر", "maghrib": "المغرب", "isha": "العشاء",
  ]

  private func headerTitle(_ value: WidgetSnapshot) -> String {
    if isTurkish {
      let day = Self.weekdayTurkish[value.weekdayDari] ?? ""
      return [day, hijriCell(value)].filter { !$0.isEmpty }.joined(separator: ", ")
    }
    if isEnglish {
      let day = Self.weekdayEnglish[value.weekdayDari] ?? ""
      return [day, hijriCell(value)].filter { !$0.isEmpty }.joined(separator: ", ")
    }
    if isArabic {
      let day = Self.weekdayArabic[value.weekdayDari] ?? value.weekdayDari
      return [day, hijriCell(value)].filter { !$0.isEmpty }.joined(separator: "، ")
    }
    let weekday = isPashto ? (value.weekdayPashto ?? value.weekdayDari) : value.weekdayDari
    let solar = isPashto ? (value.shamsiDisplayPashto ?? value.shamsiDisplay) : value.shamsiDisplay
    return [weekday, solar].filter { !$0.isEmpty }.joined(separator: "، ")
  }

  private func solarCell(_ value: WidgetSnapshot) -> String {
    if isTurkish { return englishDate(value.shamsiDisplay, months: Self.solarMonthTurkish) }
    if isEnglish { return englishDate(value.shamsiDisplay, months: Self.solarMonthEnglish) }
    if isArabic {
      return tokens(value.shamsiDisplay).map { part in
        if Int(latinDigits(part)) != nil { return easternDigits(latinDigits(part)) }
        return Self.solarMonthArabic[part] ?? part
      }.joined(separator: " ")
    }
    return isPashto ? (value.shamsiDisplayPashto ?? value.shamsiDisplay) : value.shamsiDisplay
  }

  /// Day and month, without the year, so the cell fits one line.
  private func gregorianCell(_ value: WidgetSnapshot) -> String {
    let parts = tokens(value.gregorianDisplay)
    guard parts.count >= 2 else { return value.gregorianDisplay }
    let key = parts[1].uppercased()
    if isTurkish {
      return "\(latinDigits(parts[0])) \(Self.gregorianMonthTurkish[key] ?? key)"
    }
    if isEnglish { return "\(latinDigits(parts[0])) \(key)" }
    if isArabic {
      let arabicMonths = ["JAN": "يناير", "FEB": "فبراير", "MAR": "مارس", "APR": "أبريل", "MAY": "مايو", "JUN": "يونيو", "JUL": "يوليو", "AUG": "أغسطس", "SEP": "سبتمبر", "OCT": "أكتوبر", "NOV": "نوفمبر", "DEC": "ديسمبر"]
      return "\(easternDigits(parts[0])) \(arabicMonths[key] ?? parts[1])"
    }
    let month = (isPashto ? Self.gregMonthPashto[key] : Self.gregMonthDari[key]) ?? parts[1]
    return "\(easternDigits(parts[0])) \(month)"
  }

  private func sunriseTime(_ value: WidgetSnapshot) -> String {
    let raw = isPashto ? (value.sunriseDisplayPashto ?? value.sunriseDisplay) : value.sunriseDisplay
    let time = tokens(raw).last ?? ""
    return isLatin ? latinDigits(time) : time
  }

  private var sunriseCaption: String {
    if isTurkish { return "Güneş" }
    if isEnglish { return "Sunrise" }
    if isArabic { return "الشروق" }
    return isPashto ? "لمر" : "طلوع"
  }

  private func sunriseCell(_ value: WidgetSnapshot) -> String {
    let time = sunriseTime(value)
    return time.isEmpty ? sunriseCaption : "\(sunriseCaption) \(time)"
  }

  private func hijriCell(_ value: WidgetSnapshot) -> String {
    if isTurkish {
      if let turkish = value.hijriDisplayTurkish, !turkish.isEmpty { return turkish }
      return englishDate(value.hijriDisplay, months: Self.hijriMonthTurkish)
    }
    if isEnglish { return englishDate(value.hijriDisplay, months: Self.hijriMonthEnglish) }
    if isArabic {
      return tokens(value.hijriDisplay).map { part in
        if Int(latinDigits(part)) != nil { return easternDigits(latinDigits(part)) }
        return Self.hijriMonthArabic[part] ?? part
      }.joined(separator: " ")
    }
    return isPashto ? (value.hijriDisplayPashto ?? value.hijriDisplay) : value.hijriDisplay
  }

  private func label(_ value: WidgetPrayerEntry) -> String {
    if isTurkish { return Self.prayerTurkish[value.key] ?? value.labelDari }
    if isEnglish { return Self.prayerEnglish[value.key] ?? value.labelDari }
    if isArabic { return Self.prayerArabic[value.key] ?? value.labelDari }
    return isPashto ? (value.labelPashto ?? value.labelDari) : value.labelDari
  }

  private func prayerTime(_ value: WidgetPrayerEntry) -> String {
    if isTurkish || isEnglish {
      let date = Date(timeIntervalSince1970: value.atMs / 1000)
      let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
      let minute = String(format: "%02d", parts.minute ?? 0)
      if isTurkish {
        return String(format: "%02d:%@", parts.hour ?? 0, minute)
      }
      let hour24 = parts.hour ?? 0
      let suffix = hour24 >= 12 ? "PM" : "AM"
      let hour12 = hour24 % 12 == 0 ? 12 : hour24 % 12
      return "\(hour12):\(minute) \(suffix)"
    }
    return value.time12h
  }

  private var palette: WidgetPalette { widgetPalette(for: snapshot?.themeMode) }

  private var widgetBackground: LinearGradient {
    LinearGradient(
      colors: [palette.gradientStart, palette.gradientEnd],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
  }

  private var accent: Color { palette.accent }

  var body: some View {
    ZStack {
      switch family {
      case .accessoryRectangular:
        accessoryRectangular
      case .accessoryCircular:
        accessoryCircular
      default:
        homeMedium
      }
    }
    .ifAvailableWidgetBackground(widgetBackground)
    .background(widgetBackground)
    .widgetURL(URL(string: "ebadat:///(tabs)/jantari"))
  }

  /// Keep the complete three-row layout inside WidgetKit's rounded medium
  /// widget bounds, including the extra line height of the prayer chips.
  private func homeScale(for height: CGFloat) -> CGFloat {
    min(0.88, max(0.72, height / 194))
  }

  @ViewBuilder
  private var homeMedium: some View {
    if let snapshot {
      GeometryReader { geo in
        let s = homeScale(for: geo.size.height)
        VStack(alignment: .center, spacing: 3 * s) {
          LockedLine(text: headerTitle(snapshot), font: uiFontBold, size: 20 * s, color: accent, minimumScale: 0.6, glyphScale: pashtoGlyphScale)

          HStack(spacing: 4) {
            LockedLine(text: gregorianCell(snapshot), font: uiFontBold, size: 15 * s, color: .white.opacity(0.85), glyphScale: pashtoGlyphScale)
            LockedLine(text: sunriseCell(snapshot), font: uiFontBold, size: 15 * s, color: accent, glyphScale: pashtoGlyphScale)
            LockedLine(text: hijriPrimary ? solarCell(snapshot) : hijriCell(snapshot), font: uiFontBold, size: 15 * s, color: .white, glyphScale: pashtoGlyphScale)
          }
          .frame(maxWidth: .infinity)

          HStack(spacing: 3 * s) {
            ForEach(snapshot.prayers, id: \.key) { prayer in
              PrayerChipView(
                label: label(prayer),
                time: prayerTime(prayer),
                active: snapshot.currentPrayer == prayer.key,
                boldFont: uiFontBold,
                chipText: palette.chipText,
                scale: s,
                glyphScale: pashtoGlyphScale
              )
            }
          }
          .padding(.horizontal, 7 * s)
        }
        .padding(.horizontal, 6 * s)
        .padding(.vertical, 5 * s)
        .frame(width: geo.size.width, height: geo.size.height, alignment: .center)
      }
      // Fajr, Gregorian and the title stay on the same edge in every language.
      .environment(\.layoutDirection, isLatin ? .leftToRight : .rightToLeft)
    } else {
      emptyState
    }
  }

  @ViewBuilder
  private var accessoryRectangular: some View {
    if let snapshot {
      VStack(alignment: .leading, spacing: 2) {
        Text(headerTitle(snapshot))
          .font(.custom(uiFontBold, size: 13 * pashtoGlyphScale))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        if !sunriseTime(snapshot).isEmpty {
          Text(sunriseCell(snapshot))
            .font(.custom(isPashto ? uiFontBold : uiFontRegular, size: 11 * pashtoGlyphScale))
            .foregroundColor(.secondary)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
        if let next = nextPrayer(from: snapshot) {
          Text("\(label(next)) \(prayerTime(next))")
            .font(.custom(uiFontBold, size: 12 * pashtoGlyphScale))
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .environment(\.layoutDirection, isLatin ? .leftToRight : .rightToLeft)
    } else {
      Text("عبادت")
        .font(.custom(uiFontBold, size: 13))
    }
  }

  @ViewBuilder
  private var accessoryCircular: some View {
    if let snapshot, let next = nextPrayer(from: snapshot) {
      VStack(spacing: 1) {
        Text(label(next))
          .font(.custom(uiFontBold, size: isPashto ? 12 : 10))
          .lineLimit(1)
          .minimumScaleFactor(0.62)
          .allowsTightening(true)
        Text(prayerTime(next))
          .font(.custom(uiFontBold, size: 12))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      .environment(\.layoutDirection, isLatin ? .leftToRight : .rightToLeft)
    } else if let snapshot, !sunriseTime(snapshot).isEmpty {
      Text(sunriseTime(snapshot))
        .font(.custom(uiFontBold, size: 12))
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .environment(\.layoutDirection, isLatin ? .leftToRight : .rightToLeft)
    } else {
      Text("عبادت")
        .font(.custom("Vazirmatn-Bold", size: 11))
    }
  }

  private var emptyState: some View {
    VStack(spacing: 6) {
      Text("عبادت")
        .font(.custom("Vazirmatn-Bold", size: 18))
        .foregroundColor(.white)
    }
    .environment(\.layoutDirection, isLatin ? .leftToRight : .rightToLeft)
  }

  private func nextPrayer(from snapshot: WidgetSnapshot) -> WidgetPrayerEntry? {
    let order = ["fajr", "dhuhr", "asr", "maghrib", "isha"]
    if let current = snapshot.currentPrayer,
       let idx = order.firstIndex(of: current),
       idx + 1 < order.count,
       let next = snapshot.prayers.first(where: { $0.key == order[idx + 1] }) {
      return next
    }
    return snapshot.prayers.first
  }
}

/// One text line whose box is always the height of the Dari Nastaliq
/// reference at the same size; other fonts shrink to fit inside it.
private struct LockedLine: View {
  let text: String
  let font: String
  let size: CGFloat
  let color: Color
  var minimumScale: CGFloat = 0.6
  /// Draws the glyphs larger inside the unchanged Nastaliq line box.
  var glyphScale: CGFloat = 1

  var body: some View {
    Text(referenceSample)
      .font(.custom(referenceFont, size: size))
      .lineLimit(1)
      .hidden()
      .frame(maxWidth: .infinity)
      .overlay(
        Text(text)
          .font(.custom(font, size: size * glyphScale))
          .foregroundColor(color)
          .lineLimit(1)
          .minimumScaleFactor(minimumScale)
          .allowsTightening(true)
          .multilineTextAlignment(.center)
      )
  }
}

private struct WidgetPalette {
  let gradientStart: Color
  let gradientEnd: Color
  let accent: Color
  let chipText: Color
}

private func widgetPalette(for mode: String?) -> WidgetPalette {
  switch mode {
  case "night":
    return WidgetPalette(
      gradientStart: Color(red: 0, green: 0, blue: 0),
      gradientEnd: Color(red: 0.078, green: 0.078, blue: 0.078),
      accent: Color(red: 0.949, green: 0.949, blue: 0.949),
      chipText: Color(red: 0.067, green: 0.067, blue: 0.067)
    )
  case "sapphire":
    return WidgetPalette(
      gradientStart: Color(red: 0.082, green: 0.165, blue: 0.271),
      gradientEnd: Color(red: 0.118, green: 0.227, blue: 0.373),
      accent: Color(red: 0.839, green: 0.894, blue: 0.961),
      chipText: Color(red: 0.118, green: 0.227, blue: 0.373)
    )
  case "burgundy":
    return WidgetPalette(
      gradientStart: Color(red: 0.290, green: 0.118, blue: 0.157),
      gradientEnd: Color(red: 0.420, green: 0.176, blue: 0.235),
      accent: Color(red: 0.965, green: 0.835, blue: 0.863),
      chipText: Color(red: 0.420, green: 0.176, blue: 0.235)
    )
  default:
    return WidgetPalette(
      gradientStart: Color(red: 0.06, green: 0.12, blue: 0.08),
      gradientEnd: Color(red: 0.10, green: 0.30, blue: 0.24),
      accent: Color(red: 0.55, green: 0.85, blue: 0.72),
      chipText: Color(red: 0.10, green: 0.30, blue: 0.24)
    )
  }
}

private struct PrayerChipView: View {
  let label: String
  let time: String
  let active: Bool
  let boldFont: String
  let chipText: Color
  var scale: CGFloat = 1
  var glyphScale: CGFloat = 1

  private var tint: Color { chipText }

  var body: some View {
    VStack(spacing: 0) {
      LockedLine(
        text: label,
        font: boldFont,
        size: 13 * scale,
        color: active ? tint : .white,
        minimumScale: 0.62,
        glyphScale: glyphScale
      )
      LockedLine(
        text: time,
        font: boldFont,
        size: 15 * scale,
        color: active ? tint.opacity(0.85) : .white.opacity(0.85),
        minimumScale: 0.7,
        glyphScale: glyphScale
      )
    }
    .frame(maxWidth: .infinity)
    .padding(.horizontal, 2 * scale)
    .padding(.vertical, 2 * scale)
    .background(active ? Color.white : Color.white.opacity(0.12))
    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
  }
}

private extension View {
  @ViewBuilder
  func ifAvailableWidgetBackground(_ background: LinearGradient) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      self.containerBackground(for: .widget) {
        background
      }
    } else {
      self
    }
  }
}

struct PrayerTimesWidgetView_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      PrayerTimesWidgetView(entry: PrayerTimesWidgetEntry(date: Date(), snapshot: WidgetShared.loadSnapshot()))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
  }
}

import SwiftUI
import WidgetKit

struct PrayerTimesWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: PrayerTimesWidgetEntry

  private var snapshot: WidgetSnapshot? { entry.snapshot }
  private var isPashto: Bool { snapshot?.appLanguage == "pashto" }
  private var isEnglish: Bool { snapshot?.appLanguage == "english" }
  private var isDari: Bool { !isEnglish && !isPashto }
  private var dariNastaliq: Bool { isDari }
  private var uiFontRegular: String {
    if isEnglish { return "Vazirmatn" }
    if isDari { return "NotoNastaliqUrdu" }
    if isPashto {
      return snapshot?.pashtoFont == "nastaliq" ? "NotoNastaliqUrdu" : "Amiri"
    }
    return snapshot?.dariFont == "amiri" ? "Amiri" : "Vazirmatn"
  }
  private var uiFontBold: String {
    if uiFontRegular == "Vazirmatn" { return "Vazirmatn-Bold" }
    if uiFontRegular == "Amiri" { return "Amiri-Bold" }
    return "NotoNastaliqUrdu"
  }
  private func weekday(_ value: WidgetSnapshot) -> String { isPashto ? (value.weekdayPashto ?? value.weekdayDari) : value.weekdayDari }
  private func hijri(_ value: WidgetSnapshot) -> String { isPashto ? (value.hijriDisplayPashto ?? value.hijriDisplay) : value.hijriDisplay }
  private func solar(_ value: WidgetSnapshot) -> String { isPashto ? (value.shamsiDisplayPashto ?? value.shamsiDisplay) : value.shamsiDisplay }
  private func sunrise(_ value: WidgetSnapshot) -> String { isPashto ? (value.sunriseDisplayPashto ?? value.sunriseDisplay) : value.sunriseDisplay }
  private func label(_ value: WidgetPrayerEntry) -> String { isPashto ? (value.labelPashto ?? value.labelDari) : value.labelDari }

  private static let gregMonthEnToDari: [String: String] = [
    "JAN": "جنوری", "FEB": "فبروری", "MAR": "مارچ", "APR": "اپریل",
    "MAY": "می", "JUN": "جون", "JUL": "جولای", "AUG": "اگست",
    "SEP": "سپتمبر", "OCT": "اکتوبر", "NOV": "نومبر", "DEC": "دسمبر",
  ]

  private func easternDigits(_ value: String) -> String {
    let map: [Character: Character] = [
      "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤",
      "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩",
    ]
    return String(value.map { map[$0] ?? $0 })
  }

  private func dariGregorianShort(_ gregorianDisplay: String) -> String {
    let parts = gregorianDisplay.trimmingCharacters(in: .whitespacesAndNewlines)
      .split(whereSeparator: { $0.isWhitespace })
      .map(String.init)
    guard parts.count >= 2 else { return easternDigits(gregorianDisplay.trimmingCharacters(in: .whitespacesAndNewlines)) }
    let day = easternDigits(parts[0])
    let month = Self.gregMonthEnToDari[parts[1].uppercased()] ?? parts[1]
    let year = parts.count >= 3 ? easternDigits(parts[2]) : ""
    return year.isEmpty ? "\(day) \(month)" : "\(day) \(month) \(year)"
  }

  /// Dari/Pashto accent title + three date cells (Dari shortens copy).
  private func rtlHeaderTitle(from value: WidgetSnapshot) -> String {
    [weekday(value), solar(value)].filter { !$0.isEmpty }.joined(separator: "، ")
  }

  private func gregorianCell(from value: WidgetSnapshot) -> String {
    if isDari { return dariGregorianShort(value.gregorianDisplay) }
    return "\(value.gregorianDisplay) میلادي"
  }

  private func hijriCell(from value: WidgetSnapshot) -> String {
    let h = hijri(value)
    return isDari ? h : "قمري \(h)"
  }

  private func sunriseCell(from value: WidgetSnapshot) -> String {
    let raw = sunrise(value).trimmingCharacters(in: .whitespacesAndNewlines)
    let parts = raw.split(whereSeparator: { $0.isWhitespace }).map(String.init)
    let time = parts.last ?? ""
    let caption: String
    if isDari {
      caption = "طلوع"
    } else if parts.count > 1 {
      caption = parts.dropLast().joined(separator: " ")
    } else {
      caption = "لمر ختل"
    }
    return time.isEmpty ? caption : "\(caption) \(time)"
  }
  private var widgetBackground: LinearGradient {
    LinearGradient(
      colors: [Color(red: 0.06, green: 0.12, blue: 0.08), Color(red: 0.10, green: 0.30, blue: 0.24)],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
  }

  private var accent: Color { Color(red: 0.55, green: 0.85, blue: 0.72) }
  private var tint: Color { Color(red: 0.10, green: 0.30, blue: 0.24) }

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

  @ViewBuilder
  private var homeMedium: some View {
    if let snapshot {
      VStack(alignment: .center, spacing: 4) {
        // Dari and Pashto share the polished Pashto card. English stays LTR.
        Text(isEnglish ? solar(snapshot) : rtlHeaderTitle(from: snapshot))
          .font(.custom(uiFontBold, size: 20))
          .foregroundColor(accent)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .allowsTightening(true)

        HStack(spacing: 4) {
          Text(isEnglish ? snapshot.gregorianDisplay : gregorianCell(from: snapshot))
            .font(.custom(uiFontBold, size: 15))
            .foregroundColor(.white.opacity(0.85))
            .lineLimit(1)
            .minimumScaleFactor(0.65)
            .allowsTightening(true)
            .frame(maxWidth: .infinity)

          Text(isEnglish ? sunrise(snapshot) : sunriseCell(from: snapshot))
            .font(.custom(uiFontBold, size: 15))
            .foregroundColor(accent)
            .lineLimit(1)
            .minimumScaleFactor(0.65)
            .allowsTightening(true)
            .frame(maxWidth: .infinity)

          Text(isEnglish ? hijri(snapshot) : hijriCell(from: snapshot))
            .font(.custom(uiFontBold, size: 15))
            .foregroundColor(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.65)
            .allowsTightening(true)
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity)

        HStack(spacing: 2) {
          ForEach(snapshot.prayers, id: \.key) { prayer in
            PrayerChipView(
              label: label(prayer),
              time: prayer.time12h,
              active: snapshot.currentPrayer == prayer.key,
              boldFont: uiFontBold,
              tightSpacing: isPashto || dariNastaliq
            )
          }
        }
      }
      .padding(.horizontal, 6)
      .padding(.vertical, 4)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
      .environment(\.layoutDirection, isEnglish ? .leftToRight : .rightToLeft)
    } else {
      emptyState
    }
  }

  @ViewBuilder
  private var accessoryRectangular: some View {
    if let snapshot {
      VStack(alignment: .leading, spacing: 2) {
        Text(solar(snapshot))
          .font(.custom(uiFontBold, size: 13))
          .minimumScaleFactor(0.8)
        if !sunrise(snapshot).isEmpty {
          Text(sunrise(snapshot))
            .font(.custom(uiFontRegular, size: 11))
            .foregroundColor(.secondary)
            .minimumScaleFactor(0.8)
        }
        if let next = nextPrayer(from: snapshot) {
          Text("\(label(next)) \(next.time12h)")
            .font(.custom(uiFontBold, size: 12))
            .minimumScaleFactor(0.8)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .environment(\.layoutDirection, .rightToLeft)
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
          .font(.custom(uiFontBold, size: 10))
          .minimumScaleFactor(0.7)
        Text(next.time12h)
          .font(.custom(uiFontBold, size: 12))
          .minimumScaleFactor(0.7)
      }
      .environment(\.layoutDirection, .rightToLeft)
    } else if let snapshot, !sunrise(snapshot).isEmpty {
      let prefix = isPashto ? "لمر ختل " : "طلوع آفتاب "
      Text(sunrise(snapshot).replacingOccurrences(of: prefix, with: ""))
        .font(.custom(uiFontBold, size: 12))
        .minimumScaleFactor(0.7)
        .environment(\.layoutDirection, .rightToLeft)
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
    .environment(\.layoutDirection, .rightToLeft)
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

private struct PrayerChipView: View {
  let label: String
  let time: String
  let active: Bool
  let boldFont: String
  /// Pashto / Dari Nastaliq pull the time up; Dari Vazirmatn keeps a clear gap.
  var tightSpacing: Bool = true

  var body: some View {
    VStack(spacing: tightSpacing ? 0 : 1) {
      Text(label)
        .font(.custom(boldFont, size: 13))
        .foregroundColor(active ? Color(red: 0.10, green: 0.30, blue: 0.24) : .white)
        .lineLimit(1)
        .minimumScaleFactor(0.62)
        .allowsTightening(true)
      Text(time)
        .font(.custom(boldFont, size: 15))
        .foregroundColor(active ? Color(red: 0.10, green: 0.30, blue: 0.24).opacity(0.85) : .white.opacity(0.85))
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .allowsTightening(true)
        .padding(.top, tightSpacing ? -2 : 0)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 3)
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

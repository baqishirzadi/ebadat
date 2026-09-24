import SwiftUI
import WidgetKit

struct PrayerTimesWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: PrayerTimesWidgetEntry

  private var snapshot: WidgetSnapshot? { entry.snapshot }
  private var isPashto: Bool { snapshot?.appLanguage == "pashto" }
  private var uiFontRegular: String {
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
      VStack(alignment: .center, spacing: 5) {
        HStack(spacing: 6) {
          Text(weekday(snapshot))
            .font(.custom(uiFontBold, size: 12))
            .foregroundColor(.white.opacity(0.9))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .allowsTightening(true)
          Spacer(minLength: 4)
          Text(snapshot.gregorianDisplay)
            .font(.custom(uiFontRegular, size: 10))
            .foregroundColor(.white.opacity(0.75))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .allowsTightening(true)
        }
        .frame(maxWidth: .infinity)

        Text(solar(snapshot))
          .font(.custom(uiFontBold, size: 18))
          .foregroundColor(accent)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .allowsTightening(true)

        HStack(spacing: 6) {
          Text(isPashto ? "قمري: \(hijri(snapshot))" : "قمری: \(hijri(snapshot))")
            .font(.custom(uiFontRegular, size: 10))
            .foregroundColor(.white.opacity(0.85))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .allowsTightening(true)
          if !sunrise(snapshot).isEmpty {
            Spacer(minLength: 4)
            Text(sunrise(snapshot))
              .font(.custom(uiFontBold, size: 10))
              .foregroundColor(accent)
              .lineLimit(1)
              .minimumScaleFactor(0.7)
              .allowsTightening(true)
          }
        }
        .frame(maxWidth: .infinity)

        HStack(spacing: 4) {
          ForEach(snapshot.prayers, id: \.key) { prayer in
            PrayerChipView(
              label: label(prayer),
              time: prayer.time12h,
              active: snapshot.currentPrayer == prayer.key,
              boldFont: uiFontBold,
              isPashto: isPashto
            )
          }
        }
      }
      .padding(.horizontal, 8)
      .padding(.vertical, 6)
      .frame(maxHeight: .infinity, alignment: .center)
      .environment(\.layoutDirection, .rightToLeft)
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
  let isPashto: Bool

  var body: some View {
    VStack(spacing: 2) {
      Text(label)
        .font(.custom(boldFont, size: isPashto ? 9 : 10))
        .foregroundColor(active ? Color(red: 0.10, green: 0.30, blue: 0.24) : .white)
        .lineLimit(1)
        .minimumScaleFactor(0.62)
        .allowsTightening(true)
      Text(time)
        .font(.custom(boldFont, size: 11))
        .foregroundColor(active ? Color(red: 0.10, green: 0.30, blue: 0.24).opacity(0.85) : .white.opacity(0.85))
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .allowsTightening(true)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, isPashto ? 5 : 6)
    .background(active ? Color.white : Color.white.opacity(0.12))
    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
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

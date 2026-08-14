import SwiftUI
import WidgetKit

struct PrayerTimesWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: PrayerTimesWidgetEntry

  private var snapshot: WidgetSnapshot? { entry.snapshot }
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
      VStack(alignment: .center, spacing: 3) {
        VStack(spacing: 2) {
          Text(snapshot.weekdayDari)
            .font(.custom("Vazirmatn-Bold", size: 12))
            .foregroundColor(.white.opacity(0.9))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          Text(snapshot.shamsiDisplay)
            .font(.custom("Vazirmatn-Bold", size: 17))
            .foregroundColor(accent)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          Text("قمری: \(snapshot.hijriDisplay)")
            .font(.custom("Vazirmatn", size: 10))
            .foregroundColor(.white.opacity(0.85))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          Text(snapshot.gregorianDisplay)
            .font(.custom("Vazirmatn", size: 10))
            .foregroundColor(.white.opacity(0.75))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          if !snapshot.sunriseDisplay.isEmpty {
            Text(snapshot.sunriseDisplay)
              .font(.custom("Vazirmatn-Bold", size: 10))
              .foregroundColor(accent)
              .lineLimit(1)
              .minimumScaleFactor(0.7)
          }
          if !snapshot.hadithText.isEmpty {
            Text("حدیث روز • \(snapshot.hadithText)")
              .font(.custom("Vazirmatn", size: 8))
              .foregroundColor(.white.opacity(0.78))
              .lineLimit(1)
              .minimumScaleFactor(0.65)
          }
        }
        .frame(maxWidth: .infinity)

        HStack(spacing: 4) {
          ForEach(snapshot.prayers, id: \.key) { prayer in
            PrayerChipView(
              label: prayer.labelDari,
              time: prayer.time12h,
              active: snapshot.currentPrayer == prayer.key
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
        Text(snapshot.shamsiDisplay)
          .font(.custom("Vazirmatn-Bold", size: 13))
          .minimumScaleFactor(0.8)
        if !snapshot.sunriseDisplay.isEmpty {
          Text(snapshot.sunriseDisplay)
            .font(.custom("Vazirmatn", size: 11))
            .foregroundColor(.secondary)
            .minimumScaleFactor(0.8)
        }
        if let next = nextPrayer(from: snapshot) {
          Text("\(next.labelDari) \(next.time12h)")
            .font(.custom("Vazirmatn-Bold", size: 12))
            .minimumScaleFactor(0.8)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .environment(\.layoutDirection, .rightToLeft)
    } else {
      Text("عبادت")
        .font(.custom("Vazirmatn-Bold", size: 13))
    }
  }

  @ViewBuilder
  private var accessoryCircular: some View {
    if let snapshot, let next = nextPrayer(from: snapshot) {
      VStack(spacing: 1) {
        Text(next.labelDari)
          .font(.custom("Vazirmatn-Bold", size: 10))
          .minimumScaleFactor(0.7)
        Text(next.time12h)
          .font(.custom("Vazirmatn-Bold", size: 12))
          .minimumScaleFactor(0.7)
      }
      .environment(\.layoutDirection, .rightToLeft)
    } else if let snapshot, !snapshot.sunriseDisplay.isEmpty {
      Text(snapshot.sunriseDisplay.replacingOccurrences(of: "طلوع آفتاب ", with: ""))
        .font(.custom("Vazirmatn-Bold", size: 12))
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
      Text("اپ را باز کنید")
        .font(.custom("Vazirmatn", size: 12))
        .foregroundColor(.white.opacity(0.8))
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

  var body: some View {
    VStack(spacing: 2) {
      Text(label)
        .font(.custom("Vazirmatn-Bold", size: 10))
        .foregroundColor(active ? Color(red: 0.10, green: 0.30, blue: 0.24) : .white)
      Text(time)
        .font(.custom("Vazirmatn-Bold", size: 11))
        .foregroundColor(active ? Color(red: 0.10, green: 0.30, blue: 0.24).opacity(0.85) : .white.opacity(0.85))
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 6)
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

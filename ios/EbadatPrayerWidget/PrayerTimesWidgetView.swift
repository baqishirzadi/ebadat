import SwiftUI
import WidgetKit

struct PrayerTimesWidgetView: View {
  let entry: PrayerTimesWidgetEntry

  private var snapshot: WidgetSnapshot? { entry.snapshot }
  private var widgetBackground: LinearGradient {
    LinearGradient(
      colors: [Color(red: 0.06, green: 0.12, blue: 0.08), Color(red: 0.10, green: 0.30, blue: 0.24)],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
  }

  var body: some View {
    ZStack {
      if let snapshot {
        VStack(alignment: .center, spacing: 8) {
          VStack(spacing: 2) {
            Text(snapshot.weekdayDari)
              .font(.custom("Vazirmatn-Bold", size: 14))
              .foregroundColor(.white.opacity(0.9))
            Text(snapshot.shamsiDisplay)
              .font(.custom("Vazirmatn-Bold", size: 20))
              .foregroundColor(Color(red: 0.55, green: 0.85, blue: 0.72))
            Text("قمری: \(snapshot.hijriDisplay)")
              .font(.custom("Vazirmatn", size: 12))
              .foregroundColor(.white.opacity(0.85))
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
        .padding(12)
        .environment(\.layoutDirection, .rightToLeft)
      } else {
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
    }
    .ifAvailableWidgetBackground(widgetBackground)
    .background(widgetBackground)
    .widgetURL(URL(string: "ebadat:///(tabs)/jantari"))
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
    PrayerTimesWidgetView(entry: PrayerTimesWidgetEntry(date: Date(), snapshot: WidgetShared.loadSnapshot()))
      .previewContext(WidgetPreviewContext(family: .systemMedium))
  }
}

import SwiftUI
import WidgetKit

@main
struct EbadatPrayerWidgetBundle: WidgetBundle {
  var body: some Widget {
    EbadatPrayerWidget()
  }
}

struct EbadatPrayerWidget: Widget {
  let kind: String = "EbadatPrayerWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: PrayerTimesWidgetProvider()) { entry in
      PrayerTimesWidgetView(entry: entry)
    }
    .configurationDisplayName("اوقات نماز")
    .description("تاریخ امروز و اوقات نماز")
    .supportedFamilies(Self.supportedFamilies)
    .contentMarginsDisabled()
  }

  private static var supportedFamilies: [WidgetFamily] {
    var families: [WidgetFamily] = [.systemMedium]
    if #available(iOSApplicationExtension 16.0, *) {
      families.append(contentsOf: [.accessoryRectangular, .accessoryCircular])
    }
    return families
  }
}

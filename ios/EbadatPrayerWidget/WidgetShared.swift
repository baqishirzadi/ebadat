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
}

struct WidgetPrayerEntry: Codable {
  let key: String
  let labelDari: String
  let time12h: String
  let atMs: Double
}

struct WidgetSnapshot: Codable {
  let version: Int
  let updatedAt: String
  let cityName: String
  let weekdayDari: String
  let shamsiDisplay: String
  let hijriDisplay: String
  let currentPrayer: String?
  let prayers: [WidgetPrayerEntry]
  let nextRefreshAtMs: Double
}

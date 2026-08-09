import Foundation
import UIKit
import WidgetKit

@objc(WidgetDataModule)
class WidgetDataModule: NSObject {
  private static let appGroupId = "group.com.afghandev.ebadat"
  private static let snapshotKey = "ebadat_widget_snapshot_v1"
  private static let widgetKind = "EbadatPrayerWidget"

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  private var defaults: UserDefaults? {
    UserDefaults(suiteName: WidgetDataModule.appGroupId)
  }

  @objc
  func setSnapshot(_ json: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults else {
      reject("widget_defaults_unavailable", "App Group UserDefaults unavailable", nil)
      return
    }
    defaults.set(json, forKey: WidgetDataModule.snapshotKey)
    resolve(true)
  }

  @objc
  func getSnapshot(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults else {
      resolve(NSNull())
      return
    }
    resolve(defaults.string(forKey: WidgetDataModule.snapshotKey))
  }

  @objc
  func reloadWidget(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadTimelines(ofKind: WidgetDataModule.widgetKind)
    }
    resolve(true)
  }

  /// Opens this app's Notifications settings page (Allow Notifications toggle).
  @objc
  func openAppNotificationSettings(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let settingsURLString: String
      if #available(iOS 16.0, *) {
        settingsURLString = UIApplication.openNotificationSettingsURLString
      } else if #available(iOS 15.4, *) {
        settingsURLString = UIApplicationOpenNotificationSettingsURLString
      } else {
        resolve(false)
        return
      }

      guard let url = URL(string: settingsURLString) else {
        resolve(false)
        return
      }

      UIApplication.shared.open(url, options: [:]) { success in
        resolve(success)
      }
    }
  }
}

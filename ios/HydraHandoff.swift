import Foundation
import React
import UIKit

@objc(HydraHandoff)
class HydraHandoff: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc(setActivity:title:webURL:resolver:rejecter:)
  func setActivity(
    _ activityType: String,
    title: String,
    webURL: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      let fullType = "com.darlops.hydra.\(activityType)"
      let activity = NSUserActivity(activityType: fullType)
      activity.title = title
      activity.isEligibleForHandoff = true
      activity.isEligibleForSearch = true
      activity.isEligibleForPrediction = true

      if let urlStr = webURL, let url = URL(string: urlStr) {
        activity.webpageURL = url
        activity.userInfo = ["url": urlStr]
      }

      // Set on the root view controller so Handoff broadcasts to other devices
      if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
         let window = scene.windows.first,
         let rootVC = window.rootViewController {
        rootVC.userActivity = activity
        activity.becomeCurrent()
      }

      resolve(nil)
    }
  }

  @objc(clearActivity:rejecter:)
  func clearActivity(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
         let window = scene.windows.first,
         let rootVC = window.rootViewController {
        rootVC.userActivity?.invalidate()
        rootVC.userActivity = nil
      }
      resolve(nil)
    }
  }
}

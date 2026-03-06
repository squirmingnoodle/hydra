import Foundation

@objc(HydraShareData)
class HydraShareData: NSObject {
  private let suiteName = "group.com.darlops.hydra"

  @objc
  func getSharedContent(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: suiteName) else {
      resolve(nil)
      return
    }

    let url = defaults.string(forKey: "sharedURL")
    let text = defaults.string(forKey: "sharedText")

    if url == nil && text == nil {
      resolve(nil)
      return
    }

    var result: [String: Any] = [:]
    if let url = url {
      result["url"] = url
      result["type"] = "link"
    }
    if let text = text {
      result["text"] = text
      if result["type"] == nil {
        result["type"] = "text"
      }
    }

    resolve(result)
  }

  @objc
  func clearSharedContent(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: suiteName) else {
      resolve(nil)
      return
    }
    defaults.removeObject(forKey: "sharedURL")
    defaults.removeObject(forKey: "sharedText")
    defaults.synchronize()
    resolve(nil)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { false }
}

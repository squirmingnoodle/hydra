import Foundation
import React
import WidgetKit

@objc(HydraWidgetData)
class HydraWidgetData: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  private let suiteName = "group.com.darlops.hydra"

  private var sharedDefaults: UserDefaults? {
    UserDefaults(suiteName: suiteName)
  }

  @objc(setTrendingPosts:resolver:rejecter:)
  func setTrendingPosts(
    _ posts: [[String: Any]],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = sharedDefaults else {
      reject("NO_APP_GROUP", "App Group not available", nil)
      return
    }
    defaults.set(posts, forKey: "trendingPosts")
    defaults.set(Date().timeIntervalSince1970, forKey: "trendingPostsUpdatedAt")
    reloadWidgets()
    resolve(nil)
  }

  @objc(setInboxCount:resolver:rejecter:)
  func setInboxCount(
    _ count: Int,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    sharedDefaults?.set(count, forKey: "inboxCount")
    reloadWidgets()
    resolve(nil)
  }

  @objc(setFavoriteSubreddits:resolver:rejecter:)
  func setFavoriteSubreddits(
    _ subreddits: [[String: Any]],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    sharedDefaults?.set(subreddits, forKey: "favoriteSubreddits")
    reloadWidgets()
    resolve(nil)
  }

  @objc(setKarma:resolver:rejecter:)
  func setKarma(
    _ karma: Int,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    sharedDefaults?.set(karma, forKey: "userKarma")
    reloadWidgets()
    resolve(nil)
  }

  @objc(setUsername:resolver:rejecter:)
  func setUsername(
    _ username: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    sharedDefaults?.set(username, forKey: "username")
    reloadWidgets()
    resolve(nil)
  }

  private func reloadWidgets() {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}

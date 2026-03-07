import Foundation
import React
import WidgetKit

@objc(HydraWidgetData)
class HydraWidgetData: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  private let suiteName = "group.com.darlops.hydra"

  private lazy var sharedDefaults: UserDefaults? = {
    let defaults = UserDefaults(suiteName: suiteName)
    if defaults == nil {
      NSLog("[HydraWidgetData] WARNING: App Group '\(suiteName)' not available. Ensure App Groups capability is enabled.")
    }
    return defaults
  }()

  // MARK: - Trending Posts

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

    // Cache thumbnail images in the background, then store posts with local paths
    DispatchQueue.global(qos: .userInitiated).async {
      var enrichedPosts = posts
      for (index, post) in posts.enumerated() {
        if let thumbnail = post["thumbnail"] as? String, !thumbnail.isEmpty {
          if let localPath = HydraImageCache.cacheImageSync(urlString: thumbnail, timeout: 5) {
            enrichedPosts[index]["localThumbnailPath"] = localPath
          }
        }
      }

      // Clean up old cached images (keep 50)
      _ = try? HydraImageCache.imagesDirectory.map { dir in
        let fm = FileManager.default
        if let files = try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.contentModificationDateKey], options: [.skipsHiddenFiles]),
           files.count > 50 {
          let sorted = files.sorted { a, b in
            let dateA = (try? a.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? .distantPast
            let dateB = (try? b.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? .distantPast
            return dateA > dateB
          }
          for file in sorted.dropFirst(50) {
            try? fm.removeItem(at: file)
          }
        }
      }

      DispatchQueue.main.async {
        defaults.set(enrichedPosts, forKey: "trendingPosts")
        defaults.set(Date().timeIntervalSince1970, forKey: "trendingPostsUpdatedAt")
        self.reloadWidgets()
        resolve(nil)
      }
    }
  }

  // MARK: - Inbox

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

  // MARK: - Favorite Subreddits

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

  // MARK: - User Info

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

  // MARK: - Available Accounts (for widget configuration)

  @objc(setAvailableAccounts:resolver:rejecter:)
  func setAvailableAccounts(
    _ accounts: [[String: Any]],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    sharedDefaults?.set(accounts, forKey: "availableAccounts")
    reloadWidgets()
    resolve(nil)
  }

  // MARK: - Subscribed Subreddits (per-account, for widget configuration)

  @objc(setSubscribedSubreddits:forAccount:resolver:rejecter:)
  func setSubscribedSubreddits(
    _ subreddits: [[String: Any]],
    forAccount account: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    sharedDefaults?.set(subreddits, forKey: "subscribedSubreddits:\(account)")
    reloadWidgets()
    resolve(nil)
  }

  // MARK: - Per-Account Trending Posts

  @objc(setAccountTrendingPosts:forAccount:resolver:rejecter:)
  func setAccountTrendingPosts(
    _ posts: [[String: Any]],
    forAccount account: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = sharedDefaults else {
      reject("NO_APP_GROUP", "App Group not available", nil)
      return
    }

    // Cache thumbnails in background
    DispatchQueue.global(qos: .userInitiated).async {
      var enrichedPosts = posts
      for (index, post) in posts.enumerated() {
        if let thumbnail = post["thumbnail"] as? String, !thumbnail.isEmpty {
          if let localPath = HydraImageCache.cacheImageSync(urlString: thumbnail, timeout: 5) {
            enrichedPosts[index]["localThumbnailPath"] = localPath
          }
        }
      }

      DispatchQueue.main.async {
        defaults.set(enrichedPosts, forKey: "trendingPosts:\(account)")
        defaults.set(Date().timeIntervalSince1970, forKey: "trendingPostsUpdatedAt:\(account)")
        self.reloadWidgets()
        resolve(nil)
      }
    }
  }

  // MARK: - Helpers

  private func reloadWidgets() {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}

import Foundation
import React
import WebKit

/// Native cookie management for Reddit authentication.
///
/// Replaces the workaround-heavy JS implementation in utils/RedditCookies.ts.
/// Operates directly on WKHTTPCookieStore so there is no risk of the
/// react-native-cookies sync-back bug (issue #152) that restores cookies
/// after clearAll(true).
@objc(HydraCookies)
class HydraCookies: NSObject {

  private let redditDomain = "reddit.com"
  private let redditURL    = URL(string: "https://www.reddit.com")!

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // MARK: - Helpers

  private var cookieStore: WKHTTPCookieStore {
    WKWebsiteDataStore.default().httpCookieStore
  }

  /// Retrieve all cookies for reddit.com from WKHTTPCookieStore.
  /// WKHTTPCookieStore must be accessed from the main thread.
  private func redditCookies(completion: @escaping ([HTTPCookie]) -> Void) {
    DispatchQueue.main.async {
      self.cookieStore.getAllCookies { cookies in
        let reddit = cookies.filter {
          $0.domain.hasSuffix(self.redditDomain) || $0.domain == "." + self.redditDomain
        }
        completion(reddit)
      }
    }
  }

  // MARK: - Public API

  /// Returns whether a valid reddit_session cookie is currently set.
  @objc(hasSessionCookie:rejecter:)
  func hasSessionCookie(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    redditCookies { cookies in
      let has = cookies.contains { $0.name == "reddit_session" && !$0.value.isEmpty }
      resolve(has)
    }
  }

  /// Persist the reddit_session cookie (set a far-future expiry).
  @objc(persistSessionCookie:rejecter:)
  func persistSessionCookie(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    redditCookies { [weak self] cookies in
      guard let self else { resolve(nil); return }
      guard let session = cookies.first(where: {
              $0.name == "reddit_session" && $0.expiresDate == nil
            }) else {
        resolve(nil)
        return
      }

      var props = session.properties ?? [:]
      // 10,000 days from now (matches JS implementation)
      props[.expires] = Date(timeIntervalSinceNow: 60 * 60 * 24 * 10_000)
      if let updated = HTTPCookie(properties: props) {
        DispatchQueue.main.async {
          self.cookieStore.setCookie(updated) { resolve(nil) }
        }
      } else {
        resolve(nil)
      }
    }
  }

  /// Clear all reddit.com cookies and website data (localStorage, IndexedDB, etc.)
  /// without triggering the sync-back bug.
  ///
  /// Deletes every reddit.com cookie from WKHTTPCookieStore directly, then
  /// removes all cached website data for reddit.com so that Reddit's login page
  /// cannot auto-login via stored credentials in localStorage or IndexedDB.
  @objc(clearSessionCookies:rejecter:)
  func clearSessionCookies(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    redditCookies { [weak self] cookies in
      guard let self else { resolve(nil); return }
      let group = DispatchGroup()
      // Delete all reddit.com cookies from WKHTTPCookieStore.
      for cookie in cookies {
        group.enter()
        self.cookieStore.delete(cookie) { group.leave() }
      }
      group.notify(queue: .main) {
        // Also clear all website data (localStorage, IndexedDB, caches) for
        // reddit.com so the login page cannot auto-login via stored credentials.
        let dataStore = WKWebsiteDataStore.default()
        let dataTypes = WKWebsiteDataStore.allWebsiteDataTypes()
        dataStore.fetchDataRecords(ofTypes: dataTypes) { records in
          let redditRecords = records.filter {
            $0.displayName.hasSuffix("reddit.com")
          }
          dataStore.removeData(ofTypes: dataTypes, for: redditRecords) {
            resolve(nil)
          }
        }
      }
    }
  }

  /// Returns the serialised reddit_session cookie value, or null.
  @objc(getSessionCookieValue:rejecter:)
  func getSessionCookieValue(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    redditCookies { cookies in
      if let session = cookies.first(where: { $0.name == "reddit_session" }) {
        // Serialise as the same JSON shape that @react-native-cookies/cookies uses
        var dict: [String: Any] = [
          "name":   session.name,
          "value":  session.value,
          "domain": session.domain,
          "path":   session.path,
          "secure": session.isSecure,
        ]
        if let expires = session.expiresDate {
          dict["expires"] = ISO8601DateFormatter().string(from: expires)
        }
        resolve(dict)
      } else {
        resolve(NSNull())
      }
    }
  }

  /// Set a cookie from a dictionary matching the @react-native-cookies shape.
  @objc(setSessionCookie:resolver:rejecter:)
  func setSessionCookie(
    _ cookieDict: [String: Any],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    var props: [HTTPCookiePropertyKey: Any] = [:]
    props[.name]   = cookieDict["name"]   as? String ?? "reddit_session"
    props[.value]  = cookieDict["value"]  as? String ?? ""
    props[.domain] = cookieDict["domain"] as? String ?? ".reddit.com"
    props[.path]   = cookieDict["path"]   as? String ?? "/"

    if let expiresStr = cookieDict["expires"] as? String {
      props[.expires] = ISO8601DateFormatter().date(from: expiresStr)
        ?? Date(timeIntervalSinceNow: 60 * 60 * 24 * 10_000)
    }

    guard let cookie = HTTPCookie(properties: props) else {
      reject("COOKIE_INVALID", "Could not construct cookie from provided properties.", nil)
      return
    }
    DispatchQueue.main.async {
      self.cookieStore.setCookie(cookie) { resolve(nil) }
    }
  }
}

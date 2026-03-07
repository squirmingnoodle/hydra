import Foundation
import React
import CoreSpotlight
import MobileCoreServices

@objc(HydraSpotlight)
class HydraSpotlight: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(indexPost:title:subreddit:author:thumbnailURL:resolver:rejecter:)
  func indexPost(
    _ postId: String,
    title: String,
    subreddit: String,
    author: String,
    thumbnailURL: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let attributeSet = CSSearchableItemAttributeSet(contentType: .text)
    attributeSet.title = title
    attributeSet.contentDescription = "r/\(subreddit) • u/\(author)"
    attributeSet.keywords = [subreddit, author, "reddit"]

    if let urlStr = thumbnailURL, let url = URL(string: urlStr) {
      attributeSet.thumbnailURL = url
    }

    let item = CSSearchableItem(
      uniqueIdentifier: "post:\(postId)",
      domainIdentifier: "com.darlops.hydra.posts",
      attributeSet: attributeSet
    )
    item.expirationDate = Date(timeIntervalSinceNow: 60 * 60 * 24 * 30) // 30 days

    CSSearchableIndex.default().indexSearchableItems([item]) { error in
      if let error = error {
        reject("SPOTLIGHT_ERROR", error.localizedDescription, error)
      } else {
        resolve(nil)
      }
    }
  }

  @objc(indexSubreddit:displayName:description:iconURL:resolver:rejecter:)
  func indexSubreddit(
    _ subredditName: String,
    displayName: String,
    description: String?,
    iconURL: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let attributeSet = CSSearchableItemAttributeSet(contentType: .text)
    attributeSet.title = "r/\(displayName)"
    attributeSet.contentDescription = description ?? "Subreddit"
    attributeSet.keywords = [subredditName, displayName, "reddit", "subreddit"]

    if let urlStr = iconURL, let url = URL(string: urlStr) {
      attributeSet.thumbnailURL = url
    }

    let item = CSSearchableItem(
      uniqueIdentifier: "subreddit:\(subredditName)",
      domainIdentifier: "com.darlops.hydra.subreddits",
      attributeSet: attributeSet
    )
    // Subreddits don't expire
    item.expirationDate = Date.distantFuture

    CSSearchableIndex.default().indexSearchableItems([item]) { error in
      if let error = error {
        reject("SPOTLIGHT_ERROR", error.localizedDescription, error)
      } else {
        resolve(nil)
      }
    }
  }

  @objc(removeAllItems:rejecter:)
  func removeAllItems(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    CSSearchableIndex.default().deleteAllSearchableItems { error in
      if let error = error {
        reject("SPOTLIGHT_ERROR", error.localizedDescription, error)
      } else {
        resolve(nil)
      }
    }
  }

  @objc(removePostItems:rejecter:)
  func removePostItems(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    CSSearchableIndex.default().deleteSearchableItems(
      withDomainIdentifiers: ["com.darlops.hydra.posts"]
    ) { error in
      if let error = error {
        reject("SPOTLIGHT_ERROR", error.localizedDescription, error)
      } else {
        resolve(nil)
      }
    }
  }
}

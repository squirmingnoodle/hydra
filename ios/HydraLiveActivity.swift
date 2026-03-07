import Foundation
import React
import ActivityKit

@objc(HydraLiveActivity)
class HydraLiveActivity: NSObject {

  @objc(startWatching:title:subreddit:author:commentCount:upvotes:url:thumbnailURL:postText:resolve:rejecter:)
  func startWatching(
    _ postId: String,
    title: String,
    subreddit: String,
    author: String,
    commentCount: Int,
    upvotes: Int,
    url: String,
    thumbnailURL: String?,
    postText: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      reject("UNSUPPORTED", "Live Activities require iOS 16.2+", nil)
      return
    }

    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      reject("DISABLED", "Live Activities are disabled", nil)
      return
    }

    // Pre-cache the thumbnail so the Live Activity can load it from a local file
    var localThumbPath: String?
    if let thumbURL = thumbnailURL, !thumbURL.isEmpty {
      localThumbPath = HydraImageCache.cacheImageSync(urlString: thumbURL, timeout: 5)
    }

    let attributes = ThreadWatcherAttributes(
      postId: postId,
      title: title,
      subreddit: subreddit,
      author: author,
      url: url,
      thumbnailURL: thumbnailURL,
      localThumbnailPath: localThumbPath,
      postText: postText
    )

    let initialState = ThreadWatcherAttributes.ContentState(
      commentCount: commentCount,
      upvotes: upvotes,
      lastReplyAuthor: nil,
      lastReplyPreview: nil,
      updatedAt: Date()
    )

    do {
      let content = ActivityContent(state: initialState, staleDate: nil)
      let activity = try Activity.request(
        attributes: attributes,
        content: content,
        pushType: nil
      )
      resolve(activity.id)
    } catch {
      reject("START_FAILED", error.localizedDescription, error)
    }
  }

  @objc(updateWatching:commentCount:upvotes:lastReplyAuthor:lastReplyPreview:resolve:rejecter:)
  func updateWatching(
    _ activityId: String,
    commentCount: Int,
    upvotes: Int,
    lastReplyAuthor: String?,
    lastReplyPreview: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }

    Task {
      let activities = Activity<ThreadWatcherAttributes>.activities
      guard let activity = activities.first(where: { $0.id == activityId }) else {
        resolve(false)
        return
      }

      let updatedState = ThreadWatcherAttributes.ContentState(
        commentCount: commentCount,
        upvotes: upvotes,
        lastReplyAuthor: lastReplyAuthor,
        lastReplyPreview: lastReplyPreview,
        updatedAt: Date()
      )

      let content = ActivityContent(state: updatedState, staleDate: nil)
      await activity.update(content)
      resolve(true)
    }
  }

  @objc(stopWatching:resolve:rejecter:)
  func stopWatching(
    _ activityId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }

    Task {
      let activities = Activity<ThreadWatcherAttributes>.activities
      guard let activity = activities.first(where: { $0.id == activityId }) else {
        resolve(false)
        return
      }

      await activity.end(nil, dismissalPolicy: .immediate)
      resolve(true)
    }
  }

  @objc(isAvailable:rejecter:)
  func isAvailable(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 16.2, *) {
      resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
    } else {
      resolve(false)
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { false }
}

// MARK: - Activity Attributes

struct ThreadWatcherAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var commentCount: Int
    var upvotes: Int
    var lastReplyAuthor: String?
    var lastReplyPreview: String?
    var updatedAt: Date
  }

  var postId: String
  var title: String
  var subreddit: String
  var author: String
  var url: String
  var thumbnailURL: String?
  var localThumbnailPath: String?
  var postText: String?
}

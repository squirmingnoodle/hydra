import Foundation
import React
import SQLite3

/// Native module for querying the seen_posts SQLite table directly.
///
/// expo-sqlite opens db.db in the app's Library/SQLite directory. By reading
/// that file with a separate read-only connection we can do batch lookups
/// entirely off the JS thread, avoiding blocking the main queue on every
/// feed render.
@objc(HydraSeenPosts)
class HydraSeenPosts: NSObject {

  private enum SeenPostsError: String, Error {
    case dbOpen   = "DB_OPEN_FAILED"
    case dbQuery  = "DB_QUERY_FAILED"
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Helpers

  /// Returns the path to the expo-sqlite database file.
  private func dbPath() -> String? {
    // expo-sqlite stores databases in Library/SQLite/
    guard let library = FileManager.default
            .urls(for: .libraryDirectory, in: .userDomainMask).first else {
      return nil
    }
    return library
      .appendingPathComponent("SQLite")
      .appendingPathComponent("db.db")
      .path
  }

  // MARK: - Public API

  /// Check whether multiple post IDs have been seen.
  ///
  /// - Parameter postIds: Array of Reddit post ID strings (without t3_ prefix)
  /// - Returns: A dictionary mapping each postId → Bool
  @objc(arePostsSeen:resolver:rejecter:)
  func arePostsSeen(
    _ postIds: [String],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !postIds.isEmpty else {
      resolve([Bool]())
      return
    }

    DispatchQueue.global(qos: .userInitiated).async {
      guard let path = self.dbPath() else {
        reject(SeenPostsError.dbOpen.rawValue, "Could not locate database file.", nil)
        return
      }

      var db: OpaquePointer?
      guard sqlite3_open_v2(path, &db, SQLITE_OPEN_READONLY | SQLITE_OPEN_NOMUTEX, nil) == SQLITE_OK else {
        reject(SeenPostsError.dbOpen.rawValue, "Failed to open database.", nil)
        return
      }
      defer { sqlite3_close(db) }

      // Build: SELECT post_id FROM seen_posts WHERE post_id IN (?,?,...)
      let placeholders = postIds.map { _ in "?" }.joined(separator: ",")
      let sql = "SELECT post_id FROM seen_posts WHERE post_id IN (\(placeholders))"

      var statement: OpaquePointer?
      guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
        reject(SeenPostsError.dbQuery.rawValue, "Failed to prepare statement.", nil)
        return
      }
      defer { sqlite3_finalize(statement) }

      for (index, postId) in postIds.enumerated() {
        sqlite3_bind_text(statement, Int32(index + 1), (postId as NSString).utf8String, -1, nil)
      }

      var seenSet = Set<String>()
      while sqlite3_step(statement) == SQLITE_ROW {
        if let cStr = sqlite3_column_text(statement, 0) {
          seenSet.insert(String(cString: cStr))
        }
      }

      // Return ordered array of booleans matching input order
      let result = postIds.map { seenSet.contains($0) }
      resolve(result)
    }
  }

  /// Check whether a single post has been seen.
  @objc(isPostSeen:resolver:rejecter:)
  func isPostSeen(
    _ postId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    arePostsSeen([postId], resolver: { result in
      if let arr = result as? [Bool] {
        resolve(arr.first ?? false)
      } else {
        resolve(false)
      }
    }, rejecter: reject)
  }
}

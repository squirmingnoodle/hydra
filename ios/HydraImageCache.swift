import Foundation
import React

@objc(HydraImageCache)
class HydraImageCache: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  private static let suiteName = "group.com.darlops.hydra"

  /// Returns the shared images directory inside the App Group container.
  static var imagesDirectory: URL? {
    guard let container = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: suiteName
    ) else { return nil }
    let dir = container.appendingPathComponent("images", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }

  /// Deterministic local filename for a given remote URL (SHA-like hash via simple hashing).
  private static func localFilename(for urlString: String) -> String {
    // Use a simple hash to create a unique-ish filename
    var hash: UInt64 = 5381
    for byte in urlString.utf8 {
      hash = ((hash &<< 5) &+ hash) &+ UInt64(byte)
    }
    // Preserve the file extension if present
    let ext = (urlString as NSString).pathExtension
    let suffix = ext.isEmpty ? ".jpg" : ".\(ext.prefix(4))"
    return "\(hash)\(suffix)"
  }

  /// Cache a single image from a URL, returns the local file path or nil.
  @objc(cacheImage:resolver:rejecter:)
  func cacheImage(
    _ urlString: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let imagesDir = HydraImageCache.imagesDirectory else {
      resolve(nil)
      return
    }

    let filename = HydraImageCache.localFilename(for: urlString)
    let localURL = imagesDir.appendingPathComponent(filename)

    // If already cached, return immediately
    if FileManager.default.fileExists(atPath: localURL.path) {
      resolve(localURL.path)
      return
    }

    guard let url = URL(string: urlString) else {
      resolve(nil)
      return
    }

    let task = URLSession.shared.dataTask(with: url) { data, response, error in
      guard let data = data, error == nil,
            let httpResponse = response as? HTTPURLResponse,
            httpResponse.statusCode == 200 else {
        resolve(nil)
        return
      }

      do {
        try data.write(to: localURL)
        resolve(localURL.path)
      } catch {
        resolve(nil)
      }
    }
    task.resume()
  }

  /// Cache multiple images at once. Takes array of URL strings, returns array of local paths (null for failures).
  @objc(cacheImages:resolver:rejecter:)
  func cacheImages(
    _ urlStrings: [String],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let imagesDir = HydraImageCache.imagesDirectory else {
      resolve(Array(repeating: NSNull(), count: urlStrings.count))
      return
    }

    let group = DispatchGroup()
    var results = Array<Any>(repeating: NSNull(), count: urlStrings.count)

    for (index, urlString) in urlStrings.enumerated() {
      let filename = HydraImageCache.localFilename(for: urlString)
      let localURL = imagesDir.appendingPathComponent(filename)

      // Already cached
      if FileManager.default.fileExists(atPath: localURL.path) {
        results[index] = localURL.path
        continue
      }

      guard let url = URL(string: urlString) else { continue }

      group.enter()
      URLSession.shared.dataTask(with: url) { data, response, error in
        defer { group.leave() }
        guard let data = data, error == nil,
              let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else { return }
        do {
          try data.write(to: localURL)
          results[index] = localURL.path
        } catch {}
      }.resume()
    }

    group.notify(queue: .main) {
      resolve(results)
    }
  }

  /// Get the local path for an already-cached URL (does not download).
  @objc(getCachedPath:resolver:rejecter:)
  func getCachedPath(
    _ urlString: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let imagesDir = HydraImageCache.imagesDirectory else {
      resolve(nil)
      return
    }

    let filename = HydraImageCache.localFilename(for: urlString)
    let localURL = imagesDir.appendingPathComponent(filename)

    if FileManager.default.fileExists(atPath: localURL.path) {
      resolve(localURL.path)
    } else {
      resolve(nil)
    }
  }

  /// Clean up old cached images, keeping only the most recent `keepCount`.
  @objc(cleanup:resolver:rejecter:)
  func cleanup(
    _ keepCount: Int,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let imagesDir = HydraImageCache.imagesDirectory else {
      resolve(0)
      return
    }

    let fm = FileManager.default
    guard let files = try? fm.contentsOfDirectory(
      at: imagesDir,
      includingPropertiesForKeys: [.contentModificationDateKey],
      options: [.skipsHiddenFiles]
    ) else {
      resolve(0)
      return
    }

    // Sort by modification date, newest first
    let sorted = files.sorted { a, b in
      let dateA = (try? a.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? .distantPast
      let dateB = (try? b.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? .distantPast
      return dateA > dateB
    }

    var removedCount = 0
    if sorted.count > keepCount {
      for file in sorted.dropFirst(keepCount) {
        try? fm.removeItem(at: file)
        removedCount += 1
      }
    }

    resolve(removedCount)
  }

  // MARK: - Synchronous helper for Swift callers (used by HydraWidgetData)

  /// Synchronously download and cache an image. Returns local path or nil.
  /// Called from HydraWidgetData when setting trending posts with thumbnails.
  static func cacheImageSync(urlString: String, timeout: TimeInterval = 10) -> String? {
    guard let imagesDir = imagesDirectory else { return nil }

    let filename = localFilename(for: urlString)
    let localURL = imagesDir.appendingPathComponent(filename)

    // Already cached
    if FileManager.default.fileExists(atPath: localURL.path) {
      return localURL.path
    }

    guard let url = URL(string: urlString) else { return nil }

    let semaphore = DispatchSemaphore(value: 0)
    var resultPath: String?

    URLSession.shared.dataTask(with: url) { data, response, error in
      defer { semaphore.signal() }
      guard let data = data, error == nil,
            let httpResponse = response as? HTTPURLResponse,
            httpResponse.statusCode == 200 else { return }
      do {
        try data.write(to: localURL)
        resultPath = localURL.path
      } catch {}
    }.resume()

    _ = semaphore.wait(timeout: .now() + timeout)
    return resultPath
  }
}

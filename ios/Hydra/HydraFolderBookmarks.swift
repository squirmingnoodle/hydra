import Foundation
import React

@objc(HydraFolderBookmarks)
class HydraFolderBookmarks: NSObject {
  private let bookmarkPrefix = "hydra.folderBookmark"

  private enum BookmarkErrorCode: String, Error {
    case missing = "BOOKMARK_MISSING"
    case stale = "BOOKMARK_STALE"
    case io = "BOOKMARK_IO_FAILED"
    case invalidURI = "BOOKMARK_INVALID_URI"
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  private func bookmarkKey(for scope: String) -> String {
    let trimmedScope = scope.trimmingCharacters(in: .whitespacesAndNewlines)
    return "\(bookmarkPrefix).\(trimmedScope)"
  }

  private func normalizeScope(_ scope: String) -> String {
    return scope.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func rejectPromise(
    _ rejecter: RCTPromiseRejectBlock,
    code: BookmarkErrorCode,
    message: String,
    error: Error? = nil
  ) {
    rejecter(code.rawValue, message, error)
  }

  private func sanitizeName(_ raw: String) -> String {
    let invalidCharacters = CharacterSet(charactersIn: "\\/:*?\"<>|")
    let scalars = raw.unicodeScalars.map { scalar -> String in
      invalidCharacters.contains(scalar) ? "_" : String(scalar)
    }
    return scalars.joined().trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func normalizeSubredditFolder(_ folder: String) -> String {
    let sanitized = sanitizeName(folder).trimmingCharacters(in: CharacterSet(charactersIn: "."))
    return sanitized.isEmpty ? "unknown" : sanitized
  }

  private func normalizeFileName(_ fileName: String) -> String {
    let sanitized = sanitizeName(fileName)
    if sanitized.isEmpty {
      return "hydra-\(Int(Date().timeIntervalSince1970))"
    }
    return sanitized
  }

  private func splitNameAndExtension(_ fileName: String) -> (String, String) {
    let nsFileName = fileName as NSString
    let ext = nsFileName.pathExtension
    if ext.isEmpty {
      return (fileName, "")
    }
    let base = nsFileName.deletingPathExtension
    return (base, ".\(ext)")
  }

  private func resolveBookmarkedURL(_ scope: String) throws -> URL {
    let key = bookmarkKey(for: scope)
    guard let bookmarkData = UserDefaults.standard.data(forKey: key) else {
      throw BookmarkErrorCode.missing
    }

    var stale = false
    do {
      let url = try URL(
        resolvingBookmarkData: bookmarkData,
        options: [],
        relativeTo: nil,
        bookmarkDataIsStale: &stale
      )

      if stale {
        throw BookmarkErrorCode.stale
      }

      return url
    } catch let bookmarkError as BookmarkErrorCode {
      throw bookmarkError
    } catch {
      throw BookmarkErrorCode.io
    }
  }

  private func nextAvailableDestination(
    in directoryURL: URL,
    originalFileName: String
  ) -> URL {
    let fileManager = FileManager.default
    let (baseName, extensionName) = splitNameAndExtension(originalFileName)

    var candidateName = originalFileName
    var candidateURL = directoryURL.appendingPathComponent(candidateName, isDirectory: false)
    var suffix = 1

    while fileManager.fileExists(atPath: candidateURL.path) {
      candidateName = "\(baseName)-\(suffix)\(extensionName)"
      candidateURL = directoryURL.appendingPathComponent(candidateName, isDirectory: false)
      suffix += 1
    }

    return candidateURL
  }

  @objc(storeBookmark:directoryUri:resolver:rejecter:)
  func storeBookmark(
    _ scope: String,
    directoryUri: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let normalizedScope = normalizeScope(scope)
    guard !normalizedScope.isEmpty else {
      rejectPromise(reject, code: .invalidURI, message: "Settings scope is required.")
      return
    }

    guard let url = URL(string: directoryUri), url.isFileURL else {
      rejectPromise(reject, code: .invalidURI, message: "Directory URI is invalid.")
      return
    }

    do {
      let bookmarkData = try url.bookmarkData(
        options: [],
        includingResourceValuesForKeys: nil,
        relativeTo: nil
      )
      UserDefaults.standard.set(bookmarkData, forKey: bookmarkKey(for: normalizedScope))
      resolve(nil)
    } catch {
      rejectPromise(reject, code: .io, message: "Failed to store folder bookmark.", error: error)
    }
  }

  @objc(clearBookmark:resolver:rejecter:)
  func clearBookmark(
    _ scope: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let normalizedScope = normalizeScope(scope)
    guard !normalizedScope.isEmpty else {
      rejectPromise(reject, code: .invalidURI, message: "Settings scope is required.")
      return
    }

    UserDefaults.standard.removeObject(forKey: bookmarkKey(for: normalizedScope))
    resolve(nil)
  }

  @objc(hasBookmark:resolver:rejecter:)
  func hasBookmark(
    _ scope: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let normalizedScope = normalizeScope(scope)
    guard !normalizedScope.isEmpty else {
      resolve(false)
      return
    }

    let hasBookmarkData =
      UserDefaults.standard.data(forKey: bookmarkKey(for: normalizedScope)) != nil
    resolve(hasBookmarkData)
  }

  @objc(copyFileToBookmarkedRoot:sourceFileUri:subredditFolder:originalFileName:resolver:rejecter:)
  func copyFileToBookmarkedRoot(
    _ scope: String,
    sourceFileUri: String,
    subredditFolder: String,
    originalFileName: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let normalizedScope = normalizeScope(scope)
    guard !normalizedScope.isEmpty else {
      rejectPromise(reject, code: .invalidURI, message: "Settings scope is required.")
      return
    }

    guard let sourceURL = URL(string: sourceFileUri), sourceURL.isFileURL else {
      rejectPromise(reject, code: .invalidURI, message: "Source file URI is invalid.")
      return
    }

    do {
      let rootURL = try resolveBookmarkedURL(normalizedScope)
      let hasScopedAccess = rootURL.startAccessingSecurityScopedResource()
      guard hasScopedAccess else {
        throw BookmarkErrorCode.stale
      }
      defer {
        rootURL.stopAccessingSecurityScopedResource()
      }

      let folderName = normalizeSubredditFolder(subredditFolder)
      let targetFolderURL = rootURL.appendingPathComponent(folderName, isDirectory: true)

      try FileManager.default.createDirectory(
        at: targetFolderURL,
        withIntermediateDirectories: true
      )

      let normalizedFileName = normalizeFileName(originalFileName)
      let destinationURL = nextAvailableDestination(
        in: targetFolderURL,
        originalFileName: normalizedFileName
      )

      try FileManager.default.copyItem(at: sourceURL, to: destinationURL)

      resolve([
        "folder": folderName,
        "fileName": destinationURL.lastPathComponent,
      ])
    } catch let bookmarkError as BookmarkErrorCode {
      rejectPromise(
        reject,
        code: bookmarkError,
        message: "Failed to copy file using bookmarked folder access."
      )
    } catch {
      rejectPromise(
        reject,
        code: .io,
        message: "Failed to copy file using bookmarked folder access.",
        error: error
      )
    }
  }
}

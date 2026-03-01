import Foundation
import React

/// Native off-thread comment tree formatter.
///
/// Mirrors the logic of formatComments() in api/PostDetail.ts:
///   - Skips "more" kind nodes at the current level (they surface as loadMore)
///   - Records depth, path, and loadMore child data
///   - Recursively processes replies
///   - Auto-collapses AutoModerator root comments when requested
///   - Decodes HTML entities (the same subset reddit uses)
///
/// All work is done on a background queue and the result is returned to JS
/// as an array of dictionaries matching the Comment type shape.
@objc(HydraCommentTree)
class HydraCommentTree: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Public API

  /// Format a raw Reddit API comment listing into a flat Comment array.
  ///
  /// - Parameters:
  ///   - comments: The raw `children` array from the Reddit API response
  ///   - collapseAutoModerator: Whether to auto-collapse AutoModerator root comments
  @objc(formatComments:collapseAutoModerator:resolver:rejecter:)
  func formatComments(
    _ comments: [[String: Any]],
    collapseAutoModerator: Bool,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      let result = Self.processComments(
        comments,
        commentPath: [],
        childStartIndex: 0,
        renderCount: 0,
        collapseAutoModerator: collapseAutoModerator
      )
      resolve(result)
    }
  }

  // MARK: - Private implementation

  private static func processComments(
    _ comments: [[String: Any]],
    commentPath: [Int],
    childStartIndex: Int,
    renderCount: Int,
    collapseAutoModerator: Bool
  ) -> [[String: Any]] {
    var result: [[String: Any]] = []

    for (i, comment) in comments.enumerated() {
      // Skip "more" kind items at this level
      guard let kind = comment["kind"] as? String, kind != "more" else { continue }

      let data = comment["data"] as? [String: Any] ?? [:]
      let childCommentPath = commentPath + [i + childStartIndex]

      // Find a "more" child in replies (loadMore)
      var loadMore: [String: Any]? = nil
      if let replies = data["replies"] as? [String: Any],
         let repliesData = replies["data"] as? [String: Any],
         let children = repliesData["children"] as? [[String: Any]] {
        if let moreChild = children.first(where: { ($0["kind"] as? String) == "more" }) {
          let moreData = moreChild["data"] as? [String: Any] ?? [:]
          loadMore = [
            "depth": moreData["depth"] ?? 0,
            "childIds": moreData["children"] ?? [],
          ]
        }
      }

      // Vote direction
      let userVote: Int
      if let likes = data["likes"] as? Bool {
        userVote = likes ? 1 : -1
      } else {
        userVote = 0
      }

      // Collapse AutoModerator at root
      let author = data["author"] as? String ?? ""
      let collapsed = collapseAutoModerator
        && commentPath.isEmpty
        && author == "AutoModerator"

      // Edited timestamp
      var editedAt: Double? = nil
      if let edited = data["edited"] as? Double, edited > 0 {
        editedAt = edited * 1_000
      }

      // Flair (mirrors formatFlair in Flair.ts)
      let flair = Self.extractFlair(from: data)

      // Recursive replies
      var childComments: [[String: Any]] = []
      if let replies = data["replies"] as? [String: Any],
         let repliesData = replies["data"] as? [String: Any],
         let children = repliesData["children"] as? [[String: Any]] {
        childComments = processComments(
          children,
          commentPath: childCommentPath,
          childStartIndex: 0,
          renderCount: renderCount,
          collapseAutoModerator: collapseAutoModerator
        )
      }

      // Time strings
      let createdAt = data["created"] as? Double ?? 0
      let timeSince = prettyTimeSince(createdAt * 1_000) + " ago"
      let shortTimeSince = shortPrettyTimeSince(createdAt * 1_000)

      var formatted: [String: Any] = [
        "id":             data["id"] as? String ?? "",
        "name":           data["name"] as? String ?? "",
        "type":           "comment",
        "depth":          commentPath.count,
        "path":           childCommentPath,
        "collapsed":      collapsed,
        "author":         author,
        "isOP":           data["is_submitter"] as? Bool ?? false,
        "isModerator":    (data["distinguished"] as? String) == "moderator",
        "isStickied":     data["stickied"] as? Bool ?? false,
        "upvotes":        data["ups"] as? Int ?? 0,
        "scoreHidden":    data["score_hidden"] as? Bool ?? false,
        "saved":          data["saved"] as? Bool ?? false,
        "userVote":       userVote,
        "link":           data["permalink"] as? String ?? "",
        "postTitle":      data["link_title"] as? String ?? "",
        "postLink":       data["link_permalink"] as? String ?? "",
        "subreddit":      data["subreddit"] as? String ?? "",
        "text":           decodeHTMLEntities(data["body"] as? String ?? ""),
        "html":           decodeHTMLEntities(data["body_html"] as? String ?? ""),
        "renderCount":    renderCount,
        "comments":       childComments,
        "after":          data["name"] as? String ?? "",
        "createdAt":      createdAt,
        "timeSince":      timeSince,
        "shortTimeSince": shortTimeSince,
      ]

      if let e = editedAt { formatted["editedAt"] = e } else { formatted["editedAt"] = NSNull() }
      if let lm = loadMore { formatted["loadMore"] = lm } else { formatted["loadMore"] = NSNull() }
      if let f = flair { formatted["flair"] = f } else { formatted["flair"] = NSNull() }

      result.append(formatted)
    }

    return result
  }

  // MARK: - Flair extraction (mirrors formatFlair in api/Flair.ts)

  private static func extractFlair(from data: [String: Any]) -> [String: Any]? {
    // Author flair
    if let text = data["author_flair_text"] as? String, !text.isEmpty {
      var flair: [String: Any] = ["text": text, "type": "text"]
      if let color = data["author_flair_background_color"] as? String {
        flair["backgroundColor"] = color
      }
      if let textColor = data["author_flair_text_color"] as? String {
        flair["textColor"] = textColor
      }
      return flair
    }
    return nil
  }

  // MARK: - HTML entity decoding

  /// Decodes the most common HTML entities that Reddit encodes in API responses.
  private static func decodeHTMLEntities(_ input: String) -> String {
    // Use NSAttributedString for full HTML entity decoding when feasible,
    // otherwise fall back to the common subset.
    var s = input
    // Named entities
    let named: [(String, String)] = [
      ("&amp;",   "&"),
      ("&lt;",    "<"),
      ("&gt;",    ">"),
      ("&quot;",  "\""),
      ("&#39;",   "'"),
      ("&apos;",  "'"),
      ("&nbsp;",  "\u{00A0}"),
      ("&ndash;", "\u{2013}"),
      ("&mdash;", "\u{2014}"),
      ("&lsquo;", "\u{2018}"),
      ("&rsquo;", "\u{2019}"),
      ("&ldquo;", "\u{201C}"),
      ("&rdquo;", "\u{201D}"),
      ("&hellip;","\u{2026}"),
    ]
    for (entity, replacement) in named {
      s = s.replacingOccurrences(of: entity, with: replacement)
    }
    // Numeric decimal entities &#NNN;
    s = decodeNumericEntities(s)
    return s
  }

  private static func decodeNumericEntities(_ input: String) -> String {
    guard input.contains("&#") else { return input }
    var result = ""
    result.reserveCapacity(input.utf16.count)
    var idx = input.startIndex
    while idx < input.endIndex {
      if input[idx] == "&",
         let hashIdx = input.index(idx, offsetBy: 1, limitedBy: input.endIndex),
         hashIdx < input.endIndex,
         input[hashIdx] == "#" {
        // Scan digits
        var numStart = input.index(after: hashIdx)
        var numEnd = numStart
        let isHex = numEnd < input.endIndex && (input[numEnd] == "x" || input[numEnd] == "X")
        if isHex { numEnd = input.index(after: numEnd); numStart = numEnd }
        while numEnd < input.endIndex && (isHex ? input[numEnd].isHexDigit : input[numEnd].isNumber) {
          numEnd = input.index(after: numEnd)
        }
        if numEnd < input.endIndex && input[numEnd] == ";" && numEnd > numStart {
          let numStr = String(input[numStart..<numEnd])
          if let codePoint = UInt32(numStr, radix: isHex ? 16 : 10),
             let scalar = Unicode.Scalar(codePoint) {
            result.append(Character(scalar))
            idx = input.index(after: numEnd)
            continue
          }
        }
      }
      result.append(input[idx])
      idx = input.index(after: idx)
    }
    return result
  }

  // MARK: - Time formatting (mirrors utils/Time.ts)

  private static func prettyTimeSince(_ ms: Double) -> String {
    let seconds = Int((Date().timeIntervalSince1970 * 1_000 - ms) / 1_000)
    if seconds < 60 { return "\(seconds) second\(seconds == 1 ? "" : "s")" }
    let minutes = seconds / 60
    if minutes < 60 { return "\(minutes) minute\(minutes == 1 ? "" : "s")" }
    let hours = minutes / 60
    if hours < 24 { return "\(hours) hour\(hours == 1 ? "" : "s")" }
    let days = hours / 24
    if days < 30 { return "\(days) day\(days == 1 ? "" : "s")" }
    let months = days / 30
    if months < 12 { return "\(months) month\(months == 1 ? "" : "s")" }
    let years = months / 12
    return "\(years) year\(years == 1 ? "" : "s")"
  }

  private static func shortPrettyTimeSince(_ ms: Double) -> String {
    let seconds = Int((Date().timeIntervalSince1970 * 1_000 - ms) / 1_000)
    if seconds < 60 { return "\(seconds)s" }
    let minutes = seconds / 60
    if minutes < 60 { return "\(minutes)m" }
    let hours = minutes / 60
    if hours < 24 { return "\(hours)h" }
    let days = hours / 24
    if days < 30 { return "\(days)d" }
    let months = days / 30
    if months < 12 { return "\(months)mo" }
    let years = months / 12
    return "\(years)y"
  }
}

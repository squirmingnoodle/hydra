import ActivityKit
import SwiftUI
import WidgetKit

// Shared attributes - must match the definition in the main app target
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
  var url: String
}

@available(iOS 16.2, *)
struct ThreadWatcherLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ThreadWatcherAttributes.self) { context in
      // Lock Screen / Banner view
      HStack(spacing: 12) {
        VStack(alignment: .leading, spacing: 4) {
          Text(context.attributes.title)
            .font(.system(size: 14, weight: .semibold))
            .lineLimit(2)

          Text("r/\(context.attributes.subreddit)")
            .font(.caption2)
            .foregroundStyle(.secondary)

          if let preview = context.state.lastReplyPreview {
            HStack(spacing: 4) {
              if let author = context.state.lastReplyAuthor {
                Text(author)
                  .font(.caption2)
                  .fontWeight(.medium)
                  .foregroundStyle(.orange)
              }
              Text(preview)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
          }
        }

        Spacer()

        VStack(alignment: .trailing, spacing: 6) {
          HStack(spacing: 3) {
            Image(systemName: "bubble.left.fill")
              .font(.system(size: 10))
              .foregroundStyle(.blue)
            Text("\(context.state.commentCount)")
              .font(.system(size: 13, weight: .bold, design: .rounded))
          }

          HStack(spacing: 3) {
            Image(systemName: "arrow.up")
              .font(.system(size: 10))
              .foregroundStyle(.orange)
            Text("\(context.state.upvotes)")
              .font(.system(size: 13, weight: .bold, design: .rounded))
          }
        }
      }
      .padding()

    } dynamicIsland: { context in
      DynamicIsland {
        // Expanded view
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 2) {
            Text("r/\(context.attributes.subreddit)")
              .font(.caption2)
              .foregroundStyle(.secondary)
            Text(context.attributes.title)
              .font(.caption)
              .fontWeight(.medium)
              .lineLimit(2)
          }
        }

        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 4) {
            Label("\(context.state.commentCount)", systemImage: "bubble.left.fill")
              .font(.caption2)
              .fontWeight(.bold)
            Label("\(context.state.upvotes)", systemImage: "arrow.up")
              .font(.caption2)
              .fontWeight(.bold)
          }
        }

        DynamicIslandExpandedRegion(.bottom) {
          if let preview = context.state.lastReplyPreview {
            HStack(spacing: 4) {
              if let author = context.state.lastReplyAuthor {
                Text(author)
                  .font(.caption2)
                  .fontWeight(.semibold)
                  .foregroundStyle(.orange)
              }
              Text(preview)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
          }
        }
      } compactLeading: {
        Image(systemName: "bubble.left.fill")
          .font(.system(size: 11))
          .foregroundStyle(.blue)
      } compactTrailing: {
        Text("\(context.state.commentCount)")
          .font(.system(size: 13, weight: .bold, design: .rounded))
      } minimal: {
        Image(systemName: "bubble.left.fill")
          .font(.system(size: 11))
          .foregroundStyle(.blue)
      }
    }
  }
}

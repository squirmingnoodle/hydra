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
  var author: String
  var url: String
  var thumbnailURL: String?
  var localThumbnailPath: String?
  var postText: String?
}

@available(iOS 16.2, *)
struct ThreadWatcherLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ThreadWatcherAttributes.self) { context in
      // Lock Screen / Banner view — large hero thumbnail layout
      VStack(spacing: 0) {
        // Large thumbnail banner
        if let path = context.attributes.localThumbnailPath,
           let uiImage = UIImage(contentsOfFile: path) {
          Image(uiImage: uiImage)
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(maxWidth: .infinity)
            .frame(height: 140)
            .clipped()
            .overlay(alignment: .topTrailing) {
              // Stats overlay on image
              HStack(spacing: 8) {
                HStack(spacing: 3) {
                  Image(systemName: "bubble.left.fill")
                    .font(.system(size: 10))
                  Text("\(context.state.commentCount)")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                }
                HStack(spacing: 3) {
                  Image(systemName: "arrow.up")
                    .font(.system(size: 10))
                  Text("\(context.state.upvotes)")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                }
              }
              .foregroundStyle(.white)
              .padding(.horizontal, 8)
              .padding(.vertical, 4)
              .background(.black.opacity(0.5), in: Capsule())
              .padding(8)
            }
        }

        // Post info below thumbnail
        VStack(alignment: .leading, spacing: 4) {
          Text(context.attributes.title)
            .font(.system(size: 14, weight: .semibold))
            .lineLimit(2)

          HStack(spacing: 6) {
            Text("r/\(context.attributes.subreddit)")
              .font(.caption2)
              .foregroundStyle(.secondary)
            Text("\u{2022}")
              .font(.caption2)
              .foregroundStyle(.quaternary)
            Text("u/\(context.attributes.author)")
              .font(.caption2)
              .foregroundStyle(.secondary)

            Spacer()

            // Show stats here if no thumbnail (they'd be on the image otherwise)
            if context.attributes.localThumbnailPath == nil {
              HStack(spacing: 8) {
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
          }

          if let preview = context.state.lastReplyPreview {
            HStack(spacing: 4) {
              Image(systemName: "arrowshape.turn.up.left.fill")
                .font(.system(size: 8))
                .foregroundStyle(.orange)
              if let replyAuthor = context.state.lastReplyAuthor {
                Text(replyAuthor)
                  .font(.caption2)
                  .fontWeight(.semibold)
                  .foregroundStyle(.orange)
              }
              Text(preview)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
          } else if let postText = context.attributes.postText, !postText.isEmpty {
            Text(postText)
              .font(.caption2)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }

          // Relative time
          HStack {
            Text(context.state.updatedAt, style: .relative)
              .font(.system(size: 9))
              .foregroundStyle(.tertiary)
            Text("ago")
              .font(.system(size: 9))
              .foregroundStyle(.tertiary)
          }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
      }
      .widgetURL(URL(string: "hydra://openurl?url=\(context.attributes.url)"))

    } dynamicIsland: { context in
      DynamicIsland {
        // Expanded view
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
              Text("r/\(context.attributes.subreddit)")
                .font(.caption2)
                .foregroundStyle(.secondary)
              Text("\u{2022}")
                .font(.caption2)
                .foregroundStyle(.quaternary)
              Text("u/\(context.attributes.author)")
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
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
              Image(systemName: "arrowshape.turn.up.left.fill")
                .font(.system(size: 8))
                .foregroundStyle(.orange)
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
          } else if let postText = context.attributes.postText, !postText.isEmpty {
            Text(postText)
              .font(.caption2)
              .foregroundStyle(.secondary)
              .lineLimit(2)
          }
        }
      } compactLeading: {
        HStack(spacing: 3) {
          Image(systemName: "bubble.left.fill")
            .font(.system(size: 11))
            .foregroundStyle(.blue)
          Text("\(context.state.commentCount)")
            .font(.system(size: 12, weight: .bold, design: .rounded))
        }
      } compactTrailing: {
        HStack(spacing: 3) {
          Image(systemName: "arrow.up")
            .font(.system(size: 10))
            .foregroundStyle(.orange)
          Text("\(context.state.upvotes)")
            .font(.system(size: 12, weight: .bold, design: .rounded))
        }
      } minimal: {
        Image(systemName: "bubble.left.fill")
          .font(.system(size: 11))
          .foregroundStyle(.blue)
      }
      .widgetURL(URL(string: "hydra://openurl?url=\(context.attributes.url)"))
    }
  }
}

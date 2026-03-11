import Foundation
import React
import FoundationModels

@objc(HydraSummarization)
class HydraSummarization: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(isAvailable:rejecter:)
  func isAvailable(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 26.0, *) {
      let model = SystemLanguageModel.default
      if case .available = model.availability {
        resolve(true)
      } else {
        resolve(false)
      }
    } else {
      resolve(false)
    }
  }

  @objc(summarizePost:subreddit:author:text:resolver:rejecter:)
  func summarizePost(
    _ title: String,
    subreddit: String,
    author: String,
    text: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 26.0, *) {
      Task {
        do {
          let session = LanguageModelSession(
            instructions: "You are a concise summarizer for Reddit posts. Provide clear, brief summaries in 2-3 sentences that capture the key points. Do not add commentary or opinions. Just output the summary text directly."
          )
          let prompt = """
          Summarize this Reddit post:

          Subreddit: r/\(subreddit)
          Title: \(title)
          Author: u/\(author)

          \(String(text.prefix(8000)))
          """
          let response = try await session.respond(to: prompt)
          resolve(response.content)
        } catch {
          reject("SUMMARIZATION_ERROR", error.localizedDescription, error)
        }
      }
    } else {
      reject("SUMMARIZATION_UNAVAILABLE", "Requires iOS 26.0 or later", nil)
    }
  }

  @objc(summarizeComments:author:postSummary:comments:resolver:rejecter:)
  func summarizeComments(
    _ title: String,
    author: String,
    postSummary: String,
    comments: NSArray,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 26.0, *) {
      Task {
        do {
          let session = LanguageModelSession(
            instructions: "You are a concise summarizer for Reddit comment discussions. Summarize the key points and opinions from the comments in 2-3 sentences. Focus on the most interesting or important responses. Just output the summary text directly."
          )
          let commentTexts = (comments as? [String]) ?? []
          let formatted = commentTexts.enumerated().map { i, text in
            "Comment \(i + 1): \(text)"
          }.joined(separator: "\n\n")

          let prompt = """
          Summarize the discussion in these comments:

          Post: \(title) by u/\(author)
          Post Summary: \(postSummary)

          \(String(formatted.prefix(8000)))
          """
          let response = try await session.respond(to: prompt)
          resolve(response.content)
        } catch {
          reject("SUMMARIZATION_ERROR", error.localizedDescription, error)
        }
      }
    } else {
      reject("SUMMARIZATION_UNAVAILABLE", "Requires iOS 26.0 or later", nil)
    }
  }
}

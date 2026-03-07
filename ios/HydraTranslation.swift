import Foundation
import React
import NaturalLanguage
@preconcurrency import Translation

@objc(HydraTranslation)
class HydraTranslation: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(detectLanguage:resolver:rejecter:)
  func detectLanguage(
    _ text: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    let recognizer = NLLanguageRecognizer()
    recognizer.processString(text)

    if let language = recognizer.dominantLanguage {
      let deviceLang = Locale.preferredLanguages.first?.prefix(2) ?? "en"
      resolve([
        "language": language.rawValue,
        "isDeviceLanguage": language.rawValue.hasPrefix(String(deviceLang)),
        "confidence": recognizer.languageHypotheses(withMaximum: 1)[language] ?? 0,
      ])
    } else {
      resolve([
        "language": NSNull(),
        "isDeviceLanguage": true,
        "confidence": 0,
      ])
    }
  }

  @objc(translate:sourceLanguage:resolver:rejecter:)
  func translate(
    _ text: String,
    sourceLanguage: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 26.0, *) {
      Task { @MainActor in
        do {
          let deviceLangId = Locale.preferredLanguages.first ?? "en"
          let target = Locale.Language(identifier: deviceLangId)

          let session: TranslationSession
          if let srcCode = sourceLanguage {
            let source = Locale.Language(identifier: srcCode)
            session = try await TranslationSession(installedSource: source, target: target)
          } else {
            let recognizer = NLLanguageRecognizer()
            recognizer.processString(text)
            let detectedCode = recognizer.dominantLanguage?.rawValue ?? "en"
            let source = Locale.Language(identifier: detectedCode)
            session = try await TranslationSession(installedSource: source, target: target)
          }

          let response = try await session.translate(text)
          resolve([
            "translatedText": response.targetText,
            "sourceLanguage": response.sourceLanguage.minimalIdentifier,
            "targetLanguage": response.targetLanguage.minimalIdentifier,
          ])
        } catch {
          reject("TRANSLATION_ERROR", error.localizedDescription, error)
        }
      }
    } else {
      reject("TRANSLATION_UNAVAILABLE", "Translation requires iOS 26.0 or later", nil)
    }
  }

  @objc(isAvailable:rejecter:)
  func isAvailable(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 26.0, *) {
      resolve(true)
    } else {
      resolve(false)
    }
  }
}

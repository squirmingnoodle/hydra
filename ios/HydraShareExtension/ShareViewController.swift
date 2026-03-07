import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
  private let suiteName = "group.com.darlops.hydra"

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    handleSharedContent()
  }

  private func handleSharedContent() {
    guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
      close()
      return
    }

    for item in extensionItems {
      guard let attachments = item.attachments else { continue }
      for provider in attachments {
        if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
          provider.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] item, _ in
            if let url = item as? URL {
              self?.saveAndOpen(url: url.absoluteString, text: nil)
            }
          }
          return
        } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
          provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] item, _ in
            if let text = item as? String {
              // Check if it's a URL string
              if let url = URL(string: text), url.scheme != nil {
                self?.saveAndOpen(url: text, text: nil)
              } else {
                self?.saveAndOpen(url: nil, text: text)
              }
            }
          }
          return
        }
      }
    }

    close()
  }

  private func saveAndOpen(url: String?, text: String?) {
    let defaults = UserDefaults(suiteName: suiteName)
    if let url = url {
      defaults?.set(url, forKey: "sharedURL")
      defaults?.removeObject(forKey: "sharedText")
    } else if let text = text {
      defaults?.set(text, forKey: "sharedText")
      defaults?.removeObject(forKey: "sharedURL")
    }
    defaults?.synchronize()

    // Build the deep link
    var deepLink = "hydra://share"
    if url != nil {
      deepLink += "?type=link"
    } else {
      deepLink += "?type=text"
    }

    // Open the main app
    if let appURL = URL(string: deepLink) {
      openURL(appURL)
    }

    close()
  }

  private func openURL(_ url: URL) {
    // Use the responder chain to open URLs from an extension
    var responder: UIResponder? = self
    while responder != nil {
      if let application = responder as? UIApplication {
        application.open(url, options: [:], completionHandler: nil)
        return
      }
      responder = responder?.next
    }

    // Fallback: Use selector-based approach
    let selector = sel_registerName("openURL:")
    var target: UIResponder? = self
    while let r = target {
      if r.responds(to: selector) {
        r.perform(selector, with: url)
        return
      }
      target = r.next
    }
  }

  private func close() {
    extensionContext?.completeRequest(returningItems: nil)
  }
}

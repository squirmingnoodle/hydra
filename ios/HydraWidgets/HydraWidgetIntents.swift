import AppIntents
import WidgetKit

// MARK: - Account Entity & Query

struct AccountEntity: AppEntity {
  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Account")
  static var defaultQuery = AccountQuery()

  var id: String
  var username: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(username)")
  }
}

struct AccountQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [AccountEntity] {
    let all = allAccounts()
    return all.filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [AccountEntity] {
    allAccounts()
  }

  func defaultResult() async -> AccountEntity? {
    // Default to the currently active account
    let defaults = UserDefaults(suiteName: "group.com.darlops.hydra")
    if let current = defaults?.string(forKey: "username") {
      return AccountEntity(id: current, username: current)
    }
    return allAccounts().first
  }

  private func allAccounts() -> [AccountEntity] {
    let defaults = UserDefaults(suiteName: "group.com.darlops.hydra")
    guard let accounts = defaults?.array(forKey: "availableAccounts") as? [[String: Any]] else {
      return []
    }
    return accounts.compactMap { dict in
      guard let username = dict["username"] as? String else { return nil }
      return AccountEntity(id: username, username: username)
    }
  }
}

// MARK: - Subreddit Entity & Query

struct SubredditEntity: AppEntity {
  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Subreddit")
  static var defaultQuery = SubredditQuery()

  var id: String
  var name: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "r/\(name)")
  }
}

struct SubredditQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [SubredditEntity] {
    let all = allSubreddits()
    return all.filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [SubredditEntity] {
    allSubreddits()
  }

  func defaultResult() async -> SubredditEntity? {
    nil
  }

  private func allSubreddits() -> [SubredditEntity] {
    let defaults = UserDefaults(suiteName: "group.com.darlops.hydra")

    // Get current account to load per-account subreddits
    let currentAccount = defaults?.string(forKey: "username") ?? ""
    let key = currentAccount.isEmpty ? "favoriteSubreddits" : "subscribedSubreddits:\(currentAccount)"

    guard let subs = defaults?.array(forKey: key) as? [[String: Any]] else {
      // Fallback to favorites
      guard let favs = defaults?.array(forKey: "favoriteSubreddits") as? [[String: Any]] else {
        return []
      }
      return favs.compactMap { dict in
        guard let name = dict["name"] as? String else { return nil }
        return SubredditEntity(id: name, name: name)
      }
    }

    return subs.compactMap { dict in
      guard let name = dict["name"] as? String else { return nil }
      return SubredditEntity(id: name, name: name)
    }
  }
}

// MARK: - Widget Configuration Intents

struct SelectAccountIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Select Account"
  static var description = IntentDescription("Choose which Reddit account to show posts from.")

  @Parameter(title: "Account")
  var account: AccountEntity?
}

struct SelectSubredditsIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Select Subreddits"
  static var description = IntentDescription("Choose subreddits to display.")

  @Parameter(title: "Account")
  var account: AccountEntity?

  @Parameter(title: "Subreddits")
  var subreddits: [SubredditEntity]?
}

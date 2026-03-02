import Foundation
import React

/// Native wrapper for NSUbiquitousKeyValueStore (iCloud Key-Value Storage).
///
/// All methods are synchronous — NSUbiquitousKeyValueStore reads/writes are
/// in-process and do not block on network I/O. iCloud syncs in the background.
@objc(HydraICloudKV)
class HydraICloudKV: NSObject {

  private let store = NSUbiquitousKeyValueStore.default

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc func set(_ key: String, value: String) {
    store.set(value, forKey: key)
    store.synchronize()
  }

  @objc func getString(_ key: String) -> String? {
    return store.string(forKey: key)
  }

  @objc func remove(_ key: String) {
    store.removeObject(forKey: key)
    store.synchronize()
  }

  @objc func getAllKeys() -> [String] {
    return Array(store.dictionaryRepresentation.keys)
  }
}

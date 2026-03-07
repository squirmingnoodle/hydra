import WidgetKit
import SwiftUI

@main
struct HydraWidgetsBundle: WidgetBundle {
  var body: some Widget {
    TrendingPostsWidget()
    InboxWidget()
    SubredditsWidget()
    if #available(iOS 16.2, *) {
      ThreadWatcherLiveActivity()
    }
  }
}

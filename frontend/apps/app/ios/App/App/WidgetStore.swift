// SPDX-License-Identifier: AGPL-3.0-or-later
import Foundation

/// State and identifiers shared by the app and the SpreadWidget extension, via their common App Group.
enum WidgetStore {
    static let kind = "SpreadWidget"
    static let appGroup = "group.live.pyxietarot.app"
    static let urlScheme = "pyxietarot"

    private static let defaults = UserDefaults(suiteName: appGroup)
    private static let tokenKey = "auth_token"

    static var token: String? {
        get { defaults?.string(forKey: tokenKey) }
        set { defaults?.set(newValue, forKey: tokenKey) }
    }

    /// Widget tap target - MainViewController.open(_:) loads its path in the web view.
    static func deepLink(to path: String) -> URL {
        URL(string: "\(urlScheme)://widget\(path)")!
    }
}

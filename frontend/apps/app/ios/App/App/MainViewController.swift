// SPDX-License-Identifier: AGPL-3.0-or-later
import Capacitor

class MainViewController: CAPBridgeViewController {
    /// A widget tap that arrived before the bridge was ready (cold launch) - replayed once capacitorDidLoad fires.
    private var pendingURL: URL?

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AuthBridgePlugin())
        bridge?.registerPluginInstance(LocalFilePlugin())
        if let pendingURL {
            self.pendingURL = nil
            open(pendingURL)
        }
    }

    /// Loads a widget tap's target path (see WidgetStore.deepLink). On a warm launch the bridge's default-page load
    /// already happened, so this navigation wins; on a cold launch the bridge isn't ready yet, so the URL is queued
    /// and replayed from capacitorDidLoad.
    func open(_ url: URL) {
        guard url.scheme == WidgetStore.urlScheme else { return }
        guard let bridge else {
            pendingURL = url
            return
        }
        bridge.webView?.load(URLRequest(url: bridge.config.serverURL.appendingPathComponent(url.path)))
    }
}

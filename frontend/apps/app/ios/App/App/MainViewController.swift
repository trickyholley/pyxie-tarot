// SPDX-License-Identifier: AGPL-3.0-or-later
import Capacitor

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AuthBridgePlugin())
    }

    /// Loads a widget tap's target path (see WidgetStore.deepLink). Called after the bridge's own default-page
    /// load, so this navigation wins.
    func open(_ url: URL) {
        guard url.scheme == WidgetStore.urlScheme, let bridge else { return }
        bridge.webView?.load(URLRequest(url: bridge.config.serverURL.appendingPathComponent(url.path)))
    }
}

// SPDX-License-Identifier: AGPL-3.0-or-later
import Capacitor
import WidgetKit

/// Mirrors the web app's access token into the App Group so the widget can authenticate without the WebView
/// running; also exposes an explicit refresh trigger for app-side events (e.g. a new diary entry).
@objc(AuthBridgePlugin)
class AuthBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "AuthBridgePlugin"
    let jsName = "AuthBridge"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshWidget", returnType: CAPPluginReturnPromise),
    ]

    @objc func setToken(_ call: CAPPluginCall) {
        WidgetStore.token = call.getString("token")
        refreshWidget(call)
    }

    @objc func clearToken(_ call: CAPPluginCall) {
        WidgetStore.token = nil
        refreshWidget(call)
    }

    @objc func refreshWidget(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadTimelines(ofKind: WidgetStore.kind)
        call.resolve()
    }
}

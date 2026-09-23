// SPDX-License-Identifier: AGPL-3.0-or-later
import Capacitor

/// Reads a local file (e.g. a camera result's `uri`) as base64 - the web page's https origin can't fetch the
/// capacitor:// `webPath` Capacitor hands it for the same file.
@objc(LocalFilePlugin)
class LocalFilePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LocalFilePlugin"
    let jsName = "LocalFile"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
    ]

    @objc func read(_ call: CAPPluginCall) {
        do {
            let data = try Data(contentsOf: URL(string: call.getString("uri")!)!)
            call.resolve(["base64": data.base64EncodedString()])
        } catch {
            call.reject(error.localizedDescription)
        }
    }
}

// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

private const val WIDGET_PREFS_NAME = "widget_prefs"
private const val AUTH_TOKEN_KEY = "auth_token"

/** Mirrors the web app's JWT (localStorage-only otherwise) into native storage, so the widget's
 * background worker can authenticate without the WebView running; also exposes an explicit refresh
 * trigger for app-side events (e.g. a new diary entry) that don't otherwise touch the token. */
@CapacitorPlugin(name = "AuthBridge")
class AuthBridgePlugin : Plugin() {
    private fun prefs() = context.getSharedPreferences(WIDGET_PREFS_NAME, 0)

    @PluginMethod
    fun setToken(call: PluginCall) {
        val token = call.getString("token") ?: return call.reject("token is required")
        prefs().edit().putString(AUTH_TOKEN_KEY, token).apply()
        SpreadWidgetScheduler.refreshNow(context)
        call.resolve()
    }

    @PluginMethod
    fun clearToken(call: PluginCall) {
        prefs().edit().remove(AUTH_TOKEN_KEY).apply()
        SpreadWidgetScheduler.refreshNow(context)
        call.resolve()
    }

    @PluginMethod
    fun refreshWidget(call: PluginCall) {
        SpreadWidgetScheduler.refreshNow(context)
        call.resolve()
    }
}

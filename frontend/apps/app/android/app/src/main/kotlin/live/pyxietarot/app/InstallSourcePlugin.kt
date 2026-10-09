// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/** Reports which app store installed this build, so the web app only offers Play Billing to Play installs -
 * sideloaded builds can't use it. */
@CapacitorPlugin(name = "InstallSource")
class InstallSourcePlugin : Plugin() {
    @PluginMethod
    fun getInstaller(call: PluginCall) {
        val packageManager = context.packageManager
        val installer = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            packageManager.getInstallSourceInfo(context.packageName).installingPackageName
        } else {
            @Suppress("DEPRECATION")
            packageManager.getInstallerPackageName(context.packageName)
        }
        call.resolve(JSObject().put("installer", installer))
    }
}

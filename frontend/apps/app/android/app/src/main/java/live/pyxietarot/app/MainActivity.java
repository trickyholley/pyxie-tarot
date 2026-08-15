package live.pyxietarot.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AuthBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }

    /**
     * BridgeActivity.load() already routes the launch intent through here once the bridge/webview
     * exist (both on cold start and on singleTask resume), so this is the one place a widget tap's
     * {@link SpreadWidgetProviderKt#EXTRA_TARGET_PATH} needs handling - it fires after the bridge's
     * own default-page load, so this navigation wins.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String targetPath = intent != null ? intent.getStringExtra(SpreadWidgetProviderKt.EXTRA_TARGET_PATH) : null;
        if (targetPath != null && bridge != null) {
            bridge.getWebView().loadUrl(bridge.getServerUrl() + targetPath);
        }
    }
}

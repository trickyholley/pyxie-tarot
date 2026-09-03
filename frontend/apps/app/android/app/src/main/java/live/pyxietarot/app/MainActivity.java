package live.pyxietarot.app;

import android.content.Intent;
import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /**
     * Holds the OS launch splash (styles.xml's AppTheme.NoActionBarLaunch) on screen past its default
     * dismiss point, which is tied to window readiness, not page content - the WebView loads the live
     * prod origin over the network on every cold start (capacitor.config.ts's server.url, by design),
     * so without this the splash drops out before there's anything but a blank white page to show.
     * A flat hold instead of a page-load signal: there's no reliable, low-risk way to bridge exact web
     * readiness back to native without its own race potential, and a generous fixed window is simple
     * and robust - Router.tsx's hydrateFallbackElement guarantees the JS side is showing its own
     * splash by the time this releases, so the handoff has nothing blank or wrong to flash (issue #281).
     */
    private static final long SPLASH_HOLD_MS = 1200;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        long launchedAt = System.currentTimeMillis();
        // installSplashScreen() must run before super.onCreate() (it needs the launch theme still
        // active), but setKeepOnScreenCondition() must run after: it calls findViewById() internally,
        // which needs AppCompat's decor view - only set up once super.onCreate() runs - and crashes
        // otherwise ("You need to use a Theme.AppCompat theme") since the launch theme itself isn't
        // AppCompat-based (issue #281).
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);

        registerPlugin(AuthBridgePlugin.class);
        super.onCreate(savedInstanceState);

        splashScreen.setKeepOnScreenCondition(() -> System.currentTimeMillis() - launchedAt < SPLASH_HOLD_MS);
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

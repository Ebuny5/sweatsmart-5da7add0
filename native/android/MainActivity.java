package guru.sweatsmart.twa;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * Copied into the generated Capacitor android/ project by
 * .github/workflows/build-android.yml. Adds:
 *  - Google Play In-App Updates (immediate flow) on launch/resume
 *  - A friendly fallback dialog instead of raw WebView error pages
 */
public class MainActivity extends BridgeActivity {

    private static final int UPDATE_REQUEST_CODE = 1731;
    private AppUpdateManager appUpdateManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null) {
            getBridge().setWebViewClient(new SafeWebViewClient(getBridge()));
        }
        appUpdateManager = AppUpdateManagerFactory.create(this);
        checkForUpdate();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (appUpdateManager == null) appUpdateManager = AppUpdateManagerFactory.create(this);
        checkForUpdate();
    }

    private void checkForUpdate() {
        appUpdateManager.getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                boolean available = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                        || info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
                if (available && info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                    try {
                        appUpdateManager.startUpdateFlowForResult(
                                info, AppUpdateType.IMMEDIATE, this, UPDATE_REQUEST_CODE);
                    } catch (Exception ignored) {
                        // Play not available on this device/build; carry on.
                    }
                }
            })
            .addOnFailureListener(e -> {
                // Offline, or installed outside Play: nothing to do.
            });
    }

    private void showUpdateFallback() {
        if (isFinishing()) return;
        new AlertDialog.Builder(this)
            .setTitle("Could not load HidroAlly")
            .setMessage("Your connection failed or this version is no longer supported. "
                    + "A newer version may be available on Google Play.")
            .setPositiveButton("Open Google Play", (d, w) -> openStoreListing())
            .setNegativeButton("Retry", (d, w) -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().reload();
                }
            })
            .setCancelable(false)
            .show();
    }

    private void openStoreListing() {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW,
                    Uri.parse("market://details?id=" + getPackageName())));
        } catch (ActivityNotFoundException e) {
            startActivity(new Intent(Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=" + getPackageName())));
        }
    }

    private class SafeWebViewClient extends BridgeWebViewClient {
        SafeWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onReceivedError(WebView view, @NonNull WebResourceRequest request,
                                    @NonNull WebResourceError error) {
            if (request.isForMainFrame()) {
                showUpdateFallback();
                return;
            }
            super.onReceivedError(view, request, error);
        }
    }
}

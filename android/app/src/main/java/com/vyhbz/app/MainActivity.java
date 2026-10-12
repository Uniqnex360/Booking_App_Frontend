package com.vyhbz.app;

import android.app.Dialog;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private Dialog phoneLoginDialog;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (getBridge() != null && getBridge().getWebView() != null) {
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(getBridge().getWebView(), true);

            getBridge().getWebView().addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void openPhoneLogin(String clientId) {
                    runOnUiThread(() -> showPhoneLoginDialog(clientId));
                }

                @JavascriptInterface
                public void sendTokenToApp(String accessToken) {
                    notifyAppWithToken(accessToken);
                }
            }, "Android");
        }
    }

    private void showPhoneLoginDialog(String clientId) {
        if (phoneLoginDialog != null && phoneLoginDialog.isShowing()) {
            phoneLoginDialog.dismiss();
        }

        phoneLoginDialog = new Dialog(this, android.R.style.Theme_DeviceDefault_Light_NoActionBar);
        phoneLoginDialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

        FrameLayout rootLayout = new FrameLayout(this);
        rootLayout.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        rootLayout.setBackgroundColor(Color.WHITE);

        WebView loginWebView = new WebView(this);
        loginWebView.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        WebSettings webSettings = loginWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setSupportZoom(false);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(loginWebView, true);

        ProgressBar progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            12
        ));
        progressBar.setIndeterminate(true);

        loginWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
            }
        });

        loginWebView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void sendTokenToApp(String accessToken) {
                runOnUiThread(() -> {
                    if (phoneLoginDialog != null && phoneLoginDialog.isShowing()) {
                        phoneLoginDialog.dismiss();
                    }
                    notifyAppWithToken(accessToken);
                });
            }
        }, "Android");

        rootLayout.addView(loginWebView);
        rootLayout.addView(progressBar);

        phoneLoginDialog.setContentView(rootLayout);
        phoneLoginDialog.setCancelable(true);
        phoneLoginDialog.show();

        String url = "https://auth.phone.email/log-in?client_id=" + clientId + "&auth_type=1";
        loginWebView.loadUrl(url);
    }

    private void notifyAppWithToken(String accessToken) {
        runOnUiThread(() -> {
            String url = "https://user.phone.email/user_" + accessToken + ".json";
            String js = "if (window.phoneEmailListener) { " +
                        "  window.phoneEmailListener({ user_json_url: '" + url + "' }); " +
                        "} else if (window.dispatchEvent) { " +
                        "  window.dispatchEvent(new CustomEvent('phoneEmailToken', { detail: { user_json_url: '" + url + "' } })); " +
                        "}";
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().evaluateJavascript(js, null);
            }
        });
    }
}

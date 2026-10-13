package com.vyhbz.app;

import android.app.Dialog;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.os.Message;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private Dialog phoneLoginDialog;
    private Dialog paymentPopupDialog;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView mainWebView = getBridge().getWebView();
            WebSettings settings = mainWebView.getSettings();
            settings.setSupportMultipleWindows(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);

            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(mainWebView, true);

            mainWebView.setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    if (paymentPopupDialog != null && paymentPopupDialog.isShowing()) {
                        paymentPopupDialog.dismiss();
                    }

                    paymentPopupDialog = new Dialog(MainActivity.this, android.R.style.Theme_DeviceDefault_Light_NoActionBar);
                    paymentPopupDialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

                    FrameLayout container = new FrameLayout(MainActivity.this);
                    container.setLayoutParams(new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    ));
                    container.setBackgroundColor(Color.WHITE);

                    WebView popupWebView = new WebView(MainActivity.this);
                    popupWebView.setLayoutParams(new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                    ));

                    WebSettings popupSettings = popupWebView.getSettings();
                    popupSettings.setJavaScriptEnabled(true);
                    popupSettings.setDomStorageEnabled(true);
                    popupSettings.setSupportMultipleWindows(true);
                    popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                    popupSettings.setDatabaseEnabled(true);
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                        popupSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                    }

                    CookieManager.getInstance().setAcceptCookie(true);
                    CookieManager.getInstance().setAcceptThirdPartyCookies(popupWebView, true);

                    ProgressBar popupProgress = new ProgressBar(MainActivity.this, null, android.R.attr.progressBarStyleHorizontal);
                    popupProgress.setLayoutParams(new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        12
                    ));
                    popupProgress.setIndeterminate(true);

                    popupWebView.setWebChromeClient(new WebChromeClient() {
                        @Override
                        public void onCloseWindow(WebView window) {
                            runOnUiThread(() -> {
                                if (paymentPopupDialog != null && paymentPopupDialog.isShowing()) {
                                    paymentPopupDialog.dismiss();
                                }
                            });
                        }
                    });

                    popupWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView v, String url) {
                            super.onPageFinished(v, url);
                            popupProgress.setVisibility(View.GONE);
                            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                                CookieManager.getInstance().flush();
                            }
                        }

                        @Override
                        public boolean shouldOverrideUrlLoading(WebView v, String url) {
                            if (url != null && (url.startsWith("upi://") || url.startsWith("intent://") || (!url.startsWith("http://") && !url.startsWith("https://")))) {
                                try {
                                    android.content.Intent intent = android.content.Intent.parseUri(url, android.content.Intent.URI_INTENT_SCHEME);
                                    if (intent != null && intent.resolveActivity(getPackageManager()) != null) {
                                        startActivity(intent);
                                        return true;
                                    }
                                } catch (Exception e) {
                                    e.printStackTrace();
                                }
                            }
                            return false;
                        }
                    });

                    container.addView(popupWebView);
                    container.addView(popupProgress);
                    paymentPopupDialog.setContentView(container);
                    paymentPopupDialog.setCancelable(true);
                    paymentPopupDialog.show();

                    WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                    transport.setWebView(popupWebView);
                    resultMsg.sendToTarget();
                    return true;
                }
            });

            mainWebView.addJavascriptInterface(new Object() {
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

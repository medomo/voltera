package com.voltra.commercialelectricity;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.telephony.SmsManager;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "VoltraApp";
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1002;

    private WebView webView;
    private ProgressBar progressBar;
    private SwipeRefreshLayout swipeRefreshLayout;
    private ValueCallback<Uri[]> fileUploadCallback;

    // Production or Local URL fallback
    private static final String APP_URL = "file:///android_asset/public/index.html";
    private static final String ONLINE_URL = "https://ais-dev-6hct7te662hthv664vsvnf-617225772420.europe-west2.run.app";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        setupWebView();
        checkAndRequestAppPermissions();

        // Load URL
        loadApplication();
    }

    private void initViews() {
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        swipeRefreshLayout = findViewById(R.id.swipeRefresh);

        if (swipeRefreshLayout != null) {
            swipeRefreshLayout.setOnRefreshListener(() -> {
                if (webView != null) {
                    webView.reload();
                }
            });
            swipeRefreshLayout.setColorSchemeResources(
                android.R.color.holo_orange_dark,
                android.R.color.holo_blue_bright,
                android.R.color.holo_green_dark
            );
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        if (webView == null) return;

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setGeolocationEnabled(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // Add JavaScript Interfaces for Background SMS & Native Features
        AndroidSMSInterface smsBridge = new AndroidSMSInterface(this);
        webView.addJavascriptInterface(smsBridge, "AndroidSMS");
        webView.addJavascriptInterface(smsBridge, "Android");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                if (progressBar != null) progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (progressBar != null) progressBar.setVisibility(View.GONE);
                if (swipeRefreshLayout != null) swipeRefreshLayout.setRefreshing(false);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return handleUrlScheme(uri);
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                return handleUrlScheme(uri);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (progressBar != null) {
                    progressBar.setProgress(newProgress);
                    if (newProgress == 100) {
                        progressBar.setVisibility(View.GONE);
                    }
                }
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                } catch (Exception e) {
                    fileUploadCallback = null;
                    return false;
                }
                return true;
            }
        });
    }

    private boolean handleUrlScheme(Uri uri) {
        String scheme = uri.getScheme();
        if (scheme == null) return false;

        if (scheme.equals("tel") || scheme.equals("sms") || scheme.equals("smsto") || scheme.equals("mailto") || scheme.equals("whatsapp")) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                startActivity(intent);
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Failed to open external URI: " + uri, e);
                return false;
            }
        }
        return false;
    }

    private void loadApplication() {
        // First try local assets, then fallback to live URL if configured
        try {
            webView.loadUrl(ONLINE_URL);
        } catch (Exception e) {
            webView.loadUrl(APP_URL);
        }
    }

    private void checkAndRequestAppPermissions() {
        String[] permissions = {
            Manifest.permission.SEND_SMS,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.CAMERA
        };

        ArrayList<String> listToRequest = new ArrayList<>();
        for (String perm : permissions) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                listToRequest.add(perm);
            }
        }

        if (!listToRequest.isEmpty()) {
            ActivityCompat.requestPermissions(this, listToRequest.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            for (int i = 0; i < permissions.length; i++) {
                if (permissions[i].equals(Manifest.permission.SEND_SMS) && grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    Toast.makeText(this, "تم تفعيل صلاحية إرسال رسائل SMS التلقائية", Toast.LENGTH_SHORT).show();
                }
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (fileUploadCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    if (data.getData() != null) {
                        results = new Uri[]{data.getData()};
                    } else if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    }
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    /**
     * JavaScript Interface Bridge for Web App -> Native Android Hardware (SMS, Printer, Sharing)
     */
    public class AndroidSMSInterface {
        private final Context context;

        public AndroidSMSInterface(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public boolean sendSMS(String phone, String message) {
            try {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
                    new Handler(Looper.getMainLooper()).post(() -> {
                        ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.SEND_SMS}, PERMISSION_REQUEST_CODE);
                    });
                    return false;
                }

                SmsManager smsManager;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    smsManager = context.getSystemService(SmsManager.class);
                } else {
                    smsManager = SmsManager.getDefault();
                }

                if (message.length() > 70) {
                    ArrayList<String> parts = smsManager.divideMessage(message);
                    smsManager.sendMultipartTextMessage(phone, null, parts, null, null);
                } else {
                    smsManager.sendTextMessage(phone, null, message, null, null);
                }

                Log.d(TAG, "SMS Sent successfully to: " + phone);
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Error sending SMS", e);
                return false;
            }
        }

        @JavascriptInterface
        public boolean sendSmsDirect(String phone, String message) {
            return sendSMS(phone, message);
        }

        @JavascriptInterface
        public void showToast(String message) {
            new Handler(Looper.getMainLooper()).post(() -> 
                Toast.makeText(context, message, Toast.LENGTH_LONG).show()
            );
        }

        @JavascriptInterface
        public boolean isNativeAndroid() {
            return true;
        }

        @JavascriptInterface
        public String getAppVersion() {
            return "1.0.0";
        }

        @JavascriptInterface
        public void shareText(String title, String text) {
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("text/plain");
            intent.putExtra(Intent.EXTRA_SUBJECT, title);
            intent.putExtra(Intent.EXTRA_TEXT, text);
            context.startActivity(Intent.createChooser(intent, title));
        }
    }
}

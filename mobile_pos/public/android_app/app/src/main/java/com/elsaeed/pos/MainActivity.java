package com.elsaeed.pos;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

import com.elsaeed.pos.bridge.SunyardBridge;
import com.elsaeed.pos.service.DeviceServiceManager;

public class MainActivity extends Activity {
    private static final String TAG = "MobilePOS";

    // Configuration - Production server URL (main website)
    private static final String POS_URL = "https://elnoors.com";

    private WebView webView;
    private ProgressBar progressBar;
    private SunyardBridge sunyardBridge;
    private DeviceServiceManager deviceServiceManager;

    // File upload handling
    private ValueCallback<Uri[]> fileUploadCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Keep screen on for POS usage
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Initialize views
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);

        // Initialize Sunyard SDK service
        initDeviceService();

        // Setup WebView
        setupWebView();

        // Load POS URL
        loadPosUrl();
    }

    private void initDeviceService() {
        deviceServiceManager = DeviceServiceManager.getInstance();
        deviceServiceManager.init(this);
        deviceServiceManager.connect(new DeviceServiceManager.OnServiceConnectedListener() {
            @Override
            public void onServiceConnected() {
                Log.d(TAG, "Sunyard SDK Service Connected");
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "POS Hardware Ready", Toast.LENGTH_SHORT).show();
                });
                // Initialize bridge after service is connected
                sunyardBridge = new SunyardBridge(MainActivity.this, webView, deviceServiceManager);
                runOnUiThread(() -> {
                    webView.addJavascriptInterface(sunyardBridge, "Android");
                });
            }

            @Override
            public void onServiceDisconnected() {
                Log.e(TAG, "Sunyard SDK Service Disconnected");
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "POS Hardware Disconnected", Toast.LENGTH_SHORT).show();
                });
            }
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();

        // ===== MAXIMUM PERFORMANCE OPTIMIZATIONS =====

        // Enable JavaScript
        settings.setJavaScriptEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        // Enable DOM storage for faster data access
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        // AGGRESSIVE CACHING - load from cache first, network only if not available
        settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);

        // Disable zoom controls
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);

        // Viewport settings
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        // Enable mixed content
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // File access
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // ===== MAXIMUM RENDERING PERFORMANCE =====

        // Hardware acceleration - CRITICAL for performance
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // Disable overscroll effects
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        // Maximum render priority
        settings.setRenderPriority(WebSettings.RenderPriority.HIGH);

        // Load images in parallel with page
        settings.setLoadsImagesAutomatically(true);
        settings.setBlockNetworkImage(false);

        // Disable unnecessary features
        settings.setGeolocationEnabled(false);
        settings.setNeedInitialFocus(false);
        settings.setSaveFormData(false);
        settings.setSavePassword(false);

        // ===== MAXIMUM TOUCH RESPONSIVENESS =====

        // Disable all delays
        webView.setLongClickable(false);
        webView.setHapticFeedbackEnabled(false);
        webView.setScrollbarFadingEnabled(false);

        // Focus handling
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);

        // Disable text selection for faster touch response
        webView.setOnLongClickListener(v -> true);

        // User agent
        settings.setUserAgentString("Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 MobilePOS-Android/1.3.5 SunyardPOS");

        // ===== COOKIE SETTINGS =====
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        // Flush cookies sync for faster session handling
        cookieManager.flush();

        // Add JavaScript interface for Android bridge (basic, will be replaced after service connects)
        sunyardBridge = new SunyardBridge(this, webView, null);
        webView.addJavascriptInterface(sunyardBridge, "Android");

        // WebView client for page loading
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                progressBar.setVisibility(View.VISIBLE);
                // Inject performance CSS IMMEDIATELY when page starts loading
                injectPerformanceCSS();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
                // Inject helper JS after page load
                injectHelperScript();
                // Re-inject CSS to ensure it's applied
                injectPerformanceCSS();
            }

            @Override
            public void onPageCommitVisible(WebView view, String url) {
                super.onPageCommitVisible(view, url);
                // Inject again when page becomes visible
                injectPerformanceCSS();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Log.e(TAG, "WebView error: " + error.getDescription());
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // Allow navigation within elnoors.com domain
                if (url.contains("elnoors.com")) {
                    return false; // Let WebView handle it
                }

                // Handle external links - open in browser
                if (!url.contains("localhost") && !url.contains("127.0.0.1") && !url.contains("192.168.")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }
                return false;
            }
        });

        // Chrome client for advanced features
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG, "JS Console: " + consoleMessage.message() + " -- Line " + consoleMessage.lineNumber());
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    request.grant(request.getResources());
                }
            }

            // Handle file uploads
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                startActivityForResult(Intent.createChooser(intent, "Select File"), FILE_CHOOSER_REQUEST_CODE);
                return true;
            }
        });
    }

    private void loadPosUrl() {
        // Check for custom URL in intent
        String url = getIntent().getStringExtra("pos_url");
        if (url == null || url.isEmpty()) {
            url = POS_URL;
        }
        webView.loadUrl(url);
    }

    // Inject performance CSS as early as possible - BEFORE page renders
    private void injectPerformanceCSS() {
        String css =
            "(function() {" +
            "  if (document.getElementById('android-perf-css')) return;" +
            "  var style = document.createElement('style');" +
            "  style.id = 'android-perf-css';" +
            "  style.textContent = '" +
            // Kill ALL animations and transitions
            "    *, *::before, *::after { " +
            "      animation: none !important; " +
            "      animation-duration: 0s !important; " +
            "      animation-delay: 0s !important; " +
            "      transition: none !important; " +
            "      transition-duration: 0s !important; " +
            "      transition-delay: 0s !important; " +
            "      -webkit-tap-highlight-color: transparent !important; " +
            "      touch-action: manipulation !important; " +
            "      -webkit-touch-callout: none !important; " +
            "    }" +
            // Fast scrolling
            "    html, body { " +
            "      -webkit-overflow-scrolling: touch !important; " +
            "      overscroll-behavior: none !important; " +
            "      scroll-behavior: auto !important; " +
            "    }" +
            // Modal instant show
            "    .fade { opacity: 1 !important; }" +
            "    .fade:not(.show):not(.in) { opacity: 0 !important; display: none !important; }" +
            "    .modal { transition: none !important; }" +
            "    .modal.show, .modal.in { opacity: 1 !important; display: block !important; }" +
            "    .modal.fade .modal-dialog { transform: none !important; transition: none !important; }" +
            "    .modal-backdrop { opacity: 0.5 !important; transition: none !important; }" +
            "    .modal-backdrop.fade { opacity: 0.5 !important; }" +
            // Collapse instant
            "    .collapsing { transition: none !important; height: auto !important; display: block !important; }" +
            "    .collapse.show, .collapse.in { display: block !important; }" +
            // Dropdown instant
            "    .dropdown-menu { transition: none !important; }" +
            // Tooltip/popover instant
            "    .tooltip, .popover { transition: none !important; }" +
            // Form controls
            "    input, select, textarea, button, .btn { transition: none !important; }" +
            // Frappe specific
            "    .frappe-control { transition: none !important; }" +
            "    .frappe-list { transition: none !important; }" +
            "    .page-container { transform: translateZ(0); }" +
            // Alerts
            "    .alert { transition: none !important; animation: none !important; }" +
            "  ';" +
            "  var target = document.head || document.documentElement;" +
            "  if (target) { target.insertBefore(style, target.firstChild); }" +
            "})();";
        webView.evaluateJavascript(css, null);
    }

    private void injectHelperScript() {
        String script =
            "(function() {" +
            "  if (window.AndroidBridgeReady) return;" +
            "  window.AndroidBridgeReady = true;" +
            "  console.log('Android Bridge Ready - Elnoor POS v2.0.0');" +
            "  " +
            // Fast click - remove 300ms delay
            "  // ===== FAST CLICK =====  " +
            "  document.addEventListener('touchstart', function(){}, {passive: true});" +
            "  if ('ontouchstart' in window) {" +
            "    var style = document.createElement('style');" +
            "    style.textContent = '* { touch-action: manipulation !important; }';" +
            "    document.head.appendChild(style);" +
            "  }" +
            "  " +
            // Disable Bootstrap animations
            "  // ===== DISABLE BOOTSTRAP =====  " +
            "  if (typeof jQuery !== 'undefined') {" +
            "    jQuery.support.transition = false;" +
            "    jQuery.fn.emulateTransitionEnd = function() { return this.trigger('transitionend'); };" +
            "    if (jQuery.fn.modal) {" +
            "      var origModal = jQuery.fn.modal;" +
            "      jQuery.fn.modal = function(opt) {" +
            "        var r = origModal.apply(this, arguments);" +
            "        this.addClass('show in').css({'display':'block','opacity':'1'});" +
            "        jQuery('.modal-backdrop').addClass('show in').css('opacity','0.5');" +
            "        return r;" +
            "      };" +
            "    }" +
            "  }" +
            "  " +
            // Patch Frappe
            "  // ===== PATCH FRAPPE =====  " +
            "  function patchFrappe() {" +
            "    if (typeof frappe === 'undefined') return;" +
            "    if (frappe.ui && frappe.ui.Dialog && !frappe.ui.Dialog._p) {" +
            "      frappe.ui.Dialog._p = true;" +
            "      var orig = frappe.ui.Dialog.prototype.show;" +
            "      frappe.ui.Dialog.prototype.show = function() {" +
            "        var r = orig.apply(this, arguments);" +
            "        this.$wrapper && this.$wrapper.addClass('show in').css({'display':'block','opacity':'1'});" +
            "        return r;" +
            "      };" +
            "    }" +
            "    if (frappe.msgprint && !frappe._mp) {" +
            "      frappe._mp = true;" +
            "      var origM = frappe.msgprint;" +
            "      frappe.msgprint = function() {" +
            "        var r = origM.apply(frappe, arguments);" +
            "        jQuery('.modal').addClass('show in').css({'display':'block','opacity':'1'});" +
            "        return r;" +
            "      };" +
            "    }" +
            "    if (frappe.confirm && !frappe._cf) {" +
            "      frappe._cf = true;" +
            "      var origC = frappe.confirm;" +
            "      frappe.confirm = function() {" +
            "        var r = origC.apply(frappe, arguments);" +
            "        jQuery('.modal').addClass('show in').css({'display':'block','opacity':'1'});" +
            "        return r;" +
            "      };" +
            "    }" +
            "  }" +
            "  patchFrappe();" +
            "  setTimeout(patchFrappe, 300);" +
            "  setTimeout(patchFrappe, 1000);" +
            "  setTimeout(patchFrappe, 3000);" +
            "  " +
            "  // ===== HELPER FUNCTIONS ===== " +
            "  window.isAndroidPOSApp = function() { return typeof Android !== 'undefined'; };" +
            "  window.isAndroidPrinterAvailable = function() { return typeof Android !== 'undefined' && Android.isPrinterAvailable && Android.isPrinterAvailable(); };" +
            "  " +
            "  // ===== FRAPPE INVOICE DATA EXTRACTOR ===== " +
            "  window.extractFrappeInvoiceData = function() {" +
            "    try {" +
            "      var data = {};" +
            "      if (typeof cur_frm !== 'undefined' && cur_frm.doc) {" +
            "        var doc = cur_frm.doc;" +
            "        data.invoice_name = doc.name || '';" +
            "        data.customer_name = doc.customer_name || doc.customer || '';" +
            "        data.company_name = (typeof company_print_name !== 'undefined' ? company_print_name : doc.company) || 'Elnoor-النور';" +
            "        data.company_phone = (typeof company_phone !== 'undefined' ? company_phone : '') || '';" +
            "        data.date = doc.posting_date || doc.transaction_date || '';" +
            "        data.time = doc.posting_time || '';" +
            "        data.custom_hash = doc.custom_hash || '';" +
            "        data.total = doc.total || doc.net_total || 0;" +
            "        data.discount = doc.discount_amount || 0;" +
            "        data.grand_total = doc.grand_total || doc.rounded_total || 0;" +
            "        data.paid_amount = doc.paid_amount || 0;" +
            "        data.change_amount = doc.change_amount || 0;" +
            "        data.is_return = doc.is_return || false;" +
            "        data.customer_balance = doc.customer_balance || 0;" +
            "        data.address_line1 = doc.address_display ? doc.address_display.split('<br>')[0] || '' : '';" +
            "        data.phone = doc.contact_mobile || doc.contact_phone || '';" +
            "        data.tax_id = doc.tax_id || '';" +
            "        data.items = [];" +
            "        if (doc.items && doc.items.length > 0) {" +
            "          doc.items.forEach(function(item) {" +
            "            data.items.push({" +
            "              item_code: item.item_code || ''," +
            "              item_name: item.item_name || item.item_code || ''," +
            "              qty: item.qty || 0," +
            "              rate: item.rate || 0," +
            "              amount: item.amount || (item.qty * item.rate) || 0" +
            "            });" +
            "          });" +
            "        }" +
            "        data.taxes = [];" +
            "        if (doc.taxes && doc.taxes.length > 0) {" +
            "          doc.taxes.forEach(function(tax) {" +
            "            data.taxes.push({" +
            "              description: tax.description || tax.account_head || ''," +
            "              tax_amount: tax.tax_amount || 0" +
            "            });" +
            "          });" +
            "        }" +
            "        data.payments = [];" +
            "        if (doc.payments && doc.payments.length > 0) {" +
            "          doc.payments.forEach(function(p) {" +
            "            data.payments.push({" +
            "              mode_of_payment: p.mode_of_payment || ''," +
            "              amount: p.amount || 0" +
            "            });" +
            "          });" +
            "        }" +
            "        return data;" +
            "      }" +
            "      return null;" +
            "    } catch(e) { console.error('Error extracting invoice:', e); return null; }" +
            "  };" +
            "  " +
            "  // ===== PRINT FUNCTION ===== " +
            "  window.printToSDK = function(data) {" +
            "    if (!window.isAndroidPrinterAvailable()) {" +
            "      console.log('Printer not available');" +
            "      alert('الطابعة غير متوفرة');" +
            "      return false;" +
            "    }" +
            "    try {" +
            "      if (typeof data === 'object') {" +
            "        Android.printReceipt(JSON.stringify(data));" +
            "      } else if (typeof data === 'string') {" +
            "        Android.printRawText(data);" +
            "      }" +
            "      return true;" +
            "    } catch(e) { console.error('Print error:', e); return false; }" +
            "  };" +
            "  " +
            "  // ===== OVERRIDE window.print() ===== " +
            "  window._originalPrint = window.print;" +
            "  window.print = function() {" +
            "    console.log('Print intercepted by Android POS');" +
            "    if (window.isAndroidPrinterAvailable()) {" +
            "      var data = window.extractFrappeInvoiceData();" +
            "      if (data && data.items && data.items.length > 0) {" +
            "        Android.printReceipt(JSON.stringify(data));" +
            "      } else {" +
            "        var content = document.body.innerText || '';" +
            "        Android.printRawText(content.substring(0, 2000));" +
            "      }" +
            "    } else if (window._originalPrint) { window._originalPrint(); }" +
            "  };" +
            "  " +
            "  // ===== INTERCEPT PRINT BUTTONS ===== " +
            "  function interceptPrintButtons() {" +
            "    document.querySelectorAll('[data-action=print], [onclick*=print], .btn-print, .print-btn, a[href*=print]').forEach(function(btn) {" +
            "      if (btn._printIntercepted) return;" +
            "      btn._printIntercepted = true;" +
            "      btn.addEventListener('click', function(e) {" +
            "        if (window.isAndroidPrinterAvailable()) {" +
            "          e.preventDefault();" +
            "          e.stopPropagation();" +
            "          var data = window.extractFrappeInvoiceData();" +
            "          if (data && data.items && data.items.length > 0) {" +
            "            Android.printReceipt(JSON.stringify(data));" +
            "          } else {" +
            "            window.print();" +
            "          }" +
            "        }" +
            "      }, true);" +
            "    });" +
            "  }" +
            "  interceptPrintButtons();" +
            "  setInterval(interceptPrintButtons, 2000);" +
            "  " +
            "  // ===== FRAPPE PRINT OVERRIDE ===== " +
            "  if (typeof frappe !== 'undefined') {" +
            "    var origPrintDoc = frappe.ui && frappe.ui.form && frappe.ui.form.print_doc;" +
            "    if (origPrintDoc) {" +
            "      frappe.ui.form.print_doc = function(doc) {" +
            "        if (window.isAndroidPrinterAvailable()) {" +
            "          var data = window.extractFrappeInvoiceData();" +
            "          if (data) { Android.printReceipt(JSON.stringify(data)); return; }" +
            "        }" +
            "        origPrintDoc.apply(this, arguments);" +
            "      };" +
            "    }" +
            "  }" +
            "  " +
            "  // ===== CALLBACKS ===== " +
            "  window.onPrintSuccess = function(msg) { console.log('Print success:', msg); frappe && frappe.show_alert && frappe.show_alert({message: msg, indicator: 'green'}); };" +
            "  window.onPrintError = function(msg) { console.error('Print error:', msg); frappe && frappe.show_alert && frappe.show_alert({message: msg, indicator: 'red'}); };" +
            "  " +
            "  window.dispatchEvent(new CustomEvent('androidBridgeReady'));" +
            "})();";

        webView.evaluateJavascript(script, null);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (fileUploadCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Handle back button
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }

        // Handle scanner hardware button (if applicable)
        if (keyCode == KeyEvent.KEYCODE_F1 || keyCode == KeyEvent.KEYCODE_BUTTON_1) {
            if (sunyardBridge != null) {
                sunyardBridge.startScan();
            }
            return true;
        }

        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();

        // Disconnect SDK service
        if (deviceServiceManager != null) {
            deviceServiceManager.disconnect();
        }

        // Cleanup WebView
        if (webView != null) {
            webView.removeJavascriptInterface("Android");
            webView.destroy();
        }
    }

    // Public method to show toast from bridge
    public void showToast(final String message) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
    }

    // Public method to reload WebView
    public void reloadWebView() {
        runOnUiThread(() -> webView.reload());
    }
}

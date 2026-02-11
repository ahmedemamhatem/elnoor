package com.elsaeed.pos.bridge;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.RemoteException;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.elsaeed.pos.MainActivity;
import com.elsaeed.pos.service.DeviceServiceManager;
import com.sunyard.api.printer.IPrinter;
import com.sunyard.api.printer.OnPrintListener;
import com.sunyard.api.printer.PrintConstant;
import com.sunyard.api.printer.PrinterChip;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;

/**
 * JavaScript Interface Bridge for Sunyard POS SDK
 * Exposes printer functionality to the WebView JavaScript
 */
public class SunyardBridge {
    private static final String TAG = "SunyardBridge";

    private final MainActivity activity;
    private final WebView webView;
    private DeviceServiceManager deviceServiceManager;
    private Handler mainHandler;

    public SunyardBridge(MainActivity activity, WebView webView, DeviceServiceManager deviceServiceManager) {
        this.activity = activity;
        this.webView = webView;
        this.deviceServiceManager = deviceServiceManager;
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    public void setDeviceServiceManager(DeviceServiceManager manager) {
        this.deviceServiceManager = manager;
    }

    // ==================== Availability Check ====================

    @JavascriptInterface
    public boolean isAvailable() {
        return deviceServiceManager != null && deviceServiceManager.isConnected();
    }

    @JavascriptInterface
    public boolean isPrinterAvailable() {
        return isAvailable() && deviceServiceManager.getPrinter() != null;
    }

    @JavascriptInterface
    public boolean isScannerAvailable() {
        // Scanner not implemented - return false
        return false;
    }

    @JavascriptInterface
    public String getSDKVersion() {
        if (deviceServiceManager != null) {
            return deviceServiceManager.getSDKVersion();
        }
        return "Not connected";
    }

    // ==================== Printer Functions ====================

    /**
     * Print a POS receipt
     * @param jsonData JSON string containing receipt data
     */
    @JavascriptInterface
    public void printReceipt(String jsonData) {
        Log.d(TAG, "printReceipt called with: " + jsonData);

        if (!isPrinterAvailable()) {
            callJSCallback("onPrintError", "Printer not available");
            return;
        }

        try {
            JSONObject data = new JSONObject(jsonData);
            printPOSReceipt(data);
        } catch (JSONException e) {
            Log.e(TAG, "Error parsing receipt data", e);
            callJSCallback("onPrintError", "Invalid receipt data: " + e.getMessage());
        }
    }

    private void printPOSReceipt(JSONObject data) {
        try {
            IPrinter printer = deviceServiceManager.getPrinter();
            if (printer == null) {
                callJSCallback("onPrintError", "Printer not available");
                return;
            }

            // Check for special print types (ledger, raw_text, etc.)
            String printType = data.optString("type", "receipt");
            if ("raw_text".equals(printType) || "ledger".equals(printType)) {
                printLedgerReport(printer, data);
                return;
            }

            // Set print density/gray level (higher = darker)
            printer.setGray(10);

            String invoiceName = data.optString("invoice_name", "");
            String customerName = data.optString("customer_name", "");
            String posProfile = data.optString("pos_profile", "");  // Mini POS Profile (المندوب)
            String companyName = data.optString("company_name", "Elnoor-النور");  // Get from data, default to Elnoor
            String companyPhone = data.optString("company_phone", "");  // Company phone for header
            String dateStr = data.optString("date", "");
            String timeStr = data.optString("time", "");
            String customHash = data.optString("custom_hash", "");
            String paymentMode = data.optString("payment_mode", "نقدي");
            double total = data.optDouble("total", 0);
            double discount = data.optDouble("discount", 0);
            double grandTotal = data.optDouble("grand_total", 0);
            double paidAmount = data.optDouble("paid_amount", 0);
            double changeAmount = data.optDouble("change_amount", 0);
            double customerBalance = data.optDouble("customer_balance", 0);
            boolean isReturn = data.optBoolean("is_return", false);
            JSONArray items = data.optJSONArray("items");
            JSONArray taxes = data.optJSONArray("taxes");
            JSONArray payments = data.optJSONArray("payments");
            String addressLine1 = data.optString("address_line1", "");
            String addressLine2 = data.optString("address_line2", "");
            String phone = data.optString("phone", "");
            String taxId = data.optString("tax_id", "");

            // RTL Bundles - Arabic text aligned RIGHT
            Bundle centerBundle = new Bundle();
            centerBundle.putInt("align", PrintConstant.Align.CENTER);
            centerBundle.putInt("font", PrintConstant.FontSize.NORMAL);

            Bundle rightBundle = new Bundle();
            rightBundle.putInt("align", PrintConstant.Align.RIGHT);
            rightBundle.putInt("font", PrintConstant.FontSize.NORMAL);

            Bundle leftBundle = new Bundle();
            leftBundle.putInt("align", PrintConstant.Align.LEFT);
            leftBundle.putInt("font", PrintConstant.FontSize.NORMAL);

            Bundle largeCenterBundle = new Bundle();
            largeCenterBundle.putInt("align", PrintConstant.Align.CENTER);
            largeCenterBundle.putInt("font", PrintConstant.FontSize.LARGE);

            Bundle largeRightBundle = new Bundle();
            largeRightBundle.putInt("align", PrintConstant.Align.RIGHT);
            largeRightBundle.putInt("font", PrintConstant.FontSize.LARGE);

            // ===== HEADER =====
            printLogoHeader(printer);
            printer.addText(largeCenterBundle, companyName);
            if (!companyPhone.isEmpty()) {
                printer.addText(centerBundle, companyPhone);
            }
            if (!addressLine1.isEmpty()) {
                printer.addText(centerBundle, addressLine1);
            }
            if (!addressLine2.isEmpty()) {
                printer.addText(centerBundle, addressLine2);
            }
            if (!phone.isEmpty()) {
                printer.addText(centerBundle, "هاتف: " + phone);
            }
            if (!taxId.isEmpty()) {
                printer.addText(centerBundle, "الرقم الضريبي: " + taxId);
            }
            printer.addText(centerBundle, "================================");
            printer.addText(largeCenterBundle, isReturn ? "فاتورة مرتجع" : "فاتورة بيع");
            printer.addText(centerBundle, "================================");

            // ===== INVOICE INFO (RTL) =====
            printRTLRow(printer, "رقم الفاتورة", invoiceName);
            printRTLRow(printer, "العميل", customerName);
            if (!posProfile.isEmpty()) {
                printRTLRow(printer, "المندوب", posProfile);
            }
            printRTLRow(printer, "التاريخ", dateStr);
            printRTLRow(printer, "الوقت", timeStr);
            if (!customHash.isEmpty()) {
                printRTLRow(printer, "رقم القيد", customHash);
            }
            printer.addText(centerBundle, "--------------------------------");

            // ===== ITEMS HEADER (RTL) =====
            ArrayList<PrinterChip> headerChips = new ArrayList<>();
            PrinterChip totalHeader = new PrinterChip("المجموع", 0.22f, 0);
            totalHeader.setFontSize(0);
            headerChips.add(totalHeader);
            PrinterChip rateHeader = new PrinterChip("السعر", 0.22f, 1);
            rateHeader.setFontSize(0);
            headerChips.add(rateHeader);
            PrinterChip qtyHeader = new PrinterChip("الكمية", 0.16f, 1);
            qtyHeader.setFontSize(0);
            headerChips.add(qtyHeader);
            PrinterChip itemHeader = new PrinterChip("الصنف", 0.40f, 2);
            itemHeader.setFontSize(0);
            headerChips.add(itemHeader);
            printer.addTextChips(headerChips);
            printer.addText(centerBundle, "--------------------------------");

            // ===== ITEMS (RTL) =====
            if (items != null) {
                for (int i = 0; i < items.length(); i++) {
                    JSONObject item = items.getJSONObject(i);
                    String itemName = item.optString("item_name", item.optString("item_code", ""));
                    double qty = item.optDouble("qty", 0);
                    double rate = item.optDouble("rate", 0);
                    double itemTotal = item.optDouble("amount", qty * rate);

                    ArrayList<PrinterChip> itemChips = new ArrayList<>();

                    PrinterChip totalChip = new PrinterChip(formatCurrency(itemTotal), 0.22f, 0);
                    totalChip.setFontSize(0);
                    itemChips.add(totalChip);

                    PrinterChip rateChip = new PrinterChip(formatCurrency(rate), 0.22f, 1);
                    rateChip.setFontSize(0);
                    itemChips.add(rateChip);

                    PrinterChip qtyChip = new PrinterChip(formatNumber(qty), 0.16f, 1);
                    qtyChip.setFontSize(0);
                    itemChips.add(qtyChip);

                    PrinterChip nameChip = new PrinterChip(itemName, 0.40f, 2);
                    nameChip.setFontSize(0);
                    itemChips.add(nameChip);

                    printer.addTextChips(itemChips);
                }
            }

            printer.addText(centerBundle, "================================");

            // ===== TOTALS (RTL) =====
            printRTLRow(printer, "المجموع", formatCurrency(total));

            if (discount > 0) {
                printRTLRow(printer, "الخصم", "-" + formatCurrency(discount));
            }

            // ===== TAXES =====
            if (taxes != null && taxes.length() > 0) {
                for (int i = 0; i < taxes.length(); i++) {
                    JSONObject tax = taxes.getJSONObject(i);
                    String taxName = tax.optString("description", tax.optString("account_head", "ضريبة"));
                    double taxAmount = tax.optDouble("tax_amount", 0);
                    printRTLRow(printer, taxName, formatCurrency(taxAmount));
                }
            }

            printer.addText(centerBundle, "--------------------------------");

            // ===== GRAND TOTAL (RTL - Large) =====
            printer.addText(largeRightBundle, formatCurrency(grandTotal) + " :الإجمالي");

            printer.addText(centerBundle, "================================");

            // ===== PAYMENTS =====
            if (payments != null && payments.length() > 0) {
                printer.addText(rightBundle, "المدفوعات:");
                for (int i = 0; i < payments.length(); i++) {
                    JSONObject payment = payments.getJSONObject(i);
                    String modeOfPayment = payment.optString("mode_of_payment", "نقدي");
                    double amount = payment.optDouble("amount", 0);
                    printRTLRow(printer, modeOfPayment, formatCurrency(amount));
                }
            } else if (paidAmount > 0) {
                printRTLRow(printer, "المدفوع (" + paymentMode + ")", formatCurrency(paidAmount));
            }

            if (changeAmount > 0) {
                printRTLRow(printer, "الباقي", formatCurrency(changeAmount));
            }

            if (!isReturn && grandTotal > paidAmount && paidAmount > 0) {
                double remaining = grandTotal - paidAmount;
                printRTLRow(printer, "المتبقي", formatCurrency(remaining));
            }

            printer.addText(centerBundle, "--------------------------------");

            // ===== CUSTOMER BALANCE =====
            if (customerBalance != 0) {
                String balanceLabel = customerBalance > 0 ? "رصيد العميل (مدين)" : "رصيد العميل (دائن)";
                printRTLRow(printer, balanceLabel, formatCurrency(Math.abs(customerBalance)));
                printer.addText(centerBundle, "--------------------------------");
            }

            // ===== FOOTER =====
            printer.addText(centerBundle, "شكراً لتعاملكم معنا");
            printer.addText(centerBundle, "Thank you for your business!");

            // Feed paper
            printer.feedLine(5);

            // Start printing
            printer.startPrint(new OnPrintListener.Stub() {
                @Override
                public void onFinish() throws RemoteException {
                    Log.d(TAG, "Print finished successfully");
                    callJSCallback("onPrintSuccess", "تم الطباعة بنجاح");
                }

                @Override
                public void onError(int errorCode) throws RemoteException {
                    String errorMsg = getPrintErrorMessage(errorCode);
                    Log.e(TAG, "Print error: " + errorMsg);
                    callJSCallback("onPrintError", errorMsg);
                }
            });

        } catch (RemoteException e) {
            Log.e(TAG, "RemoteException during printing", e);
            callJSCallback("onPrintError", "خطأ في الطباعة: " + e.getMessage());
        } catch (JSONException e) {
            Log.e(TAG, "JSONException during printing", e);
            callJSCallback("onPrintError", "خطأ في البيانات: " + e.getMessage());
        }
    }

    /**
     * Print RTL row with label on right and value on left
     */
    private void printRTLRow(IPrinter printer, String label, String value) throws RemoteException {
        ArrayList<PrinterChip> chips = new ArrayList<>();
        // Value on left
        PrinterChip valueChip = new PrinterChip(value, 0.4f, 0);
        valueChip.setFontSize(0);
        chips.add(valueChip);
        // Label on right with colon
        PrinterChip labelChip = new PrinterChip(label + ":", 0.6f, 2);
        labelChip.setFontSize(0);
        chips.add(labelChip);
        printer.addTextChips(chips);
    }

    private void printTwoColumnRow(IPrinter printer, String left, String right) throws RemoteException {
        ArrayList<PrinterChip> chips = new ArrayList<>();
        PrinterChip leftChip = new PrinterChip(left, 0.5f, 0);
        leftChip.setFontSize(0);
        chips.add(leftChip);
        PrinterChip rightChip = new PrinterChip(right, 0.5f, 2);
        rightChip.setFontSize(0);
        chips.add(rightChip);
        printer.addTextChips(chips);
    }

    /**
     * Print a Stock Transfer document
     * @param jsonData JSON string containing stock transfer data
     */
    @JavascriptInterface
    public void printStockTransfer(String jsonData) {
        Log.d(TAG, "printStockTransfer called with: " + jsonData);

        if (!isPrinterAvailable()) {
            callJSCallback("onPrintError", "Printer not available");
            return;
        }

        try {
            JSONObject data = new JSONObject(jsonData);
            printStockTransferReceipt(data);
        } catch (JSONException e) {
            Log.e(TAG, "Error parsing stock transfer data", e);
            callJSCallback("onPrintError", "Invalid stock transfer data: " + e.getMessage());
        }
    }

    private void printStockTransferReceipt(JSONObject data) {
        try {
            IPrinter printer = deviceServiceManager.getPrinter();
            if (printer == null) {
                callJSCallback("onPrintError", "Printer not available");
                return;
            }

            // Set print density/gray level (higher = darker)
            printer.setGray(10);

            String docName = data.optString("name", "");
            String transferType = data.optString("transfer_type", "");
            String sourceWarehouse = data.optString("source_warehouse", "");
            String targetWarehouse = data.optString("target_warehouse", "");
            String dateStr = data.optString("date", "");
            String timeStr = data.optString("time", "");
            String posProfile = data.optString("pos_profile", "");
            String companyName = data.optString("company_name", data.optString("company", "Elnoor-النور"));
            String companyPhone = data.optString("company_phone", "");
            JSONArray items = data.optJSONArray("items");
            int totalItems = data.optInt("total_items", 0);
            double totalQty = data.optDouble("total_qty", 0);

            // RTL Bundles - Arabic text aligned RIGHT
            Bundle centerBundle = new Bundle();
            centerBundle.putInt("align", PrintConstant.Align.CENTER);
            centerBundle.putInt("font", PrintConstant.FontSize.NORMAL);

            Bundle rightBundle = new Bundle();
            rightBundle.putInt("align", PrintConstant.Align.RIGHT);
            rightBundle.putInt("font", PrintConstant.FontSize.NORMAL);

            Bundle leftBundle = new Bundle();
            leftBundle.putInt("align", PrintConstant.Align.LEFT);
            leftBundle.putInt("font", PrintConstant.FontSize.NORMAL);

            Bundle largeCenterBundle = new Bundle();
            largeCenterBundle.putInt("align", PrintConstant.Align.CENTER);
            largeCenterBundle.putInt("font", PrintConstant.FontSize.LARGE);

            Bundle largeRightBundle = new Bundle();
            largeRightBundle.putInt("align", PrintConstant.Align.RIGHT);
            largeRightBundle.putInt("font", PrintConstant.FontSize.LARGE);

            // ===== HEADER =====
            printLogoHeader(printer);
            printer.addText(largeCenterBundle, companyName);
            if (!companyPhone.isEmpty()) {
                printer.addText(centerBundle, companyPhone);
            }
            printer.addText(centerBundle, "================================");

            // Title based on transfer type
            String title = "إذن تحويل مخزون";
            if (transferType.equals("تحميل")) {
                title = "إذن تحميل";
            } else if (transferType.equals("تفريغ")) {
                title = "إذن تفريغ";
            }
            printer.addText(largeCenterBundle, title);
            printer.addText(centerBundle, "================================");

            // ===== TRANSFER INFO (RTL) =====
            printRTLRow(printer, "رقم الإذن", docName);
            if (!transferType.isEmpty()) {
                printRTLRow(printer, "نوع التحويل", transferType);
            }
            printRTLRow(printer, "من مخزن", sourceWarehouse);
            printRTLRow(printer, "إلى مخزن", targetWarehouse);
            printRTLRow(printer, "التاريخ", dateStr);
            if (!timeStr.isEmpty()) {
                printRTLRow(printer, "الوقت", timeStr);
            }
            if (!posProfile.isEmpty()) {
                printRTLRow(printer, "الموظف", posProfile);
            }
            printer.addText(centerBundle, "--------------------------------");

            // ===== ITEMS HEADER (RTL) =====
            ArrayList<PrinterChip> headerChips = new ArrayList<>();
            PrinterChip qtyHeader = new PrinterChip("الكمية", 0.25f, 0);
            qtyHeader.setFontSize(0);
            headerChips.add(qtyHeader);
            PrinterChip uomHeader = new PrinterChip("الوحدة", 0.25f, 1);
            uomHeader.setFontSize(0);
            headerChips.add(uomHeader);
            PrinterChip itemHeader = new PrinterChip("الصنف", 0.50f, 2);
            itemHeader.setFontSize(0);
            headerChips.add(itemHeader);
            printer.addTextChips(headerChips);
            printer.addText(centerBundle, "--------------------------------");

            // ===== ITEMS (RTL) =====
            if (items != null) {
                for (int i = 0; i < items.length(); i++) {
                    JSONObject item = items.getJSONObject(i);
                    String itemName = item.optString("item_name", item.optString("item_code", ""));
                    double qty = item.optDouble("qty", 0);
                    String uom = item.optString("uom", "");

                    ArrayList<PrinterChip> itemChips = new ArrayList<>();

                    PrinterChip qtyChip = new PrinterChip(formatNumber(qty), 0.25f, 0);
                    qtyChip.setFontSize(0);
                    itemChips.add(qtyChip);

                    PrinterChip uomChip = new PrinterChip(uom, 0.25f, 1);
                    uomChip.setFontSize(0);
                    itemChips.add(uomChip);

                    PrinterChip nameChip = new PrinterChip(itemName, 0.50f, 2);
                    nameChip.setFontSize(0);
                    itemChips.add(nameChip);

                    printer.addTextChips(itemChips);
                }
            }

            printer.addText(centerBundle, "================================");

            // ===== TOTALS (RTL) =====
            printRTLRow(printer, "عدد الأصناف", String.valueOf(totalItems));
            printRTLRow(printer, "إجمالي الكمية", formatNumber(totalQty));

            printer.addText(centerBundle, "================================");

            // ===== SIGNATURES =====
            printer.addText(centerBundle, " ");
            printer.addText(rightBundle, "توقيع المستلم: ________________");
            printer.addText(centerBundle, " ");
            printer.addText(rightBundle, "توقيع المسلم: ________________");

            // ===== FOOTER =====
            printer.addText(centerBundle, "--------------------------------");
            printer.addText(centerBundle, "تم الطباعة من نظام Mobile POS");

            // Feed paper
            printer.feedLine(5);

            // Start printing
            printer.startPrint(new OnPrintListener.Stub() {
                @Override
                public void onFinish() throws RemoteException {
                    Log.d(TAG, "Stock transfer print finished successfully");
                    callJSCallback("onPrintSuccess", "تم طباعة إذن التحويل بنجاح");
                }

                @Override
                public void onError(int errorCode) throws RemoteException {
                    String errorMsg = getPrintErrorMessage(errorCode);
                    Log.e(TAG, "Stock transfer print error: " + errorMsg);
                    callJSCallback("onPrintError", errorMsg);
                }
            });

        } catch (RemoteException e) {
            Log.e(TAG, "RemoteException during stock transfer printing", e);
            callJSCallback("onPrintError", "خطأ في الطباعة: " + e.getMessage());
        } catch (JSONException e) {
            Log.e(TAG, "JSONException during stock transfer printing", e);
            callJSCallback("onPrintError", "خطأ في البيانات: " + e.getMessage());
        }
    }

    /**
     * Print raw text lines - useful for printing page content directly
     * @param textContent Multi-line text content to print
     */
    @JavascriptInterface
    public void printRawText(String textContent) {
        if (!isPrinterAvailable()) {
            callJSCallback("onPrintError", "Printer not available");
            return;
        }

        try {
            IPrinter printer = deviceServiceManager.getPrinter();
            printer.setGray(12);  // Darker print for better readability

            Bundle centerBundle = new Bundle();
            centerBundle.putInt("align", PrintConstant.Align.CENTER);
            centerBundle.putInt("font", PrintConstant.FontSize.NORMAL);

            Bundle rightBundle = new Bundle();
            rightBundle.putInt("align", PrintConstant.Align.RIGHT);
            rightBundle.putInt("font", PrintConstant.FontSize.NORMAL);

            Bundle largeCenterBundle = new Bundle();
            largeCenterBundle.putInt("align", PrintConstant.Align.CENTER);
            largeCenterBundle.putInt("font", PrintConstant.FontSize.LARGE);

            // Split by lines and print each
            String[] lines = textContent.split("\n");
            boolean isFirstLine = true;
            boolean nextLineIsHeader = false;
            for (String line : lines) {
                String trimmedLine = line.trim();
                if (!trimmedLine.isEmpty()) {
                    // Use large font for header/title lines (containing === or first line after ===)
                    if (trimmedLine.contains("===")) {
                        printer.addText(largeCenterBundle, trimmedLine);
                        nextLineIsHeader = true;
                    } else if (nextLineIsHeader && !trimmedLine.contains("---")) {
                        // Company name or title line (right after ===)
                        printer.addText(largeCenterBundle, trimmedLine);
                        nextLineIsHeader = false;
                    } else if (trimmedLine.contains("---") || trimmedLine.contains("الإجمالي") || trimmedLine.contains("المجموع")) {
                        printer.addText(centerBundle, trimmedLine);
                        nextLineIsHeader = false;
                    } else {
                        printer.addText(rightBundle, trimmedLine);
                        nextLineIsHeader = false;
                    }
                    isFirstLine = false;
                }
            }

            printer.feedLine(4);
            printer.startPrint(new OnPrintListener.Stub() {
                @Override
                public void onFinish() throws RemoteException {
                    callJSCallback("onPrintSuccess", "تم الطباعة بنجاح");
                }

                @Override
                public void onError(int errorCode) throws RemoteException {
                    callJSCallback("onPrintError", getPrintErrorMessage(errorCode));
                }
            });
        } catch (RemoteException e) {
            callJSCallback("onPrintError", e.getMessage());
        }
    }

    /**
     * Print plain text
     */
    @JavascriptInterface
    public void printText(String text, int align, int fontSize) {
        if (!isPrinterAvailable()) {
            callJSCallback("onPrintError", "Printer not available");
            return;
        }

        try {
            IPrinter printer = deviceServiceManager.getPrinter();
            Bundle bundle = new Bundle();
            bundle.putInt("align", align); // 0=LEFT, 1=CENTER, 2=RIGHT
            bundle.putInt("font", fontSize); // 0=NORMAL, 1=LARGE, 2=SMALL
            printer.addText(bundle, text);
            printer.feedLine(2);
            printer.startPrint(new OnPrintListener.Stub() {
                @Override
                public void onFinish() throws RemoteException {
                    callJSCallback("onPrintSuccess", "Text printed");
                }

                @Override
                public void onError(int errorCode) throws RemoteException {
                    callJSCallback("onPrintError", getPrintErrorMessage(errorCode));
                }
            });
        } catch (RemoteException e) {
            callJSCallback("onPrintError", e.getMessage());
        }
    }

    /**
     * Print QR code
     */
    @JavascriptInterface
    public void printQRCode(String data, int size) {
        if (!isPrinterAvailable()) {
            callJSCallback("onPrintError", "Printer not available");
            return;
        }

        try {
            IPrinter printer = deviceServiceManager.getPrinter();
            Bundle bundle = new Bundle();
            bundle.putInt("align", PrintConstant.Align.CENTER);
            bundle.putInt("expectedHeight", size > 0 ? size : 200);
            printer.addQrCode(bundle, data);
            printer.feedLine(2);
            printer.startPrint(new OnPrintListener.Stub() {
                @Override
                public void onFinish() throws RemoteException {
                    callJSCallback("onPrintSuccess", "QR Code printed");
                }

                @Override
                public void onError(int errorCode) throws RemoteException {
                    callJSCallback("onPrintError", getPrintErrorMessage(errorCode));
                }
            });
        } catch (RemoteException e) {
            callJSCallback("onPrintError", e.getMessage());
        }
    }

    /**
     * Print barcode
     */
    @JavascriptInterface
    public void printBarcode(String data, int width, int height) {
        if (!isPrinterAvailable()) {
            callJSCallback("onPrintError", "Printer not available");
            return;
        }

        try {
            IPrinter printer = deviceServiceManager.getPrinter();
            Bundle bundle = new Bundle();
            bundle.putInt("align", PrintConstant.Align.CENTER);
            bundle.putInt("width", width > 0 ? width : 400);
            bundle.putInt("height", height > 0 ? height : 100);
            printer.addBarCode(bundle, data);
            printer.feedLine(2);
            printer.startPrint(new OnPrintListener.Stub() {
                @Override
                public void onFinish() throws RemoteException {
                    callJSCallback("onPrintSuccess", "Barcode printed");
                }

                @Override
                public void onError(int errorCode) throws RemoteException {
                    callJSCallback("onPrintError", getPrintErrorMessage(errorCode));
                }
            });
        } catch (RemoteException e) {
            callJSCallback("onPrintError", e.getMessage());
        }
    }

    /**
     * Print image from Base64
     */
    @JavascriptInterface
    public void printImage(String base64Data) {
        if (!isPrinterAvailable()) {
            callJSCallback("onPrintError", "Printer not available");
            return;
        }

        try {
            byte[] imageBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length);

            if (bitmap == null) {
                callJSCallback("onPrintError", "Invalid image data");
                return;
            }

            IPrinter printer = deviceServiceManager.getPrinter();
            Bundle bundle = new Bundle();
            bundle.putInt("offset", 0);
            printer.addImage(bundle, bitmapToByteArray(bitmap));
            printer.feedLine(2);
            printer.startPrint(new OnPrintListener.Stub() {
                @Override
                public void onFinish() throws RemoteException {
                    callJSCallback("onPrintSuccess", "Image printed");
                }

                @Override
                public void onError(int errorCode) throws RemoteException {
                    callJSCallback("onPrintError", getPrintErrorMessage(errorCode));
                }
            });
        } catch (Exception e) {
            callJSCallback("onPrintError", e.getMessage());
        }
    }

    /**
     * Feed paper lines
     */
    @JavascriptInterface
    public void feedPaper(int lines) {
        if (!isPrinterAvailable()) return;

        try {
            IPrinter printer = deviceServiceManager.getPrinter();
            printer.feedLine(lines);
            printer.startPrint(null);
        } catch (RemoteException e) {
            Log.e(TAG, "Feed paper error", e);
        }
    }

    // ==================== Stub methods for scanner (not implemented) ====================

    @JavascriptInterface
    public void startScan() {
        callJSCallback("onScanError", "Scanner not available on this device");
    }

    @JavascriptInterface
    public void stopScan() {
        // No-op
    }

    // ==================== Utility Functions ====================

    private String formatCurrency(double value) {
        return String.format("%.2f", value);
    }

    private String formatNumber(double value) {
        if (value == (int) value) {
            return String.valueOf((int) value);
        }
        return String.format("%.2f", value);
    }

    private byte[] bitmapToByteArray(Bitmap bitmap) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
        return outputStream.toByteArray();
    }

    /**
     * Print company logo from app resources at the top of receipts
     */
    private void printLogoHeader(IPrinter printer) {
        try {
            Bitmap logo = BitmapFactory.decodeResource(activity.getResources(), com.elsaeed.pos.R.mipmap.ic_launcher);
            if (logo != null) {
                // Scale logo to a reasonable receipt width (about 150px wide)
                int targetWidth = 150;
                int targetHeight = (int) ((float) logo.getHeight() / logo.getWidth() * targetWidth);
                Bitmap scaled = Bitmap.createScaledBitmap(logo, targetWidth, targetHeight, true);
                Bundle imgBundle = new Bundle();
                imgBundle.putInt("offset", 0);
                printer.addImage(imgBundle, bitmapToByteArray(scaled));
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not print logo: " + e.getMessage());
        }
    }

    /**
     * Print ledger/table report (customer ledger, stock report, etc.)
     * Accepts data with type: 'ledger' or 'raw_text' and text_content field
     */
    private void printLedgerReport(IPrinter printer, JSONObject data) {
        try {
            printer.setGray(10);

            String textContent = data.optString("text_content", "");
            String title = data.optString("title", "");
            String customerName = data.optString("customer_name", "");
            String companyName = data.optString("company_name", "Elnoor-النور");
            String companyPhone = data.optString("company_phone", "");
            JSONArray columns = data.optJSONArray("columns");
            JSONArray rows = data.optJSONArray("rows");

            // RTL Bundles
            Bundle centerBundle = new Bundle();
            centerBundle.putInt("align", PrintConstant.Align.CENTER);
            centerBundle.putInt("font", PrintConstant.FontSize.NORMAL);

            Bundle rightBundle = new Bundle();
            rightBundle.putInt("align", PrintConstant.Align.RIGHT);
            rightBundle.putInt("font", PrintConstant.FontSize.NORMAL);

            Bundle largeCenterBundle = new Bundle();
            largeCenterBundle.putInt("align", PrintConstant.Align.CENTER);
            largeCenterBundle.putInt("font", PrintConstant.FontSize.LARGE);

            // If text_content is provided, print it directly (raw text mode)
            if (!textContent.isEmpty()) {
                // Parse and print each line
                String[] lines = textContent.split("\n");
                for (String line : lines) {
                    if (line.contains("====") || line.contains("----")) {
                        printer.addText(centerBundle, line);
                    } else {
                        printer.addText(rightBundle, line);
                    }
                }
            } else if (columns != null && rows != null) {
                // Structured ledger print with columns and rows
                // ===== HEADER =====
                printLogoHeader(printer);
                printer.addText(largeCenterBundle, companyName);
                if (!companyPhone.isEmpty()) {
                    printer.addText(centerBundle, companyPhone);
                }
                printer.addText(centerBundle, "================================");
                if (!title.isEmpty()) {
                    printer.addText(largeCenterBundle, title);
                }
                if (!customerName.isEmpty()) {
                    printer.addText(centerBundle, customerName);
                }
                printer.addText(centerBundle, "================================");

                // Print column headers
                StringBuilder headerLine = new StringBuilder();
                for (int i = 0; i < columns.length(); i++) {
                    JSONObject col = columns.getJSONObject(i);
                    String label = col.optString("label", col.optString("fieldname", ""));
                    if (i > 0) headerLine.append(" | ");
                    headerLine.append(label);
                }
                printer.addText(centerBundle, headerLine.toString());
                printer.addText(centerBundle, "--------------------------------");

                // Print data rows
                for (int r = 0; r < rows.length(); r++) {
                    JSONObject row = rows.getJSONObject(r);
                    StringBuilder rowLine = new StringBuilder();
                    for (int c = 0; c < columns.length(); c++) {
                        JSONObject col = columns.getJSONObject(c);
                        String fieldname = col.optString("fieldname", "");
                        String fieldtype = col.optString("fieldtype", "");
                        String value = "";

                        if (row.has(fieldname)) {
                            if ("Currency".equals(fieldtype)) {
                                double num = row.optDouble(fieldname, 0);
                                value = formatCurrency(num);
                            } else {
                                value = row.optString(fieldname, "");
                            }
                        }

                        if (c > 0) rowLine.append(" | ");
                        rowLine.append(value);
                    }
                    printer.addText(rightBundle, rowLine.toString());
                }

                printer.addText(centerBundle, "================================");
            }

            // Print footer with date/time
            String dateTime = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault()).format(new java.util.Date());
            printer.addText(centerBundle, "تاريخ الطباعة: " + dateTime);
            printer.addText(centerBundle, "\n\n\n");

            // Execute print
            printer.startPrint(new OnPrintListener.Stub() {
                @Override
                public void onFinish() throws RemoteException {
                    Log.d(TAG, "Ledger print finished successfully");
                    callJSCallback("onPrintSuccess", "تم طباعة كشف الحساب بنجاح");
                }

                @Override
                public void onError(int errorCode) throws RemoteException {
                    String errorMsg = getPrintErrorMessage(errorCode);
                    Log.e(TAG, "Ledger print error: " + errorMsg);
                    callJSCallback("onPrintError", errorMsg);
                }
            });

        } catch (RemoteException e) {
            Log.e(TAG, "RemoteException during ledger printing", e);
            callJSCallback("onPrintError", "خطأ في طباعة كشف الحساب: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Error printing ledger", e);
            callJSCallback("onPrintError", "Ledger print error: " + e.getMessage());
        }
    }

    private String getPrintErrorMessage(int errorCode) {
        switch (errorCode) {
            case 1: return "Printer busy";
            case 2: return "Out of paper";
            case 3: return "Paper jam";
            case 4: return "Printer overheat";
            case 5: return "Printer voltage error";
            case 6: return "Print data error";
            default: return "Print error code: " + errorCode;
        }
    }

    /**
     * Call JavaScript callback function
     */
    private void callJSCallback(final String functionName, final String data) {
        mainHandler.post(() -> {
            String script = "if (typeof window." + functionName + " === 'function') { window." + functionName + "('" + escapeJS(data) + "'); }";
            webView.evaluateJavascript(script, null);
        });
    }

    private String escapeJS(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("'", "\\'")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r");
    }
}

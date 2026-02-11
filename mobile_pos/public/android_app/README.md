# Elnoor Mobile POS Android App

## Overview
Android WebView application for Sunyard POS terminals with integrated thermal printer support.

## Project Location
```
/workspace/frappe-bench/apps/mobile_pos/mobile_pos/public/android_app/
```

## Key Files

### Java Source Files
| File | Path | Description |
|------|------|-------------|
| MainActivity.java | `app/src/main/java/com/mobilepos/app/MainActivity.java` | Main WebView activity, handles page loading and JS injection |
| SunyardBridge.java | `app/src/main/java/com/mobilepos/app/bridge/SunyardBridge.java` | JavaScript interface for printer SDK |
| DeviceServiceManager.java | `app/src/main/java/com/mobilepos/app/service/DeviceServiceManager.java` | SDK service connection manager |
| BootReceiver.java | `app/src/main/java/com/mobilepos/app/receiver/BootReceiver.java` | Auto-start on device boot |

### Configuration Files
| File | Path | Description |
|------|------|-------------|
| build.gradle | `app/build.gradle` | Build configuration, dependencies, signing |
| AndroidManifest.xml | `app/src/main/AndroidManifest.xml` | App permissions and components |
| strings.xml | `app/src/main/res/values/strings.xml` | App name and strings |
| config.xml | `app/src/main/res/values/config.xml` | POS URL and settings |
| network_security_config.xml | `app/src/main/res/xml/network_security_config.xml` | Network security rules |

### Resources
| Folder | Description |
|--------|-------------|
| `app/src/main/res/mipmap-*` | App icons (El Saeed logo) |
| `app/src/main/res/layout/` | XML layouts |
| `app/libs/` | Sunyard SDK JAR file |

## Configuration

### Change App URL
Edit `MainActivity.java` line 36:
```java
private static final String POS_URL = "https://elnoors.com";
```

### Change App Name
Edit `app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Elnoor-النور</string>
```

### Change App Icons
Replace PNG files in:
- `app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
- `app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
- `app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

## JavaScript Bridge API

The app injects an `Android` object into the WebView. Use these functions from JavaScript:

### Check Availability
```javascript
// Check if running in Android app
window.isAndroidPOSApp()  // returns true/false

// Check if printer is available
window.isAndroidPrinterAvailable()  // returns true/false

// Check SDK connection
Android.isAvailable()  // returns true/false
Android.isPrinterAvailable()  // returns true/false
Android.getSDKVersion()  // returns SDK version string
```

### Print Functions
```javascript
// Print receipt (JSON format)
Android.printReceipt(JSON.stringify({
    invoice_name: "INV-001",
    customer_name: "Customer Name",
    company_name: "El Saeed",
    date: "2024-01-01",
    time: "12:00:00",
    items: [
        { item_name: "Item 1", qty: 2, rate: 10.00 }
    ],
    total: 20.00,
    discount: 0,
    grand_total: 20.00,
    paid_amount: 20.00,
    payment_mode: "Cash",
    is_return: false,
    customer_balance: 0,
    custom_hash: ""
}));

// Print plain text
Android.printText("Hello World", 1, 0);  // align: 0=LEFT, 1=CENTER, 2=RIGHT; font: 0=NORMAL, 1=LARGE

// Print QR Code
Android.printQRCode("https://example.com", 200);  // data, size

// Print Barcode
Android.printBarcode("1234567890", 400, 100);  // data, width, height

// Feed paper
Android.feedPaper(4);  // number of lines
```

### Callbacks
```javascript
// Define these functions to receive print status
window.onPrintSuccess = function(message) {
    console.log("Print success: " + message);
};

window.onPrintError = function(message) {
    console.log("Print error: " + message);
};
```

### Print Interception
All `window.print()` calls are automatically intercepted and redirected to the SDK printer when available.

To provide custom receipt data for printing, define:
```javascript
window.getReceiptDataForPrint = function() {
    return {
        invoice_name: "...",
        // ... receipt data
    };
};
```

## Building the APK

### Option 1: GitHub Actions (Recommended)
1. Push changes to GitHub: `git push`
2. Go to: https://github.com/ahmedemamhatem/mobile_pos/actions
3. Download APK from artifacts

### Option 2: Local Build (requires Android SDK)
```bash
cd /workspace/frappe-bench/apps/mobile_pos/mobile_pos/public/android_app
./gradlew assembleDebug
# APK location: app/build/outputs/apk/debug/
```

## Installation

1. Enable "Install from unknown sources" on Android device
2. Transfer APK to device
3. Open APK file to install
4. App will appear as "Elnoor-النور"

## Sunyard SDK

### SDK Location
```
app/libs/sunyardapi_v1.6.19_202509021514.jar
```

### Supported Features
- Thermal Printer (IPrinter)
- QR Code printing
- Barcode printing
- Image printing
- Arabic text support

### Not Implemented (removed due to SDK issues)
- Scanner (IScanner)
- Beeper (IBeeper)
- LED (ILed)

## Troubleshooting

### APK won't install
- Ensure APK is signed (debug APK is auto-signed)
- Enable "Unknown sources" in device settings
- Uninstall previous version first

### Printer not working
- Check if Sunyard SDK service is installed on device
- Verify device is a Sunyard POS terminal
- Check logcat for "SunyardBridge" errors

### Popups look wrong
- CSS fixes are injected automatically
- If issues persist, check `injectHelperScript()` in MainActivity.java

### Page not loading
- Check network connection
- Verify URL in MainActivity.java
- Check network_security_config.xml for domain rules

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial release with printer support |

## GitHub Repository
https://github.com/ahmedemamhatem/mobile_pos

## Contact
For updates or issues, modify files in:
```
/workspace/frappe-bench/apps/mobile_pos/mobile_pos/public/android_app/
```

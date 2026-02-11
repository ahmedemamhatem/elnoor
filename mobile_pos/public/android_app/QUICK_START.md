# Quick Start Guide - Mobile POS Android APK

## Step 1: Configure Server URL

Edit `app/src/main/java/com/mobilepos/app/MainActivity.java`:

```java
// Line 25 - Change this URL to your Frappe server
private static final String POS_URL = "http://YOUR-SERVER-IP/app/mini-pos";
```

For example:
- Local: `http://192.168.1.100:8000/app/mini-pos`
- Production: `https://pos.yourcompany.com/app/mini-pos`

## Step 2: Build APK

### Option A: Using Android Studio (Recommended)

1. Download and install Android Studio
2. Open the `android_app` folder as a project
3. Wait for Gradle sync to complete
4. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**
5. Click "locate" when build completes

### Option B: Command Line (Linux/Mac)

```bash
cd android_app

# Set Android SDK path
export ANDROID_HOME=/path/to/android-sdk

# Build
./build.sh debug
```

## Step 3: Install APK

### Via USB Cable

```bash
# Connect device via USB and enable USB debugging
adb install -r app/build/outputs/apk/debug/MobilePOS_v1.0.0_*.apk
```

### Via File Transfer

1. Copy APK to device (USB, email, or cloud)
2. On device, open file manager
3. Find and tap the APK file
4. Allow installation from unknown sources if prompted
5. Complete installation

## Step 4: First Run

1. Open "Mobile POS" app on the device
2. Wait for "POS Hardware Ready" message
3. Login to your Frappe account
4. Start using the POS!

## Features

| Feature | Description |
|---------|-------------|
| Print | Receipts print automatically on thermal printer |
| Scan | Tap the blue barcode button or press F1 to scan |
| Beep | Success/error audio feedback |
| Auto-Start | App launches automatically on boot |

## Troubleshooting

### "POS Hardware Disconnected"
- Ensure Sunyard SDK service is installed and running
- Restart the device

### WebView shows error
- Check network connection
- Verify server URL is correct
- For HTTP servers, ensure cleartext is allowed

### Printer not working
- Check paper roll
- Verify SDK service is connected
- Check logcat: `adb logcat -s SunyardBridge`

## Support

For issues, check the full documentation in `README.md`.

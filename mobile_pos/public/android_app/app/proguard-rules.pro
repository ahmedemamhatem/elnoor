# Add project specific ProGuard rules here.

# Keep JavaScript interface methods
-keepclassmembers class com.mobilepos.app.bridge.SunyardBridge {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Sunyard SDK classes
-keep class com.sunyard.** { *; }
-keep interface com.sunyard.** { *; }

# Keep AIDL interfaces
-keep class * extends android.os.IInterface { *; }
-keep class * extends android.os.Binder { *; }

# WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

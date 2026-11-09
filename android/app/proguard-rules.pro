# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Preserve Line Numbers and Annotations for Crash Reporting
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,EnclosingMethod,InnerClasses

# JavaScript Interfaces for WebViews
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface

# Capacitor Core & Plugin reflection rules
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}
-keepclassmembers class com.getcapacitor.Bridge { *; }
-keep public class * extends com.getcapacitor.BridgeActivity
-keep class com.vyhbz.app.** { *; }

# Google Auth & Firebase
-keep class com.codetrixstudio.capacitor.GoogleAuth.** { *; }
-keep class com.google.android.gms.auth.api.signin.** { *; }
-dontwarn com.google.android.gms.**

# Razorpay native SDK
-dontwarn com.razorpay.**
-keep class com.razorpay.** { *; }
-optimizations !method/inlining/*
-keepclasseswithmembers class * {
    public void onPayment*(...);
}

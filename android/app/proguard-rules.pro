# Proguard rules for Voltra Android App
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.voltra.commercialelectricity.** { *; }

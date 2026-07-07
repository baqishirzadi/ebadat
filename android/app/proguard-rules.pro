# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native / Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**

# Expo
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# react-native-track-player
-keep class com.doublesymmetry.trackplayer.** { *; }
-dontwarn com.doublesymmetry.trackplayer.**

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Add any project specific keep options here:

package com.afghandev.ebadat
import com.facebook.react.common.assets.ReactFontManager
import com.facebook.react.modules.i18nmanager.I18nUtil

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              add(ExactAlarmPackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    val sharedI18nUtilInstance = I18nUtil.getInstance()
    sharedI18nUtilInstance.allowRTL(this, true)
    sharedI18nUtilInstance.forceRTL(this, true)
    // @generated begin xml-fonts-init - expo prebuild (DO NOT MODIFY) sync-d1f94ccd9842f98ac34cfe7bdfd65093cbd57923
    ReactFontManager.getInstance().addCustomFont(this, "ScheherazadeNew", R.font.xml_scheherazade_new)
    ReactFontManager.getInstance().addCustomFont(this, "ScheherazadeNew-Bold", R.font.xml_scheherazade_new_bold)
    ReactFontManager.getInstance().addCustomFont(this, "QPCHafs", R.font.xml_qpc_hafs)
    ReactFontManager.getInstance().addCustomFont(this, "Amiri", R.font.xml_amiri)
    ReactFontManager.getInstance().addCustomFont(this, "Amiri-Bold", R.font.xml_amiri_bold)
    ReactFontManager.getInstance().addCustomFont(this, "Vazirmatn", R.font.xml_vazirmatn)
    ReactFontManager.getInstance().addCustomFont(this, "Vazirmatn-Bold", R.font.xml_vazirmatn_bold)
    ReactFontManager.getInstance().addCustomFont(this, "NotoNastaliqUrdu", R.font.xml_noto_nastaliq_urdu)
    // @generated end xml-fonts-init
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}

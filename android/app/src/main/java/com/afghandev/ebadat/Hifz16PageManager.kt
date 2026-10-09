package com.afghandev.ebadat

import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class Hifz16PageManager : SimpleViewManager<Hifz16PageView>() {
  override fun getName(): String = "Hifz16PageView"

  override fun createViewInstance(reactContext: ThemedReactContext): Hifz16PageView = Hifz16PageView(reactContext)

  @ReactProp(name = "pageJson") fun setPageJson(view: Hifz16PageView, value: String?) = view.setPageJson(value)
  @ReactProp(name = "paperColor") fun setPaperColor(view: Hifz16PageView, value: String?) = view.setPaperColor(value)
  @ReactProp(name = "inkColor") fun setInkColor(view: Hifz16PageView, value: String?) = view.setInkColor(value)
  @ReactProp(name = "accentColor") fun setAccentColor(view: Hifz16PageView, value: String?) = view.setAccentColor(value)
  @ReactProp(name = "contentTop") fun setContentTop(view: Hifz16PageView, value: Float) = view.setTopInset(value)
  @ReactProp(name = "contentBottom") fun setContentBottom(view: Hifz16PageView, value: Float) = view.setBottomInset(value)
  @ReactProp(name = "activeSurah") fun setActiveSurah(view: Hifz16PageView, value: Int) = view.setActiveSurah(value.takeIf { it > 0 })
  @ReactProp(name = "activeAyah") fun setActiveAyah(view: Hifz16PageView, value: Int) = view.setActiveAyah(value.takeIf { it > 0 })
  @ReactProp(name = "pageActive", defaultBoolean = false)
  fun setPageActive(view: Hifz16PageView, value: Boolean) = view.setPageActive(value)

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
    MapBuilder.builder<String, Any>()
      .put("topHifzLinePress", MapBuilder.of("registrationName", "onHifzLinePress"))
      .put("topHifzPagePress", MapBuilder.of("registrationName", "onHifzPagePress"))
      .build().toMutableMap()
}

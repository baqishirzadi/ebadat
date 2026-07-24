/**
 * Custom entry point for Expo + react-native-track-player
 * Registers the Naat playback service for lock screen / notification controls
 *
 * Android cold-start: defer TrackPlayer service registration and widget handler
 * until after the first JS frame so the native splash can hand off quickly.
 */
import '@expo/metro-runtime';

import { LogBox, Platform } from 'react-native';

const ENTRY_EPOCH_MS = Date.now();
function entryMark(label) {
  if (!__DEV__) return;
  const elapsed = Date.now() - ENTRY_EPOCH_MS;
  console.log(`[Startup][entry][${elapsed}ms] ${label}`);
}

entryMark('AppEntry begin');

if (__DEV__) {
  LogBox.ignoreLogs([
    'Expo AV has been deprecated',
    'expo-av has been deprecated',
    'obtaining a push token may not work on iOS simulators',
    'Sending `onAnimatedValueUpdate` with no listeners registered',
    '[Startup]',
    '[AdhanSchedule]',
  ]);
}

const { App } = require('expo-router/build/qualified-entry');
const { renderRootComponent } = require('expo-router/build/renderRootComponent');
entryMark('expo-router entry loaded');

renderRootComponent(App);
entryMark('renderRootComponent called');

function deferAndroidStartupSideEffects() {
  entryMark('Deferring TrackPlayer + widget registration');
  try {
    const TrackPlayer = require('react-native-track-player').default;
    const { NaatPlaybackService } = require('./services/naatPlaybackService');
    TrackPlayer.registerPlaybackService(() => NaatPlaybackService);
    entryMark('TrackPlayer service registered');
  } catch (error) {
    console.warn('[Startup] TrackPlayer register failed:', error);
  }

  if (Platform.OS === 'android') {
    try {
      require('./widgets/widgetTaskHandler');
      entryMark('Android widget task handler loaded');
    } catch (error) {
      console.warn('[Startup] widgetTaskHandler load failed:', error);
    }
  }
}

if (Platform.OS === 'android') {
  setTimeout(deferAndroidStartupSideEffects, 0);
} else {
  // iOS: keep previous eager registration for lock-screen reliability.
  try {
    const TrackPlayer = require('react-native-track-player').default;
    const { NaatPlaybackService } = require('./services/naatPlaybackService');
    TrackPlayer.registerPlaybackService(() => NaatPlaybackService);
  } catch (error) {
    console.warn('[Startup] TrackPlayer register failed:', error);
  }
}

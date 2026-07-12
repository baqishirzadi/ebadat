/**
 * Custom entry point for Expo + react-native-track-player
 * Registers the Naat playback service for lock screen / notification controls
 */
import '@expo/metro-runtime';

import { LogBox, Platform } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { NaatPlaybackService } from './services/naatPlaybackService';

if (Platform.OS === 'android') {
  require('./widgets/widgetTaskHandler');
}

if (__DEV__) {
  LogBox.ignoreLogs([
    'Expo AV has been deprecated',
    'expo-av has been deprecated',
    'obtaining a push token may not work on iOS simulators',
    'Sending `onAnimatedValueUpdate` with no listeners registered',
  ]);
}

TrackPlayer.registerPlaybackService(() => NaatPlaybackService);

const { App } = require('expo-router/build/qualified-entry');
const { renderRootComponent } = require('expo-router/build/renderRootComponent');

renderRootComponent(App);

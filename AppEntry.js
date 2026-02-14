/**
 * Custom entry point for Expo + react-native-track-player
 * Registers the Naat playback service for lock screen / notification controls
 */
import '@expo/metro-runtime';

import TrackPlayer from 'react-native-track-player';
import { NaatPlaybackService } from './services/naatPlaybackService';

TrackPlayer.registerPlaybackService(() => NaatPlaybackService);

import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

renderRootComponent(App);

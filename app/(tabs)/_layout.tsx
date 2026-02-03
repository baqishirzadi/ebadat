/**
 * Tab Navigation Layout
 * Updated with Islamic-themed icons and RTL support
 */

import { Tabs, useSegments } from 'expo-router';
import React, { useMemo } from 'react';
import { I18nManager, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { useApp } from '@/context/AppContext';

// Enable RTL for Arabic/Dari/Pashto
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function TabLayout() {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  // Determine if footer should be hidden based on current route
  const shouldHideFooter = useMemo(() => {
    const path = segments.join('/');
    // Hide footer on these routes
    return (
      path.includes('quran/') ||
      path.includes('adhkar/') ||
      path.includes('prayer-learning') ||
      path.includes('articles/') // Hide footer when reading articles
    );
  }, [segments]);

  const tabBarStyle = useMemo(() => {
    const baseStyle = {
      backgroundColor: theme.tabBar,
      borderTopColor: theme.tabBarBorder,
      paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : insets.bottom + 12,
      paddingTop: 8,
      height: Platform.OS === 'ios' ? 88 + Math.max(insets.bottom - 20, 0) : 64 + insets.bottom,
    };

    if (shouldHideFooter) {
      return { ...baseStyle, display: 'none' as const };
    }

    return baseStyle;
  }, [theme.tabBar, theme.tabBarBorder, insets.bottom, shouldHideFooter]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'قرآن',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="menu-book"
              size={focused ? 28 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          title: 'نماز',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="access-time"
              size={focused ? 28 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="adhkar"
        options={{
          title: 'اذکار',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="auto-awesome"
              size={focused ? 28 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="articles"
        options={{
          title: 'مقالات',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="article"
              size={focused ? 28 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="prayer-learning"
        options={{
          title: 'آموزش',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="school"
              size={focused ? 28 : 24}
              color={color}
            />
          ),
        }}
      />
      {/* Hide bookmarks from tabs - moved to More */}
      <Tabs.Screen name="bookmarks" options={{ href: null }} />
      <Tabs.Screen
        name="more"
        options={{
          title: 'بیشتر',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="dashboard"
              size={focused ? 28 : 24}
              color={color}
            />
          ),
        }}
      />
      {/* Hide explore and settings from tabs */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

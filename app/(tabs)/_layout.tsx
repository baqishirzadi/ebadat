/**
 * Tab Navigation Layout
 * 5-tab RTL navigation: Home · Quran · Jantari · Naat · More
 */

import { HapticTab } from '@/components/haptic-tab';
import { useApp } from '@/context/AppContext';
import { tUi } from '@/utils/i18n/ui';
import { getTextDirection } from '@/utils/i18n/languages';
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useSegments } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { theme, state } = useApp();
  const language = state.preferences.appLanguage;
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  const shouldHideFooter = useMemo(() => {
    const path = segments.join('/');
    return (
      path.includes('quran/') ||
      path.includes('adhkar/') ||
      path.includes('prayer-learning') ||
      path.includes('articles/') ||
      path.includes('dua-request/') ||
      path.includes('scholar/') ||
      path.includes('admin/') ||
      path.includes('naat/')
    );
  }, [segments]);

  const tabBarStyle = useMemo(() => {
    const baseStyle =
      Platform.OS === 'ios'
        ? {
            direction: getTextDirection(language),
            backgroundColor: theme.tabBar,
            borderTopColor: theme.tabBarBorder,
            paddingBottom: insets.bottom,
            paddingTop: 0,
            height: 49 + insets.bottom,
          }
        : {
            direction: getTextDirection(language),
            backgroundColor: theme.tabBar,
            borderTopColor: theme.tabBarBorder,
            paddingBottom: insets.bottom + 12,
            paddingTop: 8,
            height: 64 + insets.bottom,
          };

    if (shouldHideFooter) {
      return { ...baseStyle, display: 'none' as const };
    }

    return baseStyle;
  }, [theme.tabBar, theme.tabBarBorder, insets.bottom, shouldHideFooter, language]);

  const tabBarItemStyle = useMemo(
    () => (Platform.OS === 'ios' ? { paddingTop: 2, paddingBottom: 2 } : undefined),
    [],
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle,
        tabBarItemStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
        tabBarButton: HapticTab,
        freezeOnBlur: true,
        lazy: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tUi('خانه', language),
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="home" size={focused ? 28 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quran-tab"
        options={{
          title: tUi('قرآن', language),
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="menu-book" size={focused ? 28 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jantari"
        options={{
          title: tUi('جنتری', language),
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="calendar-month" size={focused ? 28 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="naat"
        options={{
          title: tUi('نعت', language),
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="play-circle-filled" size={focused ? 28 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: tUi('بیشتر', language),
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="dashboard" size={focused ? 28 : 24} color={color} />
          ),
        }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="articles" options={{ href: null }} />
      <Tabs.Screen name="adhkar" options={{ href: null }} />
      <Tabs.Screen name="prayer" options={{ href: null }} />
      <Tabs.Screen name="ahadith" options={{ href: null }} />
      <Tabs.Screen name="prayer-learning" options={{ href: null }} />
      <Tabs.Screen name="bookmarks" options={{ href: null }} />
    </Tabs>
  );
}

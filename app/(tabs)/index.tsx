/**
 * Home Dashboard — daily hub
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CitySelectorModal } from '@/components/prayer/CitySelectorModal';
import {
  AdhanStatusCard,
  ContinueReadingCard,
  HomeGreenSection,
  HomeHeader,
  PrayerTimesRow,
  QiblaCard,
  QuickActions,
  SectionHeader,
  TodayDateCard,
} from '@/components/home';
import { RtlView } from '@/components/ui/RtlView';
import { Spacing } from '@/constants/theme';
import { usePrayer } from '@/context/PrayerContext';
import { CityKey, getCity } from '@/utils/cities';

function HomeDashboardScreen() {
  const { state, setCustomLocation } = usePrayer();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const greenSectionYRef = useRef(0);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);

  const tabBarHeight =
    Platform.OS === 'ios' ? 49 + insets.bottom : 64 + insets.bottom;

  const scrollMuftiIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, greenSectionYRef.current - Spacing.md),
        animated: true,
      });
    });
  }, []);

  const handleMuftiInputFocus = useCallback(() => {
    scrollMuftiIntoView();
  }, [scrollMuftiIntoView]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const eventName = 'keyboardWillShow';
    const subscription = Keyboard.addListener(eventName, scrollMuftiIntoView);
    return () => subscription.remove();
  }, [scrollMuftiIntoView]);

  return (
    <>
      <KeyboardAvoidingView
        testID="ios-home-dashboard-ready"
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={Platform.OS === 'android'}
        >
          <RtlView>
            <HomeHeader onCityPress={() => setCityPickerVisible(true)} />
            <TodayDateCard />
            <View
              onLayout={(event) => {
                greenSectionYRef.current = event.nativeEvent.layout.y;
              }}
            >
              <HomeGreenSection
                prayerTimes={state.prayerTimes}
                onMuftiInputFocus={handleMuftiInputFocus}
              />
            </View>
            <SectionHeader title="اوقات نماز" />
            <PrayerTimesRow prayerTimes={state.prayerTimes} />
            <QiblaCard />
            <ContinueReadingCard />
            <AdhanStatusCard />
            <SectionHeader title="دسترسی سریع" />
            <QuickActions />
          </RtlView>
        </ScrollView>
      </KeyboardAvoidingView>

      <CitySelectorModal
        visible={cityPickerVisible}
        selectedCity={(state.settings.selectedCity as CityKey | null) ?? null}
        onClose={() => setCityPickerVisible(false)}
        onSelectCity={(key) => {
          setCityPickerVisible(false);
          const cityKey = key as CityKey;
          const city = getCity(cityKey);
          if (city) {
            setCustomLocation(
              {
                latitude: city.lat,
                longitude: city.lon,
                altitude: city.altitude || 0,
                timezone: city.timezone,
              },
              city.name,
              city.key,
            );
          }
        }}
        title="انتخاب شهر"
      />
    </>
  );
}

export default memo(HomeDashboardScreen);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
});

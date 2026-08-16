/**
 * Home Dashboard — daily hub
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

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
  const scrollRef = useRef<ScrollView>(null);
  const greenSectionYRef = useRef(0);
  const greenSectionHeightRef = useRef(0);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollMuftiIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      const windowHeight = Dimensions.get('window').height;
      const screenHeight = Dimensions.get('screen').height;
      // Android may resize the window or keep it full-height while the IME
      // overlays the screen. Avoid subtracting the keyboard twice.
      const windowAlreadyResized = screenHeight - windowHeight > 120;
      const visibleHeight = windowAlreadyResized
        ? windowHeight
        : Math.max(1, windowHeight - keyboardHeight);
      const sectionBottom = greenSectionYRef.current + greenSectionHeightRef.current;
      const target = sectionBottom - visibleHeight + Spacing.md;
      scrollRef.current?.scrollTo({
        y: Math.max(0, target),
        animated: true,
      });
    });
  }, [keyboardHeight]);

  const handleMuftiInputFocus = useCallback(() => {
    scrollMuftiIntoView();
  }, [scrollMuftiIntoView]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const reported = Math.round(event.endCoordinates?.height ?? 0);
      const screenHeight = Dimensions.get('screen').height;
      const screenY = event.endCoordinates?.screenY;
      const fromTop = typeof screenY === 'number'
        ? Math.max(0, Math.round(screenHeight - screenY))
        : 0;
      setKeyboardHeight(Math.max(reported, fromTop));
      setTimeout(() => scrollMuftiIntoView(), Platform.OS === 'android' ? 120 : 60);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollMuftiIntoView]);

  useEffect(() => {
    if (keyboardHeight > 0) {
      scrollMuftiIntoView();
    }
  }, [keyboardHeight, scrollMuftiIntoView]);

  const keyboardWindowResized = keyboardHeight > 0 &&
    Dimensions.get('screen').height - Dimensions.get('window').height > 120;
  const keyboardContentPadding = keyboardHeight > 0 && !keyboardWindowResized
    ? keyboardHeight + Spacing.md
    : 0;

  return (
    <>
      <View
        testID="ios-home-dashboard-ready"
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            keyboardContentPadding > 0 && { paddingBottom: keyboardContentPadding },
          ]}
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
                greenSectionHeightRef.current = event.nativeEvent.layout.height;
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
      </View>

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

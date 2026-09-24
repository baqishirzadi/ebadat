/**
 * Home Dashboard — daily hub
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  InteractionManager,
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
import { useI18n } from '@/utils/i18n/useI18n';

function HomeDashboardScreen() {
  const { state, setCustomLocation } = usePrayer();
  const { t } = useI18n();
  const scrollRef = useRef<ScrollView>(null);
  const greenSectionRef = useRef<View>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardTopRef = useRef<number | null>(null);
  const focusTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollMuftiIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      greenSectionRef.current?.measureInWindow((_x, y, _width, height) => {
        const screenHeight = Dimensions.get('screen').height;
        const windowHeight = Dimensions.get('window').height;
        const windowAlreadyResized = screenHeight - windowHeight > 120;
        const keyboardTop = keyboardTopRef.current ?? (
          keyboardHeight > 0 ? screenHeight - keyboardHeight : windowHeight
        );
        // measureInWindow is in screen coordinates, so calculate only the
        // portion covered by the IME. This avoids mixing content coordinates
        // with a resized Android window and applying the keyboard offset twice.
        const visibleBottom = windowAlreadyResized
          ? windowHeight
          : Math.max(1, keyboardTop);
        const overlap = y + height - visibleBottom + Spacing.md;
        if (overlap > 0) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollOffsetRef.current + overlap),
            animated: true,
          });
        }
      });
    });
  }, [keyboardHeight]);

  const handleMuftiInputFocus = useCallback(() => {
    scrollMuftiIntoView();
    focusTimersRef.current.forEach(clearTimeout);
    focusTimersRef.current = [120, 280, 520].map((delay) =>
      setTimeout(() => {
        InteractionManager.runAfterInteractions(scrollMuftiIntoView);
      }, delay),
    );
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
      keyboardTopRef.current = typeof screenY === 'number'
        ? screenY
        : screenHeight - Math.max(reported, fromTop);
      setTimeout(() => scrollMuftiIntoView(), Platform.OS === 'android' ? 120 : 60);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      keyboardTopRef.current = null;
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      focusTimersRef.current.forEach(clearTimeout);
      focusTimersRef.current = [];
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
          scrollEventThrottle={16}
          onScroll={(event) => {
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
          }}
          removeClippedSubviews={Platform.OS === 'android'}
        >
          <RtlView>
            <HomeHeader onCityPress={() => setCityPickerVisible(true)} />
            <TodayDateCard />
            <View
              ref={greenSectionRef}
            >
              <HomeGreenSection
                prayerTimes={state.prayerTimes}
                onMuftiInputFocus={handleMuftiInputFocus}
              />
            </View>
            <SectionHeader title={t('home.section.prayerTimes')} />
            <PrayerTimesRow prayerTimes={state.prayerTimes} />
            <QiblaCard />
            <ContinueReadingCard />
            <AdhanStatusCard />
            <SectionHeader title={t('home.section.quickAccess')} />
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

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
      const visibleHeight = Dimensions.get('window').height - keyboardHeight;
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
    if (Platform.OS !== 'ios') return;

    const showSubscription = Keyboard.addListener('keyboardWillShow', (event) => {
      setKeyboardHeight(Math.round(event.endCoordinates?.height ?? 0));
    });
    const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollMuftiIntoView]);

  useEffect(() => {
    if (Platform.OS === 'ios' && keyboardHeight > 0) {
      scrollMuftiIntoView();
    }
  }, [keyboardHeight, scrollMuftiIntoView]);

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
            keyboardHeight > 0 && { paddingBottom: keyboardHeight + Spacing.md },
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

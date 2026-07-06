/**
 * Home Dashboard — daily hub
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AdhanHealthBanner } from '@/components/prayer/AdhanHealthBanner';
import { CitySelectorModal } from '@/components/prayer/CitySelectorModal';
import {
  ContinueReadingCard,
  DateStrip,
  HomeHeader,
  NextPrayerCard,
  PrayerTimesRow,
  QiblaCard,
  QuickActions,
} from '@/components/home';
import { Spacing } from '@/constants/theme';
import { usePrayer } from '@/context/PrayerContext';
import { CityKey, getCity } from '@/utils/cities';

export default function HomeDashboardScreen() {
  const { state, setCustomLocation } = usePrayer();
  const [cityPickerVisible, setCityPickerVisible] = useState(false);

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader onCityPress={() => setCityPickerVisible(true)} />
        <DateStrip />
        <NextPrayerCard prayerTimes={state.prayerTimes} />
        <PrayerTimesRow prayerTimes={state.prayerTimes} />
        <QiblaCard />
        <ContinueReadingCard />
        <QuickActions />
        <AdhanHealthBanner />
      </ScrollView>

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

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
});

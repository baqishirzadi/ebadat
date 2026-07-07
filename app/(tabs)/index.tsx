/**
 * Home Dashboard — daily hub
 */

import React, { memo, useState } from 'react';
import { InteractionManager, Platform, ScrollView, StyleSheet } from 'react-native';

import { AdhanHealthBanner } from '@/components/prayer/AdhanHealthBanner';
import { CitySelectorModal } from '@/components/prayer/CitySelectorModal';
import {
  ContinueReadingCard,
  HomeHeader,
  NextPrayerCard,
  PrayerTimesRow,
  QiblaCard,
  QuickActions,
  TodayDateCard,
} from '@/components/home';
import { RtlView } from '@/components/ui/RtlView';
import { Spacing } from '@/constants/theme';
import { usePrayer } from '@/context/PrayerContext';
import { CityKey, getCity } from '@/utils/cities';

function HomeDashboardScreen() {
  const { state, setCustomLocation } = usePrayer();
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [showHealthBanner, setShowHealthBanner] = useState(false);

  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowHealthBanner(true);
    });
    return () => task.cancel();
  }, []);

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
      >
        <RtlView>
          <HomeHeader onCityPress={() => setCityPickerVisible(true)} />
          <TodayDateCard />
          <NextPrayerCard prayerTimes={state.prayerTimes} />
          <PrayerTimesRow prayerTimes={state.prayerTimes} />
          <QiblaCard />
          <ContinueReadingCard />
          <QuickActions />
          {showHealthBanner ? <AdhanHealthBanner /> : null}
        </RtlView>
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

export default memo(HomeDashboardScreen);

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
});

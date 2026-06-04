import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  InteractionManager,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { useStartupPhase } from '@/context/StartupPhaseContext';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { CitySelectorModal } from '@/components/prayer/CitySelectorModal';
import { CityKey, getCity } from '@/utils/cities';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';
import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';
import {
  getSavedPrayerCityKey,
  isFirstOpenAdhanSetupDone,
  markFirstOpenAdhanSetupDone,
  SELECTED_CITY_STORAGE_KEY,
} from '@/utils/prayerOnboarding';

const DEFAULT_CITY_KEY: CityKey = 'afghanistan_kabul';
const QUICK_CITY_KEYS: CityKey[] = [
  'afghanistan_kabul',
  'afghanistan_herat',
  'afghanistan_mazar',
  'afghanistan_kandahar',
];

type SetupLanguage = 'dari' | 'pashto';

const SETUP_LANGUAGE_OPTIONS: { key: SetupLanguage; label: string }[] = [
  { key: 'dari', label: 'فارسی (دری)' },
  { key: 'pashto', label: 'پښتو' },
];

const SETUP_COPY = {
  dari: {
    kicker: 'قدم اول',
    title: 'تنظیم اذان',
    subtitle: 'شهر خود را انتخاب کنید تا اوقات نماز، اذان و قبله‌نما از همان لحظه دقیق تنظیم شود.',
    quickCitiesTitle: 'شهرهای پرکاربرد افغانستان',
    quickCitiesCaption: 'اگر شهر شما در این فهرست نیست، از گزینه انتخاب شهر استفاده کنید.',
    otherMethodsTitle: 'روش‌های دیگر',
    selectCityTitle: 'انتخاب شهر',
    selectCitySubtitle: 'افغانستان، اروپا، آمریکا و شهرهای دیگر',
    detectLocationTitle: 'تشخیص موقعیت',
    detectLocationSubtitle: 'پیدا کردن نزدیک‌ترین شهر با GPS',
    accuracyTitle: 'دقت بالای اذان',
    accuracySubtitle: 'برای پخش به‌موقع اذان وقتی برنامه بسته است، دسترسی «ساعت و یادآوری» را فعال کنید.',
    accuracyButton: 'فعال‌سازی از تنظیمات',
    footerNote: 'بعداً می‌توانید شهر و تنظیمات اعلان را از صفحه نماز تغییر دهید.',
    cityPickerTitle: 'شهر اذان را انتخاب کنید',
    preparingStatus: 'در حال آماده‌سازی اذان...',
    detectingStatus: 'در حال تشخیص موقعیت...',
    loadingStatus: 'در حال آماده‌سازی...',
    errorTitle: 'خطا',
    missingCityError: 'شهر انتخاب‌شده پیدا نشد.',
    setupFailedError: 'تنظیم شهر انجام نشد. لطفاً دوباره تلاش کنید.',
    locationFailedTitle: 'موقعیت پیدا نشد',
    locationFailedFallback: 'لطفاً شهر را دستی انتخاب کنید.',
    highAccuracyTitle: 'دقت بالای اذان',
    highAccuracyBody:
      'برای اینکه اذان دقیق‌تر و حتی وقتی برنامه بسته است به موقع اجرا شود، در تنظیمات گوشی دسترسی «ساعت و یادآوری» یا Alarms & reminders را برای عبادت فعال کنید.',
    laterButton: 'بعداً',
    activateAccuracyButton: 'فعال‌سازی دقت بالا',
  },
  pashto: {
    kicker: 'لومړی ګام',
    title: 'د اذان تنظیم',
    subtitle: 'خپل ښار وټاکئ، څو د لمانځه وختونه، اذان او قبله‌نما له همدې شېبې سم تنظیم شي.',
    quickCitiesTitle: 'د افغانستان عام ښارونه',
    quickCitiesCaption: 'که ستاسو ښار په دې لست کې نه وي، د ښار انتخاب وکاروئ.',
    otherMethodsTitle: 'نورې لارې',
    selectCityTitle: 'ښار انتخاب کړئ',
    selectCitySubtitle: 'افغانستان، اروپا، امریکا او نور ښارونه',
    detectLocationTitle: 'موقعیت معلومول',
    detectLocationSubtitle: 'د GPS له لارې نږدې ښار پیدا کول',
    accuracyTitle: 'د اذان لوړه دقیقه',
    accuracySubtitle: 'د اذان د پر وخت غږېدو لپاره، د موبایل په تنظیماتو کې «Alarms & reminders» اجازه فعاله کړئ.',
    accuracyButton: 'له تنظیماتو فعالول',
    footerNote: 'وروسته کولای شئ ښار او خبرتیاوې د لمانځه له پاڼې بدل کړئ.',
    cityPickerTitle: 'د اذان ښار انتخاب کړئ',
    preparingStatus: 'اذان چمتو کېږي...',
    detectingStatus: 'موقعیت معلومېږي...',
    loadingStatus: 'چمتو کېږي...',
    errorTitle: 'تېروتنه',
    missingCityError: 'انتخاب شوی ښار ونه موندل شو.',
    setupFailedError: 'د ښار تنظیم بشپړ نه شو. مهرباني وکړئ بیا هڅه وکړئ.',
    locationFailedTitle: 'موقعیت ونه موندل شو',
    locationFailedFallback: 'مهرباني وکړئ ښار په لاس انتخاب کړئ.',
    highAccuracyTitle: 'د اذان لوړه دقیقه',
    highAccuracyBody:
      'د دې لپاره چې اذان دقیق او حتی د برنامه د بندېدو پر وخت هم په وخت اجرا شي، په تنظیماتو کې د عبادت لپاره «Alarms & reminders» اجازه فعاله کړئ.',
    laterButton: 'وروسته',
    activateAccuracyButton: 'لوړه دقیقه فعاله کړئ',
  },
} as const;

function resolveCity(cityKey: string) {
  return getCity(cityKey) ?? getCity(DEFAULT_CITY_KEY);
}

export function FirstOpenAdhanSetup() {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { isInteractiveReady } = useStartupPhase();
  const {
    state,
    setCustomLocation,
    refreshPrayerTimes,
    requestPrayerSchedule,
  } = usePrayer();
  const [visible, setVisible] = useState(false);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [shouldRedirectHome, setShouldRedirectHome] = useState(false);
  const [language, setLanguage] = useState<SetupLanguage>('dari');

  const currentSelectedCity = state.settings.selectedCity;
  const isCompactHeight = height < 740;
  const copy = SETUP_COPY[language];

  const openHighAccuracySettings = useCallback(async () => {
    if (Platform.OS !== 'android') {
      await Linking.openSettings();
      return;
    }

    try {
      const exactModule = (NativeModules as {
        ExactAlarmModule?: { openExactAlarmSettings?: () => Promise<boolean> };
      }).ExactAlarmModule;

      if (typeof exactModule?.openExactAlarmSettings === 'function') {
        const opened = await exactModule.openExactAlarmSettings();
        if (opened) return;
      }
      await Linking.openSettings();
    } catch {
      await Linking.openSettings();
    }
  }, []);

  const navigateToTabs = useCallback(() => {
    try {
      router.dismissAll();
    } catch {
      // The stack may already be at root.
    }
    router.replace('/(tabs)' as never);
  }, []);

  useEffect(() => {
    if (!shouldRedirectHome) return;

    navigateToTabs();
    const interval = setInterval(navigateToTabs, 250);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setShouldRedirectHome(false);
    }, 2200);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [navigateToTabs, shouldRedirectHome]);

  useEffect(() => {
    if (!isInteractiveReady || Platform.OS === 'web') return;

    let cancelled = false;
    const run = async () => {
      const [done, savedCity] = await Promise.all([
        isFirstOpenAdhanSetupDone(),
        getSavedPrayerCityKey(),
      ]);

      if (cancelled) return;

      if (savedCity || currentSelectedCity) {
        if (!done) {
          await markFirstOpenAdhanSetupDone();
          requestPrayerSchedule('first-open-existing-city').catch(() => {});
        }
        ensurePushRegistrationOnFirstOpen().catch(() => {});
        return;
      }

      setVisible(true);
    };

    run().catch((error) => {
      if (__DEV__) {
        console.log('[FirstOpenAdhanSetup] Startup check failed:', error);
      }
      if (!cancelled) {
        setVisible(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentSelectedCity, isInteractiveReady, requestPrayerSchedule]);

  const completeWithCity = useCallback(
    async (cityKey: CityKey) => {
      const city = resolveCity(cityKey);
      if (!city) {
        Alert.alert(copy.errorTitle, copy.missingCityError);
        return;
      }

      setIsBusy(true);
      setStatusText(copy.preparingStatus);

      try {
        await AsyncStorage.setItem(SELECTED_CITY_STORAGE_KEY, city.key);
        await setCustomLocation(
          {
            latitude: city.lat,
            longitude: city.lon,
            altitude: city.altitude || 0,
            timezone: city.timezone,
          },
          city.name,
          city.key,
        );
        await markFirstOpenAdhanSetupDone();

        setVisible(false);
        setCityPickerVisible(false);
        setShouldRedirectHome(true);
        setTimeout(() => {
          navigateToTabs();
        }, 0);
        InteractionManager.runAfterInteractions(() => {
          navigateToTabs();
        });
        refreshPrayerTimes();

        setTimeout(() => {
          requestPrayerSchedule('first-open-city-selected')
            .then(() => ensurePushRegistrationOnFirstOpen())
            .catch((error) => {
              if (__DEV__) {
                console.log('[FirstOpenAdhanSetup] Schedule after city selection failed:', error);
              }
            });
        }, 1200);

        if (Platform.OS === 'android') {
          setTimeout(() => {
            Alert.alert(
              copy.highAccuracyTitle,
              copy.highAccuracyBody,
              [
                { text: copy.laterButton },
                {
                  text: copy.activateAccuracyButton,
                  onPress: () => {
                    openHighAccuracySettings().catch(() => {});
                  },
                },
              ],
            );
          }, 550);
        }
      } catch (error) {
        if (__DEV__) {
          console.log('[FirstOpenAdhanSetup] City setup failed:', error);
        }
        Alert.alert(copy.errorTitle, copy.setupFailedError);
      } finally {
        setIsBusy(false);
        setStatusText('');
      }
    },
    [copy, navigateToTabs, openHighAccuracySettings, refreshPrayerTimes, requestPrayerSchedule, setCustomLocation],
  );

  const handleDetectLocation = useCallback(async () => {
    setIsBusy(true);
    setStatusText(copy.detectingStatus);
    try {
      const result = await detectLocationAndFindCity();
      if (result.success && result.cityKey) {
        await completeWithCity(result.cityKey as CityKey);
        return;
      }
      Alert.alert(copy.locationFailedTitle, result.error || copy.locationFailedFallback);
    } catch {
      Alert.alert(copy.locationFailedTitle, copy.locationFailedFallback);
    } finally {
      setIsBusy(false);
      setStatusText('');
    }
  }, [completeWithCity, copy]);

  const quickCities = useMemo(
    () =>
      QUICK_CITY_KEYS.map((cityKey) => {
        const city = resolveCity(cityKey);
        return city ? { cityKey, city } : null;
      }).filter((item): item is { cityKey: CityKey; city: NonNullable<ReturnType<typeof resolveCity>> } =>
        Boolean(item)
      ),
    [],
  );

  const actions = useMemo(
    () => [
      {
        testID: 'first-open-select-city',
        icon: 'travel-explore',
        title: copy.selectCityTitle,
        subtitle: copy.selectCitySubtitle,
        onPress: () => setCityPickerVisible(true),
      },
      {
        testID: 'first-open-detect-location',
        icon: 'my-location',
        title: copy.detectLocationTitle,
        subtitle: copy.detectLocationSubtitle,
        onPress: handleDetectLocation,
      },
    ],
    [copy, handleDetectLocation],
  );

  return (
    <>
      <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
        <View
          testID="first-open-adhan-setup"
          style={[styles.container, { backgroundColor: theme.background }]}
        >
          <View
            style={[
              styles.header,
              {
                backgroundColor: theme.surahHeader,
                paddingTop: insets.top + (isCompactHeight ? Spacing.md : Spacing.lg),
                paddingBottom: isCompactHeight ? Spacing.lg : Spacing.xl,
              },
            ]}
          >
            <View style={styles.headerTopRow}>
              <View style={styles.headerIcon}>
                <MaterialIcons name="notifications-active" size={30} color="#D4AF37" />
              </View>
              <View style={styles.headerTextStack}>
                <Text style={styles.kicker}>{copy.kicker}</Text>
                <Text style={styles.title}>{copy.title}</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>

            <View style={styles.languageTabs}>
              {SETUP_LANGUAGE_OPTIONS.map((option) => {
                const selected = language === option.key;
                return (
                  <Pressable
                    key={option.key}
                    testID={`first-open-lang-${option.key}`}
                    disabled={isBusy}
                    onPress={() => setLanguage(option.key)}
                    style={({ pressed }) => [
                      styles.languageTab,
                      selected && styles.languageTabSelected,
                      pressed && styles.playButtonPressed,
                    ]}
                  >
                    <Text style={[styles.languageTabText, selected && styles.languageTabTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {copy.quickCitiesTitle}
              </Text>
              <Text style={[styles.sectionCaption, { color: theme.textSecondary }]}>
                {copy.quickCitiesCaption}
              </Text>
            </View>

            <View style={styles.quickCityGrid}>
              {quickCities.map(({ cityKey, city }) => (
                <Pressable
                  key={cityKey}
                  testID={cityKey === DEFAULT_CITY_KEY ? 'first-open-use-kabul' : undefined}
                  disabled={isBusy}
                  onPress={() => completeWithCity(cityKey)}
                  style={({ pressed }) => [
                    styles.quickCityCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.cardBorder,
                      opacity: isBusy ? 0.65 : 1,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialIcons name="location-city" size={22} color={theme.tint} />
                  <Text style={[styles.quickCityText, { color: theme.text }]}>{city.name}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{copy.otherMethodsTitle}</Text>
            </View>

            {actions.map((action) => (
              <Pressable
                key={action.testID}
                testID={action.testID}
                disabled={isBusy}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.actionCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.cardBorder,
                    opacity: isBusy ? 0.65 : 1,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.actionIcon, { backgroundColor: theme.backgroundSecondary }]}>
                  <MaterialIcons name={action.icon as any} size={24} color={theme.tint} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>{action.title}</Text>
                  <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                    {action.subtitle}
                  </Text>
                </View>
                <MaterialIcons name="chevron-left" size={24} color={theme.icon} />
              </Pressable>
            ))}

            <View
              testID="first-open-high-accuracy-card"
              style={[styles.accuracyCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
            >
              <View style={styles.accuracyTopRow}>
                <View style={[styles.accuracyIcon, { backgroundColor: theme.card }]}>
                  <MaterialIcons name="alarm-on" size={24} color="#D4AF37" />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>{copy.accuracyTitle}</Text>
                  <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                    {copy.accuracySubtitle}
                  </Text>
                </View>
              </View>
              <Pressable
                testID="first-open-open-high-accuracy"
                onPress={() => openHighAccuracySettings().catch(() => {})}
                style={({ pressed }) => [
                  styles.accuracyButton,
                  { backgroundColor: theme.tint },
                  pressed && styles.playButtonPressed,
                ]}
              >
                <Text style={styles.accuracyButtonText}>{copy.accuracyButton}</Text>
              </Pressable>
            </View>

            <Text style={[styles.footerNote, { color: theme.textSecondary }]}>
              {copy.footerNote}
            </Text>

            {isBusy && (
              <View testID="first-open-setup-progress" style={styles.busyRow}>
                <ActivityIndicator size="small" color={theme.tint} />
                <Text style={[styles.busyText, { color: theme.textSecondary }]}>
                  {statusText || copy.loadingStatus}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <CitySelectorModal
        visible={cityPickerVisible}
        selectedCity={(currentSelectedCity as CityKey | null) ?? null}
        allowClose={false}
        title={copy.cityPickerTitle}
        testID="first-open-city-selector"
        onSelectCity={(cityKey) => {
          completeWithCity(cityKey).catch(() => {});
        }}
        onClose={() => setCityPickerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'stretch',
  },
  headerTopRow: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(212,175,55,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextStack: {
    alignItems: 'center',
  },
  kicker: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.heading,
    color: '#fff',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  subtitle: {
    marginTop: Spacing.md,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.84)',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  languageTabs: {
    marginTop: Spacing.md,
    minHeight: 42,
    borderRadius: BorderRadius.full,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row-reverse',
    alignSelf: 'center',
  },
  languageTab: {
    minWidth: 112,
    minHeight: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  languageTabSelected: {
    backgroundColor: '#fff',
  },
  languageTabText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  languageTabTextSelected: {
    color: '#164D3D',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 3,
  },
  sectionTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  sectionCaption: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  quickCityGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickCityCard: {
    width: '48%',
    minHeight: 74,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  quickCityText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  actionCard: {
    minHeight: 86,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    alignItems: 'center',
  },
  actionTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  actionSubtitle: {
    marginTop: 4,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 21,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  busyRow: {
    minHeight: 44,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  busyText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  accuracyCard: {
    minHeight: 124,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  accuracyTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
  },
  accuracyIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyButton: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'center',
  },
  accuracyButtonText: {
    color: '#fff',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  playButtonPressed: {
    opacity: 0.8,
  },
  footerNote: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

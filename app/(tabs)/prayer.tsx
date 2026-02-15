import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Text,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import CenteredText from '@/components/CenteredText';
import { CitySelectorModal } from '@/components/prayer';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/context/AppContext';
import { NAAT_GRADIENT , Typography, Spacing, BorderRadius } from '@/constants/theme';
import { usePrayer } from '@/context/PrayerContext';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { gregorianToAfghanSolarHijri, formatAfghanSolarHijriDateWithPersianNumerals } from '@/utils/afghanSolarHijri';
import { getCity, getImportantCities } from '@/utils/cities';
import { gregorianToHijri } from '@/utils/islamicCalendar';
import { RamadanFeatureTile } from '@/components/ramadan/RamadanFeatureTile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GOLD = '#D4AF37';
const GOLD_LIGHT = '#E8D48A';

// Afghan cities supported by PrayerContext.setCity (short keys)
const PRAYER_CONTEXT_AFGHAN_KEYS = ['kabul', 'herat', 'mazar', 'kandahar', 'jalalabad', 'kunduz', 'ghazni', 'bamiyan', 'farah', 'badakhshan'];

// Prayer name translations to Dari
const PRAYER_NAMES_DARI: Record<string, string> = {
  'فجر': 'صبح',
  'طلوع': 'آفتاب',
  'ظهر': 'پیشین',
  'عصر': 'نمازدیگر',
  'مغرب': 'شام',
  'عشاء': 'خفتن',
};

// Emojis for each prayer (common in Islamic apps: moon=dawn/night, sun=noon, sunset=maghrib)
const PRAYER_EMOJIS: Record<string, string> = {
  'فجر': '🌙',   // قمر - قبل از طلوع
  'طلوع': '🌅',  // طلوع آفتاب
  'ظهر': '☀️',   // ظهر - آفتاب وسط آسمان
  'عصر': '🌤️',   // عصر - بعدازظهر
  'مغرب': '🌇',  // غروب آفتاب
  'عشاء': '🌙',  // عشا - شب
};

// Gregorian month names in Dari (جنوری، فبروری، مارچ ...)
const GREGORIAN_MONTHS_DARI = [
  'جنوری', 'فبروری', 'مارچ', 'اپریل', 'می', 'جون',
  'جولای', 'اگست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر',
];

// Convert to Persian/Dari numerals
function toPersianNumerals(num: number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(d => persianDigits[parseInt(d)]).join('');
}

// Format Gregorian date with Dari month name (e.g. ۱۲ فبروری ۲۰۲۶)
function formatGregorianWithDariMonth(date: Date): string {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  return `${toPersianNumerals(day)} ${GREGORIAN_MONTHS_DARI[month]} ${toPersianNumerals(year)}`;
}

// Format triple date: Hijri Qamari → Hijri Shamsi → Miladi
function formatTripleDate(date: Date): string {
  // Hijri Qamari (Islamic lunar calendar)
  const hijriQamari = gregorianToHijri(date);
  const hijriQamariFormatted = `${toPersianNumerals(hijriQamari.day)} ${hijriQamari.monthNameDari} ${toPersianNumerals(hijriQamari.year)}`;
  
  // Hijri Shamsi (Afghan Solar Hijri)
  const hijriShamsi = gregorianToAfghanSolarHijri(date);
  const hijriShamsiFormatted = formatAfghanSolarHijriDateWithPersianNumerals(hijriShamsi, 'dari');
  
  // Miladi (Gregorian) - با نام ماه به دری
  const miladiFormatted = formatGregorianWithDariMonth(date);
  
  return `${hijriQamariFormatted} → ${hijriShamsiFormatted} → ${miladiFormatted}`;
}

// Golden corner decoration component
const GoldenCorner = ({ position }: { position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' }) => {
  const rotations = {
    topLeft: '0deg',
    topRight: '90deg',
    bottomRight: '180deg',
    bottomLeft: '270deg',
  };
  
  return (
    <View style={[styles.cornerContainer, styles[position]]}>
      <View style={[styles.corner, { transform: [{ rotate: rotations[position] }] }]}>
        <View style={styles.cornerOuter} />
        <View style={styles.cornerInner} />
        <View style={styles.cornerDot} />
      </View>
    </View>
  );
};

export default function NamazScreen() {
  const { theme, themeMode } = useApp();
  const router = useRouter();
  const { setCity, setCustomLocation } = usePrayer();
  const { 
    prayerTimes, 
    selectedCity, 
    changeCity,
    loading,
  } = usePrayerTimes();
  
  const [showCityModal, setShowCityModal] = useState(false);
  const [showQuickCities, setShowQuickCities] = useState(false);

  const selectedCityData = getCity(selectedCity);
  const importantCities = getImportantCities();

  // Sync city to PrayerContext so adhan notifications use the same location
  const syncCityToPrayerContext = useCallback(async (cityKey: string) => {
    if (cityKey.startsWith('afghanistan_')) {
      const shortKey = cityKey.replace('afghanistan_', '');
      if (PRAYER_CONTEXT_AFGHAN_KEYS.includes(shortKey)) {
        await setCity(shortKey);
        return;
      }
    }
    const city = getCity(cityKey);
    if (city) {
      await setCustomLocation(
        { latitude: city.lat, longitude: city.lon, altitude: city.altitude || 0, timezone: city.timezone },
        city.name
      );
    }
  }, [setCity, setCustomLocation]);

  const handleCityChange = useCallback(async (cityKey: string) => {
    await changeCity(cityKey);
    await syncCityToPrayerContext(cityKey);
  }, [changeCity, syncCityToPrayerContext]);

  // Sync city to PrayerContext when it changes (so adhan notifications match displayed times)
  // Use ref to avoid infinite loop: syncCityToPrayerContext must NOT be in deps because
  // setCity/setCustomLocation change when PrayerContext re-renders, causing syncCityToPrayerContext
  // to change, which would re-trigger this effect and loop.
  const lastSyncedCityRef = useRef<string | null>(null);
  useEffect(() => {
    if (!loading && selectedCity && selectedCity !== lastSyncedCityRef.current) {
      lastSyncedCityRef.current = selectedCity;
      syncCityToPrayerContext(selectedCity).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- syncCityToPrayerContext omitted to prevent infinite loop
  }, [loading, selectedCity]);

  if (loading || !prayerTimes) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <CenteredText style={{ color: theme.text }}>در حال محاسبه اوقات نماز...</CenteredText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Subtle background pattern */}
      <View style={styles.patternContainer}>
        {[...Array(6)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternCircle,
              {
                top: `${10 + (i * 15)}%`,
                left: i % 2 === 0 ? '-15%' : undefined,
                right: i % 2 === 1 ? '-15%' : undefined,
                opacity: 0.02,
                borderColor: theme.tint,
              },
            ]}
          />
        ))}
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - هم‌وزن با دیگر تب‌ها */}
        <LinearGradient
          colors={NAAT_GRADIENT[themeMode] || NAAT_GRADIENT.light}
          style={styles.header}
        >
          <MaterialIcons name="schedule" size={40} color="#fff" />
          <CenteredText style={styles.headerTitle}>اوقات نماز</CenteredText>
          <CenteredText style={styles.headerSubtitle}>
            {selectedCityData?.name || 'کابل'}
          </CenteredText>
        </LinearGradient>

        {/* Content with horizontal padding */}
        <View style={styles.contentWrapper}>
        <View style={[styles.cityHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cityInfo}>
            <MaterialIcons name="location-on" size={20} color={theme.tint} />
            <CenteredText style={[styles.selectedCityName, { color: theme.text }]}>
              {selectedCityData?.name || 'کابل'}
            </CenteredText>
          </View>
          <Pressable
            onPress={() => setShowCityModal(true)}
            style={({ pressed }) => [
              styles.changeCityButton,
              { backgroundColor: theme.tint },
              pressed && styles.buttonPressed,
            ]}
          >
            <CenteredText style={styles.changeCityText}>تغییر شهر</CenteredText>
          </Pressable>
        </View>

        {/* Quick City Selection (Collapsible) */}
        <Pressable
          onPress={() => setShowQuickCities(!showQuickCities)}
          style={({ pressed }) => [
            styles.quickCitiesHeader,
            { backgroundColor: theme.backgroundSecondary },
            pressed && styles.buttonPressed,
          ]}
        >
          <CenteredText style={[styles.quickCitiesTitle, { color: theme.textSecondary }]}>
            شهرهای پرکاربرد
          </CenteredText>
          <MaterialIcons
            name={showQuickCities ? 'expand-less' : 'expand-more'}
            size={24}
            color={theme.icon}
          />
        </Pressable>

        {showQuickCities && (
          <View style={[styles.quickCitiesContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.quickCitiesGrid}>
              {importantCities.slice(0, 16).map(({ key, city }) => {
                const isSelected = selectedCity === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      handleCityChange(key);
                      setShowQuickCities(false);
                    }}
                    style={({ pressed }) => [
                      styles.quickCityButton,
                      {
                        backgroundColor: isSelected ? theme.tint : theme.card,
                        borderColor: isSelected ? theme.tint : theme.cardBorder,
                      },
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <CenteredText
                      style={[
                        styles.quickCityText,
                        { color: isSelected ? '#fff' : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {city.name}
                    </CenteredText>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setShowCityModal(true)}
              style={({ pressed }) => [
                styles.moreCitiesButton,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
                pressed && styles.buttonPressed,
              ]}
            >
              <CenteredText style={[styles.moreCitiesText, { color: theme.tint }]}>
                همه شهرها...
              </CenteredText>
              <MaterialIcons name="chevron-left" size={20} color={theme.tint} />
            </Pressable>
          </View>
        )}

        {/* Prayer Times - Always Visible with Golden Frame */}
        <View style={styles.timesContainerWrapper}>
          {/* Golden glow effect */}
          <View style={[styles.timesGlow, { shadowColor: GOLD }]} />
          
          {/* Main container with golden border */}
          <View style={[styles.timesContainer, { backgroundColor: theme.card, borderColor: GOLD }]}>
            {/* Corner decorations */}
            <GoldenCorner position="topLeft" />
            <GoldenCorner position="topRight" />
            <GoldenCorner position="bottomLeft" />
            <GoldenCorner position="bottomRight" />
            
            {/* Decorative border lines */}
            <View style={[styles.frameBorderTop, { backgroundColor: `${GOLD}40` }]} />
            <View style={[styles.frameBorderBottom, { backgroundColor: `${GOLD}40` }]} />
            
            {/* Date Display with Decorative Elements */}
            <View style={styles.dateContainer}>
              <View style={styles.decorativeLine}>
                <View style={[styles.lineLeft, { backgroundColor: `${GOLD}60` }]} />
                <Text style={[styles.lineCenter, { color: GOLD }]}>۞</Text>
                <View style={[styles.lineRight, { backgroundColor: `${GOLD}60` }]} />
              </View>
              <CenteredText style={[styles.date, { color: theme.tint }]}>
                {formatTripleDate(new Date())}
              </CenteredText>
              <View style={styles.decorativeLine}>
                <View style={[styles.lineLeft, { backgroundColor: `${GOLD}60` }]} />
                <Text style={[styles.lineCenter, { color: GOLD }]}>۞</Text>
                <View style={[styles.lineRight, { backgroundColor: `${GOLD}60` }]} />
              </View>
            </View>

            {/* Prayer Times */}
            <PrayerTimeRow name="فجر" emoji={PRAYER_EMOJIS['فجر']} dariName={PRAYER_NAMES_DARI['فجر']} time={prayerTimes.fajr} theme={theme} />
            <View style={[styles.prayerDivider, { backgroundColor: `${GOLD}20` }]} />
            <PrayerTimeRow name="طلوع" emoji={PRAYER_EMOJIS['طلوع']} dariName={PRAYER_NAMES_DARI['طلوع']} time={prayerTimes.sunrise} secondary theme={theme} />
            <View style={[styles.prayerDivider, { backgroundColor: `${GOLD}20` }]} />
            <PrayerTimeRow name="ظهر" emoji={PRAYER_EMOJIS['ظهر']} dariName={PRAYER_NAMES_DARI['ظهر']} time={prayerTimes.dhuhr} theme={theme} />
            <View style={[styles.prayerDivider, { backgroundColor: `${GOLD}20` }]} />
            <PrayerTimeRow name="عصر" emoji={PRAYER_EMOJIS['عصر']} dariName={PRAYER_NAMES_DARI['عصر']} time={prayerTimes.asr} theme={theme} />
            <View style={[styles.prayerDivider, { backgroundColor: `${GOLD}20` }]} />
            <PrayerTimeRow name="مغرب" emoji={PRAYER_EMOJIS['مغرب']} dariName={PRAYER_NAMES_DARI['مغرب']} time={prayerTimes.maghrib} theme={theme} />
            <View style={[styles.prayerDivider, { backgroundColor: `${GOLD}20` }]} />
            <PrayerTimeRow name="عشاء" emoji={PRAYER_EMOJIS['عشاء']} dariName={PRAYER_NAMES_DARI['عشاء']} time={prayerTimes.isha} theme={theme} />
          </View>
        </View>

        {/* Hanafi Note */}
        <View style={[styles.note, { backgroundColor: theme.backgroundSecondary }]}>
          <CenteredText style={[styles.noteText, { color: theme.textSecondary }]}>
            نماز عصر طبق مذهب حنفی محاسبه شده است
          </CenteredText>
        </View>

        {/* Dua Request Card (same as Adhkar) */}
        <Pressable
          onPress={() => router.push('/dua-request')}
          style={({ pressed }) => [
            styles.duaCard,
            { backgroundColor: theme.tint, shadowColor: theme.tint },
            pressed && styles.duaCardPressed,
          ]}
        >
          <View style={styles.duaCardContent}>
            <View style={styles.duaIconContainer}>
              <Text style={styles.duaEmoji}>🤲</Text>
            </View>
            <View style={styles.duaCardInfo}>
              <Text style={styles.duaCardTitle}>دعای خیر و مشورت شرعی</Text>
              <Text style={styles.duaCardSubtitle}>
                درخواست دعای خیر و راهنمایی شرعی؛ با مشورت علما و روحانیون متخصص پاسخ داده می‌شود.
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-left" size={24} color="rgba(255,255,255,0.85)" />
        </Pressable>

        <RamadanFeatureTile style={styles.ramadanCard} variant="compact" />
        </View>
      </ScrollView>

      {/* City Selection Modal */}
      <CitySelectorModal
        visible={showCityModal}
        selectedCity={selectedCity}
        onSelectCity={(cityKey) => {
          handleCityChange(cityKey);
          setShowCityModal(false);
        }}
        onClose={() => setShowCityModal(false)}
      />
    </View>
  );
}

function PrayerTimeRow({
  name,
  emoji,
  dariName,
  time,
  secondary = false,
  theme,
}: {
  name: string;
  emoji?: string;
  dariName?: string;
  time: string;
  secondary?: boolean;
  theme: any;
}) {
  return (
    <View style={[styles.timeRow, secondary && styles.timeRowSecondary]}>
      <View style={styles.emojiContainer}>
        <Text style={styles.emojiText}>{emoji || ''}</Text>
      </View>
      <View style={styles.prayerNameContainer}>
        <Text style={[styles.prayerName, { color: theme.text }]} numberOfLines={1}>
          {name}
          {dariName && (
            <Text style={[styles.prayerNameDari, { color: theme.textSecondary }]}>
              {' → '}{dariName}
            </Text>
          )}
        </Text>
      </View>
      <View style={styles.timeContainer}>
        <Text style={[styles.prayerTime, { color: theme.tint }]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: Spacing.sm,
  },
  headerSubtitle: {
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
  },
  contentWrapper: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  cityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  selectedCityName: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  changeCityButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  changeCityText: {
    color: '#fff',
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  quickCitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  quickCitiesTitle: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  quickCitiesContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  quickCitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickCityButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 80,
  },
  quickCityText: {
    fontSize: Typography.ui.caption,
    fontWeight: '500',
    fontFamily: 'Vazirmatn',
  },
  moreCitiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  moreCitiesText: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  patternCircle: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: SCREEN_WIDTH * 0.3,
    borderWidth: 1,
  },
  timesContainerWrapper: {
    position: 'relative',
    marginBottom: Spacing.md,
    zIndex: 1,
  },
  timesGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: BorderRadius.lg + 8,
    backgroundColor: GOLD,
    opacity: 0.15,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  timesContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  // Corner decorations
  cornerContainer: {
    position: 'absolute',
    width: 32,
    height: 32,
    zIndex: 10,
  },
  topLeft: {
    top: -2,
    left: -2,
  },
  topRight: {
    top: -2,
    right: -2,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
  },
  corner: {
    width: 32,
    height: 32,
    position: 'relative',
  },
  cornerOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: GOLD_LIGHT,
    borderTopLeftRadius: 6,
  },
  cornerInner: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 12,
    height: 12,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: GOLD,
    borderTopLeftRadius: 3,
  },
  cornerDot: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: GOLD_LIGHT,
  },
  frameBorderTop: {
    position: 'absolute',
    top: 12,
    left: 40,
    right: 40,
    height: 1,
  },
  frameBorderBottom: {
    position: 'absolute',
    bottom: 12,
    left: 40,
    right: 40,
    height: 1,
  },
  dateContainer: {
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
    width: '100%',
  },
  lineLeft: {
    flex: 1,
    height: 1,
  },
  lineCenter: {
    fontSize: 18,
    marginHorizontal: Spacing.sm,
  },
  lineRight: {
    flex: 1,
    height: 1,
  },
  prayerDivider: {
    height: 1,
    marginVertical: 2,
    marginHorizontal: Spacing.md,
  },
  date: {
    fontSize: Typography.ui.body,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: Spacing.md,
  },
  timeRowSecondary: {
    opacity: 0.7,
  },
  timeContainer: {
    minWidth: 78,
    alignItems: 'center',
  },
  prayerNameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  prayerName: {
    fontSize: Typography.ui.body,
    fontWeight: '500',
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  prayerNameDari: {
    fontSize: Typography.ui.body,
    fontWeight: '400',
    fontFamily: 'Vazirmatn',
  },
  emojiContainer: {
    width: 28,
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 20,
  },
  prayerTime: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  note: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  noteText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  duaCard: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  duaCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  duaCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  duaIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaEmoji: {
    fontSize: 22,
  },
  duaCardInfo: {
    flex: 1,
  },
  duaCardTitle: {
    fontSize: Typography.ui.body,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'Vazirmatn',
  },
  duaCardSubtitle: {
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Vazirmatn',
  },
  ramadanCard: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
});

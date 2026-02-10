/**
 * Explore/About Screen - Converted to Dari
 * Hidden from tabs but accessible
 */

import { StyleSheet, ScrollView, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

export default function ExploreScreen() {
  const { theme } = useApp();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <MaterialIcons name="info" size={36} color="#fff" />
        <CenteredText style={styles.headerTitle}>درباره اپلیکیشن</CenteredText>
      </View>

      {/* App Info */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <CenteredText style={[styles.cardTitle, { color: theme.text }]}>عبادت</CenteredText>
        <CenteredText style={[styles.cardText, { color: theme.textSecondary }]}>
          اپلیکیشن جامع قرآن کریم و اوقات نماز برای مسلمانان افغانستان
        </CenteredText>
      </View>

      {/* Features */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>ویژگی‌ها</CenteredText>
        
        <View style={styles.featureItem}>
          <MaterialIcons name="menu-book" size={20} color={theme.tint} />
          <CenteredText style={[styles.featureText, { color: theme.textSecondary }]}>
            قرآن کریم کامل با ترجمه دری و پشتو
          </CenteredText>
        </View>

        <View style={styles.featureItem}>
          <MaterialIcons name="access-time" size={20} color={theme.tint} />
          <CenteredText style={[styles.featureText, { color: theme.textSecondary }]}>
            اوقات نماز حنفی برای شهرهای افغانستان
          </CenteredText>
        </View>

        <View style={styles.featureItem}>
          <MaterialIcons name="explore" size={20} color={theme.tint} />
          <CenteredText style={[styles.featureText, { color: theme.textSecondary }]}>
            قبله‌نما با قطب‌نمای دقیق
          </CenteredText>
        </View>

        <View style={styles.featureItem}>
          <MaterialIcons name="bookmark" size={20} color={theme.tint} />
          <CenteredText style={[styles.featureText, { color: theme.textSecondary }]}>
            ذخیره نشانه‌ها و ادامه تلاوت
          </CenteredText>
        </View>

        <View style={styles.featureItem}>
          <MaterialIcons name="cloud-off" size={20} color={theme.tint} />
          <CenteredText style={[styles.featureText, { color: theme.textSecondary }]}>
            کار می‌کند بدون اینترنت
          </CenteredText>
        </View>
      </View>

      {/* Developer */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>سازنده</CenteredText>
        <CenteredText style={[styles.developerText, { color: theme.textSecondary }]}>
          این اپلیکیشن برای تسهیل عبادات مردم شریف و مؤمن افغانستان ساخته شده است
        </CenteredText>
        <CenteredText style={[styles.developerName, { color: '#D4AF37' }]}>
          توسط: سیدعبدالباقی ابن سیدعبدالاله (عارف بالله){'\n'}
          ابن خلیفه صاحب سیدمحمد یتیم شیرزادی (رحمه‌الله)
        </CenteredText>
        <CenteredText style={[styles.duaText, { color: theme.tint }]}>
          انشاءالله قبول درگاه حق تعالی باشد
        </CenteredText>
      </View>

      {/* Version */}
      <View style={styles.versionContainer}>
        <CenteredText style={[styles.versionText, { color: theme.textSecondary }]}>
          نسخه ۱.۰.۰
        </CenteredText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.lg,
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
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
    marginBottom: Spacing.sm,
  },
  cardText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
fontFamily: 'Vazirmatn',
    marginBottom: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  featureText: {
    flex: 1,
    fontSize: Typography.ui.body,
fontFamily: 'Vazirmatn',
  },
  developerText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  developerName: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  duaText: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  versionText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
});

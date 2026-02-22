/**
 * New Dua Request Screen
 * Form to submit a new request
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useDua } from '@/context/DuaContext';
import { Typography, Spacing, BorderRadius, NAAT_GRADIENT } from '@/constants/theme';
import { CategorySelector } from '@/components/dua/CategorySelector';
import { DuaCategory, UserGender } from '@/types/dua';
import CenteredText from '@/components/CenteredText';
import NetInfo from '@react-native-community/netinfo';

export default function NewDuaRequestScreen() {
  const { theme, themeMode } = useApp();
  const { submitRequest } = useDua();
  const router = useRouter();

  const [category, setCategory] = useState<DuaCategory | null>(null);
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gender, setGender] = useState<UserGender | null>(null);

  const handleSubmit = async () => {
    // Validation
    if (!category) {
      Alert.alert('خطا', 'لطفاً دسته‌بندی را انتخاب کنید');
      return;
    }

    if (!gender) {
      Alert.alert('خطا', 'لطفاً جنسیت خود را مشخص کنید');
      return;
    }

    if (!message.trim()) {
      Alert.alert('خطا', 'لطفاً متن درخواست را وارد کنید');
      return;
    }

    if (message.trim().length < 10) {
      Alert.alert('خطا', 'متن درخواست باید حداقل ۱۰ کاراکتر باشد');
      return;
    }

    if (message.trim().length > 2000) {
      Alert.alert('خطا', 'متن درخواست نباید بیشتر از ۲۰۰۰ کاراکتر باشد');
      return;
    }

    setIsSubmitting(true);
    try {
      const request = await submitRequest(category, message.trim(), isAnonymous, gender);

      const netInfo = await NetInfo.fetch();
      const isOffline = !netInfo.isConnected || netInfo.isInternetReachable === false;
      const successMessage = isOffline
        ? 'درخواست شما ثبت شد، اما شما آفلاین هستید. پس از اتصال به اینترنت و بررسی توسط عالم، پاسخ در بخش جزئیات درخواست نمایش داده می‌شود.'
        : 'درخواست شما با موفقیت ارسال شد. پس از بررسی توسط عالم، پاسخ در بخش جزئیات همان درخواست قابل مشاهده خواهد بود.';

      Alert.alert(
        'موفق',
        successMessage,
        [
          {
            text: 'مشاهده درخواست',
            onPress: () => router.replace(`/dua-request/${request.id}`),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to submit request:', error);
      Alert.alert(
        'خطا',
        'در ارسال درخواست خطایی رخ داد. درخواست شما به صورت محلی ذخیره شده و هنگام اتصال به اینترنت ارسال خواهد شد.',
        [{ text: 'باشه' }]
      );
      // Still navigate back
      router.back();
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = message.length;
  const maxLength = 2000;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Header */}
      <LinearGradient
        colors={NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light}
        style={styles.header}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <MaterialIcons name="auto-awesome" size={20} color="#fff" />
          <CenteredText style={styles.headerTitle}>درخواست دعا</CenteredText>
          <CenteredText style={styles.headerSubtitle}>با نیت خالص، با دل آرام</CenteredText>
        </View>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Message Input */}
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>
            پیام شما
          </CenteredText>
          <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.inputPattern, { borderColor: `${theme.tint}15` }]} />
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="پیام خود را به زبان دری یا پشتو بنویسید..."
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              textAlign="right"
              maxLength={maxLength}
            />
            <View style={styles.characterCount}>
              <CenteredText style={[styles.characterCountText, { color: theme.textSecondary }]}>
                {characterCount} / {maxLength}
              </CenteredText>
            </View>
          </View>
        </View>

        {/* Category + Gender Row */}
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>
            نوع درخواست
          </CenteredText>
          <CategorySelector selectedCategory={category} onSelect={setCategory} />
        </View>

        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>
            جنسیت
          </CenteredText>
          <View style={styles.genderRow}>
            {[
              { id: 'male' as const, label: 'برادر', emoji: '👨' },
              { id: 'female' as const, label: 'خواهر', emoji: '🧕' },
            ].map((option) => {
              const selected = gender === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setGender(option.id)}
                  style={({ pressed }) => [
                    styles.genderChip,
                    {
                      backgroundColor: selected ? `${theme.tint}18` : theme.card,
                      borderColor: selected ? theme.tint : theme.cardBorder,
                    },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.genderEmoji}>{option.emoji}</Text>
                  <CenteredText
                    style={[
                      styles.genderText,
                      { color: selected ? theme.tint : theme.text },
                    ]}
                  >
                    {option.label}
                  </CenteredText>
                </Pressable>
              );
            })}
          </View>
          <CenteredText style={[styles.genderHint, { color: theme.textSecondary }]}>
            برای پاسخ بهتر، جنسیت خود را مشخص کنید.
          </CenteredText>
        </View>

        {/* Anonymity Toggle */}
        <View style={[styles.anonymityCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.anonymityContent}>
            <MaterialIcons name="visibility-off" size={20} color={theme.textSecondary} />
            <View style={styles.anonymityText}>
              <CenteredText style={[styles.anonymityTitle, { color: theme.text }]}>
                ارسال ناشناس
              </CenteredText>
              <CenteredText style={[styles.anonymityDesc, { color: theme.textSecondary }]}>
                در صورت فعال بودن، نام شما در پاسخ نمایش داده نمی‌شود
              </CenteredText>
            </View>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: theme.cardBorder, true: theme.tint }}
            thumbColor={isAnonymous ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting || !category || !message.trim() || !gender}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor:
                isSubmitting || !category || !message.trim() || !gender ? theme.cardBorder : theme.tint,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="send" size={20} color="#fff" />
              <CenteredText style={styles.submitButtonText}>ارسال درخواست</CenteredText>
            </>
          )}
        </Pressable>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  headerSubtitle: {
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Vazirmatn',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  genderEmoji: {
    fontSize: 18,
  },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  genderText: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  genderHint: {
    marginTop: Spacing.xs,
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  inputWrapper: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  inputPattern: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    left: Spacing.sm,
    bottom: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  textInput: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    minHeight: 120,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: Spacing.xs,
  },
  characterCountText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  anonymityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  anonymityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  anonymityText: {
    flex: 1,
    alignItems: 'center',
  },
  anonymityTitle: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    fontFamily: 'Vazirmatn',
  },
  anonymityDesc: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  bottomPadding: {
    height: Spacing.lg,
  },
});

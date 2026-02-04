/**
 * New Dua Request Screen
 * Form to submit a new request
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useDua } from '@/context/DuaContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { CategorySelector } from '@/components/dua/CategorySelector';
import { DuaCategory, UserGender } from '@/types/dua';
import CenteredText from '@/components/CenteredText';

export default function NewDuaRequestScreen() {
  const { theme } = useApp();
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
      
      Alert.alert(
        'موفق',
        'درخواست شما با موفقیت ارسال شد. در صورت امکان، پاسخ معنوی خودکار نیز برای شما آماده می‌شود و در جزئیات درخواست قابل مشاهده است.',
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
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <MaterialIcons name="auto-awesome" size={20} color="#fff" />
          <CenteredText style={styles.headerTitle}>درخواست دعا</CenteredText>
          <CenteredText style={styles.headerSubtitle}>با نیت خالص، با دل آرام</CenteredText>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <View style={[styles.descriptionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.descriptionIcon}>
            <MaterialIcons name="favorite" size={18} color={theme.tint} />
          </View>
          <CenteredText style={[styles.descriptionText, { color: theme.textSecondary }]}>
            درخواست‌تان با امانت و احترام خوانده می‌شود. پاسخ‌ها با رویکرد
            معنوی و دل‌آگاه، از سوی سیدعبدالباقی شیرزادی آماده می‌گردد.
          </CenteredText>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>
            دسته‌بندی
          </CenteredText>
          <CategorySelector selectedCategory={category} onSelect={setCategory} />
        </View>

        {/* Gender Selection */}
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>
            جنسیت
          </CenteredText>
          <View style={styles.genderRow}>
            {[
              { id: 'male' as const, label: 'برادر', icon: 'male' as const },
              { id: 'female' as const, label: 'خواهر', icon: 'female' as const },
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
                  <MaterialIcons
                    name={option.icon}
                    size={20}
                    color={selected ? theme.tint : theme.textSecondary}
                  />
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

        {/* Message Input */}
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>
            متن درخواست
          </CenteredText>
          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="درخواست خود را به تفصیل بنویسید..."
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
  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  descriptionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 77, 62, 0.12)',
  },
  descriptionText: {
    flex: 1,
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    marginBottom: Spacing.md,
    fontFamily: 'Vazirmatn',
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
    textAlign: 'right',
    fontFamily: 'Vazirmatn',
  },
  inputContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  textInput: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    minHeight: 150,
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
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  anonymityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  anonymityText: {
    flex: 1,
    alignItems: 'flex-end',
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
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
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
    height: Spacing.xxl,
  },
});

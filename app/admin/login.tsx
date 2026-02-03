/**
 * Admin Login Screen
 * Authentication for reviewers/admins
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { getFirebaseAuth, isFirebaseConfigured } from '@/utils/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CenteredText from '@/components/CenteredText';

const ADMIN_STORAGE_KEY = '@ebadat/admin_session';

export default function AdminLoginScreen() {
  const { theme } = useApp();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('خطا', 'لطفاً ایمیل و رمز عبور را وارد کنید');
      return;
    }

    if (!isFirebaseConfigured()) {
      Alert.alert('خطا', 'Firebase تنظیم نشده است. لطفاً تنظیمات را بررسی کنید.');
      return;
    }

    setIsLoading(true);
    try {
      const auth = getFirebaseAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      // Store admin session
      await AsyncStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        timestamp: Date.now(),
      }));

      // Navigate to admin dashboard
      router.replace('/admin/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'خطا در ورود';
      
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'ایمیل نامعتبر است';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'کاربر یافت نشد';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'رمز عبور اشتباه است';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'تلاش‌های زیاد. لطفاً بعداً تلاش کنید';
      }
      
      Alert.alert('خطا', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <CenteredText style={styles.headerTitle}>ورود مدیر</CenteredText>
        <CenteredText style={styles.headerSubtitle}>پنل مدیریت درخواست‌ها</CenteredText>
      </View>

      {/* Login Form */}
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <CenteredText style={[styles.label, { color: theme.text }]}>ایمیل</CenteredText>
          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <MaterialIcons name="email" size={20} color={theme.icon} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="ایمیل خود را وارد کنید"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="right"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <CenteredText style={[styles.label, { color: theme.text }]}>رمز عبور</CenteredText>
          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <MaterialIcons name="lock" size={20} color={theme.icon} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="رمز عبور خود را وارد کنید"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textAlign="right"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={theme.icon}
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleLogin}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.loginButton,
            {
              backgroundColor: isLoading ? theme.cardBorder : theme.tint,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="login" size={20} color="#fff" />
              <CenteredText style={styles.loginButtonText}>ورود</CenteredText>
            </>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <CenteredText style={[styles.backButtonText, { color: theme.textSecondary }]}>
            بازگشت
          </CenteredText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 80,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  headerSubtitle: {
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
    fontFamily: 'Vazirmatn',
  },
  form: {
    flex: 1,
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  backButton: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  backButtonText: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
  },
});

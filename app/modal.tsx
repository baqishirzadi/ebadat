/**
 * Modal Screen - Converted to Dari
 */

import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>اطلاعات بیشتر</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link" style={styles.linkText}>بازگشت به صفحه اصلی</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
  },
});

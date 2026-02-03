/**
 * SearchButton Component
 * Floating action button for search navigation
 */

import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { useApp } from '@/context/AppContext';
import { Spacing } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SearchButton() {
  const { theme } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  const handlePress = () => {
    // Animate press
    scale.value = withSequence(
      withSpring(0.9, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    
    router.push('/search');
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    bottom: 100 + insets.bottom,
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[
        styles.button,
        { backgroundColor: theme.tint },
        animatedStyle,
      ]}
    >
      <MaterialIcons name="search" size={28} color="#fff" />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});

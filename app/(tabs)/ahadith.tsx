import React from 'react';
import { View } from 'react-native';
import { AhadithScreen } from '@/components/ahadith/AhadithScreen';

export default function AhadithTabScreen() {
  return (
    <View testID="ios-ahadith-ready" style={{ flex: 1 }}>
      <AhadithScreen />
    </View>
  );
}

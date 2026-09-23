import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { memo, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing } from '@/constants/theme';
import {
  persianCenterSubtitleText,
  persianInputTextStyle,
  persianTextInputAlignProps,
} from '@/constants/persianTextLayout';
import { useHanafiMufti } from '@/hooks/useHanafiMufti';

interface HanafiMuftiWidgetProps {
  onInputFocus?: () => void;
}

function HanafiMuftiWidgetInner({ onInputFocus }: HanafiMuftiWidgetProps) {
  const { isStreaming, error, isConfigured, sendMessage, dismissError } = useHanafiMufti();
  const [input, setInput] = useState('');

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming || !isConfigured) return;
    setInput('');
    void sendMessage(text);
    router.push('/mufti-chat' as never);
  }, [input, isConfigured, isStreaming, sendMessage]);

  const openFullChat = useCallback(() => {
    router.push('/mufti-chat' as never);
  }, []);

  return (
    <RtlView style={styles.container}>
      <Pressable onPress={openFullChat} hitSlop={8} style={styles.titlePress}>
        <View style={styles.titleRow}>
          <RtlText align="center" wrap={false} style={styles.title}>مفتی هوشمند حنفی</RtlText>
          <MaterialIcons name="menu-book" size={18} color="rgba(255,255,255,0.9)" />
        </View>
      </Pressable>

      {error ? (
        <Pressable onPress={dismissError} style={styles.errorBox}>
          <RtlText align="center" style={styles.errorText}>{error}</RtlText>
        </Pressable>
      ) : null}

      {!isConfigured ? (
        <RtlText align="center" style={styles.configWarning}>سرویس مفتی هنوز پیکربندی نشده است.</RtlText>
      ) : null}

      <RtlView style={styles.inputRow}>
        <Pressable
          onPress={handleSend}
          disabled={!input.trim() || isStreaming || !isConfigured}
          style={[
            styles.sendButton,
            (!input.trim() || isStreaming || !isConfigured) && styles.sendButtonDisabled,
          ]}
        >
          {isStreaming ? (
            <ActivityIndicator color="#1a4d3e" size="small" />
          ) : (
            <MaterialIcons name="send" size={20} color="#1a4d3e" />
          )}
        </Pressable>
        <TextInput
          testID="home-mufti-input"
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onFocus={onInputFocus}
          placeholder="سوال فقهی خود را بنویسید..."
          placeholderTextColor="rgba(255,255,255,0.45)"
          multiline
          maxLength={4000}
          editable={!isStreaming && isConfigured}
          {...persianTextInputAlignProps}
        />
      </RtlView>
    </RtlView>
  );
}

export const HanafiMuftiWidget = memo(HanafiMuftiWidgetInner);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
  },
  titlePress: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
  },
  title: {
    ...persianCenterSubtitleText,
    fontFamily: 'Vazirmatn-Bold',
    color: '#fff',
  },
  errorBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    alignSelf: 'stretch',
  },
  errorText: {
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    color: '#ffd6d6',
    textAlign: 'center',
  },
  configWarning: {
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    alignSelf: 'stretch',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 80,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    color: '#fff',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    ...persianInputTextStyle,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});

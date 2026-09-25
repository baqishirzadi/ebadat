import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { LocalizedTextInput } from '@/components/ui/LocalizedText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useI18n } from '@/utils/i18n/useI18n';

interface HomeComposerRowProps {
  testIDPrefix: string;
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onFocus?: () => void;
  placeholder: string;
  placeholderTextColor: string;
  accessibilityLabel: string;
  sendLabel: string;
  maxLength: number;
  isStreaming: boolean;
  isConfigured: boolean;
}

/** Shared Home input geometry keeps the Mufti and Dream prompts aligned. */
export function HomeComposerRow({
  testIDPrefix,
  value,
  onChangeText,
  onSend,
  onFocus,
  placeholder,
  placeholderTextColor,
  accessibilityLabel,
  sendLabel,
  maxLength,
  isStreaming,
  isConfigured,
}: HomeComposerRowProps) {
  const { isPashto, fontFamily, language } = useI18n();
  const isEnglish = language === 'english';
  const disabled = !value.trim() || isStreaming || !isConfigured;
  const pashtoInputStyle = isPashto
    ? fontFamily === 'NotoNastaliqUrdu'
      ? styles.pashtoNastaliqInput
      : styles.pashtoInput
    : null;

  const sendButton = (
    <Pressable
      onPress={onSend}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={sendLabel}
      testID={`${testIDPrefix}-send`}
      style={[styles.sendButton, isPashto && styles.sendButtonPashto, disabled && styles.sendButtonDisabled]}
    >
      {isStreaming ? (
        <ActivityIndicator color="#1a4d3e" size="small" />
      ) : (
        <MaterialIcons name="send" size={20} color="#1a4d3e" />
      )}
    </Pressable>
  );

  const input = (
    <LocalizedTextInput
      testID={`${testIDPrefix}-input`}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.input,
        pashtoInputStyle,
        isEnglish && styles.inputEnglish,
      ]}
      value={value}
      onChangeText={onChangeText}
      onFocus={onFocus}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      multiline
      maxLength={maxLength}
      editable={!isStreaming && isConfigured}
      underlineColorAndroid="transparent"
      textAlign={isEnglish ? 'left' : 'right'}
      textAlignVertical="center"
    />
  );

  return (
    <RtlView style={styles.row}>
      {isEnglish ? (
        <>
          {input}
          {sendButton}
        </>
      ) : (
        <>
          {sendButton}
          {input}
        </>
      )}
    </RtlView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'stretch',
  },
  input: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    minHeight: 44,
    maxHeight: 84,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    color: '#fff',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    textAlign: 'right',
    lineHeight: 21,
  },
  inputEnglish: {
    fontFamily: undefined,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  pashtoInput: {
    fontSize: 15,
    lineHeight: 20,
    minHeight: 40,
    paddingVertical: 6,
    includeFontPadding: false,
  },
  pashtoNastaliqInput: {
    fontSize: 14,
    lineHeight: 28,
    minHeight: 40,
    paddingVertical: 2,
    includeFontPadding: true,
  },
  sendButton: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonPashto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});

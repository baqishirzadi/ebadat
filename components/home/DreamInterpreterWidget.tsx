import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { memo, useCallback, useMemo, useState } from 'react';

import { Pressable, StyleSheet, View } from 'react-native';

import { HomeComposerRow } from '@/components/home/HomeComposerRow';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { DREAM_COPY, DREAM_INPUT_MAX_LENGTH } from '@/constants/dreamInterpreterCopy';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import {
  persianCenterSubtitleText,
} from '@/constants/persianTextLayout';
import { useApp } from '@/context/AppContext';
import { useDreamInterpreter } from '@/hooks/useDreamInterpreter';
import { useI18n } from '@/utils/i18n/useI18n';

interface DreamInterpreterWidgetProps {
  onInputFocus?: () => void;
}

function DreamInterpreterWidgetInner({ onInputFocus }: DreamInterpreterWidgetProps) {
  const { state } = useApp();
  const { isStreaming, error, isConfigured, sendMessage, dismissError } = useDreamInterpreter();
  const { t, fontFamily, isPashto } = useI18n();
  const isNastaliq = fontFamily === 'NotoNastaliqUrdu';
  const [input, setInput] = useState('');
  const copy = useMemo(
    () => DREAM_COPY[state.preferences.appLanguage] ?? DREAM_COPY.dari,
    [state.preferences.appLanguage],
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming || !isConfigured) return;
    setInput('');
    void sendMessage(text);
    router.push('/dream-chat' as never);
  }, [input, isConfigured, isStreaming, sendMessage]);

  const openFullChat = useCallback(() => {
    router.push('/dream-chat' as never);
  }, []);

  return (
    <RtlView style={[styles.container, isPashto && styles.containerPashto]}>
      <View style={styles.titlePress}>
        <View style={styles.titleRow}>
          <RtlText
            align="center"
            wrap={false}
            numberOfLines={1}
            style={[styles.title, {
              fontFamily,
              fontSize: Typography.ui.subtitle,
              lineHeight: isPashto ? (isNastaliq ? 34 : 22) : undefined,
              includeFontPadding: isPashto && isNastaliq,
            }]}
          >
            {copy.title}
          </RtlText>
          <MaterialIcons name="nights-stay" size={18} color="rgba(255,255,255,0.9)" />
        </View>
        <Pressable
          onPress={openFullChat}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('home.viewConversation')}
          testID="home-dream-view-conversation"
          style={[styles.viewConversationButton, isPashto && styles.viewConversationButtonPashto]}
        >
          <RtlText
            align="center"
            wrap={false}
            style={[
              styles.viewConversationText,
              isPashto && styles.viewConversationTextPashto,
              {
                fontFamily,
                lineHeight: isPashto ? (isNastaliq ? 28 : 26) : 17,
                includeFontPadding: isPashto,
                paddingTop: isPashto ? 2 : undefined,
              },
            ]}
          >
            {t('home.viewConversation')}
          </RtlText>
        </Pressable>
      </View>

      {error ? (
        <Pressable onPress={dismissError} style={styles.errorBox}>
          <RtlText align="center" style={[styles.errorText, isPashto && { fontSize: 12, lineHeight: isNastaliq ? 26 : 18, includeFontPadding: isNastaliq }]}>{error}</RtlText>
        </Pressable>
      ) : null}

      {!isConfigured ? (
        <RtlText align="center" style={[styles.configWarning, isPashto && { fontSize: 12, lineHeight: isNastaliq ? 26 : 18, includeFontPadding: isNastaliq }]}>{copy.notConfigured}</RtlText>
      ) : null}

      <HomeComposerRow
        testIDPrefix="home-dream"
        value={input}
        onChangeText={setInput}
        onSend={handleSend}
        onFocus={onInputFocus}
        placeholder={copy.placeholder}
        placeholderTextColor={isPashto ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.45)'}
        accessibilityLabel={copy.placeholder}
        sendLabel={t('common.send')}
        maxLength={DREAM_INPUT_MAX_LENGTH}
        isStreaming={isStreaming}
        isConfigured={isConfigured}
      />
    </RtlView>
  );
}

export const DreamInterpreterWidget = memo(DreamInterpreterWidgetInner);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
  },
  containerPashto: {
    paddingTop: 0,
    paddingBottom: 8,
    gap: 4,
  },
  titlePress: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 0,
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
  viewConversationButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  viewConversationButtonPashto: {
    minHeight: 28,
    paddingVertical: 0,
  },
  viewConversationText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    textDecorationLine: 'underline',
  },
  viewConversationTextPashto: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textDecorationLine: 'underline',
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
});

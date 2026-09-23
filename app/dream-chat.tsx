/**
 * Full Islamic Dream Interpreter chat screen
 */

import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { MarkdownText, normalizeMarkdownForClipboard } from '@/components/MarkdownText';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { DREAM_COPY, DREAM_INPUT_MAX_LENGTH } from '@/constants/dreamInterpreterCopy';
import { BorderRadius, RTL_CONTAINER, Spacing, ThemeColors, Typography } from '@/constants/theme';
import {
  persianCaptionText,
  persianTextInputAlignProps,
} from '@/constants/persianTextLayout';
import { useApp } from '@/context/AppContext';
import { useDreamInterpreter } from '@/hooks/useDreamInterpreter';
import { stripDreamMarkdown } from '@/utils/dreamInterpreter';
import type { StoredDreamInterpreterMessage } from '@/utils/dreamInterpreterStorage';

const RLM = '\u200F';

type ChatRow =
  | { type: 'message'; message: StoredDreamInterpreterMessage; key: string }
  | { type: 'streaming'; content: string; key: string };

function formatAssistantBubbleText(text: string): string {
  const plain = stripDreamMarkdown(text);
  if (!plain) return plain;
  return Platform.OS === 'android' ? `${RLM}${plain}` : plain;
}

interface ChatBubbleProps {
  isUser: boolean;
  text: string;
  theme: ThemeColors;
}

function ChatBubble({ isUser, text, theme }: ChatBubbleProps) {
  const displayText = isUser ? text : formatAssistantBubbleText(text);
  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(normalizeMarkdownForClipboard(stripDreamMarkdown(text)));
      if (Platform.OS === 'android') {
        ToastAndroid.show('کپی شد', ToastAndroid.SHORT);
      } else {
        void AccessibilityInfo.announceForAccessibility('متن پاسخ کپی شد');
      }
    } catch {
      Alert.alert('خطا', 'کپی پاسخ انجام نشد.');
    }
  }, [text]);

  return (
    <RtlView style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
      <View
        style={[
          styles.bubble,
          styles.bubbleLtrIsolate,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.tint }]
            : [styles.assistantBubble, { backgroundColor: theme.card, borderColor: theme.cardBorder }],
        ]}
      >
      <MarkdownText
        style={[
          styles.bubbleText,
          { color: isUser ? '#fff' : theme.text },
          Platform.OS === 'android' ? { includeFontPadding: false } : null,
        ]}
        boldStyle={{ color: isUser ? '#fff' : theme.text }}
        headingStyle={{ color: isUser ? '#fff' : theme.text }}
        onLongPress={!isUser ? () => void handleCopy() : undefined}
        testID={!isUser ? 'dream-assistant-message' : undefined}
      >{displayText}</MarkdownText>
      </View>
    </RtlView>
  );
}

interface StarterChipsProps {
  theme: ThemeColors;
  disabled: boolean;
  copy: (typeof DREAM_COPY)[keyof typeof DREAM_COPY];
  onSelect: (question: string) => void;
}

function StarterChips({ theme, disabled, copy, onSelect }: StarterChipsProps) {
  return (
    <RtlView style={styles.emptyWrap}>
      <RtlText align="center" style={[styles.welcome, { color: theme.text }]}>
        {copy.welcome}
      </RtlText>
      <RtlText align="center" style={[styles.chipsLabel, { color: theme.textSecondary }]}>
        {copy.chipsLabel}
      </RtlText>
      <RtlView style={styles.chipsWrap}>
        {copy.chips.map((question) => (
          <Pressable
            key={question}
            disabled={disabled}
            onPress={() => onSelect(question)}
            style={[
              styles.chip,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
          >
            <RtlText align="center" style={[styles.chipText, { color: theme.text }]}>
              {question}
            </RtlText>
          </Pressable>
        ))}
      </RtlView>
      <RtlText align="center" style={[styles.emptyDisclaimer, { color: theme.textSecondary }]}>
        {copy.note}
      </RtlText>
    </RtlView>
  );
}

export default function DreamChatScreen() {
  const { theme, state } = useApp();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatRow>>(null);
  const [input, setInput] = useState('');
  const copy = state.preferences.appLanguage === 'pashto' ? DREAM_COPY.pashto : DREAM_COPY.dari;

  const {
    messages,
    isStreaming,
    isLoading,
    error,
    streamingContent,
    isConfigured,
    sendMessage,
    retryLast,
    clearConversation,
    setLang,
    dismissError,
  } = useDreamInterpreter();

  useEffect(() => {
    setLang(state.preferences.appLanguage === 'pashto' ? 'ps' : 'fa');
  }, [setLang, state.preferences.appLanguage]);

  const rows = useMemo<ChatRow[]>(() => {
    const items: ChatRow[] = messages.map((message) => ({
      type: 'message',
      message,
      key: `msg-${message.createdAt}-${message.role}`,
    }));

    if (isStreaming && streamingContent) {
      items.push({
        type: 'streaming',
        content: streamingContent,
        key: 'streaming',
      });
    }

    return items;
  }, [messages, isStreaming, streamingContent]);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRafRef = useRef<number | null>(null);

  const scrollToBottom = useCallback((animated = Platform.OS !== 'android') => {
    if (scrollRafRef.current != null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (rows.length === 0) return;
    const delay = Platform.OS === 'android' ? (isStreaming ? 120 : 80) : 80;
    const timer = setTimeout(() => scrollToBottom(), delay);
    return () => clearTimeout(timer);
  }, [rows.length, streamingContent, isStreaming, scrollToBottom]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (event) => {
      if (Platform.OS === 'android') {
        const windowH = Dimensions.get('window').height;
        const screenY = event.endCoordinates?.screenY;
        const fromTop = typeof screenY === 'number' ? Math.max(0, Math.round(windowH - screenY)) : 0;
        const reported = Math.round(event.endCoordinates?.height ?? 0);
        setKeyboardHeight(Math.max(fromTop, reported));
      } else {
        setKeyboardHeight(Math.round(event.endCoordinates?.height ?? 0));
      }
      setTimeout(() => scrollToBottom(false), Platform.OS === 'android' ? 100 : 50);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [scrollToBottom]);

  const composerBottomPad =
    keyboardHeight > 0 ? Spacing.sm : Math.max(insets.bottom, Spacing.sm);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await sendMessage(text);
  }, [input, isStreaming, sendMessage]);

  const handleStarterSelect = useCallback(
    (question: string) => {
      if (isStreaming || !isConfigured) return;
      void sendMessage(question);
    },
    [isConfigured, isStreaming, sendMessage],
  );

  const handleClear = useCallback(() => {
    if (messages.length === 0) return;

    Alert.alert(copy.newChat, 'آیا مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      {
        text: copy.newChat,
        style: 'destructive',
        onPress: () => {
          void clearConversation();
        },
      },
    ]);
  }, [clearConversation, copy.newChat, messages.length]);

  const handleErrorPress = useCallback(() => {
    const last = messages[messages.length - 1];
    if (last?.role === 'user') {
      void retryLast();
      return;
    }
    dismissError();
  }, [dismissError, messages, retryLast]);

  const renderItem = useCallback(
    ({ item }: { item: ChatRow }) => {
      if (item.type === 'streaming') {
        return (
          <RtlView style={[styles.messageRow, styles.assistantRow]}>
            <View
              style={[
                styles.bubble,
                styles.bubbleLtrIsolate,
                styles.assistantBubble,
                { backgroundColor: `${theme.tint}18`, borderColor: theme.cardBorder },
              ]}
            >
              <MarkdownText
                style={[
                  styles.bubbleText,
                  { color: theme.text },
                  Platform.OS === 'android' ? { includeFontPadding: false } : null,
                ]}
                boldStyle={{ color: theme.text }}
                headingStyle={{ color: theme.text }}
              >{formatAssistantBubbleText(item.content)}</MarkdownText>
            </View>
          </RtlView>
        );
      }

      return (
        <ChatBubble
          isUser={item.message.role === 'user'}
          text={item.message.content}
          theme={theme}
        />
      );
    },
    [theme],
  );

  const chatBody = (
    <>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : (
        <RtlView style={styles.flex}>
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={Platform.OS === 'ios' ? () => scrollToBottom() : undefined}
            contentContainerStyle={[
              styles.listContent,
              rows.length === 0 && styles.listEmpty,
            ]}
            ListEmptyComponent={
              <StarterChips
                theme={theme}
                disabled={isStreaming || !isConfigured}
                copy={copy}
                onSelect={handleStarterSelect}
              />
            }
            ListFooterComponent={
              isStreaming && !streamingContent ? (
                <RtlText align="right" style={[styles.typing, { color: theme.textSecondary }]}>
                  در حال نوشتن...
                </RtlText>
              ) : null
            }
          />
        </RtlView>
      )}

      {error ? (
        <Pressable onPress={handleErrorPress} style={[styles.errorBar, { backgroundColor: `${theme.warning}22` }]}>
          <RtlText align="right" style={[styles.errorText, { color: theme.warning }]}>{error}</RtlText>
          <RtlText align="right" style={[styles.retryText, { color: theme.tint }]}>{copy.retry}</RtlText>
        </Pressable>
      ) : null}

      <RtlText align="center" style={[styles.footerDisclaimer, { color: theme.textSecondary }]}>
        {copy.disclaimer}
      </RtlText>

      <RtlView
        style={[
          styles.composer,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.divider,
            paddingBottom: composerBottomPad,
          },
        ]}
      >
        <Pressable
          onPress={() => void handleSend()}
          disabled={!input.trim() || isStreaming || !isConfigured}
          style={[
            styles.sendButton,
            { backgroundColor: theme.tint },
            (!input.trim() || isStreaming || !isConfigured) && styles.sendButtonDisabled,
          ]}
        >
          {isStreaming ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <MaterialIcons name="send" size={22} color="#fff" />
          )}
        </Pressable>
        <TextInput
          testID="dream-chat-input"
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.cardBorder,
              backgroundColor: theme.card,
              opacity: 1,
            },
          ]}
          value={input}
          onChangeText={setInput}
          onFocus={() => scrollToBottom(false)}
          placeholder={copy.placeholder}
          placeholderTextColor={theme.textSecondary}
          multiline
          maxLength={DREAM_INPUT_MAX_LENGTH}
          editable={!isStreaming && isConfigured}
          underlineColorAndroid="transparent"
          selectionColor={theme.tint}
          cursorColor={theme.tint}
          {...persianTextInputAlignProps}
          {...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : null)}
        />
      </RtlView>
    </>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <RtlView style={[styles.screen, RTL_CONTAINER, { backgroundColor: theme.background }]}>
        <ScreenHeader
          title={copy.title}
          subtitle={copy.subtitle}
          rightAction={
            messages.length > 0 ? (
              <Pressable onPress={handleClear} hitSlop={10} accessibilityLabel={copy.newChat}>
                <MaterialIcons name="delete-outline" size={22} color="#fff" />
              </Pressable>
            ) : null
          }
        />

        <View style={[styles.flex, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
          {chatBody}
        </View>
      </RtlView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  emptyWrap: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  welcome: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 24,
  },
  chipsLabel: {
    ...persianCaptionText,
    lineHeight: 20,
  },
  chipsWrap: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: '92%',
  },
  chipText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 24,
  },
  emptyDisclaimer: {
    ...persianCaptionText,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  userRow: {
    justifyContent: 'flex-start',
  },
  assistantRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: '85%',
    minWidth: 48,
    borderWidth: 1,
    borderColor: 'transparent',
    flexShrink: 1,
    alignSelf: 'flex-start',
  },
  bubbleLtrIsolate: {
    direction: 'ltr',
  },
  userBubble: {},
  assistantBubble: {},
  bubbleText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 24,
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  typing: {
    ...persianCaptionText,
    paddingHorizontal: Spacing.md,
    fontStyle: 'italic',
  },
  errorBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  errorText: {
    ...persianCaptionText,
  },
  retryText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
  },
  footerDisclaimer: {
    ...persianCaptionText,
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    textAlign: 'right',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});

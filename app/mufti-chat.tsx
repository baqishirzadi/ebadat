/**
 * Full Hanafi Mufti chat screen
 */

import { MaterialIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { HANAFI_MUFTI_STARTER_QUESTIONS_DARI } from '@/constants/hanafiMuftiStarterQuestions';
import { BorderRadius, RTL_CONTAINER, Spacing, ThemeColors, Typography } from '@/constants/theme';
import {
  persianCaptionText,
  persianInputTextStyle,
  persianTextInputAlignProps,
} from '@/constants/persianTextLayout';
import { useApp } from '@/context/AppContext';
import { useHanafiMufti } from '@/hooks/useHanafiMufti';
import { detectLanguage } from '@/utils/duaAdvisor';
import { formatChatPlainText } from '@/utils/formatChatPlainText';
import type { StoredHanafiMuftiMessage } from '@/utils/hanafiMuftiStorage';

/** Android can flip Persian paragraphs LTR; RLM forces RTL direction. */
const RLM = '\u200F';

type ChatRow =
  | { type: 'message'; message: StoredHanafiMuftiMessage; key: string }
  | { type: 'streaming'; content: string; key: string };

function getClearLabel(sampleText: string): string {
  return detectLanguage(sampleText) === 'pashto' ? 'د خبرو پاکول' : 'پاک کردن گفتگو';
}

function formatAssistantBubbleText(text: string): string {
  const plain = formatChatPlainText(text);
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

  return (
    <RtlView style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
      {/*
        Isolate bubble text from app-wide forceRTL mirroring. Nested direction:'rtl'
        + textAlign:'right' was resolving to the visual LEFT on Android OEMs, so
        Persian lines stuck to the left edge of the bubble.
      */}
      <View
        style={[
          styles.bubble,
          styles.bubbleLtrIsolate,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.tint }]
            : [styles.assistantBubble, { backgroundColor: theme.card, borderColor: theme.cardBorder }],
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { color: isUser ? '#fff' : theme.text },
            Platform.OS === 'android' ? { includeFontPadding: false } : null,
          ]}
        >
          {displayText}
        </Text>
      </View>
    </RtlView>
  );
}

interface StarterChipsProps {
  theme: ThemeColors;
  disabled: boolean;
  onSelect: (question: string) => void;
}

function StarterChips({ theme, disabled, onSelect }: StarterChipsProps) {
  return (
    <RtlView style={styles.emptyWrap}>
      <RtlView style={styles.chipsWrap}>
        {HANAFI_MUFTI_STARTER_QUESTIONS_DARI.map((question) => (
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
        سوال فقهی حنفی خود را بپرسید. احکام نهایی نیازمند مشورت با عالم مجرب است.
      </RtlText>
    </RtlView>
  );
}

export default function MuftiChatScreen() {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatRow>>(null);
  const [input, setInput] = useState('');

  const {
    messages,
    isStreaming,
    isLoading,
    error,
    streamingContent,
    isConfigured,
    sendMessage,
    clearConversation,
    dismissError,
  } = useHanafiMufti();

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

  const clearLabel = useMemo(
    () => getClearLabel(input || messages[messages.length - 1]?.content || ''),
    [input, messages],
  );

  const [keyboardVisible, setKeyboardVisible] = useState(false);
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

  // Scroll on new messages / stream chunks. Debounce on Android to avoid composer jump
  // when FlatList layout + adjustResize fight each other on low-end OEMs (MIUI/Poco).
  useEffect(() => {
    if (rows.length === 0) return;
    const delay = Platform.OS === 'android' ? (isStreaming ? 120 : 80) : 80;
    const timer = setTimeout(() => scrollToBottom(), delay);
    return () => clearTimeout(timer);
  }, [rows.length, streamingContent, isStreaming, scrollToBottom]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      setTimeout(() => scrollToBottom(false), Platform.OS === 'android' ? 100 : 50);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [scrollToBottom]);

  const headerOffset = insets.top + 56;
  const composerBottomPad = keyboardVisible
    ? Spacing.sm
    : Math.max(insets.bottom, Spacing.sm);

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

    Alert.alert(clearLabel, 'آیا مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      {
        text: clearLabel,
        style: 'destructive',
        onPress: () => {
          void clearConversation();
        },
      },
    ]);
  }, [clearConversation, clearLabel, messages.length]);

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
              <Text
                style={[
                  styles.bubbleText,
                  { color: theme.text },
                  Platform.OS === 'android' ? { includeFontPadding: false } : null,
                ]}
              >
                {formatAssistantBubbleText(item.content)}
              </Text>
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
            // Avoid onContentSizeChange scroll on Android — pairs with streaming
            // updates and adjustResize to make the composer jump on low-end OEMs.
            onContentSizeChange={Platform.OS === 'ios' ? () => scrollToBottom() : undefined}
            contentContainerStyle={[
              styles.listContent,
              rows.length === 0 && styles.listEmpty,
            ]}
            ListEmptyComponent={
              <StarterChips
                theme={theme}
                disabled={isStreaming || !isConfigured}
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
        <Pressable onPress={dismissError} style={[styles.errorBar, { backgroundColor: `${theme.warning}22` }]}>
          <RtlText align="right" style={[styles.errorText, { color: theme.warning }]}>{error}</RtlText>
        </Pressable>
      ) : null}

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
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.cardBorder,
              backgroundColor: theme.background,
            },
          ]}
          value={input}
          onChangeText={setInput}
          onFocus={() => scrollToBottom(false)}
          placeholder="سوال فقهی خود را بنویسید..."
          placeholderTextColor={theme.textSecondary}
          multiline
          maxLength={4000}
          editable={!isStreaming && isConfigured}
          {...persianTextInputAlignProps}
        />
      </RtlView>
    </>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <RtlView style={[styles.screen, RTL_CONTAINER, { backgroundColor: theme.background }]}>
        <ScreenHeader
          title="مفتی هوشمند حنفی"
          subtitle="فقه حنفی — پاسخ راهنما"
          rightAction={
            messages.length > 0 ? (
              <Pressable onPress={handleClear} hitSlop={10}>
                <MaterialIcons name="delete-outline" size={22} color="#fff" />
              </Pressable>
            ) : null
          }
        />

        {/*
          Android already uses windowSoftInputMode=adjustResize. Wrapping with
          KeyboardAvoidingView behavior=height double-shifts the layout and makes
          the composer jump on low-end / MIUI devices (Poco, Redmi). iOS still needs KAV.
        */}
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior="padding"
            keyboardVerticalOffset={headerOffset}
          >
            {chatBody}
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.flex}>{chatBody}</View>
        )}
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
  /** Break out of forceRTL so textAlign:'right' is the physical right edge. */
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
  },
  errorText: {
    ...persianCaptionText,
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
    ...persianInputTextStyle,
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

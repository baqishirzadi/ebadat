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
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, RTL_CONTAINER, Spacing, ThemeColors } from '@/constants/theme';
import {
  persianBodyText,
  persianCaptionText,
  persianInputTextStyle,
  persianTextInputAlignProps,
} from '@/constants/persianTextLayout';
import { useApp } from '@/context/AppContext';
import { useHanafiMufti } from '@/hooks/useHanafiMufti';
import { detectLanguage } from '@/utils/duaAdvisor';
import { formatChatPlainText } from '@/utils/formatChatPlainText';
import type { StoredHanafiMuftiMessage } from '@/utils/hanafiMuftiStorage';

type ChatRow =
  | { type: 'message'; message: StoredHanafiMuftiMessage; key: string }
  | { type: 'streaming'; content: string; key: string };

function getClearLabel(sampleText: string): string {
  return detectLanguage(sampleText) === 'pashto' ? 'د خبرو پاکول' : 'پاک کردن گفتگو';
}

interface ChatBubbleProps {
  isUser: boolean;
  text: string;
  theme: ThemeColors;
}

function ChatBubble({ isUser, text, theme }: ChatBubbleProps) {
  const displayText = isUser ? text : formatChatPlainText(text);

  return (
    <RtlView style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
      <RtlView
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.tint }]
            : [styles.assistantBubble, { backgroundColor: theme.card, borderColor: theme.cardBorder }],
        ]}
      >
        <RtlText align="right" style={[styles.bubbleText, { color: isUser ? '#fff' : theme.text }]}>
          {displayText}
        </RtlText>
      </RtlView>
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

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    if (rows.length === 0) return;
    const timer = setTimeout(scrollToBottom, 80);
    return () => clearTimeout(timer);
  }, [rows.length, streamingContent, scrollToBottom]);

  useEffect(() => {
    const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const subscription = Keyboard.addListener(eventName, () => {
      setTimeout(scrollToBottom, 50);
    });
    return () => subscription.remove();
  }, [scrollToBottom]);

  const headerOffset = insets.top + 100;

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await sendMessage(text);
  }, [input, isStreaming, sendMessage]);

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
            <RtlView style={[styles.bubble, styles.assistantBubble, { backgroundColor: `${theme.tint}18`, borderColor: theme.cardBorder }]}>
              <RtlText align="right" style={[styles.bubbleText, { color: theme.text }]}>
                {formatChatPlainText(item.content)}
              </RtlText>
            </RtlView>
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

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? headerOffset : 0}
        >
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
                automaticallyAdjustKeyboardInsets
                onContentSizeChange={scrollToBottom}
                contentContainerStyle={[
                  styles.listContent,
                  rows.length === 0 && styles.listEmpty,
                ]}
                ListEmptyComponent={
                  <RtlView style={styles.emptyWrap}>
                    <RtlText align="right" style={[styles.emptyText, { color: theme.textSecondary }]}>
                      سوال فقهی حنفی خود را بپرسید. احکام نهایی نیازمند مشورت با عالم مجرب است.
                    </RtlText>
                  </RtlView>
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
                paddingBottom: Math.max(insets.bottom, Spacing.sm),
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
              onFocus={scrollToBottom}
              placeholder="سوال فقهی خود را بنویسید..."
              placeholderTextColor={theme.textSecondary}
              multiline
              maxLength={4000}
              editable={!isStreaming && isConfigured}
              {...persianTextInputAlignProps}
            />
          </RtlView>
        </KeyboardAvoidingView>
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
  emptyText: {
    ...persianBodyText,
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  bubble: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: 'transparent',
    flexShrink: 1,
  },
  userBubble: {},
  assistantBubble: {},
  bubbleText: {
    ...persianBodyText,
    lineHeight: 24,
    flexShrink: 1,
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

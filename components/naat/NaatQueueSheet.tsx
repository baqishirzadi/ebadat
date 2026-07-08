import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Naat } from '@/types/naat';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

type Props = {
  visible: boolean;
  items: Naat[];
  currentId?: string;
  onClose: () => void;
  onSelect: (id: string) => void;
};

export function NaatQueueSheet({ visible, items, currentId, onClose, onSelect }: Props) {
  const { theme } = useApp();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Pressable testID="naat-queue-close-button" onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: theme.text }]}>فهرست پخش</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {items.length} نعت در این نشست
            </Text>
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const isActive = item.id === currentId;
            return (
              <Pressable
                testID={`naat-queue-row-${index + 1}`}
                onPress={() => onSelect(item.id)}
                style={[
                  styles.row,
                  {
                    backgroundColor: isActive ? `${theme.tint}16` : theme.backgroundSecondary,
                    borderColor: isActive ? `${theme.tint}55` : theme.cardBorder,
                  },
                ]}
              >
                <View style={[styles.indexBubble, { backgroundColor: isActive ? theme.tint : theme.card }]}>
                  <Text style={[styles.indexText, { color: isActive ? '#fff' : theme.textSecondary }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.title_fa}
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.reciter_name}
                  </Text>
                </View>
                {isActive && (
                  <View testID={`naat-queue-row-active-${index + 1}`}>
                    <MaterialIcons name="graphic-eq" size={20} color={theme.tint} />
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.46)',
  },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,120,0.35)',
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTextWrap: {
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.subtitle,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  listContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  indexBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    fontWeight: '700',
  },
  rowText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemTitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    fontWeight: '700',
  },
  itemSubtitle: {
    marginTop: 2,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
});

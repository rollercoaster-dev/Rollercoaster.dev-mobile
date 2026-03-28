import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { EvidenceType } from '../../db';
import type { EvidenceTypeValue } from '../../types/evidence';
import { Card } from '../Card';
import { styles } from './FABMenu.styles';

const EVIDENCE_MENU_ITEMS: {
  type: EvidenceTypeValue;
  icon: string;
  label: string;
}[] = [
  { type: EvidenceType.photo, icon: '\u{1F4F7}', label: 'Photo' },
  { type: EvidenceType.screenshot, icon: '\u{1F4F8}', label: 'Screenshot' },
  { type: EvidenceType.video, icon: '\u{1F3AC}', label: 'Video' },
  { type: EvidenceType.text, icon: '\u{1F4DD}', label: 'Note' },
  { type: EvidenceType.voice_memo, icon: '\u{1F3A4}', label: 'Voice Memo' },
  { type: EvidenceType.link, icon: '\u{1F517}', label: 'Link' },
  { type: EvidenceType.file, icon: '\u{1F4CE}', label: 'File' },
];

export interface FABMenuProps {
  isOpen: boolean;
  onSelectType: (type: EvidenceTypeValue) => void;
}

export function FABMenu({ isOpen, onSelectType }: FABMenuProps) {
  if (!isOpen) return null;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="menu"
      accessibilityLabel="Add evidence menu"
    >
      <Card>
        <View style={styles.itemList}>
          {EVIDENCE_MENU_ITEMS.map((item) => (
            <Pressable
              key={item.type}
              onPress={() => onSelectType(item.type)}
              accessible
              accessibilityRole="menuitem"
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
            >
              <Text style={styles.menuIcon} accessibilityElementsHidden>
                {item.icon}
              </Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </View>
  );
}

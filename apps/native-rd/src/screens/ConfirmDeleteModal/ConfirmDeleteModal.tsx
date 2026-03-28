import React from 'react';
import { View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { styles } from './ConfirmDeleteModal.styles';

export interface ConfirmDeleteModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDeleteModal({
  visible,
  onCancel,
  onConfirm,
  title = 'Delete this item?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
}: ConfirmDeleteModalProps) {
  const { theme } = useUnistyles();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <View style={[styles.overlay, { backgroundColor: `${theme.colors.shadow}80` }]}>
        <SafeAreaView edges={['bottom']} style={styles.container}>
          <Card size="normal">
            <View
              style={styles.content}
              accessible
              accessibilityLiveRegion="polite"
            >
              <Text
                variant="headline"
                style={styles.title}
                accessibilityRole="header"
              >
                {title}
              </Text>
              {message && (
                <Text variant="body" style={styles.message}>
                  {message}
                </Text>
              )}
            </View>

            <View style={styles.actions}>
              <Button
                label={confirmLabel}
                onPress={onConfirm}
                variant="destructive"
              />
              <Button
                label={cancelLabel}
                onPress={onCancel}
                variant="secondary"
              />
            </View>
          </Card>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

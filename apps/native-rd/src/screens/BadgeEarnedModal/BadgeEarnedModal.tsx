import React, { useEffect } from 'react';
import { View, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useAnimationPref } from '../../hooks/useAnimationPref';
import { PLACEHOLDER_IMAGE_URI } from '../../hooks/useCreateBadge';
import { getTimingConfig } from '../../utils/animation';
import { styles } from './BadgeEarnedModal.styles';

export interface BadgeEarnedModalProps {
  visible: boolean;
  /** File URI for the badge image, or PLACEHOLDER_IMAGE_URI when the baked image is unavailable. */
  imageUri: string;
  isFirstBadge: boolean;
  onViewBadge: () => void;
  onContinue: () => void;
  onCustomize?: () => void;
}

export function BadgeEarnedModal({
  visible,
  imageUri,
  isFirstBadge,
  onViewBadge,
  onContinue,
  onCustomize,
}: BadgeEarnedModalProps) {
  const { theme } = useUnistyles();
  const { animationPref, shouldAnimate } = useAnimationPref();

  const scale = useSharedValue(shouldAnimate ? 0.85 : 1);

  useEffect(() => {
    if (visible) {
      if (shouldAnimate) {
        scale.value = 0.85;
        scale.value = withTiming(1, getTimingConfig(animationPref, 'quick'));
      } else {
        scale.value = 1;
      }
    }
  }, [visible, shouldAnimate, animationPref, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const hasImage = imageUri !== PLACEHOLDER_IMAGE_URI;
  const microcopy = isFirstBadge ? 'First one. (noted.)' : 'Badge earned.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onContinue}
      accessibilityViewIsModal
    >
      <View
        style={[styles.overlay, { backgroundColor: `${theme.colors.shadow}80` }]}
      >
        <SafeAreaView edges={['bottom']} style={styles.container}>
          <Animated.View style={animatedStyle}>
            <View
              style={styles.card}
              accessible
              accessibilityLabel="Badge earned"
              accessibilityLiveRegion="polite"
            >
              {hasImage ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.badgeImage}
                  accessibilityLabel="Badge image"
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.badgePlaceholder} accessibilityLabel="Badge image placeholder">
                  <Text variant="headline">🏅</Text>
                </View>
              )}

              <Text variant="body" style={styles.microcopy}>
                {microcopy}
              </Text>

              <View style={styles.actions}>
                <Button label="View Badge" onPress={onViewBadge} variant="primary" />
                {onCustomize && (
                  <Button label="Customize" onPress={onCustomize} variant="secondary" />
                )}
                <Button label="Keep going" onPress={onContinue} variant="secondary" />
              </View>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

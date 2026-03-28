import React, { useState } from 'react';
import { Pressable, View, Text, Image, Linking, Alert } from 'react-native';
import { EvidenceType, TEXT_EVIDENCE_PREFIX } from '../../db';
import { formatDuration } from '../../utils/format';
import { styles } from './EvidenceThumbnail.styles';

type EvidenceTypeValue = (typeof EvidenceType)[keyof typeof EvidenceType];

export interface Evidence {
  id: string;
  title: string;
  type: EvidenceTypeValue;
  /** URI for the evidence (file path or URL). */
  uri?: string;
  /** JSON metadata string (e.g., durationMs for audio). */
  metadata?: string;
}

export interface EvidenceThumbnailProps {
  evidence: Evidence;
  onPress?: () => void;
  onLongPress?: () => void;
}

const typeIcons: Record<EvidenceTypeValue, string> = {
  photo: '\u{1F4F7}',
  screenshot: '\u{1F4F1}',
  voice_memo: '\u{1F3A4}',
  text: '\u{1F4DD}',
  link: '\u{1F517}',
  file: '\u{1F4C4}',
  video: '\u{1F3AC}',
};

function parseMetadata(metadata?: string): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

async function openLinkInBrowser(uri: string): Promise<void> {
  try {
    const canOpen = await Linking.canOpenURL(uri);
    if (canOpen) {
      await Linking.openURL(uri);
    } else {
      Alert.alert('Cannot open link', `Unable to open: ${uri}`);
    }
  } catch (error) {
    console.error('[EvidenceThumbnail] Failed to open link', { uri, error });
    Alert.alert('Cannot open link', `Failed to open: ${uri}`);
  }
}

function PreviewContent({ evidence }: { evidence: Evidence }) {
  const [imageError, setImageError] = useState(false);
  const isImageType = evidence.type === 'photo' || evidence.type === 'screenshot' || evidence.type === 'video';

  if (isImageType && evidence.uri && !imageError) {
    return (
      <Image
        source={{ uri: evidence.uri }}
        style={styles.previewImage}
        resizeMode="cover"
        onError={() => setImageError(true)}
        accessibilityElementsHidden
      />
    );
  }

  if (evidence.type === 'text') {
    const textContent = evidence.uri?.startsWith(TEXT_EVIDENCE_PREFIX)
      ? evidence.uri.slice(TEXT_EVIDENCE_PREFIX.length)
      : evidence.title;
    if (textContent) {
      return (
        <View style={styles.textPreview}>
          <Text style={styles.textSnippet} numberOfLines={3}>
            {textContent}
          </Text>
        </View>
      );
    }
  }

  if (evidence.type === 'voice_memo') {
    const meta = parseMetadata(evidence.metadata);
    const durationMs = meta?.durationMs as number | undefined;
    return (
      <View style={styles.preview}>
        <Text style={styles.previewIcon}>{typeIcons.voice_memo}</Text>
        {durationMs ? (
          <Text style={styles.durationBadge}>{formatDuration(durationMs)}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.preview}>
      <Text style={styles.previewIcon}>{typeIcons[evidence.type]}</Text>
    </View>
  );
}

export function EvidenceThumbnail({ evidence, onPress, onLongPress }: EvidenceThumbnailProps) {
  const isLink = evidence.type === 'link' && evidence.uri;

  function handlePress() {
    if (onPress) {
      onPress();
    } else if (isLink) {
      openLinkInBrowser(evidence.uri!);
    }
  }

  const isInteractive = !!onPress || !!isLink;
  const accessibilityHint = isLink && !onPress ? 'Opens link in browser' : undefined;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={!isInteractive && !onLongPress}
      accessible
      accessibilityRole={isInteractive ? 'button' : undefined}
      accessibilityLabel={`${evidence.type} evidence: ${evidence.title}`}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [pressed && (isInteractive || onLongPress) && styles.pressed]}
    >
      <View style={styles.container}>
        <PreviewContent evidence={evidence} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{evidence.title}</Text>
          {isLink ? (
            <Text style={styles.linkUrl} numberOfLines={1}>{evidence.uri}</Text>
          ) : (
            <Text style={styles.type}>{evidence.type}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

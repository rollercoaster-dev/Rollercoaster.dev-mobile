import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { IconButton } from '../../components/IconButton';
import { createEvidence, EvidenceType } from '../../db';
import type { GoalId, StepId } from '../../db';
import type { CaptureLinkScreenProps } from '../../navigation/types';
import { isValidUrl, normalizeUrl } from '../../utils/url';
import { styles } from './CaptureLinkScreen.styles';

export function CaptureLinkScreen({ route }: CaptureLinkScreenProps) {
  const navigation = useNavigation();
  const { goalId, stepId } = route.params;

  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [urlError, setUrlError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const trimmedUrl = normalizeUrl(url);
  const hasValidUrl = isValidUrl(trimmedUrl);

  function handleUrlChange(text: string) {
    setUrl(text);
    // Clear error when the user starts typing
    if (urlError) {
      setUrlError(undefined);
    }
  }

  function validateUrl(): boolean {
    if (!trimmedUrl) {
      setUrlError('Please enter a URL');
      return false;
    }
    if (!hasValidUrl) {
      setUrlError('Please enter a valid URL (e.g. https://example.com)');
      return false;
    }
    return true;
  }

  function handleSave() {
    if (!validateUrl()) return;

    setSaving(true);
    try {
      createEvidence({
        goalId: stepId ? undefined : (goalId as GoalId),
        stepId: stepId ? (stepId as StepId) : undefined,
        type: EvidenceType.link,
        uri: trimmedUrl,
        description: caption.trim() || undefined,
      });
      navigation.goBack();
    } catch (error) {
      console.error('[CaptureLinkScreen] Failed to save link evidence', { error });
      Alert.alert('Could not save link', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.topBar}>
        <IconButton
          icon={<Text variant="body" style={styles.backIcon}>{'<'}</Text>}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          size="sm"
        />
        <Text variant="label">Add Link</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.inputSection}>
          <Input
            label="URL"
            placeholder="https://example.com"
            value={url}
            onChangeText={handleUrlChange}
            error={urlError}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="next"
            textContentType="URL"
          />

          <Input
            label="Caption (optional)"
            placeholder="What is this link about?"
            value={caption}
            onChangeText={setCaption}
            maxLength={1000}
            returnKeyType="done"
          />
        </View>

        {hasValidUrl && (
          <Card>
            <View style={styles.previewCard}>
              <Text style={styles.previewIcon} accessibilityElementsHidden>
                {'\u{1F517}'}
              </Text>
              <Text
                variant="body"
                style={styles.previewUrl}
                numberOfLines={2}
                accessibilityLabel={`Link preview: ${trimmedUrl}`}
              >
                {trimmedUrl}
              </Text>
              {caption.trim() ? (
                <Text variant="caption">{caption.trim()}</Text>
              ) : null}
            </View>
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            label="Save Link"
            variant="primary"
            onPress={handleSave}
            disabled={saving}
            loading={saving}
          />
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => navigation.goBack()}
            disabled={saving}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

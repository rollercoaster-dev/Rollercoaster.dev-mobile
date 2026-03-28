/**
 * Voice Memo capture screen.
 *
 * Records audio via device microphone, provides playback preview,
 * and saves the recording as evidence attached to a goal or step.
 */
import React, { useState } from 'react';
import { View, TextInput, Alert, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { createEvidence, EvidenceType } from '../../db';
import type { GoalId, StepId } from '../../db';
import type { CaptureVoiceMemoScreenProps } from '../../navigation/types';
import { styles } from './VoiceMemoScreen.styles';

/** Format milliseconds as MM:SS */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function VoiceMemoScreen({ route }: CaptureVoiceMemoScreenProps) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();
  const { goalId, stepId } = route.params;
  const [caption, setCaption] = useState('');

  const {
    status,
    durationMs,
    playbackPositionMs,
    uri,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    startPlayback,
    stopPlayback,
    reset,
  } = useAudioRecorder();

  function handleGoBack() {
    if (status === 'recording' || status === 'paused' || status === 'recorded' || status === 'playing') {
      Alert.alert(
        'Discard recording?',
        'You have an unsaved recording. Going back will discard it.',
        [
          { text: 'Keep Recording', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await reset();
              navigation.goBack();
            },
          },
        ],
      );
    } else {
      navigation.goBack();
    }
  }

  async function handleSave() {
    if (!uri) return;

    try {
      const metadata = JSON.stringify({
        durationMs,
        format: 'm4a',
      });

      createEvidence({
        ...(stepId
          ? { stepId: stepId as StepId }
          : { goalId: goalId as GoalId }),
        type: EvidenceType.voice_memo,
        uri,
        description: caption.trim() || undefined,
        metadata,
      });

      navigation.goBack();
    } catch (err) {
      Alert.alert(
        'Could not save',
        'Something went wrong saving the voice memo. Please try again.',
      );
    }
  }

  function handleOpenSettings() {
    Linking.openSettings();
  }

  // Permission denied state
  if (status === 'permission-denied') {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.topBar}>
          <IconButton
            icon={<Text variant="body" style={styles.backIcon}>{'<'}</Text>}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            size="sm"
          />
          <Text variant="label">Voice Memo</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.content}>
          <Card>
            <View style={styles.permissionContent}>
              <Text style={styles.permissionIcon} accessibilityElementsHidden>
                {'\uD83C\uDF99\uFE0F'}
              </Text>
              <Text variant="headline" accessibilityRole="header">
                Microphone Access Needed
              </Text>
              <Text variant="body" style={styles.permissionText}>
                Voice memos need microphone access. You can enable it in your device settings.
              </Text>
              <Button
                label="Open Settings"
                variant="primary"
                onPress={handleOpenSettings}
              />
              <Button
                label="Try Again"
                variant="secondary"
                onPress={startRecording}
              />
            </View>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.topBar}>
        <IconButton
          icon={<Text variant="body" style={styles.backIcon}>{'<'}</Text>}
          onPress={handleGoBack}
          accessibilityLabel="Go back"
          size="sm"
        />
        <Text variant="label">Voice Memo</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.content}>
        {/* Timer display */}
        <Text
          style={styles.timerText}
          accessibilityLabel={`Recording duration: ${formatDuration(status === 'playing' ? playbackPositionMs : durationMs)}`}
          accessibilityLiveRegion="polite"
        >
          {formatDuration(status === 'playing' ? playbackPositionMs : durationMs)}
        </Text>

        {/* Status indicator */}
        <View style={styles.statusRow}>
          {(status === 'recording') && (
            <View
              style={styles.recordingIndicator}
              accessibilityElementsHidden
            />
          )}
          <Text variant="caption" style={styles.statusText}>
            {status === 'idle' && 'Tap to start recording'}
            {status === 'requesting-permission' && 'Requesting permission...'}
            {status === 'recording' && 'Recording'}
            {status === 'paused' && 'Paused'}
            {status === 'recorded' && 'Recording complete'}
            {status === 'playing' && 'Playing'}
          </Text>
        </View>

        {/* Error display */}
        {error && (
          <Card>
            <Text variant="body" style={styles.errorText}>
              {error}
            </Text>
            <Button label="Dismiss" variant="ghost" onPress={() => reset()} />
          </Card>
        )}

        {/* Recording controls */}
        {(status === 'idle' || status === 'recording' || status === 'paused') && (
          <View style={styles.controls}>
            {status === 'recording' && (
              <IconButton
                icon={<Text variant="body">{'\u23F8\uFE0F'}</Text>}
                onPress={pauseRecording}
                accessibilityLabel="Pause recording"
                size="md"
              />
            )}
            {status === 'paused' && (
              <IconButton
                icon={<Text variant="body">{'\u25B6\uFE0F'}</Text>}
                onPress={resumeRecording}
                accessibilityLabel="Resume recording"
                size="md"
              />
            )}

            <Pressable
              onPress={
                status === 'idle'
                  ? startRecording
                  : stopRecording
              }
              accessible
              accessibilityRole="button"
              accessibilityLabel={
                status === 'idle' ? 'Start recording' : 'Stop recording'
              }
              style={({ pressed }) => [
                styles.recordButton,
                pressed && styles.recordButtonPressed,
              ]}
            >
              {status === 'idle' ? (
                <View style={styles.recordButtonIdle} />
              ) : (
                <View style={styles.recordButtonInner} />
              )}
            </Pressable>
          </View>
        )}

        {/* Playback controls (after recording) */}
        {(status === 'recorded' || status === 'playing') && (
          <>
            <View style={styles.playbackControls}>
              {status === 'playing' ? (
                <Button
                  label="Stop"
                  variant="secondary"
                  onPress={stopPlayback}
                />
              ) : (
                <Button
                  label="Play"
                  variant="secondary"
                  onPress={startPlayback}
                />
              )}
              <Button
                label="Re-record"
                variant="ghost"
                onPress={reset}
              />
            </View>

            {/* Playback progress bar */}
            {status === 'playing' && durationMs > 0 && (
              <View
                style={styles.playbackProgress}
                accessible
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round((playbackPositionMs / durationMs) * 100),
                }}
              >
                <View
                  style={[
                    styles.playbackProgressFill,
                    { width: `${Math.round((playbackPositionMs / durationMs) * 100)}%` },
                  ]}
                />
              </View>
            )}

            {/* Save section */}
            <View style={styles.saveSection}>
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption (optional)"
                placeholderTextColor={theme.colors.textMuted}
                value={caption}
                onChangeText={setCaption}
                maxLength={200}
                returnKeyType="done"
                accessible
                accessibilityLabel="Caption for voice memo"
              />
              <View style={styles.buttonRow}>
                <View style={styles.buttonFlex}>
                  <Button
                    label="Attach"
                    variant="primary"
                    onPress={handleSave}
                  />
                </View>
                <View style={styles.buttonFlex}>
                  <Button
                    label="Discard"
                    variant="destructive"
                    onPress={() => {
                      Alert.alert(
                        'Discard recording?',
                        'This recording will be lost.',
                        [
                          { text: 'Keep', style: 'cancel' },
                          {
                            text: 'Discard',
                            style: 'destructive',
                            onPress: () => {
                              reset();
                            },
                          },
                        ],
                      );
                    }}
                  />
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

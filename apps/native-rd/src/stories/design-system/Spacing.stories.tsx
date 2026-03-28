import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  CopiedBadge,
  SectionHeader,
  sharedStyles,
  useCopyToken,
} from './shared';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const spaceKeys = ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16'] as const;

const radiusEntries = [
  { label: 'sm', key: 'sm' },
  { label: 'md', key: 'md' },
  { label: 'lg', key: 'lg' },
  { label: 'xl', key: 'xl' },
  { label: 'pill', key: 'pill' },
] as const;

const borderWidthEntries = [
  { label: 'Thin', key: 'thin', desc: '' },
  { label: 'Default', key: 'default', desc: '' },
  { label: 'Medium', key: 'medium', desc: 'Neo-brutalist standard' },
  { label: 'Thick', key: 'thick', desc: '' },
] as const;

const shadowEntries = [
  { label: 'sm', key: 'sm' },
  { label: 'md', key: 'md' },
  { label: 'lg', key: 'lg' },
  { label: 'hardSm', key: 'hardSm' },
  { label: 'hardMd', key: 'hardMd' },
  { label: 'hardLg', key: 'hardLg' },
  { label: 'focus', key: 'focus' },
] as const;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Design System/Spacing',
};
export default meta;
type Story = StoryObj;

function SpaceRow({ spaceKey }: { spaceKey: string }) {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  const token = `space.${spaceKey}`;
  const px = (theme.space as Record<string, number>)[spaceKey] ?? 0;

  return (
    <Pressable onPress={() => copyToken(token)} style={styles.spaceRow}>
      <View
        style={[
          styles.spaceBar,
          {
            width: Math.max(px, 2),
            backgroundColor: theme.colors.accentPrimary,
          },
        ]}
      />
      <View style={styles.spaceMeta}>
        <Text style={sharedStyles.mono}>{token}</Text>
        <Text style={sharedStyles.metaValue}>{`${px}px`}</Text>
        <CopiedBadge visible={copiedToken === token} />
      </View>
    </Pressable>
  );
}

export const SpaceScale: Story = {
  render: () => (
    <View>
      <SectionHeader
        title="Space Scale"
        description="11-step spacing scale for margins, padding, and gaps."
      />
      <View style={styles.list}>
        {spaceKeys.map((key) => (
          <SpaceRow key={key} spaceKey={key} />
        ))}
      </View>
    </View>
  ),
};

function RadiusCard({ entry }: { entry: typeof radiusEntries[number] }) {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  const token = `radius.${entry.key}`;
  const r = (theme.radius as Record<string, number>)[entry.key] ?? 0;

  return (
    <Pressable onPress={() => copyToken(token)} style={styles.radiusCard}>
      <View
        style={[
          styles.radiusPreview,
          {
            borderRadius: r,
            borderColor: theme.colors.accentPrimary,
          },
        ]}
      />
      <View style={styles.metaCenter}>
        <Text style={styles.metaName}>{entry.label}</Text>
        <Text style={sharedStyles.metaValue}>{r === 9999 ? 'pill' : `${r}px`}</Text>
        <Text style={sharedStyles.mono}>{token}</Text>
        <CopiedBadge visible={copiedToken === token} />
      </View>
    </Pressable>
  );
}

export const BorderRadius: Story = {
  render: () => (
    <View>
      <SectionHeader
        title="Border Radius"
        description="Five radius steps from subtle rounding to full pill."
      />
      <View style={styles.grid}>
        {radiusEntries.map((entry) => (
          <RadiusCard key={entry.key} entry={entry} />
        ))}
      </View>
    </View>
  ),
};

function BorderWidthCard({ entry }: { entry: typeof borderWidthEntries[number] }) {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  const token = `borderWidth.${entry.key}`;
  const bw = (theme.borderWidth as Record<string, number>)[entry.key] ?? 1;

  return (
    <Pressable onPress={() => copyToken(token)} style={styles.bwCard}>
      <View
        style={[
          styles.bwPreview,
          {
            borderWidth: bw,
            borderColor: theme.colors.accentPrimary,
          },
        ]}
      />
      <View style={styles.metaCenter}>
        <Text style={styles.metaName}>{entry.label}</Text>
        <Text style={sharedStyles.metaValue}>{`${bw}px`}</Text>
        {entry.desc ? <Text style={styles.noteText}>{entry.desc}</Text> : null}
        <Text style={sharedStyles.mono}>{token}</Text>
        <CopiedBadge visible={copiedToken === token} />
      </View>
    </Pressable>
  );
}

export const BorderWidths: Story = {
  render: () => (
    <View>
      <SectionHeader
        title="Border Widths"
        description="Four border width steps. Medium (2px) is the neo-brutalist standard."
      />
      <View style={styles.grid}>
        {borderWidthEntries.map((entry) => (
          <BorderWidthCard key={entry.key} entry={entry} />
        ))}
      </View>
    </View>
  ),
};

function ShadowCard({ entry }: { entry: typeof shadowEntries[number] }) {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  const token = `shadow.${entry.key}`;
  const s = (theme.shadow as Record<string, { offsetX: number; offsetY: number; radius: number; opacity: number }>)[entry.key];

  return (
    <Pressable onPress={() => copyToken(token)} style={styles.shadowCard}>
      <View
        style={[
          styles.shadowPreview,
          s && {
            shadowColor: '#000000',
            shadowOffset: { width: s.offsetX, height: s.offsetY },
            shadowOpacity: s.opacity,
            shadowRadius: s.radius,
          },
        ]}
      />
      <View style={styles.metaCenter}>
        <Text style={styles.metaName}>{entry.label}</Text>
        <Text style={sharedStyles.mono}>{token}</Text>
        <CopiedBadge visible={copiedToken === token} />
      </View>
    </Pressable>
  );
}

export const Shadows: Story = {
  render: () => (
    <View>
      <SectionHeader
        title="Shadows"
        description="Soft shadows (sm, md, lg), neo-brutalist hard offsets (hardSm/hardMd/hardLg), and a focus ring."
      />
      <View style={styles.grid}>
        {shadowEntries.map((entry) => (
          <ShadowCard key={entry.key} entry={entry} />
        ))}
      </View>
    </View>
  ),
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  list: {
    gap: theme.space[2],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[3],
  },
  metaName: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.text,
  },
  metaCenter: {
    alignItems: 'center',
    gap: 2,
  },
  noteText: {
    fontSize: theme.size.xs,
    fontStyle: 'italic',
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textMuted,
  },
  spaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[4],
  },
  spaceBar: {
    height: 24,
    borderRadius: theme.radius.md,
    opacity: 0.8,
  },
  spaceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minWidth: 200,
  },
  radiusCard: {
    width: '30%',
    alignItems: 'center',
    gap: theme.space[2],
    padding: theme.space[4],
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
  },
  radiusPreview: {
    width: 72,
    height: 72,
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.medium,
  },
  bwCard: {
    width: '48%',
    alignItems: 'center',
    gap: theme.space[3],
    padding: theme.space[4],
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
  },
  bwPreview: {
    width: '100%',
    height: 60,
    borderStyle: 'solid',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  shadowCard: {
    width: '30%',
    alignItems: 'center',
    gap: theme.space[2],
    padding: theme.space[6],
    paddingBottom: theme.space[4],
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.xl,
  },
  shadowPreview: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
  },
}));

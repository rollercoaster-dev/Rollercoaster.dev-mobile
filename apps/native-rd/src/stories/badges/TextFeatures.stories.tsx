import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { BadgeRenderer } from '../../badges/BadgeRenderer';
import {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  BadgeCenterMode,
  PathTextPosition,
  BannerPosition,
} from '../../badges/types';
import type { BadgeDesign } from '../../badges/types';

// ---------------------------------------------------------------------------
// Base design helper
// ---------------------------------------------------------------------------

function base(overrides: Partial<BadgeDesign> = {}): BadgeDesign {
  return {
    shape: BadgeShape.circle,
    frame: BadgeFrame.guilloche,
    color: '#a78bfa',
    iconName: 'Trophy',
    iconWeight: BadgeIconWeight.regular,
    title: 'Sample Badge',
    centerMode: BadgeCenterMode.icon,
    frameParams: {
      variant: 0,
      stepCount: 5,
      evidenceCount: 3,
      daysToComplete: 30,
      evidenceTypes: 2,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Badges/TextFeatures',
};

export default meta;
type Story = StoryObj;

// ---------------------------------------------------------------------------
// 1. MonogramVariants — 1/2/3 char monograms
// ---------------------------------------------------------------------------

const MONOGRAMS = ['J', 'JC', 'JCZ'];

function MonogramGrid() {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Monogram Variants</Text>
      <View style={styles.row}>
        {MONOGRAMS.map((m) => (
          <View key={m} style={styles.cell}>
            <BadgeRenderer
              design={base({ centerMode: BadgeCenterMode.monogram, monogram: m })}
              size={140}
            />
            <Text style={styles.label}>{m.length} char: {m}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export const MonogramVariants: Story = {
  render: () => <MonogramGrid />,
};

// ---------------------------------------------------------------------------
// 2. CenterLabel — short / medium / max
// ---------------------------------------------------------------------------

const LABELS = ['Go!', 'TypeScript', 'COMPLETED!'];

function CenterLabelGrid() {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Center Label Variants</Text>
      <View style={styles.row}>
        {LABELS.map((label) => (
          <View key={label} style={styles.cell}>
            <BadgeRenderer
              design={base({ centerLabel: label })}
              size={140}
            />
            <Text style={styles.label}>{label.length} chars</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export const CenterLabel: Story = {
  render: () => <CenterLabelGrid />,
};

// ---------------------------------------------------------------------------
// 3. PathTextPositions — top / bottom / both
// ---------------------------------------------------------------------------

const PATH_CASES: { position: PathTextPosition; label: string }[] = [
  { position: PathTextPosition.top, label: 'Top only' },
  { position: PathTextPosition.bottom, label: 'Bottom only' },
  { position: PathTextPosition.both, label: 'Both' },
];

function PathTextGrid() {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Path Text Positions</Text>
      <View style={styles.row}>
        {PATH_CASES.map(({ position, label }) => (
          <View key={position} style={styles.cell}>
            <BadgeRenderer
              design={base({
                pathText: 'ACHIEVEMENT',
                pathTextPosition: position,
                pathTextBottom: 'EARNED 2026',
              })}
              size={140}
            />
            <Text style={styles.label}>{label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export const PathTextPositions: Story = {
  render: () => <PathTextGrid />,
};

// ---------------------------------------------------------------------------
// 4. BannerPositions — center / bottom
// ---------------------------------------------------------------------------

const BANNER_CASES: { position: BannerPosition; label: string }[] = [
  { position: BannerPosition.center, label: 'Center banner' },
  { position: BannerPosition.bottom, label: 'Bottom banner' },
];

function BannerGrid() {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Banner Positions</Text>
      <View style={styles.row}>
        {BANNER_CASES.map(({ position, label }) => (
          <View key={position} style={styles.cell}>
            <BadgeRenderer
              design={base({ banner: { text: 'WINNER', position } })}
              size={140}
            />
            <Text style={styles.label}>{label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export const BannerPositions: Story = {
  render: () => <BannerGrid />,
};

// ---------------------------------------------------------------------------
// 5. KitchenSink — all text features active simultaneously
// ---------------------------------------------------------------------------

export const KitchenSink: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Kitchen Sink — All Features</Text>
      <View style={styles.cell}>
        <BadgeRenderer
          design={base({
            shape: BadgeShape.shield,
            frame: BadgeFrame.guilloche,
            centerMode: BadgeCenterMode.monogram,
            monogram: 'JC',
            centerLabel: 'EXPERT',
            pathText: 'ACHIEVEMENT UNLOCKED',
            pathTextPosition: PathTextPosition.both,
            pathTextBottom: 'ROLLERCOASTER DEV',
            banner: { text: 'WINNER', position: BannerPosition.center },
          })}
          size={200}
        />
      </View>
    </ScrollView>
  ),
};

const MIXED_LAYOUT_SHAPES = [
  { shape: BadgeShape.circle, label: 'Circle' },
  { shape: BadgeShape.shield, label: 'Shield' },
  { shape: BadgeShape.roundedRect, label: 'Rounded Rect' },
];

const KITCHEN_SINK_SHAPES = [
  { shape: BadgeShape.circle, label: 'Circle' },
  { shape: BadgeShape.shield, label: 'Shield' },
  { shape: BadgeShape.hexagon, label: 'Hexagon' },
  { shape: BadgeShape.roundedRect, label: 'Rounded Rect' },
  { shape: BadgeShape.star, label: 'Star' },
  { shape: BadgeShape.diamond, label: 'Diamond' },
];

export const MixedTextLayouts: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Mixed Text Layouts</Text>
      <View style={styles.row}>
        {MIXED_LAYOUT_SHAPES.map(({ shape, label }) => (
          <View key={shape} style={styles.cell}>
            <BadgeRenderer
              design={base({
                shape,
                centerMode: BadgeCenterMode.monogram,
                monogram: 'JC',
                centerLabel: 'EXPERT',
                pathText: 'SPRING 2026',
                pathTextPosition: PathTextPosition.both,
                pathTextBottom: 'ACHIEVEMENT',
                banner: { text: 'WINNER', position: BannerPosition.center },
              })}
              size={180}
            />
            <Text style={styles.label}>{label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  ),
};

export const KitchenSinkAllShapes: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Kitchen Sink Across All Shapes</Text>
      <View style={styles.row}>
        {KITCHEN_SINK_SHAPES.map(({ shape, label }) => (
          <View key={shape} style={styles.cell}>
            <BadgeRenderer
              design={base({
                shape,
                centerMode: BadgeCenterMode.monogram,
                monogram: 'JC',
                centerLabel: 'EXPERT',
                pathText: 'SPRING 2026',
                pathTextPosition: PathTextPosition.both,
                pathTextBottom: 'ACHIEVEMENT',
                banner: { text: 'WINNER', position: BannerPosition.center },
              })}
              size={180}
            />
            <Text style={styles.label}>{label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  ),
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  grid: {
    padding: theme.space[6],
    gap: theme.space[6],
  },
  heading: {
    ...theme.textStyles.headline,
    color: theme.colors.text,
    marginBottom: theme.space[2],
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[4],
  },
  cell: {
    alignItems: 'center',
    gap: theme.space[2],
  },
  label: {
    ...theme.textStyles.caption,
    color: theme.colors.textSecondary,
  },
}));

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { BadgeShapeView } from '../../badges/shapes';
import { BadgeShape } from '../../badges/types';

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof BadgeShapeView> = {
  title: 'Badges/BadgeShapes',
  component: BadgeShapeView,
  argTypes: {
    shape: {
      control: { type: 'select' },
      options: Object.values(BadgeShape),
    },
    fillColor: { control: 'color' },
    size: { control: { type: 'number', min: 64, max: 512, step: 16 } },
    strokeWidth: { control: { type: 'number', min: 1, max: 8, step: 0.5 } },
    showShadow: { control: 'boolean' },
  },
  args: {
    shape: BadgeShape.circle,
    fillColor: '#a78bfa',
    size: 128,
    strokeWidth: 3,
  },
};

export default meta;
type Story = StoryObj<typeof BadgeShapeView>;

// ---------------------------------------------------------------------------
// Single shape playground
// ---------------------------------------------------------------------------

export const Playground: Story = {};

// ---------------------------------------------------------------------------
// All 6 shapes grid
// ---------------------------------------------------------------------------

const SHAPES: { key: BadgeShape; label: string }[] = [
  { key: BadgeShape.circle, label: 'Circle' },
  { key: BadgeShape.shield, label: 'Shield' },
  { key: BadgeShape.hexagon, label: 'Hexagon' },
  { key: BadgeShape.roundedRect, label: 'Rounded Rect' },
  { key: BadgeShape.star, label: 'Star' },
  { key: BadgeShape.diamond, label: 'Diamond' },
];

const ACCENT_COLORS = [
  '#a78bfa', // purple
  '#34d399', // mint
  '#fbbf24', // yellow
  '#10b981', // emerald
  '#06b6d4', // teal
  '#f97316', // orange
];

function AllShapes() {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>All Badge Shapes</Text>
      <View style={styles.row}>
        {SHAPES.map(({ key, label }, i) => (
          <View key={key} style={styles.cell}>
            <BadgeShapeView
              shape={key}
              fillColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
              size={120}
            />
            <Text style={styles.label}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.heading}>Without Shadows (High Contrast)</Text>
      <View style={styles.row}>
        {SHAPES.map(({ key, label }, i) => (
          <View key={key} style={styles.cell}>
            <BadgeShapeView
              shape={key}
              fillColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
              size={120}
              showShadow={false}
              strokeWidth={4}
            />
            <Text style={styles.label}>{label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export const AllShapesGrid: Story = {
  render: () => <AllShapes />,
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  grid: {
    padding: theme.space[6],
    gap: theme.space[8],
  },
  heading: {
    ...theme.textStyles.headline,
    color: theme.colors.text,
    marginBottom: theme.space[4],
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[6],
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

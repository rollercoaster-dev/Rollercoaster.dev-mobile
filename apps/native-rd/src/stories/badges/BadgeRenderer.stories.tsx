import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { BadgeRenderer } from '../../badges/BadgeRenderer';
import { BadgeShape, BadgeFrame, BadgeIconWeight } from '../../badges/types';
import type { BadgeDesign } from '../../badges/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDesign(overrides: Partial<BadgeDesign> = {}): BadgeDesign {
  return {
    shape: BadgeShape.circle,
    frame: BadgeFrame.none,
    color: '#a78bfa',
    iconName: 'Trophy',
    iconWeight: BadgeIconWeight.regular,
    title: 'Sample Badge',
    centerMode: 'icon' as const,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof BadgeRenderer> = {
  title: 'Badges/BadgeRenderer',
  component: BadgeRenderer,
  argTypes: {
    size: { control: { type: 'number', min: 64, max: 512, step: 16 } },
    showShadow: { control: 'boolean' },
  },
  args: {
    design: makeDesign(),
    size: 128,
  },
};

export default meta;
type Story = StoryObj<typeof BadgeRenderer>;

// ---------------------------------------------------------------------------
// Playground
// ---------------------------------------------------------------------------

export const Playground: Story = {};

// ---------------------------------------------------------------------------
// All shapes with different icons and colors
// ---------------------------------------------------------------------------

const SHOWCASE: { design: BadgeDesign; label: string }[] = [
  {
    design: makeDesign({
      shape: BadgeShape.circle,
      color: '#a78bfa',
      iconName: 'Trophy',
      title: 'Achievement',
    }),
    label: 'Circle / Trophy',
  },
  {
    design: makeDesign({
      shape: BadgeShape.shield,
      color: '#34d399',
      iconName: 'ShieldCheck',
      title: 'Protected',
    }),
    label: 'Shield / ShieldCheck',
  },
  {
    design: makeDesign({
      shape: BadgeShape.hexagon,
      color: '#fbbf24',
      iconName: 'Star',
      iconWeight: BadgeIconWeight.fill,
      title: 'Star Hex',
    }),
    label: 'Hexagon / Star',
  },
  {
    design: makeDesign({
      shape: BadgeShape.roundedRect,
      color: '#06b6d4',
      iconName: 'Code',
      iconWeight: BadgeIconWeight.bold,
      title: 'Developer',
    }),
    label: 'RoundedRect / Code',
  },
  {
    design: makeDesign({
      shape: BadgeShape.star,
      color: '#f97316',
      iconName: 'Fire',
      iconWeight: BadgeIconWeight.fill,
      title: 'On Fire',
    }),
    label: 'Star / Fire',
  },
  {
    design: makeDesign({
      shape: BadgeShape.diamond,
      color: '#ec4899',
      iconName: 'Heart',
      iconWeight: BadgeIconWeight.fill,
      title: 'Beloved',
    }),
    label: 'Diamond / Heart',
  },
];

function AllConfigurations() {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Badge Configurations</Text>
      <View style={styles.row}>
        {SHOWCASE.map(({ design, label }) => (
          <View key={label} style={styles.cell}>
            <BadgeRenderer design={design} size={120} />
            <Text style={styles.label}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.heading}>Without Shadows (High Contrast)</Text>
      <View style={styles.row}>
        {SHOWCASE.map(({ design, label }) => (
          <View key={label} style={styles.cell}>
            <BadgeRenderer design={design} size={120} showShadow={false} />
            <Text style={styles.label}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.heading}>Size Comparison</Text>
      <View style={styles.sizeRow}>
        {[64, 96, 128, 192, 256].map((sz) => (
          <View key={sz} style={styles.cell}>
            <BadgeRenderer design={SHOWCASE[0].design} size={sz} />
            <Text style={styles.label}>{sz}px</Text>
          </View>
        ))}
      </View>

      <Text style={styles.heading}>Icon Weights</Text>
      <View style={styles.row}>
        {(['thin', 'light', 'regular', 'bold', 'fill', 'duotone'] as const).map(
          (weight) => (
            <View key={weight} style={styles.cell}>
              <BadgeRenderer
                design={makeDesign({
                  iconWeight: weight,
                  iconName: 'Star',
                  color: '#8b5cf6',
                })}
                size={100}
              />
              <Text style={styles.label}>{weight}</Text>
            </View>
          ),
        )}
      </View>

      <Text style={styles.heading}>Dark Fills (White Icon)</Text>
      <View style={styles.row}>
        {['#1a1a2e', '#16213e', '#0f3460', '#1b1b2f', '#2c2c54'].map(
          (color, i) => (
            <View key={color} style={styles.cell}>
              <BadgeRenderer
                design={makeDesign({
                  color,
                  iconName: ['Crown', 'Rocket', 'Brain', 'Book', 'Medal'][i],
                  shape: Object.values(BadgeShape)[i % 6],
                })}
                size={100}
              />
              <Text style={styles.label}>{color}</Text>
            </View>
          ),
        )}
      </View>
    </ScrollView>
  );
}

export const Showcase: Story = {
  render: () => <AllConfigurations />,
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
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[4],
    alignItems: 'flex-end',
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

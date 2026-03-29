import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import Svg, { Path } from "react-native-svg";
import { frameRegistry } from "../../badges/frames";
import type { FrameGeneratorConfig } from "../../badges/frames";
import type { FrameGenerator } from "../../badges/frames/types";
import {
  guillochePerEdge,
  guillochePerEdgeWithDots,
} from "../../badges/frames/guillocheVariants";
import { generateShapePath } from "../../badges/shapes/paths";
import { BadgeShape } from "../../badges/types";
import type { FrameDataParams } from "../../badges/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHAPES: { key: BadgeShape; label: string }[] = [
  { key: BadgeShape.circle, label: "Circle" },
  { key: BadgeShape.shield, label: "Shield" },
  { key: BadgeShape.hexagon, label: "Hexagon" },
  { key: BadgeShape.roundedRect, label: "Rounded Rect" },
  { key: BadgeShape.star, label: "Star" },
  { key: BadgeShape.diamond, label: "Diamond" },
];

const ACCENT_COLORS = [
  "#a78bfa", // purple
  "#34d399", // mint
  "#fbbf24", // yellow
  "#10b981", // emerald
  "#06b6d4", // teal
  "#f97316", // orange
];

const FRAME_KEYS = ["boldBorder", "guilloche"] as const;
type FrameKey = (typeof FRAME_KEYS)[number];

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

function FrameCell({
  shape,
  frame,
  size,
  params,
  fillColor,
  strokeColor = "#1a1a1a",
  label,
}: {
  shape: BadgeShape;
  frame: FrameKey;
  size: number;
  params: FrameDataParams;
  fillColor: string;
  strokeColor?: string;
  label?: string;
}) {
  const inset = size * 0.02;
  const innerInset = inset + size * 0.15;
  const shapePath = generateShapePath(shape, size, inset);

  const config: FrameGeneratorConfig = {
    shape,
    size,
    inset,
    innerInset,
    params,
    strokeColor,
  };

  const frameElements = frameRegistry[frame](config);

  return (
    <View style={styles.cell}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path
          d={shapePath}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2}
        />
        {frameElements}
      </Svg>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Default params helper
// ---------------------------------------------------------------------------

function makeParams(overrides?: Partial<FrameDataParams>): FrameDataParams {
  return {
    variant: 0,
    stepCount: 5,
    evidenceCount: 3,
    daysToComplete: 30,
    evidenceTypes: 2,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Meta — use a dummy component for the Playground controls
// ---------------------------------------------------------------------------

function FramePlayground({
  frame = "boldBorder",
  shape = BadgeShape.circle,
  size = 160,
  fillColor = "#a78bfa",
  strokeColor = "#1a1a1a",
  stepCount = 5,
}: {
  frame?: FrameKey;
  shape?: BadgeShape;
  size?: number;
  fillColor?: string;
  strokeColor?: string;
  stepCount?: number;
}) {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <FrameCell
        shape={shape}
        frame={frame}
        size={size}
        params={makeParams({ stepCount })}
        fillColor={fillColor}
        strokeColor={strokeColor}
        label={`${frame} · ${shape} · steps=${stepCount}`}
      />
    </ScrollView>
  );
}

const meta: Meta<typeof FramePlayground> = {
  title: "Badges/FrameGenerators",
  component: FramePlayground,
  argTypes: {
    frame: {
      control: { type: "select" },
      options: FRAME_KEYS,
    },
    shape: {
      control: { type: "select" },
      options: Object.values(BadgeShape),
    },
    size: {
      control: { type: "select" },
      options: [80, 120, 160, 200, 256],
    },
    fillColor: { control: "color" },
    strokeColor: { control: "color" },
    stepCount: {
      control: { type: "select" },
      options: [1, 2, 3, 4, 5, 8, 10, 15, 20],
    },
  },
  args: {
    frame: "boldBorder",
    shape: BadgeShape.circle,
    size: 160,
    fillColor: "#a78bfa",
    strokeColor: "#1a1a1a",
    stepCount: 5,
  },
};

export default meta;
type Story = StoryObj<typeof FramePlayground>;

// ---------------------------------------------------------------------------
// 1. Playground — interactive single frame
// ---------------------------------------------------------------------------

export const Playground: Story = {};

// ---------------------------------------------------------------------------
// 2. BoldBorderAllShapes — 6-shape grid
// ---------------------------------------------------------------------------

function BoldBorderGrid() {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Bold Border — All Shapes (stepCount=5)</Text>
      <View style={styles.row}>
        {SHAPES.map(({ key, label }, i) => (
          <FrameCell
            key={key}
            shape={key}
            frame="boldBorder"
            size={140}
            params={makeParams({ stepCount: 5 })}
            fillColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
            label={label}
          />
        ))}
      </View>
    </ScrollView>
  );
}

export const BoldBorderAllShapes: Story = {
  render: () => <BoldBorderGrid />,
};

// ---------------------------------------------------------------------------
// 3. GuillocheAllShapes — 6-shape grid
// ---------------------------------------------------------------------------

function GuillocheGrid() {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Guilloche — All Shapes (stepCount=5)</Text>
      <View style={styles.row}>
        {SHAPES.map(({ key, label }, i) => (
          <FrameCell
            key={key}
            shape={key}
            frame="guilloche"
            size={140}
            params={makeParams({ stepCount: 5 })}
            fillColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
            label={label}
          />
        ))}
      </View>
    </ScrollView>
  );
}

export const GuillocheAllShapes: Story = {
  render: () => <GuillocheGrid />,
};

// ---------------------------------------------------------------------------
// 4. StepCountComparison — data-driven behavior
// ---------------------------------------------------------------------------

const STEP_COUNTS = [1, 2, 4, 6, 10];

function StepCountGrid() {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Bold Border — Step Count Comparison</Text>
      <Text style={styles.subheading}>
        stepCount {"<"} 4 → 2 rings, stepCount {">="} 4 → 3 rings
      </Text>
      <View style={styles.row}>
        {STEP_COUNTS.map((sc) => (
          <FrameCell
            key={`bb-${sc}`}
            shape={BadgeShape.circle}
            frame="boldBorder"
            size={120}
            params={makeParams({ stepCount: sc })}
            fillColor="#a78bfa"
            label={`steps=${sc}`}
          />
        ))}
      </View>

      <Text style={styles.heading}>Guilloche — Step Count Comparison</Text>
      <Text style={styles.subheading}>
        Wave count scales from 3 (stepCount=1) to 14 (stepCount=10+)
      </Text>
      <View style={styles.row}>
        {STEP_COUNTS.map((sc) => (
          <FrameCell
            key={`gl-${sc}`}
            shape={BadgeShape.circle}
            frame="guilloche"
            size={120}
            params={makeParams({ stepCount: sc })}
            fillColor="#06b6d4"
            label={`steps=${sc}`}
          />
        ))}
      </View>
    </ScrollView>
  );
}

export const StepCountComparison: Story = {
  render: () => <StepCountGrid />,
};

// ---------------------------------------------------------------------------
// 5. GuillocheVariants — compare corner-fix approaches
// ---------------------------------------------------------------------------

const VARIANT_GENERATORS: {
  key: string;
  label: string;
  generator: FrameGenerator;
}[] = [
  {
    key: "original",
    label: "Production (shape-aware)",
    generator: frameRegistry.guilloche,
  },
  { key: "per-edge", label: "Per-Edge Segments", generator: guillochePerEdge },
  {
    key: "per-edge-dots",
    label: "Per-Edge + Corner Dots",
    generator: guillochePerEdgeWithDots,
  },
];

/** Renders a single badge with a specific guilloche variant */
function VariantCell({
  shape,
  generator,
  size,
  params,
  fillColor,
  strokeColor = "#1a1a1a",
  label,
}: {
  shape: BadgeShape;
  generator: FrameGenerator;
  size: number;
  params: FrameDataParams;
  fillColor: string;
  strokeColor?: string;
  label?: string;
}) {
  const inset = size * 0.02;
  const innerInset = inset + size * 0.15;
  const shapePath = generateShapePath(shape, size, inset);

  const config: FrameGeneratorConfig = {
    shape,
    size,
    inset,
    innerInset,
    params,
    strokeColor,
  };

  const frameElements = generator(config);

  return (
    <View style={styles.cell}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path
          d={shapePath}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2}
        />
        {frameElements}
      </Svg>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

/** Shows all shapes × all variants for side-by-side comparison */
function GuillocheVariantsGrid() {
  const size = 140;
  const params = makeParams({ stepCount: 5 });

  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Guilloche Corner Fix Comparison</Text>
      <Text style={styles.subheading}>
        stepCount=5, waveCount=8 — compare corner behavior across approaches
      </Text>

      {VARIANT_GENERATORS.map(({ key, label, generator }) => (
        <View key={key}>
          <Text style={styles.variantHeading}>{label}</Text>
          <View style={styles.row}>
            {SHAPES.map(({ key: shapeKey, label: shapeLabel }, i) => (
              <VariantCell
                key={`${key}-${shapeKey}`}
                shape={shapeKey}
                generator={generator}
                size={size}
                params={params}
                fillColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
                label={shapeLabel}
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export const GuillocheVariants: Story = {
  render: () => <GuillocheVariantsGrid />,
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
    marginBottom: theme.space[2],
  },
  subheading: {
    ...theme.textStyles.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.space[4],
  },
  variantHeading: {
    ...theme.textStyles.body,
    color: theme.colors.text,
    fontWeight: "700",
    marginBottom: theme.space[2],
    marginTop: theme.space[4],
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[6],
  },
  cell: {
    alignItems: "center",
    gap: theme.space[2],
  },
  label: {
    ...theme.textStyles.caption,
    color: theme.colors.textSecondary,
  },
}));

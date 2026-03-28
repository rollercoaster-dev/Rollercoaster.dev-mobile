/**
 * SVG path generators for badge background shapes.
 *
 * Each function returns an SVG path `d` string for a given size.
 * All paths are computed to fit inside a `size × size` bounding box
 * with stroke inset so nothing clips the viewBox.
 */

import type { BadgeShape } from '../types';

/**
 * Generate a circle path.
 *
 * Uses two arc commands to form a full circle centered in the bounding box.
 */
export function circlePath(size: number, inset: number): string {
  const r = size / 2 - inset;
  const cx = size / 2;
  const cy = size / 2;
  // Two-arc full circle: move to left, arc top-right, arc bottom-left
  return [
    `M ${cx - r} ${cy}`,
    `A ${r} ${r} 0 1 1 ${cx + r} ${cy}`,
    `A ${r} ${r} 0 1 1 ${cx - r} ${cy}`,
    'Z',
  ].join(' ');
}

/**
 * Generate a shield path.
 *
 * Classic heraldic shield: flat top with slight shoulder curves,
 * tapers to a point at the bottom center.
 */
export function shieldPath(size: number, inset: number): string {
  const l = inset;
  const r = size - inset;
  const t = inset;
  const b = size - inset;
  const w = r - l;
  const h = b - t;
  const cx = l + w / 2;

  // Shoulder width is ~85% of width
  const shoulderY = t + h * 0.1;
  const waistY = t + h * 0.55;

  return [
    `M ${l + w * 0.075} ${t}`,
    `L ${l + w * 0.925} ${t}`,
    // Right shoulder curve
    `Q ${r} ${t} ${r} ${shoulderY}`,
    // Right side taper
    `L ${r} ${waistY}`,
    // Bottom right curve to point
    `Q ${r} ${b - h * 0.15} ${cx} ${b}`,
    // Bottom left curve from point
    `Q ${l} ${b - h * 0.15} ${l} ${waistY}`,
    // Left side
    `L ${l} ${shoulderY}`,
    // Left shoulder curve
    `Q ${l} ${t} ${l + w * 0.075} ${t}`,
    'Z',
  ].join(' ');
}

/**
 * Generate a regular hexagon path (flat-top orientation).
 */
export function hexagonPath(size: number, inset: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;

  // Flat-top hexagon: vertices at 0°, 60°, 120°, 180°, 240°, 300°
  const points: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30); // -30 for flat-top
    points.push([
      cx + r * Math.cos(angle),
      cy + r * Math.sin(angle),
    ]);
  }

  const [first, ...rest] = points;
  return [
    `M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`,
    ...rest.map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`),
    'Z',
  ].join(' ');
}

/**
 * Generate a rounded rectangle path.
 *
 * Corner radius is proportional to size.
 */
export function roundedRectPath(size: number, inset: number): string {
  const l = inset;
  const t = inset;
  const w = size - inset * 2;
  const h = size - inset * 2;
  const r = Math.min(w, h) * 0.12; // 12% corner radius

  return [
    `M ${l + r} ${t}`,
    `L ${l + w - r} ${t}`,
    `Q ${l + w} ${t} ${l + w} ${t + r}`,
    `L ${l + w} ${t + h - r}`,
    `Q ${l + w} ${t + h} ${l + w - r} ${t + h}`,
    `L ${l + r} ${t + h}`,
    `Q ${l} ${t + h} ${l} ${t + h - r}`,
    `L ${l} ${t + r}`,
    `Q ${l} ${t} ${l + r} ${t}`,
    'Z',
  ].join(' ');
}

/**
 * Generate a 5-pointed star path.
 *
 * Alternates between outer and inner radii.
 */
export function starPath(size: number, inset: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerR = outerR * 0.4; // inner radius = 40% of outer
  const points: Array<[number, number]> = [];

  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    // Start from top (-90°), step 36° per vertex
    const angle = (Math.PI / 180) * (36 * i - 90);
    points.push([
      cx + r * Math.cos(angle),
      cy + r * Math.sin(angle),
    ]);
  }

  const [first, ...rest] = points;
  return [
    `M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`,
    ...rest.map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`),
    'Z',
  ].join(' ');
}

/**
 * Generate a diamond (rotated square) path.
 */
export function diamondPath(size: number, inset: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;

  return [
    `M ${cx} ${cy - r}`, // top
    `L ${cx + r} ${cy}`, // right
    `L ${cx} ${cy + r}`, // bottom
    `L ${cx - r} ${cy}`, // left
    'Z',
  ].join(' ');
}

/** Map shape key to path generator */
const pathGenerators: Record<BadgeShape, (size: number, inset: number) => string> = {
  circle: circlePath,
  shield: shieldPath,
  hexagon: hexagonPath,
  roundedRect: roundedRectPath,
  star: starPath,
  diamond: diamondPath,
};

/**
 * Generate the SVG path `d` attribute for a badge shape.
 *
 * @param shape   - one of the BadgeShape values
 * @param size    - bounding box dimension (square)
 * @param inset   - stroke inset to prevent clipping (typically half the stroke width)
 */
export function generateShapePath(
  shape: BadgeShape,
  size: number,
  inset: number,
): string {
  return pathGenerators[shape](size, inset);
}

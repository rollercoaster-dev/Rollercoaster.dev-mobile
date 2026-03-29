/**
 * Accessibility test helpers for verifying a11y props on React Native components.
 *
 * Usage:
 *   import { expectAccessibleRole, expectAccessibleLabel } from '../a11y-helpers';
 */
interface AccessibilityValue {
  min?: number;
  max?: number;
  now?: number;
  text?: string;
}

interface AccessibilityProps {
  accessible?: boolean;
  accessibilityRole?: string;
  role?: string;
  accessibilityLabel?: string;
  "aria-label"?: string;
  accessibilityState?: Record<string, unknown>;
  accessibilityValue?: AccessibilityValue;
  accessibilityViewIsModal?: boolean;
  accessibilityLiveRegion?: "polite" | "assertive" | "none";
  [key: string]: unknown;
}

interface TestElement {
  props: AccessibilityProps;
}

/** Assert that an element has the expected accessibilityRole. */
export function expectAccessibleRole(element: TestElement, role: string) {
  expect(element.props.accessibilityRole ?? element.props.role).toBe(role);
}

/** Assert that an element has the expected accessibilityLabel. */
export function expectAccessibleLabel(element: TestElement, label: string) {
  expect(element.props.accessibilityLabel ?? element.props["aria-label"]).toBe(
    label,
  );
}

/** Assert that an element has accessible=true. */
export function expectAccessible(element: TestElement) {
  expect(element.props.accessible).toBe(true);
}

/** Assert that an element has the expected accessibilityState values. */
export function expectAccessibleState(
  element: TestElement,
  state: Record<string, unknown>,
) {
  const actual = element.props.accessibilityState ?? {};
  for (const [key, value] of Object.entries(state)) {
    expect(actual[key]).toBe(value);
  }
}

/** Assert that an element has accessibilityValue with expected fields. */
export function expectAccessibleValue(
  element: TestElement,
  value: { min?: number; max?: number; now?: number; text?: string },
) {
  const actual = element.props.accessibilityValue ?? {};
  if (value.min !== undefined) expect(actual.min).toBe(value.min);
  if (value.max !== undefined) expect(actual.max).toBe(value.max);
  if (value.now !== undefined) expect(actual.now).toBe(value.now);
  if (value.text !== undefined) expect(actual.text).toBe(value.text);
}

/** Assert that a Modal has accessibilityViewIsModal set. */
export function expectModalAccessibility(element: TestElement) {
  expect(element.props.accessibilityViewIsModal).toBe(true);
}

/** Assert that an element has accessibilityLiveRegion set. */
export function expectLiveRegion(
  element: TestElement,
  region: "polite" | "assertive" | "none" = "polite",
) {
  expect(element.props.accessibilityLiveRegion).toBe(region);
}

import {
  ANIMATION_DURATIONS,
  getAnimationDuration,
  getTimingConfig,
  getSpringConfig,
} from '../animation';
import type { AnimationPref } from '../../hooks/useAnimationPref';

describe('animation utilities', () => {
  test('ANIMATION_DURATIONS has structure for all prefs', () => {
    const prefs: AnimationPref[] = ['full', 'reduced', 'none'];
    for (const pref of prefs) {
      expect(ANIMATION_DURATIONS[pref]).toBeDefined();
      expect(ANIMATION_DURATIONS[pref].quick).toBeDefined();
      expect(ANIMATION_DURATIONS[pref].normal).toBeDefined();
      expect(ANIMATION_DURATIONS[pref].slow).toBeDefined();
    }
  });

  test('none has all zero durations', () => {
    expect(ANIMATION_DURATIONS.none.quick).toBe(0);
    expect(ANIMATION_DURATIONS.none.normal).toBe(0);
    expect(ANIMATION_DURATIONS.none.slow).toBe(0);
  });

  test('reduced durations are shorter than full', () => {
    expect(ANIMATION_DURATIONS.reduced.quick).toBeLessThan(ANIMATION_DURATIONS.full.quick);
    expect(ANIMATION_DURATIONS.reduced.normal).toBeLessThan(ANIMATION_DURATIONS.full.normal);
    expect(ANIMATION_DURATIONS.reduced.slow).toBeLessThan(ANIMATION_DURATIONS.full.slow);
  });

  test.each([
    ['full', 'quick', 200],
    ['reduced', 'normal', 150],
    ['none', 'slow', 0],
  ] as const)('getAnimationDuration(%s, %s) = %i', (pref, speed, expected) => {
    expect(getAnimationDuration(pref, speed)).toBe(expected);
  });

  test('getAnimationDuration defaults to normal speed', () => {
    expect(getAnimationDuration('full')).toBe(300);
  });

  test('getTimingConfig returns correct duration and includes easing', () => {
    const full = getTimingConfig('full', 'normal');
    expect(full.duration).toBe(300);
    expect(full.easing).toBeDefined();

    const none = getTimingConfig('none');
    expect(none.duration).toBe(0);
  });

  test('getSpringConfig varies by pref', () => {
    const none = getSpringConfig('none');
    expect(none.duration).toBe(0);

    const reduced = getSpringConfig('reduced');
    expect(reduced.damping).toBeDefined();
    expect(reduced.stiffness).toBeDefined();

    const full = getSpringConfig('full');
    expect(full.damping).toBeLessThan(reduced.damping!);
  });
});

/**
 * Consolidated accessibility contract tests
 *
 * Covers sole a11y coverage for: GoalCard, ProgressBar, Checkbox,
 * CollapsibleSection, ConfirmDeleteModal.
 *
 * These tests verify screen-reader-facing props (roles, labels, states, values)
 * that no other test file covers.
 */

import React from 'react';
import { Text as RNText } from 'react-native';
import { renderWithProviders, screen, fireEvent } from './test-utils';
import {
  expectAccessible,
  expectAccessibleRole,
  expectAccessibleValue,
  expectAccessibleState,
  expectModalAccessibility,
  expectLiveRegion,
} from './a11y-helpers';
import { GoalCard, type GoalCardGoal } from '../components/GoalCard';
import { ProgressBar } from '../components/ProgressBar';
import { Checkbox } from '../components/Checkbox';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { ConfirmDeleteModal } from '../screens/ConfirmDeleteModal/ConfirmDeleteModal';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

const activeGoal: GoalCardGoal = {
  id: '1',
  title: 'Learn TypeScript',
  status: 'active',
  stepsTotal: 5,
  stepsCompleted: 2,
};

const completedGoal: GoalCardGoal = {
  id: '2',
  title: 'Read a book',
  status: 'completed',
  stepsTotal: 3,
  stepsCompleted: 3,
};

describe('Accessibility Contracts', () => {
  describe('GoalCard', () => {
    it('has composite label with progress and status', () => {
      renderWithProviders(
        <GoalCard goal={activeGoal} onPress={jest.fn()} />,
      );
      const card = screen.getByRole('button', {
        name: 'Learn TypeScript, 2 of 5 steps completed, active',
      });
      expect(card).toBeOnTheScreen();
      expect(card.props.accessibilityHint).toBe(
        'Double-tap to view details',
      );
    });

    it('title has header role and progressbar has correct value', () => {
      renderWithProviders(
        <GoalCard goal={activeGoal} onPress={jest.fn()} />,
      );
      screen.getByRole('header', { name: 'Learn TypeScript' });
      const progressBar = screen.getByRole('progressbar');
      expectAccessibleValue(progressBar, { min: 0, max: 100, now: 40 });
    });

    it('reflects completed status in label', () => {
      renderWithProviders(
        <GoalCard goal={completedGoal} onPress={jest.fn()} />,
      );
      screen.getByRole('button', {
        name: 'Read a book, 3 of 3 steps completed, completed',
      });
    });

    it('has no button role when non-interactive', () => {
      renderWithProviders(<GoalCard goal={activeGoal} />);
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('ProgressBar', () => {
    it('has progressbar role with accessible=true', () => {
      renderWithProviders(<ProgressBar progress={0.5} />);
      const bar = screen.getByRole('progressbar');
      expectAccessible(bar);
      expectAccessibleRole(bar, 'progressbar');
    });

    test.each([
      [0, 0],
      [0.5, 50],
      [0.333, 33],
      [1.5, 100],
    ] as const)('reports correct value at progress=%s (now=%i)', (progress, expectedNow) => {
      renderWithProviders(<ProgressBar progress={progress} />);
      const bar = screen.getByRole('progressbar');
      expectAccessibleValue(bar, { min: 0, max: 100, now: expectedNow });
    });
  });

  describe('Checkbox', () => {
    it('has checkbox role, label, and checked state', () => {
      renderWithProviders(
        <Checkbox checked={false} onToggle={jest.fn()} label="Step one" />,
      );
      const checkbox = screen.getByRole('checkbox', { name: 'Step one' });
      expectAccessibleState(checkbox, { checked: false });
    });

    it('exposes checked=true when checked', () => {
      renderWithProviders(
        <Checkbox checked onToggle={jest.fn()} label="Step one" />,
      );
      const checkbox = screen.getByRole('checkbox', { name: 'Step one' });
      expectAccessibleState(checkbox, { checked: true });
    });

    it('label has edit hint when onLabelPress provided', () => {
      renderWithProviders(
        <Checkbox
          checked={false}
          onToggle={jest.fn()}
          label="Step one"
          onLabelPress={jest.fn()}
        />,
      );
      const label = screen.getByLabelText('Edit Step one');
      expect(label.props.accessibilityHint).toBe('Tap to edit step title');
    });
  });

  describe('CollapsibleSection', () => {
    it('has button role with expanded state and toggles', () => {
      renderWithProviders(
        <CollapsibleSection title="Details" defaultExpanded>
          <RNText>Content</RNText>
        </CollapsibleSection>,
      );
      const button = screen.getByRole('button', {
        name: 'Details, collapse',
      });
      expectAccessibleState(button, { expanded: true });

      fireEvent.press(button);

      const collapsed = screen.getByRole('button', {
        name: 'Details, expand',
      });
      expectAccessibleState(collapsed, { expanded: false });
    });
  });

  describe('Modals', () => {
    function assertModalA11y() {
      const modal = screen.UNSAFE_getByType(
        require('react-native').Modal,
      );
      expectModalAccessibility(modal);

      const liveViews = screen.UNSAFE_getAllByType(
        require('react-native').View,
      ).filter(
        (v: { props: { accessibilityLiveRegion?: string } }) =>
          v.props.accessibilityLiveRegion === 'polite',
      );
      expect(liveViews.length).toBeGreaterThan(0);
      expectLiveRegion(liveViews[0]!, 'polite');
    }

    it('ConfirmDeleteModal has accessibilityViewIsModal and liveRegion', () => {
      renderWithProviders(
        <ConfirmDeleteModal visible onCancel={jest.fn()} onConfirm={jest.fn()} />,
      );
      assertModalA11y();
    });

    it('ConfirmDeleteModal title has header role', () => {
      renderWithProviders(
        <ConfirmDeleteModal
          visible
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />,
      );
      screen.getByRole('header', { name: 'Delete this item?' });
    });
  });
});

/**
 * Goal CRUD operation tests
 *
 * Tests validation, timestamp generation, and error handling
 */

import {
  createGoal,
  updateGoal,
  completeGoal,
  uncompleteGoal,
  deleteGoal,
} from '../queries';
import type { GoalId } from '../schema';

const mockGoalId = 'goal_test_123' as GoalId;

describe('Goal CRUD Operations', () => {
  test.each([
    ['empty string', '', true],
    ['whitespace only', '   \n\t  ', true],
    ['exceeds 1000 chars', 'a'.repeat(1001), true],
    ['valid title', 'Valid Goal Title', false],
    ['trimmed whitespace', '  Valid Goal  ', false],
    ['at 1000 char limit', 'a'.repeat(1000), false],
  ])('createGoal with %s', (_label, title, shouldThrow) => {
    if (shouldThrow) {
      expect(() => createGoal(title)).toThrow('Goal title must be 1-1000 characters');
    } else {
      expect(() => createGoal(title)).not.toThrow();
    }
  });

  test.each([
    ['empty title', { title: '' }, true],
    ['whitespace title', { title: '   ' }, true],
    ['>1000 char title', { title: 'a'.repeat(1001) }, true],
    ['valid title', { title: 'Updated Title' }, false],
    ['empty description', { description: '' }, true],
    ['>1000 char description', { description: 'a'.repeat(1001) }, true],
    ['null description', { description: null }, false],
    ['valid description', { description: 'Valid description' }, false],
  ] as const)('updateGoal with %s', (_label, fields, shouldThrow) => {
    if (shouldThrow) {
      expect(() => updateGoal(mockGoalId, fields)).toThrow();
    } else {
      expect(() => updateGoal(mockGoalId, fields)).not.toThrow();
    }
  });

  describe('updateGoal - Null vs Undefined', () => {
    test('should allow updating both title and description', () => {
      expect(() =>
        updateGoal(mockGoalId, {
          title: 'New Title',
          description: 'New Description',
        }),
      ).not.toThrow();
    });

    test('should allow updating title and clearing description', () => {
      expect(() =>
        updateGoal(mockGoalId, {
          title: 'New Title',
          description: null,
        }),
      ).not.toThrow();
    });
  });

  test('completeGoal should succeed with evidence', () => {
    expect(() => completeGoal(mockGoalId, [{ type: 'photo' }])).not.toThrow();
  });

  test('completeGoal should throw without evidence', () => {
    expect(() => completeGoal(mockGoalId, [])).toThrow('Cannot complete goal');
  });

  test('uncompleteGoal should succeed', () => {
    expect(() => uncompleteGoal(mockGoalId)).not.toThrow();
  });

  test('deleteGoal should succeed', () => {
    expect(() => deleteGoal(mockGoalId)).not.toThrow();
  });
});

import React from 'react';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../../__tests__/test-utils';
import { CompletionFlowScreen } from '../CompletionFlowScreen';

// --- Mocks ---

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockParentNavigate }));
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('../../../__tests__/mocks/navigation');
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      ...actual.useNavigation(),
      goBack: mockGoBack,
      navigate: mockNavigate,
      getParent: mockGetParent,
    })),
  };
});

jest.mock('../../../hooks/useAnimationPref', () => ({
  useAnimationPref: jest.fn(() => ({
    animationPref: 'full',
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  })),
}));

const mockUseCreateBadge = jest.fn<
  { status: string; error: string | null },
  [string, { enabled?: boolean; design?: unknown }]
>(() => ({ status: 'done', error: null }));
jest.mock('../../../hooks/useCreateBadge', () => ({
  PLACEHOLDER_IMAGE_URI: 'pending:baked-image',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useCreateBadge: (goalId: any, opts: any) => mockUseCreateBadge(goalId, opts),
}));

const mockUncompleteGoal = jest.fn();
const mockCreateEvidence = jest.fn();
jest.mock('../../../db', () => ({
  EvidenceType: {
    photo: 'photo',
    screenshot: 'screenshot',
    text: 'text',
    voice_memo: 'voice_memo',
    video: 'video',
    link: 'link',
    file: 'file',
  },
  GoalStatus: { active: 'active', completed: 'completed' },
  TEXT_EVIDENCE_PREFIX: 'content:text;',
  goalsQuery: 'goalsQuery',
  stepsByGoalQuery: jest.fn((id: string) => `stepsByGoalQuery-${id}`),
  evidenceByGoalQuery: jest.fn((id: string) => `evidenceByGoalQuery-${id}`),
  badgeByGoalQuery: jest.fn((id: string) => `badgeByGoalQuery-${id}`),
  badgesQuery: 'badgesQuery',
  uncompleteGoal: (...args: unknown[]) => mockUncompleteGoal(...args),
  createEvidence: (...args: unknown[]) => mockCreateEvidence(...args),
}));

const mockUseQuery = jest.fn();
jest.mock('@evolu/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  EvoluProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// --- Helpers ---

const GOAL = {
  id: 'goal-1',
  title: 'Learn TypeScript',
  description: 'Master the type system',
  status: 'active',
};

const COMPLETED_STEPS = [
  { id: 'step-1', title: 'Read docs', status: 'completed', ordinal: 0 },
  { id: 'step-2', title: 'Practice', status: 'completed', ordinal: 1 },
  { id: 'step-3', title: 'Build project', status: 'completed', ordinal: 2 },
];

const GOAL_EVIDENCE = [
  { id: 'ev-1', type: 'text', description: 'Reflection on learning', uri: 'content:text;I learned a lot' },
];

const routeProps = {
  route: {
    key: 'CompletionFlow-1',
    name: 'CompletionFlow' as const,
    params: { goalId: 'goal-1' },
  },
  navigation: {} as any,
};

const BADGE_ROW = {
  id: 'badge-1',
  goalId: 'goal-1',
  credential: '{"@context":"..."}',
  imageUri: 'file:///badges/test-badge.png',
  createdAt: '2026-01-01T00:00:00Z',
};

function setupQueries({
  goal = GOAL,
  steps = COMPLETED_STEPS,
  goalEvidence = [] as object[],
  badge = null as object | null,
  allBadges = [] as object[],
}: {
  goal?: object | null;
  steps?: object[];
  goalEvidence?: object[];
  badge?: object | null;
  allBadges?: object[];
} = {}) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === 'goalsQuery') return goal ? [goal] : [];
    if (typeof query === 'string' && query.startsWith('stepsByGoalQuery')) return steps;
    if (typeof query === 'string' && query.startsWith('evidenceByGoalQuery')) return goalEvidence;
    if (typeof query === 'string' && query.startsWith('badgeByGoalQuery')) return badge ? [badge] : [];
    if (query === 'badgesQuery') return allBadges;
    return [];
  });
}

// --- Tests ---

describe('CompletionFlowScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue([]);
    mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
  });

  describe('evidence prompt phase (no goal evidence)', () => {
    it('shows evidence prompt when no goal evidence exists', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('One last thing!')).toBeOnTheScreen();
      expect(screen.getByText(/Capture your achievement/)).toBeOnTheScreen();
    });

    it('shows inline text input for quick note capture', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Write about your achievement')).toBeOnTheScreen();
      expect(screen.getByText('Write about what you accomplished')).toBeOnTheScreen();
    });

    it('shows Save Note button (disabled when empty)', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      const saveButton = screen.getByLabelText('Save Note');
      expect(saveButton).toBeOnTheScreen();
      expect(saveButton).toBeDisabled();
    });

    it('shows evidence type chips for other capture methods', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('Or capture another way')).toBeOnTheScreen();
      // Text is excluded from chips (handled inline)
      expect(screen.getByLabelText(/Take Photo/)).toBeOnTheScreen();
      expect(screen.getByLabelText(/Record Video/)).toBeOnTheScreen();
      expect(screen.getByLabelText(/Record Voice Memo/)).toBeOnTheScreen();
      expect(screen.getByLabelText(/Add Link/)).toBeOnTheScreen();
      expect(screen.getByLabelText(/Attach File/)).toBeOnTheScreen();
    });

    it('navigates to CapturePhoto when photo chip is tapped', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText(/Take Photo/));
      expect(mockNavigate).toHaveBeenCalledWith('CapturePhoto', { goalId: 'goal-1' });
    });

    it('navigates to CaptureVoiceMemo when voice memo chip is tapped', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText(/Record Voice Memo/));
      expect(mockNavigate).toHaveBeenCalledWith('CaptureVoiceMemo', { goalId: 'goal-1' });
    });

    it('saves inline text note and calls createEvidence', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      const input = screen.getByLabelText('Write about your achievement');
      fireEvent.changeText(input, 'I mastered TypeScript generics!');
      fireEvent.press(screen.getByLabelText('Save Note'));
      expect(mockCreateEvidence).toHaveBeenCalledWith({
        goalId: 'goal-1',
        type: 'text',
        uri: 'content:text;I mastered TypeScript generics!',
        description: undefined,
      });
    });

    it('does not show confetti during evidence prompt phase', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      // "You did it!" is the celebration headline — should not appear
      expect(screen.queryByText('You did it!')).not.toBeOnTheScreen();
    });

    it('does not show Add Final Evidence button during evidence prompt', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText('Add Final Evidence')).not.toBeOnTheScreen();
    });

    it('has accessible prompt card', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(
        screen.getByLabelText('Almost there! Capture evidence for Learn TypeScript'),
      ).toBeOnTheScreen();
    });
  });

  describe('celebration phase (goal evidence exists)', () => {
    it('shows celebration immediately when goal already has evidence', () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('You did it!')).toBeOnTheScreen();
    });

    it('shows correct summary text with step count and goal title', () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(
        screen.getByText('All 3 steps completed for Learn TypeScript'),
      ).toBeOnTheScreen();
    });

    it('shows both action buttons', () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Add Final Evidence')).toBeOnTheScreen();
      expect(screen.getByLabelText(/View Your Journey/)).toBeOnTheScreen();
    });

    it('shows evidence list when evidence exists', () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('Goal Evidence Added')).toBeOnTheScreen();
      expect(screen.getByText('Reflection on learning')).toBeOnTheScreen();
    });

    it('navigates to capture screen when "Add Final Evidence" is tapped', () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText('Add Final Evidence'));
      expect(mockNavigate).toHaveBeenCalledWith('CapturePhoto', { goalId: 'goal-1' });
    });

    it('navigates to TimelineJourney when "View Your Journey" is tapped', () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText(/View Your Journey/));
      expect(mockNavigate).toHaveBeenCalledWith('TimelineJourney', { goalId: 'goal-1' });
    });

    it('has accessible celebration card with summary', () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(
        screen.getByLabelText(
          'Congratulations! All 3 steps completed for Learn TypeScript',
        ),
      ).toBeOnTheScreen();
    });

    it('shows Reopen Goal button when goal is completed', () => {
      setupQueries({ goal: { ...GOAL, status: 'completed' }, goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Reopen Goal')).toBeOnTheScreen();
    });

    it('does not show Reopen Goal button when goal is active', () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText('Reopen Goal')).not.toBeOnTheScreen();
    });

    it('calls uncompleteGoal and navigates to FocusMode on reopen', () => {
      setupQueries({ goal: { ...GOAL, status: 'completed' }, goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText('Reopen Goal'));
      expect(mockUncompleteGoal).toHaveBeenCalledWith('goal-1');
      expect(mockNavigate).toHaveBeenCalledWith('FocusMode', { goalId: 'goal-1' });
    });
  });

  describe('shared behavior', () => {
    it('shows "Goal not found" when goal does not exist', () => {
      setupQueries({ goal: null });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('Goal not found.')).toBeOnTheScreen();
    });

    it('navigates back when back button is pressed', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText('Go back'));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('renders "Complete" label in top bar and mode indicator', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getAllByText('Complete').length).toBeGreaterThanOrEqual(1);
    });

    it('calls useCreateBadge with the correct goalId', () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(mockUseCreateBadge).toHaveBeenCalledWith('goal-1', expect.objectContaining({ enabled: true }));
    });

    it('passes enabled: false to useCreateBadge during evidence-prompt phase', () => {
      setupQueries(); // no goal evidence => evidence-prompt phase
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(mockUseCreateBadge).toHaveBeenCalledWith('goal-1', expect.objectContaining({ enabled: false }));
    });

    it('passes enabled: true to useCreateBadge during celebration phase', () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE }); // has evidence => celebration phase
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(mockUseCreateBadge).toHaveBeenCalledWith('goal-1', expect.objectContaining({ enabled: true }));
    });
  });

  describe('badge creation lifecycle', () => {
    it('shows loading indicator while badge is being created', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'building', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Creating your badge...')).toBeOnTheScreen();
    });

    it('shows loading indicator during signing phase', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'signing', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Creating your badge...')).toBeOnTheScreen();
    });

    it('does not show loading indicator when done', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText('Creating your badge...')).not.toBeOnTheScreen();
    });

    it('shows error message when badge creation fails', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'error', error: 'crypto unavailable' });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Badge creation failed: crypto unavailable')).toBeOnTheScreen();
    });

    it('shows loading indicator during storing phase', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'storing', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Creating your badge...')).toBeOnTheScreen();
    });

    it('shows loading indicator during baking phase', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'baking', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Creating your badge...')).toBeOnTheScreen();
    });

    it('shows key unavailable message when status is no-key', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'no-key', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Badge could not be created: signing key unavailable')).toBeOnTheScreen();
    });

    it('still renders celebration content during badge creation', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'building', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('You did it!')).toBeOnTheScreen();
    });

    it('still renders celebration content when status is no-key', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'no-key', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('You did it!')).toBeOnTheScreen();
    });
  });

  describe('BadgeEarnedModal integration', () => {
    it('shows BadgeEarnedModal when badgeStatus is done and badge exists', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE, badge: BADGE_ROW, allBadges: [BADGE_ROW] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Badge earned')).toBeOnTheScreen();
    });

    it('does not show BadgeEarnedModal when badgeStatus is building', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'building', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE, badge: null, allBadges: [] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText('Badge earned')).not.toBeOnTheScreen();
    });

    it('does not show BadgeEarnedModal when no badge row yet', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE, badge: null, allBadges: [] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText('Badge earned')).not.toBeOnTheScreen();
    });

    it('shows first-badge microcopy when only one badge exists', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE, badge: BADGE_ROW, allBadges: [BADGE_ROW] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('First one. (noted.)')).toBeOnTheScreen();
    });

    it('shows neutral microcopy when multiple badges exist', () => {
      const otherBadge = { ...BADGE_ROW, id: 'badge-2', goalId: 'goal-2' };
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE, badge: BADGE_ROW, allBadges: [BADGE_ROW, otherBadge] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('Badge earned.')).toBeOnTheScreen();
    });

    it('dismisses modal on "Keep going"', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE, badge: BADGE_ROW, allBadges: [BADGE_ROW] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText('Keep going'));
      expect(screen.queryByText('First one. (noted.)')).not.toBeOnTheScreen();
    });

    it('navigates to BadgeDetail via parent tab navigator on "View Badge"', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE, badge: BADGE_ROW, allBadges: [BADGE_ROW] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText('View Badge'));
      expect(mockParentNavigate).toHaveBeenCalledWith('BadgesTab', {
        screen: 'BadgeDetail',
        params: { badgeId: 'badge-1' },
      });
    });

    it('does not re-show BadgeEarnedModal after dismissal and re-render', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE, badge: BADGE_ROW, allBadges: [BADGE_ROW] });
      const { rerender } = renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText('Keep going'));
      expect(screen.queryByLabelText('Badge earned')).not.toBeOnTheScreen();
      rerender(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText('Badge earned')).not.toBeOnTheScreen();
    });
  });
});

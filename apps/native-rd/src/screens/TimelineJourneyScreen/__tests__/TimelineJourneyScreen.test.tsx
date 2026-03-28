import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { TimelineJourneyScreen } from '../TimelineJourneyScreen';

// --- Mocks ---

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('../../../__tests__/mocks/navigation');
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      ...actual.useNavigation(),
      goBack: mockGoBack,
      navigate: mockNavigate,
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

jest.mock('../../../db', () => ({
  StepStatus: { pending: 'pending', completed: 'completed' },
  EvidenceType: {
    photo: 'photo',
    screenshot: 'screenshot',
    text: 'text',
    voice_memo: 'voice_memo',
    video: 'video',
    link: 'link',
    file: 'file',
  },
  goalsQuery: 'goalsQuery',
  stepsByGoalQuery: jest.fn((id: string) => `stepsByGoalQuery-${id}`),
  evidenceByGoalQuery: jest.fn((id: string) => `evidenceByGoalQuery-${id}`),
  evidenceByStepQuery: jest.fn((id: string) => `evidenceByStepQuery-${id}`),
  stepEvidenceByGoalQuery: jest.fn((id: string) => `stepEvidenceByGoalQuery-${id}`),
}));

const mockUseQuery = jest.fn();
jest.mock('@evolu/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  EvoluProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// --- Test Data ---

const GOAL = {
  id: 'goal-1',
  title: 'Learn TypeScript',
  description: 'Master the type system',
  status: 'active',
};

const MIXED_STEPS = [
  { id: 'step-1', title: 'Read docs', status: 'completed', ordinal: 0 },
  { id: 'step-2', title: 'Practice types', status: 'completed', ordinal: 1 },
  { id: 'step-3', title: 'Build project', status: 'pending', ordinal: 2 },
  { id: 'step-4', title: 'Write tests', status: 'pending', ordinal: 3 },
];

const STEP_EVIDENCE = [
  { id: 'ev-1', type: 'photo', description: 'Screenshot', uri: '/photo.jpg', stepId: 'step-1' },
];

const GOAL_EVIDENCE = [
  { id: 'ev-g1', type: 'text', description: 'Reflection note', uri: 'content:text;note' },
];

const routeProps = {
  route: {
    key: 'TimelineJourney-1',
    name: 'TimelineJourney' as const,
    params: { goalId: 'goal-1' },
  },
  navigation: {} as any,
};

function setupQueries({
  goal = GOAL,
  steps = MIXED_STEPS,
  goalEvidence = [] as object[],
  stepEvidence = [] as object[],
}: {
  goal?: object | null;
  steps?: object[];
  goalEvidence?: object[];
  stepEvidence?: object[];
} = {}) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === 'goalsQuery') return goal ? [goal] : [];
    if (typeof query === 'string' && query.startsWith('stepsByGoalQuery')) return steps;
    if (typeof query === 'string' && query.startsWith('evidenceByGoalQuery')) return goalEvidence;
    if (typeof query === 'string' && query.startsWith('stepEvidenceByGoalQuery')) return stepEvidence;
    if (typeof query === 'string' && query.startsWith('evidenceByStepQuery')) return stepEvidence;
    return [];
  });
}

// --- Tests ---

describe('TimelineJourneyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue([]);
  });

  it('renders goal title and description', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText('Learn TypeScript')).toBeOnTheScreen();
    expect(screen.getByText('Master the type system')).toBeOnTheScreen();
  });

  it('renders "Timeline" label in top bar and mode indicator', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getAllByText('Timeline').length).toBeGreaterThanOrEqual(1);
  });

  it('shows progress bar and completion label', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText('2 of 4 steps completed')).toBeOnTheScreen();
  });

  it('renders timeline steps', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText('Read docs')).toBeOnTheScreen();
    expect(screen.getByText('Practice types')).toBeOnTheScreen();
    expect(screen.getByText('Build project')).toBeOnTheScreen();
    expect(screen.getByText('Write tests')).toBeOnTheScreen();
  });

  it('renders finish line with "Goal Evidence" heading', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText('Goal Evidence')).toBeOnTheScreen();
  });

  it('shows goal evidence in finish line', () => {
    setupQueries({ goalEvidence: GOAL_EVIDENCE });
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText('Reflection note')).toBeOnTheScreen();
  });

  it('shows "No goal evidence yet" when no goal evidence', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText('No goal evidence yet')).toBeOnTheScreen();
  });

  it('"Back to Focus" navigates to FocusMode', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('Back to Focus'));
    expect(mockNavigate).toHaveBeenCalledWith('FocusMode', { goalId: 'goal-1' });
  });

  it('back button navigates back', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('step node press navigates to FocusMode', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('Go to step 1: Read docs'));
    expect(mockNavigate).toHaveBeenCalledWith('FocusMode', { goalId: 'goal-1' });
  });

  it('shows "Goal not found" when goal missing', () => {
    setupQueries({ goal: null });
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText('Goal not found.')).toBeOnTheScreen();
  });

  it('shows step evidence when expanded', () => {
    setupQueries({ stepEvidence: STEP_EVIDENCE });
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    // Expand first step
    fireEvent.press(screen.getByLabelText('Read docs, Done'));
    expect(screen.getByText('Screenshot')).toBeOnTheScreen();
  });
});

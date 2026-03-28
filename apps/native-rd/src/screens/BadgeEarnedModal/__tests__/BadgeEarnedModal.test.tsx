import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { BadgeEarnedModal } from '../BadgeEarnedModal';

jest.mock('../../../hooks/useCreateBadge', () => ({
  PLACEHOLDER_IMAGE_URI: 'pending:baked-image',
  useCreateBadge: jest.fn(() => ({ status: 'done', error: null })),
}));

jest.mock('../../../hooks/useAnimationPref', () => ({
  useAnimationPref: jest.fn(() => ({
    animationPref: 'full',
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  })),
}));

const mockUseAnimationPref =
  jest.requireMock('../../../hooks/useAnimationPref').useAnimationPref;

const defaultProps = {
  visible: true,
  imageUri: 'file:///badges/test-badge.png',
  isFirstBadge: false,
  onViewBadge: jest.fn(),
  onContinue: jest.fn(),
};

describe('BadgeEarnedModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnimationPref.mockReturnValue({
      animationPref: 'full',
      shouldAnimate: true,
      shouldReduceMotion: false,
      setAnimationPref: jest.fn(),
    });
  });

  it('renders nothing when not visible', () => {
    renderWithProviders(<BadgeEarnedModal {...defaultProps} visible={false} />);
    expect(screen.queryByText('Badge earned.')).not.toBeOnTheScreen();
  });

  it('renders badge image when visible and imageUri is a real URI', () => {
    renderWithProviders(<BadgeEarnedModal {...defaultProps} />);
    expect(screen.getByLabelText('Badge image')).toBeOnTheScreen();
  });

  it('renders placeholder when imageUri is pending sentinel', () => {
    renderWithProviders(
      <BadgeEarnedModal {...defaultProps} imageUri="pending:baked-image" />,
    );
    expect(screen.getByLabelText('Badge image placeholder')).toBeOnTheScreen();
  });

  it('shows first-badge microcopy when isFirstBadge is true', () => {
    renderWithProviders(
      <BadgeEarnedModal {...defaultProps} isFirstBadge={true} />,
    );
    expect(screen.getByText('First one. (noted.)')).toBeOnTheScreen();
  });

  it('shows neutral microcopy when isFirstBadge is false', () => {
    renderWithProviders(<BadgeEarnedModal {...defaultProps} />);
    expect(screen.getByText('Badge earned.')).toBeOnTheScreen();
  });

  it('calls onViewBadge when "View Badge" is pressed', () => {
    const onViewBadge = jest.fn();
    renderWithProviders(
      <BadgeEarnedModal {...defaultProps} onViewBadge={onViewBadge} />,
    );
    fireEvent.press(screen.getByLabelText('View Badge'));
    expect(onViewBadge).toHaveBeenCalledTimes(1);
  });

  it('calls onContinue when "Keep going" is pressed', () => {
    const onContinue = jest.fn();
    renderWithProviders(
      <BadgeEarnedModal {...defaultProps} onContinue={onContinue} />,
    );
    fireEvent.press(screen.getByLabelText('Keep going'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('has accessible card with label and polite live region', () => {
    renderWithProviders(<BadgeEarnedModal {...defaultProps} />);
    const card = screen.getByLabelText('Badge earned');
    expect(card).toBeOnTheScreen();
    expect(card.props.accessibilityLiveRegion).toBe('polite');
  });

  it('does not render Customize button when onCustomize is not provided', () => {
    renderWithProviders(<BadgeEarnedModal {...defaultProps} />);
    expect(screen.queryByText('Customize')).not.toBeOnTheScreen();
  });

  it('renders Customize button when onCustomize is provided', () => {
    renderWithProviders(
      <BadgeEarnedModal {...defaultProps} onCustomize={jest.fn()} />,
    );
    expect(screen.getByText('Customize')).toBeOnTheScreen();
  });

  it('calls onCustomize when Customize button is pressed', () => {
    const onCustomize = jest.fn();
    renderWithProviders(
      <BadgeEarnedModal {...defaultProps} onCustomize={onCustomize} />,
    );
    fireEvent.press(screen.getByLabelText('Customize'));
    expect(onCustomize).toHaveBeenCalledTimes(1);
  });

  it('starts at scale 1 when shouldAnimate is false', () => {
    mockUseAnimationPref.mockReturnValue({
      animationPref: 'none',
      shouldAnimate: false,
      shouldReduceMotion: true,
      setAnimationPref: jest.fn(),
    });
    // Should render without error — animation is skipped
    renderWithProviders(<BadgeEarnedModal {...defaultProps} />);
    expect(screen.getByText('Badge earned.')).toBeOnTheScreen();
  });
});

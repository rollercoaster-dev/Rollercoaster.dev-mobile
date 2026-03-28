import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';

const mockSetTheme = jest.fn();

jest.mock('../../../hooks/useTheme', () => {
  const actual = jest.requireActual('../../../hooks/useTheme');
  return {
    ...actual,
    useThemeContext: () => ({
      themeName: 'light-default' as const,
      theme: require('../../../__tests__/mocks/unistyles').mockTheme,
      isDark: false,
      variant: 'default' as const,
      setTheme: mockSetTheme,
    }),
  };
});

import { WelcomeScreen } from '../WelcomeScreen';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WelcomeScreen', () => {
  describe('content', () => {
    it('renders the app name', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(screen.getByText('rollercoaster.dev')).toBeOnTheScreen();
    });

    it('renders the correct tagline from spec', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(
        screen.getByText('Track your goals. Earn your badges. Everything stays on your phone.'),
      ).toBeOnTheScreen();
    });

    it('renders the ThemeSwitcher title', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(screen.getByText('Pick what feels right')).toBeOnTheScreen();
    });

    it('renders all 7 theme option labels', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(screen.getByText('The Full Ride')).toBeOnTheScreen();
      expect(screen.getByText('Night Ride')).toBeOnTheScreen();
      expect(screen.getByText('Bold Ink')).toBeOnTheScreen();
      expect(screen.getByText('Warm Studio')).toBeOnTheScreen();
      expect(screen.getByText('Still Water')).toBeOnTheScreen();
      expect(screen.getByText('Loud & Clear')).toBeOnTheScreen();
      expect(screen.getByText('Clean Signal')).toBeOnTheScreen();
    });

    it('renders "Get Started" button', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(screen.getByText('Get Started')).toBeOnTheScreen();
    });

    it('renders the settings reminder text', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(
        screen.getByText('You can always change it in Settings.'),
      ).toBeOnTheScreen();
    });
  });

  describe('interaction', () => {
    it('calls onGetStarted when "Get Started" is pressed', () => {
      const onGetStarted = jest.fn();
      renderWithProviders(<WelcomeScreen onGetStarted={onGetStarted} />);
      fireEvent.press(screen.getByText('Get Started'));
      expect(onGetStarted).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('"Get Started" button has accessibilityRole="button"', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      const button = screen.getByRole('button', { name: /get started/i });
      expect(button).toBeOnTheScreen();
    });

    it('theme options have accessibilityRole="radio"', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      const radios = screen.getAllByRole('radio');
      expect(radios.length).toBe(7);
    });

    it('theme options container has accessibilityRole="radiogroup"', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toBeOnTheScreen();
    });
  });
});

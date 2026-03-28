/**
 * Shared test utilities for component testing.
 *
 * Usage:
 *   import { renderWithProviders, screen, fireEvent } from '../__tests__/test-utils';
 */
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '../hooks/useTheme';
// EvoluProvider is mocked (see mocks/evolu-react.ts) — cast to bypass real type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EvoluProvider = require('@evolu/react').EvoluProvider as React.FC<{ children: React.ReactNode }>;
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ToastProvider } from '../components/Toast';
import { mockTheme } from './mocks/unistyles';
import type { ThemeName } from '../themes/compose';
import type { Variant } from '../themes/variants';

const defaultThemeContext = {
  themeName: 'light-default' as ThemeName,
  theme: mockTheme,
  isDark: false,
  variant: 'default' as Variant,
  setTheme: jest.fn(),
};

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider value={defaultThemeContext}>
      <EvoluProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <ToastProvider>{children}</ToastProvider>
          </NavigationContainer>
        </SafeAreaProvider>
      </EvoluProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from RTL for convenience
export * from '@testing-library/react-native';

/**
 * Storybook ESM mock for @evolu/react
 *
 * Provides stub implementations so components using useQuery,
 * EvoluProvider, and createUseEvolu can render in Storybook
 * without a real Evolu database.
 */
import React from 'react';

/** Returns an empty array — components treat this as "no rows". */
export const useQuery = (_query: unknown) => [] as unknown[];

/** Passthrough provider — no real Evolu context needed for stories. */
export function EvoluProvider({ children }: { value?: unknown; children: React.ReactNode }) {
  return children;
}

/** Returns a hook that returns the evolu instance passed in. */
export const createUseEvolu = (evolu: unknown) => () => evolu;

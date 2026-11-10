/**
 * Evolu instance + provider
 */
import React from "react";
import { createEvolu, SimpleName } from "@evolu/common";
import { EvoluProvider, createUseEvolu } from "@evolu/react";
import { evoluReactNativeDeps } from "@evolu/react-native/expo-sqlite";
import { Schema } from "./schema";

export const evolu = createEvolu(evoluReactNativeDeps)(Schema, {
  name: SimpleName.orThrow("rollercoaster-dev"),
  // Local-only. Omitting `transports` makes Evolu fall back to its default
  // relay (wss://free.evoluhq.com) and sync every install off the device,
  // which the privacy policy and Welcome copy promise never happens. Sync
  // stays disabled until it ships as an explicit opt-in (ADR-0003).
  transports: [],
});

export const useAppEvolu = createUseEvolu(evolu);

interface EvoluAppProviderProps {
  children: React.ReactNode;
}

export function EvoluAppProvider({
  children,
}: EvoluAppProviderProps): React.JSX.Element {
  return React.createElement(EvoluProvider, { value: evolu }, children);
}

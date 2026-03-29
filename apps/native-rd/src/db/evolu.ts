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

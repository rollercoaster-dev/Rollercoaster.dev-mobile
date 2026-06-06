// RN's auto-mock for Modal calls requireActual to read its displayName, which
// pulls in feature-flag native specs that crash in Node with
// "__fbBatchedBridgeConfig is not set". A visible-gated passthrough is enough
// for component tests and insulates every Modal-using test from peer deps
// (e.g. reanimated-color-picker) that drag in the real Modal at setup time.

import type { ReactNode } from "react";

jest.mock("react-native/Libraries/Modal/Modal", () => {
  const Modal = (props: { visible?: boolean; children?: ReactNode }) => {
    if (!props.visible) return null;
    return props.children;
  };
  Modal.displayName = "Modal";
  return { __esModule: true, default: Modal };
});

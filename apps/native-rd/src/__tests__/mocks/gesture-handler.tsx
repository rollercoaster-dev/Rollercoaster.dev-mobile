import React from "react";
import { View, type ViewProps } from "react-native";

type GestureEvent = {
  x: number;
  translationY?: number;
};
type GestureHandler = (event: GestureEvent, stateManager?: unknown) => void;

let beginHandler: GestureHandler | undefined;
let updateHandler: GestureHandler | undefined;

const createGesture = () => {
  const gesture: Record<string, unknown> = {};
  const chain = () => gesture;
  Object.assign(gesture, {
    onBegin: (handler: GestureHandler) => {
      beginHandler = handler;
      return gesture;
    },
    onUpdate: (handler: GestureHandler) => {
      updateHandler = handler;
      return gesture;
    },
    onStart: chain,
    onEnd: chain,
    onFinalize: chain,
    onTouchesMove: chain,
    minDuration: chain,
    manualActivation: chain,
  });
  return gesture;
};

export const Gesture = {
  Pan: createGesture,
  LongPress: createGesture,
  Simultaneous: (...gestures: unknown[]) => ({ gestures }),
};

export function GestureDetector({ children }: { children: React.ReactNode }) {
  return children;
}

export function GestureHandlerRootView({
  children,
  ...props
}: ViewProps & { children?: React.ReactNode }) {
  return <View {...props}>{children}</View>;
}

export function fireGesture(phase: "begin" | "update", event: GestureEvent) {
  (phase === "begin" ? beginHandler : updateHandler)?.(event);
}

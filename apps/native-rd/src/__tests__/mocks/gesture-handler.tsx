import React from "react";

type GestureHandler = (event: { x: number }) => void;

let beginHandler: GestureHandler | undefined;
let updateHandler: GestureHandler | undefined;

const createGesture = () => {
  const gesture = {
    onBegin: (handler: GestureHandler) => {
      beginHandler = handler;
      return gesture;
    },
    onUpdate: (handler: GestureHandler) => {
      updateHandler = handler;
      return gesture;
    },
  };
  return gesture;
};

export const Gesture = {
  Pan: createGesture,
};

export function GestureDetector({ children }: { children: React.ReactNode }) {
  return children;
}

export function fireGesture(phase: "begin" | "update", event: { x: number }) {
  (phase === "begin" ? beginHandler : updateHandler)?.(event);
}

import React from "react";

const createGesture = () => {
  const gesture = {
    onBegin: () => gesture,
    onUpdate: () => gesture,
  };
  return gesture;
};

export const Gesture = {
  Pan: createGesture,
};

export function GestureDetector({ children }: { children: React.ReactNode }) {
  return children;
}

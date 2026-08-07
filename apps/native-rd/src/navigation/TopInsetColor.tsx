import React, { createContext, useContext, useEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";

type SetTopInsetColor = (color: string | null) => void;

const TopInsetColorContext = createContext<SetTopInsetColor>(() => {});

/**
 * Lets a screen repaint the device top-inset strip that App.tsx draws above the
 * navigator.
 *
 * App.tsx paints that strip with `chrome.screenHeaderBg` so it reads as a
 * continuation of the ScreenHeader band below it. The navigator content is
 * offset by `insets.top`, so a screen can never cover the strip itself — a
 * full-bleed surface (the badge wall) would otherwise sit under an orphaned
 * header-colored band it has nothing to do with. This is the opt-out.
 */
export function TopInsetColorProvider({
  children,
  onChange,
}: {
  children: React.ReactNode;
  onChange: SetTopInsetColor;
}) {
  return (
    <TopInsetColorContext.Provider value={onChange}>
      {children}
    </TopInsetColorContext.Provider>
  );
}

/**
 * Paint the top-inset strip `color` while this screen is focused; pass `null`
 * to leave it at the default header color. Reverts on blur/unmount, so pushing
 * a detail screen or switching tabs restores the header-colored strip.
 */
export function useTopInsetColor(color: string | null) {
  const setColor = useContext(TopInsetColorContext);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused || color === null) return;
    setColor(color);
    return () => setColor(null);
  }, [color, isFocused, setColor]);
}

/**
 * State holder for {@link TopInsetColorProvider} — App.tsx owns the value and
 * paints with it; screens set it through the context.
 */
export function useTopInsetColorState() {
  const [topInsetColor, setTopInsetColor] = useState<string | null>(null);
  return { topInsetColor, setTopInsetColor };
}

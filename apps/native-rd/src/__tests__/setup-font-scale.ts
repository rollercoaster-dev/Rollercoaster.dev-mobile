// The RN jest preset reports fontScale 2 (see its DeviceInfo mock), so every
// test rendered at 200% Dynamic Type without saying so. Pin 100%; tests that
// need another size call mockFontScale() from ./fontScale.
import { setFontScale } from "./fontScale";

setFontScale(1);

afterEach(() => {
  setFontScale(1);
});

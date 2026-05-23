import type { i18n as I18nInstance } from "i18next";

import { Logger } from "../shims/rd-logger";

const logger = new Logger("i18n.tolgee");

// Dev-only Tolgee SDK wiring for in-context editing on Expo web (#136).
// The browser-targeted @tolgee/web is required lazily so production bundles
// can dead-code-strip the dependency and so the module never loads under iOS /
// Android — touching `window` at module-load on a JSC/Hermes runtime would
// throw. Callers MUST gate the call with `__DEV__` and an explicit env var.
export function wrapWithTolgee(i18n: I18nInstance): I18nInstance {
  const apiUrl = process.env.EXPO_PUBLIC_TOLGEE_API_URL;
  const apiKey = process.env.EXPO_PUBLIC_TOLGEE_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error(
      "Tolgee enabled but EXPO_PUBLIC_TOLGEE_API_URL or EXPO_PUBLIC_TOLGEE_API_KEY is missing",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tolgeeMod =
    require("@tolgee/i18next") as typeof import("@tolgee/i18next");
  const { withTolgee, Tolgee, I18nextPlugin, DevTools } = tolgeeMod;

  const tolgee = Tolgee().use(DevTools()).use(I18nextPlugin()).init({
    apiUrl,
    apiKey,
  });

  logger.info(`Tolgee SDK enabled, apiUrl=${apiUrl}`);
  return withTolgee(i18n, tolgee);
}

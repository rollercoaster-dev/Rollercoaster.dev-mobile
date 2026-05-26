import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

import { selectSupportedLanguage } from "./language";
import { Logger } from "../shims/rd-logger";

import enCommon from "./resources/en/common.json";
import enWelcome from "./resources/en/welcome.json";
import enNewGoal from "./resources/en/newGoal.json";
import enSettings from "./resources/en/settings.json";
import enGoals from "./resources/en/goals.json";
import enFocusMode from "./resources/en/focusMode.json";
import enCapturePhoto from "./resources/en/capturePhoto.json";
import enCaptureVideo from "./resources/en/captureVideo.json";
import enCaptureVoice from "./resources/en/captureVoice.json";
import enCaptureText from "./resources/en/captureText.json";
import enCaptureFile from "./resources/en/captureFile.json";
import enCaptureLink from "./resources/en/captureLink.json";
import enPermissions from "./resources/en/permissions.json";
import enBadges from "./resources/en/badges.json";
import enBadgeDesigner from "./resources/en/badgeDesigner.json";
import enEditGoal from "./resources/en/editGoal.json";
import enTimelineJourney from "./resources/en/timelineJourney.json";
import enCompletion from "./resources/en/completion.json";
import enBadgeDetail from "./resources/en/badgeDetail.json";

import deCommon from "./resources/de/common.json";
import deWelcome from "./resources/de/welcome.json";
import deNewGoal from "./resources/de/newGoal.json";
import deSettings from "./resources/de/settings.json";
import deGoals from "./resources/de/goals.json";
import deFocusMode from "./resources/de/focusMode.json";
import deCapturePhoto from "./resources/de/capturePhoto.json";
import deCaptureVideo from "./resources/de/captureVideo.json";
import deCaptureVoice from "./resources/de/captureVoice.json";
import deCaptureText from "./resources/de/captureText.json";
import deCaptureFile from "./resources/de/captureFile.json";
import deCaptureLink from "./resources/de/captureLink.json";
import dePermissions from "./resources/de/permissions.json";
import deBadges from "./resources/de/badges.json";
import deBadgeDesigner from "./resources/de/badgeDesigner.json";
import deEditGoal from "./resources/de/editGoal.json";
import deTimelineJourney from "./resources/de/timelineJourney.json";
import deCompletion from "./resources/de/completion.json";
import deBadgeDetail from "./resources/de/badgeDetail.json";

import pseudoCommon from "./resources/pseudo/common.json";
import pseudoWelcome from "./resources/pseudo/welcome.json";
import pseudoNewGoal from "./resources/pseudo/newGoal.json";
import pseudoSettings from "./resources/pseudo/settings.json";
import pseudoGoals from "./resources/pseudo/goals.json";
import pseudoFocusMode from "./resources/pseudo/focusMode.json";
import pseudoCapturePhoto from "./resources/pseudo/capturePhoto.json";
import pseudoCaptureVideo from "./resources/pseudo/captureVideo.json";
import pseudoCaptureVoice from "./resources/pseudo/captureVoice.json";
import pseudoCaptureText from "./resources/pseudo/captureText.json";
import pseudoCaptureFile from "./resources/pseudo/captureFile.json";
import pseudoCaptureLink from "./resources/pseudo/captureLink.json";
import pseudoPermissions from "./resources/pseudo/permissions.json";
import pseudoBadges from "./resources/pseudo/badges.json";
import pseudoBadgeDesigner from "./resources/pseudo/badgeDesigner.json";
import pseudoEditGoal from "./resources/pseudo/editGoal.json";
import pseudoTimelineJourney from "./resources/pseudo/timelineJourney.json";
import pseudoCompletion from "./resources/pseudo/completion.json";
import pseudoBadgeDetail from "./resources/pseudo/badgeDetail.json";

// Adding a namespace? Steps:
//   1. Add the en + de + pseudo JSON files under resources/{en,de,pseudo}/<name>.json
//      (German bundle stays `{}` — the sync bot fills it from en/)
//   2. Add imports above
//   3. Add the entry to NAMESPACES and all three resource bundles below
//   4. Add the type alias in i18next.d.ts
//   5. Add the voice register at resources/_register/<name>.yml — required by
//      the i18n sync workflow (see apps/native-rd/docs/plans/i18n-llm-sync.md).
//      Mirror an existing file like badgeDesigner.yml; YAML list items must
//      not start with a double-quote (the parser breaks on multi-line items
//      that lead with `"…"`).
// The script in scripts/generate-pseudo-locale.ts auto-discovers files in
// resources/en/ — no need to update it. German `{}` stubs let i18next register
// the bundle; entries fall back to `en` until the sync bot lands German copy.
export const NAMESPACES = [
  "common",
  "welcome",
  "newGoal",
  "settings",
  "goals",
  "focusMode",
  "capturePhoto",
  "captureVideo",
  "captureVoice",
  "captureText",
  "captureFile",
  "captureLink",
  "permissions",
  "badges",
  "badgeDesigner",
  "editGoal",
  "timelineJourney",
  "completion",
  "badgeDetail",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

const resources = {
  en: {
    common: enCommon,
    welcome: enWelcome,
    newGoal: enNewGoal,
    settings: enSettings,
    goals: enGoals,
    focusMode: enFocusMode,
    capturePhoto: enCapturePhoto,
    captureVideo: enCaptureVideo,
    captureVoice: enCaptureVoice,
    captureText: enCaptureText,
    captureFile: enCaptureFile,
    captureLink: enCaptureLink,
    permissions: enPermissions,
    badges: enBadges,
    badgeDesigner: enBadgeDesigner,
    editGoal: enEditGoal,
    timelineJourney: enTimelineJourney,
    completion: enCompletion,
    badgeDetail: enBadgeDetail,
  },
  de: {
    common: deCommon,
    welcome: deWelcome,
    newGoal: deNewGoal,
    settings: deSettings,
    goals: deGoals,
    focusMode: deFocusMode,
    capturePhoto: deCapturePhoto,
    captureVideo: deCaptureVideo,
    captureVoice: deCaptureVoice,
    captureText: deCaptureText,
    captureFile: deCaptureFile,
    captureLink: deCaptureLink,
    permissions: dePermissions,
    badges: deBadges,
    badgeDesigner: deBadgeDesigner,
    editGoal: deEditGoal,
    timelineJourney: deTimelineJourney,
    completion: deCompletion,
    badgeDetail: deBadgeDetail,
  },
  pseudo: {
    common: pseudoCommon,
    welcome: pseudoWelcome,
    newGoal: pseudoNewGoal,
    settings: pseudoSettings,
    goals: pseudoGoals,
    focusMode: pseudoFocusMode,
    capturePhoto: pseudoCapturePhoto,
    captureVideo: pseudoCaptureVideo,
    captureVoice: pseudoCaptureVoice,
    captureText: pseudoCaptureText,
    captureFile: pseudoCaptureFile,
    captureLink: pseudoCaptureLink,
    permissions: pseudoPermissions,
    badges: pseudoBadges,
    badgeDesigner: pseudoBadgeDesigner,
    editGoal: pseudoEditGoal,
    timelineJourney: pseudoTimelineJourney,
    completion: pseudoCompletion,
    badgeDetail: pseudoBadgeDetail,
  },
} as const;

const logger = new Logger("i18n");

// Warn in the dev client when a key is missing so refactors don't silently render
// the key path as the UI string. Skipped under NODE_ENV=test to keep i18n.test.ts
// (which intentionally exercises the missing-key path) quiet.
const warnMissingKeys = __DEV__ && process.env.NODE_ENV !== "test";

// eslint-disable-next-line import/no-named-as-default-member -- i18next.use() is the documented chainable init API
i18n.use(initReactI18next).init({
  resources,
  lng: selectSupportedLanguage(getLocales()),
  fallbackLng: "en",
  supportedLngs: ["en", "de", "pseudo"],
  nonExplicitSupportedLngs: true,
  defaultNS: "common",
  ns: NAMESPACES,
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  saveMissing: warnMissingKeys,
  missingKeyHandler: warnMissingKeys
    ? (lngs, ns, key) => {
        // de bundles are intentional `{}` stubs until per-screen German copy
        // lands (#67–#72); falling back to en is expected, not a bug. Only
        // warn when en is also missing the key — the real "refactor broke a
        // key" signal.
        if (lngs.every((l) => l === "de")) return;
        logger.warn(
          `Missing key "${key}" in namespace "${ns}" (${lngs.join(", ")})`,
        );
      }
    : undefined,
});

export { i18n };

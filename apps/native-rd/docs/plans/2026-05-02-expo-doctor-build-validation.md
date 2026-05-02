# Expo Doctor Build Validation

**Date:** 2026-05-02  
**Status:** In progress  
**Owner:** Codex

## Summary

Close the remaining native Expo build-readiness issues before preview/user-testing work continues. The goal is to get `expo-doctor` and `expo install --check` to a state where only the known monorepo exceptions remain.

## Current Findings

Local validation already confirmed:

- `bun run type-check` passes
- `bun run test:ci` passes
- `bun run test:a11y:json` passes
- `bun run lint` passes with warnings only
- a local Release simulator build succeeds and produces `main.jsbundle`

`expo-doctor` and `expo install --check` still report:

- missing peers for `expo-asset`, `@react-native-community/datetimepicker`, and `@react-native-community/slider`
- Expo-native version mismatches for `react-native-gesture-handler`, `react-native-keyboard-controller`, `react-native-svg`, and `react-native-worklets`
- duplicate Expo native modules in local `node_modules`
- Metro symlink override warning
- SDK mismatches for Jest and TypeScript, which are documented exceptions for this repo and not part of the native readiness fix

After a clean reinstall of the app-local dependencies, the duplicate native-module warning still reproduces under the Bun workspace layout. Treat that as a local tool/layout warning for now, not an app-code regression.

## Implementation Plan

- Add the missing native peer dependencies required by the current app graph.
- Align the Expo-native packages to the SDK-expected versions.
- Refresh the lockfile and native pods if dependency updates require it.
- Re-run `expo-doctor` and `expo install --check` after the install update.
- If duplicate native module warnings remain, clean the local install artifacts and reinstall before changing app code.

## Acceptance Criteria

- `bunx expo-doctor` passes except for the documented Jest/TypeScript and Metro symlink exceptions.
- `npx expo install --check` passes except for the documented Jest/TypeScript exceptions, if any remain.
- The app still passes the existing local test and release-build checks.

## Notes

- Do not downgrade Jest, `@types/jest`, or TypeScript as part of this work.
- Keep the Metro symlink handling in place unless the build itself proves it must change.
- This plan tracks build validation only; badge creation remains tracked separately in issue `#982`.

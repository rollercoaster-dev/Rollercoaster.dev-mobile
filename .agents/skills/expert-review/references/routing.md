# Routing

Which experts the `expert-review` skill dispatches for a diff. Deterministic on
purpose: same diff, same panel.

An expert runs when **any** changed file matches one of its globs **or** a
content trigger matches the added lines (`+` lines of the diff). Each expert is
handed only the files that matched it — plus, for content triggers, the file
the trigger hit. Deleted files route like any other.

`A/` below is shorthand for `apps/native-rd/`. "Test file" means anything under
`**/__tests__/**`, `*.test.{ts,tsx}`, or `A/e2e/**`.

## Always on

| Expert               | Files handed over                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review-correctness` | every non-generated changed file except docs and agent tooling (see gate)                                                                                                                                                                    |
| `review-tests`       | every changed non-generated source file (`*.{ts,tsx,js}`) **and** every changed test file. Production changes with no test change still go here — that is the "new behaviour without a test" case; the expert finds existing coverage itself |

## Path triggers

| Expert                        | Globs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review-ui`                   | `A/src/{components,screens,navigation,badges}/**/*.{ts,tsx}`, `A/src/{styles,themes}/**`, `A/src/stories/**`, `A/unistyles.ts`, `A/App.tsx`, `packages/design-tokens/src/**`, `packages/design-tokens/build-unistyles.js` — test files excluded                                                                                                                                                                                                                                                 |
| `review-accessibility`        | `A/src/{components,screens,navigation,badges}/**/*.tsx`, `A/src/themes/**`, `A/src/utils/{accessibility,accessibilityFocus,animation,haptics,keyboard}.ts`, `A/src/hooks/{useAnimationPref,useDensity,useTheme}.ts`, `packages/design-tokens/src/**`, `A/src/__tests__/accessibility.test.tsx`, `A/src/themes/__tests__/contrast.test.ts`                                                                                                                                                       |
| `review-nd-guardrails`        | `A/src/i18n/resources/en/**`, `A/src/types/steps.ts`, `A/src/db/{goalSeal,evidenceGate,queries}.ts`, `A/src/screens/{FocusModeScreen,GoalsScreen,TimelineJourneyScreen,CompletionFlowScreen,EditModeScreen,NewGoalScreen,WelcomeScreen}/**`, `A/src/components/{GoalCard,EditGoalView,NewGoalWizard,ProgressBar,ProgressRing,FocusProgressStrip,ProofSpine,FinishLine,EmptyState,ConfirmDeleteModal}/**`, `A/src/components/*Status*/**`, `A/src/components/*Timing*/**`, `A/docs/decisions/**` |
| `review-data-model`           | `A/src/db/**`, `A/src/stores/**`, `A/src/utils/{evoluMutation,localDay,evidenceCleanup,fileStorage,imageStorage,videoStorage}.ts`, `A/src/hooks/use{AllEvidenceForGoal,UserSettingsRow,ThemePersistence,FirstLaunch,CreateBadge}.ts`, `A/docs/architecture/{data-model,local-first-sync,theme-persistence}.md`                                                                                                                                                                                  |
| `review-openbadges`           | `packages/openbadges-core/**`, `A/src/crypto/**`, `A/src/badges/{credentialBuilder,vcJwt,png-baking,png-chunk-utils,badgeStorage,captureBadge,badgeImageGenerator,badgeFilename}.ts`, `A/src/hooks/{useCreateBadge,useBadgeExport,useUserKey}.ts`, `A/scripts/verify-badge.ts`, `A/docs/architecture/{openbadges-core,ob3-compliance-status,personal-data-verification}.md`                                                                                                                     |
| `review-privacy-security`     | `A/src/crypto/**`, `A/src/services/sentry*.ts`, `A/src/hooks/useBadgeExport.ts`, `A/src/utils/{url,fileStorage,imageStorage,videoStorage,evidenceCleanup,evidenceViewers}.ts*`, `A/src/screens/{CaptureLinkScreen,CaptureFile,EvidenceViewerScreen}/**`, `A/app.config.js`, `A/app.json`, `A/plugins/**`, `.github/workflows/**`                                                                                                                                                                |
| `review-i18n-copy`            | `A/src/i18n/**` (except generated `pseudo/`; `de/` see below), `A/locales/**`, `A/scripts/i18n/**`, `A/scripts/generate-pseudo-locale.ts`, `.github/workflows/i18n-sync.yml`                                                                                                                                                                                                                                                                                                                    |
| `review-build-release`        | `A/{app.config.js,app.json,eas.json,store.config.base.json,package.json,metro.config.js,babel.config.js,jest.config.js,jest.resolver.js,eslint.config.js,index.ts,polyfills.ts}`, `A/tsconfig*.json`, `A/plugins/**`, `A/scripts/**` (except `i18n/`), `A/src/eslint-rules/**`, `package.json`, `turbo.json`, `packages/*/package.json`, `packages/*/tsconfig*.json`, `.github/**`, `.husky/**`, `A/docs/release.md`, `docs/architecture/ci-contract.md`                                        |
| `review-production-readiness` | `A/src/services/**`, `A/src/components/ErrorBoundary/**`, `A/App.tsx`, `A/index.ts`, `A/src/hooks/{useAppStateGuard,useAudioRecorder,useStickToScrollEnd,useUnsavedExitGuard,useFonts}.ts`, `A/src/components/{AudioPlayer,AudioPlayerModal,Confetti,CelebrationSparkles,PhotoViewerModal}/**`                                                                                                                                                                                                  |
| `review-docs`                 | `**/*.md` (except generated / skipped below), `.claude/**`, `.agents/**`                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Content triggers (on added lines)

| Pattern (regex, added lines)                                                                                                                                                   | Adds expert                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `StyleSheet\.create\|useUnistyles\|shadowStyle\|theme\.(colors\|space\|radius\|shadows)\|Platform\.(OS\|select)\|#[0-9a-fA-F]{3,8}\b\|rgba?\(`                                 | `review-ui`                   |
| `Pressable\|Touchable\|onPress\|onLongPress\|accessib\|hitSlop\|<Modal\|AnimatedSheet\|withTiming\|withSpring\|Animated\.\|numberOfLines\|allowFontScaling\|AccessibilityInfo` | `review-accessibility`        |
| `(?i)overdue\|streak\|missed\|behind\|fail\|late\b\|deadline\|due\b\|locked\|score\|lazy\|should have\|days? (ago\|away\|left)\|notification\|reminder`                        | `review-nd-guardrails`        |
| `useQuery\|createQuery\|evolu\.\|\.(insert\|update\|upsert)\(\|isDeleted\|selectFrom\|id\("\|nullOr\(\|SqliteBoolean\|sqliteTrue`                                              | `review-data-model`           |
| `KeyProvider\|SecureStore\|jose\|importJWK\|exportJWK\|SignJWT\|@context\|VerifiableCredential\|OpenBadgeCredential\|credentialSubject\|openbadges-core\|iTXt`                 | `review-openbadges`           |
| `Sentry\.\|captureException\|setUser\|setContext\|addBreadcrumb\|Linking\.\|openURL\|WebBrowser\|Share\.\|expo-sharing\|FileSystem\.\|Directory\|EXPO_PUBLIC_\|[Pp]ermission`  | `review-privacy-security`     |
| `\bt\(\|useTranslation\|i18n\.\|<Trans\|accessibilityLabel=\|accessibilityHint=\|placeholder=`                                                                                 | `review-i18n-copy`            |
| `expo-updates\|runtimeVersion\|requireNativeModule\|NativeModules\|TurboModule\|process\.env\.`                                                                                | `review-build-release`        |
| `addEventListener\|addListener\|AppState\|setInterval\|setTimeout\|FlatList\|FlashList\|SectionList\|logger\.(error\|warn)\|console\.\|Sentry\.`                               | `review-production-readiness` |

## Generated / skipped files

Never hand these to an expert: `bun.lock` (any), `**/CHANGELOG.md`,
`A/src/i18n/resources/pseudo/**`, `packages/design-tokens/css/**`,
`**/dist/**`, `**/__snapshots__/**`, `A/prototypes/**`, `A/e2e/reports/**`,
binary assets (`*.{png,jpg,jpeg,gif,webp,ttf,otf,mp4,mov,json.gz}`),
`*.min.*`.

**Bot-synced German.** `A/src/i18n/resources/de/**` is written by
`.github/workflows/i18n-sync.yml` from `en/`. Skip it when the commit that
touched it is the bot's (`chore(native-rd/i18n): sync de/ translations`) or
the diff also changes the matching `en/` file. Otherwise route it to
`review-i18n-copy` alone — that is a hand edit the next sync will overwrite.

**Prebuild output.** `A/ios/**` and `A/android/**` are gitignored. If one shows
up in the diff, route it to `review-build-release`.

## Gate

After removing the skipped files:

- **Nothing left, or only lockfiles** → stop and say so.
- **Every remaining file is docs or agent tooling** (`**/*.md`, `.claude/**`,
  `.agents/**`, `.gitignore`, `.prettierignore`) → `review-docs` alone, plus
  `review-nd-guardrails` when an ADR changed.

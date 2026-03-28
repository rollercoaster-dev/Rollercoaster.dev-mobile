# Saved Tasks - Iteration A Prototypes

## Phase 1: UI Library Prototypes

### Task 8: Create Tamagui UI prototype (was in_progress)
- Location: `prototypes/ui-tamagui/`
- Initialize Expo project with Tamagui
- Create tamagui.config.ts with all 7 themes
- BadgeCard component, ThemeSwitcher component, test screen
- Accessibility audit with VoiceOver testing

### Task 9: Create Gluestack + NativeWind UI prototype
- Location: `prototypes/ui-gluestack/`
- Initialize Expo project with NativeWind v4 and Gluestack UI v2
- Import Tailwind config from design-tokens package
- BadgeCard component, ThemeSwitcher component, test screen
- Verify accessibility features work out-of-box

## Phase 2: Sync Layer Prototypes

### Task 10: Create PowerSync sync prototype
- Location: `prototypes/sync-powersync/`
- Configure Drizzle ORM integration
- Define Goal/Step/Evidence schema
- Implement CRUD operations, test offline behavior
- Document E2EE path

### Task 11: Create Evolu sync prototype
- Location: `prototypes/sync-evolu/`
- Configure Kysely schema
- Same Goal/Step/Evidence schema and CRUD operations
- Test offline + sync, verify E2EE is built-in

## Context
- PR #721 (design-tokens) is pending CI - fixes pushed
- Design tokens package ready in monorepo at `packages/design-tokens/`

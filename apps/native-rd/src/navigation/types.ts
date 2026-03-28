import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ---------------------------------------------------------------------------
// Stack param lists
// ---------------------------------------------------------------------------

/** Shared params for all evidence capture screens */
export type CaptureParams = { goalId: string; stepId?: string };

/** Evidence capture routes — single source of truth */
type CaptureRoutes = {
  CapturePhoto: CaptureParams;
  CaptureVideo: CaptureParams;
  CaptureVoiceMemo: CaptureParams;
  CaptureTextNote: CaptureParams;
  CaptureLink: CaptureParams;
  CaptureFile: CaptureParams;
};

/** Screen names that accept CaptureParams (derived from CaptureRoutes) */
export type CaptureScreenName = keyof CaptureRoutes;

export type GoalsStackParamList = {
  Goals: undefined;
  FocusMode: { goalId: string };
  CompletionFlow: { goalId: string };
  TimelineJourney: { goalId: string };
  NewGoal: undefined;
  EditMode: { goalId: string; cameFromFocus?: boolean };
  BadgeDesigner:
    | { mode: 'new-goal'; goalId: string }
    | { mode: 'redesign'; badgeId: string };
} & CaptureRoutes;

export type BadgesStackParamList = {
  Badges: undefined;
  BadgeDetail: { badgeId: string };
  BadgeDesigner: { badgeId: string };
};

export type SettingsStackParamList = {
  Settings: undefined;
};

// ---------------------------------------------------------------------------
// Root tab param list
// ---------------------------------------------------------------------------

export type RootTabParamList = {
  GoalsTab: NavigatorScreenParams<GoalsStackParamList>;
  BadgesTab: NavigatorScreenParams<BadgesStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

// ---------------------------------------------------------------------------
// Screen prop types (for use in screen components)
// ---------------------------------------------------------------------------

export type GoalsScreenProps = NativeStackScreenProps<GoalsStackParamList, 'Goals'>;
export type FocusModeScreenProps = NativeStackScreenProps<GoalsStackParamList, 'FocusMode'>;
export type NewGoalScreenProps = NativeStackScreenProps<GoalsStackParamList, 'NewGoal'>;
export type EditModeScreenProps = NativeStackScreenProps<GoalsStackParamList, 'EditMode'>;
export type CompletionFlowScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CompletionFlow'>;
export type TimelineJourneyScreenProps = NativeStackScreenProps<GoalsStackParamList, 'TimelineJourney'>;

export type BadgesScreenProps = NativeStackScreenProps<BadgesStackParamList, 'Badges'>;
export type BadgeDetailScreenProps = NativeStackScreenProps<BadgesStackParamList, 'BadgeDetail'>;
export type BadgeDesignerScreenProps = NativeStackScreenProps<BadgesStackParamList, 'BadgeDesigner'>;
export type GoalsBadgeDesignerScreenProps = NativeStackScreenProps<GoalsStackParamList, 'BadgeDesigner'>;

export type SettingsScreenProps = NativeStackScreenProps<SettingsStackParamList, 'Settings'>;

export type CapturePhotoScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CapturePhoto'>;
export type CaptureVoiceMemoScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CaptureVoiceMemo'>;
export type CaptureTextNoteScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CaptureTextNote'>;
export type CaptureLinkScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CaptureLink'>;
export type CaptureVideoScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CaptureVideo'>;
export type CaptureFileScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CaptureFile'>;

export type RootTabProps = BottomTabScreenProps<RootTabParamList>;

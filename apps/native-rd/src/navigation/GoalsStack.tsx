import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GoalsScreen } from "../screens/GoalsScreen";

import { FocusModeScreen } from "../screens/FocusModeScreen";
import { NewGoalScreen } from "../screens/NewGoalScreen";
import { CapturePhoto } from "../screens/CapturePhoto";
import { CapturePlaceholder } from "../screens/CapturePlaceholder";
import { CaptureVideoScreen } from "../screens/CaptureVideoScreen";
import { VoiceMemoScreen } from "../screens/VoiceMemoScreen";
import { CaptureFile } from "../screens/CaptureFile";
import { CaptureLinkScreen } from "../screens/CaptureLinkScreen";
import { CaptureTextNote } from "../screens/CaptureTextNote";
import { EditModeScreen } from "../screens/EditModeScreen";
import { CompletionFlowScreen } from "../screens/CompletionFlowScreen";
import { TimelineJourneyScreen } from "../screens/TimelineJourneyScreen";
import { BadgeDesignerScreen } from "../screens/BadgeDesignerScreen";
import { EvidenceViewerScreen } from "../screens/EvidenceViewerScreen";
import type { GoalsStackParamList } from "./types";

const Stack = createNativeStackNavigator<GoalsStackParamList>();

export function GoalsStack() {
  return (
    <Stack.Navigator
      initialRouteName="Goals"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="FocusMode" component={FocusModeScreen} />
      <Stack.Screen name="CompletionFlow" component={CompletionFlowScreen} />
      <Stack.Screen name="TimelineJourney" component={TimelineJourneyScreen} />
      <Stack.Screen name="EvidenceViewer" component={EvidenceViewerScreen} />
      {/* presentation: "modal" is a true full-screen native modal on both
          platforms, so it already covers the tab bar — the wizard needs no
          tabBarStyle plumbing of its own (D1). */}
      <Stack.Screen
        name="NewGoal"
        component={NewGoalScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="CapturePhoto" component={CapturePhoto} />
      <Stack.Screen name="CaptureVideo" component={CaptureVideoScreen} />
      <Stack.Screen name="CaptureVoiceMemo" component={VoiceMemoScreen} />
      <Stack.Screen name="CaptureTextNote" component={CaptureTextNote} />
      <Stack.Screen name="CaptureLink" component={CaptureLinkScreen} />
      <Stack.Screen name="CaptureFile" component={CaptureFile} />
      <Stack.Screen name="EditMode" component={EditModeScreen} />
      {/* BadgeDesignerScreen handles GoalsStack params (mode: 'new-goal'|'redesign') via runtime check */}
      <Stack.Screen
        name="BadgeDesigner"
        component={BadgeDesignerScreen as React.ComponentType<unknown>}
      />
    </Stack.Navigator>
  );
}

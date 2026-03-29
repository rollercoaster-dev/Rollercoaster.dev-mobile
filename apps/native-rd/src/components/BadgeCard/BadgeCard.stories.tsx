import React from "react";
import { View } from "react-native";
import { BadgeCard } from "./BadgeCard";

export default {
  title: "Components/BadgeCard",
  component: BadgeCard,
};

export function Default() {
  return (
    <View style={{ padding: 16 }}>
      <BadgeCard
        title="First Goal Completed"
        earnedDate="Jan 28, 2026"
        evidenceCount={3}
        onPress={() => console.log("Badge pressed")}
      />
    </View>
  );
}

export function SingleEvidence() {
  return (
    <View style={{ padding: 16 }}>
      <BadgeCard
        title="Quick Learner"
        earnedDate="Feb 1, 2026"
        evidenceCount={1}
        onPress={() => console.log("Badge pressed")}
      />
    </View>
  );
}

export function LongTitle() {
  return (
    <View style={{ padding: 16 }}>
      <BadgeCard
        title="Completed an incredibly challenging learning journey"
        earnedDate="Dec 15, 2025"
        evidenceCount={12}
        onPress={() => console.log("Badge pressed")}
      />
    </View>
  );
}

export function Compact() {
  return (
    <View style={{ padding: 16 }}>
      <BadgeCard
        title="Badge"
        earnedDate="Jan 1, 2026"
        evidenceCount={2}
        size="compact"
        onPress={() => console.log("Badge pressed")}
      />
    </View>
  );
}

export function Spacious() {
  return (
    <View style={{ padding: 16 }}>
      <BadgeCard
        title="Badge"
        earnedDate="Jan 1, 2026"
        evidenceCount={2}
        size="spacious"
        onPress={() => console.log("Badge pressed")}
      />
    </View>
  );
}

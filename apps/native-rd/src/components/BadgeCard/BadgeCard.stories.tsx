import React from "react";
import { View } from "react-native";
import { BadgeCard } from "./BadgeCard";
import type { BadgeDesign } from "../../badges/types";

const designWithBanner: BadgeDesign = {
  shape: "shield",
  frame: "boldBorder",
  color: "#a78bfa",
  iconName: "Trophy",
  iconWeight: "bold",
  title: "Marathon",
  centerMode: "icon",
  banner: { text: "FINISHER", position: "top" },
  bottomLabel: "2026",
};

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

export function WithDescription() {
  return (
    <View style={{ padding: 16 }}>
      <BadgeCard
        title="Read 30 Books"
        description="A year of reading widely across fiction, history, and tech."
        earnedDate="May 16, 2026"
        onPress={() => console.log("Badge pressed")}
      />
    </View>
  );
}

export function WithLongDescription() {
  return (
    <View style={{ padding: 16 }}>
      <BadgeCard
        title="Marathon Training"
        description="Sixteen weeks of progressively longer runs, easy days, intervals, hills, and one very rainy long run that nearly turned into a swim — and a great deal of stretching in between."
        earnedDate="May 16, 2026"
        onPress={() => console.log("Badge pressed")}
      />
    </View>
  );
}

export function WithBannerAndLabel() {
  return (
    <View style={{ padding: 16 }}>
      <BadgeCard
        title="Marathon Training"
        description="Finished a 26.2 mile run after 16 weeks of training."
        earnedDate="May 16, 2026"
        design={designWithBanner}
        onPress={() => console.log("Badge pressed")}
      />
    </View>
  );
}

export function WithoutDescription() {
  return (
    <View style={{ padding: 16 }}>
      <BadgeCard
        title="No Description Set"
        earnedDate="May 16, 2026"
        onPress={() => console.log("Badge pressed")}
      />
    </View>
  );
}

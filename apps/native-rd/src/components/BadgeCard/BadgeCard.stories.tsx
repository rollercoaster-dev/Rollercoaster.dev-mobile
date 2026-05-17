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

const logPress = () => console.log("Badge pressed");

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <View style={{ padding: 16 }}>{children}</View>
);

export default {
  title: "Components/BadgeCard",
  component: BadgeCard,
};

export const Default = () => (
  <Wrap>
    <BadgeCard
      title="First Goal Completed"
      earnedDate="Jan 28, 2026"
      evidenceCount={3}
      onPress={logPress}
    />
  </Wrap>
);

export const SingleEvidence = () => (
  <Wrap>
    <BadgeCard
      title="Quick Learner"
      earnedDate="Feb 1, 2026"
      evidenceCount={1}
      onPress={logPress}
    />
  </Wrap>
);

export const LongTitle = () => (
  <Wrap>
    <BadgeCard
      title="Completed an incredibly challenging learning journey"
      earnedDate="Dec 15, 2025"
      evidenceCount={12}
      onPress={logPress}
    />
  </Wrap>
);

export const Compact = () => (
  <Wrap>
    <BadgeCard
      title="Badge"
      earnedDate="Jan 1, 2026"
      evidenceCount={2}
      size="compact"
      onPress={logPress}
    />
  </Wrap>
);

export const Spacious = () => (
  <Wrap>
    <BadgeCard
      title="Badge"
      earnedDate="Jan 1, 2026"
      evidenceCount={2}
      size="spacious"
      onPress={logPress}
    />
  </Wrap>
);

export const WithDescription = () => (
  <Wrap>
    <BadgeCard
      title="Read 30 Books"
      description="A year of reading widely across fiction, history, and tech."
      earnedDate="May 16, 2026"
      onPress={logPress}
    />
  </Wrap>
);

export const WithLongDescription = () => (
  <Wrap>
    <BadgeCard
      title="Marathon Training"
      description="Sixteen weeks of progressively longer runs, easy days, intervals, hills, and one very rainy long run that nearly turned into a swim — and a great deal of stretching in between."
      earnedDate="May 16, 2026"
      onPress={logPress}
    />
  </Wrap>
);

export const WithBannerAndLabel = () => (
  <Wrap>
    <BadgeCard
      title="Marathon Training"
      description="Finished a 26.2 mile run after 16 weeks of training."
      earnedDate="May 16, 2026"
      design={designWithBanner}
      onPress={logPress}
    />
  </Wrap>
);

export const WithoutDescription = () => (
  <Wrap>
    <BadgeCard
      title="No Description Set"
      earnedDate="May 16, 2026"
      onPress={logPress}
    />
  </Wrap>
);

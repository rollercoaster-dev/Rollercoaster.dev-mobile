import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { BrandMark } from "../../components/BrandMark";
import { HeaderBand } from "../../components/ScreenHeader/HeaderBand";
import { ThemeChipGrid } from "../../components/ThemeChipGrid";
import { styles } from "./WelcomeScreen.styles";

export interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <HeaderBand>
        <View style={styles.heroRow}>
          <BrandMark size={56} />
          <View style={styles.heroText}>
            <Text variant="label" style={styles.heroGreeting}>
              Hey there 👋
            </Text>
            <Text variant="display" style={styles.heroTitle}>
              Welcome to your ride.
            </Text>
          </View>
        </View>
      </HeaderBand>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
      >
        <Text variant="body" style={styles.copy}>
          rollercoaster.dev is your personal goal tracker. Everything stays on
          your phone — your data, your pace, your ride.
        </Text>

        <Text variant="body" style={styles.copy}>
          First, let&apos;s pick a look that fits your brain. Tap a swatch — the
          whole app changes so you can see how it feels.
        </Text>

        <Card size="compact">
          <View style={styles.sampleRow}>
            <View style={styles.sampleBadge}>
              <Text style={styles.sampleBadgeText}>★</Text>
            </View>
            <View style={styles.sampleText}>
              <Text variant="title">Daily reading</Text>
              <Text variant="caption" style={styles.sampleMeta}>
                3 of 5 days complete
              </Text>
            </View>
          </View>
        </Card>

        <Text variant="label" style={styles.pickerLabel}>
          Your look (tap to preview)
        </Text>
        <ThemeChipGrid />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: theme.space[2] + insets.bottom },
        ]}
      >
        <Button label="Get Started" onPress={onGetStarted} size="lg" />
        <Text variant="caption" style={styles.footnote}>
          You can change this anytime in Settings.
        </Text>
      </View>
    </View>
  );
}

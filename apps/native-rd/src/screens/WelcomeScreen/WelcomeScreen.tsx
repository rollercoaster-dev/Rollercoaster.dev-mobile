import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(["welcome", "common"]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <HeaderBand>
        <View style={styles.heroRow}>
          <BrandMark size={56} />
          <View style={styles.heroText}>
            <Text variant="label" style={styles.heroGreeting}>
              {t("hero.greeting")}
            </Text>
            <Text variant="display" style={styles.heroTitle}>
              {t("hero.title")}
            </Text>
          </View>
        </View>
      </HeaderBand>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
      >
        <Text variant="body" style={styles.copy}>
          {t("intro.body1")}
        </Text>

        <Text variant="body" style={styles.copy}>
          {t("intro.body2")}
        </Text>

        <Card size="compact">
          <View style={styles.sampleRow}>
            <View style={styles.sampleBadge}>
              <Text style={styles.sampleBadgeText}>★</Text>
            </View>
            <View style={styles.sampleText}>
              <Text variant="title">{t("common:theme.preview.title")}</Text>
              <Text variant="caption" style={styles.sampleMeta}>
                {t("sample.progress")}
              </Text>
            </View>
          </View>
        </Card>

        <Text variant="label" style={styles.pickerLabel}>
          {t("themePicker.label")}
        </Text>
        <ThemeChipGrid />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: theme.space[2] + insets.bottom },
        ]}
      >
        <Button label={t("cta.getStarted")} onPress={onGetStarted} size="lg" />
        <Text variant="caption" style={styles.footnote}>
          {t("cta.footnote")}
        </Text>
      </View>
    </View>
  );
}

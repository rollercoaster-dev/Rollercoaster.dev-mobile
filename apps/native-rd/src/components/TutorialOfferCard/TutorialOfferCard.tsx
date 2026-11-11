import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "../Button";
import { Card } from "../Card";
import { Text } from "../Text";
import { styles } from "./TutorialOfferCard.styles";

export interface TutorialOfferCardProps {
  onStart: () => void;
  onDismiss: () => void;
}

/**
 * One-time offer of the tutorial goal on the Goals screen (#593).
 *
 * An invitation, not a nudge: it sits above the cockpit until the user starts
 * the tutorial or declines it, and then it is gone for good. The container
 * owns that rule (`userSettings.tutorialOfferHidden`); this card only reports
 * the two taps. Settings keeps "Start the tutorial goal" as the way back.
 */
export function TutorialOfferCard({
  onStart,
  onDismiss,
}: TutorialOfferCardProps) {
  const { t } = useTranslation(["goals"]);

  return (
    <Card testID="tutorial-offer">
      <View style={styles.content}>
        <Text variant="title" accessibilityRole="header">
          {t("goals:tutorialOffer.title")}
        </Text>
        <Text variant="body" style={styles.body}>
          {t("goals:tutorialOffer.body")}
        </Text>
        <View style={styles.actions}>
          <Button
            label={t("goals:tutorialOffer.start")}
            onPress={onStart}
            testID="tutorial-offer-start"
          />
          <Button
            label={t("goals:tutorialOffer.dismiss")}
            variant="ghost"
            onPress={onDismiss}
            accessibilityHint={t("goals:tutorialOffer.dismissHint")}
            testID="tutorial-offer-dismiss"
          />
        </View>
      </View>
    </Card>
  );
}

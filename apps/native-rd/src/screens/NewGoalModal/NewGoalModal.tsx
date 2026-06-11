import React, { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import { Text } from "../../components/Text";
import { Card } from "../../components/Card";
import { IconButton } from "../../components/IconButton";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { createGoal } from "../../db";
import { reportError } from "../../services/sentry-report";
import type { GoalsStackParamList } from "../../navigation/types";
import { styles } from "./NewGoalModal.styles";

export function NewGoalModal() {
  const navigation =
    useNavigation<NativeStackNavigationProp<GoalsStackParamList, "NewGoal">>();
  const [title, setTitle] = useState("");
  const [titleErrorKey, setTitleErrorKey] = useState<
    "errors.titleRequired" | "errors.createFailed" | null
  >(null);
  // Subscribe to theme changes to trigger re-renders
  const { theme } = useUnistyles();
  const { t } = useTranslation(["newGoal", "common"]);
  const titleError = titleErrorKey ? t(titleErrorKey) : "";

  function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleErrorKey("errors.titleRequired");
      return;
    }

    try {
      const result = createGoal(trimmed);
      if (result.ok) {
        navigation.replace("BadgeDesigner", {
          mode: "new-goal",
          goalId: result.value.id,
        });
      } else {
        reportError(result.error, { area: "goal.mutate", kind: "create" });
        setTitleErrorKey("errors.createFailed");
      }
    } catch (error) {
      reportError(error, { area: "goal.mutate", kind: "create" });
      setTitleErrorKey("errors.createFailed");
    }
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <View style={styles.topBar}>
        <View style={styles.spacer} />
        <Text variant="label">{t("newGoal:title")}</Text>
        <IconButton
          icon={
            // eslint-disable-next-line local/no-raw-jsx-strings -- close-button glyph (a11y label below); not translatable copy. Could align with the ✕ convention used by the viewer modals.
            <Text variant="body" style={styles.closeIcon}>
              X
            </Text>
          }
          onPress={() => navigation.goBack()}
          tone="ghost"
          accessibilityLabel={t("common:actions.close")}
          size="sm"
        />
      </View>

      <View style={styles.form}>
        <Card>
          <Input
            label={t("newGoal:fields.title.label")}
            placeholder={t("newGoal:fields.title.placeholder")}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (titleErrorKey) setTitleErrorKey(null);
            }}
            error={titleError}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            testID="new-goal-title"
          />
        </Card>

        <Button
          label={t("newGoal:cta.create")}
          onPress={handleCreate}
          disabled={!title.trim()}
          testID="create-goal"
        />
      </View>
    </SafeAreaView>
  );
}

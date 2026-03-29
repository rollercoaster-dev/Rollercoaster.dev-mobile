import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Text } from "../../components/Text";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { styles } from "./CapturePlaceholder.styles";

const LABELS: Record<string, string> = {
  CapturePhoto: "Photo Capture",
  CaptureVideo: "Record Video",
  CaptureVoiceMemo: "Voice Memo",
  CaptureTextNote: "Text Note",
  CaptureFile: "Attach File",
};

export function CapturePlaceholder({ route }: { route: { name: string } }) {
  const navigation = useNavigation();
  const label = LABELS[route.name] ?? route.name;

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.topBar}>
        <IconButton
          icon={
            <Text variant="body" style={styles.backIcon}>
              {"<"}
            </Text>
          }
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          size="sm"
        />
        <Text variant="label">{label}</Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.content}>
        <Card>
          <Text variant="headline" style={styles.title}>
            {label}
          </Text>
          <Text variant="body" style={styles.message}>
            This feature is coming soon.
          </Text>
          <Button
            label="Go Back"
            variant="secondary"
            onPress={() => navigation.goBack()}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

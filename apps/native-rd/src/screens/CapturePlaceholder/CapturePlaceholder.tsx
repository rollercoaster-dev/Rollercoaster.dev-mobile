import React from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "../../components/Text";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { ScreenSubHeader } from "../../components/ScreenHeader";
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
    <View style={styles.container}>
      <ScreenSubHeader label={label} onBack={() => navigation.goBack()} />
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
    </View>
  );
}

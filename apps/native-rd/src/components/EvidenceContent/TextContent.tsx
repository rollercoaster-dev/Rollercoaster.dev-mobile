import React from "react";
import { View, ScrollView } from "react-native";
import { Text } from "../Text";
import { styles } from "./TextContent.styles";

export interface TextContentProps {
  text: string;
  createdAt?: string;
}

export function TextContent({ text, createdAt }: TextContentProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.noteText} accessibilityRole="text">
          {text}
        </Text>
      </ScrollView>
      {createdAt ? (
        <View style={styles.footer}>
          <Text style={styles.timestampText}>{createdAt}</Text>
        </View>
      ) : null}
    </View>
  );
}

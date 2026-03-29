import React from "react";
import { View, Text } from "react-native";
import { Button, type ButtonProps } from "../Button";
import { styles } from "./EmptyState.styles";

export interface EmptyStateProps {
  title: string;
  body: string;
  icon?: string;
  action?: Pick<ButtonProps, "label" | "onPress">;
}

export function EmptyState({ title, body, icon, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.body}>{body}</Text>
      {action && (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}

import React from "react";
import { View } from "react-native";
import { Text } from "../Text";
import { Button } from "../Button";
import { openLinkInBrowser } from "../../utils/evidenceViewers";
import { Logger } from "../../shims/rd-logger";
import { styles } from "./LinkContent.styles";

const logger = new Logger("LinkContent");

export interface LinkContentProps {
  uri: string;
  description?: string;
}

export function LinkContent({ uri, description }: LinkContentProps) {
  function handleOpen() {
    openLinkInBrowser(uri).catch((error) => {
      logger.error("Unhandled rejection from openLinkInBrowser", {
        uri,
        error,
      });
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {description ? (
          <Text style={styles.title} numberOfLines={3}>
            {description}
          </Text>
        ) : null}
        <Text
          style={styles.url}
          numberOfLines={3}
          accessibilityRole="text"
          selectable
        >
          {uri}
        </Text>
        <Button
          label="Open in browser"
          onPress={handleOpen}
          variant="primary"
        />
      </View>
    </View>
  );
}

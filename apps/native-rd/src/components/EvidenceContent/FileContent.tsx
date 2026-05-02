import React from "react";
import { View } from "react-native";
import { Text } from "../Text";
import { Button } from "../Button";
import { openFile, tryParseJSON } from "../../utils/evidenceViewers";
import { Logger } from "../../shims/rd-logger";
import { styles } from "./FileContent.styles";

const logger = new Logger("FileContent");

export interface FileContentProps {
  uri: string;
  description?: string;
  metadata?: string;
}

function getFilename(uri: string, metadata?: string): string {
  if (metadata) {
    const meta = tryParseJSON(metadata);
    if (meta && typeof meta.filename === "string") {
      return meta.filename;
    }
  }
  // Fallback: last path segment
  const segments = uri.split("/");
  return segments[segments.length - 1] || uri;
}

function getMimeType(metadata?: string): string | null {
  if (!metadata) return null;
  const meta = tryParseJSON(metadata);
  return meta && typeof meta.mimeType === "string" ? meta.mimeType : null;
}

export function FileContent({ uri, description, metadata }: FileContentProps) {
  const filename = getFilename(uri, metadata);
  const mimeType = getMimeType(metadata);

  function handleOpen() {
    openFile(uri, metadata).catch((error) => {
      logger.error("Unhandled rejection from openFile", { uri, error });
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon} accessibilityElementsHidden>
          {"\u{1F4C4}"}
        </Text>
        <Text style={styles.filename} numberOfLines={2}>
          {filename}
        </Text>
        {mimeType ? <Text style={styles.mimeType}>{mimeType}</Text> : null}
        {description && description !== filename ? (
          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>
        ) : null}
        <Button label="Open" onPress={handleOpen} variant="primary" />
      </View>
    </View>
  );
}

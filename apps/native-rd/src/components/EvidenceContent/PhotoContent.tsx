import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Image,
  Pressable,
  type NativeSyntheticEvent,
} from "react-native";
import { Text } from "../Text";
import { Logger } from "../../shims/rd-logger";
import { styles } from "./PhotoContent.styles";

const logger = new Logger("PhotoContent");

export interface PhotoContentProps {
  uri: string | null;
  description?: string;
}

export function PhotoContent({ uri, description }: PhotoContentProps) {
  const [imageError, setImageError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    setImageError(false);
  }, [uri]);

  const handleError = useCallback(
    (event?: NativeSyntheticEvent<{ error?: string }>) => {
      logger.error("Failed to load photo evidence", {
        uri,
        error: event?.nativeEvent?.error,
      });
      setImageError(true);
    },
    [uri],
  );

  const handleRetry = useCallback(() => {
    setImageError(false);
    setRetryToken((t) => t + 1);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {!uri ? (
          <Text style={styles.errorText}>Failed to load image</Text>
        ) : imageError ? (
          <View style={styles.errorBlock}>
            <Text style={styles.errorText}>Failed to load image</Text>
            <Pressable
              onPress={handleRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry loading image"
              style={styles.retryButton}
            >
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <Image
            // Cache-buster forces RN Image to re-fetch on retry.
            source={{
              uri: retryToken === 0 ? uri : `${uri}#retry=${retryToken}`,
            }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel={description ?? "Photo evidence"}
            onError={handleError}
          />
        )}
      </View>
      {description ? (
        <View style={styles.captionBar}>
          <Text style={styles.captionText} numberOfLines={2}>
            {description}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

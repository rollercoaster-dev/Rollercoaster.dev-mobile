import React from "react";
import { View } from "react-native";
import { AudioPlayer } from "../AudioPlayer";
import { styles } from "./AudioContent.styles";

export interface AudioContentProps {
  uri: string;
  durationMs?: number;
}

export function AudioContent({ uri, durationMs }: AudioContentProps) {
  return (
    <View style={styles.container}>
      <View style={styles.playerContainer}>
        <AudioPlayer uri={uri} durationMs={durationMs} />
      </View>
    </View>
  );
}

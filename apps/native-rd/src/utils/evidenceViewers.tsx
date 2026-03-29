import React, { useState } from "react";
import { Alert, Linking } from "react-native";
import * as Sharing from "expo-sharing";
import { PhotoViewerModal } from "../components/PhotoViewerModal";
import { TextNoteViewerModal } from "../components/TextNoteViewerModal";
import { VideoPlayerModal } from "../components/VideoPlayerModal";
import { AudioPlayerModal } from "../components/AudioPlayerModal";
import { TEXT_EVIDENCE_PREFIX } from "../db";
import type { Evidence } from "../components/EvidenceThumbnail";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function tryParseJSON(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function mimeToUTI(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "com.adobe.pdf",
    "text/plain": "public.plain-text",
    "text/csv": "public.comma-separated-values-text",
    "text/markdown": "net.daringfireball.markdown",
    "image/jpeg": "public.jpeg",
    "image/png": "public.png",
    "image/gif": "com.compuserve.gif",
    "image/webp": "public.webp",
    "image/heic": "public.heic",
    "image/heif": "public.heif",
    "application/msword": "com.microsoft.word.doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "org.openxmlformats.wordprocessingml.document",
    "application/vnd.ms-excel": "com.microsoft.excel.xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      "org.openxmlformats.spreadsheetml.sheet",
  };
  return map[mimeType] ?? "public.item";
}

export async function openFile(uri: string, metadata?: string) {
  try {
    const { File } = await import("expo-file-system");
    const file = new File(uri);
    if (!file.exists) {
      Alert.alert("File not found", "The file may have been deleted.");
      return;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert(
        "Cannot open file",
        "File sharing is not available on this device.",
      );
      return;
    }

    const options: Record<string, string> = {};
    if (metadata) {
      const meta = tryParseJSON(metadata);
      if (meta?.mimeType) {
        options.UTI = mimeToUTI(meta.mimeType as string);
      }
    }

    await Sharing.shareAsync(uri, options);
  } catch (error) {
    console.error("[evidenceViewers] Failed to open file", { uri, error });
    Alert.alert("Cannot open file", "Something went wrong opening the file.");
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEvidenceViewer() {
  const [photoViewer, setPhotoViewer] = useState<{
    uri: string;
    description?: string;
  } | null>(null);
  const [textViewer, setTextViewer] = useState<{
    text: string;
    createdAt?: string;
  } | null>(null);
  const [videoViewer, setVideoViewer] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<{
    uri: string;
    durationMs?: number;
  } | null>(null);

  function viewEvidence(evidence: Evidence) {
    const meta = evidence.metadata ? tryParseJSON(evidence.metadata) : null;

    switch (evidence.type) {
      case "photo":
      case "screenshot":
        if (evidence.uri) {
          setPhotoViewer({ uri: evidence.uri, description: evidence.title });
        } else {
          Alert.alert("Cannot view", "Photo file is missing.");
        }
        break;
      case "video":
        if (evidence.uri) {
          setVideoViewer(evidence.uri);
        } else {
          Alert.alert("Cannot play", "Video file is missing.");
        }
        break;
      case "text": {
        const textContent = evidence.uri?.startsWith(TEXT_EVIDENCE_PREFIX)
          ? evidence.uri.slice(TEXT_EVIDENCE_PREFIX.length)
          : evidence.title;
        setTextViewer({
          text: textContent,
          createdAt:
            evidence.title !== textContent ? evidence.title : undefined,
        });
        break;
      }
      case "voice_memo":
        if (evidence.uri) {
          setAudioPlayer({
            uri: evidence.uri,
            durationMs:
              typeof meta?.durationMs === "number"
                ? meta.durationMs
                : undefined,
          });
        } else {
          Alert.alert("Cannot play", "Audio file is missing.");
        }
        break;
      case "link":
        if (evidence.uri) {
          Linking.openURL(evidence.uri).catch(() => {
            Alert.alert("Cannot open link", `Unable to open: ${evidence.uri}`);
          });
        }
        break;
      case "file":
        if (evidence.uri) {
          openFile(evidence.uri, evidence.metadata);
        } else {
          Alert.alert("Cannot open", "File is missing.");
        }
        break;
    }
  }

  const viewerModals = (
    <>
      <PhotoViewerModal
        visible={photoViewer !== null}
        uri={photoViewer?.uri ?? null}
        description={photoViewer?.description}
        onClose={() => setPhotoViewer(null)}
      />
      <TextNoteViewerModal
        visible={textViewer !== null}
        text={textViewer?.text ?? null}
        createdAt={textViewer?.createdAt}
        onClose={() => setTextViewer(null)}
      />
      <VideoPlayerModal
        visible={videoViewer !== null}
        uri={videoViewer}
        onClose={() => setVideoViewer(null)}
      />
      <AudioPlayerModal
        visible={audioPlayer !== null}
        uri={audioPlayer?.uri ?? null}
        durationMs={audioPlayer?.durationMs}
        onClose={() => setAudioPlayer(null)}
      />
    </>
  );

  return { viewEvidence, viewerModals };
}

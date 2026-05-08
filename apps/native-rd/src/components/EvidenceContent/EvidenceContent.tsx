import React from "react";
import { EvidenceType, TEXT_EVIDENCE_PREFIX } from "../../db";
import type { Evidence } from "../EvidenceThumbnail";
import { tryParseJSON } from "../../utils/evidenceViewers";
import { PhotoContent } from "./PhotoContent";
import { TextContent } from "./TextContent";
import { VideoContent } from "./VideoContent";
import { AudioContent } from "./AudioContent";
import { LinkContent } from "./LinkContent";
import { FileContent } from "./FileContent";

export interface EvidenceContentProps {
  evidence: Evidence;
}

export function EvidenceContent({ evidence }: EvidenceContentProps) {
  switch (evidence.type) {
    case EvidenceType.photo:
      return (
        <PhotoContent uri={evidence.uri ?? null} description={evidence.title} />
      );
    case EvidenceType.video:
      return <VideoContent uri={evidence.uri ?? null} />;
    case EvidenceType.text: {
      const text = evidence.uri?.startsWith(TEXT_EVIDENCE_PREFIX)
        ? evidence.uri.slice(TEXT_EVIDENCE_PREFIX.length)
        : evidence.title;
      return (
        <TextContent
          text={text}
          createdAt={evidence.title !== text ? evidence.title : undefined}
        />
      );
    }
    case EvidenceType.voice_memo: {
      if (!evidence.uri) {
        return (
          <FileContent
            uri=""
            description={evidence.title}
            metadata={evidence.metadata}
          />
        );
      }
      const meta = evidence.metadata ? tryParseJSON(evidence.metadata) : null;
      const durationMs =
        meta && typeof meta.durationMs === "number"
          ? meta.durationMs
          : undefined;
      return <AudioContent uri={evidence.uri} durationMs={durationMs} />;
    }
    case EvidenceType.link:
      return (
        <LinkContent uri={evidence.uri ?? ""} description={evidence.title} />
      );
    case EvidenceType.file:
      return (
        <FileContent
          uri={evidence.uri ?? ""}
          description={evidence.title}
          metadata={evidence.metadata}
        />
      );
    default:
      return assertNever(evidence.type);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled evidence type: ${value as string}`);
}

import React from "react";
import { Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
import type { EvidenceTypeValue } from "../../types/evidence";
import type { Evidence } from "../../themes/adapter";
import { EVIDENCE_TYPE_ICONS } from "../../constants/evidenceIcons";
import { styles } from "./ProofCard.styles";

export interface ProofCardProps {
  id: string;
  name: string;
  type: EvidenceTypeValue | null;
  onCardPress: (id: string) => void;
}

/**
 * Resolves an evidence type to its `theme.evidence` bg/fg token pair. Untyped
 * evidence (`type: null`) falls back to the deliberately neutral tint — it is
 * still real evidence, just without a type identity, so it stays tappable and
 * present (never filtered out).
 */
function evidenceTint(type: EvidenceTypeValue | null): {
  bgKey: keyof Evidence;
  fgKey: keyof Evidence;
} {
  switch (type) {
    case "photo":
      return { bgKey: "evidencePhotoBg", fgKey: "evidencePhotoFg" };
    case "video":
      return { bgKey: "evidenceVideoBg", fgKey: "evidenceVideoFg" };
    case "text":
      return { bgKey: "evidenceTextBg", fgKey: "evidenceTextFg" };
    case "voice_memo":
      return { bgKey: "evidenceVoiceMemoBg", fgKey: "evidenceVoiceMemoFg" };
    case "link":
      return { bgKey: "evidenceLinkBg", fgKey: "evidenceLinkFg" };
    case "file":
      return { bgKey: "evidenceFileBg", fgKey: "evidenceFileFg" };
    case null:
      // Untyped evidence → the deliberately neutral tint (see above).
      return { bgKey: "evidenceNeutralBg", fgKey: "evidenceNeutralFg" };
    default:
      // A future EvidenceTypeValue member reaches here typed as `never`, so it
      // fails to compile until it gets an explicit tint above — the switch can
      // no longer silently fold a new type into the neutral pair. Unknown
      // runtime values still degrade gracefully to neutral (never a crash).
      return evidenceTintFallback(type);
  }
}

/**
 * Compile-time exhaustiveness guard for `evidenceTint`. Reached only with a
 * `type` no `case` handled, which TypeScript narrows to `never` once every
 * `EvidenceTypeValue` (and `null`) is covered — so an unhandled type is a build
 * error. Returns the neutral tint to keep the runtime graceful.
 */
function evidenceTintFallback(_type: never): {
  bgKey: keyof Evidence;
  fgKey: keyof Evidence;
} {
  return { bgKey: "evidenceNeutralBg", fgKey: "evidenceNeutralFg" };
}

export function ProofCard({ id, name, type, onCardPress }: ProofCardProps) {
  const { t } = useTranslation(["common", "badgeDetail"]);

  // Icon mirrors BadgeDetailScreen's `ev.type ? icon : "•"` degrade — a neutral
  // bullet stands in for untyped evidence rather than an arbitrary type glyph.
  const icon = type ? EVIDENCE_TYPE_ICONS[type] : "•";
  const typeLabel = type ? t(`common:evidenceTypes.${type}.label`) : null;

  // Compose the a11y label from the shared evidenceList shape so screen readers
  // announce untyped evidence with a fallback type word instead of a bare name.
  const a11yTypeLabel = typeLabel ?? t("badgeDetail:evidenceList.fallbackType");
  const accessibilityLabel = t("badgeDetail:evidenceList.itemA11y", {
    name,
    type: a11yTypeLabel,
  });

  const { bgKey, fgKey } = evidenceTint(type);

  return (
    <Pressable
      onPress={() => onCardPress(id)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.container(bgKey),
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {icon}
      </Text>
      <Text style={styles.name(fgKey)} numberOfLines={2}>
        {name}
      </Text>
      {typeLabel ? (
        <Text style={styles.typeTag(fgKey)}>{typeLabel}</Text>
      ) : null}
    </Pressable>
  );
}

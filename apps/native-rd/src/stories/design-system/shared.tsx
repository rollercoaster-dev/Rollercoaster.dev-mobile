import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import type { ComposedTheme } from '../../themes/compose';
import { useCopyToken } from './useCopyToken';

// ---------------------------------------------------------------------------
// Shared sub-components used across design-system stories
// ---------------------------------------------------------------------------

type SectionHeaderProps = {
  title: string;
  description: string;
};

export function SectionHeader({ title, description }: SectionHeaderProps): React.JSX.Element {
  return (
    <View style={sharedStyles.header}>
      <Text style={sharedStyles.title}>{title}</Text>
      <Text style={sharedStyles.desc}>{description}</Text>
    </View>
  );
}

type CopiedBadgeProps = {
  visible: boolean;
};

export function CopiedBadge({ visible }: CopiedBadgeProps): React.JSX.Element | null {
  if (!visible) return null;
  return <Text style={sharedStyles.copied}>Copied!</Text>;
}

type CopyableTokenProps = {
  path: string;
  copiedToken: string | null;
  onCopy: (path: string) => void;
};

export function CopyableToken({ path, copiedToken, onCopy }: CopyableTokenProps): React.JSX.Element {
  return (
    <Pressable onPress={() => onCopy(path)} style={sharedStyles.tokenRow}>
      <Text style={sharedStyles.mono}>{path}</Text>
      <CopiedBadge visible={copiedToken === path} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Shadow helper
// ---------------------------------------------------------------------------

type ShadowKey = keyof ComposedTheme['shadow'];

/**
 * Build React Native shadow style props from a theme shadow token.
 * Eliminates the repeated 4-property expansion across story files.
 */
export function shadowStyle(theme: ComposedTheme, key: ShadowKey) {
  const s = theme.shadow[key];
  return {
    shadowColor: '#000000',
    shadowOffset: { width: s.offsetX, height: s.offsetY },
    shadowOpacity: s.opacity,
    shadowRadius: s.radius,
  } as const;
}

// ---------------------------------------------------------------------------
// Re-export the hook for convenience
// ---------------------------------------------------------------------------

export { useCopyToken };

// ---------------------------------------------------------------------------
// Shared styles used by SectionHeader, CopiedBadge, CopyableToken
// ---------------------------------------------------------------------------

export const sharedStyles = StyleSheet.create((theme) => ({
  header: {
    marginBottom: theme.space[5],
  },
  title: {
    fontSize: theme.size.xl,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    marginBottom: theme.space[1],
  },
  desc: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textMuted,
  },
  mono: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
  },
  copied: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    color: '#059669',
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
  },
  label: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    marginBottom: theme.space[1],
  },
  metaRole: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textMuted,
  },
  metaValue: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textSecondary,
  },
}));

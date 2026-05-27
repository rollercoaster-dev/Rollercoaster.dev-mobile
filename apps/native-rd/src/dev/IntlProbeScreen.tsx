import React, { useMemo } from "react";
import { ScrollView, View, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../components/Text";
import { ScreenHeader } from "../components/ScreenHeader";
import { useTabScreenContentInset } from "../navigation/useTabScreenContentInset";
import {
  runIntlProbe,
  runPluralResolutionProbe,
  type IntlProbeResult,
  type IntlProbeStatus,
} from "./intlProbe";
import { styles } from "./IntlProbeScreen.styles";

// All copy here is i18n-skip: dev-only probe, never shipped to users, gated by
// __DEV__ at the navigator. Translating it would add noise to the corpus.

const BADGE_STYLE: Record<IntlProbeStatus, object> = {
  supported: styles.badgeSupported,
  missing: styles.badgeMissing,
  partial: styles.badgePartial,
};

function ProbeRow({ result }: { result: IntlProbeResult }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text variant="label" style={styles.api}>
          {result.api}
        </Text>
        <Text style={[styles.badge, BADGE_STYLE[result.status]]}>
          {result.status.toUpperCase()}
        </Text>
      </View>
      <Text variant="mono" style={styles.detail}>
        {result.detail}
      </Text>
    </View>
  );
}

/**
 * `__DEV__`-gated probe for Hermes `Intl` coverage (issue #66). Reachable from
 * Settings in dev builds. Renders the live engine support matrix plus i18next's
 * per-locale plural-suffix resolution. See
 * `docs/research/hermes-intl-spike-66-findings.md`.
 */
export function IntlProbeScreen() {
  const tabInset = useTabScreenContentInset();
  const { i18n } = useTranslation();

  const intlResults = useMemo(() => runIntlProbe(), []);
  const pluralProbes = useMemo(() => runPluralResolutionProbe(i18n), [i18n]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Intl probe (#66)" />
      <ScrollView contentContainerStyle={[styles.scrollContent, tabInset]}>
        <Text style={styles.intro}>
          Engine: {Platform.OS} · Hermes{" "}
          {String(
            !!(globalThis as { HermesInternal?: unknown }).HermesInternal,
          )}
          . GREEN = native, RED = missing (throws), AMBER = partial.
        </Text>

        <Text variant="title" style={styles.sectionTitle}>
          Intl API coverage
        </Text>
        {intlResults.map((result) => (
          <ProbeRow key={result.api} result={result} />
        ))}

        <Text variant="title" style={styles.sectionTitle}>
          i18next plural resolution
        </Text>
        <Text style={styles.intro}>
          Suffix i18next picks per count. Without a PluralRules polyfill the
          dummyRule collapses every locale to one/other — watch ar count=3
          (should be &quot;few&quot;) and ar count=11 (should be
          &quot;many&quot;).
        </Text>
        {pluralProbes.map((probe) => (
          <View key={probe.locale} style={styles.row}>
            <Text variant="label" style={styles.pluralLocale}>
              {probe.locale} — engine categories: {probe.engineCategories}
            </Text>
            {probe.rows.map((row) => (
              <View key={row.count} style={styles.pluralRow}>
                <Text variant="mono" style={styles.pluralCount}>
                  {row.count}
                </Text>
                <Text variant="mono">{row.rendered}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

import { View, Text, ScrollView, Pressable } from "react-native";
import { UnistylesRuntime, useUnistyles } from "react-native-unistyles";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeSwitcher } from "../../components/ThemeSwitcher";
import { composeTheme } from "../../themes/compose";
import { palette } from "../../themes/palette";
import type { ComposedTheme } from "../../themes/compose";
import { styles } from "./TestScreen.styles";

type NarrativeCopy = {
  climb: string;
  drop: string;
  stories: string;
  relief: string;
};

type AccentLabel = { label: string; color: string };

type ThemePage = {
  id: string;
  title: string;
  subtitle: string;
  kind: "landing" | "standard";
  theme: ComposedTheme;
  narrativeDesc?: string;
  narrativeCopy?: NarrativeCopy;
  storyLabels?: AccentLabel[];
  accentPalette?: AccentLabel[];
  typeSampleBody: string;
  typeSampleMono: string;
};

function pickReadableText(bg: string) {
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return palette.black;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? palette.black : palette.white;
}

function renderNarrativeArc(
  theme: ComposedTheme,
  desc: string,
  copy: NarrativeCopy,
  storyLabels?: AccentLabel[],
) {
  const reliefLabelText = pickReadableText(theme.narrative.relief.accent);

  return (
    <View style={styles.previewSection}>
      <Text style={styles.previewSectionTitle(theme)}>Narrative Arc</Text>
      <Text style={styles.previewSectionDesc(theme)}>{desc}</Text>
      <View style={styles.previewGrid}>
        <View
          style={styles.narrativeCard(
            theme.narrative.climb.bg,
            theme.narrative.climb.text,
            theme,
          )}
        >
          <Text
            style={styles.badgeLabel(
              theme.narrative.climb.text,
              theme.narrative.climb.bg,
              theme,
            )}
          >
            Climb
          </Text>
          <Text style={styles.previewBody(theme)}>{copy.climb}</Text>
        </View>
        <View
          style={styles.narrativeCard(
            theme.narrative.drop.bg,
            theme.narrative.drop.text,
            theme,
          )}
        >
          <Text
            style={styles.badgeLabel(
              theme.narrative.drop.text,
              theme.narrative.drop.bg,
              theme,
            )}
          >
            Drop
          </Text>
          <Text style={styles.previewBody(theme)}>{copy.drop}</Text>
        </View>
        <View
          style={styles.narrativeCard(
            theme.narrative.stories.bg,
            theme.narrative.stories.text,
            theme,
          )}
        >
          {storyLabels ? (
            <View style={styles.storyLabelRow}>
              {storyLabels.map((item) => (
                <Text
                  key={item.label}
                  style={styles.storyLabel(
                    item.color,
                    theme.narrative.stories.accentForeground,
                    theme,
                  )}
                >
                  {item.label}
                </Text>
              ))}
            </View>
          ) : (
            <Text
              style={styles.badgeLabel(
                theme.narrative.stories.accentForeground,
                theme.narrative.stories.accent1,
                theme,
              )}
            >
              Stories
            </Text>
          )}
          <Text style={styles.previewBody(theme)}>{copy.stories}</Text>
        </View>
        <View
          style={styles.narrativeCard(
            theme.narrative.relief.bg,
            theme.narrative.relief.text,
            theme,
          )}
        >
          <Text
            style={styles.badgeLabel(
              reliefLabelText,
              theme.narrative.relief.accent,
              theme,
            )}
          >
            Relief
          </Text>
          <Text style={styles.previewBody(theme)}>{copy.relief}</Text>
        </View>
      </View>
    </View>
  );
}

function renderAccentPalette(
  theme: ComposedTheme,
  desc: string,
  accents: AccentLabel[],
) {
  return (
    <View style={styles.previewSection}>
      <Text style={styles.previewSectionTitle(theme)}>Accent Palette</Text>
      <Text style={styles.previewSectionDesc(theme)}>{desc}</Text>
      <View style={styles.accentPaletteRow(accents.length)}>
        {accents.map((accent) => (
          <View
            key={accent.label}
            style={styles.accentSwatch(accent.color, theme)}
          >
            <Text
              style={styles.accentText(
                theme.narrative.stories.accentForeground,
                theme,
              )}
            >
              {accent.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function renderTypeSamples(theme: ComposedTheme, body: string, mono: string) {
  return (
    <View style={styles.previewSection}>
      <Text style={styles.previewSectionTitle(theme)}>Type Samples</Text>
      <View style={styles.typeSamples(theme)}>
        <Text style={styles.typeHeadline(theme)}>Anybody Headline</Text>
        <Text style={styles.previewBody(theme)}>{body}</Text>
        <Text style={styles.previewMono(theme)}>{mono}</Text>
      </View>
    </View>
  );
}

function renderLanding(theme: ComposedTheme) {
  return (
    <View style={styles.previewSection}>
      <Text style={styles.previewSectionTitle(theme)}>
        The Full Ride (Landing)
      </Text>
      <Text style={styles.previewSectionDesc(theme)}>
        Full narrative arc showcase: Climb, Drop, Stories, Relief.
      </Text>
      <View
        style={styles.landingBlock(
          theme.narrative.climb.bg,
          theme.narrative.climb.text,
          theme,
        )}
      >
        <Text style={styles.displayText(theme, "7xl")}>
          Badges{"\n"}with bite.
        </Text>
        <Text style={styles.previewBody(theme)}>
          Open Badges credentialing for the neurodivergent-first web.
        </Text>
        <View style={styles.landingCtaRow}>
          <Text
            style={styles.badgeLabel(
              theme.narrative.climb.text,
              theme.narrative.climb.bg,
              theme,
            )}
          >
            Get started
          </Text>
          <Text
            style={styles.badgeLabel(
              theme.narrative.climb.bg,
              theme.narrative.climb.text,
              theme,
            )}
          >
            Watch demo
          </Text>
        </View>
      </View>

      <View
        style={styles.landingBlock(
          theme.narrative.drop.bg,
          theme.narrative.drop.text,
          theme,
        )}
      >
        <Text
          style={styles.displayText(theme, "6xl", theme.narrative.drop.accent)}
        >
          Make it{"\n"}official.
        </Text>
        <Text style={styles.previewBody(theme)}>
          Issue, verify, and manage credentials with a system built for clarity.
        </Text>
        <View style={styles.landingCtaRow}>
          <Text
            style={styles.badgeLabel(
              theme.narrative.drop.text,
              theme.narrative.drop.bg,
              theme,
            )}
          >
            Self-signed badges
          </Text>
          <Text
            style={styles.badgeLabel(
              theme.narrative.drop.bg,
              theme.narrative.drop.accent,
              theme,
            )}
          >
            Local-first
          </Text>
        </View>
      </View>

      <View
        style={styles.landingBlock(
          theme.narrative.stories.bg,
          theme.narrative.stories.text,
          theme,
        )}
      >
        <Text style={styles.displayText(theme, "5xl")}>
          Every badge{"\n"}tells a story.
        </Text>
        <View style={styles.storyLabelRow}>
          {[
            { label: "Teal", color: theme.narrative.stories.accent1 },
            { label: "Orange", color: theme.narrative.stories.accent2 },
            { label: "Purple", color: theme.narrative.stories.accent3 },
            { label: "Sky", color: theme.narrative.stories.accent4 },
          ].map((item) => (
            <Text
              key={item.label}
              style={styles.storyLabel(
                item.color,
                theme.narrative.stories.accentForeground,
                theme,
              )}
            >
              {item.label}
            </Text>
          ))}
        </View>
      </View>

      <View
        style={styles.landingBlock(
          theme.narrative.relief.bg,
          theme.narrative.relief.text,
          theme,
        )}
      >
        <Text style={styles.displayText(theme, "5xl")}>
          Start{"\n"}building.
        </Text>
        <Text style={styles.previewBody(theme)}>
          Open source. Accessible by default. Ready when you are.
        </Text>
        <View style={styles.landingCtaRow}>
          <Text
            style={styles.badgeLabel(
              pickReadableText(theme.narrative.relief.accent),
              theme.narrative.relief.accent,
              theme,
            )}
          >
            View on GitHub
          </Text>
        </View>
      </View>

      {renderTypeSamples(
        theme,
        "Instrument Sans body copy with neutral grounding.",
        "DM Mono for URLs and system labels.",
      )}
    </View>
  );
}

export function TestScreen() {
  const { theme } = useUnistyles();
  const defaultTheme = composeTheme("light", "default");
  const darkTheme = composeTheme("dark", "default");
  const highContrastTheme = composeTheme("light", "highContrast");
  const dyslexiaTheme = composeTheme("light", "dyslexia");
  const autismTheme = composeTheme("light", "autismFriendly");
  const largeTextTheme = composeTheme("light", "largeText");
  const lowVisionTheme = composeTheme("light", "lowVision");
  const lowInfoTheme = composeTheme("light", "lowInfo");

  const previewThemes: ThemePage[] = [
    {
      id: "default",
      title: "The Full Ride (Default)",
      subtitle: "Baseline palette and motion defaults.",
      kind: "standard",
      theme: defaultTheme,
      narrativeDesc:
        "The four narrative sections as they render in the default mood.",
      narrativeCopy: {
        climb: "Energy builds. Yellow warmth.",
        drop: "Deep black. The moment of impact.",
        stories: "Deep indigo with multi-color accents.",
        relief: "Mint calm. Resolution.",
      },
      typeSampleBody: "Instrument Sans body copy, calm and readable.",
      typeSampleMono: "DM Mono metadata sample.",
    },
    {
      id: "dark",
      title: "Night Ride (Dark)",
      subtitle: "Deep indigo base with lightened accents.",
      kind: "standard",
      theme: darkTheme,
      narrativeDesc:
        "The four narrative sections adapted for the Night Ride mood.",
      narrativeCopy: {
        climb: "Energy builds. Yellow warmth.",
        drop: "Deep void. The moment of impact.",
        stories: "Deep indigo with glowing accents.",
        relief: "Dark mint calm. Resolution.",
      },
      storyLabels: [
        { label: "Luminous Teal", color: darkTheme.narrative.stories.accent1 },
        { label: "Warm Coral", color: darkTheme.narrative.stories.accent2 },
        { label: "Soft Violet", color: darkTheme.narrative.stories.accent3 },
        { label: "Electric Blue", color: darkTheme.narrative.stories.accent4 },
      ],
      accentPalette: [
        { label: "Luminous Teal", color: darkTheme.narrative.stories.accent1 },
        { label: "Warm Coral", color: darkTheme.narrative.stories.accent2 },
        { label: "Soft Violet", color: darkTheme.narrative.stories.accent3 },
        { label: "Electric Blue", color: darkTheme.narrative.stories.accent4 },
      ],
      typeSampleBody: "Instrument Sans body copy, calm and readable.",
      typeSampleMono: "DM Mono metadata sample.",
    },
    {
      id: "high-contrast",
      title: "Bold Ink (High Contrast)",
      subtitle: "Pure black and white with strict borders.",
      kind: "standard",
      theme: highContrastTheme,
      narrativeDesc:
        "The four narrative sections adapted for the Bold Ink mood.",
      narrativeCopy: {
        climb: "Pure white. Maximum contrast.",
        drop: "Pure black. No compromise.",
        stories: "Black canvas with high-contrast accents.",
        relief: "Light gray. Clear resolution.",
      },
      storyLabels: [
        {
          label: "Bright Teal",
          color: highContrastTheme.narrative.stories.accent1,
        },
        {
          label: "Bright Orange",
          color: highContrastTheme.narrative.stories.accent2,
        },
        {
          label: "Bright Purple",
          color: highContrastTheme.narrative.stories.accent3,
        },
        {
          label: "Bright Blue",
          color: highContrastTheme.narrative.stories.accent4,
        },
      ],
      accentPalette: [
        {
          label: "Bright Teal",
          color: highContrastTheme.narrative.stories.accent1,
        },
        {
          label: "Bright Orange",
          color: highContrastTheme.narrative.stories.accent2,
        },
        {
          label: "Bright Purple",
          color: highContrastTheme.narrative.stories.accent3,
        },
        {
          label: "Bright Blue",
          color: highContrastTheme.narrative.stories.accent4,
        },
      ],
      typeSampleBody: "Instrument Sans body copy, calm and readable.",
      typeSampleMono: "DM Mono metadata sample.",
    },
    {
      id: "dyslexia",
      title: "Warm Studio (Dyslexia Friendly)",
      subtitle: "Lexend (research-backed) + cream background, motion disabled.",
      kind: "standard",
      theme: dyslexiaTheme,
      narrativeDesc:
        "The four narrative sections adapted for the Warm Studio mood.",
      narrativeCopy: {
        climb: "Warm cream-gold. Gentle energy.",
        drop: "Warm brown depth. Soft impact.",
        stories: "Warm dark canvas with muted accents.",
        relief: "Soft green calm. Easy on the eyes.",
      },
      storyLabels: [
        { label: "Sage", color: dyslexiaTheme.narrative.stories.accent1 },
        { label: "Terracotta", color: dyslexiaTheme.narrative.stories.accent2 },
        { label: "Dusty Plum", color: dyslexiaTheme.narrative.stories.accent3 },
        { label: "Warm Denim", color: dyslexiaTheme.narrative.stories.accent4 },
      ],
      accentPalette: [
        { label: "Sage", color: dyslexiaTheme.narrative.stories.accent1 },
        { label: "Terracotta", color: dyslexiaTheme.narrative.stories.accent2 },
        { label: "Dusty Plum", color: dyslexiaTheme.narrative.stories.accent3 },
        { label: "Warm Denim", color: dyslexiaTheme.narrative.stories.accent4 },
      ],
      typeSampleBody: "Lexend body copy, research-backed readability.",
      typeSampleMono: "DM Mono metadata sample.",
    },
    {
      id: "autism",
      title: "Still Water (Autism Friendly)",
      subtitle: "Muted palette, predictable layout, motion disabled.",
      kind: "standard",
      theme: autismTheme,
      narrativeDesc:
        "The four narrative sections adapted for the Still Water mood.",
      narrativeCopy: {
        climb: "Soft cream-yellow. Gentle warmth.",
        drop: "Muted blue-gray. Calm depth.",
        stories: "Subdued canvas with desaturated accents.",
        relief: "Pale green. Quiet resolution.",
      },
      storyLabels: [
        { label: "Sage Mist", color: autismTheme.narrative.stories.accent1 },
        { label: "Sandstone", color: autismTheme.narrative.stories.accent2 },
        { label: "Soft Mauve", color: autismTheme.narrative.stories.accent3 },
        { label: "Pale Slate", color: autismTheme.narrative.stories.accent4 },
      ],
      accentPalette: [
        { label: "Sage Mist", color: autismTheme.narrative.stories.accent1 },
        { label: "Sandstone", color: autismTheme.narrative.stories.accent2 },
        { label: "Soft Mauve", color: autismTheme.narrative.stories.accent3 },
        { label: "Pale Slate", color: autismTheme.narrative.stories.accent4 },
      ],
      typeSampleBody: "Arial body copy, familiar and predictable.",
      typeSampleMono: "DM Mono metadata sample.",
    },
    {
      id: "large-text",
      title: "Same Ride, Bigger Seat (Large Text)",
      subtitle: "All sizes +25% with relaxed line heights.",
      kind: "standard",
      theme: largeTextTheme,
      narrativeDesc: "The four narrative sections at larger scale.",
      narrativeCopy: {
        climb: "Energy builds. Yellow warmth.",
        drop: "Deep black. The moment of impact.",
        stories: "Deep indigo with multi-color accents.",
        relief: "Mint calm. Resolution.",
      },
      typeSampleBody: "Instrument Sans body copy, calm and readable.",
      typeSampleMono: "DM Mono metadata sample.",
    },
    {
      id: "low-vision",
      title: "Loud & Clear (Low Vision)",
      subtitle: "Atkinson Hyperlegible, high contrast, motion disabled.",
      kind: "standard",
      theme: lowVisionTheme,
      narrativeDesc:
        "The four narrative sections adapted for the Loud & Clear mood.",
      narrativeCopy: {
        climb: "Bright yellow. Maximum visibility.",
        drop: "Pure black. Bold impact.",
        stories: "Black canvas with high-visibility accents.",
        relief: "Light green. Clear resolution.",
      },
      storyLabels: [
        {
          label: "Strong Teal",
          color: lowVisionTheme.narrative.stories.accent1,
        },
        {
          label: "Strong Orange",
          color: lowVisionTheme.narrative.stories.accent2,
        },
        {
          label: "Strong Purple",
          color: lowVisionTheme.narrative.stories.accent3,
        },
        {
          label: "Strong Blue",
          color: lowVisionTheme.narrative.stories.accent4,
        },
      ],
      accentPalette: [
        {
          label: "Strong Teal",
          color: lowVisionTheme.narrative.stories.accent1,
        },
        {
          label: "Strong Orange",
          color: lowVisionTheme.narrative.stories.accent2,
        },
        {
          label: "Strong Purple",
          color: lowVisionTheme.narrative.stories.accent3,
        },
        {
          label: "Strong Blue",
          color: lowVisionTheme.narrative.stories.accent4,
        },
      ],
      typeSampleBody:
        "Atkinson Hyperlegible body copy, designed for legibility.",
      typeSampleMono: "DM Mono metadata sample.",
    },
    {
      id: "low-info",
      title: "Clean Signal (Low Info)",
      subtitle: "Simplified palette, reduced distractions, motion disabled.",
      kind: "standard",
      theme: lowInfoTheme,
      narrativeDesc:
        "The four narrative sections adapted for the Clean Signal mood.",
      narrativeCopy: {
        climb: "White. Clean, no noise.",
        drop: "Dark gray. Minimal contrast shift.",
        stories: "Dark canvas. Single accent color.",
        relief: "Light gray. Quiet end.",
      },
      storyLabels: [
        { label: "Signal Blue", color: lowInfoTheme.narrative.stories.accent1 },
      ],
      accentPalette: [
        { label: "Signal Blue", color: lowInfoTheme.narrative.stories.accent1 },
      ],
      typeSampleBody:
        "Atkinson Hyperlegible body copy, designed for legibility.",
      typeSampleMono: "DM Mono metadata sample.",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Design Tokens</Text>
            <Text style={styles.heroSubtitle}>
              Drama from scale and color. Accessibility without compromise.
            </Text>
          </View>
          <View style={styles.themeInfo}>
            <Text style={styles.themeInfoText}>
              Current theme: {UnistylesRuntime.themeName}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <ThemeSwitcher />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Token Overview</Text>
          <Text style={styles.sectionDesc}>
            Narrative color arc, mood themes, and quick links.
          </Text>
          <Text style={styles.sectionTitle}>Color Narrative</Text>
          <Text style={styles.sectionDesc}>
            Four narrative sections define the emotional arc of the landing page
            and flow through every mood theme.
          </Text>
          <View style={styles.stack}>
            <View
              style={styles.overviewBlock(
                theme.narrative.climb.bg,
                theme.narrative.climb.text,
                theme,
              )}
            >
              <Text
                style={styles.badgeLabel(
                  theme.narrative.climb.text,
                  theme.narrative.climb.bg,
                  theme,
                )}
              >
                Climb
              </Text>
              <Text style={styles.narrativeTitle(theme)}>The Climb</Text>
              <Text style={styles.previewBody(theme)}>
                Energy builds. Yellow warmth, dark ink. The opening statement.
              </Text>
              <Text style={styles.overviewCode(theme)}>
                --ob-narrative-climb-bg / --ob-narrative-climb-text
              </Text>
            </View>
            <View
              style={styles.overviewBlock(
                theme.narrative.drop.bg,
                theme.narrative.drop.text,
                theme,
              )}
            >
              <Text
                style={styles.badgeLabel(
                  theme.narrative.drop.text,
                  theme.narrative.drop.bg,
                  theme,
                )}
              >
                Drop
              </Text>
              <Text style={styles.narrativeTitle(theme)}>The Drop</Text>
              <Text style={styles.previewBody(theme)}>
                Deep black to indigo. The moment of impact. Purple accents glow.
              </Text>
              <Text style={styles.overviewCode(theme)}>
                --ob-narrative-drop-bg / --ob-narrative-drop-text
              </Text>
            </View>
            <View
              style={styles.overviewBlock(
                theme.narrative.stories.bg,
                theme.narrative.stories.text,
                theme,
              )}
            >
              <Text
                style={styles.badgeLabel(
                  theme.narrative.stories.accentForeground,
                  theme.narrative.stories.accent1,
                  theme,
                )}
              >
                Stories
              </Text>
              <Text style={styles.narrativeTitle(theme)}>The Stories</Text>
              <Text style={styles.previewBody(theme)}>
                Deep indigo canvas. Multi-color accents for individual badge
                stories.
              </Text>
              <Text style={styles.overviewCode(theme)}>
                --ob-narrative-stories-bg / --ob-narrative-stories-text
              </Text>
            </View>
            <View
              style={styles.overviewBlock(
                theme.narrative.relief.bg,
                theme.narrative.relief.text,
                theme,
              )}
            >
              <Text
                style={styles.badgeLabel(
                  pickReadableText(theme.narrative.relief.accent),
                  theme.narrative.relief.accent,
                  theme,
                )}
              >
                Relief
              </Text>
              <Text style={styles.narrativeTitle(theme)}>The Relief</Text>
              <Text style={styles.previewBody(theme)}>
                Mint calm. The landing zone. Footer, CTA, resolution.
              </Text>
              <Text style={styles.overviewCode(theme)}>
                --ob-narrative-relief-bg / --ob-narrative-relief-text
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Design Language</Text>
          <Text style={styles.sectionDesc}>
            Display type and narrative blocks define the visual identity.
          </Text>
          <View style={styles.displayBlock(theme)}>
            <Text style={styles.displayText(theme, "5xl")}>
              Badges{"\n"}with bite.
            </Text>
          </View>
          <View style={styles.row}>
            <View style={styles.sectionBlock(theme)}>
              <Text
                style={styles.badgeLabel(
                  theme.colors.backgroundSecondary,
                  theme.colors.text,
                  theme,
                )}
              >
                Section Block
              </Text>
              <Text style={styles.sectionBlockText(theme)}>
                Clean cards with thin borders. No offset shadows.
              </Text>
            </View>
            <View style={styles.sectionBlock(theme)}>
              <Text
                style={styles.badgeLabel(
                  theme.colors.backgroundSecondary,
                  theme.colors.text,
                  theme,
                )}
              >
                Badge Label
              </Text>
              <Text style={styles.sectionBlockText(theme)}>
                Inline label without offset. Clean, readable metadata.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type Samples</Text>
          <View style={styles.typeSamples(theme)}>
            <Text style={styles.typeHeadline(theme)}>Anybody Headline</Text>
            <Text style={styles.previewBody(theme)}>
              Instrument Sans body copy keeps rhythm calm and clear.
            </Text>
            <Text style={styles.previewMono(theme)}>
              DM Mono for code and metadata.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Quick Links</Text>
          <Text style={styles.sectionDesc}>
            Each mood adapts the narrative arc for different accessibility
            needs.
          </Text>
          <View style={styles.row}>
            {[
              "The Full Ride (Landing)",
              "The Full Ride (Default)",
              "Night Ride (Dark)",
              "Bold Ink (High Contrast)",
              "Warm Studio (Dyslexia Friendly)",
              "Still Water (Autism Friendly)",
              "Same Ride, Bigger Seat (Large Text)",
              "Loud & Clear (Low Vision)",
              "Clean Signal (Low Info)",
            ].map((label) => (
              <Pressable key={label} style={styles.swatchCard(theme)}>
                <Text style={styles.swatchText(theme)}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme Pages</Text>
          <Text style={styles.sectionDesc}>
            Full overview pages rendered for each theme.
          </Text>
          {renderLanding(composeTheme("light", "default"))}
          {previewThemes.map((page) => (
            <View key={page.id} style={styles.previewCard(page.theme)}>
              <Text style={styles.previewTitle(page.theme)}>{page.title}</Text>
              <Text style={styles.previewSubtitle(page.theme)}>
                {page.subtitle}
              </Text>
              {page.narrativeDesc && page.narrativeCopy
                ? renderNarrativeArc(
                    page.theme,
                    page.narrativeDesc,
                    page.narrativeCopy,
                    page.storyLabels,
                  )
                : null}
              {page.accentPalette
                ? renderAccentPalette(
                    page.theme,
                    page.id === "low-info"
                      ? "Single accent color — intentionally reduced for minimal cognitive load."
                      : `Four accent colors derived from the ${page.title} theme.`,
                    page.accentPalette,
                  )
                : null}
              {renderTypeSamples(
                page.theme,
                page.typeSampleBody,
                page.typeSampleMono,
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

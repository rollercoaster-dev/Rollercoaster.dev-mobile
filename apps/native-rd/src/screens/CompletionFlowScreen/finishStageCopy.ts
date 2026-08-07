import type { TFunction } from "i18next";

import type { FinishCelebrateStageProps } from "../../components/FinishCelebrateStage";
import type { FinishDesignStageProps } from "../../components/FinishDesignStage";
import type {
  FinishBakingStageProps,
  FinishBakingStatus,
} from "../../components/FinishBakingStage";
import type { FinishRevealStageProps } from "../../components/FinishRevealStage";
import type { BadgeCreationStatus } from "../../hooks/useCreateBadge";

/**
 * Localized copy for the four finishing-flow stages, split out of the screen so
 * the orchestrator file stays about the stage machine rather than prop lists.
 *
 * Each builder returns only the copy props — the behavioral props (design,
 * handlers, status, refs) stay at the call site, so what the screen actually
 * *does* is still readable in one place.
 */

/**
 * The `t` the screen holds. `badgeDesigner` is in the list because the design
 * stage composes the same `src/badges/` selectors BadgeDesignerScreen does —
 * those controls already localize themselves out of that namespace, so their
 * section headings belong there too rather than being duplicated under
 * `completion:`.
 */
export type FinishT = TFunction<["completion", "common", "badgeDesigner"]>;

/** Copy-only subset of each stage's props — behavior stays at the call site. */
type CopyProps<P, K extends keyof P> = Pick<P, K>;

export function celebrateCopy(
  t: FinishT,
  { title, stepCount }: { title: string; stepCount: number },
): CopyProps<
  FinishCelebrateStageProps,
  | "eyebrow"
  | "headline"
  | "summary"
  | "closingNotePromptLabel"
  | "closingNoteOptionalLabel"
  | "closingNotePlaceholder"
  | "closingNoteAccessibilityLabel"
  | "closingNoteAccessibilityHint"
  | "ctaLabel"
  | "ctaSubcopy"
> {
  return {
    eyebrow: t("completion:finish.celebrate.eyebrow"),
    headline: t("completion:finish.celebrate.headline"),
    summary:
      stepCount === 0
        ? t("completion:finish.celebrate.summaryNoSteps", { title })
        : t("completion:finish.celebrate.summary", {
            count: stepCount,
            title,
          }),
    closingNotePromptLabel: t(
      "completion:finish.celebrate.closingNotePromptLabel",
    ),
    closingNoteOptionalLabel: t(
      "completion:finish.celebrate.closingNoteOptionalLabel",
    ),
    closingNotePlaceholder: t(
      "completion:finish.celebrate.closingNotePlaceholder",
    ),
    closingNoteAccessibilityLabel: t(
      "completion:finish.celebrate.closingNoteA11yLabel",
    ),
    closingNoteAccessibilityHint: t(
      "completion:finish.celebrate.closingNoteA11yHint",
    ),
    ctaLabel: t("completion:finish.celebrate.ctaLabel"),
    ctaSubcopy: t("completion:finish.celebrate.ctaSubcopy"),
  };
}

export function designCopy(
  t: FinishT,
): CopyProps<
  FinishDesignStageProps,
  | "headerTitle"
  | "backAccessibilityLabel"
  | "shapeSectionTitle"
  | "frameSectionTitle"
  | "centerSectionTitle"
  | "colorSectionTitle"
  | "inscriptionsSectionTitle"
  | "bottomLabelPlaceholder"
  | "bottomLabelAccessibilityLabel"
  | "bakeLabel"
  | "bakeSubcopy"
> {
  return {
    headerTitle: t("completion:finish.design.headerTitle"),
    backAccessibilityLabel: t("completion:finish.design.backA11yLabel"),
    // Section titles reuse badgeDesigner's accordion labels: these are the same
    // five sections that screen shows, and the controls inside them already
    // localize themselves out of that namespace.
    shapeSectionTitle: t("badgeDesigner:accordion.sections.shape"),
    frameSectionTitle: t("badgeDesigner:accordion.sections.frame"),
    centerSectionTitle: t("badgeDesigner:accordion.sections.center"),
    colorSectionTitle: t("badgeDesigner:accordion.sections.colors"),
    inscriptionsSectionTitle: t(
      "badgeDesigner:accordion.sections.inscriptions",
    ),
    bottomLabelPlaceholder: t("badgeDesigner:bottomLabel.placeholder"),
    bottomLabelAccessibilityLabel: t("badgeDesigner:bottomLabel.a11y"),
    bakeLabel: t("completion:finish.design.bakeLabel"),
    bakeSubcopy: t("completion:finish.design.bakeSubcopy"),
  };
}

export function bakingCopy(
  t: FinishT,
  { errorDetail }: { errorDetail: string },
): CopyProps<
  FinishBakingStageProps,
  | "label"
  | "successLabel"
  | "noKeyLabel"
  | "noKeyActionLabel"
  | "errorMessage"
  | "retryLabel"
> {
  return {
    label: t("completion:finish.baking.label"),
    successLabel: t("completion:finish.baking.successLabel"),
    // noKeyMessage / errorMessage predate the redesign and are reused verbatim
    // (#499 D2/D3); retry uses the shared common:actions.retry label.
    noKeyLabel: t("completion:badge.noKeyMessage"),
    noKeyActionLabel: t("completion:finish.baking.exitWithoutBadgeLabel"),
    errorMessage: t("completion:badge.errorMessage", { message: errorDetail }),
    retryLabel: t("common:actions.retry"),
  };
}

export function revealCopy(
  t: FinishT,
): CopyProps<
  FinishRevealStageProps,
  "eyebrow" | "viewBadgeLabel" | "backToGoalsLabel"
> {
  return {
    eyebrow: t("completion:finish.reveal.eyebrow"),
    viewBadgeLabel: t("completion:finish.reveal.viewBadgeLabel"),
    backToGoalsLabel: t("completion:finish.reveal.backToGoalsLabel"),
  };
}

/**
 * Project `useCreateBadge`'s status onto the baking interstitial's render
 * state.
 *
 * Two deliberate collapses:
 *  - `done → "success"` — the interstitial names the terminal happy state
 *    differently from the hook.
 *  - `idle`/`loading` → `"building"` — there is no distinct pre-bake UI, and
 *    folding them into the busy phase is what makes Retry re-arm: `retryBake()`
 *    walks the hook `error → idle → building → …`, and mapping that `idle` tick
 *    to a non-`"error"` value is what `FinishBakingStage`'s reset effect watches
 *    for. A raw `error → error` transition would leave Retry stuck disabled.
 */
export function mapBakeStatus(status: BadgeCreationStatus): FinishBakingStatus {
  switch (status) {
    case "done":
      return "success";
    case "idle":
    case "loading":
      return "building";
    default:
      return status;
  }
}

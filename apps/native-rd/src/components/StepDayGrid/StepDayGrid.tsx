import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../Text";
import { DayCell } from "./StepDayGrid.parts";
import { styles } from "./StepDayGrid.styles";
import {
  dayKey,
  daysInMonth,
  groupMarksByDay,
  isPastDay,
  leadingBlanks,
  shiftMonth,
  toDayKey,
  type GridMonth,
} from "./monthGrid";

/** A day another step already sits on, with its list ordinal ("1", "2", "a"). */
export interface StepDayMark {
  /** `YYYY-MM-DD`. */
  date: string;
  /** The other step's ordinal badge text. Caller-assigned. */
  label: string;
}

export interface StepDayGridProps {
  /** Selected day as `YYYY-MM-DD`, or null for no day. */
  value: string | null;
  /**
   * Required. Never read the clock inside this component — the same convention
   * `resolveStepDependencyBand` follows (`src/db/queries.ts`), so stories and
   * tests pin a fixed instant. Drives today's ring and the past-day quieting,
   * and nothing else.
   */
  now: Date;
  /** Days other steps sit on. Two badges render per day, then an overflow badge. */
  marks?: readonly StepDayMark[];
  /** Fires with the tapped day, or `null` when the selected day is tapped again. */
  onChange: (next: string | null) => void;
  /** BCP-47 tag for month + weekday names — pass `i18n.language` from the caller. */
  locale?: string;

  // --- Copy: caller-supplied with English defaults (the D7 convention). ---
  /** a11y label for the previous-month control. */
  previousMonthLabel?: string;
  /** a11y label for the next-month control. */
  nextMonthLabel?: string;
  /** Quiet caption under the grid. */
  legendLabel?: string;
  /** Appended to a day's a11y label when other steps sit there. */
  marksA11ySuffix?: (count: number) => string;
  /** testID root; day cells get `${testID}-day-${iso}`. */
  testID?: string;
}

/** A Monday, used to generate localised weekday headers in the right order. */
const A_KNOWN_MONDAY = new Date(2026, 5, 22);

const defaultMarksA11ySuffix = (count: number) =>
  count === 1 ? "1 other step here" : `${count} other steps here`;

/** The month a `YYYY-MM-DD` key falls in. */
function monthOfKey(key: string): GridMonth {
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) - 1 };
}

function sameMonth(a: GridMonth, b: GridMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

/**
 * A themed month grid — the only way a day gets named in this app, so **every**
 * day has to be reachable (#574).
 *
 * Month navigation is unbounded in both directions, weeks start Monday, and no
 * day is ever disabled: past days read quieter but stay selectable, because
 * both the `was expected` reading (#571) and an ordinary "I meant last Tuesday"
 * depend on it. Guards inform; they never refuse (ADR-0010/0012).
 *
 * Emits plain `YYYY-MM-DD`. Converting to a branded `DateIso` at local midnight
 * is the **caller's** job (#576) — a due date is a *day*, `DateIso` is a
 * timestamp.
 *
 * **Recurrence** would attach next to the month header. Nothing is built for it
 * (#574 is explicit: note where it goes, build nothing).
 *
 * **Why not `@react-native-community/datetimepicker`**, which is installed and
 * unused: (1) it is an OS component and cannot honour the seven theme variants,
 * so the `AllThemesMatrix` acceptance would be unsatisfiable; (2) on Android it
 * is a modal dialog, and the whole point of #573's redesign is that authoring
 * stops happening in a modal; (3) it has no `marks` concept, so seeing the rest
 * of the plan on the calendar you pick from — the reason in-list dating beats a
 * sheet — is impossible; (4) Storybook web is one of our review surfaces and its
 * web support is untested here.
 */
export function StepDayGrid({
  value,
  now,
  marks,
  onChange,
  locale,
  previousMonthLabel = "Previous month",
  nextMonthLabel = "Next month",
  legendLabel = "badges mark days your other steps sit on",
  marksA11ySuffix = defaultMarksA11ySuffix,
  testID = "step-day-grid",
}: StepDayGridProps) {
  const [view, setView] = useState<GridMonth>(() =>
    monthOfKey(value ?? toDayKey(now)),
  );

  // Re-anchor on a caller-driven value change, during render rather than in an
  // effect (React's "adjusting state when a prop changes" pattern) — an effect
  // here would paint the wrong month for one frame. Tracking the last `value`
  // we reacted to keeps manual month navigation sticky: navigating away from
  // the selected day's month must not snap back on the next render.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (value) {
      const target = monthOfKey(value);
      if (!sameMonth(target, view)) setView(target);
    }
  }

  const nowKey = toDayKey(now);
  const marksByDay = useMemo(() => groupMarksByDay(marks ?? []), [marks]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }).format(new Date(view.year, view.month, 1)),
    [locale, view.year, view.month],
  );

  // Generated from a known Monday so the header order matches the Monday-first
  // grid in every locale — never a hand-written weekday array (#574).
  const weekdayLabels = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    return Array.from({ length: 7 }, (_, i) =>
      format.format(
        new Date(
          A_KNOWN_MONDAY.getFullYear(),
          A_KNOWN_MONDAY.getMonth(),
          A_KNOWN_MONDAY.getDate() + i,
        ),
      ),
    );
  }, [locale]);

  const dayA11yFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [locale],
  );

  const blanks = leadingBlanks(view.year, view.month);
  const dayCount = daysInMonth(view.year, view.month);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={previousMonthLabel}
          testID={`${testID}-prev`}
          onPress={() => setView((current) => shiftMonth(current, -1))}
          style={({ pressed }) => [
            styles.navButton,
            pressed && styles.navButtonPressed,
          ]}
        >
          <Text style={styles.navGlyph}>‹</Text>
        </Pressable>

        <Text style={styles.monthLabel} testID={`${testID}-month-label`}>
          {monthLabel}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nextMonthLabel}
          testID={`${testID}-next`}
          onPress={() => setView((current) => shiftMonth(current, 1))}
          style={({ pressed }) => [
            styles.navButton,
            pressed && styles.navButtonPressed,
          ]}
        >
          <Text style={styles.navGlyph}>›</Text>
        </Pressable>
      </View>

      <View style={styles.week}>
        {weekdayLabels.map((label, index) => (
          <View
            // Weekday initials repeat within a week (T/T, S/S), so the index is
            // the only stable key here.
            key={`weekday-${index}`}
            style={styles.cell}
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.weekdayLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.week} testID={`${testID}-days`}>
        {Array.from({ length: blanks }, (_, index) => (
          <View
            key={`blank-${index}`}
            testID={`${testID}-blank-${index}`}
            style={styles.cell}
            importantForAccessibility="no-hide-descendants"
          />
        ))}

        {Array.from({ length: dayCount }, (_, index) => {
          const day = index + 1;
          const key = dayKey(view.year, view.month, day);
          const isSelected = key === value;
          const dayMarks = marksByDay[key] ?? [];
          const a11ySuffix = dayMarks.length
            ? `, ${marksA11ySuffix(dayMarks.length)}`
            : "";

          return (
            <View key={key} style={styles.cell}>
              <DayCell
                day={day}
                dayKey={key}
                a11yLabel={
                  dayA11yFormat.format(new Date(view.year, view.month, day)) +
                  a11ySuffix
                }
                isSelected={isSelected}
                isToday={key === nowKey}
                isPast={isPastDay(key, nowKey)}
                marks={dayMarks}
                // Tapping the selected day again clears it — the same
                // tap-again-to-clear the prototype's `pickExp` had.
                onPress={() => onChange(isSelected ? null : key)}
                testID={`${testID}-day-${key}`}
              />
            </View>
          );
        })}
      </View>

      <Text style={styles.legend}>{legendLabel}</Text>
    </View>
  );
}

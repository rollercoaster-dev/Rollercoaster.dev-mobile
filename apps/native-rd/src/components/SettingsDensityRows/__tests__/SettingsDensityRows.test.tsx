import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { densityOptions, type DensityLevel } from "../../../utils/density";
import { densityA11yLabel } from "../../../i18n/labels";

import { SettingsDensityRows } from "../SettingsDensityRows";

const t = i18n.t.bind(i18n);
const labelOf = (id: DensityLevel) => t(`settings:density.options.${id}.label`);
const descriptionOf = (id: DensityLevel) =>
  t(`settings:density.options.${id}.description`);
const a11yLabelOf = (id: DensityLevel) => densityA11yLabel(t, id);

describe("SettingsDensityRows", () => {
  it("renders exactly three radio rows", () => {
    renderWithProviders(
      <SettingsDensityRows selectedLevel="default" onSelect={jest.fn()} />,
    );
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("marks only the selected level as checked and shows a single ✓", () => {
    renderWithProviders(
      <SettingsDensityRows selectedLevel="comfortable" onSelect={jest.fn()} />,
    );
    const radios = screen.getAllByRole("radio");
    const checked = radios.filter(
      (r) => r.props.accessibilityState?.checked === true,
    );
    expect(checked).toHaveLength(1);
    expect(checked[0].props.accessibilityLabel).toBe(
      a11yLabelOf("comfortable"),
    );
    expect(screen.getAllByText("✓")).toHaveLength(1);
  });

  it.each(densityOptions.map((o) => o.id))(
    "calls onSelect with %s when that row is pressed",
    (id) => {
      const onSelect = jest.fn();
      renderWithProviders(
        <SettingsDensityRows selectedLevel="default" onSelect={onSelect} />,
      );
      fireEvent.press(screen.getByRole("radio", { name: a11yLabelOf(id) }));
      expect(onSelect).toHaveBeenCalledWith(id);
    },
  );

  it("exposes the group as a radiogroup with a label", () => {
    renderWithProviders(
      <SettingsDensityRows selectedLevel="default" onSelect={jest.fn()} />,
    );
    // Queried via label, not getByRole: the group deliberately omits
    // `accessible` (so it doesn't swallow its rows) and RNTL's role query
    // only matches elements whose `accessible` prop is truthy.
    const group = screen.getByLabelText(t("settings:density.title"));
    expect(group.props.accessibilityRole).toBe("radiogroup");
  });

  // Regression guard for #500: the group used to set `accessible={true}`
  // outside E2E mode, collapsing all three rows into one VoiceOver node. The
  // component must now render the same tree either way — hence both cases.
  it.each([
    ["unset", undefined],
    ['"true"', "true"],
  ])(
    "keeps every row individually reachable with EXPO_PUBLIC_E2E_MODE %s",
    (_name, value) => {
      const original = process.env.EXPO_PUBLIC_E2E_MODE;
      if (value === undefined) {
        delete process.env.EXPO_PUBLIC_E2E_MODE;
      } else {
        process.env.EXPO_PUBLIC_E2E_MODE = value;
      }
      try {
        renderWithProviders(
          <SettingsDensityRows selectedLevel="default" onSelect={jest.fn()} />,
        );
        expect(screen.getAllByRole("radio")).toHaveLength(3);
        for (const { id } of densityOptions) {
          expect(screen.getByLabelText(a11yLabelOf(id))).toBeOnTheScreen();
        }
      } finally {
        if (original === undefined) {
          delete process.env.EXPO_PUBLIC_E2E_MODE;
        } else {
          process.env.EXPO_PUBLIC_E2E_MODE = original;
        }
      }
    },
  );

  it.each(densityOptions.map((o) => o.id))(
    "announces %s as '<label>. <description>' in both checked and unchecked states",
    (id) => {
      for (const selectedLevel of [id, "default"] as DensityLevel[]) {
        const { unmount } = renderWithProviders(
          <SettingsDensityRows
            selectedLevel={selectedLevel}
            onSelect={jest.fn()}
          />,
        );
        const radio = screen.getByLabelText(a11yLabelOf(id));
        // The description is the row's visible `value` only while unselected —
        // once "✓" replaces it, the accessible name must still carry it.
        expect(radio.props.accessibilityLabel).toBe(
          `${labelOf(id)}. ${descriptionOf(id)}`,
        );
        unmount();
      }
    },
  );
});

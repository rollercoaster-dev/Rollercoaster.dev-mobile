import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { ModeIndicator, type LifecycleMode } from "../ModeIndicator";

const MODES: LifecycleMode[] = ["edit", "focus", "complete", "timeline"];

describe("ModeIndicator", () => {
  test.each(MODES)("renders %s mode with label", (mode) => {
    renderWithProviders(<ModeIndicator mode={mode} />);

    expect(
      screen.getByText(i18n.t(`common:modeIndicator.${mode}`)),
    ).toBeTruthy();
  });

  test.each(MODES)("has accessible label for %s mode", (mode) => {
    renderWithProviders(<ModeIndicator mode={mode} />);

    expect(
      screen.getByLabelText(
        i18n.t("common:modeIndicator.a11y.current", {
          label: i18n.t(`common:modeIndicator.${mode}`),
        }),
      ),
    ).toBeTruthy();
  });

  it("renders image when icon prop is provided", () => {
    const testIcon = { uri: "https://example.com/icon.png" };
    renderWithProviders(<ModeIndicator mode="edit" icon={testIcon} />);

    expect(screen.getByText(i18n.t("common:modeIndicator.edit"))).toBeTruthy();
    // When icon is provided, emoji should not be rendered
    expect(screen.queryByText("📝")).toBeNull();
  });
});

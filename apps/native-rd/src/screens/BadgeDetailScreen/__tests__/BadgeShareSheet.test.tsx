import React from "react";
import { StyleSheet } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { BadgeShareSheet, type BadgeShareSheetProps } from "../BadgeShareSheet";

const makeProps = (
  overrides?: Partial<BadgeShareSheetProps>,
): BadgeShareSheetProps => ({
  goalTitle: "Rewire the workshop",
  isSheetOpen: true,
  canShareImage: true,
  hasCredential: true,
  isExportingImage: false,
  isExportingJSON: false,
  onOpenSheet: jest.fn(),
  onCloseSheet: jest.fn(),
  onShareVerifiable: jest.fn(),
  onSaveImage: jest.fn(),
  onExportCredential: jest.fn(),
  ...overrides,
});

const ROW_IDS = [
  "share-row-verifiable",
  "share-row-image",
  "share-row-credential",
] as const;

describe("BadgeShareSheet", () => {
  it("fires onOpenSheet when the primary CTA is pressed", () => {
    const onOpenSheet = jest.fn();
    renderWithProviders(
      <BadgeShareSheet {...makeProps({ isSheetOpen: false, onOpenSheet })} />,
    );
    fireEvent.press(screen.getByTestId("badge-share-cta"));
    expect(onOpenSheet).toHaveBeenCalledTimes(1);
  });

  it("renders no rows while closed and all three rows once open", () => {
    const { rerender } = renderWithProviders(
      <BadgeShareSheet {...makeProps({ isSheetOpen: false })} />,
    );
    // CTA is always present; the sheet rows only mount when open.
    expect(screen.getByTestId("badge-share-cta")).toBeOnTheScreen();
    ROW_IDS.forEach((id) => expect(screen.queryByTestId(id)).toBeNull());

    rerender(<BadgeShareSheet {...makeProps({ isSheetOpen: true })} />);
    ROW_IDS.forEach((id) => expect(screen.getByTestId(id)).toBeOnTheScreen());
  });

  it("interpolates the goal title into the sheet header", () => {
    renderWithProviders(
      <BadgeShareSheet {...makeProps({ goalTitle: "Rewire the workshop" })} />,
    );
    expect(screen.getByText("Share “Rewire the workshop”")).toBeOnTheScreen();
  });

  it.each([
    { testID: "share-row-verifiable", handler: "onShareVerifiable" as const },
    { testID: "share-row-image", handler: "onSaveImage" as const },
    { testID: "share-row-credential", handler: "onExportCredential" as const },
  ])(
    "fires $handler when the enabled $testID row is pressed",
    ({ testID, handler }) => {
      const fn = jest.fn();
      renderWithProviders(
        <BadgeShareSheet {...makeProps({ [handler]: fn })} />,
      );
      fireEvent.press(screen.getByTestId(testID));
      expect(fn).toHaveBeenCalledTimes(1);
    },
  );

  it("disables the verifiable + image rows (not credential) when canShareImage is false", () => {
    const onShareVerifiable = jest.fn();
    const onSaveImage = jest.fn();
    renderWithProviders(
      <BadgeShareSheet
        {...makeProps({ canShareImage: false, onShareVerifiable, onSaveImage })}
      />,
    );

    const verifiable = screen.getByTestId("share-row-verifiable");
    const image = screen.getByTestId("share-row-image");
    const credential = screen.getByTestId("share-row-credential");

    expect(verifiable.props.accessibilityState.disabled).toBe(true);
    expect(image.props.accessibilityState.disabled).toBe(true);
    expect(credential.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(verifiable);
    fireEvent.press(image);
    expect(onShareVerifiable).not.toHaveBeenCalled();
    expect(onSaveImage).not.toHaveBeenCalled();
  });

  it("disables only the credential row when hasCredential is false", () => {
    const onExportCredential = jest.fn();
    renderWithProviders(
      <BadgeShareSheet
        {...makeProps({ hasCredential: false, onExportCredential })}
      />,
    );

    const credential = screen.getByTestId("share-row-credential");
    expect(credential.props.accessibilityState.disabled).toBe(true);
    expect(
      screen.getByTestId("share-row-verifiable").props.accessibilityState
        .disabled,
    ).toBe(false);

    fireEvent.press(credential);
    expect(onExportCredential).not.toHaveBeenCalled();
  });

  it("shows a spinner on both PNG rows while exporting the image", () => {
    renderWithProviders(
      <BadgeShareSheet {...makeProps({ isExportingImage: true })} />,
    );
    // useBadgeExport sets one flag for both PNG paths, so both rows spin.
    expect(
      screen.getByTestId("share-row-verifiable-loading"),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("share-row-image-loading")).toBeOnTheScreen();
    expect(screen.queryByTestId("share-row-credential-loading")).toBeNull();
  });

  it("shows a spinner only on the credential row while exporting JSON", () => {
    renderWithProviders(
      <BadgeShareSheet {...makeProps({ isExportingJSON: true })} />,
    );
    expect(
      screen.getByTestId("share-row-credential-loading"),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("share-row-verifiable-loading")).toBeNull();
    expect(screen.queryByTestId("share-row-image-loading")).toBeNull();
  });

  it("blocks the PNG rows (and marks them busy) while exporting the image", () => {
    const onShareVerifiable = jest.fn();
    const onSaveImage = jest.fn();
    renderWithProviders(
      <BadgeShareSheet
        {...makeProps({
          isExportingImage: true,
          onShareVerifiable,
          onSaveImage,
        })}
      />,
    );

    const verifiable = screen.getByTestId("share-row-verifiable");
    const image = screen.getByTestId("share-row-image");

    // A row is inert while it exports so the handler can't double-fire.
    expect(verifiable.props.accessibilityState.disabled).toBe(true);
    expect(image.props.accessibilityState.disabled).toBe(true);
    expect(verifiable.props.accessibilityState.busy).toBe(true);
    expect(image.props.accessibilityState.busy).toBe(true);

    fireEvent.press(verifiable);
    fireEvent.press(image);
    expect(onShareVerifiable).not.toHaveBeenCalled();
    expect(onSaveImage).not.toHaveBeenCalled();
  });

  it("blocks the credential row (and marks it busy) while exporting JSON", () => {
    const onExportCredential = jest.fn();
    renderWithProviders(
      <BadgeShareSheet
        {...makeProps({ isExportingJSON: true, onExportCredential })}
      />,
    );

    const credential = screen.getByTestId("share-row-credential");
    expect(credential.props.accessibilityState.disabled).toBe(true);
    expect(credential.props.accessibilityState.busy).toBe(true);

    fireEvent.press(credential);
    expect(onExportCredential).not.toHaveBeenCalled();
  });

  it("interpolates a goal title containing $ characters literally", () => {
    renderWithProviders(
      <BadgeShareSheet {...makeProps({ goalTitle: "Buy the $$ pass" })} />,
    );
    // String.replace would mangle `$$` -> `$`; split/join keeps it literal.
    expect(screen.getByText("Share “Buy the $$ pass”")).toBeOnTheScreen();
  });

  it("renders the RECOMMENDED tag only on the verifiable row", () => {
    renderWithProviders(<BadgeShareSheet {...makeProps()} />);
    const tag = screen.getByTestId("share-recommended-tag");
    expect(tag).toBeOnTheScreen();
    // Exactly one tag in the tree.
    expect(screen.getAllByTestId("share-recommended-tag")).toHaveLength(1);
    expect(screen.getByText("RECOMMENDED")).toBeOnTheScreen();
  });

  it("dismisses the sheet when the backdrop is tapped", () => {
    const onCloseSheet = jest.fn();
    renderWithProviders(<BadgeShareSheet {...makeProps({ onCloseSheet })} />);
    fireEvent.press(screen.getByTestId("badge-share-backdrop"));
    expect(onCloseSheet).toHaveBeenCalledTimes(1);
  });

  // WCAG 2.1 AA contract: every interactive control carries a non-empty label
  // and holds at least a 44pt target, across the enabled and disabled states.
  it.each([
    { label: "all enabled", props: {} as Partial<BadgeShareSheetProps> },
    { label: "no baked image", props: { canShareImage: false } },
    { label: "no credential", props: { hasCredential: false } },
  ])("every button has a label and a >=44pt target ($label)", ({ props }) => {
    renderWithProviders(<BadgeShareSheet {...makeProps(props)} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((button) => {
      expect(button.props.accessibilityLabel).toBeTruthy();
      const flat = StyleSheet.flatten(button.props.style) as {
        minHeight?: number;
      };
      expect(flat.minHeight).toBeGreaterThanOrEqual(44);
    });
  });
});

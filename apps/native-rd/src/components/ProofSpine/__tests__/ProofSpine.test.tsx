import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import type { ProofSpineItem } from "../ProofSpine";
import { ProofSpine } from "../ProofSpine";

const threeItems: ProofSpineItem[] = [
  { id: "1", name: "Lab notebook page", type: "photo" },
  { id: "2", name: "Demo walkthrough", type: "video" },
  { id: "3", name: "Legacy attachment", type: null },
];

describe("ProofSpine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders one card per evidence item", () => {
    renderWithProviders(
      <ProofSpine evidence={threeItems} onCardPress={jest.fn()} />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("presses a card and invokes onCardPress with its id", () => {
    const onCardPress = jest.fn();
    renderWithProviders(
      <ProofSpine evidence={threeItems} onCardPress={onCardPress} />,
    );
    fireEvent.press(screen.getByText("Demo walkthrough"));
    expect(onCardPress).toHaveBeenCalledTimes(1);
    expect(onCardPress).toHaveBeenCalledWith("2");
  });

  it("renders the singular header for a single item", () => {
    renderWithProviders(
      <ProofSpine
        evidence={[{ id: "1", name: "Only one", type: "photo" }]}
        onCardPress={jest.fn()}
      />,
    );
    expect(
      screen.getByText(i18n.t("badgeDetail:proofSpine.header", { count: 1 })),
    ).toBeOnTheScreen();
  });

  it("renders the plural header for multiple items", () => {
    renderWithProviders(
      <ProofSpine evidence={threeItems} onCardPress={jest.fn()} />,
    );
    expect(
      screen.getByText(i18n.t("badgeDetail:proofSpine.header", { count: 3 })),
    ).toBeOnTheScreen();
  });

  it("exposes a count-aware list container", () => {
    renderWithProviders(
      <ProofSpine evidence={threeItems} onCardPress={jest.fn()} />,
    );
    const list = screen.getByLabelText(
      i18n.t("badgeDetail:proofSpine.a11y.listLabel", { count: 3 }),
    );
    expect(list.props.accessibilityRole).toBe("list");
  });

  describe("empty state", () => {
    it("renders the honest empty message", () => {
      renderWithProviders(<ProofSpine evidence={[]} onCardPress={jest.fn()} />);
      expect(
        screen.getByText(i18n.t("badgeDetail:proofSpine.emptyState.message")),
      ).toBeOnTheScreen();
    });

    it("renders no interactive card and no list in the empty state", () => {
      renderWithProviders(<ProofSpine evidence={[]} onCardPress={jest.fn()} />);
      expect(screen.queryByRole("button")).toBeNull();
      // The list container is labelled + role="list" only in the non-empty
      // branch; its absence here proves the empty state is a plain block.
      expect(
        screen.queryByLabelText(
          i18n.t("badgeDetail:proofSpine.a11y.listLabel", { count: 0 }),
        ),
      ).toBeNull();
    });

    it("never calls onCardPress from the empty state", () => {
      const onCardPress = jest.fn();
      renderWithProviders(
        <ProofSpine evidence={[]} onCardPress={onCardPress} />,
      );
      expect(onCardPress).not.toHaveBeenCalled();
    });

    it("uses no shaming vocabulary in the empty message", () => {
      const message = i18n.t("badgeDetail:proofSpine.emptyState.message");
      renderWithProviders(<ProofSpine evidence={[]} onCardPress={jest.fn()} />);
      expect(screen.getByText(message)).toBeOnTheScreen();
      for (const banned of ["missing", "needed", "add"]) {
        expect(message.toLowerCase()).not.toContain(banned);
      }
    });
  });
});

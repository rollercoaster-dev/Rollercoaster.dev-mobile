import React from "react";

import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import {
  FinishCelebrateStage,
  type FinishCelebrateStageProps,
} from "../FinishCelebrateStage";

const makeProps = (
  overrides?: Partial<FinishCelebrateStageProps>,
): FinishCelebrateStageProps => ({
  summary:
    "All 5 steps done for Rewire the workshop — with 3 pieces of evidence.",
  closingNoteValue: "",
  onClosingNoteChange: jest.fn(),
  onDesignBadge: jest.fn(),
  ...overrides,
});

describe("FinishCelebrateStage", () => {
  it("renders the eyebrow, headline, summary, and CTA", () => {
    renderWithProviders(<FinishCelebrateStage {...makeProps()} />);
    expect(screen.getByText("Goal complete")).toBeOnTheScreen();
    expect(screen.getByText("You did it.")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "All 5 steps done for Rewire the workshop — with 3 pieces of evidence.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("finish-celebrate-cta")).toBeOnTheScreen();
  });

  it("gives the headline a header a11y role", () => {
    renderWithProviders(<FinishCelebrateStage {...makeProps()} />);
    expect(screen.getByText("You did it.").props.accessibilityRole).toBe(
      "header",
    );
  });

  it("shows the dashed prompt and no note field when closed", () => {
    renderWithProviders(<FinishCelebrateStage {...makeProps()} />);
    expect(
      screen.getByTestId("finish-celebrate-note-prompt"),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("finish-celebrate-note-input")).toBeNull();
  });

  it("reveals the note field when the prompt is tapped (internal state)", () => {
    renderWithProviders(<FinishCelebrateStage {...makeProps()} />);
    fireEvent.press(screen.getByTestId("finish-celebrate-note-prompt"));
    expect(screen.getByTestId("finish-celebrate-note-input")).toBeOnTheScreen();
    expect(screen.queryByTestId("finish-celebrate-note-prompt")).toBeNull();
  });

  it("renders the note field open when initialNoteOpen is set", () => {
    renderWithProviders(
      <FinishCelebrateStage {...makeProps({ initialNoteOpen: true })} />,
    );
    expect(screen.getByTestId("finish-celebrate-note-input")).toBeOnTheScreen();
  });

  it("fires onClosingNoteChange as the note is edited", () => {
    const onClosingNoteChange = jest.fn();
    renderWithProviders(
      <FinishCelebrateStage
        {...makeProps({ initialNoteOpen: true, onClosingNoteChange })}
      />,
    );
    fireEvent.changeText(
      screen.getByTestId("finish-celebrate-note-input"),
      "Felt lighter.",
    );
    expect(onClosingNoteChange).toHaveBeenCalledWith("Felt lighter.");
  });

  it("fires onDesignBadge when the CTA is pressed", () => {
    const onDesignBadge = jest.fn();
    renderWithProviders(
      <FinishCelebrateStage {...makeProps({ onDesignBadge })} />,
    );
    fireEvent.press(screen.getByTestId("finish-celebrate-cta"));
    expect(onDesignBadge).toHaveBeenCalledTimes(1);
  });

  it("fires onSaveClosingNote with the current text when the field blurs", () => {
    const onSaveClosingNote = jest.fn();
    renderWithProviders(
      <FinishCelebrateStage
        {...makeProps({
          initialNoteOpen: true,
          closingNoteValue: "Felt lighter.",
          onSaveClosingNote,
        })}
      />,
    );
    fireEvent(screen.getByTestId("finish-celebrate-note-input"), "blur");
    expect(onSaveClosingNote).toHaveBeenCalledWith("Felt lighter.");
  });

  it("does not throw on blur when onSaveClosingNote is omitted", () => {
    renderWithProviders(
      <FinishCelebrateStage {...makeProps({ initialNoteOpen: true })} />,
    );
    expect(() =>
      fireEvent(screen.getByTestId("finish-celebrate-note-input"), "blur"),
    ).not.toThrow();
  });

  it("labels the open note field for a11y", () => {
    renderWithProviders(
      <FinishCelebrateStage {...makeProps({ initialNoteOpen: true })} />,
    );
    const input = screen.getByTestId("finish-celebrate-note-input");
    expect(input.props.accessibilityLabel).toBe("Closing note");
    expect(input.props.accessibilityHint).toBe(
      "Optional. Write a few words about finishing this goal.",
    );
  });
});

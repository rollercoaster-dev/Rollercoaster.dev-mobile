import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { TextNoteViewerModal } from "../TextNoteViewerModal";

describe("TextNoteViewerModal", () => {
  it("renders nothing when text is null", () => {
    const { toJSON } = render(
      <TextNoteViewerModal visible={true} text={null} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("renders text when visible", () => {
    render(
      <TextNoteViewerModal
        visible={true}
        text="My progress notes for today"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText("My progress notes for today")).toBeTruthy();
    expect(screen.getByLabelText("Close text note viewer")).toBeTruthy();
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    render(
      <TextNoteViewerModal visible={true} text="Some text" onClose={onClose} />,
    );
    fireEvent.press(screen.getByLabelText("Close text note viewer"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows timestamp when provided", () => {
    render(
      <TextNoteViewerModal
        visible={true}
        text="Notes"
        createdAt="2026-02-11"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText("2026-02-11")).toBeTruthy();
  });
});

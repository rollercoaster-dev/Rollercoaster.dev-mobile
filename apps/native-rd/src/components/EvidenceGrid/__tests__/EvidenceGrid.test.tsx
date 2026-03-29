import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: "medium" },
}));

import { EvidenceGrid } from "../EvidenceGrid";
import type { Evidence } from "../../EvidenceThumbnail";

const mockEvidence: Evidence[] = [
  { id: "1", title: "Photo of progress", type: "photo", uri: "/photo.jpg" },
  { id: "2", title: "My notes", type: "text" },
];

describe("EvidenceGrid", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("shows empty state when no evidence", () => {
    render(<EvidenceGrid evidences={[]} />);
    expect(screen.getByText("No evidence yet")).toBeTruthy();
  });

  it("shows evidence count in header", () => {
    render(<EvidenceGrid evidences={mockEvidence} />);
    expect(screen.getByText("Evidence (2)")).toBeTruthy();
  });

  it("renders evidence items", () => {
    render(<EvidenceGrid evidences={mockEvidence} />);
    expect(
      screen.getByLabelText("photo evidence: Photo of progress"),
    ).toBeTruthy();
    expect(screen.getByLabelText("text evidence: My notes")).toBeTruthy();
  });

  it("calls onPress with evidence when tapped", () => {
    const onPress = jest.fn();
    render(<EvidenceGrid evidences={mockEvidence} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText("photo evidence: Photo of progress"));
    expect(onPress).toHaveBeenCalledWith(mockEvidence[0]);
  });

  it("shows delete confirmation on long-press", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const onDelete = jest.fn();
    render(<EvidenceGrid evidences={mockEvidence} onDelete={onDelete} />);
    fireEvent(
      screen.getByLabelText("photo evidence: Photo of progress"),
      "onLongPress",
    );
    expect(alertSpy).toHaveBeenCalledWith(
      "Delete evidence?",
      "This cannot be undone.",
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel" }),
        expect.objectContaining({ text: "Delete", style: "destructive" }),
      ]),
    );
  });

  it("shows Add Evidence button when onAdd provided", () => {
    const onAdd = jest.fn();
    render(<EvidenceGrid evidences={[]} onAdd={onAdd} />);
    expect(screen.getByText("Add Evidence")).toBeTruthy();
  });

  it("does not show delete alert on long-press when onDelete is not provided", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    render(<EvidenceGrid evidences={mockEvidence} />);
    fireEvent(
      screen.getByLabelText("photo evidence: Photo of progress"),
      "onLongPress",
    );
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("does not show Add Evidence button when onAdd is not provided", () => {
    render(<EvidenceGrid evidences={mockEvidence} />);
    expect(screen.queryByText("Add Evidence")).toBeNull();
  });

  it("shows header without count when no evidence", () => {
    render(<EvidenceGrid evidences={[]} />);
    expect(screen.getByText("Evidence")).toBeTruthy();
  });
});

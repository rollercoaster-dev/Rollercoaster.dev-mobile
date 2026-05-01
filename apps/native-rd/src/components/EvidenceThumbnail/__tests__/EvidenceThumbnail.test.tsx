import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert, Image, Linking } from "react-native";

jest.mock("../../../db", () => ({
  EvidenceType: {
    photo: "photo",
    text: "text",
    voice_memo: "voice_memo",
    video: "video",
    link: "link",
    file: "file",
  },
  TEXT_EVIDENCE_PREFIX: "content:text;",
}));

import { EvidenceThumbnail } from "../EvidenceThumbnail";
import type { Evidence } from "../EvidenceThumbnail";

describe("EvidenceThumbnail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Rendering ---

  it("renders photo thumbnail with image preview", () => {
    const evidence: Evidence = {
      id: "1",
      title: "My photo",
      type: "photo",
      uri: "/photo.jpg",
    };
    render(<EvidenceThumbnail evidence={evidence} />);
    expect(screen.getByLabelText("photo evidence: My photo")).toBeTruthy();
  });

  it("renders text thumbnail with text snippet", () => {
    const evidence: Evidence = {
      id: "1",
      title: "My progress notes",
      type: "text",
    };
    render(<EvidenceThumbnail evidence={evidence} />);
    // Text appears both in the snippet preview and the title below
    expect(
      screen.getAllByText("My progress notes").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("extracts text content from URI with content:text; prefix for preview", () => {
    const evidence: Evidence = {
      id: "1",
      title: "Daily reflection",
      type: "text",
      uri: "content:text;This is the actual note content",
    };
    render(<EvidenceThumbnail evidence={evidence} />);
    expect(screen.getByText("This is the actual note content")).toBeTruthy();
  });

  it("renders voice memo with icon", () => {
    const evidence: Evidence = {
      id: "1",
      title: "Voice memo",
      type: "voice_memo",
    };
    render(<EvidenceThumbnail evidence={evidence} />);
    expect(
      screen.getByLabelText("voice_memo evidence: Voice memo"),
    ).toBeTruthy();
  });

  it("renders link with URL display", () => {
    const evidence: Evidence = {
      id: "1",
      title: "Example",
      type: "link",
      uri: "https://example.com",
    };
    render(<EvidenceThumbnail evidence={evidence} />);
    expect(screen.getByText("https://example.com")).toBeTruthy();
  });

  it("renders file thumbnail with icon", () => {
    const evidence: Evidence = { id: "1", title: "Document", type: "file" };
    render(<EvidenceThumbnail evidence={evidence} />);
    expect(screen.getByLabelText("file evidence: Document")).toBeTruthy();
  });

  // --- Image error fallback ---

  it("falls back to icon when photo image fails to load", () => {
    const evidence: Evidence = {
      id: "1",
      title: "Broken photo",
      type: "photo",
      uri: "/invalid.jpg",
    };
    const { UNSAFE_getAllByType } = render(
      <EvidenceThumbnail evidence={evidence} />,
    );

    // Trigger image error on the Image component
    const images = UNSAFE_getAllByType(Image);
    fireEvent(images[0], "onError");

    // After error, should show the icon fallback instead of an Image
    expect(screen.getByText("\u{1F4F7}")).toBeTruthy();
  });

  it("falls back to icon when video thumbnail fails to load", () => {
    const evidence: Evidence = {
      id: "1",
      title: "Broken video",
      type: "video",
      uri: "/invalid.mp4",
    };
    const { UNSAFE_getAllByType } = render(
      <EvidenceThumbnail evidence={evidence} />,
    );

    const images = UNSAFE_getAllByType(Image);
    fireEvent(images[0], "onError");

    expect(screen.getByText("\u{1F3AC}")).toBeTruthy();
  });

  // --- Metadata parsing ---

  it("displays duration badge for voice memo with valid metadata", () => {
    const evidence: Evidence = {
      id: "1",
      title: "Voice memo",
      type: "voice_memo",
      metadata: JSON.stringify({ durationMs: 125000 }),
    };
    render(<EvidenceThumbnail evidence={evidence} />);
    expect(screen.getByText("02:05")).toBeTruthy();
  });

  it("shows voice memo without duration when metadata is missing", () => {
    const evidence: Evidence = {
      id: "1",
      title: "Voice memo",
      type: "voice_memo",
    };
    render(<EvidenceThumbnail evidence={evidence} />);
    expect(screen.getByText("\u{1F3A4}")).toBeTruthy();
  });

  it("handles invalid JSON metadata gracefully", () => {
    const evidence: Evidence = {
      id: "1",
      title: "Voice memo",
      type: "voice_memo",
      metadata: "{invalid json}",
    };
    expect(() =>
      render(<EvidenceThumbnail evidence={evidence} />),
    ).not.toThrow();
    // Should render icon without duration badge
    expect(screen.getByText("\u{1F3A4}")).toBeTruthy();
  });

  // --- Interactions ---

  it("calls onPress when provided", () => {
    const onPress = jest.fn();
    const evidence: Evidence = {
      id: "1",
      title: "Photo",
      type: "photo",
      uri: "/photo.jpg",
    };
    render(<EvidenceThumbnail evidence={evidence} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText("photo evidence: Photo"));
    expect(onPress).toHaveBeenCalled();
  });

  it("calls onLongPress when provided", () => {
    const onLongPress = jest.fn();
    const evidence: Evidence = {
      id: "1",
      title: "Photo",
      type: "photo",
      uri: "/photo.jpg",
    };
    render(<EvidenceThumbnail evidence={evidence} onLongPress={onLongPress} />);
    fireEvent(screen.getByLabelText("photo evidence: Photo"), "onLongPress");
    expect(onLongPress).toHaveBeenCalled();
  });

  // --- Link opening ---

  it("opens link in browser when link evidence is pressed without onPress", async () => {
    jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const evidence: Evidence = {
      id: "1",
      title: "Example",
      type: "link",
      uri: "https://example.com",
    };
    render(<EvidenceThumbnail evidence={evidence} />);
    fireEvent.press(screen.getByLabelText("link evidence: Example"));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith("https://example.com");
    });
  });

  it("shows alert when link cannot be opened", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    jest.spyOn(Linking, "canOpenURL").mockResolvedValue(false);
    const evidence: Evidence = {
      id: "1",
      title: "Bad link",
      type: "link",
      uri: "invalid://url",
    };
    render(<EvidenceThumbnail evidence={evidence} />);
    fireEvent.press(screen.getByLabelText("link evidence: Bad link"));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Cannot open link",
        "Unable to open: invalid://url",
      );
    });
  });

  it("shows alert when link opening throws error", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    jest
      .spyOn(Linking, "canOpenURL")
      .mockRejectedValue(new Error("Network error"));
    const evidence: Evidence = {
      id: "1",
      title: "Link",
      type: "link",
      uri: "https://example.com",
    };
    render(<EvidenceThumbnail evidence={evidence} />);
    fireEvent.press(screen.getByLabelText("link evidence: Link"));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Cannot open link",
        "Failed to open: https://example.com",
      );
    });
  });

  // --- Accessibility ---

  it("shows hint for link evidence", () => {
    const evidence: Evidence = {
      id: "1",
      title: "Link",
      type: "link",
      uri: "https://example.com",
    };
    render(<EvidenceThumbnail evidence={evidence} />);
    expect(screen.getByLabelText("link evidence: Link")).toHaveProp(
      "accessibilityHint",
      "Opens link in browser",
    );
  });

  it("uses onPress instead of opening link when both provided", () => {
    const onPress = jest.fn();
    jest.spyOn(Linking, "canOpenURL");
    const evidence: Evidence = {
      id: "1",
      title: "Link",
      type: "link",
      uri: "https://example.com",
    };
    render(<EvidenceThumbnail evidence={evidence} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText("link evidence: Link"));
    expect(onPress).toHaveBeenCalled();
    expect(Linking.canOpenURL).not.toHaveBeenCalled();
  });
});

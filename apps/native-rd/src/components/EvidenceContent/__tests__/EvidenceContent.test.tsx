import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { EvidenceContent } from "../index";
import type { Evidence } from "../../EvidenceThumbnail";

function ev(over: Partial<Evidence> & Pick<Evidence, "id" | "type">): Evidence {
  return { title: "Sample evidence", ...over };
}

describe("EvidenceContent", () => {
  it("renders PhotoContent with description as caption for photo", () => {
    renderWithProviders(
      <EvidenceContent
        evidence={ev({
          id: "1",
          type: "photo",
          uri: "/path/to/photo.jpg",
          title: "Garden snapshot",
        })}
      />,
    );
    expect(screen.getByLabelText("Garden snapshot")).toBeOnTheScreen();
  });

  it("strips TEXT_EVIDENCE_PREFIX from text uri and uses title as createdAt", () => {
    renderWithProviders(
      <EvidenceContent
        evidence={ev({
          id: "2",
          type: "text",
          uri: "content:text;The actual note body",
          title: "2026-05-02 14:30",
        })}
      />,
    );
    expect(screen.getByText("The actual note body")).toBeOnTheScreen();
    expect(screen.getByText("2026-05-02 14:30")).toBeOnTheScreen();
  });

  it("falls back to title for text without prefix and omits createdAt", () => {
    renderWithProviders(
      <EvidenceContent
        evidence={ev({
          id: "3",
          type: "text",
          title: "Just a plain text title",
        })}
      />,
    );
    expect(screen.getByText("Just a plain text title")).toBeOnTheScreen();
  });

  it("falls back to FileContent when voice_memo has no uri", () => {
    renderWithProviders(
      <EvidenceContent
        evidence={ev({
          id: "4",
          type: "voice_memo",
          title: "Missing audio",
        })}
      />,
    );
    expect(screen.getByText("Missing audio")).toBeOnTheScreen();
    // FileContent renders an Open button.
    expect(screen.getByLabelText("Open")).toBeOnTheScreen();
  });

  it("renders LinkContent with URL for link evidence", () => {
    renderWithProviders(
      <EvidenceContent
        evidence={ev({
          id: "5",
          type: "link",
          uri: "https://example.com/article",
          title: "Reading list item",
        })}
      />,
    );
    expect(screen.getByText("https://example.com/article")).toBeOnTheScreen();
    expect(screen.getByText("Reading list item")).toBeOnTheScreen();
  });

  it("renders FileContent with metadata-derived filename", () => {
    renderWithProviders(
      <EvidenceContent
        evidence={ev({
          id: "6",
          type: "file",
          uri: "/some/path/document.pdf",
          metadata: JSON.stringify({
            filename: "annual-report.pdf",
            mimeType: "application/pdf",
          }),
          title: "Annual report",
        })}
      />,
    );
    expect(screen.getByText("annual-report.pdf")).toBeOnTheScreen();
    expect(screen.getByText("application/pdf")).toBeOnTheScreen();
  });

  it("falls back to URI segment when metadata has no filename", () => {
    renderWithProviders(
      <EvidenceContent
        evidence={ev({
          id: "7",
          type: "file",
          uri: "/some/path/document.pdf",
          title: "Annual report",
        })}
      />,
    );
    expect(screen.getByText("document.pdf")).toBeOnTheScreen();
  });
});

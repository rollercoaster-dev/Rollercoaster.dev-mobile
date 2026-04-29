import React from "react";
import { renderWithProviders } from "../../../__tests__/test-utils";
import { BrandMark } from "../BrandMark";

describe("BrandMark", () => {
  it("renders without crashing at the default size", () => {
    expect(() => renderWithProviders(<BrandMark />)).not.toThrow();
  });

  it("renders at a custom size", () => {
    expect(() => renderWithProviders(<BrandMark size={96} />)).not.toThrow();
  });
});

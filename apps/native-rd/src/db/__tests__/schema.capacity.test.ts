/**
 * The UI caps text inputs at the constants in schema.ts. Those constants are
 * only correct if they match what Evolu's `NonEmptyString1000` brand actually
 * accepts — pinned here against the real validator, not a restated number.
 */
import { NonEmptyString1000 } from "@evolu/common";

import {
  STRING_1000_MAX_LENGTH,
  TEXT_EVIDENCE_MAX_CONTENT_LENGTH,
  TEXT_EVIDENCE_PREFIX,
} from "../schema";

describe("schema string capacity", () => {
  it("STRING_1000_MAX_LENGTH is exactly the longest NonEmptyString1000", () => {
    expect(
      NonEmptyString1000.orNull("a".repeat(STRING_1000_MAX_LENGTH)),
    ).not.toBeNull();
    expect(
      NonEmptyString1000.orNull("a".repeat(STRING_1000_MAX_LENGTH + 1)),
    ).toBeNull();
  });

  it("a text note at TEXT_EVIDENCE_MAX_CONTENT_LENGTH still fits the uri column once prefixed", () => {
    const at = `${TEXT_EVIDENCE_PREFIX}${"a".repeat(TEXT_EVIDENCE_MAX_CONTENT_LENGTH)}`;
    const over = `${TEXT_EVIDENCE_PREFIX}${"a".repeat(TEXT_EVIDENCE_MAX_CONTENT_LENGTH + 1)}`;
    expect(NonEmptyString1000.orNull(at)).not.toBeNull();
    expect(NonEmptyString1000.orNull(over)).toBeNull();
  });
});

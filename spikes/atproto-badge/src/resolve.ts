/**
 * LESSON 05 — see ../lessons/05-publish-and-resolve.md
 *
 * Your job: read the record back and re-verify it, as a stranger would.
 *
 *     bun run resolve-record at://did:plc:.../dev.rollercoaster.badge.credential/...
 */

import { AtpAgent } from "@atproto/api";
import { KeyType, verifySignature } from "@rollercoaster-dev/openbadges-core";
import { decodeDidKey } from "./did-key.js";
import { writeEvidence } from "./session.js";

const atUri = process.argv[2];
if (!atUri?.startsWith("at://")) {
  console.error("Usage: bun run resolve-record <at-uri>");
  process.exit(1);
}

// YOUR TURN (1 of 3).
//
// Pull `repo`, `collection` and `rkey` out of the AT-URI. Its grammar is
// `at://<authority>/<collection>/<rkey>` — spec: https://atproto.com/specs/at-uri-scheme
// Exit with a clear message if it does not have all three parts.

// YOUR TURN (2 of 3).
//
// Fetch the record with com.atproto.repo.getRecord.
// Docs: https://docs.bsky.app/docs/api/com-atproto-repo-get-record
//
// Do this WITHOUT logging in. Construct a bare `new AtpAgent({ service })` and call
// straight through. If this only works while authenticated then the record is not
// publicly resolvable, and the entire premise of publishing badges this way collapses.
// That is a real thing to check, not a formality.

// YOUR TURN (3 of 3).
//
// Parse the `credential` field back into an object, split the `proof` off, and verify
// the signature against the key you recover from `issuerDid` with your `decodeDidKey`.
//
// Do not use any key material the PDS handed you. The whole argument of this tutorial
// is that you do not have to trust the PDS. Take the key from the DID string.

throw new Error("Not implemented — see lessons/05-publish-and-resolve.md");

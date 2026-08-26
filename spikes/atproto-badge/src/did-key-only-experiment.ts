/**
 * LESSON 07 — see ../lessons/07-who-vouches-for-the-key.md
 *
 * This is the lesson the other six exist to set up.
 *
 * The question: can a `did:key` stay the credential's issuer while atproto merely
 * hosts the bytes — no PLC operation, no email token, no server holding a rotation key
 * that could rewrite your identity?
 *
 * If yes, a whole column of obligations falls off the design.
 *
 *     bun run did-key-only <at-uri>
 */

const atUri = process.argv[2];
if (!atUri?.startsWith("at://")) {
  console.error("Usage: bun run did-key-only <at-uri>");
  process.exit(1);
}

// Imports you will need:
//   import { AtpAgent } from "@atproto/api";
//   import { KeyType, verifySignature } from "@rollercoaster-dev/openbadges-core";
//   import { decodeDidKey } from "./did-key.js";
//   import { writeEvidence } from "./session.js";

// YOUR TURN (1 of 3) — verify with nothing but the DID.
//
// Fetch the record, pull out the credential, and verify its signature using only the
// key your decodeDidKey recovers from `issuerDid`. No network beyond fetching the
// bytes; no directory lookup at all.

// YOUR TURN (2 of 3) — prove the host has no authority.
//
// Fetch your hosting account's DID document straight from the PLC directory:
//
//   fetch(`https://plc.directory/${repo}`)
//
// did:plc spec: https://web.plc.directory/spec/v0.1/did-plc
//
// Look at `verificationMethod`. Is your Ed25519 badge key in there?
//
// It should not be — you never called com.atproto.identity.signPlcOperation. That
// absence is the evidence. It says the account holds the bytes and has no
// cryptographic say over the credential.
//
// Useful detail for telling them apart by eye: a default account has exactly one
// method, `#atproto`, and its publicKeyMultibase starts `zQ3sh` (secp256k1). An
// Ed25519 key added by a PLC operation would show up as a second entry starting `z6Mk`.

// YOUR TURN (3 of 3) — answer the question, including the price.
//
// If (1) verifies and (2) shows the key absent, the answer is yes.
//
// Do not stop at yes. Write down what it costs, because it is not free: a bare did:key
// has no rotation and no recovery. Lose the key and every credential it ever signed
// becomes permanently unattributable. Lesson 07 argues about whether that is acceptable
// and, importantly, whether it is a *new* problem or one the app already has.

throw new Error("Not implemented — see lessons/07-who-vouches-for-the-key.md");

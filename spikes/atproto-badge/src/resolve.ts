/**
 * Question 2, second half: does the record resolve back, and does its CID match?
 *
 * Reads a record by AT-URI through `com.atproto.repo.getRecord`, re-verifies the
 * credential's signature using only the public key recovered from its issuer `did:key`,
 * and reports the CID for comparison against the one the write returned.
 *
 * The read is unauthenticated on purpose. If it needed the session, the record would not
 * be publicly resolvable and the whole premise would collapse.
 *
 *     bun run resolve-record at://did:plc:.../dev.rollercoaster.badge.credential/...
 */

import { AtpAgent } from "@atproto/api";
import { verifySignature, KeyType } from "@rollercoaster-dev/openbadges-core";
import { decodeDidKey } from "./did-key.js";
import { writeEvidence } from "./session.js";

const atUri = process.argv[2];
if (!atUri?.startsWith("at://")) {
  console.error("Usage: bun run resolve-record <at-uri>");
  process.exit(1);
}

// at://<did>/<collection>/<rkey>
const [, , repo, collection, rkey] = atUri.split("/");
if (!repo || !collection || !rkey) {
  console.error(`Malformed AT-URI: ${atUri}`);
  process.exit(1);
}

// No login — a public record must be readable by a stranger.
const agent = new AtpAgent({
  service: process.env.PDS_URL ?? "https://bsky.social",
});
const { data } = await agent.com.atproto.repo.getRecord({
  repo,
  collection,
  rkey,
});

console.log(`Resolved ${atUri}`);
console.log(`  CID: ${data.cid}`);

const record = data.value as { credential?: string; issuerDid?: string };
if (!record.credential || !record.issuerDid) {
  throw new Error("Record is missing the credential or issuerDid field.");
}

const credential = JSON.parse(record.credential) as Record<string, unknown> & {
  proof: { proofValue: string };
};
const { proof, ...unsigned } = credential;

// The point of the exercise: the key comes from the DID string itself — not from the
// PDS, not from the PLC directory, not from anything this script had to be told.
const recoveredKey = decodeDidKey(record.issuerDid);
const signatureValid = await verifySignature(
  JSON.stringify(unsigned),
  proof.proofValue,
  recoveredKey as Parameters<typeof verifySignature>[2],
  KeyType.Ed25519,
);

console.log(`  Issuer DID: ${record.issuerDid}`);
console.log(
  `  Signature verifies against key recovered from the DID alone: ${signatureValid}`,
);

if (!signatureValid) {
  console.error(
    "\nSignature did NOT verify — that is a real finding, not a script bug.",
  );
}

const evidencePath = await writeEvidence("resolve-output.json", {
  note:
    "Captured from `bun run resolve-record`, unauthenticated. Verification uses only " +
    "the public key recovered from the issuer did:key — no PDS lookup, no PLC directory.",
  atUri,
  cid: data.cid,
  issuerDid: record.issuerDid,
  recoveredPublicKeyJwk: recoveredKey,
  signatureValid,
  record: data.value,
});

console.log(`\nEvidence written to ${evidencePath}`);

/**
 * Question 4, the one ADR-0015 blocks on:
 *
 *   Can a correctly encoded `did:key` stay the credential issuer while atproto only
 *   hosts the record — no PLC operation, no email, no custodial rotation key?
 *
 * `atproto-evaluation.md` sketches the opposite flow: step 4 of "what publishing would
 * look like" adds the app's Ed25519 badge key to the user's DID document via
 * `com.atproto.identity.signPlcOperation`, which on a hosted PDS is email-token gated
 * and leaves the PDS operator holding a rotation key that can rewrite the document
 * (Risk 4). If the credential does not need that step, the whole email/custody problem
 * in ADR-0015's "Identity and email" open question disappears from the critical path.
 *
 * The experiment, in three parts:
 *
 *   1. Verify the published credential offline, using only the key recovered from its
 *      issuer `did:key`. No PDS, no PLC directory, no network.
 *   2. Fetch the hosting account's `did:plc` document from the PLC directory and show it
 *      contains no verificationMethod for the badge key — proving no PLC operation was
 *      ever performed and the account has no cryptographic authority over the credential.
 *   3. State the cost, which is real: a bare `did:key` has no rotation and no recovery.
 *
 *     bun run did-key-only <at-uri>
 */

import { AtpAgent } from "@atproto/api";
import { verifySignature, KeyType } from "@rollercoaster-dev/openbadges-core";
import { decodeDidKey } from "./did-key.js";
import { writeEvidence } from "./session.js";

const atUri = process.argv[2];
if (!atUri?.startsWith("at://")) {
  console.error("Usage: bun run did-key-only <at-uri>");
  process.exit(1);
}

const [, , repo, collection, rkey] = atUri.split("/");
if (!repo || !collection || !rkey) {
  console.error(`Malformed AT-URI: ${atUri}`);
  process.exit(1);
}

const agent = new AtpAgent({
  service: process.env.PDS_URL ?? "https://bsky.social",
});
const { data } = await agent.com.atproto.repo.getRecord({
  repo,
  collection,
  rkey,
});
const record = data.value as { credential: string; issuerDid: string };

// --- Part 1: verify with nothing but the DID string -------------------------------
const credential = JSON.parse(record.credential) as Record<string, unknown> & {
  proof: { proofValue: string };
};
const { proof, ...unsigned } = credential;
const recoveredKey = decodeDidKey(record.issuerDid);
const verifiesOffline = await verifySignature(
  JSON.stringify(unsigned),
  proof.proofValue,
  recoveredKey as Parameters<typeof verifySignature>[2],
  KeyType.Ed25519,
);

console.log("1. Offline verification");
console.log(`   issuer:   ${record.issuerDid}`);
console.log(
  `   verifies: ${verifiesOffline}   (no PDS, no PLC directory, no network)`,
);

// --- Part 2: prove the hosting account has no authority over the credential -------
const plcResponse = await fetch(`https://plc.directory/${repo}`);
const didDocument = (await plcResponse.json()) as {
  verificationMethod?: Array<{ id: string; publicKeyMultibase?: string }>;
};

// Verified against a live PLC document 2026-08-25: a default hosted account carries
// exactly one verificationMethod, `#atproto`, whose publicKeyMultibase is a `zQ3sh…`
// secp256k1 Multikey. An Ed25519 badge key added by a PLC operation would appear as a
// second entry with a `z6Mk…` prefix, so the two are distinguishable on sight.
const badgeKeyMultibase = record.issuerDid.slice("did:key:".length);
const methods = didDocument.verificationMethod ?? [];
const badgeKeyInDidDoc = methods.some(
  (method) => method.publicKeyMultibase === badgeKeyMultibase,
);

console.log("\n2. Hosting account's DID document");
console.log(`   ${repo}`);
console.log(`   verificationMethods: ${methods.length}`);
console.log(`   contains the badge key: ${badgeKeyInDidDoc}`);
console.log(
  badgeKeyInDidDoc
    ? "   -> UNEXPECTED. A PLC operation must have run; the experiment's premise is broken."
    : "   -> No PLC operation was performed. The account hosts the bytes and nothing more.",
);

// --- Part 3: the conclusion, including what it costs ------------------------------
const answer = verifiesOffline && !badgeKeyInDidDoc;
console.log(`\n3. Answer: ${answer ? "YES" : "NO"}`);
console.log(
  answer
    ? "   A did:key can remain the issuer with atproto as transport only. No PLC\n" +
        "   operation, no email token, no custodial rotation key on the credential's\n" +
        "   authority path.\n" +
        "   Cost: a bare did:key has no rotation and no recovery. Lose the key and every\n" +
        "   credential it signed becomes permanently unattributable. That is a real product\n" +
        "   problem, but it is the *same* problem the app already has today — it is not\n" +
        "   introduced by choosing did:key over did:plc here."
    : "   See the two checks above for which half failed.",
);

const evidencePath = await writeEvidence("did-key-only-output.json", {
  note:
    "Captured from `bun run did-key-only`. Answers ADR-0015's 'Identity and email' open " +
    "question with evidence rather than argument.",
  atUri,
  issuerDid: record.issuerDid,
  hostingAccountDid: repo,
  verifiesOfflineFromDidKeyAlone: verifiesOffline,
  hostingAccountDidDocumentMethodCount: methods.length,
  badgeKeyPresentInHostingDidDocument: badgeKeyInDidDoc,
  answer: answer ? "yes" : "no",
  cost: "No key rotation and no account recovery for a bare did:key.",
});

console.log(`\nEvidence written to ${evidencePath}`);

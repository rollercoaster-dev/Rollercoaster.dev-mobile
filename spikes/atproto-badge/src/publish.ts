/**
 * Question 2, first half: will a hosted PDS accept a third-party record type?
 *
 * Builds a signed credential, writes it to the logged-in account's repo under
 * `dev.rollercoaster.badge.credential`, and prints the AT-URI and CID.
 *
 * Note what this script does *not* do: it never calls
 * `com.atproto.identity.signPlcOperation`. The credential's issuer is its own `did:key`
 * and the account's `did:plc` is never made an authority over it. atproto's role here is
 * transport and addressing, nothing more.
 *
 *     bun run publish-record
 */

import { buildSignedCredential } from "./build-credential.js";
import { COLLECTION, login, readEnv, writeEvidence } from "./session.js";

const env = readEnv();
const { agent, did } = await login(env);
console.log(`Logged in as ${env.handle} (${did}) on ${env.pdsUrl}`);

const { credential, issuerDid, publicKeyJwk } = await buildSignedCredential({
  achievementName: "Published a badge to an atproto repo",
  achievementDescription:
    "Wrote an Open Badges 3.0 credential as a record in a user-owned atproto repository and resolved it back.",
});

console.log(`Credential issuer: ${issuerDid}`);
console.log(
  `  (not ${did} — the account hosts the record, it does not issue it)`,
);

const response = await agent.com.atproto.repo.putRecord({
  repo: did,
  collection: COLLECTION,
  rkey: Date.now().toString(36),
  record: {
    $type: COLLECTION,
    credential: JSON.stringify(credential),
    issuerDid,
    createdAt: new Date().toISOString(),
  },
});

console.log(`\nWritten.`);
console.log(`  AT-URI: ${response.data.uri}`);
console.log(`  CID:    ${response.data.cid}`);

const evidencePath = await writeEvidence("publish-output.json", {
  note:
    "Captured from `bun run publish-record`. The handle, DID and AT-URI are real and " +
    "deliberately unredacted — the acceptance criterion is that a reader can resolve " +
    "this themselves. The account is a throwaway created for this spike.",
  pdsUrl: env.pdsUrl,
  hostingAccountDid: did,
  credentialIssuerDid: issuerDid,
  publicKeyJwk,
  collection: COLLECTION,
  uri: response.data.uri,
  cid: response.data.cid,
  credential,
});

console.log(`\nEvidence written to ${evidencePath}`);
console.log(`Next: bun run resolve-record ${response.data.uri}`);

/**
 * Step 4 of #614 — ADR-0015's open question, answered by construction:
 *
 *   Can a correctly encoded `did:key` stay the credential ISSUER while
 *   atproto only HOSTS the credential — no PLC operation, no email token,
 *   no custodial rotation key for the issuer identity?
 *
 *   bun run didkey
 *
 * What this does:
 *   1. Mint a fresh P-256 keypair in WebCrypto. No network. No PLC. No email.
 *   2. Encode its public key as did:key using the app's own encoder
 *      (packages/openbadges-core — the code the shipping app uses).
 *   3. Sign a minimal OB3-shaped VC-JWT (ES256) with `iss` = that did:key,
 *      again via openbadges-core.
 *   4. Verify the JWT OFFLINE by decoding the did:key back to a JWK — this is
 *      the "resolves without any network" property ADR-0015 relies on.
 *   5. Write the JWT as a `dev.rollercoaster.badge.spike` record into the test
 *      account's repo (did:plc:…), read it back, verify it again from the
 *      read-back bytes.
 *
 * The record's repo DID (did:plc) and the credential's issuer (did:key) are
 * different identifiers. The PDS does not check or care. That is the answer.
 */
import {
  decodeP256DidKey,
  encodeP256DidKey,
} from "../../../../../packages/openbadges-core/src/crypto/did-key.ts";
import {
  generateJWTProof,
  verifyJWTProof,
  type JWTProofGenerationOptions,
} from "../../../../../packages/openbadges-core/src/crypto/jwt-proof.ts";
import type { JWK } from "jose";
import { decodeJwt } from "jose";
import {
  SPIKE_COLLECTION,
  loginAgent,
  saveLastRecord,
  writeReadVerify,
  type SpikeRecord,
} from "./pds.ts";

/** openbadges-types brands IRIs; the spike only ever passes DID strings. */
type IRI = JWTProofGenerationOptions["issuer"];

// 1. Keypair — the only "identity operation" the issuer ever performs.
const keyPair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const publicJwk = (await crypto.subtle.exportKey("jwk", keyPair.publicKey)) as JWK;
const privateJwk = (await crypto.subtle.exportKey("jwk", keyPair.privateKey)) as JWK;

// 2. did:key — deterministic from the public key, no registry.
const issuerDid = encodeP256DidKey(publicJwk as JsonWebKey);
const verificationMethod = `${issuerDid}#${issuerDid.slice("did:key:".length)}`;
console.log(`issuer did:key       ${issuerDid}`);

// 3. Minimal OB3-shaped credential, signed ES256 with iss = did:key.
const proof = await generateJWTProof(
  {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: { id: issuerDid, type: ["Profile"], name: "atproto spike issuer (fixture)" },
    validFrom: new Date().toISOString(),
    credentialSubject: {
      type: ["AchievementSubject"],
      achievement: {
        type: ["Achievement"],
        name: "Fixture achievement — #614 spike",
        description: "Synthetic. Proves hosting/issuer decoupling, not a real badge.",
        criteria: { narrative: "Ran didKeyIssuer.ts." },
      },
    },
  },
  {
    privateKey: privateJwk,
    algorithm: "ES256",
    keyId: verificationMethod,
    verificationMethod: verificationMethod as IRI,
    issuer: issuerDid as IRI,
  },
);

// 4. Offline verification: did:key → JWK → verify. No network involved.
const offlineJwk = decodeP256DidKey(issuerDid) as JWK;
const offline = await verifyJWTProof(proof, {
  publicKey: offlineJwk,
  expectedIssuer: issuerDid as IRI,
});
console.log(`offline verify       ${offline.isValid} (${offline.algorithm})`);
if (!offline.isValid) {
  console.error(offline.error);
  process.exit(1);
}

// 5. Host it in the atproto repo. The repo's DID is did:plc — not the issuer.
const agent = await loginAgent();
const record: SpikeRecord = {
  $type: SPIKE_COLLECTION,
  credential: proof.jws,
  issuer: issuerDid,
  createdAt: new Date().toISOString(),
  note: "didKeyIssuer.ts — iss is a did:key, repo is a did:plc (#614)",
};
const { written, value, cidConsistent } = await writeReadVerify(agent, record);
console.log(`\nrepo did:plc         ${written.repoDid}`);
console.log(`record uri           ${written.uri}`);
console.log(`record cid           ${written.cid}`);

// Verify from the read-back bytes the way a reader must: take `iss` from the
// JWT itself, not from the record's denormalised `issuer` field, and resolve
// it offline. The denormalised field is a filter hint, never a trust anchor.
const readBackIss = decodeJwt(value.credential).iss;
const hosted =
  typeof readBackIss === "string" && readBackIss.startsWith("did:key:z")
    ? await verifyJWTProof(
        { ...proof, jws: value.credential },
        { publicKey: decodeP256DidKey(readBackIss) as JWK, expectedIssuer: issuerDid as IRI },
      )
    : { isValid: false, error: `unexpected iss in read-back JWT: ${String(readBackIss)}` };

console.log(`read-back cid match  ${cidConsistent}  (server round-trip + local recomputation)`);
console.log(`read-back verify     ${hosted.isValid}  (key resolved offline from the JWT's own iss)`);
console.log(`issuer ≠ repo        ${readBackIss !== written.repoDid}  (${String(readBackIss).slice(0, 12)}… vs ${written.repoDid.slice(0, 12)}…)`);

if (!hosted.isValid || !cidConsistent) {
  console.error(`\nFAIL ${hosted.error ?? ""}`);
  process.exit(1);
}
await saveLastRecord(written);
console.log(
  "\nANSWER: yes. did:key stayed the issuer; atproto only hosted the record.\n" +
    "COST:   the did:key has no rotation and no recovery — lose the private key, lose attribution.\n" +
    "        (This run's private key was never persisted; that is the point and the cost.)",
);

/**
 * Builds a minimal, signed OB3-shaped credential for the spike to publish.
 *
 * Deliberately *not* a reuse of `apps/native-rd/src/badges/credentialBuilder.ts`. That
 * builder produces the Iteration-A credential shape, whose issuer DID does not resolve
 * (gap #7) and whose achievement ID appends a path segment to a `did:key`, which the
 * did:key method does not permit. Reusing it would make the spike's central question
 * unanswerable. Instead this module reuses the real Ed25519 signing code from
 * `@rollercoaster-dev/openbadges-core` and pairs it with the corrected `did:key`
 * encoder in `./did-key.ts`.
 *
 * What is honest about this credential and what is not:
 *
 * - The signature is real Ed25519 over the credential bytes, produced by the same
 *   `signData` the app uses.
 * - The issuer `did:key` is spec-compliant and resolves offline.
 * - The proof is **not** `eddsa-rdfc-2022`. That cryptosuite requires RDFC-1.0
 *   canonicalization, which is gap #5 in `ob3-compliance-status.md` and belongs to
 *   issue #598, not here. Following the precedent already set in
 *   `apps/native-rd/src/hooks/useCreateBadge.ts:264`, the proof carries the honest
 *   non-standard label `eddsa-raw-json-iteration-a` rather than claiming compliance
 *   it does not have.
 *
 * The spike's questions are all about transport and identity. None of them depend on
 * the cryptosuite being spec-final, and overclaiming here would make the evidence worse.
 */

import {
  InMemoryKeyProvider,
  KeyType,
  signData,
} from "@rollercoaster-dev/openbadges-core";
import { encodeDidKey } from "./did-key.js";

/** The non-standard cryptosuite label, matching the app. See the note above. */
export const SPIKE_CRYPTOSUITE = "eddsa-raw-json-iteration-a";

export interface SpikeCredential {
  credential: Record<string, unknown>;
  issuerDid: string;
  /** The public key JWK, so a verifier can be handed it directly for comparison. */
  publicKeyJwk: JsonWebKey;
}

/**
 * Generate a fresh Ed25519 key, build a small OB3 credential, and sign it.
 *
 * A fresh key per run is intentional: the spike must not touch, and must not appear to
 * touch, any key the app holds in SecureStore. Key-management hardening is explicitly
 * out of scope for this spike.
 */
export async function buildSignedCredential(options: {
  achievementName: string;
  achievementDescription: string;
  /** Overrides the generated issue timestamp; used to make evidence captures stable. */
  issuedOn?: string;
}): Promise<SpikeCredential> {
  const keyProvider = new InMemoryKeyProvider();
  const { keyId } = await keyProvider.generateKeyPair("Ed25519");
  const publicKeyJwk = await keyProvider.getPublicKey(keyId);
  const privateKeyJwk = await keyProvider.getPrivateKey(keyId);

  const issuerDid = encodeDidKey(publicKeyJwk as { x?: string });
  const issuedOn = options.issuedOn ?? new Date().toISOString();

  const unsigned: Record<string, unknown> = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: `urn:uuid:${crypto.randomUUID()}`,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      // A did:key issuer is the whole point of question 4 — the credential's
      // authority comes from the key, not from wherever the record happens to live.
      id: issuerDid,
      type: ["Profile"],
      name: "rollercoaster.dev (atproto spike)",
    },
    validFrom: issuedOn,
    credentialSubject: {
      // No `id`: the spike publishes no personal identifier. An unbound
      // credentialSubject is the least the correlation risk (Risk 2 in
      // atproto-evaluation.md) allows us to get away with while staying OB3-shaped.
      type: ["AchievementSubject"],
      achievement: {
        // An HTTPS achievement ID, not a path appended to the DID. The latter is the
        // second half of gap #7 (ob3-compliance-status.md:92) and is invalid.
        id: "https://rollercoaster.dev/spike/achievements/atproto-record",
        type: ["Achievement"],
        name: options.achievementName,
        description: options.achievementDescription,
        criteria: {
          narrative:
            "Wrote a badge credential to an atproto repository and resolved it back by AT-URI.",
        },
      },
    },
  };

  const proofValue = await signData(
    JSON.stringify(unsigned),
    privateKeyJwk as Parameters<typeof signData>[1],
    KeyType.Ed25519,
  );

  return {
    credential: {
      ...unsigned,
      proof: {
        type: "DataIntegrityProof",
        cryptosuite: SPIKE_CRYPTOSUITE,
        created: issuedOn,
        proofPurpose: "assertionMethod",
        verificationMethod: `${issuerDid}#${issuerDid.slice("did:key:".length)}`,
        proofValue,
      },
    },
    issuerDid,
    publicKeyJwk,
  };
}

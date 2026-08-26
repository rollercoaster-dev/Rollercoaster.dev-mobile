/**
 * LESSON 04 — see ../lessons/04-signing-a-credential.md
 *
 * Your job: build an Open Badges 3.0 credential and sign it, so that anyone holding
 * only the issuer's DID string can verify it.
 *
 * Check your work:  bun test tests/04-credential.test.ts
 */

import {
  InMemoryKeyProvider,
  KeyType,
  signData,
} from "@rollercoaster-dev/openbadges-core";
import { encodeDidKey } from "./did-key.js";

/**
 * The cryptosuite label we put on the proof.
 *
 * NOT `eddsa-rdfc-2022`. That name is a promise that the signature was taken over
 * RDFC-1.0 canonicalized RDF, and we sign `JSON.stringify` output instead. Lesson 04
 * explains why that distinction is not pedantry. The app makes the same honest choice
 * at apps/native-rd/src/hooks/useCreateBadge.ts:264.
 */
export const SPIKE_CRYPTOSUITE = "eddsa-raw-json-iteration-a";

export interface SpikeCredential {
  credential: Record<string, unknown>;
  issuerDid: string;
  publicKeyJwk: JsonWebKey;
}

/**
 * YOUR TURN.
 *
 * Generate a key, build a credential, sign it, return all three pieces.
 *
 * Steps:
 *   1. `const keyProvider = new InMemoryKeyProvider()` and generate an Ed25519 pair.
 *      Grab both the public and private JWK. A fresh key every call is deliberate —
 *      lesson 04 says why you must not reach for the app's real key here.
 *   2. Derive `issuerDid` from the public JWK using your `encodeDidKey`.
 *   3. Build the unsigned credential object. The required shape is in lesson 04; the
 *      tests pin the parts that matter. Three things the tests specifically check,
 *      each for a reason the lesson explains:
 *        - `issuer.id` is the did:key, not a URL
 *        - the achievement `id` is an HTTPS URI, NOT the DID with a path glued on
 *        - there is no `credentialSubject.id`
 *   4. Sign `JSON.stringify(unsigned)` with `signData(data, privateKey, KeyType.Ed25519)`.
 *   5. Return the credential with a `proof` object attached. Fields:
 *      `type: "DataIntegrityProof"`, `cryptosuite: SPIKE_CRYPTOSUITE`, `created`,
 *      `proofPurpose: "assertionMethod"`, `verificationMethod`, `proofValue`.
 *
 * The signature must be taken over the credential WITHOUT the proof attached. If you
 * sign the object that already contains its own signature you have invented a
 * chicken-and-egg problem that no verifier can solve.
 */
export async function buildSignedCredential(options: {
  achievementName: string;
  achievementDescription: string;
  issuedOn?: string;
}): Promise<SpikeCredential> {
  throw new Error("Not implemented — see lessons/04-signing-a-credential.md");
}

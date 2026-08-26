/**
 * LESSON 04 checks. Run: bun test tests/04-credential.test.ts
 *
 * These run entirely offline. No PDS, no account, no network. That is not a limitation
 * of the test setup — it is the property being tested. A credential whose verification
 * needs a server is a credential that stops working when the server does.
 *
 * Depends on lesson 02 being finished: the credential's issuer is a did:key.
 */

import { describe, expect, test } from "bun:test";
import { KeyType, verifySignature } from "@rollercoaster-dev/openbadges-core";
import {
  buildSignedCredential,
  SPIKE_CRYPTOSUITE,
} from "../src/build-credential.js";
import { decodeDidKey } from "../src/did-key.js";

const OPTIONS = {
  achievementName: "Published a badge to an atproto repo",
  achievementDescription:
    "Wrote a credential as a record and resolved it back.",
};

describe("buildSignedCredential", () => {
  test("issues under a resolvable did:key", async () => {
    const { issuerDid, credential } = await buildSignedCredential(OPTIONS);
    expect(issuerDid).toStartWith("did:key:z");
    expect((credential.issuer as { id: string }).id).toBe(issuerDid);
  });

  test("generates a fresh key each call", async () => {
    // If two calls share a key, something is caching — probably the app's real key,
    // which this spike must never touch. See lesson 04.
    const [a, b] = await Promise.all([
      buildSignedCredential(OPTIONS),
      buildSignedCredential(OPTIONS),
    ]);
    expect(a.issuerDid).not.toBe(b.issuerDid);
  });

  test("labels the proof honestly, not as eddsa-rdfc-2022", async () => {
    const { credential } = await buildSignedCredential(OPTIONS);
    const proof = credential.proof as { cryptosuite: string; type: string };
    expect(proof.type).toBe("DataIntegrityProof");
    expect(proof.cryptosuite).toBe(SPIKE_CRYPTOSUITE);
    expect(proof.cryptosuite).not.toBe("eddsa-rdfc-2022");
  });

  test("gives the achievement an HTTPS id, not a path on the DID", async () => {
    // did:key DIDs have no path component. `did:key:z6Mk.../achievements/x` is not a
    // valid DID URL — it is the second half of gap #7. Lesson 04.
    const { credential } = await buildSignedCredential(OPTIONS);
    const achievementId = (
      (credential.credentialSubject as Record<string, Record<string, unknown>>)
        .achievement as { id: string }
    ).id;
    expect(achievementId).toStartWith("https://");
    expect(achievementId).not.toContain("did:key:");
  });

  test("binds the credential to no subject identifier", async () => {
    // Correlation risk: a stable subject id across public badges links them all to one
    // person forever. Lesson 04, and personal-data-verification.md.
    const { credential } = await buildSignedCredential(OPTIONS);
    const subject = credential.credentialSubject as Record<string, unknown>;
    expect(subject.id).toBeUndefined();
  });
});

describe("the whole point", () => {
  test("verifies using only the key recovered from the issuer DID string", async () => {
    const { credential, issuerDid } = await buildSignedCredential(OPTIONS);
    const { proof, ...unsigned } = credential as Record<string, unknown> & {
      proof: { proofValue: string };
    };

    // Note what is NOT used here: the publicKeyJwk that buildSignedCredential returned.
    // Everything needed comes out of the DID string itself.
    const recovered = decodeDidKey(issuerDid);

    const valid = await verifySignature(
      JSON.stringify(unsigned),
      proof.proofValue,
      recovered as Parameters<typeof verifySignature>[2],
      KeyType.Ed25519,
    );
    expect(valid).toBe(true);
  });

  test("a tampered credential fails verification", async () => {
    const { credential, issuerDid } = await buildSignedCredential(OPTIONS);
    const { proof, ...unsigned } = credential as Record<string, unknown> & {
      proof: { proofValue: string };
    };

    const tampered = {
      ...unsigned,
      credentialSubject: {
        type: ["AchievementSubject"],
        achievement: { name: "Nope" },
      },
    };

    const valid = await verifySignature(
      JSON.stringify(tampered),
      proof.proofValue,
      decodeDidKey(issuerDid) as Parameters<typeof verifySignature>[2],
      KeyType.Ed25519,
    );
    expect(valid).toBe(false);
  });
});

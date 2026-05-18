#!/usr/bin/env bun
/**
 * Badge verifier — local conformance check for native-rd badges.
 *
 * Usage:
 *   bun scripts/verify-badge.ts <path-to-badge.png>
 *   bun scripts/verify-badge.ts <path-to-credential.json>
 *
 * Reports two things:
 *
 * 1. SYSTEM ROUND-TRIP — does the credential parse, and does the Ed25519
 *    signature verify under our own Iteration-A signing scheme
 *    (raw JSON.stringify, base64url proofValue)? If this fails, our own
 *    pipeline is broken.
 *
 * 2. OB 3.0 CONFORMANCE DELTA — runs the 7 documented gaps from
 *    docs/architecture/ob3-compliance-status.md. Pass/fail per gap so we
 *    can track progress as we close them (Iteration D).
 *
 * The two reports are complementary: a badge can pass (1) and fail (2)
 * — that's exactly the current Iteration-A state.
 */

import { readFileSync } from "node:fs";
import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import { isPNG, unbakePNG } from "@rollercoaster-dev/openbadges-core";

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

type CheckResult = { name: string; pass: boolean; detail?: string };

function pass(name: string, detail?: string): CheckResult {
  return { name, pass: true, detail };
}
function fail(name: string, detail?: string): CheckResult {
  return { name, pass: false, detail };
}

function loadCredential(path: string): {
  credential: Record<string, unknown>;
  source: "png" | "json";
} {
  const buf = readFileSync(path);
  if (isPNG(buf)) {
    // unbakePNG returns the already-parsed credential object (or null).
    const cred = unbakePNG(buf) as Record<string, unknown> | null;
    if (!cred) {
      throw new Error(
        "PNG has no OpenBadges credential chunk (looked for iTXt with " +
          "keyword 'openbadgecredential' or 'openbadges').",
      );
    }
    return { credential: cred, source: "png" };
  }
  // Assume JSON otherwise.
  return { credential: JSON.parse(buf.toString("utf8")), source: "json" };
}

/**
 * Extract the Ed25519 public-key x-coordinate (base64url) from a `did:key`
 * identifier in the Iteration-A non-standard form `did:key:<jwk.x>`.
 * Returns null for any other shape (e.g. spec-compliant `did:key:z…`).
 */
function getIterationADidX(did: string): string | null {
  if (!did.startsWith("did:key:")) return null;
  const tail = did.slice("did:key:".length).split("#")[0]?.split("/")[0] ?? "";
  // Spec-compliant did:key uses multibase prefix `z` followed by multicodec
  // bytes. Iteration A uses raw base64url of the jwk.x field (43 chars for
  // Ed25519). We detect by length + alphabet, not strictly.
  if (tail.startsWith("z")) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(tail)) return null;
  return tail;
}

function verifyIterationASignature(
  credential: Record<string, unknown>,
): CheckResult {
  const proof = credential.proof as Record<string, unknown> | undefined;
  if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
    return fail("signature.iterationA", "no single proof object on credential");
  }
  const cryptosuite = proof.cryptosuite;
  if (cryptosuite !== "eddsa-raw-json-iteration-a") {
    return pass(
      "signature.iterationA",
      `skipped — cryptosuite is '${String(cryptosuite)}', not the Iteration-A scheme`,
    );
  }
  const proofValue = proof.proofValue;
  const vm = proof.verificationMethod;
  if (typeof proofValue !== "string" || typeof vm !== "string") {
    return fail(
      "signature.iterationA",
      "missing proofValue or verificationMethod",
    );
  }

  // Reproduce what useCreateBadge.ts:186-189 actually signed:
  //   JSON.stringify(credential without the proof field).
  const { proof: _omit, ...unsigned } = credential;
  const dataBytes = new TextEncoder().encode(JSON.stringify(unsigned));

  const did = vm.split("#")[0] ?? "";
  const x = getIterationADidX(did);
  if (!x) {
    return fail(
      "signature.iterationA",
      `cannot reconstruct public key — verificationMethod DID is not the Iteration-A form (${did})`,
    );
  }

  let pubKey;
  try {
    pubKey = createPublicKey({
      key: { kty: "OKP", crv: "Ed25519", x },
      format: "jwk",
    });
  } catch (err) {
    return fail(
      "signature.iterationA",
      `failed to import public key from JWK: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const sigBytes = Buffer.from(proofValue, "base64url");
  const ok = cryptoVerify(null, dataBytes, pubKey, sigBytes);
  return ok
    ? pass(
        "signature.iterationA",
        `verified ${sigBytes.length}-byte Ed25519 signature against ${did}`,
      )
    : fail(
        "signature.iterationA",
        "signature did not verify against the reconstructed public key",
      );
}

/**
 * Conformance checks against the 7 gaps catalogued in
 * docs/architecture/ob3-compliance-status.md. Each gap is encoded as a
 * predicate that returns PASS when the gap has been *fixed*, FAIL while
 * the gap is still present.
 */
function conformanceChecks(credential: Record<string, unknown>): CheckResult[] {
  const cs = credential.credentialSubject as
    | Record<string, unknown>
    | undefined;
  const ach = cs?.achievement as Record<string, unknown> | undefined;
  const proof = credential.proof;

  // Gap 1: achievement.creator should be a Profile object, not a string.
  const creator = ach?.creator;
  const gap1 =
    creator === undefined
      ? fail("gap1.creatorObject", "achievement.creator is missing")
      : typeof creator === "object" && !Array.isArray(creator)
        ? pass("gap1.creatorObject", "achievement.creator is an object")
        : fail(
            "gap1.creatorObject",
            `achievement.creator is ${typeof creator}, expected object`,
          );

  // Gap 2: top-level proof should be an array, not a single object.
  const gap2 = Array.isArray(proof)
    ? pass("gap2.proofArray", "proof is an array")
    : fail(
        "gap2.proofArray",
        "proof is a single object, OB3 schema requires proof: [...]",
      );

  // Gap 3: top-level `name` required.
  const gap3 =
    typeof credential.name === "string" && credential.name.length > 0
      ? pass("gap3.topLevelName", `name: "${credential.name as string}"`)
      : fail("gap3.topLevelName", "top-level credential.name is missing");

  // Gap 4: top-level `issuanceDate` required.
  const gap4 =
    typeof credential.issuanceDate === "string" &&
    credential.issuanceDate.length > 0
      ? pass(
          "gap4.issuanceDate",
          `issuanceDate: ${credential.issuanceDate as string}`,
        )
      : fail("gap4.issuanceDate", "top-level issuanceDate is missing");

  // Gap 5: cryptosuite must be a standard one.
  const STANDARD_CRYPTOSUITES = new Set(["eddsa-rdfc-2022", "eddsa-2022"]);
  const proofObj = (Array.isArray(proof) ? proof[0] : proof) as
    | Record<string, unknown>
    | undefined;
  const cryptosuite = proofObj?.cryptosuite;
  const proofType = proofObj?.type;
  const gap5 =
    proofType === "Ed25519Signature2020" ||
    (typeof cryptosuite === "string" && STANDARD_CRYPTOSUITES.has(cryptosuite))
      ? pass(
          "gap5.cryptosuite",
          `cryptosuite: ${String(cryptosuite ?? proofType)}`,
        )
      : fail(
          "gap5.cryptosuite",
          `cryptosuite '${String(cryptosuite)}' is not in the OB3 allowlist (eddsa-rdfc-2022, eddsa-2022, Ed25519Signature2020)`,
        );

  // Gap 6: umbrella oneOf — passes when 1–5 all pass.
  const upstream = [gap1, gap2, gap3, gap4, gap5];
  const gap6 = upstream.every((c) => c.pass)
    ? pass(
        "gap6.schemaOneOf",
        "all upstream checks pass, schema oneOf should resolve",
      )
    : fail(
        "gap6.schemaOneOf",
        `${upstream.filter((c) => !c.pass).length} upstream gap(s) still open`,
      );

  // Gap 7: did:key must use multibase `z` prefix, not raw jwk.x.
  const issuerId = (credential.issuer as Record<string, unknown> | undefined)
    ?.id;
  const issuerDid = typeof issuerId === "string" ? issuerId : "";
  const gap7 = issuerDid.startsWith("did:key:z")
    ? pass(
        "gap7.didKeyMultibase",
        `issuer DID is multibase-encoded: ${issuerDid.slice(0, 24)}…`,
      )
    : fail(
        "gap7.didKeyMultibase",
        `issuer DID is the Iteration-A form (raw jwk.x), not multibase: ${issuerDid}`,
      );

  return [gap1, gap2, gap3, gap4, gap5, gap6, gap7];
}

function printSection(title: string) {
  console.log(`\n${BOLD}${title}${RESET}`);
}

function printResult(r: CheckResult) {
  const tag = r.pass ? `${GREEN}✓ PASS${RESET}` : `${RED}✗ FAIL${RESET}`;
  console.log(
    `  ${tag}  ${r.name}${r.detail ? `\n         ${DIM}${r.detail}${RESET}` : ""}`,
  );
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error(
      "Usage: bun scripts/verify-badge.ts <path-to-badge.png-or-.json>",
    );
    process.exit(2);
  }

  let loaded;
  try {
    loaded = loadCredential(path);
  } catch (err) {
    console.error(
      `${RED}Failed to load credential:${RESET} ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(2);
  }
  const { credential, source } = loaded;

  console.log(`${BOLD}Badge verifier${RESET}  ${DIM}(${source} input)${RESET}`);
  console.log(`  ${DIM}file:${RESET} ${path}`);
  console.log(`  ${DIM}id:${RESET}   ${String(credential.id ?? "—")}`);
  const ach = (
    credential.credentialSubject as Record<string, unknown> | undefined
  )?.achievement as Record<string, unknown> | undefined;
  console.log(`  ${DIM}name:${RESET} ${String(ach?.name ?? "—")}`);

  printSection("System round-trip");
  const sigResult = verifyIterationASignature(credential);
  printResult(sigResult);

  printSection("OB 3.0 conformance delta (Iteration A → D)");
  const conf = conformanceChecks(credential);
  conf.forEach(printResult);

  const conformancePassed = conf.filter((c) => c.pass).length;
  const total = conf.length;
  const fraction = `${conformancePassed}/${total}`;
  const color =
    conformancePassed === total
      ? GREEN
      : conformancePassed === 0
        ? RED
        : YELLOW;

  console.log(
    `\n${BOLD}Summary${RESET}  ` +
      `system: ${sigResult.pass ? `${GREEN}ok${RESET}` : `${RED}broken${RESET}`}  ·  ` +
      `OB3 conformance: ${color}${fraction}${RESET} gaps closed`,
  );

  // Exit non-zero only if our own system is broken. Conformance gaps are
  // expected in Iteration A and should not fail CI.
  process.exit(sigResult.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

#!/usr/bin/env bun
/**
 * Badge verifier — local conformance check for native-rd badges.
 *
 * Usage:
 *   bun scripts/verify-badge.ts <path-to-badge.png>
 *   bun scripts/verify-badge.ts <path-to-credential.json>
 *
 * The two reports are complementary: a badge can pass the system
 * round-trip and fail OB3 conformance; that's the expected shape for a
 * self-signed Iteration-A badge.
 */

import { readFileSync } from "node:fs";
import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import {
  Cryptosuite,
  isPNG,
  unbakePNG,
} from "@rollercoaster-dev/openbadges-core";

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

type CheckStatus = "pass" | "fail" | "skipped";
type CheckResult = { name: string; status: CheckStatus; detail?: string };

function pass(name: string, detail?: string): CheckResult {
  return { name, status: "pass", detail };
}
function fail(name: string, detail?: string): CheckResult {
  return { name, status: "fail", detail };
}
function skipped(name: string, detail?: string): CheckResult {
  return { name, status: "skipped", detail };
}

function loadCredential(path: string): {
  credential: Record<string, unknown>;
  source: "png" | "json";
} {
  const buf = readFileSync(path);
  if (isPNG(buf)) {
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
  const rawProof = credential.proof;
  if (rawProof === undefined || rawProof === null) {
    return fail("signature.iterationA", "no proof on credential");
  }
  // OB3 spec form is `proof: [...]`; Iteration-A emits a bare object.
  // Accept either so a spec-compliant credential routes through the
  // skipped path below instead of a misleading "broken" failure.
  const proof = (Array.isArray(rawProof) ? rawProof[0] : rawProof) as
    | Record<string, unknown>
    | undefined;
  if (!proof || typeof proof !== "object") {
    return fail("signature.iterationA", "malformed proof shape");
  }
  const cryptosuite = proof.cryptosuite;
  if (cryptosuite !== "eddsa-raw-json-iteration-a") {
    // We have no code to verify standard cryptosuites (eddsa-rdfc-2022
    // etc.) yet — report skipped so the summary line and exit code don't
    // claim a verification we didn't perform.
    return skipped(
      "signature.iterationA",
      `cryptosuite is '${String(cryptosuite)}'; this verifier only checks the Iteration-A scheme`,
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

  // Reproduce the bytes that `useCreateBadge` signs: JSON.stringify of
  // the credential without the proof field. Drift between this and the
  // signing path is invisible until verification starts failing — when
  // either side changes, factor the bytes-to-sign computation out.
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
  // `eddsa-2022` is the second OB3-accepted DataIntegrity cryptosuite;
  // openbadges-core's enum currently only exports the rdfc variant. The
  // enum reference catches a future rename of `EddsaRdfc2022` at compile
  // time; the literal stays in sync by hand.
  const STANDARD_CRYPTOSUITES = new Set<string>([
    Cryptosuite.EddsaRdfc2022,
    "eddsa-2022",
  ]);
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
  const gap6 = upstream.every((c) => c.status === "pass")
    ? pass(
        "gap6.schemaOneOf",
        "all upstream checks pass, schema oneOf should resolve",
      )
    : fail(
        "gap6.schemaOneOf",
        `${upstream.filter((c) => c.status !== "pass").length} upstream gap(s) still open`,
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
  const tag =
    r.status === "pass"
      ? `${GREEN}✓ PASS${RESET}`
      : r.status === "fail"
        ? `${RED}✗ FAIL${RESET}`
        : `${YELLOW}~ SKIP${RESET}`;
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

  const conformancePassed = conf.filter((c) => c.status === "pass").length;
  const total = conf.length;
  const fraction = `${conformancePassed}/${total}`;
  const color =
    conformancePassed === total
      ? GREEN
      : conformancePassed === 0
        ? RED
        : YELLOW;

  const systemTag =
    sigResult.status === "pass"
      ? `${GREEN}ok${RESET}`
      : sigResult.status === "fail"
        ? `${RED}broken${RESET}`
        : `${YELLOW}not attempted${RESET}`;

  console.log(
    `\n${BOLD}Summary${RESET}  ` +
      `system: ${systemTag}  ·  ` +
      `OB3 conformance: ${color}${fraction}${RESET} gaps closed`,
  );

  // Exit non-zero only on a real signature mismatch — a broken pipeline. A
  // skipped check (non-Iteration-A cryptosuite that we have no code to
  // verify) is not a pipeline failure but also not a success: exit 0 but
  // print to stderr so CI logs surface it.
  if (sigResult.status === "skipped") {
    console.error(
      `${YELLOW}warning:${RESET} signature was not verified (${sigResult.detail ?? "no detail"})`,
    );
  }
  process.exit(sigResult.status === "fail" ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

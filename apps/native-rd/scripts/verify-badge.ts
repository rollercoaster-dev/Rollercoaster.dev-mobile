#!/usr/bin/env bun
/**
 * Badge verifier — local conformance check for native-rd badges.
 *
 * Usage:
 *   bun scripts/verify-badge.ts <path-to-badge.png>
 *   bun scripts/verify-badge.ts <path-to-credential.json-or-.jws>
 *
 * Handles both stored formats. Badges signed since #598 are compact ES256
 * VC-JWTs (an external proof); badges earned before it are credential JSON
 * with an embedded Iteration-A DataIntegrityProof. Old badges are never
 * re-signed, so both paths have to keep working.
 *
 * The two reports are complementary: a badge can pass the system round-trip
 * and fail OB3 conformance.
 */

import { readFileSync } from "node:fs";
import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import {
  Cryptosuite,
  decodeP256DidKey,
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

/** A parsed compact JWS, with the exact bytes the signature covers. */
interface ParsedJws {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  /** `header.payload` — the ASCII the signature was computed over. */
  signingInput: string;
  signature: Buffer;
}

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(
    Buffer.from(segment, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
}

/**
 * Parses a compact JWS, or returns null if the string isn't one. Same
 * 3-dot-segment / not-`{`-prefixed heuristic png-baking.ts uses.
 */
function parseJws(value: string): ParsedJws | null {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) return null;
  const parts = trimmed.split(".");
  if (parts.length !== 3) return null;
  try {
    return {
      header: decodeSegment(parts[0]!),
      payload: decodeSegment(parts[1]!),
      signingInput: `${parts[0]}.${parts[1]}`,
      signature: Buffer.from(parts[2]!, "base64url"),
    };
  } catch {
    return null;
  }
}

type LoadedCredential = {
  /** The VC itself — unwrapped from the `vc` claim when the input is a JWS. */
  credential: Record<string, unknown>;
  /** Present only for a VC-JWT external proof. */
  jws: ParsedJws | null;
  source: "png" | "json";
};

function loadCredential(path: string): LoadedCredential {
  const buf = readFileSync(path);

  // unbakePNG already returns a raw string for a JWS chunk and a parsed
  // object for a JSON one, so normalise both to the same two branches below.
  let raw: string | Record<string, unknown>;
  let source: "png" | "json";
  if (isPNG(buf)) {
    const cred = unbakePNG(buf) as string | Record<string, unknown> | null;
    if (!cred) {
      throw new Error(
        "PNG has no OpenBadges credential chunk (looked for iTXt with " +
          "keyword 'openbadgecredential' or 'openbadges').",
      );
    }
    raw = cred;
    source = "png";
  } else {
    raw = buf.toString("utf8");
    source = "json";
  }

  if (typeof raw === "string") {
    const jws = parseJws(raw);
    if (jws) {
      const vc = jws.payload.vc;
      if (!vc || typeof vc !== "object") {
        throw new Error(
          "JWS payload has no `vc` claim — not a VC-JWT credential.",
        );
      }
      return { credential: vc as Record<string, unknown>, jws, source };
    }
    return {
      credential: JSON.parse(raw) as Record<string, unknown>,
      jws: null,
      source,
    };
  }

  return { credential: raw, jws: null, source };
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

/**
 * Verifies the ES256 signature of a VC-JWT against the key inlined in its
 * protected header, then confirms that key is the one the issuer DID names.
 *
 * A JWS ECDSA signature is the raw IEEE-P1363 `r‖s` pair; Node's verify()
 * defaults to DER, hence the explicit dsaEncoding.
 */
function verifyVcJwtSignature(
  jws: ParsedJws,
  credential: Record<string, unknown>,
): CheckResult {
  const alg = jws.header.alg;
  if (alg !== "ES256") {
    return skipped(
      "signature.vcJwt",
      `header alg is '${String(alg)}'; this verifier only checks ES256`,
    );
  }

  const jwk = jws.header.jwk;
  if (!jwk || typeof jwk !== "object") {
    return fail(
      "signature.vcJwt",
      "protected header has no inline `jwk` to verify against",
    );
  }

  let pubKey;
  try {
    pubKey = createPublicKey({
      key: jwk as Record<string, unknown>,
      format: "jwk",
    });
  } catch (err) {
    return fail(
      "signature.vcJwt",
      `failed to import the header jwk: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const ok = cryptoVerify(
    "sha256",
    Buffer.from(jws.signingInput, "ascii"),
    { key: pubKey, dsaEncoding: "ieee-p1363" },
    jws.signature,
  );
  if (!ok) {
    return fail(
      "signature.vcJwt",
      "ES256 signature did not verify against the inline header jwk",
    );
  }

  // A valid signature over an attacker-chosen key proves nothing on its own —
  // the header key has to be the one the issuer DID resolves to.
  const issuerId = (credential.issuer as Record<string, unknown> | undefined)
    ?.id;
  const issuerDid = typeof issuerId === "string" ? issuerId : "";
  let resolved;
  try {
    resolved = decodeP256DidKey(issuerDid);
  } catch (err) {
    return fail(
      "signature.vcJwt",
      `signature verified, but the issuer DID does not resolve to a P-256 key: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const headerJwk = jwk as { x?: unknown; y?: unknown };
  if (resolved.x !== headerJwk.x || resolved.y !== headerJwk.y) {
    return fail(
      "signature.vcJwt",
      "signature verified, but the header jwk is not the key the issuer DID names",
    );
  }

  return pass(
    "signature.vcJwt",
    `verified ${jws.signature.length}-byte ES256 signature; header jwk matches ${issuerDid.slice(0, 24)}…`,
  );
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

  // Reproduce the bytes that pre-#598 `useCreateBadge` signed: JSON.stringify
  // of the credential without the proof field.
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
function conformanceChecks(
  credential: Record<string, unknown>,
  jws: ParsedJws | null,
): CheckResult[] {
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

  // Gap 2: top-level proof should be an array, not a single object. An
  // external proof carries no embedded `proof` at all, which is the correct
  // shape rather than a missing one — the JWS *is* the proof.
  const gap2 = jws
    ? pass("gap2.proofArray", "external proof (VC-JWT) — no embedded proof")
    : Array.isArray(proof)
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

  // Gap 5: the proof must be one the validator accepts. Two ways to pass:
  // an external VC-JWT whose header alg is on the RS256/ES256 allowlist and
  // that carries a key (inline `jwk` or dereferenceable `kid`), or an
  // embedded DataIntegrityProof with a standard cryptosuite.
  //
  // `eddsa-2022` is the second OB3-accepted DataIntegrity cryptosuite;
  // openbadges-core's enum currently only exports the rdfc variant. The
  // enum reference catches a future rename of `EddsaRdfc2022` at compile
  // time; the literal stays in sync by hand.
  const STANDARD_CRYPTOSUITES = new Set<string>([
    Cryptosuite.EddsaRdfc2022,
    "eddsa-2022",
  ]);
  const EXTERNAL_PROOF_ALGORITHMS = new Set<string>(["ES256", "RS256"]);
  const proofObj = (Array.isArray(proof) ? proof[0] : proof) as
    | Record<string, unknown>
    | undefined;
  const cryptosuite = proofObj?.cryptosuite;
  const proofType = proofObj?.type;

  let gap5: CheckResult;
  if (jws) {
    const alg = jws.header.alg;
    const hasKey = Boolean(jws.header.jwk) || Boolean(jws.header.kid);
    gap5 =
      typeof alg === "string" && EXTERNAL_PROOF_ALGORITHMS.has(alg) && hasKey
        ? pass(
            "gap5.proofFormat",
            `external VC-JWT proof, alg: ${alg}, key: ${jws.header.jwk ? "inline jwk" : "kid"}`,
          )
        : fail(
            "gap5.proofFormat",
            `external proof with alg '${String(alg)}'${hasKey ? "" : " and no jwk/kid"} — the validator accepts only ES256/RS256 with a resolvable key`,
          );
  } else {
    gap5 =
      proofType === "Ed25519Signature2020" ||
      (typeof cryptosuite === "string" &&
        STANDARD_CRYPTOSUITES.has(cryptosuite))
        ? pass(
            "gap5.proofFormat",
            `cryptosuite: ${String(cryptosuite ?? proofType)}`,
          )
        : fail(
            "gap5.proofFormat",
            `cryptosuite '${String(cryptosuite)}' is not in the OB3 allowlist (eddsa-rdfc-2022, eddsa-2022, Ed25519Signature2020), and this is not an external VC-JWT proof`,
          );
  }

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

  // Gap 7: the issuer did:key must actually decode — multibase `z` plus the
  // p256-pub multicodec, not just a `did:key:z` string prefix, which a
  // malformed multibase payload would also satisfy.
  const issuerId = (credential.issuer as Record<string, unknown> | undefined)
    ?.id;
  const issuerDid = typeof issuerId === "string" ? issuerId : "";
  let gap7: CheckResult;
  try {
    decodeP256DidKey(issuerDid);
    gap7 = pass(
      "gap7.didKeyMultibase",
      `issuer DID decodes to a P-256 key: ${issuerDid.slice(0, 24)}…`,
    );
  } catch (err) {
    gap7 = fail(
      "gap7.didKeyMultibase",
      `issuer DID '${issuerDid}' is not a resolvable P-256 did:key — ${err instanceof Error ? err.message : String(err)}`,
    );
  }

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
  const { credential, jws, source } = loaded;

  const format = jws ? "VC-JWT external proof" : "embedded proof";
  console.log(
    `${BOLD}Badge verifier${RESET}  ${DIM}(${source} input, ${format})${RESET}`,
  );
  console.log(`  ${DIM}file:${RESET} ${path}`);
  console.log(`  ${DIM}id:${RESET}   ${String(credential.id ?? "—")}`);
  const ach = (
    credential.credentialSubject as Record<string, unknown> | undefined
  )?.achievement as Record<string, unknown> | undefined;
  console.log(`  ${DIM}name:${RESET} ${String(ach?.name ?? "—")}`);

  printSection("System round-trip");
  const sigResult = jws
    ? verifyVcJwtSignature(jws, credential)
    : verifyIterationASignature(credential);
  printResult(sigResult);

  printSection("OB 3.0 conformance delta");
  const conf = conformanceChecks(credential, jws);
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
  // skipped check (a proof scheme we have no code to verify) is not a pipeline
  // failure but also not a success: exit 0 but print to stderr so CI logs
  // surface it.
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

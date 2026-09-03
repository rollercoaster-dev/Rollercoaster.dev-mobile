/**
 * The READER path: resolve an AT-URI with no account and no client SDK, the
 * way a verifier page or a jury member would. Pure fetch, three hops:
 *
 *   1. handle → DID        com.atproto.identity.resolveHandle (skipped if the
 *                          authority is already a DID)
 *   2. DID → DID document  https://plc.directory/<did:plc>  or
 *                          https://<host>/.well-known/did.json for did:web
 *   3. DID doc → PDS URL   service[id="#atproto_pds"].serviceEndpoint
 *      then GET <pds>/xrpc/com.atproto.repo.getRecord
 *
 *   bun run resolve at://did:plc:…/dev.rollercoaster.badge.spike/<rkey>
 *   bun run resolve            # falls back to .last-record.json
 *
 * Also recomputes the CID from the returned bytes, so "resolves by CID" is
 * checked, not assumed. (The CID recompute reuses @atproto/lex-cbor — the
 * only atproto code on this path; the three hops are plain fetch.)
 */
import { parseAtUri } from "./atUri.ts";
import { loadLastRecord, recomputeCid } from "./pds.ts";

const uri = process.argv[2] ?? (await loadLastRecord())?.uri;
if (!uri) {
  console.error("usage: bun run resolve <at-uri>   (or run `bun run spike` first)");
  process.exit(2);
}
const { authority, collection, rkey } = parseAtUri(uri);

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return (await res.json()) as T;
}

// 1. handle → DID
let did = authority;
if (!did.startsWith("did:")) {
  const r = await getJson<{ did: string }>(
    `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(authority)}`,
  );
  did = r.did;
  console.log(`handle ${authority} → ${did}`);
}

// 2. DID → DID document
interface DidDoc {
  id: string;
  alsoKnownAs?: string[];
  verificationMethod?: unknown[];
  service?: { id: string; type: string; serviceEndpoint: string }[];
}
const didDocUrl = did.startsWith("did:plc:")
  ? `https://plc.directory/${did}`
  : did.startsWith("did:web:")
    ? `https://${did.slice("did:web:".length)}/.well-known/did.json`
    : undefined;
if (!didDocUrl) throw new Error(`unsupported DID method for atproto repos: ${did}`);
const doc = await getJson<DidDoc>(didDocUrl);
console.log(`DID document         ${didDocUrl}`);
console.log(`  alsoKnownAs        ${(doc.alsoKnownAs ?? []).join(", ")}`);
console.log(`  verificationMethod ${doc.verificationMethod?.length ?? 0} key(s) — the PLC-managed repo signing key(s)`);

// 3. PDS endpoint → getRecord
const pds = doc.service?.find((s) => s.id === "#atproto_pds" || s.id === `${did}#atproto_pds`);
if (!pds) throw new Error("DID document has no #atproto_pds service");
console.log(`  PDS                ${pds.serviceEndpoint}`);

const rec = await getJson<{ uri: string; cid: string; value: Record<string, unknown> }>(
  `${pds.serviceEndpoint}/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=${collection}&rkey=${rkey}`,
);
const localCid = await recomputeCid(rec.value);
console.log(`\ngetRecord`);
console.log(`  uri   ${rec.uri}`);
console.log(`  cid   ${rec.cid}`);
console.log(`  local ${localCid}  ${localCid === rec.cid ? "(matches)" : "(MISMATCH)"}`);
console.log(`  value ${JSON.stringify(rec.value, null, 2)}`);
if (localCid !== rec.cid) process.exit(1);

/**
 * The write and read-back path against a hosted PDS, shared by every script.
 *
 * Only `com.atproto.repo.*` XRPC methods are used. Nothing here touches
 * `app.bsky.*` — the record lives in the user's repo, not in Bluesky.
 */
import { AtpAgent } from "@atproto/api";
import { cidForLex } from "@atproto/lex-cbor";
import { jsonToLex } from "@atproto/lex-json";
import type { JsonValue } from "@atproto/lex-json";
import { readPdsEnv } from "./env.ts";
import { parseAtUri } from "./atUri.ts";

export const SPIKE_COLLECTION = "dev.rollercoaster.badge.spike";

/** Shape of `lexicon/dev.rollercoaster.badge.spike.json` → defs.main.record */
export interface SpikeRecord {
  $type: typeof SPIKE_COLLECTION;
  credential: string;
  issuer?: string;
  createdAt: string;
  note?: string;
}

export interface WrittenRecord {
  uri: string;
  cid: string;
  repoDid: string;
}

/** Log in with an app password. This is the only authenticated step. */
export async function loginAgent(): Promise<AtpAgent> {
  const env = readPdsEnv();
  const agent = new AtpAgent({ service: env.url });
  await agent.login({ identifier: env.handle, password: env.appPassword });
  return agent;
}

/**
 * `com.atproto.repo.createRecord`. `validate` is left unset, which means the
 * PDS validates only lexicons it knows. Ours is unknown to it, so the record
 * is stored opaquely — the PDS neither checks nor cares what `issuer` says.
 * That is the mechanism the did:key-as-issuer answer rests on.
 */
export async function writeSpikeRecord(
  agent: AtpAgent,
  record: SpikeRecord,
): Promise<WrittenRecord> {
  const repoDid = agent.assertDid;
  const res = await agent.com.atproto.repo.createRecord({
    repo: repoDid,
    collection: SPIKE_COLLECTION,
    record: { ...record },
  });
  return { uri: res.data.uri, cid: res.data.cid, repoDid };
}

/** `com.atproto.repo.getRecord` back by AT-URI, through the same PDS. */
export async function readSpikeRecord(agent: AtpAgent, uri: string) {
  const { authority, collection, rkey } = parseAtUri(uri);
  const res = await agent.com.atproto.repo.getRecord({
    repo: authority,
    collection,
    rkey,
  });
  return {
    uri: res.data.uri,
    cid: res.data.cid,
    value: res.data.value as unknown as SpikeRecord,
  };
}

/**
 * Recompute the record's CID locally: DAG-CBOR encode the value, sha2-256,
 * CIDv1. If this equals what the PDS returned, the CID is a content hash of
 * exactly the bytes we wrote — not an opaque server-assigned id.
 */
export async function recomputeCid(value: unknown): Promise<string> {
  const lex = jsonToLex(value as JsonValue);
  const cid = await cidForLex(lex);
  return cid.toString();
}

const LAST_RECORD_FILE = new URL("../.last-record.json", import.meta.url);

/** Scratch pointer so `observe`/`resolve` can reuse the last written record. */
export async function saveLastRecord(record: WrittenRecord): Promise<void> {
  await Bun.write(LAST_RECORD_FILE, JSON.stringify(record, null, 2) + "\n");
}

export async function loadLastRecord(): Promise<WrittenRecord | undefined> {
  const file = Bun.file(LAST_RECORD_FILE);
  if (!(await file.exists())) return undefined;
  return (await file.json()) as WrittenRecord;
}

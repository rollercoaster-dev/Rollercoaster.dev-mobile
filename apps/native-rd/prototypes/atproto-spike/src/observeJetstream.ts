/**
 * Step 5 of #614 — verify, don't cite, two claims ADR-0015 makes:
 *
 *   (a) a record in our custom collection PROPAGATES to the firehose
 *       (observed via Jetstream, the JSON view of the firehose), and
 *   (b) it appears in NO Bluesky feed — the AppView indexes `app.bsky.*` only.
 *
 *   bun run observe
 *
 * Method for (a): subscribe to Jetstream filtered to our DID + collection,
 * THEN write a fresh record, and wait for the matching commit event.
 * Method for (b): after the write, ask the Bluesky AppView for the account's
 * author feed and profile post count, and search posts for the record's
 * note. All three must show nothing.
 */
import { AtpAgent } from "@atproto/api";
import {
  SPIKE_COLLECTION,
  loginAgent,
  saveLastRecord,
  writeSpikeRecord,
  type SpikeRecord,
} from "./pds.ts";

const JETSTREAM = process.env.JETSTREAM_URL ?? "wss://jetstream2.us-east.bsky.network/subscribe";
const TIMEOUT_MS = 30_000;

interface JetstreamCommitEvent {
  did: string;
  time_us: number;
  kind: "commit" | "identity" | "account";
  commit?: {
    rev: string;
    operation: "create" | "update" | "delete";
    collection: string;
    rkey: string;
    record?: unknown;
    cid?: string;
  };
}

const agent = await loginAgent();
const did = agent.assertDid;
const url = `${JETSTREAM}?wantedDids=${did}&wantedCollections=${SPIKE_COLLECTION}`;
console.log(`subscribing ${url}`);

const ws = new WebSocket(url);
await new Promise<void>((resolve, reject) => {
  ws.onopen = () => resolve();
  ws.onerror = (e) => reject(new Error(`jetstream connect failed: ${String(e)}`));
});
console.log("jetstream open — writing a record now\n");

const marker = `observeJetstream.ts run ${Date.now()} (#614)`;
const record: SpikeRecord = {
  $type: SPIKE_COLLECTION,
  credential: "fixture:firehose-propagation-check",
  createdAt: new Date().toISOString(),
  note: marker,
};

const seen = new Promise<JetstreamCommitEvent>((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error(`no jetstream event for our write within ${TIMEOUT_MS / 1000}s`)),
    TIMEOUT_MS,
  );
  ws.onmessage = (msg) => {
    const ev = JSON.parse(String(msg.data)) as JetstreamCommitEvent;
    if (ev.kind === "commit" && ev.commit?.collection === SPIKE_COLLECTION && ev.did === did) {
      clearTimeout(timer);
      resolve(ev);
    }
  };
});

const written = await writeSpikeRecord(agent, record);
console.log(`createRecord  ${written.uri}`);
console.log(`              ${written.cid}`);
const writtenRkey = written.uri.split("/").pop();

const ev = await seen;
ws.close();
const sameRecord = ev.commit?.rkey === writtenRkey && ev.commit?.cid === written.cid;
console.log(`\n(a) FIREHOSE: commit event received ${sameRecord ? "for exactly this record" : "for a DIFFERENT record"}`);
console.log(`    did        ${ev.did}`);
console.log(`    operation  ${ev.commit?.operation}  collection ${ev.commit?.collection}  rkey ${ev.commit?.rkey}`);
console.log(`    cid        ${ev.commit?.cid}`);
console.log(`    time_us    ${ev.time_us}`);

// (b) Bluesky AppView — public, unauthenticated.
const appview = new AtpAgent({ service: "https://public.api.bsky.app" });
const feed = await appview.app.bsky.feed.getAuthorFeed({ actor: did, limit: 50 });
const profile = await appview.app.bsky.actor.getProfile({ actor: did });
let searchHits = -1;
try {
  const search = await appview.app.bsky.feed.searchPosts({ q: marker, limit: 5 });
  searchHits = search.data.posts.length;
} catch (e) {
  console.log(`    (searchPosts unavailable: ${(e as Error).message})`);
}
const feedMentions = feed.data.feed.filter((f) => JSON.stringify(f).includes(SPIKE_COLLECTION)).length;
console.log(`\n(b) BLUESKY APPVIEW for ${did}:`);
console.log(`    getAuthorFeed items                 ${feed.data.feed.length}  (items referencing our collection: ${feedMentions})`);
console.log(`    getProfile.postsCount               ${profile.data.postsCount ?? 0}`);
console.log(`    searchPosts("${marker.slice(0, 24)}…") hits  ${searchHits < 0 ? "n/a" : searchHits}`);

const propagated = sameRecord;
const invisible = feedMentions === 0 && (profile.data.postsCount ?? 0) === 0 && searchHits <= 0;
console.log(`\nfirehose propagation: ${propagated}   bluesky feed absence: ${invisible}`);
if (!propagated || !invisible) process.exit(1);
await saveLastRecord(written);

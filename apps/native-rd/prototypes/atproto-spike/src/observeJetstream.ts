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
  ws.onerror = (e) => {
    clearTimeout(timer);
    reject(new Error(`jetstream socket error after open: ${String(e)}`));
  };
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
//
// A fresh account with no posts has an empty feed whatever the AppView does,
// so an empty feed alone proves nothing. Positive control: post ONE real
// app.bsky.feed.post carrying the same marker, then check that the AppView
// shows the post and not the spike record. Give indexing a moment first.
const control = await agent.post({ text: `spike control post — ${marker}` });
console.log(`\ncontrol post  ${control.uri}`);
await Bun.sleep(Number(process.env.APPVIEW_SETTLE_MS ?? 5_000));

const appview = new AtpAgent({ service: "https://public.api.bsky.app" });
const feed = await appview.app.bsky.feed.getAuthorFeed({ actor: did, limit: 50 });
const feedUris = feed.data.feed.map((f) => f.post.uri);
const controlInFeed = feedUris.includes(control.uri);
const spikeInFeed = feedUris.some((u) => u.includes(`/${SPIKE_COLLECTION}/`));
// searchPosts is not served anonymously by public.api.bsky.app (403 at the CDN);
// the PDS proxies it to the AppView for a logged-in session.
const search = await agent.app.bsky.feed.searchPosts({ q: marker, limit: 10 });
const searchUris = search.data.posts.map((p) => p.uri);
const controlInSearch = searchUris.includes(control.uri);
const spikeInSearch = searchUris.some((u) => u.includes(`/${SPIKE_COLLECTION}/`));

console.log(`\n(b) BLUESKY APPVIEW for ${did}, ${feedUris.length} feed item(s), ${searchUris.length} search hit(s):`);
console.log(`    control post in author feed   ${controlInFeed}`);
console.log(`    spike record in author feed   ${spikeInFeed}`);
console.log(`    control post in searchPosts   ${controlInSearch}`);
console.log(`    spike record in searchPosts   ${spikeInSearch}`);

// Clean up the control post; the spike record stays so `bun run resolve` works.
await agent.deletePost(control.uri);
console.log(`    (control post deleted)`);

const propagated = sameRecord;
const controlSeen = controlInFeed; // search indexing can lag; the feed is the hard control
const invisible = !spikeInFeed && !spikeInSearch;
console.log(`\nfirehose propagation: ${propagated}   appview control visible: ${controlSeen}   spike record invisible: ${invisible}`);
if (!controlSeen) console.error("control post never appeared in the author feed — AppView check is INCONCLUSIVE, not a pass");
if (!propagated || !controlSeen || !invisible) process.exit(1);
await saveLastRecord(written);

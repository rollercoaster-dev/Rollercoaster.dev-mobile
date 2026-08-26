/**
 * Question 3: does the record reach the firehose, and does it stay out of Bluesky feeds?
 *
 * `atproto-evaluation.md` and ADR-0015 both assert this pair — public discoverability via
 * the firehose, invisibility in Bluesky itself because the AppView only indexes
 * `app.bsky.*`. The issue is explicit that we verify rather than cite. Two independent
 * checks:
 *
 * 1. Subscribe to jetstream filtered to our collection and DID, publish nothing, and wait
 *    for a commit event. (Run `publish-record` in another shell, or pass --wait and
 *    publish while it listens.)
 * 2. Ask the public Bluesky AppView for the same DID's author feed and confirm our record
 *    is absent from it.
 *
 *     bun run check-propagation <did> [--wait]
 */

import { AtpAgent } from "@atproto/api";
import { COLLECTION, writeEvidence } from "./session.js";

const JETSTREAM = "wss://jetstream2.us-east.bsky.network/subscribe";
const WAIT_MS = 60_000;

const did = process.argv[2];
if (!did?.startsWith("did:")) {
  console.error(
    "Usage: bun run check-propagation <did-of-hosting-account> [--wait]",
  );
  process.exit(1);
}

/** Listen on jetstream for a commit in our collection from this DID. */
async function awaitFirehoseEvent(): Promise<unknown | null> {
  const url = `${JETSTREAM}?wantedCollections=${COLLECTION}&wantedDids=${did}`;
  console.log(
    `Subscribing to jetstream, filtered to ${COLLECTION} from ${did}`,
  );
  console.log(`  ${url}`);
  console.log(
    `Waiting up to ${WAIT_MS / 1000}s. Run \`bun run publish-record\` now.\n`,
  );

  return new Promise((resolve) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => {
      socket.close();
      resolve(null);
    }, WAIT_MS);

    socket.addEventListener("open", () => console.log("jetstream connected."));
    socket.addEventListener("message", (event) => {
      const parsed = JSON.parse(String(event.data)) as {
        kind?: string;
        commit?: { collection?: string };
      };
      // Verified 2026-08-25: `wantedCollections` filters *commit* events only.
      // `identity` and `account` events stream through regardless — a subscription
      // filtered to a collection nobody has ever published still delivers ~6 events
      // in 12s, all of them identity/account churn. Anything counting raw message
      // volume as "our record propagated" would be reading noise. Milestone 4's
      // indexer has to filter on kind, not just trust the query string.
      if (parsed.kind !== "commit") return;
      if (parsed.commit?.collection !== COLLECTION) return;
      clearTimeout(timer);
      socket.close();
      resolve(parsed);
    });
    socket.addEventListener("error", (event) => {
      console.error("jetstream socket error:", event);
      clearTimeout(timer);
      resolve(null);
    });
  });
}

/** Ask the public AppView whether Bluesky shows anything for this account. */
async function checkBlueskyFeed(): Promise<{
  postCount: number;
  mentionsOurCollection: boolean;
}> {
  const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
  const { data } = await agent.app.bsky.feed.getAuthorFeed({
    actor: did,
    limit: 100,
  });
  const serialized = JSON.stringify(data.feed);
  return {
    postCount: data.feed.length,
    mentionsOurCollection: serialized.includes(COLLECTION),
  };
}

const firehoseEvent = process.argv.includes("--wait")
  ? await awaitFirehoseEvent()
  : null;

if (process.argv.includes("--wait")) {
  console.log(
    firehoseEvent
      ? `\nFirehose: commit for ${COLLECTION} observed.`
      : `\nFirehose: nothing seen in ${WAIT_MS / 1000}s. That is a finding — record it as one.`,
  );
}

const feed = await checkBlueskyFeed();
console.log(`\nBluesky AppView author feed for ${did}:`);
console.log(`  posts returned: ${feed.postCount}`);
console.log(`  feed mentions ${COLLECTION}: ${feed.mentionsOurCollection}`);
console.log(
  feed.mentionsOurCollection
    ? "  -> UNEXPECTED. The AppView is surfacing our records; ADR-0015's assumption is wrong."
    : "  -> As predicted: the AppView indexes app.bsky.* only, so our badge records are invisible in Bluesky.",
);

const evidencePath = await writeEvidence("propagation-output.json", {
  note:
    "Captured from `bun run check-propagation`. Verifies, rather than cites, the two " +
    "claims ADR-0015 makes about what the network does with a third-party record.",
  did,
  collection: COLLECTION,
  jetstreamEndpoint: JETSTREAM,
  firehoseEventObserved: firehoseEvent !== null,
  firehoseEvent,
  blueskyAppView: feed,
});

console.log(`\nEvidence written to ${evidencePath}`);

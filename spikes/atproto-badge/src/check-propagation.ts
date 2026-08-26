/**
 * LESSON 06 — see ../lessons/06-the-firehose.md
 *
 * Your job: find out what the wider network does with a record you published, and
 * check two claims this project has been repeating without ever verifying them.
 *
 *     bun run check-propagation <did> [--wait]
 */

const did = process.argv[2];
if (!did?.startsWith("did:")) {
  console.error(
    "Usage: bun run check-propagation <did-of-your-account> [--wait]",
  );
  process.exit(1);
}

// Imports and constants you will need:
//   import { AtpAgent } from "@atproto/api";
//   import { COLLECTION, writeEvidence } from "./session.js";
//
//   const JETSTREAM = "wss://jetstream2.us-east.bsky.network/subscribe";
//   const WAIT_MS = 60_000; // how long --wait listens before giving up

// YOUR TURN (1 of 2) — the firehose.
//
// Open a WebSocket to jetstream, filtered to your collection and your DID:
//
//   `${JETSTREAM}?wantedCollections=${COLLECTION}&wantedDids=${did}`
//
// Jetstream docs: https://github.com/bluesky-social/jetstream
// The underlying firehose: https://atproto.com/specs/event-stream
//
// Listen, publish a record from another shell, and see whether your commit shows up.
//
// TRAP, and this one is worth walking into deliberately. Run the subscription with a
// collection nobody on earth has ever published and just count messages. You will get
// several within seconds. Before you read lesson 06's explanation, work out where they
// are coming from — the answer changes how you would build an indexer.

// YOUR TURN (2 of 2) — the AppView.
//
// Ask the public Bluesky AppView for your account's author feed:
//
//   new AtpAgent({ service: "https://public.api.bsky.app" })
//     .app.bsky.feed.getAuthorFeed({ actor: did, limit: 100 })
//
// Predict first: your badge record is in your repo, and Bluesky reads your repo.
// Will the badge show up in your Bluesky feed? Commit to an answer, then check.
// Lesson 06 explains the result — and it is the reason publishing badges this way
// does not spam anybody's timeline.

throw new Error("Not implemented — see lessons/06-the-firehose.md");

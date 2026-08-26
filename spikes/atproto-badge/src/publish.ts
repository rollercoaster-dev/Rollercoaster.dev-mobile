/**
 * LESSON 05 — see ../lessons/05-publish-and-resolve.md
 *
 * Your job: write the credential into your atproto repository.
 *
 * This is the first lesson that needs a real account. If you have not made the burner
 * yet, stop and read lesson 05's "Getting an account" section first.
 *
 *     bun run publish-record
 */

import { buildSignedCredential } from "./build-credential.js";
import { login, readEnv } from "./session.js";

const env = readEnv();
// Kept whole rather than destructured: `session.agent` is the authenticated client
// you write with, `signed.credential` / `signed.publicKeyJwk` are what you write.
const session = await login(env);
console.log(`Logged in as ${env.handle} (${session.did}) on ${env.pdsUrl}`);

const signed = await buildSignedCredential({
  achievementName: "Published a badge to an atproto repo",
  achievementDescription:
    "Wrote an Open Badges 3.0 credential as a record in a user-owned atproto repository.",
});

console.log(`Credential issuer: ${signed.issuerDid}`);
console.log(
  `  (not ${session.did} — read lesson 05 on why these are two different things)`,
);

// Imports you will need on top of the two above:
//   import { COLLECTION, writeEvidence } from "./session.js";

// YOUR TURN.
//
// Call `session.agent.com.atproto.repo.putRecord`. You need four things:
//
//   repo:       whose repository to write into. You are writing into your own.
//   collection: the NSID. Use the COLLECTION constant.
//   rkey:       the record key. Any valid rkey works; `Date.now().toString(36)` is fine.
//               Lesson 05 covers why the choice matters more than it looks.
//   record:     an object with `$type` set to the collection, plus your fields —
//               `credential` (`signed.credential` as a JSON string), `issuerDid`,
//               `createdAt`.
//
// The call returns `{ data: { uri, cid } }`. Print both.
//
// Docs: https://docs.bsky.app/docs/api/com-atproto-repo-put-record
//
// Predict before you run it: the PDS has never heard of dev.rollercoaster.badge.credential.
// Will it accept the write? Write your guess down, then find out. Lesson 05 discusses
// why the answer is what it is.

throw new Error("Not implemented — see lessons/05-publish-and-resolve.md");

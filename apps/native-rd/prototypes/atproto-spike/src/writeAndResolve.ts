/**
 * Step 3 of #614: write ONE record to the test account's repo on a hosted
 * PDS, read it back by AT-URI, and check the CID both ways (server-returned
 * vs. locally recomputed from the record bytes).
 *
 *   bun run spike
 *
 * The credential written here is a FIXTURE string, not a signed badge — the
 * signed-credential variant is `didKeyIssuer.ts`. This script isolates the
 * repo mechanics from the crypto question.
 */
import {
  loginAgent,
  readSpikeRecord,
  recomputeCid,
  saveLastRecord,
  writeSpikeRecord,
  type SpikeRecord,
} from "./pds.ts";

const agent = await loginAgent();
console.log(`logged in as ${agent.assertDid} via ${agent.serviceUrl.href}`);

const record: SpikeRecord = {
  $type: "dev.rollercoaster.badge.spike",
  credential: "fixture:not-a-real-credential",
  createdAt: new Date().toISOString(),
  note: "writeAndResolve.ts — repo mechanics only, fixture payload (#614)",
};

const written = await writeSpikeRecord(agent, record);
console.log("\ncreateRecord →");
console.log(`  uri  ${written.uri}`);
console.log(`  cid  ${written.cid}`);

const back = await readSpikeRecord(agent, written.uri);
console.log("\ngetRecord →");
console.log(`  uri  ${back.uri}`);
console.log(`  cid  ${back.cid}`);
console.log(`  value ${JSON.stringify(back.value)}`);

const local = await recomputeCid(back.value);
console.log(`\nlocal CID (dag-cbor + sha2-256 of the returned value) ${local}`);

const uriMatches = back.uri === written.uri;
const cidMatches = back.cid === written.cid && local === written.cid;
console.log(`\nuri round-trips: ${uriMatches}`);
console.log(`cid round-trips AND matches local recomputation: ${cidMatches}`);

if (!uriMatches || !cidMatches) {
  console.error("\nFAIL — record did not resolve consistently");
  process.exit(1);
}
await saveLastRecord(written);
console.log("\nOK — wrote .last-record.json for `bun run observe` / `bun run resolve`");

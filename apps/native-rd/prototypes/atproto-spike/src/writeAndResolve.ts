/**
 * Step 3 of #614: write ONE record to the test account's repo on a hosted
 * PDS, read it back by AT-URI + CID, and check the CID both ways
 * (server-returned vs. locally recomputed from the record bytes).
 *
 *   bun run spike
 *
 * The credential written here is a FIXTURE string, not a signed badge — the
 * signed-credential variant is `didKeyIssuer.ts`. This script isolates the
 * repo mechanics from the crypto question.
 */
import {
  SPIKE_COLLECTION,
  loginAgent,
  recomputeCid,
  saveLastRecord,
  writeReadVerify,
  type SpikeRecord,
} from "./pds.ts";

const agent = await loginAgent();
console.log(`logged in as ${agent.assertDid} via ${agent.serviceUrl.href}`);

const record: SpikeRecord = {
  $type: SPIKE_COLLECTION,
  credential: "fixture:not-a-real-credential",
  createdAt: new Date().toISOString(),
  note: "writeAndResolve.ts — repo mechanics only, fixture payload (#614)",
};

const { written, value, cidConsistent } = await writeReadVerify(agent, record);
console.log("\ncreateRecord →");
console.log(`  uri  ${written.uri}`);
console.log(`  cid  ${written.cid}`);
console.log("\ngetRecord (by AT-URI + CID) →");
console.log(`  value ${JSON.stringify(value)}`);
console.log(`\nlocal CID (dag-cbor + sha2-256 of the returned value) ${await recomputeCid(value)}`);
console.log(`\nuri + cid round-trip AND cid matches local recomputation: ${cidConsistent}`);

if (!cidConsistent) {
  console.error("\nFAIL — record did not resolve consistently");
  process.exit(1);
}
await saveLastRecord(written);
console.log("\nOK — wrote .last-record.json for `bun run observe` / `bun run resolve`");

# 07 — Who vouches for the key

**The last one.** `src/did-key-only-experiment.ts`. Needs your account.

Everything so far was setup for this question.

## The question

[ADR-0015](../../../apps/native-rd/docs/decisions/ADR-0015-funded-scope-prototype-fund.md)
plans to publish public badges to the user's own atproto repository. Its open question,
unresolved and blocking:

> Can a correctly encoded `did:key` stay the credential issuer while atproto only hosts
> it — no PLC operation, no email, no custodial rotation key?

That sentence is doing a lot of work. Unpack it.

## The flow the evaluation originally sketched

[`atproto-evaluation.md`](../../../apps/native-rd/docs/research/atproto-evaluation.md)
describes publishing like this — and step 4 is the one to look at:

1. User earns a badge. Nothing leaves the device.
2. User chooses Publish publicly.
3. First time only: create or connect an atproto identity.
4. **Add the app's Ed25519 badge key to the DID document as a verificationMethod, via
   [`com.atproto.identity.signPlcOperation`](https://docs.bsky.app/docs/api/com-atproto-identity-request-plc-operation-signature).**
5. `putRecord` writes the credential.

Step 4 sounds tidy — put the badge key in the user's DID document so the identity that
hosts the badge is the identity that signed it. Bluesky
[relaxed did:plc's key constraints in June 2025](https://github.com/bluesky-social/atproto/discussions/3928)
specifically to allow arbitrary key types including Ed25519.

But look at what step 4 drags in:

- A **PLC operation** — mutating your DID document, a real identity change.
- On a hosted PDS, that operation is **email-token gated**. So publishing a badge
  requires a verified email address.
- And the hosted PDS holds your **rotation key**, meaning the operator can rewrite that
  DID document later. Including the part your credentials depend on.

For an app whose pitch is "no accounts, no passwords, no cloud sign-in", that is a large
concession. So: is step 4 actually necessary?

## The experiment

Three parts, and the second is the clever one.

### 1. Verify offline

Fetch the record, recover the key from `issuerDid` with your `decodeDidKey`, verify.

You already know this works — it is the test you passed in lesson 04, before you had an
account at all. Confirming it against a real published record just closes the loop.

### 2. Prove the host has no authority

Fetch your account's DID document straight from the directory:

```ts
await fetch(`https://plc.directory/${yourAccountDid}`);
```

[did:plc spec](https://web.plc.directory/spec/v0.1/did-plc). Look at `verificationMethod`.

Your badge key should **not** be there. You never called `signPlcOperation`.

That absence _is the result_. It says: this account has no cryptographic relationship
with the credential it is hosting. It stores bytes. Nothing more.

Telling them apart by eye is easy. A default account has exactly one method, `#atproto`,
whose `publicKeyMultibase` starts `zQ3sh` — secp256k1. An Ed25519 badge key added by a
PLC operation would appear as a second entry starting `z6Mk`, the prefix you have been
generating since lesson 02. Verified against a live document on 2026-08-25.

### 3. Answer, including the price

If (1) verifies and (2) shows the key absent, the answer is **yes**. Step 4 is optional.
The credential's authority never depended on the account.

Now the part that separates an answer from a sales pitch.

## What it costs

A bare `did:key` has **no rotation and no recovery**.

`did:plc` has both. The directory maps your DID to your current keys, so you can rotate
after a compromise, and you can recover after losing a device. That is what the directory
is _for_.

`did:key` has no directory, so there is nothing to update. Lose the key and every
credential it ever signed becomes permanently unattributable. Not revoked — unverifiable.
Nobody can ever prove who issued them again.

For a badge someone earned through months of effort, that is a serious failure mode, and
it should not be waved past.

### But notice whose problem it already is

Here is the part that changes the decision.

The app's badge signing key lives in Expo SecureStore today. If it is not covered by the
Evolu mnemonic, then losing the phone already destroys badge attribution — right now, in
production, with no atproto anywhere near it.

So key loss is **not a new risk introduced by choosing `did:key`**. It is an existing
unsolved problem in the app, and adopting `did:plc` would not fix it either — it would
hand custody of the fix to whoever runs the PDS, in exchange for an email requirement.

That reframing is the actual deliverable of this lesson. "Which option is riskier" was the
wrong question; the risk was already there, attached to something else.

## The honest summary

|                                        | `did:key` only | `did:key` + PLC verificationMethod |
| -------------------------------------- | -------------- | ---------------------------------- |
| Verifies offline                       | Yes            | Yes                                |
| Needs an account to verify             | No             | No                                 |
| Needs an email to publish              | No             | Yes                                |
| PDS operator can affect the credential | No             | Yes — holds the rotation key       |
| Key rotation / recovery                | No             | Yes, via the operator              |
| Works if the PDS vanishes              | Yes            | Yes for saved copies               |

`did:key` is self-sovereign but unrecoverable. `did:plc` is recoverable but custodial.
Both are defensible. The choice should be conscious, and it is probably the user's to
make rather than ours.

What this experiment removes is the assumption that step 4 was _required_. It is not.
That takes email verification and custodial identity off the critical path for publishing
a badge, which is a meaningful simplification of milestone 4.

## Your turn

`src/did-key-only-experiment.ts`. All three parts, then a capture in `evidence/`.

```bash
bun run did-key-only at://did:plc:.../dev.rollercoaster.badge.credential/...
```

Write the cost down in your own words alongside the answer. An answer without its price
attached is the kind of finding that gets quoted in a design doc six months later by
someone who never read the caveat.

## Check yourself

1. Why is the _absence_ of something in a DID document a stronger result than its
   presence would be?
2. Someone argues `did:plc` is safer because it supports recovery. What is the one-sentence
   reply?
3. Your PDS operator rewrites your DID document tomorrow. Under `did:key`-only, what
   happens to credentials you already published?

---

## Where this leaves the project

You have answered a real open question with running code. Concretely:

- ADR-0015's "Identity and email" open question resolves: no PLC operation needed.
- Milestone 4 loses the email-verification requirement from its critical path.
- The firehose gotcha from lesson 06 is a constraint on whatever indexer gets built.
- Gap #7's `did:key` encoding now has a correct, tested implementation to port into
  [issue #598](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/598).

What this spike deliberately did not touch: app integration, OAuth, UI, key-management
hardening, and running an AppView. Those are milestone 4 proper.

---

Previous: [06 — The firehose](06-the-firehose.md) ·
Back to [the index](../README.md)

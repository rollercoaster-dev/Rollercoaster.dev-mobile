# Badge Baking & Export

How an earned badge becomes a file the user can share, and what each
export path does (and doesn't) guarantee.

**Audience:** anyone editing badge issuance, the export UI, or
debugging "my exported badge doesn't verify."

**Related docs:**
[../research/badge-export.md](../research/badge-export.md) (the full
investigation behind these decisions),
[../architecture/openbadges-core.md](../architecture/openbadges-core.md)
(workspace-package boundary), [../architecture/ob3-compliance-status.md](../architecture/ob3-compliance-status.md).

---

## What "baking" means

OpenBadges 3.0 (1EdTech, §5) defines three coequal delivery formats:

| §   | Format           | What it is                                                                                                        |
| --- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| 5.1 | **File**         | The raw signed `OpenBadgeCredential` JSON-LD (a W3C Verifiable Credential)                                        |
| 5.2 | **Web Resource** | The credential served at an HTTPS URL                                                                             |
| 5.3 | **Baked Badge**  | A PNG with the VC embedded inside an `iTXt` chunk (5.3.1) or an SVG with the VC in a `<metadata>` element (5.3.2) |

**Baking** = wrapping the signed VC inside the badge image so the file
is simultaneously a picture and a credential. The PNG-iTXt convention
predates OB 3.0; it was kept for backwards compatibility. The
canonical wire format for OB 3.0 is the signed VC itself (5.1), and
the modern delivery channel that the industry has converged on is a
hosted verification URL (5.2). We support 5.3 today because it's the
only format that doesn't require backend infrastructure.

The OB 3.0 keyword for the `iTXt` chunk is **`openbadgecredential`**
(it was `openbadges` in OB 2.0). Compression must not be used.

---

## Where baking happens

`src/hooks/useCreateBadge.ts:266`

```ts
const bakedPng = bakePNG(pngBuffer, credentialJsonOut);
// ...
imageUri = await saveBadgePNG(bakedPng);
```

`bakePNG` and `saveBadgePNG` live in the
[`@rollercoaster-dev/openbadges-core`](../../../../packages/openbadges-core/)
workspace package. The output PNG bytes are written to app storage and
the resulting `file://` URI is stored on the badge row as `imageUri`.

**Every successfully-baked badge has both:**

- a `design` field (serialized `BadgeDesign` used by `BadgeRenderer`
  to draw the live preview), and
- an `imageUri` pointing at the baked PNG on disk (the one carrying
  the iTXt credential chunk).

The export Card on `BadgeDetailScreen` must always read from
`imageUri`. **Never** re-rasterize the live `BadgeRenderer` via
`react-native-svg`'s `toDataURL` and ship those bytes — that path
skips `bakePNG()` entirely. See the 2026-05-18 plan for the bug this
caused and the regression test that locks the contract.

---

## The three export paths

`BadgeDetailScreen.tsx` exposes three buttons. The distinction is what
the artefact _is_, not just what it looks like.

### 1. Export Verifiable Badge (primary)

The full baked PNG, routed through a byte-preserving channel.

- **iOS:** `Sharing.shareAsync(imageUri, { UTI: "public.png", … })`.
  AirDrop, Save to Files, Mail, iMessage attachment, and Drive/Dropbox
  upload tiles preserve PNG bytes (and therefore the iTXt chunk).
  Third-party messenger "send as photo" tiles will still transcode and
  strip iTXt — that's a receiver-side problem we can't solve from
  here. iOS first-party tiles are safe.
- **Android:** `FileSystem.StorageAccessFramework.createFileAsync(...)`
  → user picks a destination folder via `ACTION_CREATE_DOCUMENT` → we
  write the baked PNG bytes byte-for-byte. **Bypasses the share sheet
  entirely**, which avoids the dominant Android failure mode: tapping
  a messenger tile that defaults to photo semantics and re-encodes the
  PNG.

### 2. Export Credential (JSON)

The raw signed VC JSON-LD — the §5.1 canonical format. Survives every
transport because it's just text. Looks technical to end-users but
this is the format every OB 3.0 verifier accepts and the format that
will let us add hosted-verification-URL support (§5.2) later without
re-shipping bytes.

### 3. Save as Image

`Sharing.shareAsync` of the same baked PNG — identical bytes to path
(1) on iOS. Kept available because some users only want to share the
picture, and on Android this route deliberately goes through the share
sheet (so users can tap a messenger tile if they explicitly want to).
Carries an `accessibilityHint` warning that the credential may be lost
when sent through messengers.

---

## Android SAF vs share sheet — the trade-off

| Approach                                     | Pro                                              | Con                                                                                                                            |
| -------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Storage Access Framework (`createFileAsync`) | Bytes always preserved. No messenger-photo trap. | Folder picker is less familiar than the share sheet. Users have to know they want to "save somewhere," then attach from there. |
| Share sheet (`Sharing.shareAsync`)           | Familiar; one tap to messenger.                  | Whichever messenger they tap may re-encode. PNG → JPEG transcode strips iTXt.                                                  |

The verifiable export uses SAF; the "Save as Image" button keeps the
share sheet so users who explicitly want messenger speed get it. The
caption text under the buttons explains the trade-off plainly.

---

## How to verify a PNG is baked

The fastest path is the workspace's badge verifier — it parses the iTXt
chunk, verifies the Ed25519 signature under our Iteration-A scheme, and
reports OB 3.0 conformance gap-by-gap:

```sh
bun run verify:badge <path-to-badge.png-or-.json>
# System round-trip + 7 OB3 gap checks. Exits 0 if system OK,
# 1 if our own signing is broken, 2 on load error.
```

Source: `apps/native-rd/scripts/verify-badge.ts`. Tracks the gap
inventory in [../architecture/ob3-compliance-status.md](../architecture/ob3-compliance-status.md).

If you just want the raw chunk list:

```sh
pngcheck -t badge.png
# Expect a chunk list including:
#   iTXt: openbadgecredential
```

No `pngcheck` available? PNG framing is `4-byte BE length, 4-byte
type, data, 4-byte CRC` after the 8-byte signature, so a tiny script
can dump the inventory. Look for any `iTXt` or `tEXt` chunk whose
keyword is `openbadgecredential`.

A flat (un-baked) PNG from the bug we shipped looks like:

```
IHDR, sRGB, eXIf, pHYs, iDOT, IDAT, IDAT, IEND
```

No text chunks at all — that's the failure signature.

A correctly-baked PNG looks like:

```
IHDR, …, iTXt: openbadgecredential, …, IDAT, …, IEND
```

To go end-to-end and confirm the embedded VC is valid, drop the PNG
into any OB 3.0 verifier (e.g. `verifierplus.org`) or run
`readBadgePNG` from `@rollercoaster-dev/openbadges-core` against the
file and verify the resulting JSON-LD with `jose`.

---

## Failure modes no UX can solve

- **Screenshots.** A screenshot of the badge is a flat PNG with no
  credential. Educational copy is the only mitigation.
- **Recipient re-shares as photo.** Even if the issuer ships an
  iTXt-bearing PNG, the recipient pasting it through a messenger
  photo flow will strip the credential.
- **JPEG transcode by receiving systems.** Some platforms (Instagram,
  Twitter, Telegram-as-photo) re-encode all uploaded images. iTXt does
  not survive a format conversion to JPEG. Only the JSON or a hosted
  URL avoids this.

---

## Future direction (deferred)

§5.2 (Web Resource — hosted verification URL) is the industry-standard
delivery for OB 3.0. Every major issuer (Credly, Accredible, Open
Badge Factory, Canvas Credentials, Sertifier) primarily delivers via a
hosted page URL with PNG/JSON as secondary download artefacts. We will
add this in Iteration B (see
[ADR-0001](../decisions/ADR-0001-iteration-strategy.md) — "Hosted
verifiable badge link"). It survives every transport and lets us add
revocation, view counts, and expiry without re-shipping bytes.

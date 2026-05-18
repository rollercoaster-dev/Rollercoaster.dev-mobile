# Badge Export — Research & Options

**Status:** Research, 2026-05-18
**Trigger:** Production bug — exported badges contain no OpenBadges credential. Investigated via Sentry issue `NATIVE-RD-B` plus user-supplied artefacts.

---

## 1. What's broken today

### 1.1 The bug (empirically proven)

`BadgeDetailScreen.tsx:241-245`:

```tsx
onPress={() =>
  design
    ? exportDesignImage(badgeRendererRef, design)   // ← captures fresh, never bakes
    : exportImage(imageUri)                          // ← uses the baked file on disk
}
```

Every successfully-baked badge has a non-null `design` field (`useCreateBadge.ts:310`). So the `design ?` branch is taken on every export. `exportDesignImage` (`useBadgeExport.ts:57-125`) re-rasterises the live `BadgeRenderer` via `react-native-svg`'s `toDataURL` and writes the raw PNG bytes — **`bakePNG()` is never called**. No `iTXt` chunk, no `openbadgecredential`, no signed VC. The user gets a flat picture.

The actually-baked PNG written by `useCreateBadge.ts:266-272` (`bakePNG(pngBuffer, credentialJsonOut)` → `saveBadgePNG(bakedPng)`) sits on disk at `badge.imageUri`, untouched, ignored by the export button.

### 1.2 Proof from a real exported file

User shared `/Users/joeczarnecki/Downloads/badge-export-1779100463829.png` — saved via iOS "Save to Files" (a byte-preserving channel). PNG chunk inventory:

```
IHDR, sRGB, eXIf, pHYs, iDOT, IDAT, IDAT, IEND
```

No `iTXt`. No `tEXt`. No `zTXt`. The file came out of the app already credential-less. iOS preserved every byte; there was nothing to preserve.

### 1.3 The JPEG was a red herring

The earlier user-reported file (`photo_2026-05-18 12.26.48.jpeg`) was Android → Telegram → JPEG transcode on the receiving side. Our code never produces JPEG (`grep` of the entire native-rd source confirms — every badge codepath uses PNG bytes, `.png` filenames, `mimeType: "image/png"`, `UTI: "public.png"`). Telegram's "Send as Photo" pipeline re-encoded the PNG, which would have stripped the iTXt chunk anyway — except no iTXt existed to strip.

The JPEG conversion is a second-layer problem that affects messenger sharing in general. The primary failure is that the source bytes never carried the credential.

---

## 2. OB 3.0 delivery formats — what the spec actually says

The 1EdTech OpenBadges 3.0 spec (`imsglobal.org/spec/ob/v3p0/`) defines **three coequal delivery formats** in §5:

| §   | Format           | What it is                                                                            |
| --- | ---------------- | ------------------------------------------------------------------------------------- |
| 5.1 | **File Format**  | Raw signed `OpenBadgeCredential` JSON-LD (the W3C Verifiable Credential itself)       |
| 5.2 | **Web Resource** | The credential served at an HTTPS URL                                                 |
| 5.3 | **Baked Badge**  | PNG `iTXt` chunk (5.3.1) or SVG `<metadata>` (5.3.2) embedding the VC inside an image |

**PNG baking is one of three options, not the canonical wire format.** It's an OB-2.0-era convenience wrapper retained for backwards compatibility. The OB 3.0 _Implementation Guide_ (§3.5.1) explicitly flags iOS as a problem surface for baking, and the canonical artefact for verification is the signed VC JSON-LD.

The PNG iTXt keyword changed from `openbadges` (OB 2.0) to `openbadgecredential` (OB 3.0); compression "must not be used."

### Industry practice

| Issuer                     | Primary delivery                                    | PNG baked?                  |
| -------------------------- | --------------------------------------------------- | --------------------------- |
| Credly (Pearson)           | Hosted credly.com badge page URL                    | Secondary download artefact |
| Open Badge Factory         | Passport hosted backpack                            | Secondary download artefact |
| Canvas Credentials (Badgr) | Badgr backpack URL                                  | Secondary download artefact |
| Accredible                 | Hosted credential page URL + multi-format downloads | Secondary download artefact |
| Sertifier                  | Hosted page + URL share                             | Secondary download artefact |

**No major OB 3.0 issuer relies on baked-PNG as the primary delivery channel.** The dominant pattern is a hosted public verification URL.

### Wallet ecosystem

- **Learner Credential Wallet (DCC)** — OB 3.0 native; imports via deep link / QR code encoding a VC-API Interaction URL. Does not rely on PNGs.
- **Lissi / Trinsic / walt.id** — OpenID4VCI credential offer URI is the import channel.
- **Microsoft Authenticator (Entra Verified ID)** — Microsoft protocol; doesn't natively accept OB 3.0 PNGs.
- **Apple Wallet / Google Wallet** — neither accepts W3C VC JSON-LD credentials yet (Apple supports only ISO mdoc as of iOS 26).

---

## 3. Platform share mechanics

### iOS (mostly safe)

| Target                                                  | Preserves PNG bytes (and iTXt)                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| AirDrop                                                 | Yes                                                                                      |
| iMessage (as attachment)                                | Yes                                                                                      |
| Mail (Apple Mail / Gmail)                               | Yes                                                                                      |
| Save to Files (`UIDocumentPickerViewController`)        | Yes                                                                                      |
| Save to Photos                                          | Mostly — at the mercy of iCloud optimisation; sharing back out from Photos may transcode |
| 3rd-party messengers (Telegram/WhatsApp/Signal "photo") | **No** (transcoded inside the app)                                                       |
| 3rd-party messengers ("file" mode)                      | Yes                                                                                      |

iOS first-party tiles are byte-safe. The hazard is when users pick a messenger tile that defaults to photo semantics.

### Android (hostile by default)

| Target                                                              | Preserves bytes (and iTXt)                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Telegram (default tap)                                              | **No** — JPEG re-encode @ ~85%, EXIF/iTXt stripped                                     |
| Telegram ("Send as File")                                           | Yes                                                                                    |
| WhatsApp (Photo)                                                    | **No**                                                                                 |
| WhatsApp (Document)                                                 | Yes                                                                                    |
| Signal (image)                                                      | **No**                                                                                 |
| Signal (file attach)                                                | Yes                                                                                    |
| Discord                                                             | Yes (PNG ancillary chunks survive; their stripper is JPEG-focused)                     |
| Google Drive / Dropbox / OneDrive                                   | Yes                                                                                    |
| Save to Files / Storage Access Framework (`ACTION_CREATE_DOCUMENT`) | Yes                                                                                    |
| Gmail attachment                                                    | Yes                                                                                    |
| Quick Share / Nearby Share                                          | Mostly yes (cross-ecosystem AirDrop bridge has metadata-loss reports as of April 2026) |

**Verification:** there is no platform API that reports back whether a share target transcoded. `Sharing.shareAsync` resolves when the chooser closes regardless of receiver behaviour.

### Shippable today on Android without ejecting

`FileSystem.StorageAccessFramework.createFileAsync` (already available in our installed `expo-file-system` legacy entry point) bypasses the share sheet entirely. User picks a folder via `ACTION_CREATE_DOCUMENT`, the file lands byte-for-byte. No messenger-photo trap, no transcoding.

On iOS, the existing `Sharing.shareAsync` is already correct — the share sheet's "Save to Files" / AirDrop / Mail tiles are byte-safe. The user just needs to pick one.

---

## 4. UX patterns from credential-export apps

### What the leaders do

- **Learner Credential Wallet (DCC).** No "share PNG" path. Three explicit actions: **Create Public Link** (uploads to VerifierPlus, share the URL), **Add to LinkedIn**, **Export as PDF**.
- **Credly.** Share sheet hands out a `credly.com/badges/<uuid>` URL — the hosted verification page. PNG download is a secondary artefact, not the share.
- **Apple PassKit (.pkpass).** Signed ZIP with `application/vnd.apple.pkpass` MIME — iOS routes the share only through byte-preserving channels because of the registered UTI. Issuers can set `sharingProhibited` to remove sharing entirely.
- **NHS COVID Pass / SMART Health Cards.** Triad: on-screen QR, Save to OS wallet, Download PDF (carrying the same QR). No raw image share.

### Patterns that solve the problem

1. **Share-link** — issuer-hosted verification URL. The user shares text; messengers can't damage text. Tradeoff: requires backend, ties verification to a domain, kills offline verification.
2. **Save credential file (`.json`)** — share the raw signed VC. Tradeoff: looks technical, but is the canonical OB 3.0 format and survives every transport.
3. **QR code** — either embed the VC (compact formats only, ~2-3 KB max) or embed a URL/deep link. Tradeoff: requires the verifier side to have a scanner.
4. **Save to Files only** — bypass the share sheet. Tradeoff: less convenient than tap-to-messenger, but guaranteed byte preservation.
5. **Multi-button export** — separate intent buttons rather than one ambiguous "Share." Each button names the trade-off ("Save as image — this is a picture, not the credential").
6. **Non-image UTI** — declare the artefact as `public.json` or a custom UTI; iOS share sheet then hides Photos/iMessage-as-photo/most messengers from the target list.

### Failure modes no UX can solve

- User takes a screenshot of the badge and sends that. Only educational copy mitigates ("a screenshot is not the credential").
- Recipient pastes/forwards through messenger photo flows even when given a link.

---

## 5. Recommendations

Three tiers. Each tier independently solves a real failure mode and can ship without the next.

### Tier 1 — Stop the bleeding (one-line fix)

`BadgeDetailScreen.tsx:241-245`: drop the `design ?` branch.

```tsx
onPress={() => exportImage(imageUri)}
```

This makes every export go through the actually-baked PNG on disk. On iOS Save-to-Files / AirDrop / Mail / iMessage / Drive, the iTXt chunk survives end-to-end. Android via cloud upload / Save-to-Files / Discord / "file" mode in messengers also survives.

`exportDesignImage` should remain available _only_ on the BadgeDesigner screen (pre-bake preview share), where there is no credential to lose.

**What this does NOT fix:** Android users who pick a messenger photo tile still get a transcoded JPEG. But at least the source has the iTXt chunk now — anyone who picks a byte-safe target gets a real OpenBadge.

### Tier 2 — Honest export UX (a day's work)

Split the single "Save Image" button into clearly-named intent buttons on `BadgeDetailScreen`:

| Button                       | What it does                                                                       | Target                                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Export Verifiable Badge**  | iOS: `Sharing.shareAsync` of the baked PNG                                         | All byte-safe iOS share tiles                                                                                                                                               |
|                              | Android: `FileSystem.StorageAccessFramework.createFileAsync` writing the baked PNG | User-picked folder; bypasses messenger photo traps                                                                                                                          |
| **Export Credential (JSON)** | (already exists in `useBadgeExport.exportJSON`) — surface it more prominently      | Save to Files / SAF                                                                                                                                                         |
| **Save as Image**            | The current `exportDesignImage` path, **labelled honestly**                        | Photos / Image apps; with copy: "This is a picture of your badge, not the badge itself. Share via this button if you just want the visual; some apps will break the proof." |

This matches DCC LCW's pattern (separate intent buttons) and gets us off the share-sheet messenger trap on Android.

**What this does NOT fix:** OB 3.0 ecosystem alignment. We're still PNG-iTXt-centric while industry has moved past it.

### Tier 3 — Architectural alignment with OB 3.0 (medium-term)

Add a **"Share Verifiable Link"** primary action backed by an issuer-hosted verification page (`badges.rollercoaster.dev/v/<id>` or similar). Promote it to the top of the export options; demote Tier 2's PNG/JSON exports to secondary "Download credential file" status. Optional: add **"Show QR"** for in-person scan (encode the verification URL).

This is the path every major OB 3.0 issuer has converged on. It survives every transport, makes the credential portable across wallet ecosystems, and lets us add features (revocation, view counts, expiry) without re-shipping bytes.

**Backend prerequisites:** a stateless verifier endpoint that takes a credential ID, fetches the signed VC, and renders a verification UI. Could be a static page if VCs are fetched client-side; otherwise needs a small server.

**Failure mode it doesn't solve:** offline verification (we lose this; the link must reach a server). Can be paired with QR fallback for in-person.

---

## 6. Constraint check

Before any of this ships:

- **Hard rule (CLAUDE.md):** no workspace dependency on `@rollercoaster-dev/openbadges-types` etc. — these are registry deps. The bake / sign code already lives in `@rollercoaster-dev/openbadges-core` workspace package, which is fine.
- **Hard rule:** DCO sign-off on every commit. Standard husky hook handles it.
- **Hard rule (CLAUDE.md):** ND-accessibility targets WCAG 2.1 AA. Multi-button UX (Tier 2) must respect 44×44pt touch targets and clear `accessibilityRole`/`accessibilityLabel` on each button — especially important since the difference between "Export Verifiable Badge" and "Save as Image" is _what the artefact actually is_, and that information must be screen-reader accessible.
- **Test coverage:** existing `useBadgeExport` tests assume share-sheet routing; Tier 2 changes need new tests for the SAF path on Android (mock `StorageAccessFramework`) and for the disabled-design-branch on `BadgeDetailScreen`.

---

## 7. Sources

OB 3.0:

- [Open Badges 3.0 Specification (1EdTech)](https://www.imsglobal.org/spec/ob/v3p0/)
- [Open Badges 3.0 Implementation Guide](https://www.imsglobal.org/spec/ob/v3p0/impl)
- [OpenID for Verifiable Credential Issuance 1.0](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html)

Wallets / industry:

- [Learner Credential Wallet (OpenWallet Foundation)](https://github.com/openwallet-foundation-labs/learner-credential-wallet)
- [VerifierPlus](https://verifierplus.org/faq)
- [Credly OB 3.0 support](https://credlyissuer.zendesk.com/hc/en-us/articles/30498679997595)
- [Accredible OB 3.0 + W3C VC](https://www.accredible.com/blog/now-supporting-open-badge-3-0-and-w3c-verifiable-credentials)
- [Open Badge Factory OB 3.0 transition](https://openbadgefactory.com/en/your-badges-are-now-open-badges-3-0/)

Platform mechanics:

- [Expo Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/)
- [Expo FileSystem (legacy) — StorageAccessFramework](https://docs.expo.dev/versions/latest/sdk/filesystem-legacy/)
- [Android Storage Access Framework](https://developer.android.com/training/data-storage/shared/documents-files)
- [Messenger metadata preservation matrix (2026)](https://fast.io/resources/whatsapp-telegram-signal-photo-metadata-preservation/)
- [Telegram photo-vs-file behaviour](https://metaclean.app/blog/does-telegram-remove-exif-data)
- [iOS share-sheet transcoding behaviour](https://www.macworld.com/article/2004019/how-to-share-raw-heic-files-from-iphone.html)

UX precedent:

- [Apple PassKit Distributing Passes](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/DistributingPasses.html)
- [CommonHealth / SMART Health Cards](https://www.commonhealth.org/smart-health-cards)

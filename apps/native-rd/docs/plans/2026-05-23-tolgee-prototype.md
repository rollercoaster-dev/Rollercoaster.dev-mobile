# Tolgee Self-Hosted Translation Management Prototype

**Date:** 2026-05-23
**Status:** Implemented (PR [#148](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/pull/148))
**Issue:** [#136](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/136)
**Size estimate:** size:m (4–8h)

---

## Goal

Stand up a self-hosted Tolgee instance on Joe's Mac mini that lets the solo translator (Joe) edit `apps/native-rd` copy in-context against the Expo web build, and round-trip JSON back into `src/i18n/resources/`. Production app keeps shipping bundled JSON with no runtime Tolgee dependency.

This is a **prototype** — the German JSON files end up mostly empty after the demo. Filling them is [#76](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/76)'s job, not this one.

## Decisions

| Question                  | Decision                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosting                   | Docker Compose on Mac mini. Tolgee + Postgres in one compose file.                                                                                                           |
| Auth                      | Tolgee native login. `registrations-allowed: false`. Single seeded admin via `initial-username` / `initial-password`. SSO is paid-only, not needed for solo.                 |
| Access                    | **Tailscale-only.** No Cloudflare, no public DNS. Login page is not internet-reachable.                                                                                      |
| Postgres volume           | `~/tolgee-data/postgres/` on the Mac mini. Documented; no automated backup (out of scope).                                                                                   |
| In-context editing target | `bun run web` (Expo web). SDK gated by `EXPO_PUBLIC_TOLGEE_ENABLED=true`.                                                                                                    |
| Pseudo locale             | Untouched. Still the length/encoding QA tool.                                                                                                                                |
| Test language             | German (`de`). Add `resources/de/` mirroring `en/` shape, seeded empty. Register `de` in `NAMESPACES`/resources/d.ts.                                                        |
| `de` visibility in app    | **Dev-only.** Gate selection in `selectSupportedLanguage` behind `__DEV__` + `EXPO_PUBLIC_I18N_DE=true`. Production users still resolve to `en` regardless of device locale. |
| Production app runtime    | 100% bundled JSON. No Tolgee network calls. No SDK loaded in prod bundle.                                                                                                    |

## Out of scope

- Filling `resources/de/*.json` with real translations (→ [#76](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/76)).
- Native strings (iOS permission dialogs, app display name) — `expo-localization` config plugin work, tracked separately at [#61](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/61).
- Cloudflare Tunnel / public exposure / Cloudflare Access policies.
- Automated Postgres backups (path is documented; manual `pg_dump` only).
- Multi-translator user management.
- Production runtime translation loading or remote-update mechanism.

## Implementation steps

### Step 1 — Tolgee Docker Compose on Mac mini

**Deliverable:** `apps/native-rd/tools/tolgee/docker-compose.yml` + `.env.example`.

- Two services: `tolgee` (image `tolgee/tolgee:latest`, pinned to a digest) and `postgres:16-alpine`.
- Bind-mount `~/tolgee-data/postgres/` for Postgres data.
- Env vars in compose: `TOLGEE_AUTHENTICATION_REGISTRATIONS_ALLOWED=false`, `TOLGEE_AUTHENTICATION_INITIAL_USERNAME`, `TOLGEE_AUTHENTICATION_INITIAL_PASSWORD` (read from `.env`, which is gitignored).
- Bind to `127.0.0.1:8085` on the host. Tailscale handles cross-device access by hitting the Mac mini's tailnet hostname; no `0.0.0.0` bind needed.
- `.env.example` documents required vars; `.env` is gitignored.

### Step 2 — Repo wiring for `de` test language

**Deliverable:** `resources/de/<ns>.json` files + `i18n/index.ts` + `i18n/i18next.d.ts` updates.

1. Create `apps/native-rd/src/i18n/resources/de/` with one `<ns>.json = {}` per existing namespace in `en/` (15 files).
2. Register `de` in `src/i18n/index.ts` (resources bundles for every namespace).
3. Extend `selectSupportedLanguage()` to return `de` when `__DEV__ && process.env.EXPO_PUBLIC_I18N_DE === "true"` AND device locale resolves to `de*`. Otherwise behavior unchanged.
4. Update `src/i18n/__tests__/language.test.ts` to cover the new gate (env-on + de-locale → de; env-off → en; prod → en).
5. Update `src/i18n/__tests__/i18n.test.ts` namespace-registration test if it asserts the locale list.
6. No change to `i18next.d.ts` (CustomTypeOptions is locale-agnostic — types come from the `en/` shape).

### Step 3 — Dev-only Tolgee SDK wiring for Expo web

**Deliverable:** Conditional Tolgee `@tolgee/i18next` integration in `src/i18n/index.ts`.

- Add `@tolgee/i18next` + `@tolgee/web` as dev-only deps (regular `dependencies` is fine; bundler dead-code-strips when `EXPO_PUBLIC_TOLGEE_ENABLED` is unset).
- In `src/i18n/index.ts`, when `__DEV__ && process.env.EXPO_PUBLIC_TOLGEE_ENABLED === "true"`, wrap the i18next init with Tolgee's `i18nextPlugin()` pointing at the local Tolgee URL (`EXPO_PUBLIC_TOLGEE_API_URL`) + project API key (`EXPO_PUBLIC_TOLGEE_API_KEY`).
- Default code path (env unset, or production) is unchanged: pure i18next with bundled resources.
- Smoke test: `bun run web` with the env vars set, edit a key in Tolgee, see it update live without rebuild.

### Step 4 — Tolgee project setup + en import

**Deliverable:** Manual one-time setup, captured in the setup doc as runnable steps.

- Log in to local Tolgee (Tailscale → http://<mac-mini-tailnet-name>:8085).
- Create project "native-rd"; languages `en` (base) + `de`.
- Import all 15 `resources/en/<ns>.json` files. Each namespace JSON becomes a Tolgee namespace.
- Generate a project API key with read+write scopes for the SDK wiring in Step 3 and for CLI export.
- Verify a key edit in the Tolgee UI propagates to Expo web while running with `EXPO_PUBLIC_TOLGEE_ENABLED=true`.

### Step 5 — Export round-trip

**Deliverable:** `apps/native-rd/tools/tolgee/pull.sh` (or `bun` script) + documented in setup doc.

- Use Tolgee CLI (`@tolgee/cli`) configured via `.tolgeerc.json` in `apps/native-rd/`.
- `tolgee pull` writes `de/<ns>.json` files back into `src/i18n/resources/de/`.
- Document the "avoid empty-key churn" pattern: configure the CLI to skip empty values OR run a post-pull pass that prunes empty keys, so a half-edited de namespace doesn't commit 14 empty JSON files.
- Round-trip demo: edit 2–3 keys in `welcome` namespace's `de` translations via Tolgee → run pull → diff shows the new de strings only → `bun run type-check && bun run test` pass.

### Step 6 — Setup guide

**Deliverable:** `apps/native-rd/docs/tolgee.md`.

Sections:

- Why this exists + scope reminder (prod = bundled, Tolgee = dev tool only).
- Mac mini one-time install: clone, populate `.env`, `docker compose up -d`, log in, change admin password.
- Restart / stop / log inspection commands.
- Postgres volume path + manual `pg_dump` example (no automation).
- Tailscale access: hostname format, expected URL.
- Tolgee project conventions: namespace = `<ns>.json` filename; base lang = `en`; test lang = `de`.
- Importing new English keys after `resources/en/<ns>.json` changes (push from CLI, or re-import per ns in UI).
- Exporting de back to repo: `bun run i18n:pull`.
- "Avoid empty-key churn" rationale + pruning command.

Also: one paragraph in `apps/native-rd/docs/i18n.md` cross-linking to `tolgee.md` under "Further reading", labeled as the dev-only TMS prototype.

### Step 7 — Verification

- `bun run type-check` ✅
- `bun run test` ✅ (i18n + language tests still pass; new `de` gate test passes)
- `bun run gen:pseudo` ✅ (still works; pseudo unchanged)
- Manual smoke: production-mode `bun run ios` with no env vars → app still in English, no Tolgee in bundle (`grep -r tolgee dist/`-equivalent check on the prod web bundle if easy).
- Manual smoke: `EXPO_PUBLIC_TOLGEE_ENABLED=true EXPO_PUBLIC_I18N_DE=true bun run web` → app pulls live keys from local Tolgee, de toggle works when device locale is German.

## Atomic commits

1. `feat(native-rd): seed empty resources/de/ + register in i18n` — namespace JSONs + i18n/index.ts + i18next.d.ts + tests
2. `feat(native-rd): gate de behind __DEV__ + EXPO_PUBLIC_I18N_DE in selectSupportedLanguage` — language.ts + tests
3. `feat(native-rd): wire dev-only Tolgee SDK for Expo web` — i18n/index.ts conditional wrap + deps
4. `chore(native-rd): add tolgee docker-compose + env example` — `tools/tolgee/`
5. `chore(native-rd): add tolgee pull script + .tolgeerc.json` — round-trip tooling
6. `docs(native-rd): add tolgee self-hosting setup guide` — `docs/tolgee.md` + i18n.md cross-link

Order matters: commits 1–3 are repo-only and can land independent of the Mac mini being up. Commits 4–6 are the Mac-mini-side prototype.

## Risks / open questions

- **Tolgee CLI export behavior on empty values** — unverified whether `tolgee pull` writes `""` or skips the key. Confirm in Step 5; if it writes empties, add a prune pass.
- **`@tolgee/i18next` peer dep compatibility** — verify against this repo's pinned `i18next` + `react-i18next` versions during Step 3. Bumping i18next is out of scope; if peer ranges conflict, drop the SDK and fall back to "edit in Tolgee, manually pull" without live in-context.
- **Tailscale hostname stability** — if the Mac mini's tailnet name changes, the `EXPO_PUBLIC_TOLGEE_API_URL` in dev shell envs breaks. Doc'd in setup guide; not solved.
- **Mac mini sleep behavior** — Docker stops when Mac sleeps. Caveat in setup doc; "wake mini before editing copy."

## Acceptance criteria mapping

Issue #136 acceptance items:

- [x] Setup guide exists → Step 6
- [x] Documented start/restart command + persistent volume → Step 1 + Step 6
- [x] Access path documented (Tailscale chosen) → Step 6
- [x] English namespace import works → Step 4
- [x] Non-English test language editable + exportable → Steps 2 + 4 + 5 (de)
- [x] Dev-only in-context editing path → Step 3 (Expo web)
- [x] Production startup unchanged, no Tolgee/network dependency → Step 3 (gated SDK) + Step 7 (verify)
- [x] Type-check and i18n tests still pass → Step 7

## Follow-ups (not in this PR)

- Fill `resources/de/` with real translations → [#76](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/76).
- Native strings localization (`expo-localization` config plugin) → [#61](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/61).
- Automated Postgres backup of Tolgee data → file follow-up issue if/when the prototype becomes load-bearing.
- Cloudflare Tunnel + Cloudflare Access path → file follow-up issue only if off-tailnet access is ever needed.

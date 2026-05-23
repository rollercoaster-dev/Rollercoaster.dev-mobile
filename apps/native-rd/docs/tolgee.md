# Self-hosted Tolgee for native-rd

A dev-only [Tolgee](https://tolgee.io/) instance for editing app copy in-context. The production app continues to ship bundled JSON from `src/i18n/resources/` and makes no Tolgee calls — this is a workflow tool, not a runtime dependency.

Tracked by [#136](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/136). Architecture sits next to [`i18n.md`](./i18n.md), which is the source of truth for how the app uses i18next at runtime.

---

## What this is and isn't

**Is:**

- A single-user Tolgee container stack running on Joe's Mac mini.
- Reachable from the tailnet for in-context editing against `bun run web`.
- The editing surface that backfills `src/i18n/resources/de/<ns>.json` for the German first-test work in [#76](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/76).

**Isn't:**

- A production translation backend. The app never fetches from Tolgee at runtime.
- A multi-translator service with an invite flow.
- Internet-reachable. No public DNS, no Cloudflare Tunnel, no Cloudflare Access.

---

## One-time install (Mac mini)

Prereqs: Docker Desktop running, Tailscale logged in.

```sh
cd apps/native-rd/tools/tolgee
cp .env.example .env
# Edit .env — pick a strong POSTGRES_PASSWORD and TOLGEE_ADMIN_PASSWORD.
mkdir -p ~/tolgee-data/postgres
docker compose up -d
```

Tolgee will be reachable on `http://<mac-mini-tailnet-name>:8085`. The first boot seeds the admin user from `TOLGEE_ADMIN_USERNAME` + `TOLGEE_ADMIN_PASSWORD`.

Sign in, then in **Account settings → Password** change the admin password to something different from `.env` (Tolgee ignores the env var after the user exists, but rotating it once means the .env value is no longer a live credential).

After the first successful start, pin the image digest in `docker-compose.yml`:

```sh
docker image inspect tolgee/tolgee:latest --format='{{index .RepoDigests 0}}'
# Replace `tolgee/tolgee:latest` in docker-compose.yml with the printed sha256.
```

---

## Routine operation

| Action               | Command                                                                               |
| -------------------- | ------------------------------------------------------------------------------------- |
| Start                | `docker compose up -d` (from `apps/native-rd/tools/tolgee/`)                          |
| Stop                 | `docker compose down`                                                                 |
| Logs                 | `docker compose logs -f tolgee`                                                       |
| Restart after reboot | Docker Desktop auto-starts; containers come back via `restart: unless-stopped`        |
| Update Tolgee        | `docker compose pull tolgee && docker compose up -d` (then re-pin digest as above)    |
| Reach from laptop    | Open `http://<mac-mini-tailnet-name>:8085` while both devices are on the same tailnet |

**Mac mini sleep caveat.** When the mini sleeps, Docker pauses. Wake it (e.g. open a Tailscale-routed Finder tab) before opening Tolgee from another device.

---

## Backup

The Postgres data lives at `~/tolgee-data/postgres/` on the Mac mini (configurable via `POSTGRES_DATA_DIR` in `.env`). No automated backup is configured for the prototype.

To take a manual dump:

```sh
cd apps/native-rd/tools/tolgee
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$HOME/tolgee-data/dump-$(date +%Y%m%d).sql"
```

If this prototype graduates into something Joe relies on, file a follow-up issue to wire a launchd-driven nightly dump.

---

## Tolgee project conventions

Create one project per app (`native-rd`). Inside it:

- **Base language:** `en`. Mirrors `src/i18n/resources/en/`.
- **Test language:** `de`. Mirrors `src/i18n/resources/de/`. Empty in this prototype; populated incrementally and round-tripped into the repo.
- **Namespaces:** one per `<ns>.json` filename — `common`, `welcome`, `newGoal`, `settings`, `goals`, `focusMode`, `capturePhoto`, `captureVideo`, `captureVoice`, `captureText`, `captureFile`, `captureLink`, `permissions`, `badges`, `badgeDesigner`.
- **Format:** `JSON_I18NEXT` (set in `apps/native-rd/.tolgeerc.json`).

Generate a project API key under **Project settings → API keys** with `keys.view`, `keys.edit`, `translations.view`, `translations.edit`, and `translations.export` scopes. You'll feed it to both the CLI and the dev SDK.

---

## Initial import of English keys

From `apps/native-rd/`:

```sh
export TOLGEE_API_URL=http://<mac-mini-tailnet-name>:8085
export TOLGEE_API_KEY=<your-project-api-key>
bunx tolgee push
```

The push uses the `push.files` map declared in `.tolgeerc.json`, which assigns each `resources/en/<ns>.json` to its matching Tolgee namespace.

Re-running `tolgee push` is the way to add newly authored English keys (after a feature PR edits any `resources/en/<ns>.json`). The CLI's default is `OVERRIDE`-style upsert — read [Tolgee's push docs](https://docs.tolgee.io/tolgee-cli/usage/push) before pushing if you've also edited en in Tolgee directly, to avoid clobbering UI edits.

---

## In-context editing against Expo web

Three env vars enable the live editing loop. Add to `apps/native-rd/.env.local` (gitignored):

```sh
EXPO_PUBLIC_TOLGEE_ENABLED=true
EXPO_PUBLIC_TOLGEE_API_URL=http://<mac-mini-tailnet-name>:8085
EXPO_PUBLIC_TOLGEE_API_KEY=<your-project-api-key>
# Optional — switches the running app to the de locale instead of en:
EXPO_PUBLIC_I18N_DE=true
```

Then:

```sh
bun run web
```

Tolgee's DevTools overlay appears in the running Expo web build; alt-clicking any translated string opens the in-context editor. Edits persist to the Tolgee server immediately. Reload the page to see them re-rendered.

**Why Expo web and not iOS/Android?** `@tolgee/web` is browser-targeted (touches `window`, `document`, `fetch`). The SDK is loaded behind a lazy `require()` inside `__DEV__`-gated code so it never module-loads on native — see `src/i18n/index.ts` and `src/i18n/tolgee.ts`. Same env vars on iOS/Android are a no-op.

**Why a dev-only env var instead of always-on?** Production `__DEV__` is `false` and the env var is `undefined`, so the Tolgee branch dead-code-strips. Production bundles don't carry `@tolgee/*` code, don't reach the server, and resolve every key from the bundled `resources/`.

---

## Exporting de back to the repo

From `apps/native-rd/`:

```sh
export TOLGEE_API_URL=http://<mac-mini-tailnet-name>:8085
export TOLGEE_API_KEY=<your-project-api-key>
bun run i18n:pull
```

The `i18n:pull` script does two things in sequence:

1. `tolgee pull` exports the `de` translations into `src/i18n/resources/de/<ns>.json` using the path template from `.tolgeerc.json`.
2. `scripts/tolgee-prune-empty.ts` recursively removes `""` leaves and the empty branches they create.

Step 2 is load-bearing. Without it, Tolgee writes `""` for every key the translator hasn't filled, and i18next resolves `""` as a literal empty string instead of falling back to `en`. The result would be a UI with blank labels for half-translated screens. Tests in `src/i18n/__tests__/pruneEmpty.test.ts` cover the recursion edge cases.

Commit the resulting diff like any other code change.

---

## Pseudo locale still works

`bun run gen:pseudo` is unchanged. The pseudo locale is a length/encoding QA tool generated from `resources/en/` and lives in `resources/pseudo/`. Tolgee doesn't touch it. The two workflows coexist:

| Goal                              | Tool                                  |
| --------------------------------- | ------------------------------------- |
| Catch un-`t()`'d strings + layout | Pseudo (`EXPO_PUBLIC_I18N_PSEUDO`)    |
| Edit real German copy             | Tolgee (`EXPO_PUBLIC_TOLGEE_ENABLED`) |

Pseudo takes precedence in `selectSupportedLanguage` if both env vars are on.

---

## Troubleshooting

- **`docker compose up` fails on the volume mount** — the `POSTGRES_DATA_DIR` path must exist. Run `mkdir -p ~/tolgee-data/postgres` and retry.
- **Can't reach `<mac-mini>:8085` from laptop** — confirm both devices are on the same tailnet (`tailscale status`), and confirm the container is bound to `127.0.0.1:8085` plus reachable on the host's tailnet IP. The host's firewall must allow Tailscale traffic.
- **Tolgee complains about i18next version on web** — `@tolgee/i18next@7` declares `peerDependencies.i18next: "*"`. If a future i18next major actually breaks the wrap, the fallback is to drop the SDK and rely on `bun run i18n:pull` for the round-trip (you lose live in-context but keep the editor).
- **`bun run i18n:pull` errors with "no project found"** — `TOLGEE_API_URL` / `TOLGEE_API_KEY` must be set in the shell that runs the command. The CLI does not read `apps/native-rd/.env.local`.
- **Empty `de/*.json` after pull** — expected at this stage. The German bundles ship empty in this prototype; #76 is where they get filled.

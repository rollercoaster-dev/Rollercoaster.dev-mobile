/**
 * Shared PDS session setup for the spike scripts.
 *
 * Auth is an **app password**, not OAuth. ADR-0015 milestone 4 describes an OAuth flow
 * for the shipped app, and that is correct for an end-user app — but implementing the
 * React Native OAuth client is real app work and explicitly out of scope here. App
 * passwords are the standard atproto pattern for scripts, and they are sufficient to
 * answer every question this spike asks.
 */

import { AtpAgent } from "@atproto/api";

export const COLLECTION = "dev.rollercoaster.badge.credential";

export interface SpikeEnv {
  pdsUrl: string;
  handle: string;
  appPassword: string;
}

/**
 * Read and validate the spike's credentials.
 *
 * Fails loudly with a pointer to `.env.example` rather than letting a script get as far
 * as a confusing 401 from the PDS.
 */
export function readEnv(): SpikeEnv {
  const pdsUrl = process.env.PDS_URL ?? "https://bsky.social";
  const handle = process.env.ATP_HANDLE;
  const appPassword = process.env.ATP_APP_PASSWORD;

  if (!handle || !appPassword) {
    throw new Error(
      "Missing ATP_HANDLE or ATP_APP_PASSWORD. Copy .env.example to .env and fill it in " +
        "(see README, 'Running it'). Bun loads .env automatically.",
    );
  }

  return { pdsUrl, handle, appPassword };
}

/** Log in to the PDS and return an authenticated agent plus the resolved DID. */
export async function login(
  env: SpikeEnv,
): Promise<{ agent: AtpAgent; did: string }> {
  const agent = new AtpAgent({ service: env.pdsUrl });
  await agent.login({ identifier: env.handle, password: env.appPassword });

  const did = agent.session?.did;
  if (!did)
    throw new Error("Logged in but no DID on the session — unexpected.");

  return { agent, did };
}

/** Write a JSON evidence capture next to the other evidence files. */
export async function writeEvidence(
  name: string,
  data: unknown,
): Promise<string> {
  const path = new URL(`../evidence/${name}`, import.meta.url).pathname;
  await Bun.write(path, JSON.stringify(data, null, 2) + "\n");
  return path;
}

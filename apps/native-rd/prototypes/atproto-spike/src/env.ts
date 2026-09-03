/**
 * Reads the PDS credentials from process.env. Bun loads `.env` from the
 * current directory automatically, so `cp .env.example .env` is all a
 * reader needs (see README → Reproduce).
 */
export interface PdsEnv {
  url: string;
  handle: string;
  appPassword: string;
}

export function readPdsEnv(): PdsEnv {
  const url = process.env.PDS_URL ?? "https://bsky.social";
  const handle = process.env.PDS_HANDLE;
  const appPassword = process.env.PDS_APP_PASSWORD;
  if (!handle || !appPassword) {
    throw new Error(
      "PDS_HANDLE and PDS_APP_PASSWORD are required. Copy .env.example to .env " +
        "and fill it with a DEDICATED TEST ACCOUNT's handle + app password.",
    );
  }
  return { url, handle, appPassword };
}

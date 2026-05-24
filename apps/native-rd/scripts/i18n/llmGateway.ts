/**
 * Thin wrapper around the Vercel AI SDK + OpenRouter for the i18n sync.
 *
 * One function: `callModel(name, systemPrompt, userContent)`. The registry
 * (`models.ts`) owns the model catalogue; this file owns the network call.
 *
 * Per ADR-0007:
 *   - No OpenRouter attribution headers (no HTTP-Referer / X-Title) —
 *     deliberate omission so the project does not appear on the public
 *     leaderboard. Don't "fix" this as a best-practices cleanup.
 *   - Upstream errors surface verbatim. Retry / circuit-breaker logic
 *     lives in the translator (PR #5), not here.
 */

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

import { getModel } from "./models";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const openrouter = createOpenAI({
  baseURL: OPENROUTER_BASE_URL,
  apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * Call an OpenRouter model via the Vercel AI SDK and return the raw text
 * response. The 3-arg (name, system, user) shape is locked from the start —
 * the translator (PR #5) needs the system + user split.
 *
 * Throws synchronously if `OPENROUTER_API_KEY` is unset, before any network
 * call. Throws if `name` is not in the registry. Upstream API errors are
 * not caught — they propagate verbatim.
 */
export async function callModel(
  name: string,
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const entry = getModel(name);

  const result = await generateText({
    model: openrouter(entry.modelId),
    system: systemPrompt,
    prompt: userContent,
    temperature: entry.temperature,
    maxOutputTokens: entry.maxTokens,
  });

  return result.text;
}

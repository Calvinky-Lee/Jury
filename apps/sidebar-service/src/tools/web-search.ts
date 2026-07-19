import {
  WebSearchOutputSchema,
  type WebSearchOutput,
} from "@sidebar/contract";
import { env } from "../config/env.js";

const GROUNDED_CALL_TIMEOUT_MS = 15_000;

/**
 * Gemini's built-in Google Search grounding tool — pass this in a member call's
 * `config.tools` (spec 06 §1). Zero extra API key, zero scraping code.
 */
export const GOOGLE_SEARCH_GROUNDING_TOOL = { googleSearch: {} } as const;

/**
 * Shape of the subset of Gemini's response we read. Grounding is not step-streamed —
 * the chip appears once the grounded response lands (spec 06 §1).
 */
interface GroundingMetadataLike {
  webSearchQueries?: string[];
  groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
}

/** Translates `groundingMetadata` into the contract's typed web-search result (spec 06 §1). */
export function extractGroundingResult(
  groundingMetadata: GroundingMetadataLike | undefined,
): { queries: string[]; result: WebSearchOutput } {
  if (!groundingMetadata || !groundingMetadata.webSearchQueries?.length) {
    return {
      queries: [],
      result: WebSearchOutputSchema.parse({ error: "no grounding metadata returned" }),
    };
  }
  const sources = (groundingMetadata.groundingChunks ?? [])
    .map((chunk) => chunk.web)
    .filter((web): web is { title?: string; uri?: string } => Boolean(web?.title))
    .map((web) => ({ title: web.title as string, uri: web.uri }));

  return {
    queries: groundingMetadata.webSearchQueries,
    result: WebSearchOutputSchema.parse({ sources }),
  };
}

/** ≤140-char summary for the `tool_result` chip (top source titles). */
export function summarizeWebSearchResult(result: WebSearchOutput): string {
  if ("error" in result) return `search failed: ${result.error}`.slice(0, 140);
  const titles = result.sources.slice(0, 3).map((s) => s.title);
  const summary = titles.length > 0 ? titles.join(" · ") : "no sources returned";
  return summary.slice(0, 140);
}

/**
 * Fallback declared function tool if Google Search grounding is unavailable on the
 * team's AI Studio tier (spec 06 §1). Only used when TAVILY_API_KEY is set.
 */
export async function tavilySearch(query: string): Promise<WebSearchOutput> {
  if (!env.tavilyApiKey) {
    return WebSearchOutputSchema.parse({ error: "TAVILY_API_KEY not configured" });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROUNDED_CALL_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: env.tavilyApiKey, query, max_results: 5 }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return WebSearchOutputSchema.parse({ error: `tavily http ${res.status}` });
    }
    const data = (await res.json()) as { results?: Array<{ title: string; url: string }> };
    const sources = (data.results ?? []).map((r) => ({ title: r.title, uri: r.url }));
    return WebSearchOutputSchema.parse({ sources });
  } catch (err) {
    const message = err instanceof Error ? err.message : "tavily search failed";
    return WebSearchOutputSchema.parse({ error: message });
  } finally {
    clearTimeout(timeout);
  }
}

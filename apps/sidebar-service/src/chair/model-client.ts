import type { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { VERDICT_MODEL } from './model-config.js';

export interface GenerateStructuredOptions<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
}

export interface ModelClient {
  generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T>;
}

/**
 * Offline stand-in for a real model call. Takes a canned response (or a function
 * of the prompt, for tests that need to vary output) and validates it against the
 * caller's schema itself — catches fixture-authoring bugs before they masquerade
 * as "the harness works."
 */
export class FakeModelClient implements ModelClient {
  constructor(
    // Receives the full options (including `schema`) so tests exercising
    // multiple prompt shapes through one fake client can route by schema
    // identity (schemas are module-level singletons, so `===` works) or by
    // inspecting the prompt text. May return a Promise — tests use this to
    // simulate a slow member for orchestrator timeout/recusal scenarios.
    private readonly respond: (
      input: GenerateStructuredOptions<unknown>,
    ) => unknown | Promise<unknown>,
  ) {}

  async generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
    const raw = await this.respond(opts as GenerateStructuredOptions<unknown>);
    return opts.schema.parse(raw);
  }
}

export function fakeClientWithResponse(response: unknown): FakeModelClient {
  return new FakeModelClient(() => response);
}

/**
 * Finds the first balanced top-level `{...}` object in `text` and returns just
 * that substring, ignoring braces inside string literals.
 *
 * Verified live against gemini-3.5-flash, gemini-3.1-pro-preview, and
 * gemini-pro-latest: despite `responseMimeType: 'application/json'` (which is
 * supposed to guarantee fence-free, single-object output), all three
 * intermittently wrap the JSON in a ```fence```, append a stray extra `}`, or
 * — worst case — leak chain-of-thought narration ("Wait, that's not right,
 * let me redo this...") followed by a second/third corrected JSON object. In
 * every observed case the FIRST balanced object was the intended answer, so
 * brace-matching to the first close is more robust than a naive full-string
 * `JSON.parse`.
 */
function extractFirstJsonObject(text: string): string {
  const start = text.indexOf('{');
  if (start === -1) {
    throw new Error('no JSON object found in response');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  throw new Error('unterminated JSON object in response (likely truncated generation)');
}

const MAX_ATTEMPTS = 3;

/**
 * Real Gemini-backed client. Throws at construction time if no API key is present
 * so callers fail fast instead of hanging on a network call — swap this in for
 * FakeModelClient the moment GEMINI_API_KEY is available; no other code changes.
 */
export class GeminiModelClient implements ModelClient {
  private readonly ai: GoogleGenAI;

  constructor(
    apiKey: string | undefined = process.env.GEMINI_API_KEY,
    private readonly model: string = VERDICT_MODEL,
  ) {
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY not set — GeminiModelClient cannot be constructed. Use FakeModelClient for offline dev.',
      );
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateStructured<T>({ system, user, schema }: GenerateStructuredOptions<T>): Promise<T> {
    let lastError: unknown;

    // Retries a genuinely truncated/malformed response — observed to be
    // non-deterministic (the same prompt can succeed on a later attempt).
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const res = await this.ai.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts: [{ text: user }] }],
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
        },
      });

      const text = res.text;
      if (!text) {
        lastError = new Error('Gemini response had no text content');
        continue;
      }

      try {
        const raw = JSON.parse(extractFirstJsonObject(text));
        return schema.parse(raw);
      } catch (err) {
        lastError = new Error(
          `Gemini response was not valid JSON (attempt ${attempt}/${MAX_ATTEMPTS}): ${text}`,
          { cause: err },
        );
      }
    }

    throw lastError;
  }
}

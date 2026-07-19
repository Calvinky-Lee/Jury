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
      throw new Error('Gemini response had no text content');
    }

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error(`Gemini response was not valid JSON: ${text}`);
    }
    return schema.parse(raw);
  }
}

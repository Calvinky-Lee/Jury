import type { Collection } from "mongodb";
import type { SessionStatus, Stance, Verdict } from "@council/contract";
import { getDb } from "./client.js";

// ---- Document shapes (spec 03) ----

export interface PersonaDoc {
  _id?: unknown;
  name: string;
  archetype: string;
  avatar: { hue: string; form: string };
  profile: { voice: string; domains: string[] };
  stanceProfile: {
    coreValues: string[];
    biases: string[];
    decisionStyle: string;
  };
  stanceProfileText: string;
  embedding: number[];
}

export interface SessionDoc {
  _id: string; // uuid
  dilemma: string;
  context?: string;
  councilSize: number;
  status: SessionStatus;
  createdAt: Date;
}

export interface CastingDoc {
  sessionId: string;
  personaId: string;
  seat: number;
  hue: string; // denormalized from the persona's avatar — powers the memory-orb swirl (spec 07)
  situationBrief: string;
  mmrScore: number;
  diversityScore?: number;
  vectorPoint?: { x: number; y: number };
}

export interface StatementDoc {
  sessionId: string;
  personaId: string;
  phase: "opening" | "rebuttal" | "closing";
  stance?: Stance;
  text: string;
  toolCalls: unknown[];
}

export interface VerdictDoc {
  sessionId: string;
  verdict: Verdict;
  briefMd: string;
}

export interface EventDoc {
  sessionId: string;
  seq: number;
  type: string;
  payload: unknown;
  ts: Date;
}

export async function personas(): Promise<Collection<PersonaDoc>> {
  return (await getDb()).collection<PersonaDoc>("personas");
}
export async function sessions(): Promise<Collection<SessionDoc>> {
  return (await getDb()).collection<SessionDoc>("sessions");
}
export async function castings(): Promise<Collection<CastingDoc>> {
  return (await getDb()).collection<CastingDoc>("castings");
}
export async function statements(): Promise<Collection<StatementDoc>> {
  return (await getDb()).collection<StatementDoc>("statements");
}
export async function verdicts(): Promise<Collection<VerdictDoc>> {
  return (await getDb()).collection<VerdictDoc>("verdicts");
}
export async function events(): Promise<Collection<EventDoc>> {
  return (await getDb()).collection<EventDoc>("events");
}

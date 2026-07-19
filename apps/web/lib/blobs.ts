import { PALETTE, BLOB_FORMS, type BlobHue, type BlobForm } from "@sidebar/contract";

export { PALETTE as HUES, BLOB_FORMS };
export type { BlobHue, BlobForm };

/** Seat-assignment order for sidebarSize <= 12 (spec 07 — hue is identity color everywhere). */
export const HUE_ORDER: BlobHue[] = [
  "sky",
  "ember",
  "jade",
  "magenta",
  "amber",
  "teal",
  "crimson",
  "violet",
  "moss",
  "indigo",
  "plum",
  "slate",
];

export type BlobState = "idle" | "talking" | "dissent";

/** Deterministic hue assignment by seat, wrapping past 12 members if ever needed. */
export function hueForSeat(seat: number): BlobHue {
  return HUE_ORDER[seat % HUE_ORDER.length];
}

/** Body outline path per form, in a 0..64 viewBox, mouth/eyes positioned by the caller. */
export const BLOB_BODY_PATH: Record<BlobForm, string> = {
  round: "M32 6C46 6 56 17 56 32C56 47 46 58 32 58C18 58 8 47 8 32C8 17 18 6 32 6Z",
  tall: "M32 4C42 4 50 14 50 30C50 48 44 60 32 60C20 60 14 48 14 30C14 14 22 4 32 4Z",
  squat: "M32 14C46 14 58 22 58 36C58 50 46 56 32 56C18 56 6 50 6 36C6 22 18 14 32 14Z",
  spiky: "M32 4L38 16L52 12L46 24L60 28L46 34L54 48L40 42L34 58L28 42L14 48L22 34L8 28L22 24L16 12L30 16Z",
};

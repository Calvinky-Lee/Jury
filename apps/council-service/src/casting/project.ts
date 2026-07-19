/**
 * 2D projection for the sidebar vector graph (spec 05 §project.ts).
 *
 * PCA is fitted per session over the FULL retrieval pool — the pool defines
 * the local axes of variation for this dilemma — then the cast embeddings are
 * projected onto the top two components and normalized to [-1, 1]².
 *
 * Plain TS power iteration (with one deflation for PC2). Deterministic: fixed
 * initialization, fixed iteration count, no randomness — unit-testable with
 * synthetic embeddings.
 */
const ITERATIONS = 200

const dot = (a: number[], b: number[]) =>
  a.reduce((sum, x, i) => sum + x * (b[i] ?? 0), 0)

const norm = (a: number[]) => Math.hypot(...a)

const scale = (a: number[], k: number) => a.map((x) => x * k)

const subProjection = (v: number[], unit: number[]) => {
  const k = dot(v, unit)
  return v.map((x, i) => x - k * (unit[i] ?? 0))
}

export function projectTo2d(
  pool: number[][],
  cast: number[][],
): { x: number; y: number }[] {
  if (pool.length === 0 || cast.length === 0) return cast.map(() => ({ x: 0, y: 0 }))
  const dims = pool[0]!.length

  const mean = new Array<number>(dims).fill(0)
  for (const row of pool) for (let i = 0; i < dims; i++) mean[i]! += row[i]! / pool.length
  const centered = pool.map((row) => row.map((x, i) => x - mean[i]!))

  // v ← Xᵀ(Xv), i.e. one covariance-times-vector step without materializing
  // the dims×dims covariance matrix.
  const covTimes = (v: number[]): number[] => {
    const rowDots = centered.map((row) => dot(row, v))
    const out = new Array<number>(dims).fill(0)
    for (let r = 0; r < centered.length; r++) {
      const row = centered[r]!
      const k = rowDots[r]!
      for (let i = 0; i < dims; i++) out[i]! += row[i]! * k
    }
    return out
  }

  const powerIterate = (deflateAgainst?: number[]): number[] => {
    // Deterministic init: uniform vector, deflated if needed.
    let v: number[] = new Array<number>(dims).fill(1 / Math.sqrt(dims))
    if (deflateAgainst) v = subProjection(v, deflateAgainst)
    if (norm(v) < 1e-12) {
      v = new Array<number>(dims).fill(0)
      v[0] = 1
      if (deflateAgainst) v = subProjection(v, deflateAgainst)
    }
    v = scale(v, 1 / (norm(v) || 1))
    for (let it = 0; it < ITERATIONS; it++) {
      let w = covTimes(v)
      if (deflateAgainst) w = subProjection(w, deflateAgainst)
      const n = norm(w)
      if (n < 1e-12) return v // no variance left along any remaining axis
      v = scale(w, 1 / n)
    }
    return v
  }

  const pc1 = powerIterate()
  const pc2 = powerIterate(pc1)

  const raw = cast.map((emb) => {
    const centeredEmb = emb.map((x, i) => x - mean[i]!)
    return { x: dot(centeredEmb, pc1), y: dot(centeredEmb, pc2) }
  })

  const maxX = Math.max(...raw.map((p) => Math.abs(p.x)))
  const maxY = Math.max(...raw.map((p) => Math.abs(p.y)))
  return raw.map((p) => ({
    x: maxX > 1e-12 ? p.x / maxX : 0,
    y: maxY > 1e-12 ? p.y / maxY : 0,
  }))
}

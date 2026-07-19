/**
 * Embedding provider (spec 05): Voyage `voyage-3`, 1024 dims, cosine-ready.
 * Swappable behind this one function — swapping models requires re-seeding
 * the library and a rationale line in spec 05.
 */
export const EMBEDDING_MODEL = 'voyage-3'
export const EMBEDDING_DIMS = 1024

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings'
const BATCH_LIMIT = 100

export async function embed(
  texts: string[],
  kind: 'document' | 'query',
): Promise<number[][]> {
  const key = process.env.VOYAGE_API_KEY
  if (!key) throw new Error('VOYAGE_API_KEY is not set')

  const all: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH_LIMIT) {
    const batch = texts.slice(i, i + BATCH_LIMIT)
    const res = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch, input_type: kind }),
    })
    if (!res.ok) {
      throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`)
    }
    const json = (await res.json()) as { data: { index: number; embedding: number[] }[] }
    const sorted = [...json.data].sort((a, b) => a.index - b.index)
    for (const item of sorted) {
      if (item.embedding.length !== EMBEDDING_DIMS) {
        throw new Error(
          `Voyage returned ${item.embedding.length} dims, expected ${EMBEDDING_DIMS}`,
        )
      }
      all.push(item.embedding)
    }
  }
  return all
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embed([text], 'query')
  if (!vector) throw new Error('Voyage returned no embedding for query')
  return vector
}

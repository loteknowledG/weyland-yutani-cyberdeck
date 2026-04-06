import { db } from './db';

const tokenize = (value) => String(value || '')
  .toLowerCase()
  .match(/[a-z0-9_./:-]+/g) || [];

const buildTf = (tokens) => {
  const map = new Map();
  for (const token of tokens) {
    map.set(token, (map.get(token) || 0) + 1);
  }
  return map;
};

const cosineSimilarity = (left, right) => {
  let dot = 0;
  let leftMag = 0;
  let rightMag = 0;

  for (const value of left.values()) leftMag += value * value;
  for (const value of right.values()) rightMag += value * value;

  if (!leftMag || !rightMag) return 0;

  for (const [token, leftValue] of left.entries()) {
    const rightValue = right.get(token);
    if (rightValue) dot += leftValue * rightValue;
  }

  return dot / (Math.sqrt(leftMag) * Math.sqrt(rightMag));
};

const recordText = (rec) => {
  const tagText = Array.isArray(rec?.tags) ? rec.tags.join(' ') : '';
  const metaText = rec?.metadata && typeof rec.metadata === 'object' ? Object.keys(rec.metadata).join(' ') : '';
  return [rec?.type || '', rec?.text || '', tagText, metaText].filter(Boolean).join(' ');
};

// THE HYBRID RANKER (Ported from Samus-Manus Python)
export const Memory = {
  // 1. ADD: Equivalent to m.add()
  async add(type, text, metadata = {}) {
    const entry = {
      type,
      text,
      metadata,
      tags: Object.keys(metadata), // Automatic indexing for tags
      created_at: Date.now()
    };
    
    return await db.memories.add(entry);
  },

  // 2. QUERY: Equivalent to m.query_similar()
  // Top-K semantic-ish retrieval using cosine similarity over term frequency.
  async query(searchTerm, topK = 5) {
    const allRecords = await db.memories.toArray();
    const now = Date.now();
    const queryTokens = tokenize(searchTerm);
    const queryTf = buildTf(queryTokens);

    const results = allRecords.map((rec) => {
      const candidateText = recordText(rec);
      const candidateTokens = tokenize(candidateText);
      const candidateTf = buildTf(candidateTokens);

      // COSINE SIMILARITY (TF over text, tags, and metadata keys)
      const cosine = queryTokens.length ? cosineSimilarity(queryTf, candidateTf) : 0;

      // LEXICAL BOOST (Exact phrase hit)
      const lexical = String(rec?.text || '').toLowerCase().includes(String(searchTerm || '').toLowerCase()) ? 0.35 : 0;

      // RECENCY SCORE (Half-life decay logic from your Python script)
      const ageSeconds = Math.max(0, (now - Number(rec.created_at || 0)) / 1000);
      const halfLife = 30 * 24 * 3600;
      const recency = Math.exp(-Math.log(2) * (ageSeconds / halfLife));

      // Combined Score
      const score = (cosine * 0.7) + lexical + (recency * 0.05);

      return { ...rec, score, cosine, recency };
    });

    return results
      .filter((rec) => queryTokens.length ? rec.score > 0 : true)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  },

  // 0. MIGRATION: One-time bridge from legacy SQLite export into Dexie
  async importLegacyData(jsonData, { overwrite = false } = {}) {
    if (!Array.isArray(jsonData)) {
      throw new Error('Legacy memory import expects an array of records.');
    }

    const normalized = jsonData.map((item) => {
      const metadata =
        item && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
          ? item.metadata
          : {};
      const createdAtRaw =
        typeof item?.created_at_raw === 'number'
          ? item.created_at_raw
          : typeof item?.created_at === 'number'
            ? item.created_at > 1e11
              ? item.created_at / 1000
              : item.created_at
            : Date.now() / 1000;

      return {
        type: item?.type || 'memory',
        text: item?.text || '',
        metadata,
        tags: Array.isArray(item?.tags) && item.tags.length ? item.tags : Object.keys(metadata),
        embedding: Array.isArray(item?.embedding) ? item.embedding : null,
        created_at: typeof item?.created_at === 'number' ? item.created_at : Date.now(),
        created_at_raw: createdAtRaw,
        source_id:
          typeof item?.source_id === 'number'
            ? item.source_id
            : typeof item?.id === 'number'
              ? item.id
              : null,
        legacy_id: typeof item?.id === 'number' ? item.id : null,
      };
    });

    const payload = normalized.map((item) => {
      const copy = { ...item };
      delete copy.id;
      return copy;
    });

    if (overwrite) {
      await db.memories.clear();
      await db.memories.bulkAdd(payload);
      return payload.length;
    }

    await db.memories.bulkPut(payload);
    return payload.length;
  },

  // 1B. PURGE: Remove imported legacy SQLite rows without touching future browser memory
  async purgeLegacyData() {
    const legacyRows = await db.memories.toCollection().filter((item) => item?.legacy_id != null).toArray();
    if (!legacyRows.length) return 0;
    await db.memories.bulkDelete(legacyRows.map((item) => item.id));
    return legacyRows.length;
  }
};

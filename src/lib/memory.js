import { db } from './db';

const tokenize = (value) =>
  String(value || '')
    .toLowerCase()
    .match(/[a-z0-9_./:-]+/g) || [];

const buildSparseEmbedding = (value) => {
  const vector = {};
  for (const token of tokenize(value)) {
    vector[token] = (vector[token] || 0) + 1;
  }
  return Object.keys(vector).length ? vector : null;
};

const buildDenseEmbedding = (value) => {
  if (!Array.isArray(value)) return null;
  const dense = value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
  return dense.length ? dense : null;
};

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeEmbedding = (embedding, fallbackText = '') => {
  if (Array.isArray(embedding)) {
    const dense = buildDenseEmbedding(embedding);
    if (dense) return dense;
  }

  if (isPlainObject(embedding)) {
    const sparse = {};
    for (const [key, rawValue] of Object.entries(embedding)) {
      const value = Number(rawValue);
      if (Number.isFinite(value) && value !== 0) {
        sparse[key] = value;
      }
    }
    if (Object.keys(sparse).length) return sparse;
  }

  if (typeof embedding === 'string') {
    return buildSparseEmbedding(embedding);
  }

  return buildSparseEmbedding(fallbackText);
};

const mergeTags = (...groups) => {
  const tags = new Set();
  for (const group of groups.flat()) {
    if (Array.isArray(group)) {
      for (const tag of group) {
        if (typeof tag === 'string' && tag.trim()) tags.add(tag.trim());
      }
      continue;
    }
    if (typeof group === 'string' && group.trim()) {
      tags.add(group.trim());
    }
  }
  return [...tags];
};

const normalizeImageAsset = (asset) => {
  if (!asset) return null;
  const source = isPlainObject(asset) ? asset : { src: asset };
  const normalized = {
    src: typeof source.src === 'string' ? source.src : '',
    alt:
      typeof source.alt === 'string'
        ? source.alt
        : typeof source.caption === 'string'
          ? source.caption
          : '',
    caption: typeof source.caption === 'string' ? source.caption : '',
    name:
      typeof source.name === 'string'
        ? source.name
        : typeof source.fileName === 'string'
          ? source.fileName
          : '',
    mimeType: typeof source.mimeType === 'string' ? source.mimeType : '',
    width: Number.isFinite(Number(source.width)) ? Number(source.width) : null,
    height: Number.isFinite(Number(source.height)) ? Number(source.height) : null,
    hash: typeof source.hash === 'string' ? source.hash : '',
  };

  const embedding = normalizeEmbedding(
    source.embedding ?? source.imageEmbedding ?? source.caption ?? source.alt ?? normalized.name,
  );
  if (embedding) normalized.embedding = embedding;

  if (!normalized.src && !normalized.caption && !normalized.alt && !normalized.name) {
    return null;
  }

  return normalized;
};

const cosineSimilaritySparse = (left, right) => {
  let dot = 0;
  let leftMag = 0;
  let rightMag = 0;

  const leftEntries = Object.entries(left || {});
  const rightEntries = Object.entries(right || {});

  for (const [, value] of leftEntries) leftMag += value * value;
  for (const [, value] of rightEntries) rightMag += value * value;

  if (!leftMag || !rightMag) return 0;

  const rightLookup = new Map(rightEntries);
  for (const [token, leftValue] of leftEntries) {
    const rightValue = Number(rightLookup.get(token) || 0);
    if (rightValue) dot += leftValue * rightValue;
  }

  return dot / (Math.sqrt(leftMag) * Math.sqrt(rightMag));
};

const cosineSimilarityDense = (left, right) => {
  if (!left?.length || !right?.length) return 0;
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMag = 0;
  let rightMag = 0;

  for (let index = 0; index < length; index += 1) {
    const leftValue = Number(left[index] || 0);
    const rightValue = Number(right[index] || 0);
    dot += leftValue * rightValue;
    leftMag += leftValue * leftValue;
    rightMag += rightValue * rightValue;
  }

  if (!leftMag || !rightMag) return 0;
  return dot / (Math.sqrt(leftMag) * Math.sqrt(rightMag));
};

const cosineSimilarity = (left, right) => {
  if (!left || !right) return 0;

  if (Array.isArray(left) && Array.isArray(right)) {
    return cosineSimilarityDense(left, right);
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    return cosineSimilaritySparse(left, right);
  }

  return 0;
};

const recordText = (rec) => {
  const metadata = isPlainObject(rec?.metadata) ? rec.metadata : {};
  const image = isPlainObject(metadata.image)
    ? metadata.image
    : isPlainObject(rec?.image)
      ? rec.image
      : {};
  const tagText = Array.isArray(rec?.tags) ? rec.tags.join(' ') : '';
  const metaText = [
    metadata.kind,
    metadata.mediaKind,
    metadata.caption,
    metadata.alt,
    metadata.source,
    metadata.sourceName,
    metadata.fileName,
    metadata.mimeType,
    metadata.hash,
    image.caption,
    image.alt,
    image.name,
    image.mimeType,
    image.hash,
    ...(Array.isArray(metadata.tags) ? metadata.tags : []),
  ]
    .filter(Boolean)
    .join(' ');

  return [rec?.type || '', rec?.text || '', tagText, metaText].filter(Boolean).join(' ');
};

const normalizeQueryInput = (searchInput) => {
  if (typeof searchInput === 'string') {
    return { text: searchInput, embedding: null };
  }

  if (isPlainObject(searchInput)) {
    return {
      text:
        typeof searchInput.text === 'string'
          ? searchInput.text
          : typeof searchInput.caption === 'string'
            ? searchInput.caption
            : typeof searchInput.alt === 'string'
              ? searchInput.alt
              : '',
      embedding:
        searchInput.embedding ??
        searchInput.imageEmbedding ??
        searchInput.metadata?.embedding ??
        null,
    };
  }

  return { text: '', embedding: null };
};

const recordEmbedding = (rec) => {
  const metadata = isPlainObject(rec?.metadata) ? rec.metadata : {};
  const explicit = rec?.embedding ?? metadata.embedding ?? metadata.imageEmbedding;
  const image = isPlainObject(metadata.image)
    ? metadata.image
    : isPlainObject(rec?.image)
      ? rec.image
      : null;

  if (explicit != null) {
    const normalized = normalizeEmbedding(explicit, recordText(rec));
    if (normalized) return normalized;
  }

  if (image?.embedding) {
    const normalized = normalizeEmbedding(image.embedding, recordText(rec));
    if (normalized) return normalized;
  }

  return normalizeEmbedding(recordText(rec), recordText(rec));
};

const normalizeMemoryInput = (typeOrEntry, text, metadata = {}) => {
  if (isPlainObject(typeOrEntry)) {
    const payload = typeOrEntry;
    return {
      type: typeof payload.type === 'string' && payload.type.trim() ? payload.type : 'remember',
      text:
        typeof payload.text === 'string'
          ? payload.text
          : typeof payload.caption === 'string'
            ? payload.caption
            : '',
      metadata: isPlainObject(payload.metadata) ? payload.metadata : {},
      embedding: payload.embedding ?? null,
      image: payload.image ?? payload.media ?? null,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      created_at: typeof payload.created_at === 'number' ? payload.created_at : Date.now(),
    };
  }

  return {
    type: typeof typeOrEntry === 'string' && typeOrEntry.trim() ? typeOrEntry : 'remember',
    text: typeof text === 'string' ? text : '',
    metadata: isPlainObject(metadata) ? metadata : {},
    embedding: metadata?.embedding ?? null,
    image: metadata?.image ?? metadata?.media ?? null,
    tags: Array.isArray(metadata?.tags) ? metadata.tags : [],
    created_at: Date.now(),
  };
};

const normalizeStoredEntry = (entry) => {
  const metadata = isPlainObject(entry.metadata) ? { ...entry.metadata } : {};
  const image =
    normalizeImageAsset(entry.image) ??
    normalizeImageAsset(metadata.image) ??
    normalizeImageAsset(metadata.media);

  if (image) {
    metadata.mediaKind = metadata.mediaKind || 'image';
    metadata.kind = metadata.kind || 'image';
    metadata.image = image;
  }

  const fallbackText = [
    entry.text || '',
    metadata.caption || '',
    metadata.alt || '',
    image?.caption || '',
    image?.alt || '',
    image?.name || '',
  ]
    .filter(Boolean)
    .join(' ');

  const embedding = normalizeEmbedding(
    entry.embedding ?? metadata.embedding ?? metadata.imageEmbedding ?? image?.embedding,
    fallbackText,
  );

  const tags = mergeTags(
    entry.tags,
    metadata.tags,
    metadata.kind,
    metadata.mediaKind,
    metadata.image ? ['image'] : [],
    entry.type,
  );

  return {
    type: entry.type || 'remember',
    text: typeof entry.text === 'string' ? entry.text : '',
    metadata,
    tags,
    embedding,
    created_at: typeof entry.created_at === 'number' ? entry.created_at : Date.now(),
    created_at_raw:
      typeof entry.created_at_raw === 'number'
        ? entry.created_at_raw
        : typeof entry.created_at === 'number'
          ? entry.created_at > 1e11
            ? entry.created_at / 1000
            : entry.created_at
          : Date.now() / 1000,
    source_id:
      typeof entry.source_id === 'number'
        ? entry.source_id
        : typeof entry.id === 'number'
          ? entry.id
          : null,
    legacy_id: typeof entry.legacy_id === 'number' ? entry.legacy_id : null,
  };
};

// THE HYBRID RANKER (Ported from Samus-Manus Python)
export const Memory = {
  // 1. ADD: Equivalent to m.add()
  async add(type, text, metadata = {}) {
    const normalized = normalizeStoredEntry(
      normalizeMemoryInput(type, text, metadata),
    );

    return await db.memories.add(normalized);
  },

  async remember(payload, metadata = {}) {
    if (isPlainObject(payload)) {
      return await this.add(payload);
    }
    return await this.add(payload, undefined, metadata);
  },

  async rememberImage(image, metadata = {}) {
    const normalizedImage = normalizeImageAsset(image);
    if (!normalizedImage) {
      throw new Error('rememberImage expects an image source or image descriptor.');
    }

    const caption =
      typeof metadata.caption === 'string' && metadata.caption.trim()
        ? metadata.caption.trim()
        : normalizedImage.caption || normalizedImage.alt || normalizedImage.name || '';

    return await this.add('remember', caption, {
      ...metadata,
      kind: metadata.kind || 'image',
      mediaKind: metadata.mediaKind || 'image',
      image: normalizedImage,
      tags: mergeTags(metadata.tags, ['image', 'remember']),
      embedding:
        metadata.embedding ??
        normalizedImage.embedding ??
        buildSparseEmbedding(
          [
            caption,
            normalizedImage.alt,
            normalizedImage.name,
            normalizedImage.mimeType,
          ]
            .filter(Boolean)
            .join(' '),
        ),
    });
  },

  async addImage(image, metadata = {}) {
    return await this.rememberImage(image, metadata);
  },

  // 2. QUERY: Equivalent to m.query_similar()
  // Top-K semantic-ish retrieval using cosine similarity over embeddings.
  async query(searchInput, topK = 5) {
    const allRecords = await db.memories.toArray();
    const now = Date.now();
    const query = normalizeQueryInput(searchInput);
    const queryText = String(query.text || '').trim();
    const queryTokens = tokenize(queryText);
    const queryEmbedding = normalizeEmbedding(query.embedding, queryText);
    const queryTextEmbedding = buildSparseEmbedding(queryText);

    const results = allRecords.map((rec) => {
      const candidateText = recordText(rec);
      const candidateEmbedding = recordEmbedding(rec);
      const candidateTextEmbedding = buildSparseEmbedding(candidateText);

      // COSINE SIMILARITY (text + stored embeddings + image metadata)
      const textCosine =
        queryTokens.length && candidateTextEmbedding
          ? cosineSimilarity(queryTextEmbedding, candidateTextEmbedding)
          : 0;
      const embeddingCosine =
        queryEmbedding && candidateEmbedding
          ? cosineSimilarity(queryEmbedding, candidateEmbedding)
          : 0;
      const semantic = Math.max(textCosine, embeddingCosine);

      // LEXICAL BOOST (Exact phrase hit)
      const lexical = queryText &&
        String(rec?.text || '')
          .toLowerCase()
          .includes(queryText.toLowerCase())
        ? 0.35
        : 0;

      // RECENCY SCORE (Half-life decay logic from your Python script)
      const ageSeconds = Math.max(0, (now - Number(rec.created_at || 0)) / 1000);
      const halfLife = 30 * 24 * 3600;
      const recency = Math.exp(-Math.log(2) * (ageSeconds / halfLife));

      // Combined Score
      const score = (semantic * 0.7) + lexical + (recency * 0.05);

      return { ...rec, score, cosine: semantic, textCosine, embeddingCosine, recency };
    });

    const hasQuerySignal = Boolean(queryText || query.embedding);

    return results
      .filter((rec) => (hasQuerySignal ? rec.score > 0 : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  },

  async queryNearest(searchInput, topK = 5) {
    return await this.query(searchInput, topK);
  },

  // 0. MIGRATION: One-time bridge from legacy SQLite export into Dexie
  async importLegacyData(jsonData, { overwrite = false } = {}) {
    if (!Array.isArray(jsonData)) {
      throw new Error('Legacy memory import expects an array of records.');
    }

    const normalized = jsonData.map((item) =>
      normalizeStoredEntry({
        type: item?.type || 'memory',
        text: item?.text || '',
        metadata:
          item && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
            ? item.metadata
            : {},
        tags: Array.isArray(item?.tags) ? item.tags : [],
        embedding: item?.embedding ?? null,
        image: item?.image ?? item?.media ?? item?.metadata?.image ?? item?.metadata?.media ?? null,
        created_at: typeof item?.created_at === 'number' ? item.created_at : Date.now(),
        created_at_raw:
          typeof item?.created_at_raw === 'number'
            ? item.created_at_raw
            : typeof item?.created_at === 'number'
              ? item.created_at > 1e11
                ? item.created_at / 1000
                : item.created_at
              : Date.now() / 1000,
        source_id:
          typeof item?.source_id === 'number'
            ? item.source_id
            : typeof item?.id === 'number'
              ? item.id
              : null,
        legacy_id: typeof item?.id === 'number' ? item.id : null,
      }),
    );

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
    const legacyRows = await db.memories
      .toCollection()
      .filter((item) => item?.legacy_id != null)
      .toArray();
    if (!legacyRows.length) return 0;
    await db.memories.bulkDelete(legacyRows.map((item) => item.id));
    return legacyRows.length;
  },
};

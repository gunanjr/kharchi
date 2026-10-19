/** Tags are free text kept lowercase without the leading #, at most 8 per transaction. */
export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 24;

export function normaliseTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase().slice(0, MAX_TAG_LENGTH);
}

/** "Goa, #trip  work" -> ['goa', 'trip', 'work']. Splits on commas and whitespace, drops empties and duplicates. */
export function parseTags(text: string): string[] {
  const out: string[] = [];
  for (const part of text.split(/[,\s]+/)) {
    const t = normaliseTag(part);
    if (t && !out.includes(t)) out.push(t);
    if (out.length === MAX_TAGS) break;
  }
  return out;
}

export function readTags(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

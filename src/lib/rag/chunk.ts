export type Page = { page: number; text: string };
export type Chunk = {
  content: string;
  page: number;
  sectionTitle: string | null;
  index: number;
};

// ~500 tokens ≈ 2000 chars; ~50 tokens overlap ≈ 200 chars
export const MAX_CHARS = 2000;
export const OVERLAP_CHARS = 200;

// Heuristic: short line like "Chapter 3", "Unit 2 ...", "2.1 Normalization" or ALL CAPS
export function isHeading(line: string): boolean {
  const l = line.trim();
  if (l.length < 3 || l.length > 80) return false;
  if (/^(chapter|unit|module|section|topic)\s+\d+/i.test(l)) return true;
  if (/^\d+(\.\d+)*[.)]?\s+[A-Z]/.test(l) && !/[.:;,]$/.test(l)) return true;
  return l === l.toUpperCase() && /[A-Z]{3}/.test(l) && !/[.:;,]$/.test(l);
}

/**
 * Splits pages into overlapping chunks. A heading starts a new chunk (hard
 * boundary, no overlap); long sections are split at ~MAX_CHARS with a small
 * overlap. Each chunk remembers its page and section title for citations.
 */
export function chunkPages(pages: Page[]): Chunk[] {
  const chunks: Chunk[] = [];
  let section: string | null = null;
  let buffer = "";
  let added = 0; // chars added since last flush (ignores carried-over overlap)
  let bufferPage = pages[0]?.page ?? 1;

  const flush = (keepOverlap: boolean) => {
    const content = buffer.trim();
    if (added > 0 && content.length > 40) {
      chunks.push({ content, page: bufferPage, sectionTitle: section, index: chunks.length });
    }
    buffer = keepOverlap && content.length > OVERLAP_CHARS ? content.slice(-OVERLAP_CHARS) : "";
    added = 0;
  };

  for (const { page, text } of pages) {
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line) {
        if (buffer) buffer += "\n";
        continue;
      }
      if (isHeading(line)) {
        flush(false);
        section = line;
      } else if (buffer.length + line.length > MAX_CHARS && added > 0) {
        flush(true);
      }
      if (!buffer.trim()) bufferPage = page;
      buffer += (buffer && !buffer.endsWith("\n") ? "\n" : "") + line;
      added += line.length;
    }
  }
  flush(false);
  return chunks;
}

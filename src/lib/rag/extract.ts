import { getDocumentProxy, extractText } from "unpdf";
import type { Page } from "./chunk";

/** Returns text page by page. PDFs keep real page numbers; text files use form-feed (\f) as page break. */
export async function extractPages(file: File): Promise<Page[]> {
  if (file.name.toLowerCase().endsWith(".pdf")) {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: false });
    return (text as string[]).map((t, i) => ({ page: i + 1, text: t }));
  }
  return textToPages(await file.text());
}

export function textToPages(text: string): Page[] {
  return text.split("\f").map((t, i) => ({ page: i + 1, text: t }));
}

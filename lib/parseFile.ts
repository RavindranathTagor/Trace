// Extract plain text from an uploaded file so Cognee can cognify it.
// PDF -> unpdf, DOCX -> mammoth, XLSX/XLS/CSV -> xlsx, everything else -> text.

import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { extractText, getDocumentProxy } from "unpdf";

export async function parseFileToText(name: string, buffer: ArrayBuffer): Promise<string> {
  const lower = name.toLowerCase();
  const u8 = new Uint8Array(buffer);

  if (lower.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(u8);
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : String(text);
  }

  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(u8) });
    return value;
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
    const wb = XLSX.read(u8, { type: "array" });
    return wb.SheetNames.map((n) => `# ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join("\n\n");
  }

  // txt, md, vtt, srt, json, log, etc.
  return new TextDecoder().decode(u8);
}

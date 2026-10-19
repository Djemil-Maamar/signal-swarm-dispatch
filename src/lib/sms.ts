export type ContactLike = { name?: string | null; phone?: string | null; email?: string | null };

/** Fill {{name}}, {{phone}}, {{email}} placeholders. Unknown placeholders become empty. */
export function renderTemplate(body: string, c: ContactLike): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = (c as Record<string, unknown>)[key.toLowerCase()];
    return typeof v === "string" ? v : "";
  });
}

/** Keep leading + and digits only. */
export function normalizePhone(raw: string): string {
  const t = raw.trim();
  const digits = t.replace(/[^\d]/g, "");
  return t.startsWith("+") ? `+${digits}` : digits;
}

/** SMS segments: 160 chars GSM-7 single, 153 per part when concatenated. */
export function smsSegments(text: string): number {
  if (text.length === 0) return 0;
  return text.length <= 160 ? 1 : Math.ceil(text.length / 153);
}

/** Minimal CSV parser supporting quoted fields. Returns rows of header->value. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return "gw_" + Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

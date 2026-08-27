const IMC_GUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Accept either a raw IMC GUID or a copied member profile URL. */
export function extractImcGuid(value: string | null | undefined): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.match(IMC_GUID_RE)?.[0] || null;
}

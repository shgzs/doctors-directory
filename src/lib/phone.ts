// Normalizes Iranian mobile numbers to the 98XXXXXXXXXX format,
// which is what we store and what Melipayamak expects.
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("0098")) return digits.slice(2);
  if (digits.startsWith("98") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "98" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("9")) return "98" + digits;

  return null; // not a recognizable Iranian mobile number
}

export function generateOtp(): string {
  // 6-digit numeric code
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return n.toString().padStart(6, "0");
}

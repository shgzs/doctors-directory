// Given a hostname like "radio.logist.ir" or "mysite.com" or "www.mysite.com",
// returns the leftmost label if it looks like a meaningful subdomain
// ("radio"), or null for an apex domain / "www".
//
// NOTE: this naive split assumes a 2-label base domain (logist.ir,
// mysite.com). It will misfire on multi-part TLDs like "co.uk" — not a
// concern for the domains in use today, but worth remembering if a
// ".co.uk"-style domain is ever added.
export function extractSubdomainLabel(hostname: string): string | null {
  const host = hostname.split(":")[0]; // strip port if present (local dev)
  const parts = host.split(".");
  if (parts.length <= 2) return null;

  const first = parts[0].toLowerCase();
  if (first === "www") return null;

  return first;
}

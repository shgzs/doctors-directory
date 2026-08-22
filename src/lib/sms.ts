import type { Env } from "../types";

// Melipayamak's REST "SendOtp" method:
//   POST https://rest.payamak-panel.com/api/SendSMS/SendOtp
//   Content-Type: application/x-www-form-urlencoded
//   body: username, password, to, from, code
//
// Response body is JSON like:
//   { "Value": "<recId or error text>", "RetStatus": 1, "StrRetStatus": "Ok" }
// RetStatus === 1 means success; any other value is a real failure even
// though the HTTP status itself is 200 — so we must check RetStatus, not
// just res.ok.
export async function sendOtpSms(
  env: Env,
  phone: string,
  code: string
): Promise<{ ok: boolean; retStatus?: number; message?: string; raw?: string }> {
  const body = new URLSearchParams({
    username: env.MELIPAYAMAK_USERNAME,
    password: env.MELIPAYAMAK_PASSWORD,
    to: phone,
    from: env.MELIPAYAMAK_SENDER,
    code,
  });

  try {
    const res = await fetch("https://rest.payamak-panel.com/api/SendSMS/SendOtp", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const text = await res.text();
    console.log("melipayamak raw response:", text);

    let parsed: { Value?: string; RetStatus?: number; StrRetStatus?: string } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Non-JSON response — treat as failure and surface the raw text for debugging.
      return { ok: false, raw: text };
    }

    const ok = parsed?.RetStatus === 1;
    return {
      ok,
      retStatus: parsed?.RetStatus,
      message: parsed?.StrRetStatus,
      raw: text,
    };
  } catch (err) {
    console.error("melipayamak request failed:", err);
    return { ok: false, raw: String(err) };
  }
}

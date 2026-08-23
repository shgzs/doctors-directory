import { Hono } from "hono";
import type { Env } from "../types";
import { normalizePhone, generateOtp } from "../lib/phone";
import { sendOtpSms } from "../lib/sms";
import { signJwt } from "../lib/jwt";

const auth = new Hono<{ Bindings: Env }>();

const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutes
const OTP_RATE_LIMIT_MAX_REQUESTS = 5; // intentionally relaxed for development

// POST /api/auth/request-otp  { phone }
auth.post("/request-otp", async (c) => {
  const { phone } = await c.req.json<{ phone?: string }>();
  const normalized = phone ? normalizePhone(phone) : null;

  if (!normalized) {
    return c.json({ error: "شماره موبایل معتبر نیست" }, 400);
  }

  // Development-friendly abuse protection: prevent accidental loops or a
  // runaway client from repeatedly replacing the OTP, without making normal
  // testing inconvenient.
  const rateKey = `otp-rate:${normalized}`;
  const previousCount = Number((await c.env.OTP_KV.get(rateKey)) ?? "0");
  if (previousCount >= OTP_RATE_LIMIT_MAX_REQUESTS) {
    return c.json(
      { error: "تعداد درخواست‌ها زیاد است؛ لطفاً چند دقیقه بعد دوباره تلاش کنید" },
      429
    );
  }
  await c.env.OTP_KV.put(rateKey, String(previousCount + 1), {
    expirationTtl: OTP_RATE_LIMIT_WINDOW_SECONDS,
  });

  const code = generateOtp();
  await c.env.OTP_KV.put(`otp:${normalized}`, code, {
    expirationTtl: OTP_TTL_SECONDS,
  });

  // Debug mode controls both skipping SMS and exposing diagnostics for local
  // development. Keep it disabled in any shared or production environment.
  if (c.env.DEBUG_MODE === "true") {
    console.log(`[DEBUG_MODE] code for ${normalized}: ${code}`);
    return c.json({
      ok: true,
      expiresIn: OTP_TTL_SECONDS,
      debugCode: code,
    });
  }

  const sms = await sendOtpSms(c.env, normalized, code);
  if (!sms.ok) {
    return c.json(
      {
        error: "ارسال پیامک ناموفق بود",
        ...(c.env.DEBUG_MODE === "true"
          ? { debug: { retStatus: sms.retStatus, message: sms.message, raw: sms.raw } }
          : {}),
      },
      502
    );
  }

  return c.json({ ok: true, expiresIn: OTP_TTL_SECONDS });
});

// POST /api/auth/verify-otp  { phone, code }
auth.post("/verify-otp", async (c) => {
  const { phone, code } = await c.req.json<{ phone?: string; code?: string }>();
  const normalized = phone ? normalizePhone(phone) : null;

  if (!normalized || !code) {
    return c.json({ error: "ورودی نامعتبر" }, 400);
  }

  const stored = await c.env.OTP_KV.get(`otp:${normalized}`);
  if (!stored || stored !== code) {
    return c.json({ error: "کد نادرست یا منقضی شده است" }, 401);
  }
  await c.env.OTP_KV.delete(`otp:${normalized}`);
  await c.env.OTP_KV.delete(`otp-rate:${normalized}`);

  // Does a profile already exist for this phone?
  let doctor = await c.env.DB.prepare(
    "SELECT id, role, status, full_name FROM doctors WHERE phone = ?"
  )
    .bind(normalized)
    .first<{ id: string; role: string; status: string; full_name: string | null }>();

  if (!doctor) {
    // Is this number on the pre-approved list?
    const preapproved = await c.env.DB.prepare(
      "SELECT phone FROM preapproved_phones WHERE phone = ?"
    )
      .bind(normalized)
      .first();

    const id = crypto.randomUUID();
    const status = preapproved ? "approved" : "pending";

    await c.env.DB.prepare(
      `INSERT INTO doctors (id, public_id, phone, full_name, official_name, role, status)
       VALUES (?, lower(substr(hex(randomblob(6)), 1, 12)), ?, ?, NULL, 'member', ?)`
    )
      .bind(id, normalized, "", status)
      .run();

    doctor = { id, role: "member", status, full_name: "" };
  }

  if (doctor.status === "rejected") {
    return c.json({ error: "دسترسی شما تایید نشده است" }, 403);
  }

  const token = await signJwt(
    {
      sub: doctor.id,
      role: doctor.role,
      status: doctor.status,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
    },
    c.env.JWT_SECRET
  );

  return c.json({
    ok: true,
    token,
    doctorId: doctor.id,
    status: doctor.status, // "pending" means: show a waiting-for-admin-approval screen
    profileComplete: Boolean(doctor.full_name),
  });
});

export default auth;

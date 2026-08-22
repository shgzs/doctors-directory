import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { requireApprovedMember } from "../lib/middleware";

const referrals = new Hono<{ Bindings: Env }>();

// All referral endpoints require an approved, logged-in member.
referrals.use("*", requireApprovedMember);

// GET /api/referrals?specialty=&city=&q=
referrals.get("/", async (c) => {
  const { specialty, city, q } = c.req.query();

  let sql = `SELECT r.id, r.recommended_name, r.specialty, r.city, r.notes,
                    r.created_at, d.full_name AS submitted_by
             FROM referrals r
             LEFT JOIN doctors d ON d.id = r.submitted_by_doctor_id
             WHERE 1=1`;
  const binds: string[] = [];

  if (specialty) {
    sql += " AND r.specialty LIKE ?";
    binds.push(`%${specialty}%`);
  }
  if (city) {
    sql += " AND r.city LIKE ?";
    binds.push(`%${city}%`);
  }
  if (q) {
    sql += " AND (r.recommended_name LIKE ? OR r.notes LIKE ?)";
    binds.push(`%${q}%`, `%${q}%`);
  }
  sql += " ORDER BY r.created_at DESC LIMIT 200";

  const { results } = await c.env.DB.prepare(sql)
    .bind(...binds)
    .all();

  return c.json({ referrals: results });
});

// POST /api/referrals  { recommendedName, specialty, city, phone, notes, linkedDoctorId? }
referrals.post("/", async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const body = await c.req.json<{
    recommendedName: string;
    specialty?: string;
    city?: string;
    phone?: string;
    notes?: string;
    linkedDoctorId?: string;
  }>();

  if (!body.recommendedName) {
    return c.json({ error: "نام فرد معرفی‌شده الزامی است" }, 400);
  }

  await c.env.DB.prepare(
    `INSERT INTO referrals
       (id, recommended_name, specialty, city, phone, notes, submitted_by_doctor_id, linked_doctor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      body.recommendedName,
      body.specialty ?? null,
      body.city ?? null,
      body.phone ?? null,
      body.notes ?? null,
      auth.sub,
      body.linkedDoctorId ?? null
    )
    .run();

  return c.json({ ok: true });
});

export default referrals;

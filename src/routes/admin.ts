import { Hono } from "hono";
import type { Env } from "../types";
import { requireAdmin } from "../lib/middleware";
import { normalizePhone } from "../lib/phone";

const admin = new Hono<{ Bindings: Env }>();
admin.use("*", requireAdmin);

// GET /api/admin/pending
admin.get("/pending", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, phone, full_name, created_at FROM doctors
     WHERE status = 'pending' ORDER BY created_at ASC`
  ).all();
  return c.json({ pending: results });
});

admin.get("/doctors", async (c) => {
  const { status, q } = c.req.query();
  let sql = `SELECT id, phone, full_name, official_name,
                    CASE WHEN official_name IS NOT NULL AND official_name != full_name THEN 1 ELSE 0 END AS name_changed,
                    specialty_main, city, role, status, created_at, updated_at
             FROM doctors WHERE 1=1`;
  const binds: string[] = [];
  if (status) { sql += " AND status = ?"; binds.push(status); }
  if (q) { sql += " AND (full_name LIKE ? OR phone LIKE ? OR city LIKE ?)"; binds.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += " ORDER BY created_at DESC LIMIT 500";
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ doctors: results });
});

// GET /api/admin/roster — the imported class list, including unlinked people.
admin.get("/roster", async (c) => {
  const { q } = c.req.query();
  let sql = `SELECT id, official_name, council_number, degree, field,
                    graduation_year, phone, doctor_id, updated_at
             FROM class_roster WHERE 1=1`;
  const binds: string[] = [];
  if (q) { sql += " AND (official_name LIKE ? OR council_number LIKE ? OR phone LIKE ?)"; binds.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += " ORDER BY official_name ASC LIMIT 500";
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ roster: results });
});

// PATCH /api/admin/roster/:id/phone — assign a login phone to a roster person.
// If they have not logged in yet, create an approved profile ready for OTP.
admin.patch("/roster/:id/phone", async (c) => {
  const rosterId = c.req.param("id");
  const body = await c.req.json<{ phone?: string }>();
  const phone = body.phone ? normalizePhone(body.phone) : null;
  if (!phone) return c.json({ error: "شماره موبایل معتبر نیست" }, 400);

  const roster = await c.env.DB.prepare("SELECT * FROM class_roster WHERE id = ?")
    .bind(rosterId).first<Record<string, any>>();
  if (!roster) return c.json({ error: "فرد موردنظر پیدا نشد" }, 404);

  const used = await c.env.DB.prepare("SELECT id FROM doctors WHERE phone = ?")
    .bind(phone).first<{ id: string }>();
  if (used && used.id !== roster.doctor_id) return c.json({ error: "این شماره قبلاً برای فرد دیگری ثبت شده است" }, 409);

  let doctorId = roster.doctor_id as string | null;
  if (doctorId) {
    await c.env.DB.prepare("UPDATE doctors SET phone = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(phone, doctorId).run();
  } else {
    doctorId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO doctors (id, phone, full_name, official_name, roster_id,
                            specialty_main, medical_council_number, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'member', 'approved')`
    ).bind(doctorId, phone, roster.official_name, roster.official_name, rosterId,
      roster.field || null, roster.council_number || null).run();
  }

  await c.env.DB.prepare("UPDATE class_roster SET phone = ?, doctor_id = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(phone, doctorId, rosterId).run();
  return c.json({ ok: true, doctorId, phone });
});

// POST /api/admin/approve/:id
admin.post("/approve/:id", async (c) => {
  const id = c.req.param("id");
  const result = await c.env.DB.prepare("UPDATE doctors SET status = 'approved', updated_at = datetime('now') WHERE id = ?")
    .bind(id)
    .run();
  if (!result.success || !result.meta.changes) return c.json({ error: "کاربر پیدا نشد" }, 404);
  return c.json({ ok: true });
});

// POST /api/admin/reject/:id
admin.post("/reject/:id", async (c) => {
  const id = c.req.param("id");
  const result = await c.env.DB.prepare("UPDATE doctors SET status = 'rejected', updated_at = datetime('now') WHERE id = ?")
    .bind(id)
    .run();
  if (!result.success || !result.meta.changes) return c.json({ error: "کاربر پیدا نشد" }, 404);
  return c.json({ ok: true });
});

admin.post("/restore/:id", async (c) => {
  const result = await c.env.DB.prepare("UPDATE doctors SET status = 'pending', updated_at = datetime('now') WHERE id = ?")
    .bind(c.req.param("id")).run();
  if (!result.success || !result.meta.changes) return c.json({ error: "کاربر پیدا نشد" }, 404);
  return c.json({ ok: true });
});

admin.patch("/doctors/:id/role", async (c) => {
  const body = await c.req.json<{ role?: "member" | "admin" }>();
  if (body.role !== "member" && body.role !== "admin") return c.json({ error: "نقش نامعتبر است" }, 400);
  const result = await c.env.DB.prepare("UPDATE doctors SET role = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(body.role, c.req.param("id")).run();
  if (!result.success || !result.meta.changes) return c.json({ error: "کاربر پیدا نشد" }, 404);
  return c.json({ ok: true });
});

export default admin;

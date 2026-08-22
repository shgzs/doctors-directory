import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { requireApprovedMember } from "../lib/middleware";

const requests = new Hono<{ Bindings: Env }>();
requests.use("*", requireApprovedMember);

async function readRequest(c: any, id: string) {
  const request = await c.env.DB.prepare(
    `SELECT r.*, d.full_name AS asked_by
     FROM recommendation_requests r
     JOIN doctors d ON d.id = r.asked_by_doctor_id
     WHERE r.id = ?`
  ).bind(id).first() as Record<string, any> | null;
  if (!request) return null;
  const { results: answers } = await c.env.DB.prepare(
    `SELECT a.*, d.full_name AS answered_by
     FROM recommendation_answers a
     JOIN doctors d ON d.id = a.answered_by_doctor_id
     WHERE a.request_id = ? ORDER BY a.created_at ASC`
  ).bind(id).all();
  return { ...request, answers };
}

requests.get("/", async (c) => {
  const { q, status } = c.req.query();
  let sql = `SELECT r.id, r.title, r.specialty, r.city, r.details, r.status,
                    r.created_at, d.full_name AS asked_by,
                    (SELECT COUNT(*) FROM recommendation_answers a WHERE a.request_id = r.id) AS answer_count
             FROM recommendation_requests r JOIN doctors d ON d.id = r.asked_by_doctor_id WHERE 1=1`;
  const binds: string[] = [];
  if (status) { sql += " AND r.status = ?"; binds.push(status); }
  if (q) { sql += " AND (r.title LIKE ? OR r.specialty LIKE ? OR r.city LIKE ? OR r.details LIKE ?)"; binds.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`); }
  sql += " ORDER BY r.created_at DESC LIMIT 200";
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ requests: results });
});

requests.get("/:id", async (c) => {
  const request = await readRequest(c, c.req.param("id"));
  return request ? c.json(request) : c.json({ error: "درخواست پیدا نشد" }, 404);
});

requests.post("/", async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const body = await c.req.json<{ title?: string; specialty?: string; city?: string; details?: string }>();
  if (!body.title?.trim()) return c.json({ error: "متن درخواست الزامی است" }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO recommendation_requests (id, asked_by_doctor_id, title, specialty, city, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, auth.sub, body.title.trim(), body.specialty?.trim() || null,
    body.city?.trim() || null, body.details?.trim() || null).run();
  return c.json({ ok: true, id });
});

requests.post("/:id/answers", async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const id = c.req.param("id");
  const exists = await c.env.DB.prepare("SELECT id FROM recommendation_requests WHERE id = ?").bind(id).first();
  if (!exists) return c.json({ error: "درخواست پیدا نشد" }, 404);
  const body = await c.req.json<{ recommendedName?: string; recommendedDoctorId?: string; specialty?: string; city?: string; phone?: string; notes?: string }>();
  if (!body.recommendedName?.trim()) return c.json({ error: "نام فرد پیشنهادی الزامی است" }, 400);
  const answerId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO recommendation_answers
       (id, request_id, answered_by_doctor_id, recommended_name, recommended_doctor_id, specialty, city, phone, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(answerId, id, auth.sub, body.recommendedName.trim(), body.recommendedDoctorId || null,
    body.specialty?.trim() || null, body.city?.trim() || null, body.phone?.trim() || null,
    body.notes?.trim() || null).run();
  await c.env.DB.prepare("UPDATE recommendation_requests SET status = 'answered', updated_at = datetime('now') WHERE id = ? AND status = 'open'").bind(id).run();
  return c.json({ ok: true, id: answerId });
});

requests.patch("/:id/status", async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const body = await c.req.json<{ status?: "open" | "closed" }>();
  if (body.status !== "open" && body.status !== "closed") return c.json({ error: "وضعیت نامعتبر است" }, 400);
  const result = await c.env.DB.prepare(
    "UPDATE recommendation_requests SET status = ?, updated_at = datetime('now') WHERE id = ? AND asked_by_doctor_id = ?"
  ).bind(body.status, c.req.param("id"), auth.sub).run();
  if (!result.success || !result.meta.changes) return c.json({ error: "درخواست پیدا نشد یا دسترسی ندارید" }, 404);
  return c.json({ ok: true });
});

export default requests;

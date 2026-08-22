import { Hono } from "hono";
import type { Env } from "../types";
import { requireAdmin } from "../lib/middleware";

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
  let sql = "SELECT id, phone, full_name, specialty_main, city, role, status, created_at, updated_at FROM doctors WHERE 1=1";
  const binds: string[] = [];
  if (status) { sql += " AND status = ?"; binds.push(status); }
  if (q) { sql += " AND (full_name LIKE ? OR phone LIKE ? OR city LIKE ?)"; binds.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += " ORDER BY created_at DESC LIMIT 500";
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ doctors: results });
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

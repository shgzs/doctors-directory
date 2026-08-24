import { Hono } from "hono";
import type { Env } from "../types";
import { requireAdmin } from "../lib/middleware";
import { normalizePhone } from "../lib/phone";
import { normalizePersianSearch, persianSearchSql } from "../lib/persian-text";

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
                    specialty_main, city, role, status, imc_guid, imc_profile_url, created_at, updated_at
             FROM doctors WHERE 1=1`;
  const binds: string[] = [];
  if (status) { sql += " AND status = ?"; binds.push(status); }
  if (q) { sql += ` AND (${persianSearchSql("full_name")} LIKE ? OR phone LIKE ? OR ${persianSearchSql("city")} LIKE ?)`; const search = normalizePersianSearch(q); binds.push(`%${search}%`, `%${q}%`, `%${search}%`); }
  sql += " ORDER BY created_at DESC LIMIT 500";
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ doctors: results });
});

// GET /api/admin/roster — the imported class list, including unlinked people.
admin.get("/roster", async (c) => {
  const { q } = c.req.query();
  let sql = `SELECT id, official_name, student_number, council_number, degree, field,
                    imc_guid, imc_profile_url, imc_photo_url,
                    graduation_year, phone, doctor_id, updated_at
             FROM class_roster WHERE 1=1`;
  const binds: string[] = [];
  if (q) { sql += ` AND (${persianSearchSql("official_name")} LIKE ? OR student_number LIKE ? OR council_number LIKE ? OR imc_guid LIKE ? OR phone LIKE ?)`; const search = normalizePersianSearch(q); binds.push(`%${search}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
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
      `INSERT INTO doctors (id, public_id, phone, full_name, official_name, roster_id,
                            specialty_main, medical_council_number, role, status)
       VALUES (?, lower(substr(hex(randomblob(6)), 1, 12)), ?, ?, ?, ?, ?, ?, 'member', 'approved')`
    ).bind(doctorId, phone, roster.official_name, roster.official_name, rosterId,
      roster.field || null, roster.council_number || null).run();
  }

  await c.env.DB.prepare("UPDATE class_roster SET phone = ?, doctor_id = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(phone, doctorId, rosterId).run();
  return c.json({ ok: true, doctorId, phone });
});

// PATCH /api/admin/roster/:id/imc — add official medical council identity data.
admin.patch("/roster/:id/imc", async (c) => {
  const rosterId = c.req.param("id");
  const body = await c.req.json<{
    studentNumber?: string;
    councilNumber?: string;
    imcGuid?: string;
    imcProfileUrl?: string;
    imcPhotoUrl?: string;
  }>();
  const roster = await c.env.DB.prepare("SELECT * FROM class_roster WHERE id = ?")
    .bind(rosterId).first<Record<string, any>>();
  if (!roster) return c.json({ error: "فرد موردنظر پیدا نشد" }, 404);

  const guid = body.imcGuid?.trim() || null;
  if (guid && !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(guid)) {
    return c.json({ error: "شناسه نظام پزشکی باید به شکل GUID باشد" }, 400);
  }
  const profileUrl = body.imcProfileUrl?.trim() || (guid ? `https://membersearch.irimc.org/member/profile?id=${guid}` : null);
  await c.env.DB.prepare(
    `UPDATE class_roster SET student_number = COALESCE(?, student_number), council_number = ?, imc_guid = ?,
       imc_profile_url = ?, imc_photo_url = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(
    body.studentNumber?.trim() || null,
    body.councilNumber?.trim() || null,
    guid,
    profileUrl,
    body.imcPhotoUrl?.trim() || null,
    rosterId
  ).run();
  if (roster.doctor_id) {
    await c.env.DB.prepare("UPDATE doctors SET medical_council_number = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(body.councilNumber?.trim() || null, roster.doctor_id).run();
  }
  return c.json({ ok: true, imcProfileUrl: profileUrl });
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

admin.patch("/doctors/:id/imc", async (c) => {
  const body = await c.req.json<{ imcGuid?: string; imcProfileUrl?: string; imcPhotoUrl?: string }>();
  const guid = body.imcGuid?.trim() || null;
  if (guid && !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(guid)) return c.json({ error: "شناسه نظام پزشکی باید GUID باشد" }, 400);
  const profileUrl = body.imcProfileUrl?.trim() || (guid ? `https://membersearch.irimc.org/member/profile?id=${guid}` : null);
  const result = await c.env.DB.prepare(
    "UPDATE doctors SET imc_guid = ?, imc_profile_url = ?, imc_photo_url = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(guid, profileUrl, body.imcPhotoUrl?.trim() || null, c.req.param("id")).run();
  if (!result.success || !result.meta.changes) return c.json({ error: "کاربر پیدا نشد" }, 404);
  return c.json({ ok: true, imcProfileUrl: profileUrl });
});

// GET /api/admin/doctors/:id/profile — full profile for the administrator.
admin.get("/doctors/:id/profile", async (c) => {
  const id = c.req.param("id");
  const doctor = await c.env.DB.prepare(
    `SELECT d.*, r.student_number, r.council_number AS roster_council_number,
            COALESCE(d.imc_guid, r.imc_guid) AS effective_imc_guid,
            COALESCE(d.imc_profile_url, r.imc_profile_url) AS effective_imc_profile_url,
            COALESCE(d.imc_photo_url, r.imc_photo_url) AS effective_imc_photo_url
     FROM doctors d LEFT JOIN class_roster r ON r.id = d.roster_id
     WHERE d.id = ? OR d.public_id = ?`
  ).bind(id, id).first<Record<string, unknown>>();
  if (!doctor) return c.json({ error: "کاربر پیدا نشد" }, 404);
  const [locations, social, extra, photos] = await Promise.all([
    c.env.DB.prepare("SELECT id, location_name, address, days_of_week FROM work_locations WHERE doctor_id = ?").bind(doctor.id).all(),
    c.env.DB.prepare("SELECT id, platform, value, visibility FROM social_links WHERE doctor_id = ?").bind(doctor.id).all(),
    c.env.DB.prepare("SELECT id, field_key, field_value, visibility FROM dynamic_fields WHERE doctor_id = ?").bind(doctor.id).all(),
    c.env.DB.prepare("SELECT id, asset_key, caption, is_primary FROM doctor_photos WHERE doctor_id = ? ORDER BY sort_order, created_at").bind(doctor.id).all(),
  ]);
  return c.json({ ...doctor, workLocations: locations.results, socialLinks: social.results, extraFields: extra.results, photos: photos.results });
});

// PUT /api/admin/doctors/:id/profile — edit all database-backed profile fields.
admin.put("/doctors/:id/profile", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    fullName?: string; officialName?: string; phone?: string; phonePublic?: string;
    specialtyMain?: string; city?: string; medicalCouncilNumber?: string; email?: string;
    bio?: string; cardTemplate?: string; role?: "member" | "admin";
    status?: "pending" | "approved" | "rejected" | "hidden";
    imcGuid?: string; imcProfileUrl?: string; imcPhotoUrl?: string;
  }>();
  const doctor = await c.env.DB.prepare("SELECT id FROM doctors WHERE id = ? OR public_id = ?").bind(id, id).first<{ id: string }>();
  if (!doctor) return c.json({ error: "کاربر پیدا نشد" }, 404);
  const phone = body.phone?.trim() ? normalizePhone(body.phone) : null;
  if (body.phone?.trim() && !phone) return c.json({ error: "شماره موبایل معتبر نیست" }, 400);
  if (phone) {
    const used = await c.env.DB.prepare("SELECT id FROM doctors WHERE phone = ? AND id != ?").bind(phone, doctor.id).first<{ id: string }>();
    if (used) return c.json({ error: "این شماره قبلاً برای فرد دیگری ثبت شده است" }, 409);
  }
  const guid = body.imcGuid?.trim() || null;
  if (guid && !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(guid)) return c.json({ error: "شناسه نظام پزشکی باید به شکل GUID باشد" }, 400);
  const profileUrl = body.imcProfileUrl?.trim() || (guid ? `https://membersearch.irimc.org/member/profile?id=${guid}` : null);
  const result = await c.env.DB.prepare(
    `UPDATE doctors SET full_name = COALESCE(NULLIF(TRIM(?), ''), full_name), official_name = COALESCE(NULLIF(TRIM(?), ''), official_name),
       phone = COALESCE(?, phone), phone_public = ?, specialty_main = ?, city = ?, medical_council_number = ?, email = ?, bio = ?,
       card_template = COALESCE(NULLIF(?, ''), card_template), role = COALESCE(?, role), status = COALESCE(?, status),
       imc_guid = ?, imc_profile_url = ?, imc_photo_url = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(
    body.fullName ?? null, body.officialName ?? null, phone,
    body.phonePublic?.trim() || null, body.specialtyMain?.trim() || null, body.city?.trim() || null,
    body.medicalCouncilNumber?.trim() || null, body.email?.trim() || null, body.bio ?? null,
    body.cardTemplate, body.role, body.status, guid, profileUrl, body.imcPhotoUrl?.trim() || null, doctor.id
  ).run();
  if (!result.success || !result.meta.changes) return c.json({ error: "ویرایش انجام نشد" }, 400);
  return c.json({ ok: true });
});

// PATCH /api/admin/doctors/:id/status — hide/restore without deleting data.
admin.patch("/doctors/:id/status", async (c) => {
  const body = await c.req.json<{ status?: "pending" | "approved" | "rejected" | "hidden" }>();
  if (!body.status) return c.json({ error: "وضعیت مشخص نشده است" }, 400);
  const result = await c.env.DB.prepare("UPDATE doctors SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(body.status, c.req.param("id")).run();
  if (!result.success || !result.meta.changes) return c.json({ error: "کاربر پیدا نشد" }, 404);
  return c.json({ ok: true });
});

// DELETE /api/admin/doctors/:id — permanent deletion, including private profile data and KV photos.
admin.delete("/doctors/:id", async (c) => {
  const id = c.req.param("id");
  const doctor = await c.env.DB.prepare("SELECT id, role FROM doctors WHERE id = ? OR public_id = ?").bind(id, id).first<{ id: string; role: string }>();
  if (!doctor) return c.json({ error: "کاربر پیدا نشد" }, 404);
  if (doctor.id === (c.get("auth" as never) as { sub: string }).sub) return c.json({ error: "برای جلوگیری از حذف اشتباهی، خودت را نمی‌توانی حذف کنی" }, 400);
  const photos = await c.env.DB.prepare("SELECT asset_key FROM doctor_photos WHERE doctor_id = ?").bind(doctor.id).all<{ asset_key: string }>();
  await Promise.all(photos.results.map(p => c.env.ASSETS_KV.delete(p.asset_key)));
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM recommendation_answers WHERE answered_by_doctor_id = ?").bind(doctor.id),
    c.env.DB.prepare("DELETE FROM recommendation_requests WHERE asked_by_doctor_id = ?").bind(doctor.id),
    c.env.DB.prepare("UPDATE referrals SET linked_doctor_id = NULL WHERE linked_doctor_id = ?").bind(doctor.id),
    c.env.DB.prepare("DELETE FROM referrals WHERE submitted_by_doctor_id = ?").bind(doctor.id),
    c.env.DB.prepare("DELETE FROM doctor_photos WHERE doctor_id = ?").bind(doctor.id),
    c.env.DB.prepare("DELETE FROM work_locations WHERE doctor_id = ?").bind(doctor.id),
    c.env.DB.prepare("DELETE FROM social_links WHERE doctor_id = ?").bind(doctor.id),
    c.env.DB.prepare("DELETE FROM dynamic_fields WHERE doctor_id = ?").bind(doctor.id),
    c.env.DB.prepare("DELETE FROM doctors WHERE id = ?").bind(doctor.id),
  ]);
  return c.json({ ok: true });
});

export default admin;

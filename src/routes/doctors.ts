import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { requireApprovedMember, requireAuthenticated } from "../lib/middleware";
import { normalizePersianSearch, persianSearchSql } from "../lib/persian-text";

const doctors = new Hono<{ Bindings: Env }>();

function isApprovedMember(c: any): boolean {
  const auth = c.get("auth" as never) as JwtPayload | undefined;
  return Boolean(auth && auth.status === "approved");
}

// GET /api/doctors?specialty=&city=&q=
// Public: base fields only. Approved members: also phone_private-equivalent
// data via personal phone + members-only dynamic fields/social links.
doctors.get("/", async (c) => {
  const { specialty, city, q } = c.req.query();
  const member = isApprovedMember(c);

  let sql = `SELECT id, full_name, specialty_main, city, phone_public,
                    medical_council_number, avatar_key
             FROM doctors WHERE status = 'approved'`;
  const binds: string[] = [];

  if (specialty) {
    sql += " AND specialty_main LIKE ?";
    binds.push(`%${specialty}%`);
  }
  if (city) {
    sql += " AND city LIKE ?";
    binds.push(`%${city}%`);
  }
  if (q) {
    sql += ` AND ${persianSearchSql("full_name")} LIKE ?`;
    binds.push(`%${normalizePersianSearch(q)}%`);
  }
  sql += " ORDER BY full_name ASC LIMIT 200";

  const { results } = await c.env.DB.prepare(sql)
    .bind(...binds)
    .all();

  // phone (the personal number) is only ever exposed on the detail
  // endpoint below, and only to approved members — never in list view.
  return c.json({ member, doctors: results });
});

// GET /api/doctors/me/profile — includes a pending user's own profile.
doctors.get("/me/profile", requireAuthenticated, async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const doctor = await c.env.DB.prepare(
    `SELECT d.id, d.public_id, d.phone, d.full_name, d.official_name, d.roster_id, d.specialty_main, d.city, d.phone_public,
            d.medical_council_number, d.email, d.bio, d.avatar_key, d.card_template, d.status, d.role,
            r.student_number, r.council_number AS roster_council_number,
            COALESCE(d.imc_guid, r.imc_guid) AS imc_guid,
            COALESCE(d.imc_profile_url, r.imc_profile_url) AS imc_profile_url,
            COALESCE(d.imc_photo_url, r.imc_photo_url) AS imc_photo_url
     FROM doctors d LEFT JOIN class_roster r ON r.id = d.roster_id WHERE d.id = ?`
  ).bind(auth.sub).first<Record<string, unknown>>();
  if (!doctor) return c.json({ error: "پروفایل پیدا نشد" }, 404);
  // The imported/verified name is an admin-only audit field.
  delete doctor.official_name;
  const [locations, social, extra] = await Promise.all([
    c.env.DB.prepare("SELECT id, location_name, address, days_of_week FROM work_locations WHERE doctor_id = ?").bind(auth.sub).all(),
    c.env.DB.prepare("SELECT id, platform, value, visibility FROM social_links WHERE doctor_id = ?").bind(auth.sub).all(),
    c.env.DB.prepare("SELECT id, field_key, field_value, visibility FROM dynamic_fields WHERE doctor_id = ?").bind(auth.sub).all(),
  ]);
  return c.json({ ...doctor, workLocations: locations.results, socialLinks: social.results, extraFields: extra.results });
});

// GET /api/doctors/:id
doctors.get("/:id", async (c) => {
  const id = c.req.param("id");
  const member = isApprovedMember(c);
  const auth = c.get("auth" as never) as JwtPayload | undefined;

  const doctor = await c.env.DB.prepare(
    `SELECT d.id, d.public_id, d.full_name, d.specialty_main, d.city, d.phone_public, d.phone,
            d.medical_council_number, d.email, d.bio, d.avatar_key, d.card_template,
            r.student_number, r.council_number AS roster_council_number,
            COALESCE(d.imc_guid, r.imc_guid) AS imc_guid,
            COALESCE(d.imc_profile_url, r.imc_profile_url) AS imc_profile_url,
            COALESCE(d.imc_photo_url, r.imc_photo_url) AS imc_photo_url
     FROM doctors d LEFT JOIN class_roster r ON r.id = d.roster_id
     WHERE (d.id = ? OR d.public_id = ? OR d.medical_council_number = ?) AND d.status = 'approved'`
  )
    .bind(id, id, id)
    .first<Record<string, unknown>>();

  if (!doctor) return c.json({ error: "پیدا نشد" }, 404);

  if (!member) {
    delete doctor.phone; // personal number hidden from public
    delete doctor.email;
  }

  const [locations, social, extra] = await Promise.all([
    c.env.DB.prepare(
      "SELECT id, location_name, address, days_of_week FROM work_locations WHERE doctor_id = ?"
    )
      .bind(doctor.id)
      .all(),
    c.env.DB.prepare(
      "SELECT platform, value, visibility FROM social_links WHERE doctor_id = ?"
    )
      .bind(doctor.id)
      .all(),
    c.env.DB.prepare(
      "SELECT field_key, field_value, visibility FROM dynamic_fields WHERE doctor_id = ?"
    )
      .bind(doctor.id)
      .all(),
  ]);

  const owner = auth?.sub === doctor.id;
  const filterByVisibility = <T extends { visibility: string }>(rows: T[]) =>
    owner ? rows : member ? rows.filter((r) => r.visibility !== "private") : rows.filter((r) => r.visibility === "public");

  return c.json({
    ...doctor,
    workLocations: locations.results,
    socialLinks: filterByVisibility(social.results as any),
    extraFields: filterByVisibility(extra.results as any),
  });
});

// PUT /api/doctors/me  — self-service profile completion/edit
doctors.put("/me/profile", requireAuthenticated, async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const body = await c.req.json<{
    fullName?: string;
    specialtyMain?: string;
    city?: string;
    phonePublic?: string;
    medicalCouncilNumber?: string;
    email?: string;
    bio?: string;
    cardTemplate?: string;
  }>();

  await c.env.DB.prepare(
    `UPDATE doctors SET
       full_name = COALESCE(NULLIF(TRIM(?), ''), full_name),
       specialty_main = COALESCE(?, specialty_main),
       city = COALESCE(?, city),
       phone_public = COALESCE(?, phone_public),
       medical_council_number = COALESCE(?, medical_council_number),
       email = COALESCE(?, email),
       bio = COALESCE(?, bio),
       card_template = COALESCE(?, card_template),
       updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(
      body.fullName ?? null,
      body.specialtyMain ?? null,
      body.city ?? null,
      body.phonePublic ?? null,
      body.medicalCouncilNumber ?? null,
      body.email ?? null,
      body.bio ?? null,
      body.cardTemplate ?? null,
      auth.sub
    )
    .run();

  return c.json({ ok: true });
});

// POST /api/doctors/me/work-locations
doctors.post("/me/work-locations", requireAuthenticated, async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const { locationName, address, daysOfWeek } = await c.req.json<{
    locationName: string;
    address?: string;
    daysOfWeek?: string[];
  }>();

  if (!locationName?.trim()) return c.json({ error: "نام محل کار الزامی است" }, 400);
  const locationId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO work_locations (id, doctor_id, location_name, address, days_of_week)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      locationId,
      auth.sub,
      locationName,
      address ?? null,
      JSON.stringify(daysOfWeek ?? [])
    )
    .run();

  return c.json({ ok: true, id: locationId });
});

doctors.delete("/me/work-locations/:id", requireAuthenticated, async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const result = await c.env.DB.prepare("DELETE FROM work_locations WHERE id = ? AND doctor_id = ?")
    .bind(c.req.param("id"), auth.sub).run();
  if (!result.success || !result.meta.changes) return c.json({ error: "محل کار پیدا نشد" }, 404);
  return c.json({ ok: true });
});

doctors.post("/me/social-links", requireAuthenticated, async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const body = await c.req.json<{ platform?: string; value?: string; visibility?: "public" | "members" | "private" }>();
  if (!body.platform?.trim() || !body.value?.trim()) return c.json({ error: "پلتفرم و مقدار لینک الزامی است" }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO social_links (id, doctor_id, platform, value, visibility) VALUES (?, ?, ?, ?, ?)")
    .bind(id, auth.sub, body.platform.trim(), body.value.trim(), body.visibility ?? "members").run();
  return c.json({ ok: true, id });
});

doctors.delete("/me/social-links/:id", requireAuthenticated, async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const result = await c.env.DB.prepare("DELETE FROM social_links WHERE id = ? AND doctor_id = ?")
    .bind(c.req.param("id"), auth.sub).run();
  if (!result.success || !result.meta.changes) return c.json({ error: "لینک پیدا نشد" }, 404);
  return c.json({ ok: true });
});

// POST /api/doctors/me/extra-fields  { key, value, visibility }
// This is the generic "add any field" endpoint — sub-specialties, social
// links beyond the fixed platforms, family info, or anything added later
// without a schema change.
doctors.post("/me/extra-fields", requireAuthenticated, async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const { key, value, visibility } = await c.req.json<{
    key: string;
    value: string;
    visibility?: "public" | "members" | "private";
  }>();

  if (!key?.trim()) return c.json({ error: "نام فیلد الزامی است" }, 400);
  const fieldId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO dynamic_fields (id, doctor_id, field_key, field_value, visibility)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(fieldId, auth.sub, key.trim(), value, visibility ?? "members")
    .run();

  return c.json({ ok: true, id: fieldId });
});

doctors.delete("/me/extra-fields/:id", requireAuthenticated, async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const result = await c.env.DB.prepare("DELETE FROM dynamic_fields WHERE id = ? AND doctor_id = ?")
    .bind(c.req.param("id"), auth.sub).run();
  if (!result.success || !result.meta.changes) return c.json({ error: "فیلد پیدا نشد" }, 404);
  return c.json({ ok: true });
});

export default doctors;

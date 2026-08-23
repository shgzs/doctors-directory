import { Hono } from "hono";
import type { Env } from "../types";
import { extractSubdomainLabel } from "../lib/subdomain";

const resolve = new Hono<{ Bindings: Env }>();

type DoctorLite = {
  id: string;
  public_id: string | null;
  full_name: string;
  specialty_main: string | null;
  city: string | null;
};

async function findBySpecialtyAndSlug(
  env: Env,
  specialtySlug: string,
  doctorSlug: string
): Promise<DoctorLite | null> {
  const specialty = await env.DB.prepare(
    "SELECT id FROM specialties WHERE slug = ?"
  )
    .bind(specialtySlug.toLowerCase())
    .first<{ id: number }>();

  if (!specialty) return null;

  return env.DB.prepare(
    `SELECT id, public_id, full_name, specialty_main, city FROM doctors
     WHERE specialty_id = ? AND slug = ? AND status = 'approved'`
  )
    .bind(specialty.id, doctorSlug.toLowerCase())
    .first<DoctorLite>();
}

async function findById(env: Env, id: string): Promise<DoctorLite | null> {
  return env.DB.prepare(
    `SELECT id, public_id, full_name, specialty_main, city FROM doctors
     WHERE (id = ? OR public_id = ? OR medical_council_number = ?) AND status = 'approved'`
  )
    .bind(id, id, id)
    .first<DoctorLite>();
}

// Canonical, domain-agnostic lookup — always works, never depends on subdomain.
// GET /d/:id   and   GET /doctors/:id
resolve.get("/d/:id", async (c) => {
  const doctor = await findById(c.env, c.req.param("id"));
  if (!doctor) return c.json({ notFound: true }, 404);
  return c.redirect(`/app#/profile-view/${encodeURIComponent(doctor.public_id || doctor.id)}`);
});
resolve.get("/doctors/:id", async (c) => {
  const doctor = await findById(c.env, c.req.param("id"));
  if (!doctor) return c.json({ notFound: true }, 404);
  return c.redirect(`/app#/profile-view/${encodeURIComponent(doctor.public_id || doctor.id)}`);
});

// Pretty URLs — works two ways depending on the incoming host:
//   radio.logist.ir/ghasemi        -> subdomain supplies the specialty
//   any-domain.com/radio/ghasemi   -> path supplies both segments
// Same handler, same data, so behavior never depends on which domain
// happens to be pointed at the Worker.
async function handlePrettyUrl(c: any) {
  const url = new URL(c.req.url);
  const subdomainSlug = extractSubdomainLabel(url.hostname);

  let specialtySlug: string | undefined;
  let doctorSlug: string | undefined;

  if (subdomainSlug) {
    // Confirm the subdomain is actually a known specialty before treating
    // it as one — an unrelated subdomain (e.g. a future "app.logist.ir")
    // should fall through to normal path handling instead of 404ing.
    const known = await c.env.DB.prepare(
      "SELECT 1 FROM specialties WHERE slug = ?"
    )
      .bind(subdomainSlug)
      .first();

    if (known) {
      specialtySlug = subdomainSlug;
      doctorSlug = c.req.param("seg1");
    }
  }

  if (!specialtySlug) {
    // Path-based: /{specialtySlug}/{doctorSlug}
    specialtySlug = c.req.param("seg1");
    doctorSlug = c.req.param("seg2");
  }

  if (!specialtySlug || !doctorSlug) {
    return c.json({ notFound: true }, 404);
  }

  const doctor = await findBySpecialtyAndSlug(c.env, specialtySlug, doctorSlug);
  if (!doctor) return c.json({ notFound: true }, 404);

  return c.json({ doctor });
}

// Subdomain case: single path segment (radio.logist.ir/ghasemi)
resolve.get("/:seg1", handlePrettyUrl);
// Generic-domain case: two path segments (mysite.com/radio/ghasemi)
resolve.get("/:seg1/:seg2", handlePrettyUrl);

export default resolve;

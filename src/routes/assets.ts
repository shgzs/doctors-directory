import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { requireApprovedMember } from "../lib/middleware";

// Two separate routers: one mounts under /api/doctors (upload, needs auth),
// the other under /api/assets (public serving). Keeping them apart avoids
// "/api/doctors/:key" colliding with the existing "/api/doctors/:id" route.
export const avatarUpload = new Hono<{ Bindings: Env }>();
export const assetServe = new Hono<{ Bindings: Env }>();

const MAX_BYTES = 3 * 1024 * 1024; // 3MB — plenty for an avatar photo
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const SITE_ASSETS: Record<string, { key: string; contentType: string }> = {
  "group-photo": { key: "site:group-photo", contentType: "image/jpeg" },
  "university-logo": { key: "site:university-logo", contentType: "image/jpeg" },
};

// POST /api/doctors/me/avatar  (multipart/form-data, field name "file")
avatarUpload.post("/me/avatar", requireApprovedMember, async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;

  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json({ error: "فایلی ارسال نشده" }, 400);
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return c.json({ error: "فقط JPG، PNG یا WebP مجاز است" }, 400);
  }
  if (file.size > MAX_BYTES) {
    return c.json({ error: "حجم فایل باید کمتر از ۳ مگابایت باشد" }, 400);
  }

  const key = `avatar:${auth.sub}`;
  const bytes = await file.arrayBuffer();

  await c.env.ASSETS_KV.put(key, bytes, {
    metadata: { contentType: file.type },
  });

  await c.env.DB.prepare("UPDATE doctors SET avatar_key = ? WHERE id = ?")
    .bind(key, auth.sub)
    .run();

  return c.json({ ok: true, url: `/api/assets/${encodeURIComponent(key)}` });
});

// POST /api/doctors/me/photos — add a photo to the profile gallery.
avatarUpload.post("/me/photos", requireApprovedMember, async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) return c.json({ error: "فایلی ارسال نشده" }, 400);
  if (!ALLOWED_TYPES.has(file.type)) return c.json({ error: "فقط JPG، PNG یا WebP مجاز است" }, 400);
  if (file.size > MAX_BYTES) return c.json({ error: "حجم فایل باید کمتر از ۳ مگابایت باشد" }, 400);

  const photoId = crypto.randomUUID();
  const key = `photo:${auth.sub}:${photoId}`;
  await c.env.ASSETS_KV.put(key, await file.arrayBuffer(), { metadata: { contentType: file.type } });
  const count = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM doctor_photos WHERE doctor_id = ?")
    .bind(auth.sub).first<{ count: number }>();
  const primary = Number(count?.count || 0) === 0 ? 1 : 0;
  await c.env.DB.prepare(
    "INSERT INTO doctor_photos (id, doctor_id, asset_key, is_primary) VALUES (?, ?, ?, ?)"
  ).bind(photoId, auth.sub, key, primary).run();
  if (primary) await c.env.DB.prepare("UPDATE doctors SET avatar_key = ? WHERE id = ?").bind(key, auth.sub).run();
  return c.json({ ok: true, id: photoId, key, primary: Boolean(primary) });
});

avatarUpload.delete("/me/photos/:id", requireApprovedMember, async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const photo = await c.env.DB.prepare("SELECT asset_key, is_primary FROM doctor_photos WHERE id = ? AND doctor_id = ?")
    .bind(c.req.param("id"), auth.sub).first<{ asset_key: string; is_primary: number }>();
  if (!photo) return c.json({ error: "عکس پیدا نشد" }, 404);
  await c.env.DB.prepare("DELETE FROM doctor_photos WHERE id = ? AND doctor_id = ?").bind(c.req.param("id"), auth.sub).run();
  await c.env.ASSETS_KV.delete(photo.asset_key);
  if (photo.is_primary) {
    const next = await c.env.DB.prepare("SELECT id, asset_key FROM doctor_photos WHERE doctor_id = ? ORDER BY sort_order, created_at LIMIT 1")
      .bind(auth.sub).first<{ id: string; asset_key: string }>();
    if (next) {
      await c.env.DB.prepare("UPDATE doctor_photos SET is_primary = 1 WHERE id = ?").bind(next.id).run();
      await c.env.DB.prepare("UPDATE doctors SET avatar_key = ? WHERE id = ?").bind(next.asset_key, auth.sub).run();
    } else await c.env.DB.prepare("UPDATE doctors SET avatar_key = NULL WHERE id = ?").bind(auth.sub).run();
  }
  return c.json({ ok: true });
});

avatarUpload.patch("/me/photos/:id/primary", requireApprovedMember, async (c) => {
  const auth = c.get("auth" as never) as JwtPayload;
  const photo = await c.env.DB.prepare("SELECT asset_key FROM doctor_photos WHERE id = ? AND doctor_id = ?")
    .bind(c.req.param("id"), auth.sub).first<{ asset_key: string }>();
  if (!photo) return c.json({ error: "عکس پیدا نشد" }, 404);
  await c.env.DB.prepare("UPDATE doctor_photos SET is_primary = 0 WHERE doctor_id = ?").bind(auth.sub).run();
  await c.env.DB.prepare("UPDATE doctor_photos SET is_primary = 1 WHERE id = ?").bind(c.req.param("id")).run();
  await c.env.DB.prepare("UPDATE doctors SET avatar_key = ? WHERE id = ?").bind(photo.asset_key, auth.sub).run();
  return c.json({ ok: true });
});

// GET /api/assets/site/:name — fixed, public assets used by the home page.
// Keep this route before /:key because Hono matches routes in declaration order.
assetServe.get("/site/:name", async (c) => {
  const asset = SITE_ASSETS[c.req.param("name")];
  if (!asset) return c.json({ error: "پیدا نشد" }, 404);

  const value = await c.env.ASSETS_KV.get(asset.key, { type: "arrayBuffer" });
  if (!value) return c.json({ error: "فایل هنوز بارگذاری نشده" }, 404);

  return new Response(value, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
});

// GET /api/assets/:key  — public, serves the stored image with correct content-type
assetServe.get("/:key", async (c) => {
  const key = c.req.param("key");

  const result = await c.env.ASSETS_KV.getWithMetadata<{ contentType?: string }>(
    key,
    { type: "arrayBuffer" }
  );

  if (!result || !result.value) {
    return c.json({ error: "پیدا نشد" }, 404);
  }

  return new Response(result.value, {
    headers: {
      "Content-Type": result.metadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

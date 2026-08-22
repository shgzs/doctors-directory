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

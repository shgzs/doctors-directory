import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { attachAuth } from "./lib/middleware";

import authRoutes from "./routes/auth";
import doctorRoutes from "./routes/doctors";
import referralRoutes from "./routes/referrals";
import recommendationRequestRoutes from "./routes/recommendation-requests";
import adminRoutes from "./routes/admin";
import resolveRoutes from "./routes/resolve";
import { avatarUpload, assetServe } from "./routes/assets";
import uiRoutes from "./routes/ui-modern";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors()); // tighten to your real frontend origin before going live
app.use("*", attachAuth);

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/app", uiRoutes);

app.route("/api/auth", authRoutes);
app.route("/api/doctors", doctorRoutes);
app.route("/api/referrals", referralRoutes);
app.route("/api/recommendation-requests", recommendationRequestRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/doctors", avatarUpload); // adds POST /api/doctors/me/avatar
app.route("/api/assets", assetServe);    // adds GET /api/assets/:key

// ---- Public profile URL resolution ----
// Registered AFTER /api/* so those always win. Order inside resolve.ts
// matters too: most specific paths first, generic catch-alls last. This
// is what lets the same Worker sit behind logist.ir (with pretty
// subdomains) or any other domain (falling back to plain paths) without
// ever hard-erroring.
app.get("/", (c) => c.redirect("/app"));
app.route("/", resolveRoutes);

// Nothing matched at all -> friendly 404, never a raw server error.
app.notFound((c) => c.json({ notFound: true, message: "صفحه پیدا نشد" }, 404));

// Surface real error messages instead of a bare "Internal Server Error" —
// makes local debugging much faster. The full stack trace still prints to
// the terminal running `wrangler dev`; consider trimming `message` before
// going to production if you don't want internals exposed publicly.
app.onError((err, c) => {
  console.error(err);
  return c.json(
    {
      error: "خطای داخلی سرور",
      ...(c.env.DEBUG_MODE === "true"
        ? { message: err instanceof Error ? err.message : String(err) }
        : {}),
    },
    500
  );
});

export default app;

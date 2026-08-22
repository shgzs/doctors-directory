import type { Context, Next } from "hono";
import type { Env, JwtPayload } from "../types";
import { verifyJwt } from "./jwt";

// Reads the Bearer token if present and stashes the payload on context.
// Does NOT block the request — routes decide what "no auth" means for them.
export async function attachAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = await verifyJwt<JwtPayload>(token, c.env.JWT_SECRET);
    if (payload) {
      c.set("auth" as never, payload as never);
    }
  }
  await next();
}

// Requires a valid, approved member (or admin).
export async function requireApprovedMember(c: Context, next: Next) {
  const auth = c.get("auth" as never) as JwtPayload | undefined;
  if (!auth || auth.status !== "approved") {
    return c.json({ error: "ورود یا تایید عضویت لازم است" }, 401);
  }
  await next();
}

export async function requireAuthenticated(c: Context, next: Next) {
  const auth = c.get("auth" as never) as JwtPayload | undefined;
  if (!auth) return c.json({ error: "ورود لازم است" }, 401);
  await next();
}

export async function requireAdmin(c: Context, next: Next) {
  const auth = c.get("auth" as never) as JwtPayload | undefined;
  if (!auth || auth.role !== "admin") {
    return c.json({ error: "فقط برای ادمین" }, 403);
  }
  await next();
}

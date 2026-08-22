export type Env = {
  DB: D1Database;
  OTP_KV: KVNamespace;
  ASSETS_KV: KVNamespace; // stores uploaded images (avatar, etc.)

  // secrets
  MELIPAYAMAK_USERNAME: string;
  MELIPAYAMAK_PASSWORD: string;
  MELIPAYAMAK_SENDER: string;
  JWT_SECRET: string;

  // plain vars
  DEBUG_MODE?: string; // "true" -> enable OTP and diagnostic debug output
};

export type JwtPayload = {
  sub: string;      // doctor id
  role: "member" | "admin";
  status: "pending" | "approved" | "rejected";
  exp: number;
};

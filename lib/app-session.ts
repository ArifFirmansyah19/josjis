import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const APP_SESSION_COOKIE = "josjis_app_session";
export const APP_SESSION_TTL_SECONDS = 6 * 60 * 60;

export function createAppSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashAppSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hasValidAppSession(
  userId: string,
  token: string,
): Promise<boolean> {
  if (!userId || !token) return false;

  const tokenHash = hashAppSessionToken(token);

  const { data, error } = await supabaseAdmin
    .from("user_sessions")
    .select("user_id")
    .eq("user_id", userId)
    .eq("session_token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error("Gagal memvalidasi sesi aplikasi:", error.message);
    return false;
  }

  return Boolean(data);
}

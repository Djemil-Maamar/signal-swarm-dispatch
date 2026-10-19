import { sha256Hex } from "./sms";

/** Verify X-Device-Token header; returns device id or null. */
export async function authenticateDevice(request: Request) {
  const token = request.headers.get("x-device-token") ?? "";
  if (!token.startsWith("gw_")) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = await sha256Hex(token);
  const { data } = await supabaseAdmin.from("devices").select("id").eq("token_hash", hash).maybeSingle();
  if (!data) return null;
  await supabaseAdmin.from("devices").update({ last_seen: new Date().toISOString() }).eq("id", data.id);
  return { deviceId: data.id, supabaseAdmin };
}

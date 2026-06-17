import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Claim this device as the active session for the current user.
// Admins are exempt — they may sign in from multiple devices.
export const claimSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().min(8) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleRow) return { admin: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .update({ active_session_id: data.sessionId })
      .eq("id", userId);
    return { admin: false };
  });

// Verify the device's stored session id still matches the active one.
export const verifySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().min(8) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleRow) return { valid: true, admin: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("active_session_id")
      .eq("id", userId)
      .maybeSingle();
    return { valid: prof?.active_session_id === data.sessionId, admin: false };
  });

// Heartbeat — updates last_seen_at, records the caller IP, and reports whether
// the account is suspended so the client can sign the user out.
export const heartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Capture IP (trust x-forwarded-for since we run behind a proxy).
    let ip = getRequestIP({ xForwardedFor: true }) ?? "";
    if (!ip) {
      ip = getRequestHeader("cf-connecting-ip")
        ?? getRequestHeader("x-real-ip")
        ?? (getRequestHeader("x-forwarded-for") ?? "").split(",")[0].trim()
        ?? "";
    }
    const ua = getRequestHeader("user-agent") ?? null;
    const now = new Date().toISOString();

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .update({ last_seen_at: now })
      .eq("id", userId)
      .select("suspended_at")
      .maybeSingle();

    if (ip) {
      // Upsert by (user_id, ip). If exists, bump last_seen + count.
      const { data: existing } = await supabaseAdmin
        .from("login_events")
        .select("id, hit_count")
        .eq("user_id", userId)
        .eq("ip", ip)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin
          .from("login_events")
          .update({
            last_seen_at: now,
            hit_count: (existing.hit_count ?? 0) + 1,
            user_agent: ua,
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin
          .from("login_events")
          .insert({ user_id: userId, ip, user_agent: ua });
      }
    }

    const suspended = !!prof?.suspended_at;
    return { ok: true, suspended };
  });

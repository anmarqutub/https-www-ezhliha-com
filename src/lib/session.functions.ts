import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_AUTO_DEVICES = 2;

function getClientIp(): string {
  let ip = getRequestIP({ xForwardedFor: true }) ?? "";
  if (!ip) {
    ip = getRequestHeader("cf-connecting-ip")
      ?? getRequestHeader("x-real-ip")
      ?? (getRequestHeader("x-forwarded-for") ?? "").split(",")[0].trim()
      ?? "";
  }
  return ip;
}

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

// Device identity is keyed on the browser-persistent sessionId (stored in
// localStorage on the client). IP is NOT part of the identity — public IPs
// rotate (Wi‑Fi ↔ cellular, DHCP, carrier NAT) and would otherwise sign the
// user out and burn through the device limit on every network change.
function deviceKey(_ip: string | null, sid: string): string {
  return `sid:${sid}`;
}

// Claim this device. Returns the device's status:
//   - "approved": ok to use
//   - "pending":  3rd+ device, awaiting admin approval
//   - "admin":    user is admin (bypasses device limit)
export const claimSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().min(8) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (await isAdmin(supabase, userId)) return { status: "admin" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ua = getRequestHeader("user-agent") ?? null;
    const ip = getClientIp() || null;
    const key = deviceKey(ip, data.sessionId);
    const now = new Date().toISOString();

    // Existing device (matched by IP-based key)?
    const { data: existing } = await supabaseAdmin
      .from("user_devices")
      .select("id, approved")
      .eq("user_id", userId)
      .eq("device_sid", key)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("user_devices")
        .update({ last_seen_at: now, user_agent: ua, ip })
        .eq("id", existing.id);
      return { status: existing.approved ? ("approved" as const) : ("pending" as const) };
    }

    // Count currently approved devices for this user (sid-keyed).
    const { count } = await supabaseAdmin
      .from("user_devices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("approved", true)
      .like("device_sid", "sid:%");

    const autoApprove = (count ?? 0) < MAX_AUTO_DEVICES;

    await supabaseAdmin.from("user_devices").insert({
      user_id: userId,
      device_sid: key,
      user_agent: ua,
      ip,
      approved: autoApprove,
      approved_at: autoApprove ? now : null,
    });

    return { status: autoApprove ? ("approved" as const) : ("pending" as const) };
  });

// Check whether this device is still approved. If no device row exists for
// this sid yet (first load of an existing signed-in session, or legacy
// ip:-keyed rows from before we switched to sid), auto-claim / migrate so
// users aren't kicked out with a spurious "revoked" toast.
export const verifySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().min(8) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (await isAdmin(supabase, userId)) {
      return { valid: true, admin: true, status: "admin" as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = getClientIp() || null;
    const ua = getRequestHeader("user-agent") ?? null;
    const key = deviceKey(ip, data.sessionId);
    const now = new Date().toISOString();

    const { data: dev } = await supabaseAdmin
      .from("user_devices")
      .select("id, approved")
      .eq("user_id", userId)
      .eq("device_sid", key)
      .maybeSingle();

    if (dev) {
      if (dev.approved) {
        await supabaseAdmin
          .from("user_devices")
          .update({ last_seen_at: now })
          .eq("id", dev.id);
        return { valid: true, admin: false, status: "approved" as const };
      }
      return { valid: false, admin: false, status: "pending" as const };
    }

    // Migrate a legacy ip:-keyed row if one exists, preserving approval.
    const { data: legacy } = await supabaseAdmin
      .from("user_devices")
      .select("id, approved")
      .eq("user_id", userId)
      .like("device_sid", "ip:%")
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (legacy) {
      await supabaseAdmin
        .from("user_devices")
        .update({ device_sid: key, last_seen_at: now, user_agent: ua, ip })
        .eq("id", legacy.id);
      return {
        valid: !!legacy.approved,
        admin: false,
        status: legacy.approved ? ("approved" as const) : ("pending" as const),
      };
    }

    // No prior record — auto-claim under the device limit.
    const { count } = await supabaseAdmin
      .from("user_devices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("approved", true)
      .like("device_sid", "sid:%");

    const autoApprove = (count ?? 0) < MAX_AUTO_DEVICES;
    await supabaseAdmin.from("user_devices").insert({
      user_id: userId,
      device_sid: key,
      user_agent: ua,
      ip,
      approved: autoApprove,
      approved_at: autoApprove ? now : null,
    });
    return {
      valid: autoApprove,
      admin: false,
      status: autoApprove ? ("approved" as const) : ("pending" as const),
    };
  });

// Heartbeat — last_seen_at on profile, IP tracking, suspension check.
export const heartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ip = getClientIp();
    const ua = getRequestHeader("user-agent") ?? null;
    const now = new Date().toISOString();

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .update({ last_seen_at: now })
      .eq("id", userId)
      .select("suspended_at")
      .maybeSingle();

    if (ip) {
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

    return { ok: true, suspended: !!prof?.suspended_at };
  });

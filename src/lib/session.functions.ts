import { createServerFn } from "@tanstack/react-start";
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

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Verify caller is admin via RLS-respecting client
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      throw new Response("Forbidden", { status: 403 });
    }

    // Use admin client to enumerate all auth users (for last_sign_in_at)
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authErr) throw new Response(authErr.message, { status: 500 });

    const ids = authData.users.map((u) => u.id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, city, email, created_at")
      .in("id", ids);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const rolesMap = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesMap.set(r.user_id, arr);
    });

    const users = authData.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed: !!u.email_confirmed_at,
      profile: profileMap.get(u.id) ?? null,
      roles: rolesMap.get(u.id) ?? [],
    }));

    return {
      total: users.length,
      admins: users.filter((u) => u.roles.includes("admin")).length,
      users: users.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    };
  });

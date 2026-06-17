import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      throw new Response("Forbidden", { status: 403 });
    }

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authErr) throw new Response(authErr.message, { status: 500 });

    const ids = authData.users.map((u) => u.id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, city, email, created_at, last_seen_at")
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

// Promotes the current user to admin if NO admin exists yet.
// Safe one-time bootstrap for the project owner.
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Response(cErr.message, { status: 500 });
    if ((count ?? 0) > 0) {
      throw new Response("Admin already exists", { status: 409 });
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (error) throw new Response(error.message, { status: 500 });
    return { success: true };
  });

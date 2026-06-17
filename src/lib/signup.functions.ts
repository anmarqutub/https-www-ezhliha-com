import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const createUser = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(6).max(72),
      full_name: z.string().trim().min(1).max(120),
      phone: z.string().trim().max(30).optional().or(z.literal("")),
      city: z.string().trim().max(80).optional().or(z.literal("")),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    // Check if email already exists in auth
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    const emailTaken = existing.users?.some(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase()
    );
    if (emailTaken) {
      throw new Response("هذا الإيميل مسجل مسبقًا", { status: 400 });
    }

    const { data: created, error: uErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        phone: data.phone || null,
        city: data.city || null,
      },
    });
    if (uErr || !created.user) {
      throw new Response(uErr?.message ?? "تعذر إنشاء الحساب", { status: 400 });
    }

    // Create profile row
    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: created.user.id,
        full_name: data.full_name,
        phone: data.phone || null,
        city: data.city || null,
      });
    if (pErr) {
      // best-effort cleanup
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Response("تعذر إكمال التسجيل، حاول مجددًا", { status: 500 });
    }

    return { ok: true };
  });

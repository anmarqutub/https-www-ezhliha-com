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
      code: z.string().trim().min(4).max(40),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const codeNorm = data.code.trim().toUpperCase();

    // 1) Validate code exists and is unused
    const { data: codeRow, error: cErr } = await supabaseAdmin
      .from("purchase_codes")
      .select("id, used_at")
      .eq("code", codeNorm)
      .maybeSingle();
    if (cErr) throw new Response("تعذر التحقق من الكود", { status: 500 });
    if (!codeRow) throw new Response("كود الشراء غير صحيح", { status: 400 });
    if (codeRow.used_at) throw new Response("كود الشراء مستخدم مسبقًا", { status: 400 });

    // 2) Check email not taken
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const emailTaken = existing.users?.some(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase()
    );
    if (emailTaken) {
      throw new Response("هذا الإيميل مسجل مسبقًا", { status: 400 });
    }

    // 3) Create auth user
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

    // 4) Create profile
    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: created.user.id,
        full_name: data.full_name,
        phone: data.phone || null,
        city: data.city || null,
      });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Response("تعذر إكمال التسجيل، حاول مجددًا", { status: 500 });
    }

    // 5) Mark code as used (atomic guard: only update if still unused)
    const { data: claimed, error: clErr } = await supabaseAdmin
      .from("purchase_codes")
      .update({ used_at: new Date().toISOString(), used_by: created.user.id, email: data.email })
      .eq("id", codeRow.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (clErr || !claimed) {
      // race: someone else claimed it — rollback user
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Response("كود الشراء مستخدم مسبقًا", { status: 400 });
    }

    return { ok: true };
  });


import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function fieldError(field: string, message: string): never {
  throw new Error(JSON.stringify({ field, message }));
}

export const createUser = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صالح").max(255),
      password: z.string().min(6, "كلمة المرور ٦ أحرف على الأقل").max(72),
      full_name: z.string().trim().min(1, "الاسم مطلوب").max(120),
      phone: z
        .string()
        .trim()
        .regex(/^(05\d{8}|9665\d{8}|\+[1-9]\d{6,14})$/, "رقم الجوال غير صحيح"),
      city: z.string().trim().min(1, "المدينة مطلوبة").max(80),
      code: z.string().trim().min(4, "كود الشراء مطلوب").max(40),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const codeNorm = data.code.trim().toUpperCase();

    // 1) Validate code
    const { data: codeRow, error: cErr } = await supabaseAdmin
      .from("purchase_codes")
      .select("id, used_at")
      .eq("code", codeNorm)
      .maybeSingle();
    if (cErr) fieldError("code", "تعذر التحقق من الكود");
    if (!codeRow) fieldError("code", "كود الشراء غير صحيح");
    if (codeRow.used_at) fieldError("code", "كود الشراء مستخدم مسبقًا");

    // 2) Email uniqueness
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailTaken = existing.users?.some(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase()
    );
    if (emailTaken) fieldError("email", "هذا الإيميل مسجل مسبقًا");

    // 3) Phone uniqueness
    const { data: phoneRow } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();
    if (phoneRow) fieldError("phone", "رقم الجوال مسجل مسبقًا");

    // 4) Create auth user
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
    if (uErr || !created.user) fieldError("email", uErr?.message ?? "تعذر إنشاء الحساب");

    // 5) Profile is auto-created via on_auth_user_created trigger from user_metadata.
    // Best-effort sync — do NOT fail signup if this update errors.
    try {
      await supabaseAdmin
        .from("profiles")
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
          city: data.city || null,
        })
        .eq("id", created.user.id);
    } catch (e) {
      console.warn("[signup] profile update failed (non-fatal):", e);
    }

    // 6) Claim code atomically
    const { data: claimed, error: clErr } = await supabaseAdmin
      .from("purchase_codes")
      .update({ used_at: new Date().toISOString(), used_by: created.user.id, email: data.email })
      .eq("id", codeRow.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (clErr || !claimed) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      fieldError("code", "كود الشراء مستخدم مسبقًا");
    }

    return { ok: true };
  });

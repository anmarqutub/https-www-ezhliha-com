import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function randCode(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function ensureAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const generateCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      count: z.number().int().min(1).max(100),
      email: z.string().email().optional().or(z.literal("")),
      note: z.string().max(200).optional().or(z.literal("")),
      customer_name: z.string().max(120).optional().or(z.literal("")),
      customer_phone: z.string().max(30).optional().or(z.literal("")),
      salla_order_id: z.string().max(60).optional().or(z.literal("")),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const rows = Array.from({ length: data.count }, () => ({
      code: randCode(),
      email: data.email || null,
      note: data.note || null,
      customer_name: data.customer_name || null,
      customer_phone: data.customer_phone || null,
      salla_order_id: data.salla_order_id || null,
    }));
    const { data: inserted, error } = await supabaseAdmin
      .from("purchase_codes")
      .insert(rows)
      .select("*");
    if (error) throw new Response(error.message, { status: 500 });
    return { codes: inserted };
  });


export const listCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("purchase_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Response(error.message, { status: 500 });
    return { codes: data ?? [] };
  });

export const deleteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { error } = await supabaseAdmin.from("purchase_codes").delete().eq("id", data.id);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

// Public: redeem a code → create the auth user → mark code used.
// Signups are disabled at auth level, so this is the only path in.
export const redeemCode = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      code: z.string().trim().min(4).max(40),
      email: z.string().email(),
      password: z.string().min(6).max(72),
      full_name: z.string().trim().min(1).max(120),
      phone: z.string().trim().max(30).optional().or(z.literal("")),
      city: z.string().trim().max(80).optional().or(z.literal("")),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const codeKey = data.code.trim().toUpperCase();
    const { data: codeRow, error: cErr } = await supabaseAdmin
      .from("purchase_codes")
      .select("*")
      .eq("code", codeKey)
      .maybeSingle();
    if (cErr) throw new Response(cErr.message, { status: 500 });
    if (!codeRow) throw new Response("الكود غير صحيح", { status: 400 });
    if (codeRow.used_at) throw new Response("هذا الكود مستخدم مسبقًا", { status: 400 });
    if (codeRow.email && codeRow.email.toLowerCase() !== data.email.toLowerCase()) {
      throw new Response("هذا الكود مخصص لبريد إلكتروني آخر", { status: 400 });
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

    const { error: mErr } = await supabaseAdmin
      .from("purchase_codes")
      .update({ used_at: new Date().toISOString(), used_by: created.user.id })
      .eq("id", codeRow.id)
      .is("used_at", null);
    if (mErr) {
      // best-effort: delete the user if marking failed (race)
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Response("تعذر إكمال التسجيل، حاول مجددًا", { status: 500 });
    }

    return { ok: true };
  });

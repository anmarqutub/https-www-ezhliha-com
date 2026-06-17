import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const listCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("purchase_codes")
      .select("id, code, note, email, customer_name, customer_phone, used_at, used_by, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Response(error.message, { status: 500 });
    return { codes: data ?? [] };
  });

export const generateCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      count: z.number().int().min(1).max(200),
      note: z.string().trim().max(200).optional().or(z.literal("")),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const rows: { code: string; note: string | null }[] = [];
    for (let i = 0; i < data.count; i++) {
      rows.push({ code: randomCode(8), note: data.note || null });
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("purchase_codes")
      .insert(rows)
      .select("code");
    if (error) throw new Response(error.message, { status: 500 });
    return { codes: inserted ?? [] };
  });

export const deleteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("purchase_codes").delete().eq("id", data.id);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

export const createSallaOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      customer_name: z.string().trim().min(1).max(120),
      customer_phone: z.string().trim().min(5).max(30),
      salla_order_id: z.string().trim().min(1).max(60),
      email: z.string().trim().email().max(255).optional().or(z.literal("")),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(8);
      const { data: row, error } = await supabaseAdmin
        .from("purchase_codes")
        .insert({
          code,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          salla_order_id: data.salla_order_id,
          email: data.email || null,
          note: `طلب سلة #${data.salla_order_id}`,
        })
        .select("id, code, customer_name, customer_phone, salla_order_id, email, created_at")
        .single();
      if (!error) return { order: row };
      if (!/duplicate|unique/i.test(error.message)) {
        throw new Response(error.message, { status: 500 });
      }
    }
    throw new Response("تعذر توليد كود فريد، حاول مجدداً", { status: 500 });
  });

export const listSallaOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("purchase_codes")
      .select("id, code, customer_name, customer_phone, salla_order_id, email, used_at, used_by, created_at")
      .not("salla_order_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Response(error.message, { status: 500 });
    return { orders: data ?? [] };
  });

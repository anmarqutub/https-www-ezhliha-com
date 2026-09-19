import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicProvider = {
  id: string;
  name: string;
  description: string | null;
  cityName: string | null;
  subName: string | null;
  categoryName: string | null;
  coverUrl: string | null;
  rating: number | null;
  reviewsCount: number;
};

/** بيانات عامة مختصرة لمزوّدة واحدة — تُستخدم في صفحة المشاركة /p/$id */
export const getPublicProvider = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<PublicProvider | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: p } = await supabaseAdmin
      .from("providers")
      .select("id,name,description,logo_url,rating,city_id,subcategory_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!p) return null;

    const [{ data: city }, { data: sub }, { data: imgs }, { count }] = await Promise.all([
      supabaseAdmin.from("cities").select("name_ar").eq("id", p.city_id).maybeSingle(),
      supabaseAdmin.from("subcategories").select("name_ar,category_id").eq("id", p.subcategory_id).maybeSingle(),
      supabaseAdmin
        .from("provider_images")
        .select("image_url,sort_order")
        .eq("provider_id", p.id)
        .order("sort_order", { ascending: true })
        .limit(1),
      supabaseAdmin.from("reviews").select("id", { count: "exact", head: true }).eq("provider_id", p.id),
    ]);

    let categoryName: string | null = null;
    if (sub?.category_id) {
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("name_ar")
        .eq("id", sub.category_id)
        .maybeSingle();
      categoryName = cat?.name_ar ?? null;
    }

    const firstImg = imgs?.[0]?.image_url ?? null;
    const cover = [firstImg, p.logo_url].find((u) => typeof u === "string" && /^https:\/\//.test(u)) ?? null;

    return {
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      cityName: city?.name_ar ?? null,
      subName: sub?.name_ar ?? null,
      categoryName,
      coverUrl: cover as string | null,
      rating: p.rating ?? null,
      reviewsCount: count ?? 0,
    };
  });

/** روابط عامة لخريطة الموقع */
export const getSitemapProviders = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("providers").select("id,updated_at").limit(2000);
  return (data ?? []) as Array<{ id: string; updated_at: string | null }>;
});

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MediaThumb, type MediaItem } from "@/components/MediaThumb";

export const Route = createFileRoute("/provider/$id/service/$serviceId")({
  component: ServiceDetailPage,
  head: () => ({
    meta: [
      { title: "تفاصيل الخدمة — إزهليها" },
      { name: "description", content: "تفاصيل الخدمة وصور ومقاطع مقدم الخدمة على منصة إزهليها." },
      { property: "og:title", content: "تفاصيل الخدمة — إزهليها" },
      { property: "og:description", content: "تفاصيل الخدمة وصور ومقاطع مقدم الخدمة." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Service = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  price: string | null;
  image_url: string | null;
  images: MediaItem[] | null;
  videos: MediaItem[] | null;
};

function ServiceDetailPage() {
  const { id, serviceId } = Route.useParams();
  const [service, setService] = useState<Service | null>(null);
  const [providerName, setProviderName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: sv }, { data: pv }] = await Promise.all([
        supabase
          .from("services")
          .select("id,provider_id,name,description,price,image_url,images,videos")
          .eq("id", serviceId)
          .maybeSingle(),
        supabase.from("providers").select("name").eq("id", id).maybeSingle(),
      ]);
      if (!alive) return;
      setService((sv as Service) ?? null);
      setProviderName((pv?.name as string) ?? "");
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id, serviceId]);

  if (loading) return <div className="sv-wrap"><p className="sv-muted">جارٍ التحميل…</p></div>;
  if (!service) return <div className="sv-wrap"><p className="sv-muted">لم يتم العثور على الخدمة.</p></div>;

  const images = (service.images ?? []).filter((m) => m?.url);
  if (service.image_url) images.unshift({ url: service.image_url });
  const videos = (service.videos ?? []).filter((m) => m?.url);

  return (
    <div className="sv-wrap" dir="rtl">
      <Link to="/provider/$id" params={{ id }} className="sv-back">→ رجوع إلى {providerName || "مقدم الخدمة"}</Link>

      <header className="sv-head">
        <span className="sv-eyebrow">خدمة من {providerName}</span>
        <h1>{service.name}</h1>
        {service.price && <strong className="sv-price">{service.price}</strong>}
        {service.description && <p className="sv-desc">{service.description}</p>}
      </header>

      {images.length > 0 && (
        <section className="sv-sec">
          <h2>الصور</h2>
          <div className="sv-grid">
            {images.map((im, i) => (
              <MediaThumb key={`i${i}`} url={im.url} thumbnailUrl={im.thumbnail_url ?? null} isVideo={false} />
            ))}
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="sv-sec">
          <h2>المقاطع</h2>
          <div className="sv-grid">
            {videos.map((v, i) => (
              <MediaThumb key={`v${i}`} url={v.url} thumbnailUrl={v.thumbnail_url ?? null} isVideo />
            ))}
          </div>
        </section>
      )}

      {images.length === 0 && videos.length === 0 && (
        <p className="sv-muted">لم تُضف صور أو مقاطع لهذه الخدمة بعد.</p>
      )}

      <style>{`
        .sv-wrap { max-width:1100px; margin:0 auto; padding:26px 18px 70px; }
        .sv-back { display:inline-block; color:#660000; font-size:13.5px; margin-bottom:14px; text-decoration:none; }
        .sv-head { border-bottom:1px solid #EBE2D2; padding-bottom:18px; margin-bottom:22px; }
        .sv-eyebrow { color:#9A8878; font-size:12.5px; letter-spacing:.02em; }
        .sv-head h1 { font-size:26px; margin:6px 0 8px; color:#241C1A; }
        .sv-price { display:block; color:#660000; font-size:15px; margin-bottom:8px; }
        .sv-desc { color:#6F615A; font-size:14px; line-height:1.9; margin:0; max-width:760px; }
        .sv-sec { margin-top:26px; }
        .sv-sec h2 { font-size:17px; color:#241C1A; margin:0 0 12px; }
        .sv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:12px; }
        .sv-muted { color:#8A7A70; font-size:14px; }
        @media (max-width:640px) { .sv-grid { grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); } .sv-head h1 { font-size:21px; } }
      `}</style>
    </div>
  );
}

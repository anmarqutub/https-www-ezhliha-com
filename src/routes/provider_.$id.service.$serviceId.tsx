import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MediaThumb, type MediaItem } from "@/components/MediaThumb";
import { waLink } from "@/routes/index";

export const Route = createFileRoute("/provider_/$id/service/$serviceId")({
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

function arValidity(message: string) {
  return {
    onInvalid: (e: React.InvalidEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      e.currentTarget.setCustomValidity(message),
    onInput: (e: React.FormEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      e.currentTarget.setCustomValidity(""),
  } as const;
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

function ServiceDetailPage() {
  const { id, serviceId } = Route.useParams();
  const [service, setService] = useState<Service | null>(null);
  const [providerName, setProviderName] = useState("");
  const [providerWa, setProviderWa] = useState<string | null>(null);
  const [cities, setCities] = useState<{ id: string; name_ar: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [qDate, setQDate] = useState("");
  const [qCity, setQCity] = useState("");
  const [qGuests, setQGuests] = useState("");
  const [qNotes, setQNotes] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: sv }, { data: pv }, { data: ct }] = await Promise.all([
        supabase
          .from("services")
          .select("id,provider_id,name,description,price,image_url,images,videos")
          .eq("id", serviceId)
          .maybeSingle(),
        supabase.from("providers").select("name,whatsapp").eq("id", id).maybeSingle(),
        supabase.from("cities").select("id,name_ar").eq("active", true).order("sort_order"),
      ]);
      if (!alive) return;
      setService((sv as Service) ?? null);
      setProviderName(((pv as any)?.name as string) ?? "");
      setProviderWa(((pv as any)?.whatsapp as string) ?? null);
      setCities((ct as any[]) ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id, serviceId]);

  const submitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    const fmtDate = (v: string) => {
      if (!v) return "";
      const [y, m, d] = v.split("-");
      return `${d}/${m}/${y}`;
    };
    const lines = [
      "مرحبا .. جايتك من موقع ازهليها",
      "",
      `ابي استفسر عن الاسعار لديكم في: ${providerName}`,
      `• الخدمة: ${service?.name ?? ""}`,
      "",
      `• تاريخ المناسبة: ${fmtDate(qDate)}`,
      `• المدينة: ${qCity || "-"}`,
      `• عدد الضيوف: ${qGuests}`,
      `• الوصف: ${qNotes}`,
    ];
    const url = waLink(providerWa, lines.join("\n"));
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    setQuoteOpen(false);
  };

  if (loading) return <div className="sv-wrap"><p className="sv-muted">جارٍ التحميل…</p></div>;
  if (!service) return <div className="sv-wrap"><p className="sv-muted">لم يتم العثور على الخدمة.</p></div>;

  const images = (service.images ?? []).filter((m) => m?.url);
  if (service.image_url) images.unshift({ url: service.image_url });
  const videos = (service.videos ?? []).filter((m) => m?.url);

  return (
    <div className="sv-wrap" dir="rtl">
      <Link to="/provider/$id" params={{ id }} className="sv-back">→ رجوع إلى {providerName || "مقدم الخدمة"}</Link>

      <div className="sv-cols">
        <div className="sv-main">
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
        </div>

        <aside className="sv-aside">
          <div className="sv-quote-card">
            <span className="sv-quote-eyebrow">لمناسبتكِ القادمة</span>
            <strong>اطلب تسعيرة مرتبة من {providerName}</strong>
            <p>أرسل التفاصيل، ويوصلك السعر المناسب بعد مراجعة الخدمة والموعد.</p>
            {providerWa && (
              <button type="button" className="sv-btn-quote" onClick={() => setQuoteOpen(true)}>
                <SendIcon />
                <span>اطلب تسعيرة</span>
              </button>
            )}
          </div>
        </aside>
      </div>

      {quoteOpen && (
        <div className="sv-overlay" onClick={() => setQuoteOpen(false)}>
          <form className="sv-quote" onClick={(e) => e.stopPropagation()} onSubmit={submitQuote}>
            <div className="sv-quote-head">
              <span className="sv-quote-tag">طلب مخصص</span>
              <button type="button" className="sv-quote-close" onClick={() => setQuoteOpen(false)} aria-label="إغلاق">×</button>
            </div>
            <h3 className="sv-quote-title">أرسلي تفاصيل طلبكِ إلى {providerName}</h3>
            <p className="sv-quote-sub">الخدمة المطلوبة: {service.name}</p>

            <div className="sv-quote-grid">
              <label className="sv-field">
                <span>تاريخ المناسبة <b>*</b></span>
                <input type="date" required value={qDate} onChange={(e) => setQDate(e.target.value)} {...arValidity("اختاري تاريخ المناسبة")} />
              </label>
              <label className="sv-field">
                <span>المدينة <b>*</b></span>
                <select required value={qCity} onChange={(e) => setQCity(e.target.value)} {...arValidity("اختاري المدينة")}>
                  <option value="">المدن</option>
                  {cities.map((c) => <option key={c.id} value={c.name_ar}>{c.name_ar}</option>)}
                </select>
              </label>
              <label className="sv-field">
                <span>عدد الضيوف <b>*</b></span>
                <input type="number" min={1} required placeholder="مثال: 80" value={qGuests} onChange={(e) => setQGuests(e.target.value)} {...arValidity("اكتبي عدد الضيوف")} />
              </label>
            </div>

            <label className="sv-field">
              <span>ما التفاصيل المهمة لك؟ <b>*</b></span>
              <textarea rows={4} required placeholder="نوع المناسبة، الستايل اللي تحبينه، أو أي طلب خاص..." value={qNotes} onChange={(e) => setQNotes(e.target.value)} {...arValidity("اكتبي تفاصيل طلبك")} />
            </label>

            <div className="sv-quote-actions">
              <button type="button" className="sv-quote-cancel" onClick={() => setQuoteOpen(false)}>إلغاء</button>
              <button type="submit" className="sv-btn-quote"><SendIcon /><span>أرسل الطلب لمقدم الخدمة</span></button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .sv-wrap { max-width:1180px; margin:0 auto; padding:26px 18px 70px; }
        .sv-back { display:inline-block; color:#640000; font-size:13.5px; margin-bottom:14px; text-decoration:none; }
        .sv-cols { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:26px; align-items:start; }
        .sv-head { border-bottom:1px solid #EBE2D2; padding-bottom:18px; margin-bottom:22px; }
        .sv-eyebrow { color:#9A8878; font-size:12.5px; }
        .sv-head h1 { font-size:26px; margin:6px 0 8px; color:#241C1A; }
        .sv-price { display:block; color:#640000; font-size:15px; margin-bottom:8px; }
        .sv-desc { color:#6F615A; font-size:14px; line-height:1.9; margin:0; max-width:760px; }
        .sv-sec { margin-top:26px; }
        .sv-sec h2 { font-size:17px; color:#241C1A; margin:0 0 12px; }
        .sv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:12px; }
        .sv-muted { color:#8A7A70; font-size:14px; }
        .sv-aside { position:sticky; top:18px; }
        .sv-quote-card { background:#FFFDF8; border:1px solid #E3DBC9; border-radius:14px; padding:18px; }
        .sv-quote-eyebrow { color:#9A8878; font-size:12.5px; }
        .sv-quote-card strong { display:block; font-size:18px; color:#241C1A; margin:6px 0 8px; font-weight:600; }
        .sv-quote-card p { margin:0 0 14px; color:#7A6A64; font-size:13px; line-height:1.8; }
        .sv-btn-quote { background:#640000; color:#fff; border:none; width:100%; min-height:44px; padding:0 20px; border-radius:6px; font-family:inherit; font-size:13.5px; font-weight:500; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 10px 24px rgba(100,0,0,.18); }
        .sv-overlay { position:fixed; inset:0; background:rgba(20,12,10,.55); display:flex; align-items:center; justify-content:center; z-index:60; padding:16px; }
        .sv-quote { background:#FFFDF8; border-radius:18px; padding:22px; width:min(560px,94vw); max-height:92vh; overflow:auto; text-align:right; box-shadow:0 24px 60px rgba(0,0,0,.28); }
        .sv-quote-head { display:flex; align-items:center; justify-content:space-between; }
        .sv-quote-tag { color:#640000; font-size:13px; font-weight:500; }
        .sv-quote-close { background:none; border:none; font-size:24px; line-height:1; cursor:pointer; color:#6b5b55; }
        .sv-quote-title { margin:10px 0 4px; font-size:22px; font-weight:600; color:#241C1A; }
        .sv-quote-sub { margin:0 0 16px; color:#7A6A64; font-size:14px; }
        .sv-quote-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
        .sv-field > span { display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:#241C1A; }
        .sv-field > span b { color:#B3261E; }
        .sv-field input, .sv-field select, .sv-field textarea { width:100%; padding:11px 12px; border:1px solid #E3DBC9; border-radius:10px; font-family:inherit; font-size:14px; background:#fff; color:#241C1A; }
        .sv-field input:focus, .sv-field select:focus, .sv-field textarea:focus { outline:none; border-color:#640000; }
        .sv-quote-actions { display:flex; align-items:center; gap:12px; margin-top:18px; }
        .sv-quote-actions .sv-btn-quote { width:auto; }
        .sv-quote-cancel { background:#fff; border:1px solid #E3DBC9; border-radius:6px; min-height:44px; padding:0 18px; cursor:pointer; font-family:inherit; font-size:13.5px; color:#5B4A44; }
        @media (max-width:900px) { .sv-cols { grid-template-columns:1fr; } .sv-aside { position:static; } }
        @media (max-width:640px) { .sv-grid { grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); } .sv-head h1 { font-size:21px; } .sv-quote-grid { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
}

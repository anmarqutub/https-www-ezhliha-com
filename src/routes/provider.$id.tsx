import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { waLink, cleanHandle } from "./index";
import logoUrl from "@/assets/logo.jpg";
import defaultProviderUrl from "@/assets/default-provider.jpg";

export const Route = createFileRoute("/provider/$id")({
  component: ProviderPage,
  head: () => ({ meta: [{ title: "تفاصيل مقدم الخدمة — إزهليها" }] }),
});

type MediaItem = { url: string; thumbnail_url?: string | null };
type Provider = {
  id: string; name: string; description: string | null;
  price_from: number | null; price_to: number | null; price: string | null;
  people_from: number | null; people_to: number | null;
  whatsapp: string | null; instagram: string | null;
  tiktok: string | null; twitter: string | null; snapchat: string | null;
  address: string | null; map_url: string | null;
  rating: number | null; city_id: string; subcategory_id: string;
  video_url: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  video_thumbnail_url: string | null;
  show_packages: boolean; show_services: boolean; show_branches: boolean;
  videos: MediaItem[] | null;
};
type Image = { id: string; image_url: string; sort_order: number };
type Review = { id: string; rating: number; comment: string | null; created_at: string; reviewer_name: string; is_mine: boolean };
type Package = { id: string; name: string; description: string | null; price: string | null; image_url: string | null; sort_order: number; images: MediaItem[] | null; videos: MediaItem[] | null };
type Service = { id: string; name: string; description: string | null; price: string | null; image_url: string | null; sort_order: number; images: MediaItem[] | null; videos: MediaItem[] | null };
type Branch = { id: string; name: string; address: string | null; map_url: string | null; phone: string | null; sort_order: number };

type SiteText = { key: string; value: string };
type OfferTab = "overview" | "packages" | "services" | "branches";

function ProviderPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeTab, setActiveTab] = useState<OfferTab>("overview");
  const [siteTexts, setSiteTexts] = useState<Record<string, string>>({});
  const [cityName, setCityName] = useState<string>("");
  const [subName, setSubName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [copiedShare, setCopiedShare] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [qDate, setQDate] = useState("");
  const [qCity, setQCity] = useState("");
  const [qGuests, setQGuests] = useState("");
  const [qBudget, setQBudget] = useState("");
  const [qNotes, setQNotes] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; logo_url: string | null; price_from: number | null; price: string | null; cover: string | null; city_name: string | null }>>([]);

  const reload = async () => {
    setLoading(true);
    const [p, imgs, r] = await Promise.all([
      supabase.from("providers").select("*").eq("id", id).single(),
      supabase.from("provider_images").select("*").eq("provider_id", id).order("sort_order"),
      supabase.rpc("get_provider_reviews", { p_provider_id: id }),
    ]);
    if (p.data) {
      setProvider(p.data as unknown as Provider);
      const [c, s, pkg, srv, br, txt] = await Promise.all([
        supabase.from("cities").select("name_ar").eq("id", p.data.city_id).maybeSingle(),
        supabase.from("subcategories").select("name_ar").eq("id", p.data.subcategory_id).maybeSingle(),
        supabase.from("packages").select("id,name,description,price,image_url,sort_order,images,videos").eq("provider_id", id).order("sort_order"),
        supabase.from("services").select("id,name,description,price,image_url,sort_order,images,videos").eq("provider_id", id).order("sort_order"),
        supabase.from("branches").select("id,name,address,map_url,phone,sort_order").eq("provider_id", id).order("sort_order"),
        supabase.from("site_texts").select("key,value"),
      ]);
      setCityName(c.data?.name_ar ?? "");
      setSubName(s.data?.name_ar ?? "");
      setPackages((pkg.data ?? []) as unknown as Package[]);
      setServices((srv.data ?? []) as unknown as Service[]);
      setBranches((br.data ?? []) as Branch[]);
      setSiteTexts(Object.fromEntries(((txt.data ?? []) as SiteText[]).map((x) => [x.key, x.value])));

      // Suggested providers: same subcategory first, then top-up with same city
      const wanted = 8;
      const collected = new Map<string, any>();
      const sameSub = await supabase
        .from("providers")
        .select("id,name,logo_url,price_from,price,city_id")
        .eq("subcategory_id", p.data.subcategory_id)
        .eq("active", true)
        .neq("id", id)
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(wanted);
      (sameSub.data ?? []).forEach((r: any) => collected.set(r.id, r));
      if (collected.size < wanted) {
        const sameCity = await supabase
          .from("providers")
          .select("id,name,logo_url,price_from,price,city_id")
          .eq("city_id", p.data.city_id)
          .eq("active", true)
          .neq("id", id)
          .limit(wanted);
        (sameCity.data ?? []).forEach((r: any) => { if (!collected.has(r.id)) collected.set(r.id, r); });
      }
      const arr = Array.from(collected.values()).slice(0, wanted);
      if (arr.length) {
        const ids = arr.map((r: any) => r.id);
        const cityIds = Array.from(new Set(arr.map((r: any) => r.city_id).filter(Boolean)));
        const [covers, citiesRes] = await Promise.all([
          supabase.from("provider_images").select("provider_id,image_url,sort_order").in("provider_id", ids).order("sort_order"),
          cityIds.length ? supabase.from("cities").select("id,name_ar").in("id", cityIds) : Promise.resolve({ data: [] as any[] }),
        ]);
        const coverMap = new Map<string, string>();
        ((covers.data ?? []) as any[]).forEach((im) => { if (!coverMap.has(im.provider_id)) coverMap.set(im.provider_id, im.image_url); });
        const cityMap = new Map<string, string>();
        ((citiesRes.data ?? []) as any[]).forEach((c) => cityMap.set(c.id, c.name_ar));
        setSuggestions(arr.map((r: any) => ({
          id: r.id, name: r.name, logo_url: r.logo_url, price_from: r.price_from, price: r.price,
          cover: coverMap.get(r.id) ?? null,
          city_name: r.city_id ? (cityMap.get(r.city_id) ?? null) : null,
        })));
      } else {
        setSuggestions([]);
      }
    }


    setImages((imgs.data ?? []) as Image[]);
    setReviews(((r.data ?? []) as unknown) as Review[]);
    setLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [id]);

  // Favorite check
  useEffect(() => {
    if (!user) { setIsFav(false); return; }
    supabase.from("favorites").select("id").eq("provider_id", id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setIsFav(!!data));
  }, [user, id]);

  const toggleFav = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    setFavLoading(true);
    if (isFav) {
      await supabase.from("favorites").delete().eq("provider_id", id).eq("user_id", user.id);
      setIsFav(false);
    } else {
      await supabase.from("favorites").insert({ provider_id: id, user_id: user.id });
      setIsFav(true);
    }
    setFavLoading(false);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate({ to: "/login" }); return; }
    setSubmitting(true);
    await supabase.from("reviews").insert({
      provider_id: id, user_id: user.id, rating: myRating, comment: myComment.trim() || null,
    });
    setMyComment("");
    setMyRating(5);
    setSubmitting(false);
    reload();
  };

  const deleteReview = async (rid: string) => {
    if (!confirm("حذف هذا التقييم؟")) return;
    await supabase.from("reviews").delete().eq("id", rid);
    reload();
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", fontFamily: "Tajawal, sans-serif" }}>جارٍ التحميل...</div>;
  if (!provider) return <div style={{ padding: 40, textAlign: "center", fontFamily: "Tajawal, sans-serif" }}>مقدم الخدمة غير موجود.</div>;

  const cover = images[activeImg]?.image_url || defaultProviderUrl;
  const waUrl = waLink(provider.whatsapp);
  const callUrl = phoneLink(provider.contact_phone);
  const ig = cleanHandle(provider.instagram);
  const tk = cleanHandle(provider.tiktok);
  const tw = cleanHandle(provider.twitter);
  const sc = cleanHandle(provider.snapchat);
  const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;
  const contactLabel = siteTexts["provider.whatsapp.label"] || "للمزيد من التفاصيل";
  const shareProvider = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: provider.name, text: provider.description ?? provider.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 1600);
    } catch {
      // user cancelled share
    }
  };

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
      `ابي استفسر عن الاسعار لديكم في: ${provider.name}`,
      `- تاريخ المناسبة : ${fmtDate(qDate) || "-"}`,
      `- المدينة: ${qCity || cityName || "-"}`,
      `- عدد الضيوف: ${qGuests || "-"}`,
      `- الميزانية التقريبية: ${qBudget || "-"}`,
      `- الوصف: ${qNotes || "-"}`,
    ];
    const url = waLink(provider.whatsapp, lines.join("\n"));
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    setQuoteOpen(false);
  };



  return (
    <div dir="rtl" className="pv-root">
      <style>{css}</style>
      <header className="pv-nav">
        <Link to="/" className="pv-brand"><img src={logoUrl} alt="إزهليها" /></Link>
        <div className="pv-nav-actions">
          {user ? (
            <>
              <Link to="/favorites" className="pv-link">♥ المفضلة</Link>
              {isAdmin && <Link to="/admin" className="pv-link">الأدمن</Link>}
              <button className="pv-btn-out" onClick={() => signOut()}>خروج</button>
            </>
          ) : (
            <>
              <Link to="/login" className="pv-link">دخول</Link>
              <Link to="/signup" className="pv-btn">تسجيل</Link>
            </>
          )}
        </div>
      </header>

      <main className="pv-main">
        <Link to="/" className="pv-back">‹ رجوع</Link>

        <div className="pv-grid">
          <section className="pv-gallery">
            <div className="pv-cover-wrap">
              <div className="pv-cover" style={{ backgroundImage: `url(${cover})` }} />
              <button
                type="button"
                className={`pv-fav-icon ${isFav ? "active" : ""}`}
                disabled={favLoading}
                onClick={toggleFav}
                aria-label={isFav ? "إزالة من المفضلة" : "أضف للمفضلة"}
              >
                {isFav ? "♥" : "♡"}
              </button>
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="pv-arrow pv-arrow-prev"
                    onClick={() => setActiveImg((i) => (i - 1 + images.length) % images.length)}
                    aria-label="السابق"
                  >‹</button>
                  <button
                    type="button"
                    className="pv-arrow pv-arrow-next"
                    onClick={() => setActiveImg((i) => (i + 1) % images.length)}
                    aria-label="التالي"
                  >›</button>
                  <div className="pv-counter">{activeImg + 1} / {images.length}</div>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="pv-thumbs">
                {images.map((im, i) => (
                  <button
                    key={im.id}
                    className={`pv-thumb ${i === activeImg ? "active" : ""}`}
                    onClick={() => setActiveImg(i)}
                    style={{ backgroundImage: `url(${im.image_url})` }}
                    aria-label={`صورة ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="pv-info">
            <div className="pv-title-row">
              {provider.logo_url && <img src={provider.logo_url} alt={`شعار ${provider.name}`} className="pv-provider-logo" loading="lazy" />}
              <h1>{provider.name}</h1>
            </div>
            <div className="pv-meta">
              {cityName && <span>📍 {cityName}</span>}
              {subName && <span>• {subName}</span>}
              {avgRating && <span>⭐ {avgRating} ({reviews.length})</span>}
            </div>

            {(() => {
              const showPkg = provider.show_packages !== false && packages.length > 0;
              const showSrv = provider.show_services !== false && services.length > 0;
              const showBr  = provider.show_branches !== false && branches.length > 0;
              return (
                <div className="pv-inline-tabs">
                  <div className="pv-tabs">
                    <button type="button" className={`pv-tab ${activeTab === "overview" ? "on" : ""}`} onClick={() => setActiveTab("overview")}>
                      {siteTexts["provider.tabs.overview"] || "الرئيسية"}
                    </button>
                    {showPkg && (
                      <button type="button" className={`pv-tab ${activeTab === "packages" ? "on" : ""}`} onClick={() => setActiveTab("packages")}>
                        {siteTexts["provider.tabs.packages"] || "الباقات"} ({packages.length})
                      </button>
                    )}
                    {showSrv && (
                      <button type="button" className={`pv-tab ${activeTab === "services" ? "on" : ""}`} onClick={() => setActiveTab("services")}>
                        {siteTexts["provider.tabs.services"] || "الخدمات"} ({services.length})
                      </button>
                    )}
                    {showBr && (
                      <button type="button" className={`pv-tab ${activeTab === "branches" ? "on" : ""}`} onClick={() => setActiveTab("branches")}>
                        {siteTexts["provider.tabs.branches"] || "الفروع"} ({branches.length})
                      </button>
                    )}
                  </div>

                  {activeTab === "overview" && (
                    <div className="pv-inline-overview">
                      {provider.description
                        ? <p className="pv-desc">{provider.description}</p>
                        : <p className="pv-empty-imgs">لا يوجد وصف بعد.</p>}
                    </div>
                  )}
                  {activeTab === "packages" && showPkg && (
                    <div className="pv-inline-list">
                      {packages.map((pkg) => (
                        <article className="pv-package" key={pkg.id}>
                          {pkg.image_url && <img src={pkg.image_url} alt={pkg.name} loading="lazy" />}
                          <div style={{ flex: 1 }}>
                            <h3>{pkg.name}</h3>
                            {pkg.price && <strong>{pkg.price}</strong>}
                            {pkg.description && <p>{pkg.description}</p>}
                            <OfferMedia images={pkg.images ?? []} videos={pkg.videos ?? []} />
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                  {activeTab === "services" && showSrv && (
                    <div className="pv-inline-list">
                      {services.map((sv) => (
                        <article className="pv-package" key={sv.id}>
                          {sv.image_url && <img src={sv.image_url} alt={sv.name} loading="lazy" />}
                          <div style={{ flex: 1 }}>
                            <h3>{sv.name}</h3>
                            {sv.price && <strong>{sv.price}</strong>}
                            {sv.description && <p>{sv.description}</p>}
                            <OfferMedia images={sv.images ?? []} videos={sv.videos ?? []} />
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {activeTab === "branches" && showBr && (
                    <div className="pv-branch-list">
                      {branches.map((br) => (
                        <article className="pv-branch" key={br.id}>
                          <div className="pv-branch-body">
                            <h3>📍 {br.name}</h3>
                            {br.address && <p>{br.address}</p>}
                            {br.phone && <a className="pv-branch-phone" href={`tel:${br.phone}`} dir="ltr">☎ {br.phone}</a>}
                          </div>
                          {br.map_url && (
                            <a className="pv-branch-map" href={br.map_url} target="_blank" rel="noopener noreferrer">
                              🗺️ الموقع
                            </a>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {(provider.price_from || provider.price_to) && (
              <div className="pv-price">
                {provider.price_from && <span>من {provider.price_from} ر.س</span>}
                {provider.price_to && <span> إلى {provider.price_to} ر.س</span>}
              </div>
            )}
            {provider.price && <div className="pv-price">{provider.price}</div>}
            {(provider.people_from || provider.people_to) && (
              <div className="pv-people">
                👥 تكفي {provider.people_from ?? ""}
                {provider.people_from && provider.people_to ? `–${provider.people_to}` : (provider.people_to ?? "")}
                {" "}شخص
              </div>
            )}
            {provider.address && <div className="pv-addr">📌 {provider.address}</div>}

            <div className="pv-actions">
              {provider.whatsapp && (
                <button type="button" className="pv-btn-quote" onClick={() => setQuoteOpen(true)}>
                  <SendIcon />
                  <span>{siteTexts["provider.quote.cta"] || "اطلبي عرضك"}</span>
                </button>
              )}
              {waUrl && (
                <a className="pv-btn-wa-solid" href={waUrl} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon />
                  <span>{contactLabel || "للتواصل مع مقدم الخدمة"}</span>
                </a>
              )}
              {provider.map_url && (
                <a className="pv-btn-map" href={provider.map_url} target="_blank" rel="noopener noreferrer">
                  🗺️ الموقع على الخريطة
                </a>
              )}
              <button type="button" className="pv-btn-share" onClick={shareProvider}>
                <ShareIcon />
                <span>{copiedShare ? "تم نسخ الرابط" : "مشاركة"}</span>
              </button>
            </div>

            {(callUrl || ig || tk || tw || sc) && (
              <div className="pv-socials">
                {callUrl && (
                  <button
                    type="button"
                    className="pv-soc pv-soc-call"
                    aria-label="اتصال مباشر"
                    onClick={() => {
                      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
                      if (isMobile) {
                        window.location.href = callUrl;
                      } else {
                        setCallOpen(true);
                      }
                    }}
                  >
                    <PhoneIcon />
                  </button>
                )}
                {ig && (
                  <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className="pv-soc pv-soc-ig" aria-label="إنستقرام">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.25.07 1.63.07 4.8s0 3.55-.07 4.8c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.25.06-1.63.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.72 3.72 0 01-1.38-.9 3.72 3.72 0 01-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 00-2.13 1.39A5.9 5.9 0 00.62 4.15C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.72 1.48 1.39 2.13.65.67 1.33 1.08 2.13 1.39.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 002.13-1.39 5.9 5.9 0 001.39-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 00-1.39-2.13A5.9 5.9 0 0019.86.62c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 1116 12a4 4 0 01-4 4zm6.4-11.85a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z"/>
                    </svg>
                  </a>
                )}
                {tk && (
                  <a href={`https://tiktok.com/@${tk}`} target="_blank" rel="noopener noreferrer" className="pv-soc pv-soc-tk" aria-label="تيك توك">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V9a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.43z"/>
                    </svg>
                  </a>
                )}
                {tw && (
                  <a href={`https://x.com/${tw}`} target="_blank" rel="noopener noreferrer" className="pv-soc pv-soc-tw" aria-label="X">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                )}
                {sc && (
                  <a href={`https://snapchat.com/add/${sc}`} target="_blank" rel="noopener noreferrer" className="pv-soc pv-soc-sc" aria-label="سناب شات">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d="M12.2 2c.4 0 3.6.1 5.3 3.2.5 1 .5 2.7.4 4.1v.2c0 .2 0 .4-.1.6.1.1.3.1.5.1.3 0 .7-.1 1.1-.3.2-.1.4-.1.5-.1.3 0 .6.1.7.3.2.3.1.7-.2 1-.1.1-.4.3-1.3.6-.1 0-.4.1-.5.4-.1.2 0 .5.2.9 0 0 1.2 2.6 3.6 3 .2 0 .4.2.4.5s-.4.5-.6.6c-.7.3-1.7.5-2.1.6-.2.1-.3.3-.4.7 0 .2-.1.4-.1.6-.1.1-.2.2-.4.2h-.1c-.2 0-.4-.1-.7-.1-.3-.1-.6-.1-1-.1-.2 0-.5 0-.7.1-.5.1-1 .5-1.5.8-.7.5-1.5 1.1-2.7 1.1h-.2c-1.2 0-2-.6-2.7-1.1-.5-.4-1-.7-1.5-.8-.2 0-.4-.1-.7-.1-.4 0-.8.1-1 .1-.3.1-.5.1-.6.1-.3 0-.4-.2-.4-.3 0-.2-.1-.4-.1-.6-.1-.4-.2-.6-.4-.7-.4-.1-1.4-.3-2.1-.6-.2-.1-.6-.3-.6-.6 0-.3.2-.5.4-.5C4.3 13.3 5.5 10.7 5.5 10.7c.2-.4.3-.7.2-.9-.1-.3-.4-.4-.5-.4-.9-.3-1.2-.5-1.3-.6-.3-.3-.4-.7-.2-1 .1-.2.4-.3.7-.3.1 0 .3 0 .5.1.4.2.8.3 1.1.3.2 0 .4 0 .5-.1v-.6-.3c-.1-1.4-.1-3.1.4-4.1C8.4 2.1 11.6 2 12 2h.2z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
          </section>
        </div>

        {(() => {
          const vids: MediaItem[] = [];
          if (provider.video_url) vids.push({ url: provider.video_url, thumbnail_url: provider.video_thumbnail_url });
          (provider.videos ?? []).forEach((v) => vids.push(v));
          if (!vids.length) return null;
          return (
            <section className="pv-video-section">
              <h2>فيديو تعريفي</h2>
              <div className="pv-video-list">
                {vids.map((v, i) => (
                  <VideoEmbed key={i} url={v.url} thumbnailUrl={v.thumbnail_url ?? null} />
                ))}
              </div>
            </section>
          );
        })()}







        <section className="pv-reviews">
          <h2>التقييمات والتعليقات</h2>

          {user ? (
            <form onSubmit={submitReview} className="pv-review-form">
              <div className="pv-stars-input">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} className={n <= myRating ? "on" : ""} onClick={() => setMyRating(n)} aria-label={`${n} نجوم`}>
                    ★
                  </button>
                ))}
              </div>
              <textarea
                placeholder="اكتب تعليقك..."
                rows={3}
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
              />
              <button type="submit" className="pv-btn-primary" disabled={submitting}>
                {submitting ? "..." : "أرسل التقييم"}
              </button>
            </form>
          ) : (
            <p className="pv-empty-imgs">
              <Link to="/login">سجّل دخول</Link> لإضافة تقييم.
            </p>
          )}

          <div className="pv-review-list">
            {reviews.length === 0 && <p className="pv-empty-imgs">لا توجد تقييمات بعد.</p>}
            {reviews.map((r) => (
              <div key={r.id} className="pv-review-item">
                <div className="pv-review-head">
                  <strong>{r.reviewer_name || "مستخدم"}</strong>
                  <span className="pv-review-stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  {(isAdmin || r.is_mine) && (
                    <button className="pv-review-del" onClick={() => deleteReview(r.id)}>حذف</button>
                  )}
                </div>
                {r.comment && <p>{r.comment}</p>}
                <small>{new Date(r.created_at).toLocaleDateString("ar-SA")}</small>
              </div>
            ))}
          </div>
        </section>

        {suggestions.length > 0 && (
          <section className="pv-suggest">
            <h2>مقترحات لك</h2>
            <div className="pv-suggest-grid">
              {suggestions.map((s) => (
                <Link key={s.id} to="/provider/$id" params={{ id: s.id }} className="pv-suggest-card" onClick={() => window.scrollTo({ top: 0 })}>
                  <div className="pv-suggest-img" style={{ backgroundImage: `url(${s.cover || s.logo_url || defaultProviderUrl})` }} />
                  <div className="pv-suggest-body">
                    <h3>{s.name}</h3>
                    {s.city_name && <span className="pv-suggest-city">📍 {s.city_name}</span>}
                    {(s.price_from || s.price) && (
                      <strong>{s.price_from ? `من ${s.price_from} ر.س` : s.price}</strong>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {quoteOpen && (
        <div className="pv-modal-overlay" onClick={() => setQuoteOpen(false)}>
          <form className="pv-quote" onClick={(e) => e.stopPropagation()} onSubmit={submitQuote}>
            <div className="pv-quote-head">
              <span className="pv-quote-tag">طلب مخصص</span>
              <button type="button" className="pv-quote-close" onClick={() => setQuoteOpen(false)} aria-label="إغلاق">×</button>
            </div>
            <h3 className="pv-quote-title">خلّينا نجهّز طلبك لـ {provider.name}</h3>
            <p className="pv-quote-sub">عطينا أهم التفاصيل عشان يجيك عرض أقرب للي تبينه.</p>

            <div className="pv-quote-grid">
              <label className="pv-quote-field">
                <span>تاريخ المناسبة</span>
                <input type="date" value={qDate} onChange={(e) => setQDate(e.target.value)} />
              </label>
              <label className="pv-quote-field">
                <span>المدينة</span>
                <input type="text" placeholder="مثال: جدة" value={qCity} onChange={(e) => setQCity(e.target.value)} />
              </label>
              <label className="pv-quote-field">
                <span>عدد الضيوف</span>
                <input type="number" min={1} placeholder="مثال: 80" value={qGuests} onChange={(e) => setQGuests(e.target.value)} />
              </label>
              <label className="pv-quote-field">
                <span>الميزانية التقريبية</span>
                <select value={qBudget} onChange={(e) => setQBudget(e.target.value)}>
                  <option value="">اختاري النطاق</option>
                  <option value="أقل من 5,000 ر.س">أقل من 5,000 ر.س</option>
                  <option value="5,000 - 10,000 ر.س">5,000 - 10,000 ر.س</option>
                  <option value="10,000 - 25,000 ر.س">10,000 - 25,000 ر.س</option>
                  <option value="25,000 - 50,000 ر.س">25,000 - 50,000 ر.س</option>
                  <option value="أكثر من 50,000 ر.س">أكثر من 50,000 ر.س</option>
                </select>
              </label>
            </div>

            <label className="pv-quote-field">
              <span>ما التفاصيل المهمة لك؟</span>
              <textarea rows={4} placeholder="نوع المناسبة، الأسلوب المفضل، أو أي احتياج خاص..." value={qNotes} onChange={(e) => setQNotes(e.target.value)} />
            </label>

            <div className="pv-quote-actions">
              <button type="button" className="pv-quote-cancel" onClick={() => setQuoteOpen(false)}>إلغاء</button>
              <button type="submit" className="pv-btn-quote"><SendIcon /><span>جهّزي الطلب</span></button>
            </div>
          </form>
        </div>
      )}



      {callOpen && callUrl && (
        <div className="pv-modal-overlay" onClick={() => setCallOpen(false)}>
          <div className="pv-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="pv-modal-close" onClick={() => setCallOpen(false)} aria-label="إغلاق">×</button>
            <div className="pv-modal-icon"><PhoneIcon /></div>
            <h3 className="pv-modal-title">الاتصال بمقدم الخدمة</h3>
            <div className="pv-modal-phone" dir="ltr">{callUrl.replace("tel:", "")}</div>
            <div className="pv-modal-actions">
              <a href={callUrl} className="pv-modal-call"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"middle",marginInlineEnd:6}}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/></svg>اتصال</a>
              <button
                type="button"
                className="pv-modal-copy"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(callUrl.replace("tel:", ""));
                    setCopiedPhone(true);
                    setTimeout(() => setCopiedPhone(false), 1600);
                  } catch { /* noop */ }
                }}
              >
                {copiedPhone ? "✓ تم النسخ" : "نسخ الرقم"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function phoneLink(value: string | null) {
  let phone = (value ?? "").trim().replace(/[^0-9+]/g, "");
  if (!phone) return null;
  if (phone.startsWith("+9660")) phone = `+966${phone.slice(5)}`;
  if (phone.startsWith("+")) return `tel:${phone}`;
  if (phone.startsWith("00966")) phone = `+${phone.slice(2)}`;
  else if (phone.startsWith("9660")) phone = `+966${phone.slice(4)}`;
  else if (phone.startsWith("966")) phone = `+${phone}`;
  else if (phone.startsWith("05")) phone = `+966${phone.slice(1)}`;
  else if (phone.startsWith("5")) phone = `+966${phone}`;
  else phone = `+${phone}`;
  return `tel:${phone}`;
}

function getYouTubeId(url: string) {
  return url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;
}

function getTikTokEmbed(url: string) {
  const id = url.match(/tiktok\.com\/(?:@[^/]+\/video\/|v\/|embed\/v2\/)(\d+)/)?.[1];
  return id ? `https://www.tiktok.com/embed/v2/${id}` : null;
}

function getInstagramEmbed(url: string) {
  const code = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1];
  return code ? `https://www.instagram.com/p/${code}/embed` : null;
}

function OfferMedia({ images, videos }: { images: MediaItem[]; videos: MediaItem[] }) {
  if (!images?.length && !videos?.length) return null;
  return (
    <div className="pv-offer-media">
      {images?.length > 0 && (
        <div className="pv-offer-imgs">
          {images.map((im, i) => (
            <a key={`i${i}`} href={im.url} target="_blank" rel="noopener noreferrer" style={{ backgroundImage: `url(${im.url})` }} />
          ))}
        </div>
      )}
      {videos?.length > 0 && (
        <div className="pv-offer-vids">
          {videos.map((v, i) => (
            <VideoEmbed key={`v${i}`} url={v.url} thumbnailUrl={v.thumbnail_url ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}



function VideoEmbed({ url, thumbnailUrl }: { url: string; thumbnailUrl: string | null }) {
  const ytId = getYouTubeId(url);
  const isDirect = /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);
  const ttEmbed = getTikTokEmbed(url);
  const igEmbed = getInstagramEmbed(url);
  const poster = thumbnailUrl || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null);
  const isPortrait = !!ttEmbed || !!igEmbed;

  if (ytId) {
    return (
      <div className="pv-video-wrap">
        <iframe src={`https://www.youtube.com/embed/${ytId}`} title="فيديو" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  if (isDirect) {
    return (
      <div className="pv-video-wrap">
        <video src={url} controls playsInline preload="metadata" poster={poster ?? undefined} />
      </div>
    );
  }
  if (igEmbed) {
    if (thumbnailUrl) {
      return (
        <button
          type="button"
          className="pv-video-poster"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          aria-label="عرض الملف الشخصي على إنستقرام"
        >
          <span><PlayIcon /></span>
        </button>
      );
    }
    return (
      <div className={`pv-video-wrap ${isPortrait ? "pv-video-wrap--tall" : ""}`}>
        <iframe src={igEmbed} title="Instagram" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  if (ttEmbed) {
    return (
      <div className={`pv-video-wrap ${isPortrait ? "pv-video-wrap--tall" : ""}`}>
        <iframe src={ttEmbed} title="TikTok" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  // Fallback — رابط ما نقدر نضمنه
  if (thumbnailUrl) {
    return (
      <button
        type="button"
        className="pv-video-poster"
        style={{ backgroundImage: `url(${thumbnailUrl})` }}
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        aria-label="عرض الفيديو"
      >
        <span><PlayIcon /></span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className="pv-video-poster pv-video-poster--empty"
      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
      aria-label="عرض الفيديو"
    >
      <span><PlayIcon /></span>
      <em className="pv-video-poster-label">تشغيل الفيديو</em>
    </button>
  );
}


function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.78 11.78 0 0012.06 0C5.5 0 .17 5.33.17 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 005.74 1.46h.01c6.56 0 11.89-5.33 11.89-11.9 0-3.18-1.24-6.17-3.44-8.42zM12.07 21.8h-.01a9.9 9.9 0 01-5.05-1.38l-.36-.21-3.75.99 1-3.66-.24-.38a9.86 9.86 0 01-1.51-5.26c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.13 1.03 7 2.9a9.83 9.83 0 012.9 7c0 5.46-4.44 9.9-9.88 9.9zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.06 2.88 1.21 3.08.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z" />
    </svg>
  );
}

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 1015 5c0 .24.04.47.09.7L8.04 9.81a3 3 0 100 4.38l7.12 4.17c-.05.2-.08.41-.08.63a2.92 2.92 0 102.92-2.91z" /></svg>;
}

function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72c0 .78.86 1.25 1.52.82l10.78-6.86a.98.98 0 000-1.64L9.52 4.32A.98.98 0 008 5.14z" /></svg>;
}

function SendIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>;
}

const css = `
  .pv-btn-quote { background:#660000; color:#fff; border:none; padding:14px; border-radius:12px; font-family:inherit; font-size:15px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 6px 18px rgba(102,0,0,0.25); }
  .pv-btn-quote:hover { background:#4d0000; }
  .pv-quote { background:#FFFDF8; border-radius:18px; padding:22px; width:min(560px,94vw); max-height:92vh; overflow:auto; font-family:Tajawal, system-ui, sans-serif; box-shadow:0 24px 60px rgba(0,0,0,.28); text-align:right; }
  .pv-quote-head { display:flex; align-items:center; justify-content:space-between; }
  .pv-quote-tag { color:#660000; font-size:13px; font-weight:700; }
  .pv-quote-close { background:none; border:none; font-size:24px; line-height:1; cursor:pointer; color:#6b5b55; }
  .pv-quote-title { margin:10px 0 4px; font-size:24px; font-weight:900; color:#241C1A; }
  .pv-quote-sub { margin:0 0 16px; color:#7A6A64; font-size:14px; }
  .pv-quote-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
  .pv-quote-field { display:block; }
  .pv-quote-field > span { display:block; font-size:13px; font-weight:700; margin-bottom:6px; color:#241C1A; }
  .pv-quote-field input, .pv-quote-field select, .pv-quote-field textarea { width:100%; padding:11px 12px; border:1px solid #E3DBC9; border-radius:10px; font-family:inherit; font-size:14px; background:#fff; color:#241C1A; }
  .pv-quote-field input:focus, .pv-quote-field select:focus, .pv-quote-field textarea:focus { outline:none; border-color:#660000; }
  .pv-quote-actions { display:flex; align-items:center; justify-content:flex-start; gap:12px; margin-top:18px; }
  .pv-quote-cancel { background:none; border:none; font-family:inherit; font-size:14px; font-weight:700; color:#241C1A; cursor:pointer; }
  .pv-quote-actions .pv-btn-quote { padding:12px 22px; box-shadow:none; }
  @media (max-width:640px) { .pv-quote-grid { grid-template-columns:1fr; } }
  .pv-root { min-height:100vh; background:#e6e4d7; font-family:Tajawal, system-ui, sans-serif; color:#000; }
  .pv-nav { background:#fff; border-bottom:1px solid #d8d4c0; padding:0 24px; height:72px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 12px rgba(102,0,0,0.06); position:sticky; top:0; z-index:50; }
  .pv-brand img { height:54px; }
  .pv-nav-actions { display:flex; gap:12px; align-items:center; }
  .pv-link { color:#000; text-decoration:none; font-size:14px; font-weight:600; }
  .pv-link:hover { color:#660000; }
  .pv-btn { background:#660000; color:#fff; padding:8px 18px; border-radius:50px; text-decoration:none; font-size:13px; font-weight:700; }
  .pv-btn-out { background:transparent; color:#660000; border:1px solid #660000; padding:7px 16px; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }

  .pv-main { max-width:1200px; margin:0 auto; padding:24px; }
  .pv-back { display:inline-block; color:#660000; text-decoration:none; font-weight:700; margin-bottom:14px; }
  .pv-grid { display:grid; grid-template-columns:1.1fr 1fr; gap:24px; background:#fff; padding:24px; border-radius:18px; border:1px solid #d8d4c0; }
  @media(max-width:860px){ .pv-grid{ grid-template-columns:1fr; } }
  .pv-fav-icon { position:absolute; bottom:10px; right:10px; width:40px; height:40px; border-radius:50%; border:none; background:#fff; color:#660000; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.18); line-height:1; padding:0; transition:transform 0.15s; z-index:2; }
  .pv-fav-icon:hover { transform:scale(1.08); }
  .pv-fav-icon.active { background:#660000; color:#fff; }


  .pv-cover-wrap { position:relative; }
  .pv-cover { width:100%; aspect-ratio:4/3; background-size:cover; background-position:center; background-color:#e6e4d7; border-radius:14px; }
  .pv-arrow { position:absolute; top:50%; transform:translateY(-50%); width:42px; height:42px; border-radius:50%; border:none; background:rgba(255,255,255,0.92); color:#660000; font-size:28px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.18); transition:background 0.15s; line-height:1; padding:0; }
  .pv-arrow:hover { background:#fff; }
  .pv-arrow-prev { right:10px; }
  .pv-arrow-next { left:10px; }
  .pv-counter { position:absolute; bottom:10px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.55); color:#fff; padding:4px 12px; border-radius:50px; font-size:12px; font-weight:600; }
  .pv-thumbs { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
  .pv-thumb { width:70px; height:70px; border-radius:10px; background-size:cover; background-position:center; border:2px solid transparent; cursor:pointer; padding:0; }
  .pv-thumb.active { border-color:#660000; }
  .pv-empty-imgs { color:#555; font-size:14px; text-align:center; padding:14px; }
  .pv-empty-imgs a { color:#660000; font-weight:700; }

  .pv-title-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .pv-provider-logo { width:46px; height:46px; object-fit:cover; border-radius:10px; border:1px solid #d8d4c0; background:#fff; }
  .pv-info h1 { font-size:28px; font-weight:900; margin-bottom:0; }
  .pv-meta { display:flex; gap:10px; color:#555; font-size:13px; flex-wrap:wrap; margin-bottom:14px; }
  .pv-desc { font-size:15px; color:#222; line-height:1.8; margin-bottom:14px; }
  .pv-price { font-size:15px; color:#660000; font-weight:800; margin-bottom:10px; }
  .pv-people { font-size:14px; color:#333; font-weight:700; background:#f5f2e5; display:inline-block; padding:6px 12px; border-radius:8px; margin-bottom:12px; }
  .pv-addr { font-size:13px; color:#555; margin-bottom:18px; }
  .pv-actions { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
  .pv-btn-wa { background:transparent; color:#660000; padding:10px 0; border-radius:0; text-align:center; text-decoration:none; font-weight:900; display:flex; align-items:center; justify-content:center; gap:8px; }
  .pv-btn-wa svg { color:#660000; }
  .pv-btn-wa-solid { background:#660000; color:#fff; padding:14px; border-radius:12px; text-align:center; text-decoration:none; font-weight:800; display:flex; align-items:center; justify-content:center; gap:10px; font-size:15px; box-shadow:0 6px 18px rgba(102,0,0,0.25); }
  .pv-btn-wa-solid:hover { filter:brightness(0.95); }
  .pv-btn-wa-solid svg { color:#fff; }
  .pv-btn-call, .pv-btn-share { background:#f5f2e5; color:#660000; padding:12px; border-radius:10px; text-align:center; text-decoration:none; font-weight:800; display:flex; align-items:center; justify-content:center; gap:8px; border:1px solid #d8d4c0; cursor:pointer; font-family:inherit; font-size:14px; }
  .pv-btn-share { background:#fff; }
  .pv-btn-map { background:#4285F4; color:#fff; padding:12px; border-radius:10px; text-align:center; text-decoration:none; font-weight:700; }
  .pv-btn-fav { background:#fff; color:#660000; border:1.5px solid #660000; padding:12px; border-radius:10px; cursor:pointer; font-family:inherit; font-size:14px; font-weight:700; }
  .pv-btn-fav.active { background:#660000; color:#fff; }

  .pv-socials { display:flex; gap:10px; margin-top:6px; }
  .pv-soc { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:50%; color:#fff; text-decoration:none; font-size:12px; font-weight:800; }
  .pv-soc-call { background:#660000; }
  .pv-soc-ig { background:linear-gradient(45deg,#f09433,#dc2743,#bc1888); }
  .pv-soc-tk { background:#000; }
  .pv-soc-tw { background:#000; }
  .pv-soc-sc { background:#FFFC00; color:#000; }

  .pv-video-section { background:#fff; border:1px solid #d8d4c0; border-radius:18px; padding:24px; margin-top:24px; }
  .pv-video-section h2 { font-size:20px; font-weight:800; margin-bottom:14px; }
  .pv-video-wrap { position:relative; width:100%; padding-top:56.25%; border-radius:12px; overflow:hidden; background:#fff; }
  .pv-video-wrap--tall { padding-top:0; height:min(720px, 90vh); max-width:420px; margin:0 auto; background:#fff; }

  .pv-video-wrap iframe, .pv-video-wrap video { position:absolute; inset:0; width:100%; height:100%; border:none; }
  .pv-video-poster { width:100%; aspect-ratio:16/9; border:0; border-radius:12px; background-size:cover; background-position:center; cursor:pointer; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; }
  .pv-video-poster::before { content:""; position:absolute; inset:0; background:linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.38)); }
  .pv-video-poster span { position:relative; width:68px; height:68px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#fff; color:#660000; box-shadow:0 12px 30px rgba(0,0,0,0.22); }
  .pv-video-poster--empty { background:linear-gradient(135deg,#660000,#3d0000); min-height:280px; flex-direction:column; gap:14px; }
  .pv-video-poster--empty::before { display:none; }
  .pv-video-poster-label { position:relative; color:#fff; font-weight:800; font-size:18px; font-style:normal; }
  .pv-video-link { display:inline-flex; align-items:center; gap:8px; background:#660000; color:#fff; padding:12px 22px; border-radius:10px; text-decoration:none; font-weight:700; }
  .pv-packages { background:#fff; border:1px solid #d8d4c0; border-radius:18px; padding:24px; margin-top:24px; }
  .pv-packages h2 { font-size:20px; font-weight:800; margin-bottom:14px; }
  .pv-package-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
  .pv-package { border:1px solid #e8e6d7; border-radius:12px; padding:12px; display:flex; gap:12px; align-items:flex-start; background:#fffdf8; }
  .pv-package img { width:72px; height:72px; object-fit:cover; border-radius:10px; flex-shrink:0; }
  .pv-package h3 { font-size:16px; font-weight:900; margin:0 0 4px; }
  .pv-package strong { display:block; color:#660000; margin-bottom:5px; }
  .pv-package p { margin:0; color:#333; line-height:1.7; font-size:13px; }
  .pv-tabs { display:flex; gap:8px; margin-bottom:16px; border-bottom:2px solid #e6e4d7; padding-bottom:0; flex-wrap:wrap; }
  .pv-tab { background:none; border:none; padding:10px 18px; font-family:inherit; font-size:15px; font-weight:700; color:#5a4a4a; cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-2px; transition:all .15s; }
  .pv-tab:hover { color:#660000; }
  .pv-tab.on { color:#660000; border-bottom-color:#660000; }
  .pv-inline-tabs { margin:14px 0 16px; }
  .pv-inline-tabs .pv-tabs { margin-bottom:12px; }
  .pv-inline-list { display:flex; flex-direction:column; gap:10px; max-height:340px; overflow-y:auto; padding-inline-end:4px; }
  .pv-branch-list { display:flex; flex-direction:column; gap:10px; }
  .pv-branch { border:1px solid #e8e6d7; border-radius:12px; padding:14px; background:#fffdf8; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
  .pv-branch h3 { font-size:16px; font-weight:900; margin:0 0 4px; }
  .pv-branch p { margin:0 0 4px; color:#333; font-size:13px; }
  .pv-branch-phone { color:#660000; font-weight:700; text-decoration:none; font-size:13px; }
  .pv-branch-map { background:#660000; color:#fff; padding:8px 16px; border-radius:8px; text-decoration:none; font-weight:700; font-size:13px; white-space:nowrap; }
  .pv-reviews { background:#fff; border:1px solid #d8d4c0; border-radius:18px; padding:24px; margin-top:24px; }
  .pv-reviews h2 { font-size:20px; font-weight:800; margin-bottom:16px; }
  .pv-review-form { background:#e6e4d7; padding:14px; border-radius:12px; margin-bottom:18px; display:flex; flex-direction:column; gap:10px; }
  .pv-stars-input { display:flex; gap:4px; }
  .pv-stars-input button { background:none; border:none; font-size:28px; color:#ccc; cursor:pointer; padding:0 2px; }
  .pv-stars-input button.on { color:#f0b400; }
  .pv-review-form textarea { width:100%; border:1px solid #d8d4c0; border-radius:8px; padding:10px; font-family:inherit; font-size:14px; resize:vertical; }
  .pv-btn-primary { background:#660000; color:#fff; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-family:inherit; font-weight:700; align-self:flex-start; }
  .pv-review-list { display:flex; flex-direction:column; gap:14px; }
  .pv-review-item { border:1px solid #e8e6d7; border-radius:10px; padding:12px; }
  .pv-review-head { display:flex; align-items:center; gap:10px; margin-bottom:6px; flex-wrap:wrap; }
  .pv-review-stars { color:#f0b400; letter-spacing:2px; }
  .pv-review-del { background:transparent; color:#a01919; border:1px solid #f5d5d5; border-radius:6px; padding:3px 8px; font-size:11px; cursor:pointer; margin-right:auto; }
  .pv-review-item p { color:#222; line-height:1.7; margin:4px 0; }
  .pv-review-item small { color:#888; font-size:11px; }
  .pv-video-list { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; }
  .pv-offer-media { margin-top:8px; display:flex; flex-direction:column; gap:8px; }
  .pv-offer-imgs { display:flex; gap:6px; flex-wrap:wrap; }
  .pv-offer-imgs a { width:64px; height:64px; border-radius:8px; background-size:cover; background-position:center; border:1px solid #e8e6d7; }
  .pv-offer-vids { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; }

  .pv-suggest { background:#fff; border:1px solid #d8d4c0; border-radius:18px; padding:24px; margin-top:24px; }
  .pv-suggest h2 { font-size:20px; font-weight:800; margin-bottom:16px; color:#660000; }
  .pv-suggest-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:14px; }
  .pv-suggest-card { display:flex; flex-direction:column; background:#fffdf8; border:1px solid #e8e6d7; border-radius:14px; overflow:hidden; text-decoration:none; color:inherit; transition:transform .15s, box-shadow .15s; }
  .pv-suggest-card:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(102,0,0,0.12); border-color:#660000; }
  .pv-suggest-img { width:100%; aspect-ratio:4/3; background-size:cover; background-position:center; background-color:#e6e4d7; }
  .pv-suggest-body { padding:10px 12px 14px; display:flex; flex-direction:column; gap:4px; }
  .pv-suggest-body h3 { font-size:15px; font-weight:800; margin:0; color:#000; }
  .pv-suggest-city { font-size:12px; color:#666; }
  .pv-suggest-body strong { color:#660000; font-size:13px; font-weight:800; }
  .pv-soc-call { border:none; cursor:pointer; font-family:inherit; }
  .pv-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px; }
  .pv-modal { background:#fff; border-radius:18px; padding:28px 24px; max-width:360px; width:100%; text-align:center; position:relative; box-shadow:0 20px 50px rgba(0,0,0,0.3); font-family:'Tajawal', sans-serif; }
  .pv-modal-close { position:absolute; top:10px; left:14px; background:none; border:none; font-size:26px; cursor:pointer; color:#888; line-height:1; }
  .pv-modal-close:hover { color:#660000; }
  .pv-modal-icon { width:64px; height:64px; border-radius:50%; background:#660000; color:#fff; display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }
  .pv-modal-icon svg { width:28px; height:28px; }
  .pv-modal-title { font-size:18px; font-weight:800; color:#000; margin:0 0 12px; }
  .pv-modal-phone { font-size:24px; font-weight:800; color:#660000; letter-spacing:1px; padding:14px; background:#f5f2e5; border-radius:12px; margin-bottom:18px; direction:ltr; }
  .pv-modal-actions { display:flex; gap:10px; }
  .pv-modal-call { flex:1; background:#660000; color:#fff; padding:14px; border-radius:10px; text-decoration:none; font-weight:800; font-size:15px; }
  .pv-modal-call:hover { background:#4d0000; }
  .pv-modal-copy { flex:1; background:#fff; color:#660000; padding:14px; border-radius:10px; font-weight:800; font-size:15px; border:2px solid #660000; cursor:pointer; font-family:inherit; }
  .pv-modal-copy:hover { background:#f5f2e5; }
`;

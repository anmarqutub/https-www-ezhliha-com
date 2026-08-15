import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Heart, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import SiteFooter from "@/components/SiteFooter";
import { waLink, cleanHandle } from "./index";
import logoUrl from "@/assets/logo.jpg";
import defaultProviderUrl from "@/assets/default-provider.jpg";
import refHall from "@/assets/provider-hall.jpg.asset.json";
import refBeauty from "@/assets/provider-beauty.jpg.asset.json";
import refBuffet from "@/assets/provider-buffet.jpg.asset.json";
import refFlowers from "@/assets/provider-flowers.jpg.asset.json";
import refPhoto from "@/assets/provider-photo.jpg.asset.json";
import refLamia from "@/assets/provider-lamia.jpg.asset.json";

export const Route = createFileRoute("/provider/$id")({
  component: ProviderPage,
  head: () => ({ meta: [{ title: "تفاصيل مقدم الخدمة — إزهليها" }] }),
});

const REF_HALL = [refHall.url, refFlowers.url, refBuffet.url];
const REF_BEAUTY = [refBeauty.url, refFlowers.url, refPhoto.url];
const REF_FOOD = [refBuffet.url, refLamia.url, refFlowers.url];
const REF_PHOTO = [refPhoto.url, refFlowers.url, refHall.url];
const REF_FLOWERS = [refFlowers.url, refHall.url, refBeauty.url];

function pickRefImages(sub: string): string[] {
  const s = (sub || "").trim();
  if (/تجميل|مكياج|كوافير|عناية|شعر/.test(s)) return REF_BEAUTY;
  if (/تصوير|فيديو|مصور/.test(s)) return REF_PHOTO;
  if (/ضياف|بوفيه|طعام|حلوي|حلويات|قهوة|كيك|مطبخ/.test(s)) return REF_FOOD;
  if (/ورد|زهور|تنسيق|ديكور/.test(s)) return REF_FLOWERS;
  if (/قاعة|قاعات|استراحة|منتجع|فلل|مكان/.test(s)) return REF_HALL;
  return REF_HALL;
}


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

// رسائل تحقق بالعربية للحقول الإلزامية
function arValidity(message: string) {
  return {
    onInvalid: (e: React.FormEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      e.currentTarget.setCustomValidity(message),
    onInput: (e: React.FormEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      e.currentTarget.setCustomValidity(""),
  } as const;
}


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
  const [allCities, setAllCities] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [subName, setSubName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [copiedShare, setCopiedShare] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  useEffect(() => {
    if (images.length < 2 || galleryOpen) return;
    const t = setInterval(() => setActiveImg((n) => (n + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [images.length, galleryOpen]);
  const sugRef = useRef<HTMLDivElement>(null);
  const brRef = useRef<HTMLDivElement>(null);

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [qDate, setQDate] = useState("");
  const [qCity, setQCity] = useState("");
  const [qGuests, setQGuests] = useState("");
  
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

  useEffect(() => {
    supabase.from("cities").select("id,name_ar").eq("active", true).order("sort_order")
      .then(({ data }) => setAllCities((data ?? []) as Array<{ id: string; name_ar: string }>));
  }, []);

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

  const refImages = pickRefImages(subName);
  const heroImgs: string[] = [0, 1, 2].map(
    (i) => images[(activeImg + i) % Math.max(images.length, 1)]?.image_url || refImages[i % refImages.length]
  );
  const cover = heroImgs[0];
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
      "",
      `• تاريخ المناسبة: ${fmtDate(qDate)}`,
      `• المدينة: ${qCity || cityName || "-"}`,
      `• عدد الضيوف: ${qGuests}`,
      `• الوصف: ${qNotes}`,
    ];
    const url = waLink(provider.whatsapp, lines.join("\n"));
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    setQuoteOpen(false);
  };



  return (
    <div dir="rtl" className="pv-root">
      <style>{css}</style>
      <style>{css2}</style>
      <style>{css3}</style>
      <header className="pv-top">
        <Link to="/" className="pv-brand"><img src={logoUrl} alt="إزهليها" /></Link>
        <nav className="pv-topnav">
          <Link to="/" hash="ez-results">مقدمي الخدمات</Link>
          
          <Link to="/favorites">المفضلة</Link>
          <Link to="/" hash="ez-contact">تواصل معنا</Link>
          <Link to="/" hash="ez-faq">الأسئلة الشائعة</Link>
          {isAdmin && <Link to="/admin">الأدمن</Link>}
        </nav>
        <div className="pv-top-side">
          <Link to="/" className="pv-top-cta">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>
            <span>ابحث عن مزوّد</span>
          </Link>
          {user && <button className="pv-top-out" onClick={() => signOut()}>خروج</button>}
        </div>
      </header>

      <div className="pv-crumbbar">
        <Link to="/">الرئيسية</Link>
        <span><ChevronLeft size={13} /></span>
        {subName && <><Link to="/" hash="ez-results">{subName}</Link><span><ChevronLeft size={13} /></span></>}
        <b>{provider.name}</b>
      </div>

      <section className="pv-hero">
        <div className="pv-hero-carousel">
          <button
            type="button"
            className="pv-hero-main"
            key={cover}
            style={{ backgroundImage: `url(${cover})`, animation: "pvFadeSlide .6s ease" }}
            onClick={() => setGalleryOpen(true)}
            aria-label="عرض الصور"
          />
          {images.length > 1 && (
            <>
              <button type="button" className="pv-hero-arrow pv-hero-prev" aria-label="السابق"
                onClick={() => setActiveImg((n) => (n - 1 + images.length) % images.length)}><ChevronRight size={20} /></button>
              <button type="button" className="pv-hero-arrow pv-hero-next" aria-label="التالي"
                onClick={() => setActiveImg((n) => (n + 1) % images.length)}><ChevronLeft size={20} /></button>
              <div className="pv-hero-count" dir="ltr">{(activeImg % images.length) + 1} / {images.length}</div>
            </>
          )}
        </div>
      </section>


      <main className="pv-main">
        <div className="pv-head-grid">
          <div className="pv-head-info">
            <div className="pv-crumbs">
              <span className="pv-chip-new">جديد في أزهليها</span>
              {subName && <span>{subName}</span>}
              {cityName && <span className="pv-crumb-city">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                {cityName}
              </span>}
              {avgRating && <span className="pv-crumb-rate"><Star size={13} fill="currentColor" strokeWidth={0} /> {avgRating} ({reviews.length})</span>}
            </div>

            <div className="pv-title-row">
              {provider.logo_url && <img src={provider.logo_url} alt={`شعار ${provider.name}`} className="pv-provider-logo" loading="lazy" />}
              <h1>{provider.name}</h1>
            </div>
            {provider.description && <p className="pv-lead">{provider.description}</p>}

          </div>

          <aside className="pv-aside">
            <div className="pv-aside-icons">
              <button type="button" className="pv-icon-btn" onClick={shareProvider} aria-label="مشاركة"><ShareIcon /></button>
              <button
                type="button"
                className={`pv-icon-btn ${isFav ? "on" : ""}`}
                disabled={favLoading}
                onClick={toggleFav}
                aria-label={isFav ? "إزالة من المفضلة" : "أضف للمفضلة"}
              ><Heart size={16} fill={isFav ? "currentColor" : "none"} /></button>
            </div>
            <div className="pv-price-bar">
              <div className="pv-price-out">
                <small>السعر التقريبي</small>
                <strong>
                  {provider.price_from
                    ? `من ${provider.price_from} ر.س${provider.price_to ? ` إلى ${provider.price_to} ر.س` : ""}`
                    : (provider.price || "السعر حسب التفاصيل")}
                </strong>
              </div>
              <div className="pv-price-cta">
                {callUrl && (
                  <button type="button" className="pv-sq-btn" aria-label="اتصال" onClick={() => {
                    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
                    if (isMobile) window.location.href = callUrl; else setCallOpen(true);
                  }}><PhoneIcon /></button>
                )}
                {provider.whatsapp && (
                  <button type="button" className="pv-btn-quote pv-btn-quote--wide" onClick={() => setQuoteOpen(true)}>
                    <SendIcon />
                    <span>{siteTexts["provider.quote.cta"] || "اطلب تسعيرة"}</span>
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>

        {(() => {
          const items: Array<[string, string]> = [
            ["s-about", "نبذة"],
            ["s-packages", "الباقات"],
            ["s-services", "الخدمات"],
            ["s-media", "صور وفيديو"],
            ["s-reviews", "التقييمات"],
            ["s-contact", "التواصل والفروع"],
          ];

          return (

            <nav className="pv-secnav">
              <div className="pv-secnav-in">
                {items.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >{label}</button>
                ))}
              </div>
            </nav>
          );
        })()}

        {/* نبذة */}
        <section className="pv-sec" id="s-about">
          <div className="pv-sec-grid">
            <div className="pv-sec-head">
              <span className="pv-eyebrow">عن الخدمة</span>
              <h2>{siteTexts["provider.about.title"] || `خدمة مرتبة على حسب مناسبتك`}</h2>
            </div>
            <div className="pv-sec-body">
              <p>{provider.description || "يضاف وصف تفصيلي للخدمة بعد استلام بيانات مقدم الخدمة."}</p>
              <div className="pv-chips">
                {subName && <span>{subName}</span>}
                {cityName && <span>خدمة في {cityName}</span>}
                {(provider.people_from || provider.people_to) && (
                  <span>
                    {`مناسب لـ ${provider.people_from ?? ""}${provider.people_from && provider.people_to ? "–" : ""}${provider.people_to ?? ""} شخص`}
                  </span>
                )}
                <span>قابل للتخصيص</span>
              </div>
            </div>
          </div>
        </section>

        {/* الباقات */}
        <section className="pv-sec pv-sec--alt" id="s-packages">
          <div className="pv-sec-grid">
            <div className="pv-sec-head">
              <span className="pv-eyebrow">الباقات والخدمات</span>
              <h2>اختر باقة وعدّل عليها</h2>
            </div>
            <div className="pv-sec-body">
              <p className="pv-sec-note">الباقات تعطيك بداية واضحة، والسعر النهائي يتحدد بعد معرفة العدد والتاريخ.</p>
            </div>
          </div>
          {packages.length > 0 ? (
            <div className="pv-pkg-grid">
              {packages.map((pkg, i) => (
                <article className="pv-pkg" key={pkg.id}>
                  {i === 0 && <span className="pv-pkg-badge">الأقرب للطلب الحالي</span>}
                  {pkg.image_url && <img className="pv-pkg-img" src={pkg.image_url} alt={pkg.name} loading="lazy" />}
                  <h3>{pkg.name}</h3>
                  <strong className="pv-pkg-price">{pkg.price || "يُحدد حسب التفاصيل"}</strong>
                  {pkg.description && (
                    <ul className="pv-pkg-list">
                      {pkg.description.split(/\n|،|·|-\s/).map((s) => s.trim()).filter(Boolean).slice(0, 5).map((line, k) => (
                        <li key={k}><CheckIcon />{line}</li>
                      ))}
                    </ul>
                  )}
                  <OfferMedia images={pkg.images ?? []} videos={pkg.videos ?? []} />
                  <p className="pv-pkg-foot">تقدر تحدد هذه الباقة داخل طلب التسعيرة الأساسي.</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="pv-empty">سيتم إضافة الباقات قريباً — تقدر ترسل طلب تسعيرة وتوصلك التفاصيل مباشرة.</div>
          )}
        </section>

        {/* الخدمات */}
        <section className="pv-sec" id="s-services">
          <div className="pv-sec-grid">
            <div className="pv-sec-head">
              <span className="pv-eyebrow">وش تقدر تطلب؟</span>
              <h2>خذ اللي يناسب مناسبتك</h2>
            </div>
            {services.length > 0 ? (
              <div className="pv-srv-grid">
                {services.map((sv) => (
                  <article className="pv-srv" key={sv.id}>
                    <span className="pv-srv-ico"><SparkIcon /></span>
                    <h3>{sv.name}</h3>
                    {sv.price && <strong>{sv.price}</strong>}
                    {sv.description && <p>{sv.description}</p>}
                    <OfferMedia images={sv.images ?? []} videos={sv.videos ?? []} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="pv-empty">سيتم إضافة الخدمات قريباً.</div>
            )}
          </div>
        </section>

        {/* صور وفيديو */}
        {(() => {
          const vids: MediaItem[] = [];
          if (provider.video_url) vids.push({ url: provider.video_url, thumbnail_url: provider.video_thumbnail_url });
          (provider.videos ?? []).forEach((v) => vids.push(v));
          const tiles = [
            ...images.slice(0, 8).map((im) => ({ key: `i${im.id}`, url: im.image_url, poster: im.image_url, isVideo: false })),
            ...vids.map((v, i) => ({ key: `v${i}`, url: v.url, poster: v.thumbnail_url ?? null, isVideo: true })),
          ];
          return (
            <section className="pv-sec pv-sec--alt" id="s-media">
              <div className="pv-sec-grid">
                <div className="pv-sec-head">
                  <span className="pv-eyebrow">من حسابات المزوّد</span>
                  <h2>صور وفيديوهات {provider.name}</h2>
                </div>
                <div className="pv-sec-body">
                  <p className="pv-sec-note">اضغط على الصورة، وينفتح لك المصدر الأصلي عند إضافة الرابط الرسمي.</p>
                </div>
              </div>
              {tiles.length > 0 ? (
                <div className="pv-media-grid">
                  {tiles.map((t) => <MediaCard key={t.key} url={t.url} poster={t.poster} isVideo={t.isVideo} />)}
                </div>
              ) : (
                <div className="pv-empty">سيتم رفع الصور والمقاطع قريباً.</div>
              )}
            </section>
          );
        })()}



        {/* التقييمات */}
        <section className="pv-sec pv-sec--alt" id="s-reviews">
          <div className="pv-sec-grid">
            <div className="pv-sec-head">
              <span className="pv-eyebrow">تقييمات العملاء</span>
              <h2>وش قالوا العملاء؟</h2>
              <p className="pv-sec-note">
                {reviews.length === 0
                  ? "ما فيه تقييمات منشورة للحين. أول تقييم بيظهر هنا بعد ما يرسله عميل مسجل."
                  : `متوسط التقييم ${avgRating} من ٥ حسب ${reviews.length} تقييم.`}
              </p>
            </div>
            <div className="pv-rev-cols">
              <div className="pv-card">
                {reviews.length === 0 ? (
                  <div className="pv-rev-empty">
                    <span className="pv-srv-ico"><ChatIcon /></span>
                    <h3>كن أول من يقيّم {provider.name}</h3>
                    <p>ما نعرض أي تقييم إلا من حساب عميل فعلي.</p>
                  </div>
                ) : (
                  <div className="pv-review-list">
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
                )}
              </div>

              <div className="pv-card">
                <h3 className="pv-card-title">قيّم تجربتك</h3>
                {user ? (
                  <form onSubmit={submitReview} className="pv-rev-form">
                    <div className="pv-stars-input">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button type="button" key={n} className={n <= myRating ? "on" : ""} onClick={() => setMyRating(n)} aria-label={`${n} نجوم`}>★</button>
                      ))}
                    </div>
                    <textarea placeholder="اكتب تجربتك بوضوح ومن دون بيانات شخصية..." rows={4} value={myComment} onChange={(e) => setMyComment(e.target.value)} />
                    <p className="pv-rev-hint">ينشر التقييم باسم حسابك، وتقدر تعدله بإرسال تقييم جديد.</p>
                    <button type="submit" className="pv-btn-quote" disabled={submitting}>{submitting ? "..." : "أرسل التقييم"}</button>
                  </form>
                ) : (
                  <div className="pv-rev-form">
                    <p className="pv-rev-hint">ينشر التقييم باسم حسابك، وتقدر تعدله بإرسال تقييم جديد.</p>
                    <Link to="/login" className="pv-btn-quote" style={{ textDecoration: "none" }}>سجّل دخولك وقيّم</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* التواصل والفروع */}
        <section className="pv-sec" id="s-contact">
          <div className="pv-sec-grid">
            <div className="pv-sec-head">
              <span className="pv-eyebrow">التواصل والفروع</span>
              <h2>تواصل بالطريقة اللي تناسبك</h2>
            </div>
            <div className="pv-sec-body">
              <p className="pv-sec-note">أرقام {provider.name} وحساباته وفروعه بمكان واحد، عشان ما تضيع بين أكثر من صفحة.</p>
            </div>
          </div>

          <div className="pv-contact-cols">
            <div className="pv-card">
              <div className="pv-card-top">
                <div>
                  <h3 className="pv-card-title">اتصال مباشر</h3>
                  <span className="pv-card-sub">عادةً يرد خلال يوم عمل</span>
                </div>
                <span className="pv-card-ico"><PhoneIcon /></span>
              </div>

              <div className="pv-contact-row">
                <div>
                  <small>رقم الاتصال</small>
                  <strong dir="ltr">{callUrl ? callUrl.replace("tel:", "") : "الرقم غير مضاف"}</strong>
                </div>
                {callUrl ? (
                  <button type="button" className="pv-contact-act" onClick={() => {
                    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
                    if (isMobile) window.location.href = callUrl; else setCallOpen(true);
                  }}>اتصال</button>
                ) : <span className="pv-pending">بانتظار البيانات</span>}
              </div>

              <div className="pv-contact-row">
                <div>
                  <small>واتساب</small>
                  <strong dir="ltr">{provider.whatsapp || "رقم واتساب غير مضاف"}</strong>
                </div>
                {waUrl ? (
                  <a className="pv-contact-act" href={waUrl} target="_blank" rel="noopener noreferrer">{contactLabel || "مراسلة"}</a>
                ) : <span className="pv-pending">بانتظار البيانات</span>}
              </div>

              <div className="pv-soc-title">حسابات التواصل</div>
              <div className="pv-soc-grid">
                <SocialTile platform="ig" label="إنستغرام" handle={ig} href={ig ? `https://instagram.com/${ig}` : null} />
                <SocialTile platform="sc" label="سناب شات" handle={sc} href={sc ? `https://snapchat.com/add/${sc}` : null} />
                <SocialTile platform="tk" label="تيك توك" handle={tk} href={tk ? `https://tiktok.com/@${tk}` : null} />
                <SocialTile platform="tw" label="إكس" handle={tw} href={tw ? `https://x.com/${tw}` : null} />
              </div>


              <div className="pv-share-row">
                <button type="button" className="pv-btn-share" onClick={shareProvider}>
                  <ShareIcon /><span>{copiedShare ? "تم نسخ الرابط" : "مشاركة الملف"}</span>
                </button>
              </div>
            </div>

            <div className="pv-card">
              <div className="pv-card-top">
                <div>
                  <h3 className="pv-card-title">الفروع ومناطق الخدمة</h3>
                  <span className="pv-card-sub">اختر الفرع الأقرب لك قبل التواصل.</span>
                </div>
                <span className="pv-card-ico"><PinIcon /></span>
              </div>

              {(() => {
                const list = provider.show_branches !== false && branches.length > 0
                  ? branches.map((br) => ({ id: br.id, name: br.name, address: br.address, phone: br.phone, map_url: br.map_url }))
                  : [{ id: "main", name: "الفرع الرئيسي", address: provider.address || cityName || "يُحدّث من مقدم الخدمة", phone: null as string | null, map_url: provider.map_url }];
                return (
                  <div className="pv-branch-wrap">
                    {list.length > 1 && (
                      <div className="pv-branch-arrows">
                        <button type="button" onClick={() => brRef.current?.scrollBy({ left: -280, behavior: "smooth" })} aria-label="السابق"><ChevronRight size={16} /></button>
                        <button type="button" onClick={() => brRef.current?.scrollBy({ left: 280, behavior: "smooth" })} aria-label="التالي"><ChevronLeft size={16} /></button>
                      </div>
                    )}
                    <div className={`pv-branch-rail ${list.length > 1 ? "" : "pv-branch-rail--one"}`} ref={brRef}>
                      {list.map((br) => (
                        <article className="pv-branch" key={br.id}>
                          <div className="pv-branch-body">
                            <h3>{br.name}</h3>
                            {br.address && <p>{br.address}</p>}
                            {br.phone && <a className="pv-branch-phone" href={`tel:${br.phone}`} dir="ltr">{br.phone}</a>}
                          </div>
                          {br.map_url && (
                            <a className="pv-branch-map" href={br.map_url} target="_blank" rel="noopener noreferrer">الخريطة</a>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        </section>




        {suggestions.length > 0 && (
          <section className="pv-sec" id="s-suggest">
            <div className="pv-sec-grid pv-sug-head">
              <div className="pv-sec-head">
                <span className="pv-eyebrow">{suggestions.length} اقتراحات قريبة</span>
                <h2>ممكن يعجبك بعد</h2>
              </div>
              <div className="pv-sug-arrows">
                <button type="button" onClick={() => sugRef.current?.scrollBy({ left: -320, behavior: "smooth" })} aria-label="السابق"><ChevronRight size={16} /></button>
                <button type="button" onClick={() => sugRef.current?.scrollBy({ left: 320, behavior: "smooth" })} aria-label="التالي"><ChevronLeft size={16} /></button>
              </div>
            </div>
            <div className="pv-sug-rail" ref={sugRef}>
              {suggestions.map((s) => (
                <Link key={s.id} to="/provider/$id" params={{ id: s.id }} className="pv-sug-card" onClick={() => window.scrollTo({ top: 0 })}>
                  <div className="pv-sug-img" style={{ backgroundImage: `url(${s.cover || s.logo_url || defaultProviderUrl})` }} />
                  <div className="pv-sug-body">
                    <h3>{s.name}</h3>
                    {s.city_name && <span className="pv-sug-city">{s.city_name}</span>}
                    <small>السعر التقريبي</small>
                    <strong>{s.price_from ? `يبدأ من ${s.price_from} ر.س` : (s.price || "السعر حسب التفاصيل")}</strong>
                    <span className="pv-sug-more">اكتشف المزيد <i><ArrowLeft size={14} /></i></span>
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
            <p className="pv-quote-sub">عطينا أهم التفاصيل عشان يجيك عرض أقرب للي تبيه.</p>

            <div className="pv-quote-grid">
              <label className="pv-quote-field">
                <span>تاريخ المناسبة <b className="pv-req">*</b></span>
                <input type="date" required value={qDate} onChange={(e) => setQDate(e.target.value)} {...arValidity("الرجاء اختيار تاريخ المناسبة")} />
              </label>
              <label className="pv-quote-field">
                <span>المدينة <b className="pv-req">*</b></span>
                <select required value={qCity} onChange={(e) => setQCity(e.target.value)} {...arValidity("الرجاء اختيار المدينة")}>
                  <option value="">المدن</option>
                  {allCities.map((c) => <option key={c.id} value={c.name_ar}>{c.name_ar}</option>)}
                </select>
              </label>
              <label className="pv-quote-field">
                <span>عدد الضيوف <b className="pv-req">*</b></span>
                <input type="number" min={1} required placeholder="مثال: 80" value={qGuests} onChange={(e) => setQGuests(e.target.value)} {...arValidity("الرجاء إدخال عدد الضيوف")} />
              </label>
            </div>

            <label className="pv-quote-field">
              <span>ما التفاصيل المهمة لك؟ <b className="pv-req">*</b></span>
              <textarea rows={4} required placeholder="نوع المناسبة، الأسلوب المفضل، أو أي احتياج خاص..." value={qNotes} onChange={(e) => setQNotes(e.target.value)} {...arValidity("الرجاء كتابة تفاصيل طلبك")} />
            </label>



            <div className="pv-quote-actions">
              <button type="button" className="pv-quote-cancel" onClick={() => setQuoteOpen(false)}>إلغاء</button>
              <button type="submit" className="pv-btn-quote"><SendIcon /><span>أرسل الطلب لمقدم الخدمة</span></button>
            </div>
          </form>
        </div>
      )}



      {galleryOpen && images.length > 0 && (
        <div className="pv-modal-overlay" onClick={() => setGalleryOpen(false)}>
          <div className="pv-lightbox" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="pv-quote-close" onClick={() => setGalleryOpen(false)} aria-label="إغلاق">×</button>
            <div className="pv-lightbox-grid">
              {images.map((im) => (
                <img key={im.id} src={im.image_url} alt={provider.name} loading="lazy" />
              ))}
            </div>
          </div>
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
                {copiedPhone ? <><Check size={14} /> تم النسخ</> : "نسخ الرقم"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter texts={siteTexts} />
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

function mediaSource(url: string): { key: string; label: string } {
  if (/instagram\.com/i.test(url)) return { key: "ig", label: "إنستغرام" };
  if (/tiktok\.com/i.test(url)) return { key: "tk", label: "تيك توك" };
  if (/snapchat\.com/i.test(url)) return { key: "sc", label: "سناب شات" };
  if (/(twitter|x)\.com/i.test(url)) return { key: "tw", label: "إكس" };
  if (/(youtube\.com|youtu\.be)/i.test(url)) return { key: "yt", label: "يوتيوب" };
  return { key: "web", label: "الرابط الأصلي" };
}

function MediaCard({ url, poster, isVideo }: { url: string; poster: string | null; isVideo: boolean }) {
  const ytId = getYouTubeId(url);
  const isDirect = /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);
  const img = poster || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null);
  const src = mediaSource(url);
  return (
    <figure className="pv-media-card">
      <button
        type="button"
        className="pv-media-tile"
        style={img ? { backgroundImage: `url(${img})` } : undefined}
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        aria-label={isVideo ? "عرض المقطع في المصدر" : "عرض الصورة في المصدر"}
      >
        {!img && isDirect && (
          <video src={`${url}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" />
        )}
        {isVideo && <span className="pv-media-play"><PlayIcon /></span>}
      </button>
      <figcaption className="pv-media-cap">
        <span className="pv-media-src"><SocialGlyph platform={src.key} />{src.label}</span>
        <span className="pv-media-hint">بالانتقال للرابط</span>
      </figcaption>
    </figure>
  );
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
  const poster = thumbnailUrl || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null);
  const [frameFailed, setFrameFailed] = useState(false);

  if (isDirect) {
    return (
      <div className="pv-video-wrap">
        <video
          src={poster ? url : `${url}#t=0.1`}
          controls
          playsInline
          preload="metadata"
          poster={poster ?? undefined}
        />
      </div>
    );
  }
  if (poster) {
    return (
      <button
        type="button"
        className="pv-video-poster"
        style={{ backgroundImage: `url(${poster})` }}
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        aria-label="عرض المقطع في المصدر"
      >
        <span><PlayIcon /></span>
      </button>
    );
  }
  if (!frameFailed) {
    // نحاول عرض أول لقطة من المقطع نفسه بدل الخلفية الساده
    return (
      <button
        type="button"
        className="pv-video-poster pv-video-poster--frame"
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        aria-label="عرض المقطع في المصدر"
      >
        <video
          src={`${url}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          onError={() => setFrameFailed(true)}
          aria-hidden="true"
        />
        <span><PlayIcon /></span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className="pv-video-poster pv-video-poster--empty"
      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
      aria-label="عرض المقطع في المصدر"
    >
      <span><PlayIcon /></span>
      <em className="pv-video-poster-label">شاهد المقطع</em>
    </button>
  );
}




function CheckIcon() {
  return <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>;
}

function SparkIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" /><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15z" /></svg>;
}

function ChatIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12z" /></svg>;
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
}

function SocialGlyph({ platform, size = 16 }: { platform: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true as const };
  if (platform === "ig")
    return <svg {...p} fill="#E4405F"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm7.846-10.405a1.441 1.441 0 01-2.88 0 1.44 1.44 0 012.88 0z" /></svg>;
  if (platform === "sc")
    return <svg {...p} fill="#111"><circle cx="12" cy="12" r="12" fill="#FFFC00" /><path d="M12 4.4c2.13 0 3.86 1.7 3.94 3.83.03.72-.02 1.35-.05 1.86.3.11.63.11.93-.02.15-.06.31-.09.46-.09.2 0 .4.05.56.15.24.14.38.36.39.6.01.32-.2.6-.63.82-.06.03-.16.07-.27.11-.4.15-1 .38-1.17.77-.08.19-.05.44.1.73l.01.01c.05.12 1.29 2.75 3.77 3.16.19.03.33.2.32.4a.58.58 0 01-.04.19c-.19.45-1 .78-2.42.99-.05.06-.1.29-.13.44-.03.15-.06.3-.11.46a.4.4 0 01-.42.3h-.03c-.11 0-.26-.02-.45-.06a4.6 4.6 0 00-.93-.1c-.2 0-.41.02-.62.05-.41.07-.77.32-1.18.61-.6.42-1.28.9-2.31.9l-.14-.01h-.1c-1.03 0-1.7-.48-2.3-.9-.42-.29-.77-.54-1.18-.61a4.05 4.05 0 00-.62-.05c-.38 0-.69.06-.92.1-.19.04-.35.07-.46.07a.4.4 0 01-.43-.31c-.05-.16-.08-.32-.11-.47-.03-.15-.08-.38-.13-.44-1.42-.21-2.23-.54-2.42-.99a.58.58 0 01-.05-.19c-.01-.2.13-.37.33-.4 2.47-.41 3.71-3.04 3.76-3.16v-.01c.16-.29.19-.54.11-.73-.17-.39-.77-.62-1.17-.77-.11-.04-.21-.08-.28-.11-.55-.22-.66-.53-.64-.75.03-.32.32-.59.7-.59.11 0 .21.02.31.06.33.15.62.23.87.23.15 0 .26-.03.32-.06l-.05-.79c-.11-1.73-.24-3.88.32-5.13C8.6 5.13 10.9 4.4 12 4.4z" /></svg>;
  if (platform === "tk")
    return <svg {...p} fill="#010101"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.6-1.62-.94-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>;
  if (platform === "yt")
    return <svg {...p} fill="#FF0000"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" /></svg>;
  if (platform === "web")
    return <svg {...p} fill="none" stroke="#660000" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></svg>;
  return <svg {...p} fill="#000"><path d="M17.5 3h3.3l-7.2 8.2L22 21h-6.6l-4.4-5.7L5.9 21H2.6l7.7-8.8L2.3 3H9l4 5.3L17.5 3zm-1.2 16h1.8L7.8 4.9H5.9L16.3 19z" /></svg>;
}


function SocialTile({ platform, label, handle, href }: { platform: string; label: string; handle: string | null; href: string | null }) {
  const inner = (
    <>
      <span className={`pv-soc-glyph pv-soc-glyph--${platform}`}><SocialGlyph platform={platform} /></span>
      <span className="pv-soc-txt">
        <small>{label}</small>
        <strong>{handle ? `@${handle}` : "غير مضاف"}</strong>
      </span>
    </>
  );
  if (!href) return <div className="pv-soc-tile pv-soc-tile--off">{inner}</div>;
  return <a className="pv-soc-tile" href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
}


function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
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
  .pv-btn-quote { background:#660000; color:#fff; border:none; min-height:40px; padding:0 20px; border-radius:6px; font-family:inherit; font-size:13px; font-weight:500; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 10px 24px rgba(102,0,0,.18); }
  .pv-btn-quote svg { width:16px; height:16px; }
  .pv-btn-quote:hover { background:#4d0000; }
  .pv-quote { background:#FFFDF8; border-radius:18px; padding:22px; width:min(560px,94vw); max-height:92vh; overflow:auto; font-family:Tajawal, system-ui, sans-serif; box-shadow:0 24px 60px rgba(0,0,0,.28); text-align:right; }
  .pv-quote-head { display:flex; align-items:center; justify-content:space-between; }
  .pv-quote-tag { color:#660000; font-size:13px; font-weight:500; }
  .pv-quote-close { background:none; border:none; font-size:24px; line-height:1; cursor:pointer; color:#6b5b55; }
  .pv-quote-title { margin:10px 0 4px; font-size:24px; font-weight:600; color:#241C1A; }
  .pv-quote-sub { margin:0 0 16px; color:#7A6A64; font-size:14px; }
  .pv-quote-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
  .pv-quote-field { display:block; }
  .pv-quote-field > span { display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:#241C1A; }
  .pv-req { color:#D12B2B; font-weight:600; }

  .pv-quote-field input, .pv-quote-field select, .pv-quote-field textarea { width:100%; padding:11px 12px; border:1px solid #E3DBC9; border-radius:10px; font-family:inherit; font-size:14px; background:#fff; color:#241C1A; }
  .pv-quote-field input:focus, .pv-quote-field select:focus, .pv-quote-field textarea:focus { outline:none; border-color:#660000; }
  .pv-quote-actions { display:flex; align-items:center; justify-content:flex-start; gap:12px; margin-top:18px; }
  .pv-quote-cancel { background:none; border:none; font-family:inherit; font-size:14px; font-weight:500; color:#241C1A; cursor:pointer; }
  .pv-quote-actions .pv-btn-quote { padding:12px 22px; box-shadow:none; }
  @media (max-width:640px) { .pv-quote-grid { grid-template-columns:1fr; } }
  .pv-root { min-height:100vh; background:#e6e4d7; font-family:Tajawal, system-ui, sans-serif; color:#000; }
  .pv-nav { background:#fff; border-bottom:1px solid #d8d4c0; padding:0 24px; height:72px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 12px rgba(102,0,0,0.06); position:sticky; top:0; z-index:50; }
  .pv-brand img { height:54px; }
  .pv-nav-actions { display:flex; gap:12px; align-items:center; }
  .pv-link { color:#000; text-decoration:none; font-size:14px; font-weight:600; }
  .pv-link:hover { color:#660000; }
  .pv-btn { background:#660000; color:#fff; padding:0 16px; height:36px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; text-decoration:none; font-size:13px; font-weight:500; }
  .pv-btn-out { background:transparent; color:#660000; border:1px solid #660000; padding:0 16px; height:36px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }

  .pv-main { max-width:1200px; margin:0 auto; padding:24px; }
  .pv-back { display:inline-block; color:#660000; text-decoration:none; font-weight:500; margin-bottom:14px; }
  .pv-grid { display:grid; grid-template-columns:1.1fr 1fr; gap:24px; background:#fff; padding:24px; border-radius:18px; border:1px solid #d8d4c0; }
  @media(max-width:860px){ .pv-grid{ grid-template-columns:1fr; } }
  .pv-fav-icon { position:absolute; bottom:10px; right:10px; width:40px; height:40px; border-radius:50%; border:none; background:#fff; color:#660000; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.18); line-height:1; padding:0; transition:transform 0.15s; z-index:2; }
  .pv-fav-icon:hover { transform:scale(1.08); }
  .pv-fav-icon.active { background:#660000; color:#fff; }


  .pv-cover-wrap { position:relative; }
  .pv-cover { width:100%; aspect-ratio:4/3; background-size:cover; background-position:center; background-color:#e6e4d7; border-radius:14px; }
  .pv-arrow { position:absolute; top:50%; transform:translateY(-50%); width:42px; height:42px; border-radius:50%; border:none; background:rgba(255,255,255,0.92); color:#660000; font-size:28px; font-weight:500; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.18); transition:background 0.15s; line-height:1; padding:0; }
  .pv-arrow:hover { background:#fff; }
  .pv-arrow-prev { right:10px; }
  .pv-arrow-next { left:10px; }
  .pv-counter { position:absolute; bottom:10px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.55); color:#fff; padding:4px 12px; border-radius:50px; font-size:12px; font-weight:600; }
  .pv-thumbs { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
  .pv-thumb { width:70px; height:70px; border-radius:10px; background-size:cover; background-position:center; border:2px solid transparent; cursor:pointer; padding:0; }
  .pv-thumb.active { border-color:#660000; }
  .pv-empty-imgs { color:#555; font-size:14px; text-align:center; padding:14px; }
  .pv-empty-imgs a { color:#660000; font-weight:500; }

  .pv-title-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .pv-provider-logo { width:46px; height:46px; object-fit:cover; border-radius:10px; border:1px solid #d8d4c0; background:#fff; }
  .pv-info h1 { font-size:28px; font-weight:600; margin-bottom:0; }
  .pv-meta { display:flex; gap:10px; color:#555; font-size:13px; flex-wrap:wrap; margin-bottom:14px; }
  .pv-desc { font-size:13.5px; color:#222; line-height:1.8; margin-bottom:14px; }
  .pv-price { font-size:14px; color:#660000; font-weight:600; margin-bottom:10px; }
  .pv-people { font-size:14px; color:#333; font-weight:500; background:#f5f2e5; display:inline-block; padding:6px 12px; border-radius:8px; margin-bottom:12px; }
  .pv-addr { font-size:13px; color:#555; margin-bottom:18px; }
  .pv-actions { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
  .pv-btn-wa { background:transparent; color:#660000; padding:10px 0; border-radius:0; text-align:center; text-decoration:none; font-weight:600; display:flex; align-items:center; justify-content:center; gap:8px; }
  .pv-btn-wa svg { color:#660000; }
  .pv-btn-wa-solid { background:#660000; color:#fff; min-height:40px; padding:0 20px; border-radius:6px; text-align:center; text-decoration:none; font-weight:500; display:flex; align-items:center; justify-content:center; gap:8px; font-size:13px; box-shadow:0 10px 24px rgba(102,0,0,.18); }
  .pv-btn-wa-solid:hover { filter:brightness(0.95); }
  .pv-btn-wa-solid svg { color:#fff; }
  .pv-btn-call, .pv-btn-share { background:#f5f2e5; color:#660000; min-height:40px; padding:0 16px; border-radius:6px; text-align:center; text-decoration:none; font-weight:500; display:flex; align-items:center; justify-content:center; gap:8px; border:1px solid #d8d4c0; cursor:pointer; font-family:inherit; font-size:13px; }
  .pv-btn-share { background:#fff; }
  .pv-btn-map { background:#4285F4; color:#fff; min-height:40px; padding:0 16px; border-radius:6px; display:flex; align-items:center; justify-content:center; text-decoration:none; font-weight:500; font-size:13px; }
  .pv-btn-fav { background:#fff; color:#660000; border:1px solid #660000; min-height:40px; padding:0 16px; border-radius:6px; cursor:pointer; font-family:inherit; font-size:13px; font-weight:500; }
  .pv-btn-fav.active { background:#660000; color:#fff; }

  .pv-socials { display:flex; gap:10px; margin-top:6px; }
  .pv-soc { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:50%; color:#fff; text-decoration:none; font-size:12px; font-weight:600; }
  .pv-soc-call { background:#660000; }
  .pv-soc-ig { background:linear-gradient(45deg,#f09433,#dc2743,#bc1888); }
  .pv-soc-tk { background:#000; }
  .pv-soc-tw { background:#000; }
  .pv-soc-sc { background:#FFFC00; color:#000; }

  .pv-video-section { background:#fff; border:1px solid #d8d4c0; border-radius:18px; padding:24px; margin-top:24px; }
  .pv-video-section h2 { font-size:20px; font-weight:600; margin-bottom:14px; }
  .pv-video-wrap { position:relative; width:100%; padding-top:56.25%; border-radius:12px; overflow:hidden; background:#fff; }
  .pv-video-wrap--tall { padding-top:0; height:min(720px, 90vh); max-width:420px; margin:0 auto; background:#fff; }

  .pv-video-wrap iframe, .pv-video-wrap video { position:absolute; inset:0; width:100%; height:100%; border:none; }
  .pv-video-poster { width:100%; aspect-ratio:16/9; border:0; border-radius:12px; background-size:cover; background-position:center; cursor:pointer; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; }
  .pv-video-poster::before { content:""; position:absolute; inset:0; background:linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.38)); }
  .pv-video-poster span { position:relative; width:68px; height:68px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#fff; color:#660000; box-shadow:0 12px 30px rgba(0,0,0,0.22); }
  .pv-video-poster--frame { background:#1c1210; }
  .pv-video-poster--frame video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; pointer-events:none; }
  .pv-video-poster--empty { background:linear-gradient(135deg,#660000,#3d0000); min-height:280px; flex-direction:column; gap:14px; }
  .pv-video-poster--empty::before { display:none; }
  .pv-video-poster-label { position:relative; color:#fff; font-weight:600; font-size:18px; font-style:normal; }
  .pv-video-link { display:inline-flex; align-items:center; justify-content:center; gap:8px; background:#660000; color:#fff; height:40px; padding:0 20px; border-radius:6px; text-decoration:none; font-weight:500; font-size:13px; }
  .pv-packages { background:#fff; border:1px solid #d8d4c0; border-radius:18px; padding:24px; margin-top:24px; }
  .pv-packages h2 { font-size:20px; font-weight:600; margin-bottom:14px; }
  .pv-package-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
  .pv-package { border:1px solid #e8e6d7; border-radius:12px; padding:12px; display:flex; gap:12px; align-items:flex-start; background:#fffdf8; }
  .pv-package img { width:72px; height:72px; object-fit:cover; border-radius:10px; flex-shrink:0; }
  .pv-package h3 { font-size:15px; font-weight:600; margin:0 0 4px; }
  .pv-package strong { display:block; color:#660000; margin-bottom:5px; }
  .pv-package p { margin:0; color:#333; line-height:1.7; font-size:13px; }
  .pv-tabs { display:flex; gap:8px; margin-bottom:16px; border-bottom:2px solid #e6e4d7; padding-bottom:0; flex-wrap:wrap; }
  .pv-tab { background:none; border:none; padding:10px 18px; font-family:inherit; font-size:13px; font-weight:500; color:#5a4a4a; cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-2px; transition:all .15s; }
  .pv-tab:hover { color:#660000; }
  .pv-tab.on { color:#660000; border-bottom-color:#660000; }
  .pv-inline-tabs { margin:14px 0 16px; }
  .pv-inline-tabs .pv-tabs { margin-bottom:12px; }
  .pv-inline-list { display:flex; flex-direction:column; gap:10px; max-height:340px; overflow-y:auto; padding-inline-end:4px; }
  .pv-branch-list { display:flex; flex-direction:column; gap:10px; }
  .pv-branch { border:1px solid #e8e6d7; border-radius:12px; padding:14px; background:#fffdf8; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
  .pv-branch h3 { font-size:15px; font-weight:600; margin:0 0 4px; }
  .pv-branch p { margin:0 0 4px; color:#333; font-size:13px; }
  .pv-branch-phone { color:#660000; font-weight:500; text-decoration:none; font-size:13px; }
  .pv-branch-map { background:#660000; color:#fff; padding:8px 16px; border-radius:8px; text-decoration:none; font-weight:500; font-size:13px; white-space:nowrap; }
  .pv-reviews { background:#fff; border:1px solid #d8d4c0; border-radius:18px; padding:24px; margin-top:24px; }
  .pv-reviews h2 { font-size:20px; font-weight:600; margin-bottom:16px; }
  .pv-review-form { background:#e6e4d7; padding:14px; border-radius:12px; margin-bottom:18px; display:flex; flex-direction:column; gap:10px; }
  .pv-stars-input { display:flex; gap:4px; }
  .pv-stars-input button { background:none; border:none; font-size:28px; color:#ccc; cursor:pointer; padding:0 2px; }
  .pv-stars-input button.on { color:#f0b400; }
  .pv-review-form textarea { width:100%; border:1px solid #d8d4c0; border-radius:8px; padding:10px; font-family:inherit; font-size:14px; resize:vertical; }
  .pv-btn-primary { background:#660000; color:#fff; border:none; height:40px; padding:0 20px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; font-size:13px; cursor:pointer; font-family:inherit; font-weight:500; align-self:flex-start; }
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
  .pv-suggest h2 { font-size:20px; font-weight:600; margin-bottom:16px; color:#660000; }
  .pv-suggest-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:14px; }
  .pv-suggest-card { display:flex; flex-direction:column; background:#fffdf8; border:1px solid #e8e6d7; border-radius:14px; overflow:hidden; text-decoration:none; color:inherit; transition:transform .15s, box-shadow .15s; }
  .pv-suggest-card:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(102,0,0,0.12); border-color:#660000; }
  .pv-suggest-img { width:100%; aspect-ratio:4/3; background-size:cover; background-position:center; background-color:#e6e4d7; }
  .pv-suggest-body { padding:10px 12px 14px; display:flex; flex-direction:column; gap:4px; }
  .pv-suggest-body h3 { font-size:15px; font-weight:600; margin:0; color:#000; }
  .pv-suggest-city { font-size:12px; color:#666; }
  .pv-suggest-body strong { color:#660000; font-size:13px; font-weight:600; }
  .pv-soc-call { border:none; cursor:pointer; font-family:inherit; }
  .pv-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px; }
  .pv-modal { background:#fff; border-radius:18px; padding:28px 24px; max-width:360px; width:100%; text-align:center; position:relative; box-shadow:0 20px 50px rgba(0,0,0,0.3); font-family:'Tajawal', sans-serif; }
  .pv-modal-close { position:absolute; top:10px; left:14px; background:none; border:none; font-size:26px; cursor:pointer; color:#888; line-height:1; }
  .pv-modal-close:hover { color:#660000; }
  .pv-modal-icon { width:64px; height:64px; border-radius:50%; background:#660000; color:#fff; display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }
  .pv-modal-icon svg { width:28px; height:28px; }
  .pv-modal-title { font-size:18px; font-weight:600; color:#000; margin:0 0 12px; }
  .pv-modal-phone { font-size:24px; font-weight:600; color:#660000; letter-spacing:1px; padding:14px; background:#f5f2e5; border-radius:12px; margin-bottom:18px; direction:ltr; }
  .pv-modal-actions { display:flex; gap:10px; }
  .pv-modal-call { flex:1; background:#660000; color:#fff; min-height:40px; display:flex; align-items:center; justify-content:center; border-radius:6px; text-decoration:none; font-weight:500; font-size:13px; }
  .pv-modal-call:hover { background:#4d0000; }
  .pv-modal-copy { flex:1; background:#fff; color:#660000; padding:14px; border-radius:10px; font-weight:600; font-size:15px; border:2px solid #660000; cursor:pointer; font-family:inherit; }
  .pv-modal-copy:hover { background:#f5f2e5; }
`;

const css2 = `
  .pv-root { background:#F7F3EA; }
  .pv-top { position:sticky; top:0; z-index:60; background:rgba(253,251,245,.92); backdrop-filter:blur(8px); border-bottom:1px solid #E3DBC9; min-height:64px; display:flex; align-items:center; justify-content:space-between; gap:18px; padding:8px 32px; }
  .pv-top .pv-brand { display:flex; align-items:center; flex:0 0 auto; }
  .pv-top .pv-brand img { height:64px; width:auto; object-fit:contain; }
  .pv-topnav { display:flex; align-items:center; gap:22px; min-width:0; }
  .pv-topnav a { color:#241C1A; text-decoration:none; font-size:14px; font-weight:600; white-space:nowrap; }
  .pv-topnav a:hover { color:#660000; }
  .pv-top-side { display:flex; align-items:center; gap:12px; flex:0 0 auto; }
  .pv-top-cta { display:inline-flex; align-items:center; justify-content:center; gap:8px; height:40px; background:#660000; color:#fff; text-decoration:none; padding:0 16px; border-radius:6px; font-size:13px; font-weight:600; white-space:nowrap; box-shadow:0 10px 24px rgba(102,0,0,.14); }
  .pv-top-cta:hover { background:#4d0000; }
  .pv-top-out { background:none; border:1px solid #E3DBC9; color:#7A6A64; border-radius:999px; padding:7px 14px; font-family:inherit; font-size:12px; cursor:pointer; }

  .pv-hero { position:relative; display:grid; grid-template-columns:1.9fr 1fr; gap:12px; padding:12px 28px 0; max-width:1440px; margin:0 auto; }
  .pv-hero-main, .pv-hero-thumb { border:0; padding:0; cursor:pointer; background-size:cover; background-position:center; background-color:#EDE6D6; border-radius:6px; }
  .pv-hero-main { height:520px; }
  .pv-hero-side { display:grid; grid-template-rows:1fr 1fr; gap:12px; height:520px; }
  .pv-hero-showall { position:absolute; bottom:18px; left:44px; display:inline-flex; align-items:center; gap:8px; background:#FFFDF8; color:#241C1A; border:1px solid #E3DBC9; border-radius:8px; padding:9px 16px; font-family:inherit; font-size:13px; font-weight:500; cursor:pointer; box-shadow:0 6px 18px rgba(0,0,0,.12); }

  .pv-main { max-width:1440px; margin:0 auto; padding:26px 28px 60px; }
  .pv-head-grid { display:grid; grid-template-columns:1fr 320px; gap:34px; align-items:start; }
  .pv-crumbs { display:flex; align-items:center; justify-content:flex-start; gap:10px; flex-wrap:wrap; color:#7A6A64; font-size:12.5px; margin-bottom:10px; }
  .pv-crumb-city { display:inline-flex; align-items:center; gap:4px; }
  .pv-chip-new { background:#660000; color:#fff; border-radius:6px; padding:4px 10px; font-size:11.5px; font-weight:500; }
  .pv-head-info h1 { font-size:32px; font-weight:600; line-height:1.15; color:#241C1A; }
  .pv-lead { margin:12px 0 18px; color:#5B4C46; font-size:14px; line-height:1.9; max-width:760px; }
  .pv-tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .pv-tile { background:#FBF7EE; border:1px solid #E3DBC9; border-radius:8px; padding:14px 16px; position:relative; }
  .pv-tile svg { color:#660000; position:absolute; top:14px; left:16px; }
  .pv-tile small { display:block; color:#8A7A73; font-size:11.5px; margin-bottom:6px; }
  .pv-tile strong { font-size:14.5px; font-weight:600; color:#241C1A; }

  .pv-aside { display:flex; flex-direction:column; gap:12px; position:sticky; top:80px; }
  .pv-aside-icons { display:flex; gap:8px; justify-content:flex-end; }
  .pv-icon-btn { width:36px; height:36px; border-radius:8px; border:1px solid #E3DBC9; background:#FFFDF8; color:#660000; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; }
  .pv-icon-btn.on { background:#660000; color:#fff; border-color:#660000; }
  .pv-price-card { background:#FBF7EE; border:1px solid #E3DBC9; border-radius:10px; padding:20px; text-align:center; }
  .pv-price-card > small { color:#8A7A73; font-size:12px; }
  .pv-price-value { font-size:23px; font-weight:600; color:#660000; margin:8px 0 10px; }
  .pv-price-card > p { color:#7A6A64; font-size:12.5px; line-height:1.8; margin-bottom:16px; }
  .pv-price-card .pv-btn-quote { width:100%; border-radius:8px; }
  .pv-price-note { display:flex; gap:8px; align-items:flex-start; text-align:right; color:#8A7A73; font-size:11.5px; line-height:1.7; margin-top:14px; }
  .pv-price-note svg { flex:none; margin-top:3px; color:#660000; }

  .pv-body { margin-top:34px; background:#FFFDF8; border:1px solid #E3DBC9; border-radius:12px; padding:24px; }
  .pv-body .pv-info h1 { display:none; }
  .pv-body .pv-title-row { display:none; }

  .pv-lightbox { background:#FFFDF8; border-radius:14px; padding:22px; width:min(1000px,94vw); max-height:90vh; overflow:auto; }
  .pv-lightbox-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; }
  .pv-lightbox-grid img { width:100%; height:200px; object-fit:cover; border-radius:8px; }

  @media (max-width:1024px) {
    .pv-topnav { display:none; }
  }
  @media (max-width:900px) {
    .pv-hero { grid-template-columns:1fr; padding:10px 14px 0; }
    .pv-hero-main { height:260px; }
    .pv-hero-side { grid-template-rows:1fr; grid-template-columns:1fr 1fr; height:130px; }
    .pv-hero-showall { left:26px; bottom:10px; }
    .pv-main { padding:20px 14px 50px; }
    .pv-head-grid { grid-template-columns:1fr; gap:22px; }
    .pv-head-info h1 { font-size:24px; }
    .pv-tiles { grid-template-columns:1fr; }
    .pv-aside { position:static; }
  }
`;

const css3 = `
  .pv-crumbbar { max-width:1440px; margin:0 auto; padding:14px 28px 0; display:flex; align-items:center; gap:8px; font-size:12.5px; color:#8A7A73; }
  .pv-crumbbar a { color:#8A7A73; text-decoration:none; }
  .pv-crumbbar a:hover { color:#660000; }
  .pv-crumbbar b { color:#241C1A; font-weight:500; }
  .pv-empty { margin-top:22px; padding:26px; border:1px dashed #D9CFB8; border-radius:6px; background:#FFFDF8; color:#6B5B52; font-size:13.5px; font-weight:600; text-align:center; }
  .pv-empty--light { background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.25); color:#F2E9DC; }
  @keyframes pvFadeSlide { from { opacity:.35; transform:scale(1.03); } to { opacity:1; transform:scale(1); } }
  .pv-secnav { position:sticky; top:64px; z-index:40; background:#FFFDF8; border-top:1px solid #E3DBC9; border-bottom:1px solid #E3DBC9; margin:30px -28px 0; }

  .pv-secnav-in { max-width:1440px; margin:0 auto; padding:0 28px; display:flex; gap:26px; overflow-x:auto; justify-content:flex-start; }
  .pv-secnav button { background:none; border:none; font-family:inherit; font-size:14px; font-weight:500; color:#5B4C46; padding:15px 0; cursor:pointer; white-space:nowrap; border-bottom:2px solid transparent; }
  .pv-secnav button:hover { color:#660000; border-bottom-color:#660000; }

  .pv-sec { margin:0 -28px; padding:64px 28px; border-bottom:1px solid #EFE7D8; }
  .pv-sec--alt { background:#F1EADC; }
  .pv-sec--dark { background:#241C1A; color:#F7F3EA; }
  .pv-sec-grid { max-width:1440px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:start; }
  .pv-eyebrow { display:inline-flex; align-items:center; gap:10px; color:#660000; font-size:12.5px; font-weight:600; letter-spacing:.02em; }
  .pv-eyebrow::after { content:""; width:38px; height:1px; background:currentColor; opacity:.5; }
  .pv-eyebrow--light { color:#D9A24A; }
  .pv-sec-head h2 { font-size:24px; font-weight:600; color:#241C1A; margin:12px 0 0; line-height:1.25; }
  .pv-sec--dark .pv-sec-head h2 { color:#F7F3EA; }
  .pv-sec-body p { color:#5B4C46; font-size:15.5px; line-height:2; margin:0; }
  .pv-sec-note { color:#7A6A64; font-size:14px; line-height:1.9; }
  .pv-sec-note--light { color:#C9BEB6; }
  .pv-chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
  .pv-chips span { background:#FBF7EE; border:1px solid #E3DBC9; border-radius:8px; padding:7px 14px; font-size:13px; font-weight:500; color:#241C1A; }

  .pv-pkg-grid { max-width:1440px; margin:34px auto 0; display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:18px; }
  .pv-pkg { position:relative; background:#FFFDF8; border:1px solid #E3DBC9; border-radius:12px; padding:22px; display:flex; flex-direction:column; gap:10px; }
  .pv-pkg-badge { position:absolute; top:-12px; right:18px; background:#660000; color:#fff; border-radius:6px; padding:5px 12px; font-size:11.5px; font-weight:600; }
  .pv-pkg-img { width:100%; height:150px; object-fit:cover; border-radius:8px; }
  .pv-pkg h3 { font-size:20px; font-weight:600; color:#241C1A; margin:0; }
  .pv-pkg-price { color:#660000; font-size:17px; font-weight:600; }
  .pv-pkg-list { list-style:none; margin:6px 0 0; padding:14px 0 0; border-top:1px solid #EFE7D8; display:flex; flex-direction:column; gap:9px; }
  .pv-pkg-list li { display:flex; align-items:flex-start; gap:8px; font-size:14px; color:#3E3330; line-height:1.7; }
  .pv-pkg-list svg { flex:none; margin-top:3px; color:#660000; }
  .pv-pkg-foot { margin:auto 0 0; padding-top:14px; border-top:1px solid #EFE7D8; color:#8A7A73; font-size:12.5px; line-height:1.7; }

  .pv-srv-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1px solid #E3DBC9; border-radius:12px; overflow:hidden; background:#FFFDF8; }
  .pv-srv { padding:22px; border-inline-start:1px solid #EFE7D8; border-top:1px solid #EFE7D8; }
  .pv-srv:nth-child(-n+2) { border-top:none; }
  .pv-srv:nth-child(odd) { border-inline-start:none; }
  .pv-srv-ico { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:8px; background:#F5EDE0; color:#660000; margin-bottom:12px; }
  .pv-srv h3 { font-size:17px; font-weight:600; color:#241C1A; margin:0 0 6px; }
  .pv-srv strong { display:block; color:#660000; font-size:14px; margin-bottom:6px; }
  .pv-srv p { margin:0; color:#7A6A64; font-size:13.5px; line-height:1.8; }

  .pv-media-grid { max-width:1440px; margin:30px auto 0; display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; }
  .pv-media-card { margin:0; display:flex; flex-direction:column; gap:8px; }
  .pv-media-tile { position:relative; width:100%; height:260px; border:0; padding:0; border-radius:8px; overflow:hidden; background:#EFE7D8 center/cover no-repeat; cursor:pointer; }
  .pv-media-tile video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .pv-media-play { position:absolute; inset:0; margin:auto; width:46px; height:46px; border-radius:50%; background:rgba(255,255,255,.9); color:#241C1A; display:flex; align-items:center; justify-content:center; }
  .pv-media-play svg { width:20px; height:20px; margin-inline-start:2px; }
  .pv-media-cap { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:11.5px; color:#8A7A73; }
  .pv-media-src { display:inline-flex; align-items:center; gap:6px; color:#241C1A; }
  .pv-media-hint { color:#B79A6E; }
  .pv-sec--dark .pv-video-list { max-width:1440px; margin:16px auto 0; }


  .pv-rev-cols, .pv-contact-cols { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
  .pv-contact-cols { max-width:1440px; margin:30px auto 0; }
  .pv-card { background:#FFFDF8; border:1px solid #E3DBC9; border-radius:12px; padding:22px; }
  .pv-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:16px; }
  .pv-card-title { font-size:17px; font-weight:600; color:#241C1A; margin:0 0 4px; }
  .pv-card-sub { color:#8A7A73; font-size:12.5px; }
  .pv-card-ico { color:#660000; }
  .pv-rev-empty { text-align:center; padding:18px 6px; }
  .pv-rev-empty h3 { font-size:16px; font-weight:600; color:#241C1A; margin:6px 0; }
  .pv-rev-empty p { color:#8A7A73; font-size:13px; margin:0; }
  .pv-rev-form { display:flex; flex-direction:column; gap:10px; }
  .pv-rev-form textarea { width:100%; border:1px solid #E3DBC9; border-radius:10px; padding:12px; font-family:inherit; font-size:14px; background:#fff; resize:vertical; }
  .pv-rev-hint { color:#8A7A73; font-size:12px; margin:0; line-height:1.7; }
  .pv-rev-form .pv-btn-quote { border-radius:8px; text-align:center; }

  .pv-contact-row { display:flex; align-items:center; justify-content:space-between; gap:12px; border:1px solid #EFE7D8; background:#FBF7EE; border-radius:10px; padding:12px 14px; margin-bottom:10px; }
  .pv-contact-row small { display:block; color:#8A7A73; font-size:11.5px; margin-bottom:4px; }
  .pv-contact-row strong { font-size:14.5px; font-weight:600; color:#241C1A; }
  .pv-contact-act { background:#660000; color:#fff; border:none; border-radius:8px; padding:9px 16px; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; text-decoration:none; }
  .pv-pending { color:#B08A4A; font-size:12px; font-weight:500; }
  .pv-soc-title { margin:18px 0 10px; font-size:13.5px; font-weight:600; color:#241C1A; }
  .pv-soc-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; }
  .pv-soc-tile { border:1px solid #EFE7D8; border-radius:6px; min-height:48px; padding:8px 12px; background:#FBF7EE; text-decoration:none; display:flex; }
  .pv-soc-tile small { display:block; color:#8A7A73; font-size:10px; margin-bottom:2px; }
  .pv-soc-tile strong { font-size:12px; font-weight:500; color:#241C1A; }
  .pv-soc-tile--off strong { color:#B0A49D; }
  .pv-share-row { margin-top:16px; }

  .pv-before { max-width:1440px; margin:0 auto; background:#FFFDF8; border:1px solid #E3DBC9; border-radius:12px; padding:28px; display:grid; grid-template-columns:1fr 1fr; gap:30px; align-items:center; }
  .pv-before-list { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .pv-before-list li { display:flex; align-items:flex-start; gap:8px; font-size:14px; color:#3E3330; line-height:1.7; }
  .pv-before-list svg { flex:none; margin-top:3px; color:#660000; }

  .pv-sug-head { align-items:center; }
  .pv-sug-arrows { display:flex; gap:10px; justify-content:flex-start; }
  .pv-sug-arrows button { width:36px; height:36px; border-radius:50%; border:1px solid #E3DBC9; background:#FFFDF8; color:#241C1A; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; }
  .pv-sug-arrows button:hover { background:#660000; color:#fff; border-color:#660000; }
  .pv-sug-rail { max-width:1440px; margin:26px auto 0; display:flex; gap:16px; overflow-x:auto; padding-bottom:8px; scroll-snap-type:x mandatory; }
  .pv-sug-card { flex:0 0 270px; scroll-snap-align:start; background:#FFFDF8; border:1px solid #E3DBC9; border-radius:12px; overflow:hidden; text-decoration:none; color:inherit; }
  .pv-sug-card:hover { border-color:#660000; }
  .pv-sug-img { height:170px; background-size:cover; background-position:center; background-color:#EDE6D6; }
  .pv-sug-body { padding:14px; display:flex; flex-direction:column; gap:4px; }
  .pv-sug-body h3 { font-size:16px; font-weight:600; margin:0; color:#241C1A; }
  .pv-sug-city { font-size:12px; color:#8A7A73; }
  .pv-sug-body small { color:#8A7A73; font-size:11.5px; margin-top:6px; }
  .pv-sug-body strong { color:#660000; font-size:14px; font-weight:600; }
  .pv-sug-more { display:inline-flex; align-items:center; gap:6px; color:#660000; font-size:12.5px; font-weight:600; margin-top:6px; }

  /* ===== hero carousel ===== */
  .pv-hero { display:block; }
  .pv-hero-carousel { position:relative; max-width:1440px; margin:0 auto; }
  .pv-hero-carousel .pv-hero-main { width:100%; height:520px; border-radius:10px; }
  .pv-hero-arrow { position:absolute; top:50%; transform:translateY(-50%); width:40px; height:40px; border-radius:50%; border:1px solid #E3DBC9; background:#FFFDF8; color:#241C1A; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 8px 20px rgba(0,0,0,.14); }
  .pv-hero-arrow:hover { background:#660000; color:#fff; border-color:#660000; }
  .pv-hero-prev { right:16px; }
  .pv-hero-next { left:16px; }
  .pv-hero-count { position:absolute; bottom:18px; right:50%; transform:translateX(50%); background:rgba(0,0,0,.55); color:#fff; border-radius:999px; padding:5px 14px; font-size:12px; font-weight:500; }

  /* ===== price bar ===== */
  .pv-price-bar { background:#FFFDF8; border:1px solid #E3DBC9; border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:14px; }
  .pv-price-out small { display:block; color:#8A7A73; font-size:12px; margin-bottom:4px; }
  .pv-price-out strong { color:#660000; font-size:20px; font-weight:600; }
  .pv-price-cta { display:flex; align-items:stretch; gap:10px; }
  .pv-sq-btn { width:52px; min-height:52px; border-radius:12px; border:1px solid #E3DBC9; background:#fff; color:#7A6A64; display:flex; align-items:center; justify-content:center; cursor:pointer; text-decoration:none; }
  .pv-sq-btn:hover { color:#660000; border-color:#660000; }
  .pv-btn-quote--wide { flex:1; border-radius:12px; min-height:52px; }

  /* ===== social tiles ===== */
  .pv-soc-tile { display:flex; align-items:center; gap:10px; }
  .pv-soc-glyph { width:16px; height:16px; display:flex; align-items:center; justify-content:center; color:#660000; flex:none; }
  .pv-soc-glyph svg { width:16px; height:16px; }
  
  
  
  
  .pv-soc-tile--off .pv-soc-glyph { opacity:.45; }

  /* ===== branches rail ===== */
  .pv-branch-wrap { position:relative; }
  .pv-branch-arrows { display:flex; gap:8px; justify-content:flex-start; margin-bottom:10px; }
  .pv-branch-arrows button { width:32px; height:32px; border-radius:50%; border:1px solid #E3DBC9; background:#FFFDF8; color:#241C1A; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; }
  .pv-branch-arrows button:hover { background:#660000; color:#fff; border-color:#660000; }
  .pv-branch-rail { display:flex; gap:12px; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:6px; }
  .pv-branch-rail .pv-branch { flex:0 0 260px; scroll-snap-align:start; flex-direction:column; align-items:flex-start; }
  .pv-branch-rail--one .pv-branch { flex:1 1 auto; }

  .pv-sug-more i { font-style:normal; display:inline-flex; }
  .pv-crumbs .pv-crumb-rate { display:inline-flex; align-items:center; gap:4px; color:#660000; }
  .pv-crumbbar span { display:inline-flex; align-items:center; color:#9A8F86; }

  @media (max-width:900px) {
    .pv-hero-carousel .pv-hero-main { height:280px; }
    .pv-price-bar { position:sticky; bottom:0; }
  }

  @media (max-width:900px) {
    .pv-secnav { margin:24px -14px 0; top:64px; }
    .pv-secnav-in { padding:0 14px; gap:18px; justify-content:flex-start; }
    .pv-sec { margin:0 -14px; padding:40px 14px; }
    .pv-sec-grid, .pv-rev-cols, .pv-contact-cols, .pv-srv-grid, .pv-before, .pv-before-list { grid-template-columns:1fr; }
    .pv-sec-head h2 { font-size:20px; }
    .pv-srv { border-inline-start:none; }
    .pv-srv:nth-child(2) { border-top:1px solid #EFE7D8; }
    .pv-media-tile { height:190px; }
  }

  /* ===== unified mobile alignment (matches home page) ===== */
  @media (max-width:640px) {
    .pv-top { padding:8px 16px; gap:10px; }
    .pv-top .pv-brand img { height:52px; }
    .pv-top-cta { height:40px; padding:0 14px; font-size:12.5px; border-radius:6px; }
    .pv-top-out { padding:0 12px; height:40px; border-radius:6px; font-size:12.5px; }
    .pv-crumbbar { padding:12px 16px 0; flex-wrap:wrap; justify-content:flex-start; text-align:right; }
    .pv-hero { padding:10px 16px 0; }
    .pv-main { padding:20px 16px 50px; }
    .pv-secnav { margin:24px -16px 0; }
    .pv-secnav-in { padding:0 16px; justify-content:flex-start; }
    .pv-sec { margin:0 -16px; padding:40px 16px; }
    .pv-head-info h1, .pv-head-grid h1 { font-size:24px; text-align:right; }
    .pv-lead, .pv-sec-head p { text-align:right; }
    .pv-crumbs { justify-content:flex-start; flex-wrap:wrap; }
    .pv-aside-icons { justify-content:flex-start; }
    .pv-price-bar { border-radius:14px; padding:14px 16px; }
    .pv-price-cta { align-items:stretch; }
    .pv-sq-btn { width:48px; min-height:48px; border-radius:8px; flex:0 0 auto; }
    .pv-btn-quote--wide { min-height:48px; border-radius:8px; font-size:14px; }
    .pv-quote { padding:20px 16px; text-align:right; }
    .pv-quote-actions { flex-direction:row-reverse; justify-content:flex-end; }
    .pv-quote-actions .pv-btn-quote, .pv-quote-actions .pv-quote-cancel { flex:1; min-height:48px; justify-content:center; }
    .pv-soc-grid { justify-items:start; }
    .pv-branch-rail .pv-branch { flex:0 0 82%; }
    .pv-sug-rail .pv-sug-card { flex:0 0 82%; }
    .pv-media-tile { height:190px; }
  }
`;

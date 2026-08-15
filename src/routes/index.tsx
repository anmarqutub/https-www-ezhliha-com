import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import SiteFooter from "@/components/SiteFooter";
import logoUrl from "@/assets/logo.jpg";
import defaultProviderUrl from "@/assets/default-provider.jpg";
import catCateringAsset from "@/assets/ref/cat-catering.jpg.asset.json";
import catVenueAsset from "@/assets/ref/cat-venue.jpg.asset.json";
import catPhotoAsset from "@/assets/ref/cat-photo.jpg.asset.json";
import catBeautyAsset from "@/assets/ref/cat-beauty.jpg.asset.json";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "إزهليها — دليلك لأحلى المناسبات" },
      {
        name: "description",
        content:
          "إزهليها — دليلك الأول لتجهيز مناسباتك بأفخم مزودين الخدمات في المملكة، بضغطة زر.",
      },
      { property: "og:title", content: "إزهليها — دليلك لأحلى المناسبات" },
      {
        property: "og:description",
        content: "ابحث عن الضيافة والقاعات والتصوير والتجميل، قارن براحتك، وتواصل مباشرة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "إزهليها — دليلك لأحلى المناسبات" },
      {
        name: "twitter:description",
        content: "ابحث عن الضيافة والقاعات والتصوير والتجميل، قارن براحتك، وتواصل مباشرة.",
      },
    ],
  }),
});

type City = { id: string; name_ar: string; name_en: string; slug: string };
type Category = { id: string; name_ar: string; name_en: string; slug: string; icon: string | null; image_url: string | null };
type Subcategory = { id: string; category_id: string; parent_id: string | null; name_ar: string; name_en: string; slug: string };
type Provider = {
  id: string;
  subcategory_id: string;
  city_id: string;
  name: string;
  description: string | null;
  price_from: number | null;
  price_to: number | null;
  price: string | null;
  whatsapp: string | null;
  contact_phone: string | null;
  instagram: string | null;
  tiktok: string | null;
  twitter: string | null;
  snapchat: string | null;
  address: string | null;
  rating: number | null;
  is_featured: boolean;
  featured_until: string | null;
  sort_order: number;
};
type ProviderImage = { id: string; provider_id: string; image_url: string };
type Banner = { id: string; title: string | null; image_url: string; link_url: string | null };
type SiteText = { key: string; value: string };

export const WA_MESSAGE = "هلا والله .. جيتك من موقع إزهليها 🤍";
export const CONTACT_WA_NUMBER = "+966573444242"; // رقم تواصل معنا (قابل للتغيير لاحقاً)
export const CONTACT_WA_MESSAGE = "اهلا ازهليها ، عندي استفسار 😎🤍";

const REF_IMAGES = [catCateringAsset.url, catVenueAsset.url, catPhotoAsset.url, catBeautyAsset.url];

function fallbackCategoryImage(name: string, index: number) {
  const n = name || "";
  if (/ضياف|بوفيه|طعام|مأكول|قهو/.test(n)) return catCateringAsset.url;
  if (/قاع|استراح|مكان|فيلا|شاليه/.test(n)) return catVenueAsset.url;
  if (/تصوير|فيديو|كامي/.test(n)) return catPhotoAsset.url;
  if (/تجميل|شعر|مكياج|عناي/.test(n)) return catBeautyAsset.url;
  return REF_IMAGES[index % REF_IMAGES.length];
}


function Home() {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [images, setImages] = useState<ProviderImage[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [branchCities, setBranchCities] = useState<{ provider_id: string; city_id: string | null }[]>([]);
  const [siteTexts, setSiteTexts] = useState<Record<string, string>>({});
  const [bannerIdx, setBannerIdx] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [quickSearch, setQuickSearch] = useState("");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [favOnly, setFavOnly] = useState(false);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());


  useEffect(() => {
    (async () => {
      const [cRes, catRes, subRes, pRes, imgRes, bRes, txtRes, brRes] = await Promise.all([
        supabase.from("cities").select("*").eq("active", true).order("sort_order"),
        supabase.from("categories").select("*").eq("active", true).order("sort_order"),
        supabase.from("subcategories").select("*").eq("active", true).order("sort_order"),
        supabase
          .from("providers")
          .select("*")
          .eq("active", true)
          .order("is_featured", { ascending: false })
          .order("sort_order"),
        supabase.from("provider_images").select("*").order("sort_order"),
        supabase.from("banners").select("*").eq("active", true).order("sort_order"),
        supabase.from("site_texts").select("key,value"),
        supabase.from("branches").select("provider_id,city_id"),
      ]);
      setCities((cRes.data ?? []) as City[]);
      setSelectedCity("");
      setCategories((catRes.data ?? []) as Category[]);
      setSubcategories((subRes.data ?? []) as Subcategory[]);
      setProviders((pRes.data ?? []) as Provider[]);
      setImages((imgRes.data ?? []) as ProviderImage[]);
      setBanners((bRes.data ?? []) as Banner[]);
      setBranchCities((brRes.data ?? []) as { provider_id: string; city_id: string | null }[]);
      setSiteTexts(Object.fromEntries(((txtRes.data ?? []) as SiteText[]).map((x) => [x.key, x.value])));
      setLoading(false);
    })();
  }, []);

  // المفضلة الخاصة بالمستخدم
  useEffect(() => {
    if (!user) { setFavIds(new Set()); return; }
    supabase.from("favorites").select("provider_id").eq("user_id", user.id).then(({ data }) => {
      setFavIds(new Set(((data ?? []) as { provider_id: string }[]).map((f) => f.provider_id)));
    });
  }, [user]);

  const toggleFav = async (providerId: string) => {
    if (!user) return;
    const isFav = favIds.has(providerId);
    setFavIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(providerId); else next.add(providerId);
      return next;
    });
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("provider_id", providerId);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, provider_id: providerId });
    }
  };



  const txt = (key: string, fallback: string) => siteTexts[key] || fallback;
  const statNumber = (key: string, auto: number) => {
    const raw = (siteTexts[key] ?? "").replace(/[^\d]/g, "");
    return raw ? Number(raw) : auto;
  };

  // Scroll to hash target after data loads (links coming from inner pages)
  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => clearTimeout(t);
  }, [loading]);

  // Banner rotator
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const imgsByProvider = useMemo(() => {
    const m = new Map<string, ProviderImage[]>();
    images.forEach((i) => {
      const arr = m.get(i.provider_id) ?? [];
      arr.push(i);
      m.set(i.provider_id, arr);
    });
    return m;
  }, [images]);

  const providerCityIds = useMemo(() => {
    const m = new Map<string, Set<string>>();
    providers.forEach((p) => {
      const s = new Set<string>();
      if (p.city_id) s.add(p.city_id);
      m.set(p.id, s);
    });
    branchCities.forEach((b) => {
      if (!b.city_id) return;
      const s = m.get(b.provider_id);
      if (s) s.add(b.city_id);
    });
    return m;
  }, [providers, branchCities]);

  const matchesCity = (p: Provider) =>
    !selectedCity || (providerCityIds.get(p.id)?.has(selectedCity) ?? false);

  const visibleSubs = selectedCategory
    ? subcategories.filter((s) => s.category_id === selectedCategory && !s.parent_id)
    : [];

  // في قائمة "نوع الخدمة" نعرض كل الأنواع إذا ما تم اختيار تصنيف
  const consoleSubs = selectedCategory
    ? visibleSubs
    : subcategories.filter((s) => !s.parent_id);

  const visibleTertiaries =
    selectedSub !== "all" ? subcategories.filter((s) => s.parent_id === selectedSub) : [];


  const providersCountByCat = useMemo(() => {
    const m = new Map<string, number>();
    const subToCat = new Map(subcategories.map((s) => [s.id, s.category_id]));
    providers.forEach((p) => {
      if (!matchesCity(p)) return;
      const cat = subToCat.get(p.subcategory_id);
      if (!cat) return;
      m.set(cat, (m.get(cat) ?? 0) + 1);
    });
    return m;
  }, [providers, subcategories, selectedCity, providerCityIds]);

  const providersCountByCity = useMemo(() => {
    const m = new Map<string, number>();
    providers.forEach((p) => {
      providerCityIds.get(p.id)?.forEach((cid) => m.set(cid, (m.get(cid) ?? 0) + 1));
    });
    return m;
  }, [providers, providerCityIds]);

  const subMatches = (providerSubId: string, selSub: string) => {
    if (providerSubId === selSub) return true;
    const ps = subcategories.find((s) => s.id === providerSubId);
    return !!ps && ps.parent_id === selSub;
  };

  const q = quickSearch.trim().toLowerCase();

  const PRICE_BANDS: Array<{ id: string; label: string; min: number; max: number }> = [
    { id: "all", label: txt("filter.price.all", "كل الأسعار"), min: 0, max: Infinity },
    { id: "lt1000", label: txt("filter.price.1", "أقل من 1,000 ر.س"), min: 0, max: 1000 },
    { id: "1000-3000", label: txt("filter.price.2", "1,000 – 3,000 ر.س"), min: 1000, max: 3000 },
    { id: "3000-10000", label: txt("filter.price.3", "3,000 – 10,000 ر.س"), min: 3000, max: 10000 },
    { id: "gt10000", label: txt("filter.price.4", "أكثر من 10,000 ر.س"), min: 10000, max: Infinity },
  ];

  const matchesPrice = (p: Provider) => {
    if (priceRange === "all") return true;
    const band = PRICE_BANDS.find((b) => b.id === priceRange);
    if (!band) return true;
    const val = p.price_from ?? p.price_to;
    if (val == null) return false;
    return val >= band.min && val < band.max;
  };

  // كل الفلاتر ما عدا «نوع الخدمة» — تستخدم لحساب الأعداد في القائمة الجانبية
  const baseResults = providers.filter((p) => {
    if (!matchesCity(p)) return false;
    const sub = subcategories.find((s) => s.id === p.subcategory_id);
    if (!sub) return false;
    if (selectedCategory && sub.category_id !== selectedCategory) return false;
    if (!matchesPrice(p)) return false;
    if (favOnly && !favIds.has(p.id)) return false;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !(p.description ?? "").toLowerCase().includes(s)) return false;
    }
    if (q) {
      const cat = categories.find((c) => c.id === sub.category_id);
      const hit =
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (sub.name_ar ?? "").toLowerCase().includes(q) ||
        (cat?.name_ar ?? "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const results = baseResults.filter(
    (p) => selectedSub === "all" || subMatches(p.subcategory_id, selectedSub)
  );

  // قائمة أنواع الخدمة الظاهرة في الشريط الجانبي مع عدد النتائج لكل نوع
  const sidebarSubs = (selectedCategory
    ? subcategories.filter((s) => s.category_id === selectedCategory && !s.parent_id)
    : subcategories.filter((s) => !s.parent_id)
  ).map((s) => ({
    ...s,
    count: baseResults.filter((p) => subMatches(p.subcategory_id, s.id)).length,
  }));

  const filtersActive = !!(
    q || selectedCategory || selectedCity || selectedSub !== "all" || search.trim() || priceRange !== "all" || favOnly
  );


  const featured = results.filter(
    (p) => p.is_featured && (!p.featured_until || new Date(p.featured_until) > new Date())
  );
  const regular = results.filter((p) => !featured.includes(p));

  const homeFeatured = useMemo(
    () =>
      providers
        .filter((p) => p.is_featured && (!p.featured_until || new Date(p.featured_until) > new Date()))
        .slice(0, 6),
    [providers]
  );
  const showcase = homeFeatured.length > 0 ? homeFeatured : providers.slice(0, 6);

  const activeCategory = categories.find((c) => c.id === selectedCategory);
  const currentBanner = banners[bannerIdx];

  const scrollToResults = () => {
    document.getElementById("ez-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollRail = (dir: number) => {
    const el = document.getElementById("ez-cat-rail");
    if (el) el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.7), behavior: "smooth" });
  };


  const resetAll = () => {
    setSelectedCategory(null);
    setSelectedSub("all");
    setSelectedCity("");
    setSearch("");
    setQuickSearch("");
    setPriceRange("all");
    setFavOnly(false);
  };


  const faqs = [
    { q: txt("faq.q1", "كيف أتواصل مع مقدم الخدمة؟"), a: txt("faq.a1", "افتح ملف المزود وبتلقى الواتساب والجوال وحسابات التواصل والفروع كلها في مكان واحد.") },
    { q: txt("faq.q2", "هل الأسعار نهائية؟"), a: txt("faq.a2", "الأسعار تقريبية للاسترشاد، والسعر النهائي يتحدد مع مقدم الخدمة حسب تفاصيل مناسبتك.") },
    { q: txt("faq.q3", "وين ألقى الخدمات اللي حفظتها؟"), a: txt("faq.a3", "من صفحة «المفضلة» في حسابك، وتبقى اختياراتك محفوظة دائماً.") },
    { q: txt("faq.q4", "كيف أضيف مقدم خدمة للموقع؟"), a: txt("faq.a4", "تواصل معنا عبر الواتساب ونرتب لك إضافة ملفك بكل تفاصيله.") },
  ];

  if (!authLoading && !user) {
    return <AuthGate />;
  }

  return (
    <div dir="rtl" className="ez-root">
      <style>{css}</style>

      <header className="ez-nav">
        <Link to="/" className="ez-brand" aria-label="الرئيسية">
          <img src={logoUrl} alt="إزهليها" className="ez-brand-logo" />
        </Link>

        <nav className="ez-nav-menu">
          <button type="button" className="ez-nav-link" onClick={() => { resetAll(); scrollToResults(); }}>
            {txt("nav.providers", "مقدمي الخدمات")}
          </button>
          <button type="button" className="ez-nav-link" onClick={() => setAboutOpen(true)}>{txt("footer.about", "من نحن")}</button>
          <a className="ez-nav-link" href="#ez-faq">{txt("nav.faq", "الأسئلة الشائعة")}</a>
          {user && <Link to="/favorites" className="ez-nav-link">{txt("nav.favorites", "المفضلة")}</Link>}
          <a
            className="ez-nav-link"
            href={waLink(CONTACT_WA_NUMBER, CONTACT_WA_MESSAGE) ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            {txt("nav.contact", "تواصل معنا")}
          </a>
        </nav>


        <div className="ez-nav-actions">
          {!user && (
            <>
              <Link to="/login" className="ez-nav-link">{txt("nav.login", "دخول")}</Link>
              <Link to="/signup" className="ez-nav-btn">{txt("nav.signup", "تسجيل")}</Link>
            </>
          )}
          {user && (
            <>
              {isAdmin && <Link to="/admin" className="ez-nav-link">{txt("nav.admin", "لوحة الأدمن")}</Link>}
              <button type="button" className="ez-nav-cta" onClick={scrollToResults}>
                <span>🔍</span> {txt("nav.cta", "ابحث عن مقدم خدمة")}
              </button>
              <AccountMenu email={user.email ?? ""} onSignOut={signOut} texts={siteTexts} />
            </>
          )}
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="ez-hero">
        <div className="ez-hero-grid">
          <div className="ez-hero-text ez-reveal">
            <div className="ez-eyebrow"><span className="ez-eyebrow-line" />{txt("hero.eyebrow", "دليل مناسبتك الأقرب لك")}</div>
            <h1 className="ez-hero-title">
              {txt("hero.title1", "كل اللي تحتاجه لمناسبتك،")}
              <span className="ez-hero-title-accent">{txt("hero.title2", "بمكان واحد")}</span>
            </h1>
            <p className="ez-hero-desc">
              {txt("hero.desc", "ابحث عن الضيافة والقاعات والتصوير والتجميل، قارن براحتك، وتواصل مباشرة مع اللي يناسب ذوقك وميزانيتك.")}
            </p>
            <ul className="ez-hero-checks">
              <li><i>✓</i>{txt("hero.check1", "بحث سريع")}</li>
              <li><i>✓</i>{txt("hero.check2", "تفاصيل واضحة")}</li>
              <li><i>✓</i>{txt("hero.check3", "تواصل مباشر")}</li>
            </ul>
          </div>

          <div className="ez-hero-media ez-reveal ez-reveal-1">
            <span className="ez-hero-frame" aria-hidden="true" />
            {currentBanner ? (
              currentBanner.link_url ? (
                <a href={currentBanner.link_url} target="_blank" rel="noopener noreferrer" className="ez-hero-banner">
                  <img src={currentBanner.image_url} alt={currentBanner.title ?? ""} />
                  {currentBanner.title && <div className="ez-hero-banner-cap">{currentBanner.title}</div>}
                </a>
              ) : (
                <div className="ez-hero-banner">
                  <img src={currentBanner.image_url} alt={currentBanner.title ?? ""} />
                  {currentBanner.title && <div className="ez-hero-banner-cap">{currentBanner.title}</div>}
                </div>
              )
            ) : txt("home.hero.image", "") ? (
              <div className="ez-hero-banner">
                <img src={txt("home.hero.image", "")} alt={txt("home.hero.title", "إزهليها")} />
                <div className="ez-hero-banner-cap">
                  <strong>{txt("home.hero.title", "إزهليها")}</strong>
                  <span>{txt("home.hero.fallback", "دليلك الأول لتجهيز مناسباتك.. من أفخم مزودين الخدمات في المملكة 🤍")}</span>
                </div>
              </div>
            ) : (
              <div className="ez-hero-banner ez-hero-banner-empty">
                <div>
                  <h2 className="ez-logo-text">{txt("home.hero.title", "إزهليها")}</h2>
                  <p>{txt("home.hero.fallback", "دليلك الأول لتجهيز مناسباتك.. من أفخم مزودين الخدمات في المملكة 🤍")}</p>
                </div>
              </div>
            )}

            {banners.length > 1 && (
              <>
                <button
                  type="button"
                  className="ez-hero-arrow ez-hero-arrow-prev"
                  onClick={() => setBannerIdx((i) => (i - 1 + banners.length) % banners.length)}
                  aria-label="السابق"
                >‹</button>
                <button
                  type="button"
                  className="ez-hero-arrow ez-hero-arrow-next"
                  onClick={() => setBannerIdx((i) => (i + 1) % banners.length)}
                  aria-label="التالي"
                >›</button>
                <div className="ez-hero-dots">
                  {banners.map((_, i) => (
                    <button key={i} onClick={() => setBannerIdx(i)} className={i === bannerIdx ? "active" : ""} aria-label={`بنر ${i + 1}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search console */}
        <div className="ez-console">
          <div className="ez-console-field">
            <label>🏷️ {txt("console.category", "التصنيف")}</label>
            <select
              value={selectedCategory ?? ""}
              onChange={(e) => { setSelectedCategory(e.target.value || null); setSelectedSub("all"); }}
            >
              <option value="">{txt("console.category.all", "كل التصنيفات")}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </div>
          <div className="ez-console-field">
            <label>⚙️ {txt("console.sub", "نوع الخدمة")}</label>
            <select value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)}>
              <option value="all">{txt("console.sub.all", "كل الخدمات")}</option>
              {consoleSubs.map((s) => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
              {visibleTertiaries.map((t) => <option key={t.id} value={t.id}>— {t.name_ar}</option>)}
            </select>
          </div>

          <div className="ez-console-field">
            <label>📍 {txt("console.city", "المدينة")}</label>
            <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
              <option value="">{txt("home.city.all", "كل المدن")}</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </div>
          <button type="button" className="ez-console-btn" onClick={scrollToResults}>
            <span>🔍</span> {txt("console.cta", "ابحث الآن")}
          </button>
        </div>

        {filtersActive && (
          <div className="ez-fchips">
            {activeCategory && (
              <button type="button" className="ez-fchip" onClick={() => { setSelectedCategory(null); setSelectedSub("all"); }}>
                {activeCategory.name_ar} ×
              </button>
            )}
            {selectedSub !== "all" && (
              <button type="button" className="ez-fchip" onClick={() => setSelectedSub("all")}>
                {subcategories.find((s) => s.id === selectedSub)?.name_ar} ×
              </button>
            )}
            {selectedCity && (
              <button type="button" className="ez-fchip" onClick={() => setSelectedCity("")}>
                {cities.find((c) => c.id === selectedCity)?.name_ar} ×
              </button>
            )}
            {(quickSearch.trim() || search.trim()) && (
              <button type="button" className="ez-fchip" onClick={() => { setQuickSearch(""); setSearch(""); }}>
                «{quickSearch.trim() || search.trim()}» ×
              </button>
            )}
            <button type="button" className="ez-fchip ez-fchip-clear" onClick={resetAll}>
              {txt("console.reset", "مسح الفلاتر")}
            </button>
            <span className="ez-fchips-count">{results.length} نتيجة</span>
          </div>
        )}



      </section>

      {/* ── PLATFORM STATS ── */}
      <section className="ez-stats" aria-label="أرقام إزهليها">
        <div className="ez-stat ez-stat--solo">
          <span className="ez-stat-icon">🏛️</span>
          <div>
            <strong>
              أكثر من <CountUp value={statNumber("stat.providers.value", providers.length)} /> {txt("stat.providers", "مزود خدمة")}
            </strong>
          </div>
        </div>
      </section>


      {/* ── ADS / BANNERS ── */}
      {banners.length > 0 && currentBanner && (
        <section className="ez-ad-sec" aria-label="إعلان">
          <div className="ez-ad">
            <div className="ez-ad-media">
              <img src={currentBanner.image_url} alt={currentBanner.title ?? "إعلان"} loading="lazy" />
            </div>
            <div className="ez-ad-body">
              <div className="ez-ad-tags">
                <span className="ez-ad-tag">{txt("ad.tag", "إعلان")}</span>
                <span className="ez-ad-partner">🔖 {txt("ad.partner", "عرض شريك إزهليها")}</span>
              </div>
              <h2 className="ez-ad-title">{currentBanner.title || txt("ad.title", "مساحة إعلانية لشركائنا")}</h2>
              <p className="ez-ad-desc">{txt("ad.desc", "مساحة إعلانية تتغير صورتها ونصها ورابطها حسب حملة العميل، من دون ما تزاحم رحلة التصفح.")}</p>
              {currentBanner.link_url && (
                <a className="ez-ad-cta" href={currentBanner.link_url} target="_blank" rel="noopener noreferrer">
                  {txt("ad.cta", "شوف تفاصيل العرض")} ←
                </a>
              )}
              {banners.length > 1 && (
                <div className="ez-ad-dots">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={i === bannerIdx ? "active" : ""}
                      onClick={() => setBannerIdx(i)}
                      aria-label={`إعلان ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}





      {/* ── CATEGORIES ── */}
      <section className="ez-sec" id="ez-categories">
        <div className="ez-cats-head">
          <div>
            <div className="ez-eyebrow"><span className="ez-eyebrow-line" />{txt("categories.eyebrow", "التصنيفات")}</div>
            <h2 className="ez-h2">{txt("categories.title", "اختر الخدمة اللي تبيها")}</h2>
          </div>
          <div className="ez-rail-nav">
            <button type="button" aria-label="التالي" className="ez-rail-btn" onClick={() => scrollRail(-1)}>→</button>
            <button type="button" aria-label="السابق" className="ez-rail-btn" onClick={() => scrollRail(1)}>←</button>
          </div>
        </div>

        {loading ? (
          <p className="ez-empty">{txt("home.loading", "لحظات.. نجهّز لك كل شي ✨")}</p>
        ) : categories.length === 0 ? (
          <p className="ez-empty">
            {txt("home.categories.empty", "ما فيه تصنيفات لحد الحين.")} {isAdmin && <Link to="/admin">افتح لوحة الأدمن وأضِف تصنيفات.</Link>}
          </p>
        ) : (
          <div className="ez-cat-rail" id="ez-cat-rail">
            {categories.map((c, i) => {
              const count = providersCountByCat.get(c.id) ?? 0;
              const img = c.image_url || fallbackCategoryImage(c.name_ar, i);
              return (
                <button
                  key={c.id}
                  className={`ez-cat-card ${selectedCategory === c.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedCategory(c.id);
                    setSelectedSub("all");
                    setSearch("");
                    setQuickSearch("");
                    setTimeout(scrollToResults, 60);
                  }}
                >
                  <div className="ez-cat-media">
                    <img src={img} alt={c.name_ar} loading="lazy" />
                    <span className="ez-cat-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="ez-cat-go">↖</span>
                    <span className="ez-cat-name">{c.name_ar}</span>
                    <span className="ez-cat-count">
                      {count > 0 ? `${count} ${txt("home.category.count_suffix", "مقدم خدمة")}` : txt("home.category.coming_soon", "قريباً")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>


      {/* ── SHOWCASE ── */}
      {!loading && showcase.length > 0 && (
        <section className="ez-sec ez-sec-alt">
          <div className="ez-eyebrow"><span className="ez-eyebrow-line" />{txt("showcase.eyebrow", "اختيارات إزهليها")}</div>
          <h2 className="ez-h2">{txt("showcase.title", "خيارات تستاهل تبدأ منها")}</h2>
          <div className="ez-grid">
            {showcase.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                city={cities.find((c) => c.id === p.city_id)}
                sub={subcategories.find((s) => s.id === p.subcategory_id)}
                images={imgsByProvider.get(p.id) ?? []}
                contactLabel={txt("provider.whatsapp.label", "للمزيد من التفاصيل")}
                featured={p.is_featured}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── RESULTS ── */}
      <section className="ez-sec" id="ez-results">
        <div className="ez-results-head">
          <div>
            <div className="ez-eyebrow"><span className="ez-eyebrow-line" />{txt("results.eyebrow", "مقدمي الخدمات")}</div>
            <h2 className="ez-h2">
              {filtersActive ? (activeCategory?.name_ar ?? txt("results.title.filtered", "نتائج البحث")) : txt("results.title", "كل مقدمي الخدمات")}
              <span className="ez-count">({results.length})</span>
            </h2>
          </div>
          <div className="ez-results-tools">
            <div className="ez-search">
              <span className="ez-search-icon">🔍</span>
              <input
                type="text"
                placeholder={txt("home.search.placeholder", "ابحث عن مقدم خدمة، تصنيف، أو أي شي تبيه...")}
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
              />
              {quickSearch && <button className="ez-search-clear" onClick={() => setQuickSearch("")} aria-label="مسح">✕</button>}
            </div>
            {filtersActive && (
              <button type="button" className="ez-btn-ghost" onClick={resetAll}>{txt("results.reset", "مسح الفلاتر")}</button>
            )}
          </div>
        </div>

        <div className="ez-results-layout">
          <aside className="ez-fpanel">
            <div className="ez-fpanel-head">
              <div className="ez-eyebrow"><span className="ez-eyebrow-line" />{txt("filter.title", "رتّب اختياراتك")}</div>
              <p>{txt("filter.desc", "حدد اللي يهمك أولاً، والنتائج تتحدث مباشرة.")}</p>
            </div>

            <div className="ez-fgroup">
              <div className="ez-fgroup-head">
                <h4>{txt("filter.service", "نوع الخدمة")}</h4>
                {filtersActive && (
                  <button type="button" className="ez-fclear" onClick={resetAll}>{txt("filter.clear", "مسح الكل")}</button>
                )}
              </div>
              <ul className="ez-flist">
                <li>
                  <button type="button" className={selectedSub === "all" ? "active" : ""} onClick={() => setSelectedSub("all")}>
                    <span>{txt("filter.service.all", "كل الخدمات")}</span>
                    <small>{baseResults.length}</small>
                  </button>
                </li>
                {sidebarSubs.map((s) => (
                  <li key={s.id}>
                    <button type="button" className={selectedSub === s.id ? "active" : ""} onClick={() => setSelectedSub(s.id)}>
                      <span>{s.name_ar}</span>
                      <small>{s.count}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {visibleTertiaries.length > 0 && (
              <div className="ez-fgroup">
                <h4>{txt("home.subs.tertiary_label", "تصنيفات فرعية")}</h4>
                <div className="ez-chips ez-chips-tertiary">
                  {visibleTertiaries.map((t) => (
                    <button key={t.id} className={selectedSub === t.id ? "active" : ""} onClick={() => setSelectedSub(t.id)}>{t.name_ar}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="ez-fgroup">
              <h4>{txt("console.city", "المدينة")}</h4>
              <select className="ez-fselect" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                <option value="">{txt("home.city.all", "كل المدن")}</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>

            <div className="ez-fgroup">
              <h4>{txt("filter.price", "السعر")}</h4>
              <select className="ez-fselect" value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
                {PRICE_BANDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </div>

            {user && (
              <button
                type="button"
                className={`ez-ffav ${favOnly ? "active" : ""}`}
                onClick={() => setFavOnly((v) => !v)}
              >
                <span>♡ {txt("filter.fav_only", "المفضلة فقط")}</span>
                <small>{favIds.size}</small>
              </button>
            )}
          </aside>

          <div className="ez-results-main">
            {loading ? (
              <p className="ez-empty">{txt("home.loading", "لحظات.. نجهّز لك كل شي ✨")}</p>
            ) : results.length === 0 ? (
              <p className="ez-empty">{txt("home.no_results", "ما لقينا شي مطابق.. جرّب كلمة ثانية أو تصفّح التصنيفات 🌷")}</p>
            ) : (
              <>
                {featured.length > 0 && (
                  <>
                    <h3 className="ez-h3">{txt("home.featured.title", "⭐ نخبة مختارة لك")}</h3>
                    <div className="ez-grid">
                      {featured.map((p) => (
                        <ProviderCard
                          key={p.id}
                          provider={p}
                          city={cities.find((c) => c.id === p.city_id)}
                          sub={subcategories.find((s) => s.id === p.subcategory_id)}
                          images={imgsByProvider.get(p.id) ?? []}
                          contactLabel={txt("provider.whatsapp.label", "للمزيد من التفاصيل")}
                          featured
                          isFav={favIds.has(p.id)}
                          onToggleFav={user ? () => toggleFav(p.id) : undefined}
                        />
                      ))}
                    </div>
                  </>
                )}
                {regular.length > 0 && (
                  <>
                    {featured.length > 0 && <h3 className="ez-h3">{txt("home.all_providers.title", "كل المقدمين")}</h3>}
                    <div className="ez-grid">
                      {regular.map((p) => (
                        <ProviderCard
                          key={p.id}
                          provider={p}
                          city={cities.find((c) => c.id === p.city_id)}
                          sub={subcategories.find((s) => s.id === p.subcategory_id)}
                          images={imgsByProvider.get(p.id) ?? []}
                          contactLabel={txt("provider.whatsapp.label", "للمزيد من التفاصيل")}
                          isFav={favIds.has(p.id)}
                          onToggleFav={user ? () => toggleFav(p.id) : undefined}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </section>





      {/* ── FAQ ── */}
      <section className="ez-sec" id="ez-faq">
        <div className="ez-eyebrow"><span className="ez-eyebrow-line" />{txt("faq.eyebrow", "الأسئلة الشائعة")}</div>
        <h2 className="ez-h2">{txt("faq.title", "كل اللي ممكن تحتاج تعرفه")}</h2>
        <p className="ez-muted">{txt("faq.desc", "إجابات سريعة قبل ما تبدأ البحث أو ترسل طلبك.")}</p>
        <div className="ez-faq">
          {faqs.map((f, i) => (
            <div key={i} className={`ez-faq-item ${openFaq === i ? "open" : ""}`}>
              <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{f.q}</span>
                <i>{openFaq === i ? "−" : "+"}</i>
              </button>
              {openFaq === i && <p>{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <SiteFooter texts={siteTexts} />


      {aboutOpen && (
        <div className="ez-about-overlay" onClick={() => setAboutOpen(false)}>
          <div className="ez-about-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ez-about-close" onClick={() => setAboutOpen(false)} aria-label="إغلاق">×</button>
            <h2 className="ez-about-title">{txt("home.about.title", "من نحن")}</h2>
            <p className="ez-about-text">
              {txt("home.about.p1", "إزهليها منصتك الأولى لتجهيز مناسباتك في المملكة العربية السعودية. نجمع لك في مكان واحد نخبة من أفخم مزودين الخدمات وكل اللي تحتاجه عشان يومك يطلع على الأصول 🤍")}
            </p>
            <p className="ez-about-text">
              {txt("home.about.p2", "مهمتنا نوفّر عليك عناء البحث، ونعطيك تجربة سهلة وسريعة تختار منها الأنسب لك من ناحية الجودة والسعر والموقع، مع تواصل مباشر وحفظ مفضّلتك بضغطة.")}
            </p>
            <p className="ez-about-text">
              {txt("home.about.p3", "هدفنا نكون الدليل الموثوق لكل شخص أو عائلة تبي مناسبة مميزة. شكراً لثقتك فينا 💐")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function waLink(whatsapp: string | null | undefined, message = WA_MESSAGE) {
  let wa = (whatsapp ?? "").replace(/\D/g, "");
  if (!wa) return null;
  if (wa.startsWith("00966")) wa = wa.slice(2);
  if (wa.length === 13 && wa.startsWith("9660")) wa = "966" + wa.slice(4);
  if (wa.length === 10 && wa.startsWith("05")) wa = "966" + wa.slice(1);
  else if (wa.length === 9 && wa.startsWith("5")) wa = "966" + wa;
  return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
}

export function cleanHandle(v: string | null) {
  return (v ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/[^/]+\//, "").replace(/\/$/, "");
}

function ProviderCard({
  provider,
  city,
  sub,
  images,
  featured,
  contactLabel,
  isFav,
  onToggleFav,
}: {
  provider: Provider;
  city?: City;
  sub?: Subcategory;
  images: ProviderImage[];
  featured?: boolean;
  contactLabel: string;
  isFav?: boolean;
  onToggleFav?: () => void;
}) {
  const cover = images[0]?.image_url || defaultProviderUrl;
  const waUrl = waLink(provider.whatsapp);

  return (
    <article className={`ez-card ${featured ? "ez-card-featured" : ""}`}>
      {onToggleFav && (
        <button
          type="button"
          className={`ez-card-fav ${isFav ? "active" : ""}`}
          aria-label={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(); }}
        >
          {isFav ? "♥" : "♡"}
        </button>
      )}
      <Link to="/provider/$id" params={{ id: provider.id }} className="ez-card-link">
        <div className="ez-card-img" style={{ backgroundImage: `url(${cover})` }}>
          {featured && <span className="ez-badge">مميز</span>}
        </div>

        <div className="ez-card-body">
          {sub && <div className="ez-card-kicker">{sub.name_ar}</div>}
          <div className="ez-card-head">
            <h3>{provider.name}</h3>
            {provider.rating ? <span className="ez-rating">⭐ {provider.rating}</span> : null}
          </div>
          {city && <div className="ez-card-meta">📍 {city.name_ar}</div>}
          {provider.description && <p className="ez-card-desc">{provider.description}</p>}
          <div className="ez-card-price">
            <small>السعر التقريبي</small>
            <strong>
              {provider.price_from
                ? `يبدأ من ${provider.price_from} ر.س`
                : provider.price
                  ? provider.price
                  : "السعر حسب التفاصيل"}
            </strong>
          </div>
        </div>
      </Link>
      <div className="ez-card-foot">
        {waUrl ? (
          <a className="ez-wa-btn" href={waUrl} target="_blank" rel="noopener noreferrer">
            <span>{contactLabel}</span>
            <WhatsAppIcon />
          </a>
        ) : (
          <button className="ez-wa-btn" disabled>ما فيه رقم تواصل</button>
        )}
      </div>
    </article>
  );
}

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setCurrent(value); return; }
    let raf = 0;
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || started) return;
        started = true;
        const startedAt = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - startedAt) / 1400, 1);
          setCurrent(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.45 }
    );
    observer.observe(node);
    return () => { observer.disconnect(); window.cancelAnimationFrame(raf); };
  }, [value]);
  return (
    <span ref={ref} dir="ltr" style={{ display: "inline-block", unicodeBidi: "isolate" }}>
      {suffix}{current.toLocaleString("en-US")}
    </span>
  );
}


function WhatsAppIcon({ size = 18 }: { size?: number }) {

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.78 11.78 0 0012.06 0C5.5 0 .17 5.33.17 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 005.74 1.46h.01c6.56 0 11.89-5.33 11.89-11.9 0-3.18-1.24-6.17-3.44-8.42zM12.07 21.8h-.01a9.9 9.9 0 01-5.05-1.38l-.36-.21-3.75.99 1-3.66-.24-.38a9.86 9.86 0 01-1.51-5.26c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.13 1.03 7 2.9a9.83 9.83 0 012.9 7c0 5.46-4.44 9.9-9.88 9.9zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.06 2.88 1.21 3.08.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z" />
    </svg>
  );
}

function AccountMenu({ email, onSignOut, texts }: { email: string; onSignOut: () => void | Promise<void>; texts: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const initial = (email || "?").trim().charAt(0).toUpperCase();
  const t = (k: string, f: string) => texts[k] || f;
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);
  return (
    <div className="ez-acct" onClick={(e) => e.stopPropagation()}>
      <button className="ez-acct-btn" onClick={() => setOpen((o) => !o)} aria-label="حسابي">
        <span className="ez-acct-avatar">{initial}</span>
        <span className="ez-acct-caret">▾</span>
      </button>
      {open && (
        <div className="ez-acct-menu" role="menu">
          <div className="ez-acct-head">
            <div className="ez-acct-avatar lg">{initial}</div>
            <div>
              <div className="ez-acct-title">{t("account.title", "حسابي")}</div>
              <div className="ez-acct-email">{email}</div>
            </div>
          </div>
          <Link to="/favorites" className="ez-acct-item" onClick={() => setOpen(false)}>{t("account.favorites", "♥ المفضلة")}</Link>
          <button className="ez-acct-item ez-acct-out" onClick={() => { setOpen(false); void onSignOut(); }}>{t("account.signout", "↩ تسجيل الخروج")}</button>
        </div>
      )}
    </div>
  );
}

function AuthGate() {
  const [texts, setTexts] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("site_texts").select("key,value").then(({ data }) => {
      setTexts(Object.fromEntries(((data ?? []) as SiteText[]).map((x) => [x.key, x.value])));
    });
  }, []);
  const t = (k: string, f: string) => texts[k] || f;
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#F7F3EA", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Tajawal, system-ui, sans-serif" }}>
      <div style={{ background: "#fff", padding: "40px 32px", borderRadius: 20, maxWidth: 440, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(102,0,0,0.12)" }}>
        <img src={logoUrl} alt="إزهليها" style={{ height: 90, display: "block", margin: "0 auto 16px auto" }} />
        <h1 style={{ color: "#660000", fontSize: 28, marginBottom: 10 }}>{t("auth_gate.title", "محتوى للأعضاء بس")}</h1>
        <p style={{ color: "#555", fontSize: 15, marginBottom: 24, lineHeight: 1.8 }}>
          {t("auth_gate.description", "عشان تدخل على دليل مقدمين الخدمات لازم تسجّل دخولك. للتسجيل تحتاج كود الشراء اللي وصلك بعد طلبك من متجر سلة 🤍")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link to="/login" style={{ background: "#660000", color: "#fff", padding: "12px 24px", borderRadius: 50, textDecoration: "none", fontWeight: 700 }}>
            {t("auth_gate.login", "تسجيل الدخول")}
          </Link>
          <Link to="/signup" style={{ background: "#fff", color: "#660000", padding: "12px 24px", borderRadius: 50, textDecoration: "none", fontWeight: 700, border: "2px solid #660000" }}>
            {t("auth_gate.signup", "إنشاء حساب جديد")}
          </Link>
        </div>
      </div>
    </div>
  );
}

const css = `
  .ez-root { --bg:#F6F2E8; --surface:#FDFBF5; --brand:#660000; --brand-dark:#4D0000; --ink:#2A211C; --muted:#6E6259; --line:#DDD6C8; --sec:#E9E3D5; --gold:#C9A063;
    --ease-out:cubic-bezier(.23,1,.32,1);
    min-height:100vh; background:var(--bg);
    background-image:radial-gradient(circle at 85% 6%, rgba(201,160,99,.22), transparent 24rem), linear-gradient(180deg,#FBF8F0,#F5F1E6);
    font-family:"Noto Sans Arabic", Tajawal, system-ui, sans-serif; color:var(--ink); scroll-behavior:smooth; font-size:15px; line-height:1.78; }
  .ez-root * { box-sizing:border-box; }
  .ez-root h1, .ez-root h2, .ez-root h3, .ez-root h4, .ez-root button, .ez-root nav { font-family:"Alexandria","Noto Sans Arabic",Tajawal,sans-serif; }
  .ez-root ::selection { background:var(--brand); color:#FBF8F0; }
  .ez-root button, .ez-root a { transition:transform .16s var(--ease-out), opacity .18s var(--ease-out), color .18s var(--ease-out), background-color .18s var(--ease-out), border-color .18s var(--ease-out); }
  .ez-root button:active { transform:scale(.97); }
  .ez-logo-text { font-family:'Rakkas','Reem Kufi Fun',Tajawal,serif; font-weight:400; letter-spacing:1px; }

  .ez-soft-grid { background-image:linear-gradient(rgba(102,0,0,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(102,0,0,.045) 1px, transparent 1px); background-size:32px 32px; }
  @media (prefers-reduced-motion: no-preference) {
    .ez-reveal { animation:ezRevealUp 650ms var(--ease-out) both; }
    .ez-reveal-1 { animation-delay:80ms; }
    .ez-reveal-2 { animation-delay:150ms; }
  }
  @keyframes ezRevealUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }

  /* NAV */
  .ez-nav { background:rgba(253,251,245,.92); backdrop-filter:blur(8px); border-bottom:1px solid var(--line); padding:8px 32px; display:flex; align-items:center; justify-content:space-between; gap:18px; position:sticky; top:0; z-index:100; }
  .ez-brand { text-decoration:none; display:flex; align-items:center; }
  .ez-brand-logo { height:64px; width:auto; object-fit:contain; }
  .ez-nav-menu { display:flex; align-items:center; gap:22px; }
  .ez-nav-link { color:var(--ink); text-decoration:none; font-size:15px; font-weight:600; background:none; border:none; cursor:pointer; font-family:"Alexandria","Noto Sans Arabic",sans-serif; padding:4px 0; position:relative; }
  .ez-nav-link:hover { color:var(--brand); }
  .ez-nav-actions { display:flex; align-items:center; gap:12px; }
  .ez-nav-btn { background:var(--brand); color:#fff; padding:9px 20px; border-radius:6px; text-decoration:none; font-size:13px; font-weight:600; }
  .ez-nav-cta { display:inline-flex; align-items:center; gap:7px; background:var(--brand); color:#fff; border:1px solid var(--brand-dark); padding:9px 18px; border-radius:999px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 6px 16px rgba(102,0,0,.22); transition:background .2s, transform .2s; white-space:nowrap; }
  .ez-nav-cta:hover { background:var(--brand-dark); transform:translateY(-1px); }

  /* SHARED */
  .ez-eyebrow { display:inline-flex; align-items:center; gap:.45rem; font-size:11.5px; color:var(--brand); font-weight:500; letter-spacing:.06em; margin-bottom:14px; font-family:"Alexandria",sans-serif; }
  .ez-eyebrow-line { display:inline-block; width:1.65rem; height:1px; background:linear-gradient(90deg, transparent, var(--brand)); }
  .ez-h2 { font-size:32px; font-weight:600; line-height:1.4; margin:0 0 10px; letter-spacing:-.035em; }
  .ez-h3 { font-size:17px; font-weight:600; margin:26px 0 14px; }
  .ez-muted { color:var(--muted); font-size:13.5px; line-height:1.9; max-width:560px; }
  .ez-count { color:var(--muted); font-size:16px; font-weight:600; margin-inline-start:8px; }
  .ez-btn-primary { display:inline-flex; align-items:center; gap:8px; background:var(--brand); color:#fff; border:none; padding:12px 24px; border-radius:6px; font-family:inherit; font-size:13.5px; font-weight:600; cursor:pointer; margin-top:20px; box-shadow:0 10px 24px rgba(102,0,0,.18); }
  .ez-btn-primary:hover { background:var(--brand-dark); transform:translateY(-2px); }
  .ez-btn-ghost { background:transparent; border:1px solid var(--line); color:var(--brand); padding:10px 16px; border-radius:6px; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; }
  .ez-btn-ghost:hover { border-color:var(--brand); }


  /* HERO */
  .ez-hero { position:relative; isolation:isolate; padding-bottom:20px; border-bottom:1px solid rgba(102,0,0,.08); }
  .ez-hero::before { content:""; position:absolute; inset:0; z-index:-2; background:linear-gradient(135deg,#f8f5ec 0%,#e6e4d7 62%,#ddd5c8 100%); }
  .ez-hero::after { content:""; position:absolute; inset:0; z-index:-1; opacity:.55;
    background-image:linear-gradient(rgba(102,0,0,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(102,0,0,.045) 1px, transparent 1px); background-size:32px 32px;
    -webkit-mask-image:linear-gradient(to bottom, black, transparent 88%); mask-image:linear-gradient(to bottom, black, transparent 88%); }
  .ez-hero-grid { max-width:1240px; margin:0 auto; padding:32px 32px 56px; display:grid; grid-template-columns:1fr 1fr; gap:44px; align-items:center; min-height:500px; }
  .ez-hero-title { font-size:clamp(2.2rem,4.2vw,4rem); line-height:1.18; font-weight:600; letter-spacing:-.05em; margin:16px 0 16px; }
  .ez-hero-title-accent { display:block; color:var(--brand); margin-top:4px; }
  .ez-hero-desc { color:var(--muted); font-size:15px; line-height:1.9; max-width:520px; margin:0 0 20px; }
  .ez-hero-checks { list-style:none; display:flex; gap:18px; padding:0; margin:0; flex-wrap:wrap; }
  .ez-hero-checks li { display:flex; align-items:center; gap:8px; font-size:12.5px; color:rgba(42,33,28,.72); }
  .ez-hero-checks i { width:20px; height:20px; border-radius:50%; border:1px solid rgba(102,0,0,.2); background:rgba(102,0,0,.06); display:flex; align-items:center; justify-content:center; font-style:normal; font-size:11px; color:var(--brand); }
  .ez-hero-media { position:relative; max-width:570px; width:100%; }
  .ez-hero-frame { position:absolute; top:-32px; inset-inline-start:-32px; width:38%; height:72%; border:1px solid rgba(102,0,0,.16); z-index:0; }
  .ez-hero-banner { display:block; position:relative; overflow:hidden; border-radius:14px; box-shadow:0 28px 70px rgba(53,24,19,.16); z-index:1; }
  .ez-hero-banner img { display:block; width:100%; aspect-ratio:16/10; height:auto; object-fit:cover; transition:transform .52s var(--ease-out); }
  .ez-hero-banner:hover img { transform:scale(1.035); }
  .ez-hero-banner-empty { position:relative; background:radial-gradient(120% 120% at 20% 0%, rgba(255,255,255,.14), transparent 55%), linear-gradient(135deg,var(--brand),var(--brand-dark)); color:#fff; aspect-ratio:16/10; display:flex; align-items:center; justify-content:center; text-align:center; padding:32px; }
  .ez-hero-banner-empty::after { content:""; position:absolute; inset:14px; border:1px solid rgba(255,255,255,.18); border-radius:10px; pointer-events:none; }
  .ez-hero-banner-empty h2 { font-size:clamp(30px,4vw,44px); margin-bottom:12px; letter-spacing:-.02em; }
  .ez-hero-banner-empty p { opacity:.88; font-size:14.5px; line-height:1.9; max-width:420px; margin:0 auto; }
  .ez-hero-banner-cap { position:absolute; inset:auto 0 0 0; padding:22px; background:linear-gradient(transparent, rgba(43,10,10,.72)); color:#fff; display:grid; gap:4px; text-align:start; }
  .ez-hero-banner-cap strong { font-size:19px; font-weight:600; }
  .ez-hero-banner-cap span { font-size:13px; opacity:.85; line-height:1.8; }

  .ez-hero-arrow { position:absolute; top:50%; transform:translateY(-50%); width:40px; height:40px; border-radius:50%; border:1px solid rgba(255,255,255,.35); background:rgba(255,255,255,.14); backdrop-filter:blur(6px); color:#fff; font-size:22px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:2; }
  .ez-hero-arrow:hover { background:var(--brand); border-color:var(--brand); }
  .ez-hero-arrow-prev { right:14px; }
  .ez-hero-arrow-next { left:14px; }
  .ez-hero-dots { position:absolute; bottom:14px; inset-inline-start:0; inset-inline-end:0; display:flex; gap:7px; justify-content:center; z-index:2; }
  .ez-hero-dots button { width:8px; height:8px; border-radius:50%; border:none; background:rgba(255,255,255,.55); cursor:pointer; padding:0; }
  .ez-hero-dots button.active { background:#fff; width:20px; border-radius:50px; }

  /* CONSOLE */
  .ez-console { position:relative; z-index:20; max-width:1240px; margin:-32px auto 0; background:#fff; border:1px solid var(--line); border-radius:999px; padding:8px; box-shadow:0 22px 50px rgba(53,24,19,.12); display:grid; grid-template-columns:1fr 1fr 1fr auto; align-items:center; }
  .ez-console-field { padding:8px 22px; border-inline-start:1px solid var(--line); display:flex; flex-direction:column; gap:2px; }
  .ez-console-field:first-child { border-inline-start:none; }
  .ez-console-field label { font-size:12px; color:var(--ink); font-weight:700; }
  .ez-console-field select { border:none; background:transparent; font-family:inherit; font-size:13px; font-weight:500; color:var(--muted); outline:none; cursor:pointer; height:28px; }
  .ez-console-field select:disabled { color:var(--muted); cursor:not-allowed; }
  .ez-console-btn { align-self:stretch; display:inline-flex; align-items:center; gap:8px; background:var(--brand); color:#fff; border:none; padding:0 30px; border-radius:999px; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; min-height:52px; }
  .ez-console-btn:hover { background:var(--brand-dark); }

  .ez-fchips { max-width:1240px; margin:14px auto 0; padding:0 32px; display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  .ez-fchip { background:var(--surface); border:1px solid var(--line); color:var(--ink); font-family:inherit; font-size:12.5px; font-weight:600; padding:6px 12px; border-radius:50px; cursor:pointer; }
  .ez-fchip:hover { border-color:var(--brand); color:var(--brand); }
  .ez-fchip-clear { background:var(--brand); border-color:var(--brand); color:#fff; }
  .ez-fchip-clear:hover { background:var(--brand-dark); color:#fff; }
  .ez-fchips-count { font-size:12px; color:var(--muted); margin-inline-start:auto; }
  .ez-stats { border-bottom:1px solid rgba(102,0,0,.08); background:var(--surface); display:flex; justify-content:center; flex-wrap:wrap; padding:22px 16px; margin-top:34px; }
  .ez-stat { display:flex; align-items:center; justify-content:center; gap:12px; padding:0 22px; }
  .ez-stat-icon { width:32px; height:32px; border-radius:50%; background:rgba(102,0,0,.06); color:var(--brand); display:flex; align-items:center; justify-content:center; font-size:14px; }
  .ez-stat strong { display:block; color:var(--brand); font-size:24px; font-weight:800; letter-spacing:-.02em; }
  .ez-stat small { color:var(--muted); font-size:11.5px; }
  .ez-ad-sec { padding:26px 32px 6px; }
  .ez-ad { max-width:1240px; margin:0 auto; background:#fff; border:1px solid rgba(102,0,0,.10); border-radius:6px; display:grid; grid-template-columns:.9fr 1.1fr; overflow:hidden; }
  .ez-ad-media { min-height:260px; background:#efeade; }
  .ez-ad-media img { width:100%; height:100%; object-fit:cover; display:block; }
  .ez-ad-body { padding:34px 38px; display:flex; flex-direction:column; align-items:flex-start; gap:14px; }
  .ez-ad-tags { display:flex; align-items:center; gap:10px; font-size:11.5px; color:var(--muted); }
  .ez-ad-tag { background:rgba(102,0,0,.06); color:var(--brand); padding:3px 9px; border-radius:3px; font-weight:600; }
  .ez-ad-title { font-size:29px; font-weight:800; line-height:1.5; margin:0; color:var(--ink, #2A211C); }
  .ez-ad-desc { color:var(--muted); font-size:14px; line-height:1.9; margin:0; }
  .ez-ad-cta { background:var(--brand); color:#fff; text-decoration:none; padding:13px 26px; border-radius:4px; font-weight:700; font-size:14px; }
  .ez-ad-dots { display:flex; gap:6px; margin-top:4px; }
  .ez-ad-dots button { width:7px; height:7px; border-radius:50%; border:0; background:rgba(102,0,0,.2); cursor:pointer; padding:0; }
  .ez-ad-dots button.active { background:var(--brand); width:18px; border-radius:4px; }
  @media (max-width: 860px) { .ez-ad { grid-template-columns:1fr; } .ez-ad-body { padding:24px 20px; } .ez-ad-title { font-size:22px; } .ez-ad-sec { padding:20px 16px 0; } }


  /* SECTIONS */
  .ez-sec { max-width:1240px; margin:0 auto; padding:64px 32px; }
  .ez-sec-alt { background:#F2EDE1; max-width:none; }
  .ez-sec-alt > * { max-width:1240px; margin-inline:auto; }
  .ez-empty { text-align:center; color:var(--muted); padding:48px; font-size:15px; }
  .ez-empty a { color:var(--brand); font-weight:700; }

  /* STEPS */
  .ez-steps-sec { background:#F2EDE1; border-block:1px solid var(--line); }
  .ez-steps-wrap { max-width:1240px; margin:0 auto; padding:64px 32px; display:grid; grid-template-columns:1fr 1.3fr; gap:48px; align-items:center; }
  .ez-steps-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .ez-step-card { background:var(--surface); border:1px solid var(--line); border-radius:6px; padding:20px; }
  .ez-step-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
  .ez-step-icon { width:34px; height:34px; border-radius:50%; background:#F7EFE9; color:var(--brand); display:flex; align-items:center; justify-content:center; font-size:15px; }
  .ez-step-num { color:var(--muted); font-size:12px; letter-spacing:1px; }
  .ez-step-card h3 { font-size:17px; font-weight:800; margin:0 0 6px; }
  .ez-step-card p { color:var(--muted); font-size:13px; line-height:1.8; margin:0; }

  /* CATEGORIES */
  .ez-cats-head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; }
  .ez-rail-nav { display:flex; gap:10px; }
  .ez-rail-btn { width:40px; height:40px; border-radius:50%; border:1px solid var(--line); background:var(--surface); color:var(--ink); font-size:16px; cursor:pointer; transition:all .2s; }
  .ez-rail-btn:hover { background:var(--brand); color:#FFFDF8; border-color:var(--brand); }
  .ez-cat-rail { display:flex; gap:14px; margin-top:26px; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:8px; scrollbar-width:none; }
  .ez-cat-rail::-webkit-scrollbar { display:none; }
  .ez-cat-card { position:relative; flex:0 0 calc(25% - 11px); min-width:250px; scroll-snap-align:start; background:var(--surface); border:1px solid var(--line); border-radius:4px; overflow:hidden; cursor:pointer; text-align:start; font-family:inherit; padding:0; transition:transform .25s, box-shadow .25s, border-color .25s; }
  .ez-cat-card:hover { transform:translateY(-4px); box-shadow:0 18px 36px rgba(122,20,20,.14); border-color:var(--brand); }
  .ez-cat-card.active { border-color:var(--brand); box-shadow:0 10px 26px rgba(122,20,20,.14); }
  .ez-cat-media { position:relative; height:150px; background:#EFE7DA; overflow:hidden; }
  .ez-cat-media img { width:100%; height:100%; object-fit:cover; transition:transform .5s; }
  .ez-cat-media::after { content:""; position:absolute; inset:0; background:linear-gradient(to top, rgba(20,12,10,.72), rgba(20,12,10,.05) 60%); }
  .ez-cat-card:hover .ez-cat-media img { transform:scale(1.06); }
  .ez-cat-num { position:absolute; top:12px; inset-inline-start:12px; z-index:2; color:rgba(255,253,248,.85); font-size:11px; font-weight:700; }
  .ez-cat-go { position:absolute; bottom:12px; inset-inline-end:12px; z-index:2; width:32px; height:32px; border-radius:50%; background:rgba(255,253,248,.22); border:1px solid rgba(255,253,248,.45); color:#FFFDF8; font-size:14px; display:flex; align-items:center; justify-content:center; }
  .ez-cat-name { position:absolute; bottom:26px; inset-inline-start:14px; z-index:2; font-size:16px; font-weight:800; color:#FFFDF8; }
  .ez-cat-count { position:absolute; bottom:10px; inset-inline-start:14px; z-index:2; font-size:11px; color:rgba(255,253,248,.75); }


  /* RESULTS HEAD */
  .ez-results-head { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; flex-wrap:wrap; margin-bottom:18px; }
  .ez-results-tools { display:flex; align-items:center; gap:10px; }
  .ez-search { background:var(--surface); border:1px solid var(--line); border-radius:50px; display:flex; align-items:center; gap:6px; padding:4px 14px; min-width:320px; }
  .ez-search input { flex:1; border:none; outline:none; padding:10px 6px; font-size:14px; font-family:inherit; background:transparent; color:var(--ink); }
  .ez-search-icon { color:var(--brand); font-size:14px; }
  .ez-search-clear { background:transparent; border:none; color:var(--brand); font-size:15px; cursor:pointer; padding:4px 8px; font-family:inherit; }
  .ez-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
  .ez-chips button { background:var(--surface); border:1px solid var(--line); padding:8px 16px; border-radius:50px; font-family:inherit; font-size:13px; cursor:pointer; color:var(--ink); transition:all .2s; }
  .ez-chips button:hover { border-color:var(--brand); color:var(--brand); }
  .ez-chips button.active { background:var(--brand); color:#fff; border-color:var(--brand); }
  .ez-chips-tertiary { background:var(--surface); padding:8px 12px; border-radius:8px; align-items:center; border:1px solid var(--line); }
  .ez-tertiary-label { font-size:12px; color:var(--muted); font-weight:700; margin-left:6px; }

  /* CITY CHIPS */
  .ez-city-chips { display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }
  .ez-city-chips button { display:inline-flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--line); padding:12px 22px; border-radius:50px; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; color:var(--ink); transition:all .2s; }
  .ez-city-chips button small { color:var(--muted); font-weight:600; font-size:11px; }
  .ez-city-chips button:hover { border-color:var(--brand); color:var(--brand); }
  .ez-city-chips button.active { background:var(--brand); color:#fff; border-color:var(--brand); }
  .ez-city-chips button.active small { color:rgba(255,255,255,.75); }

  /* CARDS */
  .ez-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:18px; }
  .ez-results-layout { display:grid; grid-template-columns:288px 1fr; gap:26px; align-items:start; }
  .ez-fpanel { position:sticky; top:16px; background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:18px; display:flex; flex-direction:column; gap:18px; }
  .ez-fpanel-head p { margin:6px 0 0; color:var(--muted); font-size:13px; line-height:1.7; }
  .ez-fgroup h4 { margin:0 0 10px; font-size:15px; color:var(--ink); }
  .ez-fgroup-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }
  .ez-fgroup-head h4 { margin:0; }
  .ez-fclear { background:none; border:none; color:var(--brand); font:inherit; font-size:13px; cursor:pointer; }
  .ez-flist { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
  .ez-flist button { width:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; background:none; border:none; border-inline-start:3px solid transparent; padding:9px 10px; font:inherit; font-size:14px; color:var(--ink); cursor:pointer; border-radius:8px; transition:background .2s var(--ease-out); }
  .ez-flist button:hover { background:rgba(102,0,0,.05); }
  .ez-flist button.active { background:var(--sec); border-inline-start-color:var(--brand); font-weight:700; color:var(--brand); }
  .ez-flist small { color:var(--muted); font-size:12px; }
  .ez-fselect { width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:10px; background:#fff; font:inherit; font-size:14px; color:var(--ink); }
  .ez-ffav { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:11px 12px; border:1px solid var(--line); border-radius:10px; background:#fff; font:inherit; font-size:14px; cursor:pointer; color:var(--ink); }
  .ez-ffav.active { background:var(--brand); border-color:var(--brand); color:#fff; }
  .ez-ffav small { opacity:.75; font-size:12px; }
  .ez-card { position:relative; }
  .ez-card-fav { position:absolute; top:10px; inset-inline-start:10px; z-index:2; width:34px; height:34px; border-radius:50%; border:1px solid var(--line); background:rgba(255,255,255,.92); color:var(--brand); font-size:16px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .ez-card-fav.active { background:var(--brand); color:#fff; border-color:var(--brand); }
  @media (max-width: 900px) {
    .ez-results-layout { grid-template-columns:1fr; }
    .ez-fpanel { position:static; }
  }

  .ez-card { position:relative; background:color-mix(in oklab, var(--surface) 94%, transparent); border:1px solid color-mix(in oklab, var(--line) 70%, transparent); box-shadow:0 14px 42px rgba(53,24,19,.06); border-radius:0; overflow:hidden; transition:transform .24s var(--ease-out), box-shadow .24s var(--ease-out), border-color .18s var(--ease-out); display:flex; flex-direction:column; }
  .ez-card::before { content:""; position:absolute; inset-inline-start:1.4rem; top:-1px; z-index:3; width:2.4rem; height:1px; background:var(--brand); }
  .ez-card::after { content:""; position:absolute; inset-inline-end:0; bottom:0; z-index:3; width:14px; height:14px; border-inline-end:1px solid rgba(102,0,0,.3); border-bottom:1px solid rgba(102,0,0,.3); }
  .ez-card:hover { transform:translateY(-3px); box-shadow:0 20px 48px rgba(53,24,19,.1); border-color:rgba(102,0,0,.2); }
  .ez-card-featured { border-color:rgba(102,0,0,.3); }
  .ez-card-link { text-decoration:none; color:inherit; display:flex; flex-direction:column; flex:1; }
  .ez-card-img { height:200px; background-size:cover; background-position:center; background-color:#EFE7DA; position:relative; transition:transform .52s var(--ease-out); }
  .ez-card:hover .ez-card-img { transform:scale(1.035); }
  .ez-badge { position:absolute; top:10px; inset-inline-end:10px; background:rgba(238,231,216,.94); backdrop-filter:blur(4px); border:1px solid rgba(102,0,0,.1); color:var(--brand); padding:4px 10px; border-radius:0; font-size:9.5px; font-weight:600; }

  .ez-card-body { padding:18px; flex:1; display:flex; flex-direction:column; }
  .ez-card-kicker { font-size:11px; letter-spacing:2px; color:var(--brand); font-weight:700; margin-bottom:6px; }
  .ez-card-head { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:4px; }
  .ez-card-head h3 { font-size:18px; font-weight:800; color:var(--ink); margin:0; }
  .ez-rating { font-size:12px; color:var(--muted); white-space:nowrap; }
  .ez-card-meta { font-size:12px; color:var(--muted); margin-bottom:10px; }
  .ez-card-desc { font-size:13px; color:var(--muted); line-height:1.8; margin:0 0 12px; flex:1; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .ez-card-price { border-top:1px dashed var(--line); padding-top:12px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .ez-card-price small { color:var(--muted); font-size:11px; }
  .ez-card-price strong { color:var(--brand); font-size:14px; font-weight:800; }
  .ez-card-foot { padding:0 18px 16px; }
  .ez-wa-btn { display:flex; width:100%; align-items:center; justify-content:center; gap:7px; background:transparent; color:var(--brand); padding:10px 0; text-decoration:none; font-size:14px; font-weight:800; border:none; cursor:pointer; font-family:inherit; }
  .ez-wa-btn:hover { color:var(--brand-dark); text-decoration:underline; text-underline-offset:4px; }
  .ez-wa-btn:disabled { color:var(--muted); cursor:not-allowed; }

  /* FAQ */
  .ez-faq { margin-top:26px; border-top:1px solid var(--line); }
  .ez-faq-item { border-bottom:1px solid var(--line); }
  .ez-faq-item button { width:100%; display:flex; align-items:center; justify-content:space-between; gap:16px; background:none; border:none; padding:20px 4px; font-family:inherit; font-size:16px; font-weight:700; color:var(--ink); cursor:pointer; text-align:start; }
  .ez-faq-item i { font-style:normal; color:var(--brand); font-size:20px; }
  .ez-faq-item p { color:var(--muted); font-size:14px; line-height:1.9; margin:0 4px 20px; max-width:760px; }
  .ez-faq-item.open button { color:var(--brand); }

  /* FOOTER */
  .ez-footer { background:var(--brand); color:#fff; padding:0; }
  .ez-footer-grid { max-width:1240px; margin:0 auto; padding:52px 32px 44px; display:grid; grid-template-columns:1.2fr .8fr .9fr; gap:36px; }
  .ez-footer-brand { max-width:400px; }
  .ez-footer-brand img { height:64px; width:auto; object-fit:contain; background:#fff; border-radius:8px; padding:6px 10px; }
  .ez-footer-brand p { color:rgba(255,255,255,.72); font-size:13.5px; line-height:1.95; margin:16px 0 0; }
  .ez-footer-col h3 { font-size:14px; font-weight:700; margin:0; color:#fff; }
  .ez-footer-links { margin-top:18px; display:grid; gap:12px; justify-items:start; font-size:13.5px; color:rgba(255,255,255,.7); }
  .ez-footer-links a, .ez-footer-links button { color:rgba(255,255,255,.7); text-decoration:none; background:transparent; border:none; padding:0; cursor:pointer; font-family:inherit; font-size:13.5px; text-align:start; }
  .ez-footer-links a:hover, .ez-footer-links button:hover { color:#fff; }
  .ez-footer-wa { display:inline-flex !important; align-items:center; gap:8px; color:#fff !important; font-weight:700; border:1px solid rgba(255,255,255,.28); padding:9px 18px; border-radius:50px; }
  .ez-footer-wa:hover { background:#fff; color:var(--brand) !important; }
  .ez-footer-bar { border-top:1px solid rgba(255,255,255,.14); display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; padding:18px 32px; font-size:11.5px; color:rgba(255,255,255,.55); }


  /* MODAL */
  .ez-about-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; animation:ezFade .2s ease; }
  .ez-about-modal { background:var(--surface); max-width:560px; width:100%; border-radius:10px; padding:28px 24px 24px; position:relative; box-shadow:0 20px 60px rgba(0,0,0,.3); max-height:85vh; overflow-y:auto; border-top:4px solid var(--brand); }
  .ez-about-close { position:absolute; top:10px; left:14px; background:transparent; border:none; font-size:28px; line-height:1; cursor:pointer; color:var(--muted); padding:4px 10px; border-radius:8px; }
  .ez-about-title { color:var(--brand); font-size:22px; margin:0 0 16px; font-weight:800; text-align:center; }
  .ez-about-text { color:var(--ink); font-size:15px; line-height:1.9; margin:0 0 12px; }
  @keyframes ezFade { from { opacity:0 } to { opacity:1 } }

  /* ACCOUNT */
  .ez-acct { position:relative; }
  .ez-acct-btn { display:flex; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--line); border-radius:50px; padding:4px 10px 4px 4px; cursor:pointer; font-family:inherit; }
  .ez-acct-btn:hover { border-color:var(--brand); }
  .ez-acct-avatar { width:32px; height:32px; border-radius:50%; background:var(--brand); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; }
  .ez-acct-avatar.lg { width:44px; height:44px; font-size:18px; }
  .ez-acct-caret { color:var(--brand); font-size:12px; }
  .ez-acct-menu { position:absolute; top:calc(100% + 8px); inset-inline-end:0; background:var(--surface); border:1px solid var(--line); border-radius:10px; box-shadow:0 12px 30px rgba(122,20,20,.16); min-width:240px; padding:8px; z-index:200; }
  .ez-acct-head { display:flex; align-items:center; gap:10px; padding:10px 8px; border-bottom:1px solid var(--line); margin-bottom:6px; }
  .ez-acct-title { font-weight:800; font-size:14px; }
  .ez-acct-email { font-size:12px; color:var(--muted); word-break:break-all; }
  .ez-acct-item { display:block; width:100%; text-align:start; padding:10px 12px; border-radius:8px; color:var(--ink); text-decoration:none; font-size:14px; font-weight:700; background:transparent; border:none; cursor:pointer; font-family:inherit; }
  .ez-acct-item:hover { background:#F2EDE1; color:var(--brand); }
  .ez-acct-out { color:var(--brand); }

  @media (max-width: 1024px) {
    .ez-nav-menu { display:none; }
    .ez-hero-grid { grid-template-columns:1fr; gap:32px; min-height:0; }
    .ez-hero-media { max-width:none; }
    .ez-steps-wrap { grid-template-columns:1fr; }
    .ez-console { grid-template-columns:1fr 1fr; margin-inline:16px; }
    .ez-console-btn { grid-column:1 / -1; padding:14px; }
  }
  @media (max-width: 640px) {
    .ez-nav { padding:8px 16px; }
    .ez-brand-logo { height:52px; }
    .ez-hero-grid { padding:24px 16px 44px; }
    .ez-hero-frame { display:none; }

    .ez-h2 { font-size:26px; }
    .ez-sec, .ez-steps-wrap { padding:44px 16px; }
    .ez-console { grid-template-columns:1fr; }
    .ez-fchips { padding:0 16px; }
    .ez-console-field { border-inline-start:none; border-top:1px solid var(--line); }
    .ez-console-field:first-child { border-top:none; }
    .ez-steps-cards { grid-template-columns:1fr; }
    .ez-cat-card { flex:0 0 78%; min-width:0; }
    .ez-cat-media { height:130px; }
    .ez-search { min-width:0; width:100%; }
    .ez-results-tools { width:100%; }
    .ez-footer-brand { max-width:none; }
    .ez-footer-grid { grid-template-columns:1fr; padding:40px 16px 32px; gap:28px; }
    .ez-footer-bar { padding:16px; }
  }
`;

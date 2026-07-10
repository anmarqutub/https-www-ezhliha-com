import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import logoUrl from "@/assets/logo.jpg";
import defaultProviderUrl from "@/assets/default-provider.jpg";

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




  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [quickSearch, setQuickSearch] = useState("");

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
      const allCities = (cRes.data ?? []) as City[];
      const allowedIds = ["b231524b-96f9-4fab-a193-8e8cb2f9c510", "e49fe907-ae37-405e-ab06-5f022006124a"];
      const citiesData = allCities.filter((c) => allowedIds.includes(c.id));
      setCities(citiesData);
      // Default to "All cities" (empty selection)
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

  const txt = (key: string, fallback: string) => siteTexts[key] || fallback;

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

  const visibleSubs = selectedCategory
    ? subcategories.filter((s) => s.category_id === selectedCategory && !s.parent_id)
    : [];

  const visibleTertiaries =
    selectedSub !== "all"
      ? subcategories.filter((s) => s.parent_id === selectedSub)
      : [];

  const providersCountByCat = useMemo(() => {
    const m = new Map<string, number>();
    const subToCat = new Map(subcategories.map((s) => [s.id, s.category_id]));
    providers.forEach((p) => {
      if (selectedCity && p.city_id !== selectedCity) return;
      const cat = subToCat.get(p.subcategory_id);
      if (!cat) return;
      m.set(cat, (m.get(cat) ?? 0) + 1);
    });
    return m;
  }, [providers, subcategories, selectedCity]);

  const subMatches = (providerSubId: string, selSub: string) => {
    if (providerSubId === selSub) return true;
    const ps = subcategories.find((s) => s.id === providerSubId);
    return !!ps && ps.parent_id === selSub;
  };

  const categoryProviders = providers.filter((p) => {
    if (selectedCity && p.city_id !== selectedCity) return false;
    const sub = subcategories.find((s) => s.id === p.subcategory_id);
    if (!sub) return false;
    if (selectedCategory) {
      const directCat = sub.category_id === selectedCategory;
      if (!directCat) return false;
    }
    if (selectedSub !== "all" && !subMatches(p.subcategory_id, selectedSub)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.description ?? "").toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  const featured = categoryProviders.filter(
    (p) => p.is_featured && (!p.featured_until || new Date(p.featured_until) > new Date())
  );
  const regular = categoryProviders.filter((p) => !featured.includes(p));

  const activeCategory = categories.find((c) => c.id === selectedCategory);
  const currentBanner = banners[bannerIdx];

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
              <AccountMenu email={user.email ?? ""} onSignOut={signOut} texts={siteTexts} />
            </>
          )}
        </div>
      </header>

      {/* Hero banner — supports admin-managed ad banners */}
      <section className="ez-hero">
        <div className="ez-hero-wrap">
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
          ) : (
            <div className="ez-hero-inner">
              <h1 className="ez-logo-text">إزهليها</h1>
              <p>{txt("home.hero.fallback", "دليلك الأول لتجهيز مناسباتك.. من أفخم مزودين الخدمات في المملكة 🤍")}</p>
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
            </>
          )}
        </div>
        {banners.length > 1 && (
          <div className="ez-hero-dots">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setBannerIdx(i)}
                className={i === bannerIdx ? "active" : ""}
                aria-label={`بنر ${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="ez-quick">
        <div className="ez-search ez-search-big">
          <span className="ez-search-icon">🔍</span>
          <input
            type="text"
            placeholder={txt("home.search.placeholder", "دوّر على مقدم خدمة، تصنيف، أو أي شي تبيه...")}
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
          />
          {quickSearch && (
            <button className="ez-search-clear" onClick={() => setQuickSearch("")} aria-label="مسح">✕</button>
          )}
        </div>
      </section>

      <section className="ez-step">
        <label className="ez-step-label">{txt("home.city.label", "📍 اختر مدينتك")}</label>
        <select
          className="ez-select"
          value={selectedCity}
          onChange={(e) => {
            setSelectedCity(e.target.value);
            setSelectedCategory(null);
            setSelectedSub("all");
          }}
        >
          {cities.length === 0 && <option value="">{txt("home.city.empty", "ما فيه مدن لحد الحين")}</option>}
          {cities.length > 0 && <option value="">{txt("home.city.all", "🌍 كل المدن")}</option>}
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name_ar}</option>
          ))}
        </select>
      </section>

      <main className="ez-main">
        {loading ? (
          <p className="ez-empty">{txt("home.loading", "لحظات.. نجهّز لك كل شي ✨")}</p>
        ) : quickSearch.trim() ? (
          (() => {
            const q = quickSearch.trim().toLowerCase();
            const results = providers.filter((p) => {
              if (selectedCity && p.city_id !== selectedCity) return false;
              const sub = subcategories.find((s) => s.id === p.subcategory_id);
              const cat = sub ? categories.find((c) => c.id === sub.category_id) : null;
              return (
                p.name.toLowerCase().includes(q) ||
                (p.description ?? "").toLowerCase().includes(q) ||
                (sub?.name_ar ?? "").toLowerCase().includes(q) ||
                (cat?.name_ar ?? "").toLowerCase().includes(q)
              );
            });
            return (
              <>
                <div className="ez-section-head">
                  <h2 className="ez-section-title">{txt("home.search.results", "🔍 نتائج البحث")} ({results.length})</h2>
                </div>
                {results.length === 0 ? (
                  <p className="ez-empty">{txt("home.no_results", "ما لقينا شي مطابق.. جرّب كلمة ثانية أو تصفّح التصنيفات 🌷")}</p>
                ) : (
                  <div className="ez-grid">
                    {results.map((p) => (
                      <ProviderCard
                        key={p.id}
                        provider={p}
                        city={cities.find((c) => c.id === p.city_id)}
                        sub={subcategories.find((s) => s.id === p.subcategory_id)}
                        images={imgsByProvider.get(p.id) ?? []}
                        contactLabel={txt("provider.whatsapp.label", "للمزيد من التفاصيل")}
                      />
                    ))}
                  </div>
                )}
              </>
            );
          })()
        ) : !selectedCategory ? (
          <>
            <div className="ez-section-head">
              <h2 className="ez-section-title">{txt("home.categories.title", "✿ تصفّح على كيفك.. حسب التصنيف")}</h2>
            </div>
            {categories.length === 0 ? (
              <p className="ez-empty">
                {txt("home.categories.empty", "ما فيه تصنيفات لحد الحين.")} {isAdmin && <Link to="/admin">افتح لوحة الأدمن وأضِف تصنيفات.</Link>}
              </p>
            ) : (
              <div className="ez-cat-grid">
                {categories.map((c) => {
                  const count = providersCountByCat.get(c.id) ?? 0;
                  return (
                    <button
                      key={c.id}
                      className="ez-cat-card"
                      onClick={() => {
                        setSelectedCategory(c.id);
                        setSelectedSub("all");
                        setSearch("");
                      }}
                    >
                      <div className="ez-cat-card-head">
                        <div className="ez-cat-name">{c.name_ar}</div>
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="ez-cat-img" />
                        ) : (
                          <div className="ez-cat-icon">{c.icon ?? "✿"}</div>
                        )}
                      </div>
                      <div className="ez-cat-meta">
                        {count > 0 ? `${count} ${txt("home.category.count_suffix", "مقدم خدمة")}` : txt("home.category.coming_soon", "قريباً 🌟")}
                        <span className="ez-cat-arrow">‹</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="ez-section-head">
              <button className="ez-back" onClick={() => { setSelectedCategory(null); setSelectedSub("all"); setSearch(""); }}>
                {txt("home.category.back", "‹ رجوع للتصنيفات")}
              </button>
              <h2 className="ez-section-title">
                {activeCategory?.icon} {activeCategory?.name_ar}
              </h2>
            </div>

            <div className="ez-search">
              <input
                type="text"
                placeholder={txt("home.category.search_placeholder", "دوّر داخل هذا التصنيف...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {visibleSubs.length > 0 && (
              <div className="ez-chips" style={{ marginBottom: 12 }}>
                <button className={selectedSub === "all" ? "active" : ""} onClick={() => setSelectedSub("all")}>{txt("home.subs.all", "الكل")}</button>
                {visibleSubs.map((s) => (
                  <button
                    key={s.id}
                    className={selectedSub === s.id ? "active" : ""}
                    onClick={() => setSelectedSub(s.id)}
                  >
                    {s.name_ar}
                  </button>
                ))}
              </div>
            )}

            {visibleTertiaries.length > 0 && (
              <div className="ez-chips ez-chips-tertiary" style={{ marginBottom: 18 }}>
                <span className="ez-tertiary-label">{txt("home.subs.tertiary_label", "تصنيفات فرعية:")}</span>
                {visibleTertiaries.map((t) => (
                  <button
                    key={t.id}
                    className={selectedSub === t.id ? "active" : ""}
                    onClick={() => setSelectedSub(t.id)}
                  >
                    {t.name_ar}
                  </button>
                ))}
              </div>
            )}

            {featured.length > 0 && (
              <>
                <h3 className="ez-sub-title">{txt("home.featured.title", "⭐ نخبة مختارة لك")}</h3>
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
                    />
                  ))}
                </div>
              </>
            )}
            {regular.length > 0 && (
              <>
                <h3 className="ez-sub-title">{txt("home.all_providers.title", "كل المقدمين")}</h3>
                <div className="ez-grid">
                  {regular.map((p) => (
                    <ProviderCard
                      key={p.id}
                      provider={p}
                      city={cities.find((c) => c.id === p.city_id)}
                      sub={subcategories.find((s) => s.id === p.subcategory_id)}
                      images={imgsByProvider.get(p.id) ?? []}
                      contactLabel={txt("provider.whatsapp.label", "للمزيد من التفاصيل")}
                    />
                  ))}
                </div>
              </>
            )}
            {categoryProviders.length === 0 && (
              <p className="ez-empty">{txt("home.category.empty", "ما فيه مقدمين بهذا التصنيف لحد الحين 🌷")}</p>
            )}
          </>
        )}
      </main>

      <footer className="ez-footer">
        <div className="ez-footer-actions">
          <button type="button" className="ez-footer-link" onClick={() => setAboutOpen(true)}>{txt("footer.about", "من نحن")}</button>
          
          <a
            className="ez-footer-wa"
            href={waLink(CONTACT_WA_NUMBER, CONTACT_WA_MESSAGE) ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="تواصل معنا عبر واتساب"
            title={txt("footer.contact", "تواصل معنا")}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M20.52 3.48A11.78 11.78 0 0012.06 0C5.5 0 .17 5.33.17 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 005.74 1.46h.01c6.56 0 11.89-5.33 11.89-11.9 0-3.18-1.24-6.17-3.44-8.42zM12.07 21.8h-.01a9.9 9.9 0 01-5.05-1.38l-.36-.21-3.75.99 1-3.66-.24-.38a9.86 9.86 0 01-1.51-5.26c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.13 1.03 7 2.9a9.83 9.83 0 012.9 7c0 5.46-4.44 9.9-9.88 9.9zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.06 2.88 1.21 3.08.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/>
            </svg>
            <span>{txt("footer.contact", "تواصل معنا")}</span>
          </a>
        </div>
        <p className="ez-footer-copy">{txt("footer.copy", "Ezhliha © 2026 — Powered by AQ")}</p>
      </footer>

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
  // Saudi normalization:
  // - 05XXXXXXXX (10 digits, leading 0) → 9665XXXXXXXX
  // - 5XXXXXXXX  (9 digits, no leading 0, common when Excel drops the zero) → 9665XXXXXXXX
  // - 9665XXXXXXXX (12 digits) → kept as-is
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
}: {
  provider: Provider;
  city?: City;
  sub?: Subcategory;
  images: ProviderImage[];
  featured?: boolean;
  contactLabel: string;
}) {
  const cover = images[0]?.image_url || defaultProviderUrl;
  const waUrl = waLink(provider.whatsapp);

  return (
    <article className={`ez-card ${featured ? "ez-card-featured" : ""}`}>
      <Link to="/provider/$id" params={{ id: provider.id }} className="ez-card-link">
        <div className="ez-card-img" style={{ backgroundImage: `url(${cover})` }}>
          {featured && <span className="ez-badge">مميز</span>}
        </div>
        <div className="ez-card-body">
          <div className="ez-card-head">
            <h3>{provider.name}</h3>
            {provider.rating ? <span className="ez-rating">⭐ {provider.rating}</span> : null}
          </div>
          <div className="ez-card-meta">
            {city && <span>📍 {city.name_ar}</span>}
            {sub && <span>• {sub.name_ar}</span>}
          </div>
          {provider.description && <p className="ez-card-desc">{provider.description}</p>}
          {(provider.price_from || provider.price_to) && (
            <div className="ez-price">
              {provider.price_from && <span>من {provider.price_from} ر.س</span>}
              {provider.price_to && <span> إلى {provider.price_to} ر.س</span>}
            </div>
          )}
          {provider.price && <div className="ez-price">{provider.price}</div>}
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
    <div dir="rtl" style={{ minHeight: "100vh", background: "#e6e4d7", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Tajawal, system-ui, sans-serif" }}>
      <div style={{ background: "#fff", padding: "40px 32px", borderRadius: 20, maxWidth: 440, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(102,0,0,0.12)" }}>
        <img src={logoUrl} alt="إزهليها" style={{ height: 90, display: "block", margin: "0 auto 16px auto" }} />
        <h1 className="ez-logo-text" style={{ color: "#660000", fontSize: 28, marginBottom: 10 }}>{t("auth_gate.title", "محتوى للأعضاء بس")}</h1>
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
  .ez-root { min-height:100vh; background:#e6e4d7; font-family:Tajawal, system-ui, sans-serif; color:#000; }
  .ez-logo-text { font-family:'Rakkas','Reem Kufi Fun',Tajawal,serif; font-weight:400; letter-spacing:1px; }
  .ez-nav { background:#fff; border-bottom:1px solid #d8d4c0; padding:0 24px; min-height:104px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 12px rgba(102,0,0,0.06); position:sticky; top:0; z-index:100; }
  .ez-brand { text-decoration:none; display:flex; align-items:center; }
  .ez-brand-logo { height:88px; width:auto; object-fit:contain; }
  .ez-nav-actions { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
  .ez-nav-link { color:#000; text-decoration:none; font-size:14px; font-weight:600; }
  .ez-nav-link:hover { color:#660000; }
  .ez-nav-user { font-size:12px; color:#555; }
  .ez-nav-btn { background:#660000; color:#fff; padding:9px 20px; border-radius:50px; text-decoration:none; font-size:13px; font-weight:700; }
  .ez-nav-btn:hover { background:#4a0000; }
  .ez-nav-btn-out { background:transparent; color:#660000; border:1px solid #660000; padding:7px 16px; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
  .ez-nav-btn-out:hover { background:#660000; color:#fff; }
  .ez-nav-contact { background:#660000; color:#fff !important; padding:8px 16px; border-radius:50px; font-weight:700; }
  .ez-nav-contact:hover { background:#4a0000; color:#fff !important; }
  .ez-nav-contact-disabled { background:#ccc; color:#fff; cursor:not-allowed; }

  .ez-hero { max-width:1200px; margin:18px auto 0; padding:0 24px; }
  .ez-hero-inner { background:linear-gradient(135deg, #660000 0%, #4a0000 100%); color:#e6e4d7; padding:50px 30px; text-align:center; border-radius:20px; }
  .ez-hero-inner h1 { font-size:40px; font-weight:900; margin-bottom:10px; letter-spacing:1px; }
  .ez-hero-inner p { font-size:15px; opacity:.92; max-width:600px; margin-inline:auto; }
  .ez-hero-banner { display:block; position:relative; border-radius:20px; overflow:hidden; box-shadow:0 8px 30px rgba(102,0,0,0.15); }
  .ez-hero-banner img { display:block; width:100%; height:auto; max-height:380px; object-fit:cover; }
  .ez-hero-banner-cap { position:absolute; inset:auto 0 0 0; padding:16px 24px; background:linear-gradient(transparent, rgba(0,0,0,0.7)); color:#fff; font-size:18px; font-weight:800; }
  .ez-hero-dots { display:flex; gap:8px; justify-content:center; margin-top:12px; }
  .ez-hero-dots button { width:10px; height:10px; border-radius:50%; border:none; background:#d8d4c0; cursor:pointer; padding:0; }
  .ez-hero-dots button.active { background:#660000; transform:scale(1.2); }
  .ez-hero-wrap { position:relative; }
  .ez-hero-arrow { position:absolute; top:50%; transform:translateY(-50%); width:44px; height:44px; border-radius:50%; border:none; background:rgba(0,0,0,0.55); color:#fff; font-size:28px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .2s; z-index:2; }
  .ez-hero-arrow:hover { background:#660000; }
  .ez-hero-arrow-prev { right:12px; }
  .ez-hero-arrow-next { left:12px; }

  .ez-step { max-width:1200px; margin:20px auto 0; padding:0 24px; }
  .ez-step-label { display:block; font-size:14px; color:#000; margin-bottom:8px; font-weight:700; }
  .ez-select { width:100%; max-width:420px; background:#fff; border:1px solid #d8d4c0; border-radius:14px; padding:12px 18px; font-size:15px; font-family:inherit; color:#000; cursor:pointer; outline:none; }
  .ez-select:focus { border-color:#660000; }

  .ez-main { max-width:1200px; margin:0 auto; padding:24px; }
  .ez-section-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:14px 0 18px; flex-wrap:wrap; }
  .ez-section-title { font-size:22px; font-weight:800; color:#000; }
  .ez-sub-title { font-size:16px; font-weight:800; color:#000; margin:18px 0 12px; }
  .ez-back { background:transparent; border:none; color:#660000; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; padding:4px 0; }
  .ez-empty { text-align:center; color:#555; padding:40px; font-size:15px; }
  .ez-empty a { color:#660000; font-weight:700; }
  .ez-search { background:#fff; border:1px solid #d8d4c0; border-radius:50px; padding:6px; margin-bottom:18px; max-width:520px; }
  .ez-search input { width:100%; border:none; outline:none; padding:10px 18px; font-size:14px; font-family:inherit; border-radius:50px; background:transparent; color:#000; }
  .ez-chips { display:flex; flex-wrap:wrap; gap:8px; }
  .ez-chips button { background:#fff; border:1px solid #d8d4c0; padding:7px 14px; border-radius:50px; font-family:inherit; font-size:13px; cursor:pointer; color:#000; transition:all .2s; }
  .ez-chips button:hover { border-color:#660000; color:#660000; }
  .ez-chips button.active { background:#660000; color:#fff; border-color:#660000; }

  .ez-cat-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:16px; }
  .ez-cat-card { background:#fff; border:1px solid #d8d4c0; border-radius:18px; padding:20px; cursor:pointer; text-align:right; font-family:inherit; transition:all .25s; min-height:140px; display:flex; flex-direction:column; gap:12px; box-shadow:0 2px 8px rgba(102,0,0,0.04); }
  .ez-cat-card:hover { transform:translateY(-3px); box-shadow:0 10px 24px rgba(102,0,0,0.18); border-color:#660000; }
  .ez-cat-card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .ez-cat-icon { font-size:30px; color:#660000; line-height:1; }
  .ez-cat-card .ez-cat-name { font-size:17px; font-weight:800; color:#000; }
  .ez-cat-meta { display:flex; align-items:center; justify-content:space-between; font-size:12px; color:#555; margin-top:auto; padding-top:8px; border-top:1px dashed #d8d4c0; }
  .ez-cat-arrow { font-size:18px; color:#660000; font-weight:700; }
  .ez-cat-img { width:50px; height:50px; border-radius:10px; object-fit:cover; flex-shrink:0; }
  .ez-chips-tertiary { background:#fff; padding:8px 12px; border-radius:12px; align-items:center; border:1px solid #d8d4c0; }
  .ez-tertiary-label { font-size:12px; color:#555; font-weight:700; margin-left:6px; }

  .ez-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:18px; }
  .ez-card { background:#fff; border:1px solid #d8d4c0; border-radius:14px; overflow:hidden; box-shadow:0 2px 12px rgba(102,0,0,0.04); transition:transform .2s, box-shadow .2s; display:flex; flex-direction:column; }
  .ez-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(102,0,0,0.15); }
  .ez-card-featured { border:2px solid #660000; }
  .ez-card-link { text-decoration:none; color:inherit; display:flex; flex-direction:column; flex:1; }
  .ez-card-img { height:180px; background-size:cover; background-position:center; background-color:#e6e4d7; position:relative; }
  .ez-badge { position:absolute; top:12px; right:12px; background:#660000; color:#fff; padding:4px 12px; border-radius:50px; font-size:11px; font-weight:700; }
  .ez-card-body { padding:16px; flex:1; display:flex; flex-direction:column; }
  .ez-card-head { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:6px; }
  .ez-card-head h3 { font-size:16px; font-weight:800; color:#000; }
  .ez-rating { font-size:12px; color:#555; white-space:nowrap; }
  .ez-card-meta { display:flex; gap:6px; font-size:12px; color:#555; margin-bottom:8px; flex-wrap:wrap; }
  .ez-card-desc { font-size:13px; color:#555; line-height:1.6; margin-bottom:10px; flex:1; }
  .ez-price { font-size:13px; color:#660000; font-weight:700; margin-bottom:12px; }
  .ez-card-foot { padding:0 16px 16px; }
  .ez-wa-btn { display:flex; width:100%; align-items:center; justify-content:center; gap:7px; text-align:center; background:transparent; color:#660000; padding:10px 0; border-radius:0; text-decoration:none; font-size:14px; font-weight:800; border:none; cursor:pointer; font-family:inherit; }
  .ez-wa-btn svg { color:#660000; flex-shrink:0; }
  .ez-wa-btn:hover { color:#4a0000; text-decoration:underline; text-underline-offset:4px; }
  .ez-wa-btn:disabled { background:#ccc; cursor:not-allowed; }
  .ez-footer { text-align:center; padding:24px; color:#555; font-size:13px; border-top:1px solid #d8d4c0; margin-top:40px; background:#fff; }
  .ez-footer-actions { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:12px 18px; margin-bottom:16px; }
  .ez-footer-link { color:#000; text-decoration:none; font-size:14px; font-weight:400; background:transparent; border:none; cursor:pointer; font-family:inherit; padding:6px 10px; border-radius:8px; }
  .ez-footer-link:hover { color:#660000; background:#f5f3eb; }
  .ez-footer-out { color:#660000; }
  .ez-footer-user { font-size:12px; color:#888; }
  .ez-footer-wa { display:inline-flex; align-items:center; gap:6px; background:transparent; color:inherit; padding:4px 0; text-decoration:none; font-weight:400; font-size:14px; }
  .ez-footer-wa svg { color:#660000; }
  .ez-footer-wa:hover { color:#660000; }
  .ez-footer-copy { font-size:11px; color:#777; margin:0; letter-spacing:.3px; }
  .ez-about-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; animation:ezFade .2s ease; }
  .ez-about-modal { background:#fff; max-width:560px; width:100%; border-radius:16px; padding:28px 24px 24px; position:relative; box-shadow:0 20px 60px rgba(0,0,0,0.3); max-height:85vh; overflow-y:auto; border-top:4px solid #660000; }
  .ez-about-close { position:absolute; top:10px; left:14px; background:transparent; border:none; font-size:28px; line-height:1; cursor:pointer; color:#666; padding:4px 10px; border-radius:8px; }
  .ez-about-close:hover { background:#f5f3eb; color:#660000; }
  .ez-about-title { color:#660000; font-size:22px; margin:0 0 16px; font-weight:800; text-align:center; }
  .ez-about-text { color:#333; font-size:15px; line-height:1.9; margin:0 0 12px; }
  @keyframes ezFade { from { opacity:0 } to { opacity:1 } }

  .ez-quick { max-width:1200px; margin:18px auto 0; padding:0 24px; }
  .ez-search-big { max-width:720px; margin:0 auto; display:flex; align-items:center; gap:6px; padding:6px 10px; box-shadow:0 4px 18px rgba(102,0,0,0.08); }
  .ez-search-icon { font-size:16px; padding-inline-start:6px; color:#660000; }
  .ez-search-big input { flex:1; }
  .ez-search-clear { background:transparent; border:none; color:#660000; font-size:16px; cursor:pointer; padding:4px 10px; font-family:inherit; }

  @media (max-width: 640px) {
    .ez-brand-logo { height:64px; }
    .ez-hero-inner h1 { font-size:30px; }
    .ez-hero-inner { padding:36px 16px 28px; }
    .ez-step, .ez-main, .ez-hero { padding-left:16px; padding-right:16px; }
    .ez-cat-grid { grid-template-columns:repeat(2, 1fr); gap:12px; }
    .ez-cat-card { padding:14px; min-height:120px; }
    .ez-cat-card .ez-cat-name { font-size:14px; }
    .ez-cat-icon { font-size:24px; }
  }

  .ez-acct { position:relative; }
  .ez-acct-btn { display:flex; align-items:center; gap:6px; background:#fff; border:1px solid #d8d4c0; border-radius:50px; padding:4px 10px 4px 4px; cursor:pointer; font-family:inherit; }
  .ez-acct-btn:hover { border-color:#660000; }
  .ez-acct-avatar { width:34px; height:34px; border-radius:50%; background:#660000; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; }
  .ez-acct-avatar.lg { width:44px; height:44px; font-size:18px; }
  .ez-acct-caret { color:#660000; font-size:12px; }
  .ez-acct-menu { position:absolute; top:calc(100% + 8px); inset-inline-end:0; background:#fff; border:1px solid #d8d4c0; border-radius:14px; box-shadow:0 12px 30px rgba(102,0,0,0.16); min-width:240px; padding:8px; z-index:200; }
  .ez-acct-head { display:flex; align-items:center; gap:10px; padding:10px 8px; border-bottom:1px solid #f0ecd9; margin-bottom:6px; }
  .ez-acct-title { font-weight:800; color:#000; font-size:14px; }
  .ez-acct-email { font-size:12px; color:#666; word-break:break-all; }
  .ez-acct-item { display:block; width:100%; text-align:right; padding:10px 12px; border-radius:8px; color:#000; text-decoration:none; font-size:14px; font-weight:700; background:transparent; border:none; cursor:pointer; font-family:inherit; }
  .ez-acct-item:hover { background:#f5f3eb; color:#660000; }
  .ez-acct-out { color:#660000; }
`;

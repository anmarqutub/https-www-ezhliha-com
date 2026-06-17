import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import logoUrl from "@/assets/logo.jpg";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "إزهليها — دليلك لأجمل المناسبات" },
      {
        name: "description",
        content:
          "إزهليها — دليلك الأول لتجهيز الأفراح والمناسبات بأفضل مزودي الخدمات في المملكة.",
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
  whatsapp: string | null;
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

export const WA_MESSAGE = "السلام عليكم .. جيتك من موقع إزهليها";

function Home() {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [images, setImages] = useState<ProviderImage[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [loading, setLoading] = useState(true);




  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [cRes, catRes, subRes, pRes, imgRes, bRes] = await Promise.all([
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
      ]);
      const citiesData = (cRes.data ?? []) as City[];
      setCities(citiesData);
      if (citiesData.length > 0) setSelectedCity(citiesData[0].id);
      setCategories((catRes.data ?? []) as Category[]);
      setSubcategories((subRes.data ?? []) as Subcategory[]);
      setProviders((pRes.data ?? []) as Provider[]);
      setImages((imgRes.data ?? []) as ProviderImage[]);
      setBanners((bRes.data ?? []) as Banner[]);
      setLoading(false);
    })();
  }, []);

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
          {user ? (
            <>
              <Link to="/favorites" className="ez-nav-link">♥ المفضلة</Link>
              {isAdmin && <Link to="/admin" className="ez-nav-link">لوحة الأدمن</Link>}
              <span className="ez-nav-user">{user.email}</span>
              <button className="ez-nav-btn-out" onClick={() => signOut()}>خروج</button>
            </>
          ) : (
            <>
              <Link to="/login" className="ez-nav-link">دخول</Link>
              <Link to="/signup" className="ez-nav-btn">تسجيل</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero banner — supports admin-managed ad banners */}
      <section className="ez-hero">
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
            <h1>إزهليها</h1>
            <p>دليلك الأول لتجهيز الأفراح والمناسبات بأفضل مزودي الخدمات في المملكة</p>
          </div>
        )}
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

      <section className="ez-step">
        <label className="ez-step-label">📍 اختر مدينتك</label>
        <select
          className="ez-select"
          value={selectedCity}
          onChange={(e) => {
            setSelectedCity(e.target.value);
            setSelectedCategory(null);
            setSelectedSub("all");
          }}
        >
          {cities.length === 0 && <option value="">لا توجد مدن بعد</option>}
          {cities.length > 0 && <option value="">🌍 جميع المدن</option>}
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name_ar}</option>
          ))}
        </select>
      </section>

      <main className="ez-main">
        {loading ? (
          <p className="ez-empty">جارٍ التحميل...</p>
        ) : !selectedCategory ? (
          <>
            <div className="ez-section-head">
              <h2 className="ez-section-title">✿ تصفّح حسب التصنيف</h2>
            </div>
            {categories.length === 0 ? (
              <p className="ez-empty">
                لا توجد تصنيفات بعد. {isAdmin && <Link to="/admin">اذهب للوحة الأدمن لإضافة تصنيفات.</Link>}
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
                        {count > 0 ? `${count} مقدم خدمة` : "قريباً"}
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
                ‹ رجوع للتصنيفات
              </button>
              <h2 className="ez-section-title">
                {activeCategory?.icon} {activeCategory?.name_ar}
              </h2>
            </div>

            <div className="ez-search">
              <input
                type="text"
                placeholder="ابحث داخل هذا التصنيف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {visibleSubs.length > 0 && (
              <div className="ez-chips" style={{ marginBottom: 12 }}>
                <button className={selectedSub === "all" ? "active" : ""} onClick={() => setSelectedSub("all")}>الكل</button>
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
                <span className="ez-tertiary-label">تصنيفات ثانوية:</span>
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
                <h3 className="ez-sub-title">⭐ مقدمو خدمة مميزون</h3>
                <div className="ez-grid">
                  {featured.map((p) => (
                    <ProviderCard
                      key={p.id}
                      provider={p}
                      city={cities.find((c) => c.id === p.city_id)}
                      sub={subcategories.find((s) => s.id === p.subcategory_id)}
                      images={imgsByProvider.get(p.id) ?? []}
                      featured
                    />
                  ))}
                </div>
              </>
            )}
            {regular.length > 0 && (
              <>
                <h3 className="ez-sub-title">جميع مقدمي الخدمة</h3>
                <div className="ez-grid">
                  {regular.map((p) => (
                    <ProviderCard
                      key={p.id}
                      provider={p}
                      city={cities.find((c) => c.id === p.city_id)}
                      sub={subcategories.find((s) => s.id === p.subcategory_id)}
                      images={imgsByProvider.get(p.id) ?? []}
                    />
                  ))}
                </div>
              </>
            )}
            {categoryProviders.length === 0 && (
              <p className="ez-empty">لا يوجد مقدمو خدمة في هذا التصنيف بعد.</p>
            )}
          </>
        )}
      </main>

      <footer className="ez-footer">
        <p>© {new Date().getFullYear()} إزهليها — AZHLEHA</p>
      </footer>
    </div>
  );
}

export function waLink(whatsapp: string | null | undefined, message = WA_MESSAGE) {
  const wa = (whatsapp ?? "").replace(/\D/g, "");
  if (!wa) return null;
  const num = wa.startsWith("0") ? "966" + wa.slice(1) : wa;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
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
}: {
  provider: Provider;
  city?: City;
  sub?: Subcategory;
  images: ProviderImage[];
  featured?: boolean;
}) {
  const cover = images[0]?.image_url ?? "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600";
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
        </div>
      </Link>
      <div className="ez-card-foot">
        {waUrl ? (
          <a className="ez-wa-btn" href={waUrl} target="_blank" rel="noopener noreferrer">
            📱 تواصل واتساب
          </a>
        ) : (
          <button className="ez-wa-btn" disabled>لا يوجد رقم تواصل</button>
        )}
      </div>
    </article>
  );
}

const css = `
  .ez-root { min-height:100vh; background:#e6e4d7; font-family:Tajawal, system-ui, sans-serif; color:#000; }
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
  .ez-wa-btn { display:block; width:100%; text-align:center; background:#25D366; color:#fff; padding:10px; border-radius:8px; text-decoration:none; font-size:13px; font-weight:700; border:none; cursor:pointer; font-family:inherit; }
  .ez-wa-btn:hover { background:#1da851; }
  .ez-wa-btn:disabled { background:#ccc; cursor:not-allowed; }
  .ez-footer { text-align:center; padding:30px; color:#555; font-size:13px; border-top:1px solid #d8d4c0; margin-top:40px; background:#fff; }

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
`;

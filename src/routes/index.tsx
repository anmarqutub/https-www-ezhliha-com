import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
type Category = { id: string; name_ar: string; name_en: string; slug: string; icon: string | null };
type Subcategory = { id: string; category_id: string; name_ar: string; name_en: string; slug: string };
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
  address: string | null;
  rating: number | null;
  is_featured: boolean;
  featured_until: string | null;
  sort_order: number;
};
type ProviderImage = { id: string; provider_id: string; image_url: string };

function Home() {
  const { user, isAdmin, signOut } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [images, setImages] = useState<ProviderImage[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCity, setSelectedCity] = useState<string | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");
  const [selectedSub, setSelectedSub] = useState<string | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [cRes, catRes, subRes, pRes, imgRes] = await Promise.all([
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
      ]);
      setCities((cRes.data ?? []) as City[]);
      setCategories((catRes.data ?? []) as Category[]);
      setSubcategories((subRes.data ?? []) as Subcategory[]);
      setProviders((pRes.data ?? []) as Provider[]);
      setImages((imgRes.data ?? []) as ProviderImage[]);
      setLoading(false);
    })();
  }, []);

  const subsByCat = useMemo(() => {
    const m = new Map<string, Subcategory[]>();
    subcategories.forEach((s) => {
      const arr = m.get(s.category_id) ?? [];
      arr.push(s);
      m.set(s.category_id, arr);
    });
    return m;
  }, [subcategories]);

  const imgsByProvider = useMemo(() => {
    const m = new Map<string, ProviderImage[]>();
    images.forEach((i) => {
      const arr = m.get(i.provider_id) ?? [];
      arr.push(i);
      m.set(i.provider_id, arr);
    });
    return m;
  }, [images]);

  const visibleSubs =
    selectedCategory === "all"
      ? subcategories
      : subcategories.filter((s) => s.category_id === selectedCategory);

  const filtered = providers.filter((p) => {
    if (selectedCity !== "all" && p.city_id !== selectedCity) return false;
    if (selectedSub !== "all" && p.subcategory_id !== selectedSub) return false;
    if (selectedCategory !== "all") {
      const sub = subcategories.find((s) => s.id === p.subcategory_id);
      if (!sub || sub.category_id !== selectedCategory) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.description ?? "").toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  const featured = filtered.filter(
    (p) => p.is_featured && (!p.featured_until || new Date(p.featured_until) > new Date())
  );
  const regular = filtered.filter((p) => !featured.includes(p));

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#FAF6F2", fontFamily: "Tajawal, system-ui, sans-serif", color: "#1A1A1A" }}>
      <style>{css}</style>

      <header className="ez-nav">
        <Link to="/" className="ez-brand">
          <div className="ez-brand-name">إزهليها</div>
          <div className="ez-brand-en">EZHLIHA</div>
        </Link>
        <div className="ez-nav-actions">
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="ez-nav-link">لوحة الأدمن</Link>
              )}
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

      <section className="ez-hero">
        <div className="ez-hero-inner">
          <h1>إزهليها</h1>
          <p>دليلك الأول لتجهيز الأفراح والمناسبات بأفضل مزودي الخدمات في المملكة</p>
          <div className="ez-search">
            <input
              type="text"
              placeholder="ابحثي عن مصورة، صالون، قاعة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="ez-filters">
        <div className="ez-filter-row">
          <label>المدينة</label>
          <div className="ez-chips">
            <button className={selectedCity === "all" ? "active" : ""} onClick={() => setSelectedCity("all")}>الكل</button>
            {cities.map((c) => (
              <button
                key={c.id}
                className={selectedCity === c.id ? "active" : ""}
                onClick={() => setSelectedCity(c.id)}
              >
                {c.name_ar}
              </button>
            ))}
          </div>
        </div>
        <div className="ez-filter-row">
          <label>التصنيف</label>
          <div className="ez-chips">
            <button
              className={selectedCategory === "all" ? "active" : ""}
              onClick={() => {
                setSelectedCategory("all");
                setSelectedSub("all");
              }}
            >
              الكل
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={selectedCategory === c.id ? "active" : ""}
                onClick={() => {
                  setSelectedCategory(c.id);
                  setSelectedSub("all");
                }}
              >
                {c.icon} {c.name_ar}
              </button>
            ))}
          </div>
        </div>
        {visibleSubs.length > 0 && selectedCategory !== "all" && (
          <div className="ez-filter-row">
            <label>التصنيف الفرعي</label>
            <div className="ez-chips">
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
          </div>
        )}
      </section>

      <main className="ez-main">
        {loading ? (
          <p className="ez-empty">جارٍ التحميل...</p>
        ) : (
          <>
            {featured.length > 0 && (
              <>
                <h2 className="ez-section-title">⭐ مقدمو خدمة مميزون</h2>
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
                <h2 className="ez-section-title">جميع مقدمي الخدمة</h2>
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
            {filtered.length === 0 && (
              <p className="ez-empty">
                لا يوجد مقدمو خدمة بعد. {isAdmin && <Link to="/admin">اذهبي للوحة الأدمن لإضافة مقدمي خدمة.</Link>}
              </p>
            )}
          </>
        )}
      </main>

      <footer className="ez-footer">
        <p>© {new Date().getFullYear()} إزهليها — EZHLIHA</p>
      </footer>
    </div>
  );
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
  const wa = (provider.whatsapp ?? "").replace(/\D/g, "");
  const waUrl = wa ? `https://wa.me/${wa.startsWith("0") ? "966" + wa.slice(1) : wa}` : null;

  return (
    <article className={`ez-card ${featured ? "ez-card-featured" : ""}`}>
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
  .ez-nav { background:#fff; border-bottom:1px solid #E8DADA; padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 12px rgba(107,31,31,0.06); position:sticky; top:0; z-index:100; }
  .ez-brand { text-decoration:none; }
  .ez-brand-name { font-size:22px; font-weight:900; color:#6B1F1F; }
  .ez-brand-en { font-size:9px; letter-spacing:5px; color:#C47A7A; }
  .ez-nav-actions { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
  .ez-nav-link { color:#5A4A4A; text-decoration:none; font-size:14px; font-weight:500; }
  .ez-nav-link:hover { color:#6B1F1F; }
  .ez-nav-user { font-size:12px; color:#5A4A4A; }
  .ez-nav-btn { background:#6B1F1F; color:#fff; padding:8px 18px; border-radius:50px; text-decoration:none; font-size:13px; font-weight:600; }
  .ez-nav-btn:hover { background:#4A1414; }
  .ez-nav-btn-out { background:transparent; color:#6B1F1F; border:1px solid #6B1F1F; padding:7px 16px; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
  .ez-hero { background:linear-gradient(135deg,#6B1F1F,#4A1414); color:#fff; padding:60px 24px 50px; text-align:center; }
  .ez-hero h1 { font-size:42px; font-weight:900; margin-bottom:8px; }
  .ez-hero p { font-size:16px; opacity:.9; margin-bottom:28px; max-width:600px; margin-inline:auto; }
  .ez-search { max-width:520px; margin:0 auto; background:#fff; border-radius:50px; padding:6px; }
  .ez-search input { width:100%; border:none; outline:none; padding:12px 22px; font-size:15px; font-family:inherit; border-radius:50px; background:transparent; color:#1A1A1A; }
  .ez-filters { max-width:1200px; margin:24px auto 8px; padding:0 24px; }
  .ez-filter-row { margin-bottom:14px; }
  .ez-filter-row label { display:block; font-size:13px; color:#5A4A4A; margin-bottom:6px; font-weight:600; }
  .ez-chips { display:flex; flex-wrap:wrap; gap:8px; }
  .ez-chips button { background:#fff; border:1px solid #E8DADA; padding:7px 14px; border-radius:50px; font-family:inherit; font-size:13px; cursor:pointer; color:#5A4A4A; transition:all .2s; }
  .ez-chips button:hover { border-color:#6B1F1F; color:#6B1F1F; }
  .ez-chips button.active { background:#6B1F1F; color:#fff; border-color:#6B1F1F; }
  .ez-main { max-width:1200px; margin:0 auto; padding:24px; }
  .ez-section-title { font-size:20px; font-weight:800; color:#1A1A1A; margin:24px 0 14px; }
  .ez-empty { text-align:center; color:#5A4A4A; padding:40px; font-size:15px; }
  .ez-empty a { color:#6B1F1F; font-weight:700; }
  .ez-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:18px; }
  .ez-card { background:#fff; border:1px solid #E8DADA; border-radius:14px; overflow:hidden; box-shadow:0 2px 12px rgba(107,31,31,0.04); transition:transform .2s, box-shadow .2s; display:flex; flex-direction:column; }
  .ez-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(107,31,31,0.12); }
  .ez-card-featured { border:2px solid #D4AF37; }
  .ez-card-img { height:180px; background-size:cover; background-position:center; background-color:#F0E8E0; position:relative; }
  .ez-badge { position:absolute; top:12px; right:12px; background:#D4AF37; color:#fff; padding:4px 12px; border-radius:50px; font-size:11px; font-weight:700; }
  .ez-card-body { padding:16px; flex:1; display:flex; flex-direction:column; }
  .ez-card-head { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:6px; }
  .ez-card-head h3 { font-size:16px; font-weight:800; color:#1A1A1A; }
  .ez-rating { font-size:12px; color:#5A4A4A; white-space:nowrap; }
  .ez-card-meta { display:flex; gap:6px; font-size:12px; color:#5A4A4A; margin-bottom:8px; flex-wrap:wrap; }
  .ez-card-desc { font-size:13px; color:#5A4A4A; line-height:1.6; margin-bottom:10px; flex:1; }
  .ez-price { font-size:13px; color:#6B1F1F; font-weight:700; margin-bottom:12px; }
  .ez-wa-btn { display:block; width:100%; text-align:center; background:#25D366; color:#fff; padding:10px; border-radius:8px; text-decoration:none; font-size:13px; font-weight:700; border:none; cursor:pointer; font-family:inherit; }
  .ez-wa-btn:hover { background:#1da851; }
  .ez-wa-btn:disabled { background:#ccc; cursor:not-allowed; }
  .ez-footer { text-align:center; padding:30px; color:#5A4A4A; font-size:13px; border-top:1px solid #E8DADA; margin-top:40px; }
  @media (max-width: 640px) {
    .ez-hero h1 { font-size:32px; }
    .ez-hero { padding:40px 16px 30px; }
    .ez-filters, .ez-main { padding-left:16px; padding-right:16px; }
  }
`;

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import SiteFooter from "@/components/SiteFooter";
import { waLink } from "./index";
import logoUrl from "@/assets/logo.jpg";
import defaultProviderUrl from "@/assets/default-provider.jpg";

export const Route = createFileRoute("/favorites")({
  component: FavoritesPage,
  head: () => ({ meta: [{ title: "المفضلة — إزهليها" }] }),
});

type Provider = {
  id: string; name: string; description: string | null;
  price_from: number | null; price_to: number | null;
  whatsapp: string | null; city_id: string; subcategory_id: string;
  rating: number | null;
};
type Image = { provider_id: string; image_url: string };

function FavoritesPage() {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [cityMap, setCityMap] = useState<Map<string, string>>(new Map());
  const [subMap, setSubMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    (async () => {
      const { data: favs } = await supabase.from("favorites").select("provider_id").eq("user_id", user.id);
      const ids = (favs ?? []).map((f) => f.provider_id);
      if (ids.length === 0) { setProviders([]); setLoading(false); return; }
      const [p, im, c, s] = await Promise.all([
        supabase.from("providers").select("*").in("id", ids).eq("active", true),
        supabase.from("provider_images").select("provider_id, image_url").in("provider_id", ids).order("sort_order"),
        supabase.from("cities").select("id, name_ar"),
        supabase.from("subcategories").select("id, name_ar"),
      ]);
      setProviders((p.data ?? []) as Provider[]);
      setImages((im.data ?? []) as Image[]);
      setCityMap(new Map((c.data ?? []).map((x: { id: string; name_ar: string }) => [x.id, x.name_ar])));
      setSubMap(new Map((s.data ?? []).map((x: { id: string; name_ar: string }) => [x.id, x.name_ar])));
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const removeFav = async (pid: string) => {
    if (!user) return;
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("provider_id", pid);
    setProviders((prev) => prev.filter((p) => p.id !== pid));
  };

  const firstImg = (pid: string) => images.find((i) => i.provider_id === pid)?.image_url
    ?? defaultProviderUrl;

  return (
    <div dir="rtl" className="fav-root">
      <style>{css}</style>
      <header className="fav-nav">
        <Link to="/" className="fav-brand"><img src={logoUrl} alt="إزهليها" /></Link>
        <nav className="fav-nav-menu">
          <Link to="/" className="fav-link">الرئيسية</Link>
          <Link to="/providers" className="fav-link">مقدمي الخدمات</Link>
          <Link to="/categories" className="fav-link">التصنيفات</Link>
          <Link to="/faq" className="fav-link">الأسئلة الشائعة</Link>
        </nav>

        <div className="fav-nav-actions">
          {isAdmin && <Link to="/admin" className="fav-link">الأدمن</Link>}
          <span className="fav-user">{user?.email}</span>
          <button className="fav-btn-out" onClick={() => signOut().then(() => navigate({ to: "/" }))}>خروج</button>
        </div>
      </header>
      <main className="fav-main">
        <h1>♥ قائمة المفضلة</h1>
        {loading ? <p className="fav-empty">جارٍ التحميل...</p> :
          providers.length === 0 ? (
            <p className="fav-empty">لا يوجد مقدمو خدمة في المفضلة بعد. <Link to="/">تصفّح الموقع</Link></p>
          ) : (
            <div className="fav-grid">
              {providers.map((p) => {
                const wa = waLink(p.whatsapp);
                return (
                  <article key={p.id} className="fav-card">
                    <Link to="/provider/$id" params={{ id: p.id }} className="fav-card-link">
                      <div className="fav-img" style={{ backgroundImage: `url(${firstImg(p.id)})` }} />
                      <div className="fav-body">
                        <h3>{p.name}</h3>
                        <div className="fav-meta">
                          <span>📍 {cityMap.get(p.city_id) ?? ""}</span>
                          <span>• {subMap.get(p.subcategory_id) ?? ""}</span>
                        </div>
                        {p.description && <p>{p.description}</p>}
                      </div>
                    </Link>
                    <div className="fav-foot">
                      {wa && <a className="fav-wa" href={wa} target="_blank" rel="noopener noreferrer">للمزيد من التفاصيل</a>}
                      <button className="fav-remove" onClick={() => removeFav(p.id)}>إزالة</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </main>
      <SiteFooter />
    </div>
  );
}

const css = `
  .fav-root { min-height:100vh; background:#e6e4d7; font-family:"Noto Sans Arabic", Tajawal, system-ui, sans-serif; color:#2A211C; font-size:13.5px; line-height:1.75; }
  .fav-root h1, .fav-root h2, .fav-root h3, .fav-root button { font-family:"Alexandria","Noto Sans Arabic",Tajawal,sans-serif; }
  .fav-nav { background:#fff; border-bottom:1px solid #d8d4c0; padding:0 24px; height:72px; display:flex; align-items:center; justify-content:space-between; }
  .fav-brand img { height:54px; }
  .fav-nav-menu { display:flex; gap:16px; align-items:center; }
  .fav-nav-actions { display:flex; gap:12px; align-items:center; }
  .fav-link { color:#000; text-decoration:none; font-weight:600; font-size:14px; }
  .fav-user { font-size:12px; color:#555; }
  .fav-btn-out { background:transparent; color:#640000; border:1px solid #640000; padding:7px 16px; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
  .fav-main { max-width:1200px; margin:0 auto; padding:24px; }
  .fav-main h1 { font-size:26px; font-weight:900; margin-bottom:20px; color:#640000; }
  .fav-empty { text-align:center; color:#555; padding:50px; font-size:15px; }
  .fav-empty a { color:#640000; font-weight:700; }
  .fav-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:18px; }
  .fav-card { background:#fff; border:1px solid #d8d4c0; border-radius:14px; overflow:hidden; display:flex; flex-direction:column; }
  .fav-card-link { text-decoration:none; color:inherit; flex:1; }
  .fav-img { height:180px; background-size:cover; background-position:center; background-color:#e6e4d7; }
  .fav-body { padding:14px; }
  .fav-body h3 { font-size:16px; font-weight:800; margin-bottom:6px; }
  .fav-meta { font-size:12px; color:#555; margin-bottom:8px; display:flex; gap:6px; flex-wrap:wrap; }
  .fav-body p { font-size:13px; color:#555; line-height:1.6; }
  .fav-foot { padding:0 14px 14px; display:flex; gap:8px; }
  .fav-wa { flex:1; background:transparent; color:#640000; padding:9px; border-radius:0; text-align:center; text-decoration:none; font-weight:800; font-size:13px; }
  .fav-wa:hover { text-decoration:underline; text-underline-offset:4px; }
  .fav-remove { background:transparent; color:#a01919; border:1px solid #f5d5d5; border-radius:8px; padding:9px 14px; cursor:pointer; font-family:inherit; font-size:13px; font-weight:600; }
  .fav-remove:hover { background:#fdf0f0; }
`;

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { waLink, cleanHandle } from "./index";
import logoUrl from "@/assets/logo.jpg";

export const Route = createFileRoute("/provider/$id")({
  component: ProviderPage,
  head: () => ({ meta: [{ title: "تفاصيل مقدم الخدمة — إزهليها" }] }),
});

type Provider = {
  id: string; name: string; description: string | null;
  price_from: number | null; price_to: number | null; price: string | null;
  people_from: number | null; people_to: number | null;
  whatsapp: string | null; instagram: string | null;
  tiktok: string | null; twitter: string | null; snapchat: string | null;
  address: string | null; map_url: string | null;
  rating: number | null; city_id: string; subcategory_id: string;
  video_url: string | null;
};
type Image = { id: string; image_url: string; sort_order: number };
type Review = { id: string; rating: number; comment: string | null; created_at: string; reviewer_name: string; is_mine: boolean };

function ProviderPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [cityName, setCityName] = useState<string>("");
  const [subName, setSubName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [p, imgs, r] = await Promise.all([
      supabase.from("providers").select("*").eq("id", id).single(),
      supabase.from("provider_images").select("*").eq("provider_id", id).order("sort_order"),
      supabase.rpc("get_provider_reviews", { p_provider_id: id }),
    ]);
    if (p.data) {
      setProvider(p.data as Provider);
      const [c, s] = await Promise.all([
        supabase.from("cities").select("name_ar").eq("id", p.data.city_id).maybeSingle(),
        supabase.from("subcategories").select("name_ar").eq("id", p.data.subcategory_id).maybeSingle(),
      ]);
      setCityName(c.data?.name_ar ?? "");
      setSubName(s.data?.name_ar ?? "");
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

  const cover = images[activeImg]?.image_url;
  const waUrl = waLink(provider.whatsapp);
  const ig = cleanHandle(provider.instagram);
  const tk = cleanHandle(provider.tiktok);
  const tw = cleanHandle(provider.twitter);
  const sc = cleanHandle(provider.snapchat);
  const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;

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
              {cover ? (
                <div className="pv-cover" style={{ backgroundImage: `url(${cover})` }} />
              ) : (
                <div className="pv-cover pv-cover-empty" />
              )}
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
            {images.length === 0 && (
              <p className="pv-empty-imgs">لم تُضف صور بعد</p>
            )}
          </section>

          <section className="pv-info">
            <h1>{provider.name}</h1>
            <div className="pv-meta">
              {cityName && <span>📍 {cityName}</span>}
              {subName && <span>• {subName}</span>}
              {avgRating && <span>⭐ {avgRating} ({reviews.length})</span>}
            </div>
            {provider.description && <p className="pv-desc">{provider.description}</p>}
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
              {waUrl && (
                <a className="pv-btn-wa" href={waUrl} target="_blank" rel="noopener noreferrer">
                  📱 تواصل واتساب
                </a>
              )}
              {provider.map_url && (
                <a className="pv-btn-map" href={provider.map_url} target="_blank" rel="noopener noreferrer">
                  🗺️ الموقع على الخريطة
                </a>
              )}


            </div>

            {(ig || tk || tw || sc) && (
              <div className="pv-socials">
                {ig && (
                  <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className="pv-soc pv-soc-ig" aria-label="Instagram">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.25.07 1.63.07 4.8s0 3.55-.07 4.8c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.25.06-1.63.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.72 3.72 0 01-1.38-.9 3.72 3.72 0 01-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 00-2.13 1.39A5.9 5.9 0 00.62 4.15C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.72 1.48 1.39 2.13.65.67 1.33 1.08 2.13 1.39.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 002.13-1.39 5.9 5.9 0 001.39-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 00-1.39-2.13A5.9 5.9 0 0019.86.62c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 1116 12a4 4 0 01-4 4zm6.4-11.85a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z"/>
                    </svg>
                  </a>
                )}
                {tk && (
                  <a href={`https://tiktok.com/@${tk}`} target="_blank" rel="noopener noreferrer" className="pv-soc pv-soc-tk" aria-label="TikTok">
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
                  <a href={`https://snapchat.com/add/${sc}`} target="_blank" rel="noopener noreferrer" className="pv-soc pv-soc-sc" aria-label="Snapchat">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d="M12.2 2c.4 0 3.6.1 5.3 3.2.5 1 .5 2.7.4 4.1v.2c0 .2 0 .4-.1.6.1.1.3.1.5.1.3 0 .7-.1 1.1-.3.2-.1.4-.1.5-.1.3 0 .6.1.7.3.2.3.1.7-.2 1-.1.1-.4.3-1.3.6-.1 0-.4.1-.5.4-.1.2 0 .5.2.9 0 0 1.2 2.6 3.6 3 .2 0 .4.2.4.5s-.4.5-.6.6c-.7.3-1.7.5-2.1.6-.2.1-.3.3-.4.7 0 .2-.1.4-.1.6-.1.1-.2.2-.4.2h-.1c-.2 0-.4-.1-.7-.1-.3-.1-.6-.1-1-.1-.2 0-.5 0-.7.1-.5.1-1 .5-1.5.8-.7.5-1.5 1.1-2.7 1.1h-.2c-1.2 0-2-.6-2.7-1.1-.5-.4-1-.7-1.5-.8-.2 0-.4-.1-.7-.1-.4 0-.8.1-1 .1-.3.1-.5.1-.6.1-.3 0-.4-.2-.4-.3 0-.2-.1-.4-.1-.6-.1-.4-.2-.6-.4-.7-.4-.1-1.4-.3-2.1-.6-.2-.1-.6-.3-.6-.6 0-.3.2-.5.4-.5C4.3 13.3 5.5 10.7 5.5 10.7c.2-.4.3-.7.2-.9-.1-.3-.4-.4-.5-.4-.9-.3-1.2-.5-1.3-.6-.3-.3-.4-.7-.2-1 .1-.2.4-.3.7-.3.1 0 .3 0 .5.1.4.2.8.3 1.1.3.2 0 .4 0 .5-.1v-.6-.3c-.1-1.4-.1-3.1.4-4.1C8.4 2.1 11.6 2 12 2h.2z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
          </section>
        </div>

        {provider.video_url && (
          <section className="pv-video-section">
            <h2>فيديو تعريفي</h2>
            <VideoEmbed url={provider.video_url} />
          </section>
        )}



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
      </main>
    </div>
  );
}

function VideoEmbed({ url }: { url: string }) {
  // YouTube
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) {
    return (
      <div className="pv-video-wrap">
        <iframe src={`https://www.youtube.com/embed/${yt[1]}`} title="فيديو" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  // Direct video file
  if (/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url)) {
    return (
      <div className="pv-video-wrap">
        <video src={url} controls playsInline preload="metadata" />
      </div>
    );
  }
  // Fallback: open in new tab
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="pv-video-link">▶ مشاهدة الفيديو</a>
  );
}

const css = `
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

  .pv-info h1 { font-size:28px; font-weight:900; margin-bottom:8px; }
  .pv-meta { display:flex; gap:10px; color:#555; font-size:13px; flex-wrap:wrap; margin-bottom:14px; }
  .pv-desc { font-size:15px; color:#222; line-height:1.8; margin-bottom:14px; }
  .pv-price { font-size:15px; color:#660000; font-weight:800; margin-bottom:10px; }
  .pv-people { font-size:14px; color:#333; font-weight:700; background:#f5f2e5; display:inline-block; padding:6px 12px; border-radius:8px; margin-bottom:12px; }
  .pv-addr { font-size:13px; color:#555; margin-bottom:18px; }
  .pv-actions { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
  .pv-btn-wa { background:#25D366; color:#fff; padding:12px; border-radius:10px; text-align:center; text-decoration:none; font-weight:700; }
  .pv-btn-map { background:#4285F4; color:#fff; padding:12px; border-radius:10px; text-align:center; text-decoration:none; font-weight:700; }
  .pv-btn-fav { background:#fff; color:#660000; border:1.5px solid #660000; padding:12px; border-radius:10px; cursor:pointer; font-family:inherit; font-size:14px; font-weight:700; }
  .pv-btn-fav.active { background:#660000; color:#fff; }

  .pv-socials { display:flex; gap:10px; margin-top:6px; }
  .pv-soc { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:50%; color:#fff; text-decoration:none; font-size:12px; font-weight:800; }
  .pv-soc-ig { background:linear-gradient(45deg,#f09433,#dc2743,#bc1888); }
  .pv-soc-tk { background:#000; }
  .pv-soc-tw { background:#000; }
  .pv-soc-sc { background:#FFFC00; color:#000; }

  .pv-video-section { background:#fff; border:1px solid #d8d4c0; border-radius:18px; padding:24px; margin-top:24px; }
  .pv-video-section h2 { font-size:20px; font-weight:800; margin-bottom:14px; }
  .pv-video-wrap { position:relative; width:100%; padding-top:56.25%; border-radius:12px; overflow:hidden; background:#000; }
  .pv-video-wrap iframe, .pv-video-wrap video { position:absolute; inset:0; width:100%; height:100%; border:none; }
  .pv-video-link { display:inline-block; background:#660000; color:#fff; padding:12px 22px; border-radius:10px; text-decoration:none; font-weight:700; }
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
`;

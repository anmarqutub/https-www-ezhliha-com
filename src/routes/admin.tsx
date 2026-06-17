import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getAdminUsers, claimFirstAdmin } from "@/lib/admin.functions";
import { generateCodes, listCodes, deleteCode } from "@/lib/codes.functions";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/logo.jpg";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "لوحة الأدمن — إزهليها" }] }),
});

async function logActivity(action: string, entity: string, entityId?: string | null, details?: Record<string, unknown> | null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("admin_activity_log").insert({
      admin_id: user.id,
      admin_email: user.email ?? null,
      action,
      entity,
      entity_id: entityId ?? null,
      details: (details ?? null) as never,
    });
  } catch {
    /* silent */
  }
}

// Computes a field-level diff (only changed keys, with before/after values).
function diffFields<T extends Record<string, unknown>>(
  before: T | null | undefined,
  after: T,
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  if (!before) return out;
  for (const k of Object.keys(after)) {
    const a = before[k as keyof T];
    const b = after[k as keyof T];
    const norm = (v: unknown) => (v === undefined ? null : v);
    if (JSON.stringify(norm(a)) !== JSON.stringify(norm(b))) {
      out[k] = { from: norm(a), to: norm(b) };
    }
  }
  return out;
}


type Tab = "stats" | "users" | "salla" | "codes" | "cities" | "categories" | "providers" | "banners" | "reviews" | "activity";


function AdminPage() {
  const { session, isAdmin, loading, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("stats");
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const claim = useServerFn(claimFirstAdmin);

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
  }, [session, loading, navigate]);

  if (loading || !session) {
    return <div style={loadingStyle}>جارٍ التحقق...</div>;
  }

  if (!isAdmin) {
    return (
      <div dir="rtl" style={pageStyle}>
        <style>{adminCss}</style>
        <header className="adm-nav">
          <Link to="/" className="adm-brand"><img src={logoUrl} alt="إزهليها" style={{ height: 80 }} /></Link>
          <div className="adm-nav-right">
            <span className="adm-user">{user?.email}</span>
            <button className="adm-logout" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
              تسجيل خروج
            </button>
          </div>
        </header>
        <main className="adm-main">
          <div className="adm-card" style={{ textAlign: "center" }}>
            <h2>هذا الحساب ليس أدمن</h2>
            <p style={{ margin: "12px 0", color: "#555" }}>
              إذا كنت مالك المشروع، اضغط الزر أدناه لترقية حسابك إلى أدمن (يعمل مرة واحدة فقط، ولا أحد قام بذلك بعد).
            </p>
            <button
              className="adm-btn-primary"
              disabled={claiming}
              onClick={async () => {
                setClaiming(true);
                setClaimMsg(null);
                try {
                  await claim();
                  setClaimMsg("تمت الترقية! أعد تحميل الصفحة.");
                  setTimeout(() => window.location.reload(), 1200);
                } catch (e) {
                  setClaimMsg("فشل: " + (e as Error).message);
                } finally {
                  setClaiming(false);
                }
              }}
            >
              {claiming ? "..." : "ترقية حسابي إلى أدمن"}
            </button>
            {claimMsg && <p style={{ marginTop: 12 }}>{claimMsg}</p>}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div dir="rtl" style={pageStyle}>
      <style>{adminCss}</style>
      <header className="adm-nav">
        <Link to="/" className="adm-brand"><img src={logoUrl} alt="إزهليها" style={{ height: 80 }} /></Link>
        <div className="adm-nav-right">
          <Link to="/" className="adm-link">عرض الموقع</Link>
          <span className="adm-user">{user?.email}</span>
          <button className="adm-logout" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
            تسجيل خروج
          </button>
        </div>
      </header>

      <div className="adm-layout">
        <aside className="adm-side">
          <SideBtn label="الإحصائيات" active={tab === "stats"} onClick={() => setTab("stats")} />
          <SideBtn label="المستخدمون" active={tab === "users"} onClick={() => setTab("users")} />
          <SideBtn label="طلبات سلة" active={tab === "salla"} onClick={() => setTab("salla")} />
          <SideBtn label="أكواد الاشتراك" active={tab === "codes"} onClick={() => setTab("codes")} />

          <div className="adm-side-group">الإعدادات</div>
          <SideBtn label="المدن" active={tab === "cities"} onClick={() => setTab("cities")} />
          <SideBtn label="التصنيفات" active={tab === "categories"} onClick={() => setTab("categories")} />
          <SideBtn label="مقدمو الخدمة" active={tab === "providers"} onClick={() => setTab("providers")} />
          <SideBtn label="البنرات" active={tab === "banners"} onClick={() => setTab("banners")} />
          <SideBtn label="التقييمات" active={tab === "reviews"} onClick={() => setTab("reviews")} />
          <SideBtn label="سجل التعديلات" active={tab === "activity"} onClick={() => setTab("activity")} />
        </aside>
        <main className="adm-content">
          {tab === "stats" && <StatsAndUsers showUsers={false} />}
          {tab === "users" && <StatsAndUsers showUsers={true} />}
          {tab === "salla" && <SallaOrdersTab />}
          {tab === "codes" && <CodesTab />}

          {tab === "cities" && <CitiesTab />}
          {tab === "categories" && <CategoriesTab />}
          {tab === "providers" && <ProvidersTab />}
          {tab === "banners" && <BannersTab />}
          {tab === "reviews" && <ReviewsTab />}
          {tab === "activity" && <ActivityLogTab />}
        </main>
      </div>
    </div>
  );
}

function SideBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`adm-side-btn ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

function StatsAndUsers({ showUsers }: { showUsers: boolean }) {
  if (!showUsers) return <DashboardTab />;
  return <UsersTab />;
}

function UsersTab() {
  const fetchUsers = useServerFn(getAdminUsers);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });

  return (
    <>
      <h1 className="adm-title">المستخدمات</h1>
      <div className="adm-card">
        {isLoading && <p className="adm-empty">جارٍ التحميل...</p>}
        {error && <p className="adm-error">خطأ: {(error as Error).message}</p>}
        {data && data.users.length === 0 && <p className="adm-empty">لا توجد مستخدمات بعد.</p>}
        {data && data.users.length > 0 && (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>الاسم</th><th>الإيميل</th><th>الجوال</th><th>المدينة</th>
                  <th>الدور</th><th>التسجيل</th><th>آخر دخول</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.profile?.full_name ?? "—"}</td>
                    <td>{u.email ?? "—"}</td>
                    <td>{u.profile?.phone ?? "—"}</td>
                    <td>{u.profile?.city ?? "—"}</td>
                    <td>
                      {u.roles.map((r) => (
                        <span key={r} className={`adm-badge ${r === "admin" ? "adm-badge-admin" : ""}`}>
                          {r === "admin" ? "أدمن" : "مستخدمة"}
                        </span>
                      ))}
                    </td>
                    <td>{fmt(u.created_at)}</td>
                    <td>{u.last_sign_in_at ? fmt(u.last_sign_in_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

type DashboardData = {
  totalUsers: number;
  adminsCount: number;
  emailConfirmed: number;
  newUsers7d: number;
  newUsers30d: number;
  signupSeries: { day: string; count: number }[];
  providersTotal: number;
  providersActive: number;
  providersFeatured: number;
  providersNew7d: number;
  citiesActive: number;
  citiesTotal: number;
  categoriesTotal: number;
  subcategoriesTotal: number;
  bannersActive: number;
  bannersTotal: number;
  reviewsTotal: number;
  reviewsAvg: number;
  reviews7d: number;
  favoritesTotal: number;
  codesTotal: number;
  codesUsed: number;
  codesAvailable: number;
  topProvidersByReviews: { id: string; name: string; count: number; avg: number }[];
  topCities: { id: string; name: string; count: number }[];
  topCategories: { id: string; name: string; count: number }[];
  recentUsers: { id: string; name: string; email: string | null; created_at: string }[];
  recentActivity: { id: string; admin_email: string | null; action: string; entity: string; created_at: string; details: Record<string, unknown> | null }[];
};

function DashboardTab() {
  const fetchUsers = useServerFn(getAdminUsers);
  const { data: usersData } = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });

  const [d, setD] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const now = Date.now();
    const d7 = new Date(now - 7 * 86400000).toISOString();
    const d30 = new Date(now - 30 * 86400000).toISOString();
    const d14 = new Date(now - 13 * 86400000); d14.setHours(0, 0, 0, 0);

    const [
      provsRes, citiesRes, catsRes, subsRes, bannersRes,
      reviewsRes, favRes, codesRes, logsRes,
    ] = await Promise.all([
      supabase.from("providers").select("id,name,city_id,subcategory_id,active,is_featured,created_at"),
      supabase.from("cities").select("id,name_ar,active"),
      supabase.from("categories").select("id,name_ar,active"),
      supabase.from("subcategories").select("id,category_id"),
      supabase.from("banners").select("id,active"),
      supabase.from("reviews").select("id,provider_id,rating,created_at"),
      supabase.from("favorites").select("id", { count: "exact", head: true }),
      supabase.from("purchase_codes").select("id,used_at"),
      supabase.from("admin_activity_log").select("id,admin_email,action,entity,created_at,details").order("created_at", { ascending: false }).limit(10),
    ]);

    const providers = provsRes.data ?? [];
    const cities = citiesRes.data ?? [];
    const cats = catsRes.data ?? [];
    const subs = subsRes.data ?? [];
    const banners = bannersRes.data ?? [];
    const reviews = reviewsRes.data ?? [];
    const codes = codesRes.data ?? [];
    const logs = logsRes.data ?? [];

    // Reviews aggregations
    const reviewsByProv = new Map<string, { count: number; sum: number }>();
    reviews.forEach((r) => {
      const x = reviewsByProv.get(r.provider_id) ?? { count: 0, sum: 0 };
      x.count++; x.sum += r.rating;
      reviewsByProv.set(r.provider_id, x);
    });
    const reviewsAvg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const reviews7d = reviews.filter((r) => r.created_at >= d7).length;

    // Providers per city / per cat
    const provByCity = new Map<string, number>();
    const provByCat = new Map<string, number>();
    const subToCat = new Map<string, string>();
    subs.forEach((s) => subToCat.set(s.id, s.category_id));
    providers.forEach((p) => {
      provByCity.set(p.city_id, (provByCity.get(p.city_id) ?? 0) + 1);
      const catId = subToCat.get(p.subcategory_id);
      if (catId) provByCat.set(catId, (provByCat.get(catId) ?? 0) + 1);
    });

    const cityName = new Map(cities.map((c) => [c.id, c.name_ar]));
    const catName = new Map(cats.map((c) => [c.id, c.name_ar]));
    const provName = new Map(providers.map((p) => [p.id, p.name]));

    const topCities = Array.from(provByCity.entries())
      .map(([id, count]) => ({ id, name: cityName.get(id) ?? id.slice(0, 6), count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);

    const topCategories = Array.from(provByCat.entries())
      .map(([id, count]) => ({ id, name: catName.get(id) ?? id.slice(0, 6), count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);

    const topProvidersByReviews = Array.from(reviewsByProv.entries())
      .map(([id, v]) => ({ id, name: provName.get(id) ?? id.slice(0, 6), count: v.count, avg: v.sum / v.count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);

    // Signup series (14d) from users data
    const users = usersData?.users ?? [];
    const days: { day: string; count: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const dt = new Date(d14.getTime() + i * 86400000);
      const key = dt.toISOString().slice(0, 10);
      days.push({ day: key, count: 0 });
    }
    users.forEach((u) => {
      const k = u.created_at.slice(0, 10);
      const slot = days.find((x) => x.day === k);
      if (slot) slot.count++;
    });

    const recentUsers = [...users]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 5)
      .map((u) => ({ id: u.id, name: u.profile?.full_name ?? "—", email: u.email, created_at: u.created_at }));

    setD({
      totalUsers: usersData?.total ?? users.length,
      adminsCount: usersData?.admins ?? 0,
      emailConfirmed: users.filter((u) => u.email_confirmed).length,
      newUsers7d: users.filter((u) => u.created_at >= d7).length,
      newUsers30d: users.filter((u) => u.created_at >= d30).length,
      signupSeries: days,
      providersTotal: providers.length,
      providersActive: providers.filter((p) => p.active).length,
      providersFeatured: providers.filter((p) => p.is_featured).length,
      providersNew7d: providers.filter((p) => p.created_at >= d7).length,
      citiesActive: cities.filter((c) => c.active).length,
      citiesTotal: cities.length,
      categoriesTotal: cats.length,
      subcategoriesTotal: subs.length,
      bannersActive: banners.filter((b) => b.active).length,
      bannersTotal: banners.length,
      reviewsTotal: reviews.length,
      reviewsAvg,
      reviews7d,
      favoritesTotal: favRes.count ?? 0,
      codesTotal: codes.length,
      codesUsed: codes.filter((c) => c.used_at).length,
      codesAvailable: codes.filter((c) => !c.used_at).length,
      topProvidersByReviews,
      topCities,
      topCategories,
      recentUsers,
      recentActivity: logs as DashboardData["recentActivity"],
    });
    setLoading(false);
  }, [usersData]);

  useEffect(() => { load(); }, [load]);

  if (loading || !d) {
    return (
      <>
        <h1 className="adm-title">لوحة التحكم</h1>
        <p className="adm-empty">جارٍ تحميل الإحصائيات...</p>
      </>
    );
  }

  const codeUsage = d.codesTotal ? Math.round((d.codesUsed / d.codesTotal) * 100) : 0;
  const maxSignup = Math.max(1, ...d.signupSeries.map((x) => x.count));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h1 className="adm-title" style={{ marginBottom: 0 }}>لوحة التحكم</h1>
        <button className="adm-btn-secondary" onClick={load}>🔄 تحديث</button>
      </div>

      {/* KPI Section: Users */}
      <h3 className="adm-section-h">المستخدمات</h3>
      <div className="adm-stats">
        <StatCard label="إجمالي المستخدمات" value={d.totalUsers} hint={`${d.emailConfirmed} مفعّلات`} color="#6B1F1F" />
        <StatCard label="جديدات (آخر 7 أيام)" value={d.newUsers7d} hint={`${d.newUsers30d} في 30 يوم`} color="#2E7D32" />
        <StatCard label="عدد الأدمن" value={d.adminsCount} color="#5A4A4A" />
        <StatCard label="إجمالي المفضلات" value={d.favoritesTotal} hint="عدد الإضافات للمفضلة" color="#C47A7A" />
      </div>

      {/* KPI Section: Catalog */}
      <h3 className="adm-section-h">الكتالوج</h3>
      <div className="adm-stats">
        <StatCard label="مقدمو الخدمة" value={d.providersTotal} hint={`${d.providersActive} نشط · ${d.providersFeatured} مميز`} color="#6B1F1F" />
        <StatCard label="مقدمو خدمة جدد (7 أيام)" value={d.providersNew7d} color="#2E7D32" />
        <StatCard label="المدن" value={d.citiesTotal} hint={`${d.citiesActive} نشطة`} color="#5A4A4A" />
        <StatCard label="التصنيفات" value={d.categoriesTotal} hint={`${d.subcategoriesTotal} تصنيف فرعي`} color="#5A4A4A" />
        <StatCard label="البنرات النشطة" value={d.bannersActive} hint={`من أصل ${d.bannersTotal}`} color="#C47A7A" />
      </div>

      {/* KPI Section: Engagement */}
      <h3 className="adm-section-h">التفاعل والمبيعات</h3>
      <div className="adm-stats">
        <StatCard label="إجمالي التقييمات" value={d.reviewsTotal} hint={`${d.reviews7d} في آخر 7 أيام`} color="#6B1F1F" />
        <StatCard label="متوسط التقييم" value={d.reviewsTotal ? `${d.reviewsAvg.toFixed(1)} ★` : "—"} color="#E8A317" />
        <StatCard label="أكواد الاشتراك" value={d.codesTotal} hint={`${d.codesUsed} مستخدمة · ${d.codesAvailable} متاحة`} color="#5A4A4A" />
        <StatCard label="معدل استخدام الأكواد" value={`${codeUsage}%`} color={codeUsage >= 70 ? "#2E7D32" : "#C47A7A"} progress={codeUsage} />
      </div>

      {/* Signup chart */}
      <div className="adm-card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 14, fontWeight: 700, fontSize: 15 }}>تسجيلات آخر 14 يومًا</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
          {d.signupSeries.map((s) => (
            <div key={s.day} title={`${s.day}: ${s.count}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 10, color: "#5A4A4A" }}>{s.count || ""}</div>
              <div style={{
                width: "100%",
                height: `${(s.count / maxSignup) * 90}px`,
                background: s.count ? "linear-gradient(180deg,#C47A7A,#6B1F1F)" : "#F0E5E5",
                borderRadius: "6px 6px 0 0",
                minHeight: 4,
              }} />
              <div style={{ fontSize: 9, color: "#9A8A8A" }}>{s.day.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top lists grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
        <RankCard
          title="أكثر مقدمي الخدمة تقييمًا"
          rows={d.topProvidersByReviews.map((r) => ({ label: r.name, value: `${r.count} · ${r.avg.toFixed(1)}★` }))}
          empty="لا توجد تقييمات بعد"
        />
        <RankCard
          title="أكثر المدن نشاطًا"
          rows={d.topCities.map((r) => ({ label: r.name, value: `${r.count} مزود` }))}
          empty="لا توجد بيانات"
        />
        <RankCard
          title="أكثر التصنيفات طلبًا"
          rows={d.topCategories.map((r) => ({ label: r.name, value: `${r.count} مزود` }))}
          empty="لا توجد بيانات"
        />
      </div>

      {/* Recent activity + users */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div className="adm-card">
          <h3 style={{ marginBottom: 14, fontWeight: 700, fontSize: 15 }}>أحدث المستخدمات</h3>
          {d.recentUsers.length === 0 ? <p className="adm-empty">لا يوجد</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {d.recentUsers.map((u) => (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid #F0E8E0" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "#5A4A4A" }}>{u.email}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#9A8A8A" }}>{fmt(u.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="adm-card">
          <h3 style={{ marginBottom: 14, fontWeight: 700, fontSize: 15 }}>آخر إجراءات الأدمن</h3>
          {d.recentActivity.length === 0 ? <p className="adm-empty">لا يوجد</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {d.recentActivity.map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid #F0E8E0", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>
                      <span className="adm-badge adm-badge-on" style={{ marginLeft: 6 }}>{ACTION_LABEL[a.action] ?? a.action}</span>
                      {ENTITY_LABEL[a.entity] ?? a.entity}
                    </div>
                    <div style={{ fontSize: 11, color: "#5A4A4A" }}>{a.admin_email ?? "—"}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#9A8A8A", whiteSpace: "nowrap" }}>{fmt(a.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, hint, color, progress }: { label: string; value: number | string; hint?: string; color?: string; progress?: number }) {
  return (
    <div className="adm-stat">
      <div className="adm-stat-num" style={{ color: color ?? "#6B1F1F" }}>{value}</div>
      <div className="adm-stat-label">{label}</div>
      {hint && <div style={{ fontSize: 11, color: "#9A8A8A", marginTop: 6 }}>{hint}</div>}
      {typeof progress === "number" && (
        <div style={{ marginTop: 10, height: 6, background: "#F0E5E5", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, progress)}%`, height: "100%", background: color ?? "#6B1F1F" }} />
        </div>
      )}
    </div>
  );
}

function RankCard({ title, rows, empty }: { title: string; rows: { label: string; value: string }[]; empty: string }) {
  
  return (
    <div className="adm-card">
      <h3 style={{ marginBottom: 14, fontWeight: 700, fontSize: 15 }}>{title}</h3>
      {rows.length === 0 ? <p className="adm-empty">{empty}</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: i === 0 ? "#E8A317" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#F0E5E5",
                  color: i < 3 ? "#fff" : "#5A4A4A",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</span>
                <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#6B1F1F", whiteSpace: "nowrap" }}>{r.value}</span>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ============ CITIES ============
type CityRow = { id: string; name_ar: string; name_en: string; slug: string; sort_order: number; active: boolean };

function CitiesTab() {
  const [rows, setRows] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<CityRow> | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("cities").select("*").order("sort_order");
    setRows((data ?? []) as CityRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    if (!editing?.name_ar || !editing?.name_en || !editing?.slug) {
      alert("املئي جميع الحقول");
      return;
    }
    const payload = {
      name_ar: editing.name_ar,
      name_en: editing.name_en,
      slug: editing.slug,
      sort_order: editing.sort_order ?? 0,
      active: editing.active ?? true,
    };
    if (editing.id) {
      const before = rows.find((r) => r.id === editing.id);
      await supabase.from("cities").update(payload).eq("id", editing.id);
      logActivity("update", "city", editing.id, { name_ar: payload.name_ar, changes: diffFields(before as never, payload as never) });
    } else {
      const { data } = await supabase.from("cities").insert(payload).select().single();
      logActivity("create", "city", data?.id ?? null, { name_ar: payload.name_ar, values: payload });
    }

    setEditing(null);
    reload();
  };

  const del = async (id: string) => {
    if (!confirm("هل تريدين حذف هذه المدينة؟")) return;
    const row = rows.find((r) => r.id === id);
    await supabase.from("cities").delete().eq("id", id);
    logActivity("delete", "city", id, { name_ar: row?.name_ar });
    reload();
  };

  return (
    <>
      <SectionHeader title="المدن" onAdd={() => setEditing({ active: true, sort_order: 0 })} />
      <div className="adm-card">
        {loading ? <p className="adm-empty">جارٍ التحميل...</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>الاسم</th><th>English</th><th>Slug</th><th>الترتيب</th><th>الحالة</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name_ar}</td><td>{r.name_en}</td><td>{r.slug}</td><td>{r.sort_order}</td>
                    <td><span className={`adm-badge ${r.active ? "adm-badge-on" : ""}`}>{r.active ? "مفعّلة" : "متوقفة"}</span></td>
                    <td>
                      <button className="adm-btn-sm" onClick={() => setEditing(r)}>تعديل</button>
                      <button className="adm-btn-sm adm-btn-danger" onClick={() => del(r.id)}>حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && (
        <Modal title={editing.id ? "تعديل مدينة" : "إضافة مدينة"} onClose={() => setEditing(null)} onSave={save}>
          <Field label="الاسم بالعربي"><input value={editing.name_ar ?? ""} onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })} /></Field>
          <Field label="الاسم بالإنجليزي"><input value={editing.name_en ?? ""} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} /></Field>
          <Field label="Slug (مثال: jeddah)"><input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></Field>
          <Field label="الترتيب"><input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} /></Field>
          <Field label="مفعّلة"><input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /></Field>
        </Modal>
      )}
    </>
  );
}

// ============ CATEGORIES (unified: main + sub) ============
type CatRow = { id: string; name_ar: string; name_en: string; slug: string; icon: string | null; image_url: string | null; sort_order: number; active: boolean };
type SubRow = { id: string; category_id: string; parent_id: string | null; name_ar: string; name_en: string; slug: string; sort_order: number; active: boolean };

type EditingCat = {
  id?: string;
  name_ar?: string;
  icon?: string | null;
  image_url?: string | null;
  sort_order?: number;
  active?: boolean;
  parent_id: string; // "" means it's a main category, else holds main category id
  sub_parent_id?: string | null; // optional tertiary parent (another subcategory id)
  originalKind?: "main" | "sub"; // tracks original type when editing
};

function makeSlug(name: string) {
  const base = (name || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 7);
  return base ? `${base}-${rand}` : `cat-${rand}`;
}

function CategoriesTab() {
  const [cats, setCats] = useState<CatRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingCat | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const [c, s] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("subcategories").select("*").order("sort_order"),
    ]);
    setCats((c.data ?? []) as CatRow[]);
    setSubs((s.data ?? []) as SubRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    if (!editing) return;
    const name = (editing.name_ar ?? "").trim();
    if (!name) { alert("الرجاء إدخال اسم التصنيف"); return; }

    const isSub = !!editing.parent_id;
    const sort_order = editing.sort_order ?? 0;
    const active = editing.active ?? true;

    if (editing.id && editing.originalKind) {
      if (editing.originalKind === "sub") {
        const before = subs.find((s) => s.id === editing.id);
        const newVals = {
          category_id: editing.parent_id,
          parent_id: editing.sub_parent_id || null,
          name_ar: name, name_en: name, sort_order, active,
        };
        await supabase.from("subcategories").update(newVals).eq("id", editing.id);
        logActivity("update", "subcategory", editing.id, { name_ar: name, changes: diffFields(before as never, newVals as never) });
      } else {
        const before = cats.find((c) => c.id === editing.id);
        const newVals = { name_ar: name, name_en: name, icon: editing.icon ?? null, image_url: editing.image_url ?? null, sort_order, active };
        await supabase.from("categories").update(newVals).eq("id", editing.id);
        logActivity("update", "category", editing.id, { name_ar: name, changes: diffFields(before as never, newVals as never) });
      }

    } else if (isSub) {
      const { data } = await supabase.from("subcategories").insert({
        category_id: editing.parent_id,
        parent_id: editing.sub_parent_id || null,
        name_ar: name, name_en: name, slug: makeSlug(name),
        sort_order, active,
      }).select().single();
      logActivity("create", "subcategory", data?.id ?? null, { name_ar: name });
    } else {
      const { data } = await supabase.from("categories").insert({
        name_ar: name, name_en: name, slug: makeSlug(name),
        icon: editing.icon ?? null, image_url: editing.image_url ?? null, sort_order, active,
      }).select().single();
      logActivity("create", "category", data?.id ?? null, { name_ar: name });
    }
    setEditing(null);
    reload();
  };

  const uploadCatImage = async (file: File) => {
    if (!editing) return;
    const ext = file.name.split(".").pop();
    const path = `categories/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("provider-images").upload(path, file);
    if (error) { alert("خطأ رفع: " + error.message); return; }
    const { data: pub } = supabase.storage.from("provider-images").getPublicUrl(path);
    setEditing({ ...editing, image_url: pub.publicUrl });
    logActivity("upload_image", "category", editing.id ?? null, { path });
  };


  const delMain = async (id: string) => {
    if (!confirm("الحذف سيحذف التصنيفات الفرعية ومقدمي الخدمة المرتبطين. متأكدة؟")) return;
    const row = cats.find((c) => c.id === id);
    await supabase.from("categories").delete().eq("id", id);
    logActivity("delete", "category", id, { name_ar: row?.name_ar });
    reload();
  };
  const delSub = async (id: string) => {
    if (!confirm("الحذف سيحذف مقدمي الخدمة المرتبطين. متأكدة؟")) return;
    const row = subs.find((s) => s.id === id);
    await supabase.from("subcategories").delete().eq("id", id);
    logActivity("delete", "subcategory", id, { name_ar: row?.name_ar });
    reload();
  };

  return (
    <>
      <SectionHeader title="التصنيفات" onAdd={() => setEditing({ active: true, sort_order: 0, parent_id: "" })} />
      <div className="adm-card">
        {loading ? <p className="adm-empty">جارٍ التحميل...</p> : cats.length === 0 ? (
          <p className="adm-empty">لا توجد تصنيفات بعد. ابدئي بإضافة تصنيف رئيسي.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {cats.map((c) => {
              const topSubs = subs.filter((s) => s.category_id === c.id && !s.parent_id);
              const tertiariesOf = (parentId: string) => subs.filter((s) => s.parent_id === parentId);
              return (
                <div key={c.id} style={{ border: "1px solid #E8DADA", borderRadius: 12, padding: 14, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {c.image_url ? (
                        <img src={c.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 22 }}>{c.icon ?? "📁"}</span>
                      )}
                      <strong style={{ fontSize: 16 }}>{c.name_ar}</strong>
                      <span style={{ fontSize: 11, color: "#9A8A8A" }}>(ترتيب: {c.sort_order})</span>
                      <span className={`adm-badge ${c.active ? "adm-badge-on" : ""}`}>{c.active ? "مفعّل" : "متوقف"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="adm-btn-sm" onClick={() => setEditing({ active: true, sort_order: 0, parent_id: c.id, sub_parent_id: null })}>+ تصنيف فرعي</button>
                      <button className="adm-btn-sm" onClick={() => setEditing({ id: c.id, name_ar: c.name_ar, icon: c.icon, image_url: c.image_url, sort_order: c.sort_order, active: c.active, parent_id: "", originalKind: "main" })}>تعديل</button>
                      <button className="adm-btn-sm adm-btn-danger" onClick={() => delMain(c.id)}>حذف</button>
                    </div>
                  </div>
                  {topSubs.length > 0 && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, paddingRight: 16, borderRight: "2px solid #F0E5E5" }}>
                      {topSubs.map((s) => {
                        const ters = tertiariesOf(s.id);
                        return (
                          <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#FAF6F2", borderRadius: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ color: "#9A8A8A" }}>↳</span>
                                <span>{s.name_ar}</span>
                                <span style={{ fontSize: 10, color: "#9A8A8A" }}>({s.sort_order})</span>
                                <span className={`adm-badge ${s.active ? "adm-badge-on" : ""}`} style={{ fontSize: 10 }}>{s.active ? "مفعّل" : "متوقف"}</span>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button className="adm-btn-sm" onClick={() => setEditing({ active: true, sort_order: 0, parent_id: c.id, sub_parent_id: s.id })}>+ ثانوي</button>
                                <button className="adm-btn-sm" onClick={() => setEditing({ id: s.id, name_ar: s.name_ar, sort_order: s.sort_order, active: s.active, parent_id: s.category_id, sub_parent_id: s.parent_id, originalKind: "sub" })}>تعديل</button>
                                <button className="adm-btn-sm adm-btn-danger" onClick={() => delSub(s.id)}>حذف</button>
                              </div>
                            </div>
                            {ters.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingRight: 20, borderRight: "2px dashed #E8DADA", marginRight: 8 }}>
                                {ters.map((t) => (
                                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#fff", border: "1px solid #F0E5E5", borderRadius: 6, fontSize: 13 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span style={{ color: "#C47A7A" }}>⤷</span>
                                      <span>{t.name_ar}</span>
                                      <span style={{ fontSize: 10, color: "#9A8A8A" }}>({t.sort_order})</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <button className="adm-btn-sm" onClick={() => setEditing({ id: t.id, name_ar: t.name_ar, sort_order: t.sort_order, active: t.active, parent_id: t.category_id, sub_parent_id: t.parent_id, originalKind: "sub" })}>تعديل</button>
                                      <button className="adm-btn-sm adm-btn-danger" onClick={() => delSub(t.id)}>حذف</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <Modal
          title={editing.id ? "تعديل تصنيف" : "إضافة تصنيف"}
          onClose={() => setEditing(null)}
          onSave={save}
        >
          <Field label="اسم التصنيف *">
            <input
              autoFocus
              value={editing.name_ar ?? ""}
              onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })}
              placeholder="مثال: صالونات تجميل"
            />
          </Field>
          <Field label="القسم الرئيسي (اتركيه فارغًا إذا كان قسمًا رئيسيًا)">
            <select
              value={editing.parent_id}
              disabled={!!editing.id}
              onChange={(e) => setEditing({ ...editing, parent_id: e.target.value, sub_parent_id: null })}
            >
              <option value="">— قسم رئيسي —</option>
              {cats.filter((c) => c.id !== editing.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
            </select>
          </Field>
          {editing.parent_id && (
            <Field label="تصنيف ثانوي تحت (اختياري — لجعله تصنيف ثانوي)">
              <select
                value={editing.sub_parent_id ?? ""}
                onChange={(e) => setEditing({ ...editing, sub_parent_id: e.target.value || null })}
              >
                <option value="">— لا (تصنيف فرعي مباشر) —</option>
                {subs
                  .filter((s) => s.category_id === editing.parent_id && !s.parent_id && s.id !== editing.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name_ar}</option>
                  ))}
              </select>
            </Field>
          )}
          {!editing.parent_id && (
            <>
              <Field label="أيقونة (Emoji — اختياري)">
                <input
                  value={editing.icon ?? ""}
                  onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                  placeholder="💇‍♀️"
                />
              </Field>
              <Field label="صورة القسم (اختياري — تظهر بدل الأيقونة)">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {editing.image_url && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img src={editing.image_url} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }} />
                      <button type="button" className="adm-btn-sm adm-btn-danger" onClick={() => setEditing({ ...editing, image_url: null })}>حذف الصورة</button>
                    </div>
                  )}
                  <FileInput accept="image/*" onChange={(e) => e.target.files?.[0] && uploadCatImage(e.target.files[0])} />
                </div>
              </Field>
            </>
          )}
          <Field label="الترتيب (الأصغر يظهر أولاً)">
            <input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} />
          </Field>
          <Field label="مفعّل">
            <input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
          </Field>
        </Modal>
      )}
    </>
  );
}

// ============ PROVIDERS ============
type ProvRow = {
  id: string; subcategory_id: string; city_id: string; name: string;
  description: string | null; price_from: number | null; price_to: number | null;
  whatsapp: string | null; instagram: string | null;
  tiktok: string | null; twitter: string | null; snapchat: string | null;
  address: string | null;
  rating: number | null; is_featured: boolean; featured_until: string | null;
  sort_order: number; active: boolean;
  video_url: string | null;
};
type ImgRow = { id: string; provider_id: string; image_url: string; sort_order: number };

function ProvidersTab() {
  const [rows, setRows] = useState<ProvRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [cats, setCats] = useState<CatRow[]>([]);
  const [images, setImages] = useState<ImgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ProvRow> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");

  const reload = useCallback(async () => {
    setLoading(true);
    const [p, ci, s, c, i] = await Promise.all([
      supabase.from("providers").select("*").order("is_featured", { ascending: false }).order("sort_order"),
      supabase.from("cities").select("*").order("sort_order"),
      supabase.from("subcategories").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("provider_images").select("*").order("sort_order"),
    ]);
    setRows((p.data ?? []) as ProvRow[]);
    setCities((ci.data ?? []) as CityRow[]);
    setSubs((s.data ?? []) as SubRow[]);
    setCats((c.data ?? []) as CatRow[]);
    setImages((i.data ?? []) as ImgRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    if (!editing?.subcategory_id || !editing?.city_id || !editing?.name) { alert("املئي: التصنيف الفرعي + المدينة + الاسم"); return; }
    const payload = {
      subcategory_id: editing.subcategory_id, city_id: editing.city_id, name: editing.name,
      description: editing.description ?? null,
      price_from: editing.price_from ? +editing.price_from : null,
      price_to: editing.price_to ? +editing.price_to : null,
      whatsapp: editing.whatsapp ?? null, instagram: editing.instagram ?? null,
      tiktok: editing.tiktok ?? null, twitter: editing.twitter ?? null, snapchat: editing.snapchat ?? null,
      address: editing.address ?? null, rating: editing.rating ?? null,
      is_featured: editing.is_featured ?? false,
      featured_until: editing.featured_until || null,
      sort_order: editing.sort_order ?? 0, active: editing.active ?? true,
      video_url: editing.video_url ?? null,
    };
    if (editing.id) {
      const before = rows.find((r) => r.id === editing.id);
      await supabase.from("providers").update(payload).eq("id", editing.id);
      logActivity("update", "provider", editing.id, { name: payload.name, changes: diffFields(before as never, payload as never) });

    } else {
      const { data } = await supabase.from("providers").insert(payload).select().single();
      if (data) editing.id = data.id;
      logActivity("create", "provider", data?.id ?? null, { name: payload.name });
    }
    setEditing(null); reload();
  };
  const del = async (id: string) => {
    if (!confirm("حذف مقدم الخدمة وكل صوره؟")) return;
    const row = rows.find((r) => r.id === id);
    await supabase.from("providers").delete().eq("id", id);
    logActivity("delete", "provider", id, { name: row?.name });
    reload();
  };
  const toggleFeatured = async (r: ProvRow) => {
    await supabase.from("providers").update({ is_featured: !r.is_featured }).eq("id", r.id);
    logActivity(r.is_featured ? "unfeature" : "feature", "provider", r.id, { name: r.name });
    reload();
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !editing?.id) { alert("احفظي مقدم الخدمة أولاً قبل رفع الصور"); return; }
    setUploading(true);
    let uploaded = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split(".").pop();
      const path = `${editing.id}/${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage.from("provider-images").upload(path, f);
      if (upErr) { alert("خطأ رفع: " + upErr.message); continue; }
      const { data: pub } = supabase.storage.from("provider-images").getPublicUrl(path);
      await supabase.from("provider_images").insert({
        provider_id: editing.id, image_url: pub.publicUrl, sort_order: i,
      });
      uploaded++;
    }
    if (uploaded > 0) logActivity("upload_images", "provider", editing.id, { count: uploaded, name: editing.name });
    setUploading(false);
    reload();
  };

  const delImg = async (img: ImgRow) => {
    await supabase.from("provider_images").delete().eq("id", img.id);
    logActivity("delete_image", "provider", img.provider_id, { image_id: img.id });
    reload();
  };

  const handleVideoUpload = async (file: File | undefined) => {
    if (!file || !editing?.id) { alert("احفظي مقدم الخدمة أولاً قبل رفع الفيديو"); return; }
    if (file.size > 50 * 1024 * 1024) { alert("حجم الفيديو يجب أن يكون أقل من 50 ميغابايت"); return; }
    setUploadingVideo(true);
    const ext = file.name.split(".").pop();
    const path = `${editing.id}/video-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("provider-images").upload(path, file);
    if (upErr) { alert("خطأ رفع: " + upErr.message); setUploadingVideo(false); return; }
    const { data: pub } = supabase.storage.from("provider-images").getPublicUrl(path);
    await supabase.from("providers").update({ video_url: pub.publicUrl }).eq("id", editing.id);
    logActivity("upload_video", "provider", editing.id, { name: editing.name });
    setEditing({ ...editing, video_url: pub.publicUrl });
    setUploadingVideo(false);
    reload();
  };

  const filtered = rows.filter((r) => {
    if (filterCity !== "all" && r.city_id !== filterCity) return false;
    if (filterCat !== "all") {
      const sub = subs.find((s) => s.id === r.subcategory_id);
      if (!sub || sub.category_id !== filterCat) return false;
    }
    return true;
  });

  const editingImages = editing?.id ? images.filter((i) => i.provider_id === editing.id) : [];
  const editSubs = editing?.subcategory_id ? subs : subs;

  return (
    <>
      <SectionHeader title="مقدمو الخدمة" onAdd={() => setEditing({ active: true, sort_order: 0, is_featured: false })} />
      <div className="adm-card">
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="adm-select">
            <option value="all">كل المدن</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="adm-select">
            <option value="all">كل التصنيفات</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
          <button
            className="adm-btn-primary"
            style={{ marginRight: "auto" }}
            onClick={() => exportProvidersCsv(filtered, cities, subs, cats, images)}
            disabled={filtered.length === 0}
          >
            📊 تصدير Excel ({filtered.length})
          </button>
        </div>
        {loading ? <p className="adm-empty">جارٍ التحميل...</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr>
                <th>الاسم</th><th>المدينة</th><th>التصنيف</th><th>السعر</th>
                <th>واتساب</th><th>مميز</th><th>الترتيب</th><th>الحالة</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.map((r) => {
                  const sub = subs.find((s) => s.id === r.subcategory_id);
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong></td>
                      <td>{cities.find((c) => c.id === r.city_id)?.name_ar ?? "—"}</td>
                      <td>{sub?.name_ar ?? "—"}</td>
                      <td>{r.price_from ? `${r.price_from}${r.price_to ? `–${r.price_to}` : ""} ر.س` : "—"}</td>
                      <td style={{ direction: "ltr", fontSize: 12 }}>{r.whatsapp ?? "—"}</td>
                      <td>
                        <button onClick={() => toggleFeatured(r)} className={`adm-pill ${r.is_featured ? "on" : ""}`}>
                          {r.is_featured ? "★ مميز" : "عادي"}
                        </button>
                      </td>
                      <td>{r.sort_order}</td>
                      <td><span className={`adm-badge ${r.active ? "adm-badge-on" : ""}`}>{r.active ? "مفعّل" : "متوقف"}</span></td>
                      <td>
                        <button className="adm-btn-sm" onClick={() => setEditing(r)}>تعديل</button>
                        <button className="adm-btn-sm adm-btn-danger" onClick={() => del(r.id)}>حذف</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? "تعديل مقدم خدمة" : "إضافة مقدم خدمة"} onClose={() => setEditing(null)} onSave={save} wide>
          <div className="adm-grid2">
            <Field label="الاسم *"><input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="المدينة *">
              <select value={editing.city_id ?? ""} onChange={(e) => setEditing({ ...editing, city_id: e.target.value })}>
                <option value="">اختاري...</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </Field>
            <Field label="التصنيف الفرعي *">
              <select value={editing.subcategory_id ?? ""} onChange={(e) => setEditing({ ...editing, subcategory_id: e.target.value })}>
                <option value="">اختاري...</option>
                {editSubs.map((s) => {
                  const cat = cats.find((c) => c.id === s.category_id);
                  const parentSub = s.parent_id ? subs.find((x) => x.id === s.parent_id) : null;
                  const label = parentSub
                    ? `${cat?.name_ar} → ${parentSub.name_ar} → ${s.name_ar}`
                    : `${cat?.name_ar} → ${s.name_ar}`;
                  return <option key={s.id} value={s.id}>{label}</option>;
                })}
              </select>
            </Field>
            <Field label="رقم واتساب (مع رمز الدولة)">
              <input value={editing.whatsapp ?? ""} onChange={(e) => setEditing({ ...editing, whatsapp: e.target.value })} placeholder="966555555555" dir="ltr" />
            </Field>
            <Field label="السعر من (ر.س)"><input type="number" value={editing.price_from ?? ""} onChange={(e) => setEditing({ ...editing, price_from: e.target.value ? +e.target.value : null })} /></Field>
            <Field label="السعر إلى (ر.س)"><input type="number" value={editing.price_to ?? ""} onChange={(e) => setEditing({ ...editing, price_to: e.target.value ? +e.target.value : null })} /></Field>
            <Field label="إنستغرام (اسم المستخدم)"><input value={editing.instagram ?? ""} onChange={(e) => setEditing({ ...editing, instagram: e.target.value })} dir="ltr" placeholder="username" /></Field>
            <Field label="تيك توك (اسم المستخدم)"><input value={editing.tiktok ?? ""} onChange={(e) => setEditing({ ...editing, tiktok: e.target.value })} dir="ltr" placeholder="username" /></Field>
            <Field label="اكس / تويتر (اسم المستخدم)"><input value={editing.twitter ?? ""} onChange={(e) => setEditing({ ...editing, twitter: e.target.value })} dir="ltr" placeholder="username" /></Field>
            <Field label="سناب شات (اسم المستخدم)"><input value={editing.snapchat ?? ""} onChange={(e) => setEditing({ ...editing, snapchat: e.target.value })} dir="ltr" placeholder="username" /></Field>
            <Field label="العنوان"><input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
            <Field label="التقييم (0-5)"><input type="number" step="0.1" min="0" max="5" value={editing.rating ?? ""} onChange={(e) => setEditing({ ...editing, rating: e.target.value ? +e.target.value : null })} /></Field>
            <Field label="الترتيب اليدوي"><input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} /></Field>
          </div>
          <Field label="الوصف"><textarea rows={4} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
          <div className="adm-grid2">
            <Field label="مميز (يظهر بالأعلى)"><input type="checkbox" checked={editing.is_featured ?? false} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /></Field>
            <Field label="نهاية فترة الترقية (اختياري)">
              <input type="datetime-local" value={editing.featured_until ? editing.featured_until.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, featured_until: e.target.value || null })} />
            </Field>
            <Field label="مفعّل"><input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /></Field>
          </div>

          {editing.id && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #E8DADA" }}>
              <h4 style={{ marginBottom: 12, fontWeight: 700 }}>الصور</h4>
              <FileInput accept="image/*" multiple disabled={uploading} onChange={(e) => handleUpload(e.target.files)} label="اضغط لرفع صور (يمكن اختيار أكثر من صورة)" />
              {uploading && <p style={{ marginTop: 8, fontSize: 13 }}>جارٍ الرفع...</p>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10, marginTop: 12 }}>
                {editingImages.map((img) => (
                  <div key={img.id} style={{ position: "relative" }}>
                    <img src={img.image_url} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }} />
                    <button type="button" onClick={() => delImg(img)} style={{ position: "absolute", top: 4, left: 4, background: "rgba(220,30,30,0.9)", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>حذف</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {editing.id && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #E8DADA" }}>
              <h4 style={{ marginBottom: 12, fontWeight: 700 }}>الفيديو (اختياري)</h4>
              <Field label="رابط فيديو (يوتيوب / تيك توك / إنستغرام / رابط مباشر)">
                <input
                  value={editing.video_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, video_url: e.target.value || null })}
                  dir="ltr"
                  placeholder="https://..."
                />
              </Field>
              <p style={{ fontSize: 12, color: "#5A4A4A", margin: "4px 0 10px" }}>أو ارفعي ملف فيديو مباشرة (حد أقصى 50 ميغابايت):</p>
              <FileInput accept="video/*" disabled={uploadingVideo} onChange={(e) => handleVideoUpload(e.target.files?.[0])} label="اضغط لرفع فيديو" />
              {uploadingVideo && <p style={{ marginTop: 8, fontSize: 13 }}>جارٍ الرفع...</p>}
              {editing.video_url && (
                <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
                  <a href={editing.video_url} target="_blank" rel="noopener noreferrer" style={{ color: "#660000", fontSize: 13, fontWeight: 600, textDecoration: "underline", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "ltr" }}>{editing.video_url}</a>
                  <button type="button" onClick={async () => { await supabase.from("providers").update({ video_url: null }).eq("id", editing.id!); logActivity("delete_video", "provider", editing.id!, { name: editing.name }); setEditing({ ...editing, video_url: null }); reload(); }} style={{ background: "rgba(220,30,30,0.9)", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>حذف الفيديو</button>
                </div>
              )}
            </div>
          )}
          {!editing.id && <p style={{ marginTop: 12, fontSize: 13, color: "#5A4A4A" }}>احفظي أولاً ثم سترين خيار رفع الصور.</p>}
        </Modal>
      )}
    </>
  );
}

// ============ BANNERS ============
type BannerRow = {
  id: string; title: string | null; image_url: string; link_url: string | null;
  sort_order: number; active: boolean;
};

function BannersTab() {
  const [rows, setRows] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<BannerRow> | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    setRows((data ?? []) as BannerRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const uploadImage = async (file: File) => {
    if (!editing) return;
    const ext = file.name.split(".").pop();
    const path = `banners/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("provider-images").upload(path, file);
    if (error) { alert("خطأ رفع: " + error.message); return; }
    const { data: pub } = supabase.storage.from("provider-images").getPublicUrl(path);
    setEditing({ ...editing, image_url: pub.publicUrl });
  };

  const save = async () => {
    if (!editing?.image_url) { alert("ارفع صورة البنر أولاً"); return; }
    const payload = {
      title: editing.title ?? null,
      image_url: editing.image_url,
      link_url: editing.link_url ?? null,
      sort_order: editing.sort_order ?? 0,
      active: editing.active ?? true,
    };
    if (editing.id) {
      const before = rows.find((r) => r.id === editing.id);
      await supabase.from("banners").update(payload).eq("id", editing.id);
      logActivity("update", "banner", editing.id, { title: payload.title, changes: diffFields(before as never, payload as never) });

    } else {
      const { data } = await supabase.from("banners").insert(payload).select().single();
      logActivity("create", "banner", data?.id ?? null, { title: payload.title });
    }
    setEditing(null); reload();
  };

  const del = async (id: string) => {
    if (!confirm("حذف البنر؟")) return;
    const row = rows.find((r) => r.id === id);
    await supabase.from("banners").delete().eq("id", id);
    logActivity("delete", "banner", id, { title: row?.title });
    reload();
  };

  return (
    <>
      <SectionHeader title="البنرات الإعلانية" onAdd={() => setEditing({ active: true, sort_order: 0 })} />
      <div className="adm-card">
        {loading ? <p className="adm-empty">جارٍ التحميل...</p> : rows.length === 0 ? (
          <p className="adm-empty">لا توجد بنرات بعد. اضغط "إضافة جديد" لإضافة بنر.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
            {rows.map((b) => (
              <div key={b.id} style={{ border: "1px solid #E8DADA", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                <img src={b.image_url} alt="" style={{ width: "100%", height: 140, objectFit: "cover" }} />
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{b.title || "بدون عنوان"}</div>
                  <div style={{ fontSize: 12, color: "#5A4A4A", marginBottom: 8 }}>
                    {b.active ? <span className="adm-badge adm-badge-on">مفعّل</span> : <span className="adm-badge">معطّل</span>}
                    <span style={{ marginRight: 8 }}>ترتيب: {b.sort_order}</span>
                  </div>
                  <button className="adm-btn-sm" onClick={() => setEditing(b)}>تعديل</button>
                  <button className="adm-btn-sm adm-btn-danger" onClick={() => del(b.id)}>حذف</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? "تعديل بنر" : "إضافة بنر"} onClose={() => setEditing(null)} onSave={save}>
          <Field label="العنوان (اختياري)">
            <input type="text" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </Field>
          <Field label="رابط الإعلان (اختياري)">
            <input type="text" placeholder="https://..." value={editing.link_url ?? ""} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} />
          </Field>
          <Field label="صورة البنر">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {editing.image_url && (
                <img src={editing.image_url} alt="" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8 }} />
              )}
              <FileInput accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            </div>
          </Field>
          <Field label="الترتيب">
            <input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} />
          </Field>
          <Field label="مفعّل">
            <input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
          </Field>
        </Modal>
      )}
    </>
  );
}

// ============ REVIEWS ============
type ReviewRow = {
  id: string; provider_id: string; user_id: string;
  rating: number; comment: string | null; created_at: string;
};

function ReviewsTab() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [providers, setProviders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as ReviewRow[]);
    const { data: provs } = await supabase.from("providers").select("id,name");
    const map: Record<string, string> = {};
    (provs ?? []).forEach((p: { id: string; name: string }) => { map[p.id] = p.name; });
    setProviders(map);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const del = async (id: string) => {
    if (!confirm("حذف هذا التقييم؟")) return;
    const row = rows.find((r) => r.id === id);
    await supabase.from("reviews").delete().eq("id", id);
    logActivity("delete", "review", id, { provider_id: row?.provider_id, rating: row?.rating });
    reload();
  };

  return (
    <>
      <h1 className="adm-title">التقييمات</h1>
      <div className="adm-card">
        {loading ? <p className="adm-empty">جارٍ التحميل...</p> : rows.length === 0 ? (
          <p className="adm-empty">لا توجد تقييمات بعد.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>مقدم الخدمة</th>
                  <th>التقييم</th>
                  <th>التعليق</th>
                  <th>التاريخ</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{providers[r.provider_id] || r.provider_id.slice(0, 8)}</td>
                    <td>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</td>
                    <td style={{ maxWidth: 360 }}>{r.comment || "-"}</td>
                    <td style={{ fontSize: 12, color: "#5A4A4A" }}>{fmt(r.created_at)}</td>
                    <td>
                      <button className="adm-btn-sm adm-btn-danger" onClick={() => del(r.id)}>حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ============ HELPERS ============

function FileInput({ accept, multiple, disabled, onChange, label }: {
  accept?: string; multiple?: boolean; disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
}) {
  return (
    <label style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 6, padding: "18px 12px", border: "2px dashed #C47A7A", borderRadius: 10,
      background: "#FAF6F2", cursor: disabled ? "not-allowed" : "pointer",
      color: "#6B1F1F", fontSize: 13, fontWeight: 600, textAlign: "center",
      opacity: disabled ? 0.6 : 1,
    }}>
      <span style={{ fontSize: 26 }}>📎</span>
      <span>{label || "اضغط لرفع صورة من جهازك"}</span>
      <input
        type="file" accept={accept} multiple={multiple} disabled={disabled}
        onChange={onChange}
        style={{ display: "none" }}
      />
    </label>
  );
}

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h1 className="adm-title">{title}</h1>
      <button className="adm-btn-primary" onClick={onAdd}>+ إضافة جديد</button>
    </div>
  );
}

function exportProvidersCsv(
  rows: ProvRow[], cities: CityRow[], subs: SubRow[], cats: CatRow[], images: ImgRow[]
) {
  const cityMap = new Map(cities.map((c) => [c.id, c.name_ar]));
  const subMap = new Map(subs.map((s) => [s.id, s]));
  const catMap = new Map(cats.map((c) => [c.id, c.name_ar]));
  const imgsBy = new Map<string, string[]>();
  images.forEach((i) => {
    const arr = imgsBy.get(i.provider_id) ?? [];
    arr.push(i.image_url);
    imgsBy.set(i.provider_id, arr);
  });

  const headers = [
    "الاسم", "التصنيف الرئيسي", "التصنيف الفرعي", "المدينة",
    "الوصف", "العنوان", "السعر من", "السعر إلى",
    "واتساب", "انستغرام", "تيك توك", "اكس", "سناب شات",
    "رابط الخريطة", "التقييم", "مميز", "مفعّل", "ترتيب", "عدد الصور", "روابط الصور",
  ];

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [headers.join(",")];
  rows.forEach((r) => {
    const sub = subMap.get(r.subcategory_id);
    const catName = sub ? (catMap.get(sub.category_id) ?? "") : "";
    const subName = sub?.name_ar ?? "";
    const imgs = imgsBy.get(r.id) ?? [];
    lines.push([
      r.name, catName, subName, cityMap.get(r.city_id) ?? "",
      r.description ?? "", r.address ?? "", r.price_from ?? "", r.price_to ?? "",
      r.whatsapp ?? "", r.instagram ?? "", r.tiktok ?? "", r.twitter ?? "", r.snapchat ?? "",
      "", r.rating ?? "", r.is_featured ? "نعم" : "لا", r.active ? "نعم" : "لا",
      r.sort_order, imgs.length, imgs.join(" | "),
    ].map(escape).join(","));
  });

  // UTF-8 BOM so Excel renders Arabic correctly
  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `providers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="adm-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, onSave, children, wide }: {
  title: string; onClose: () => void; onSave: () => void;
  children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="adm-modal-bg" onClick={onClose}>
      <div className={`adm-modal ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal-head">
          <h3>{title}</h3>
          <button onClick={onClose} className="adm-modal-x">×</button>
        </div>
        <div className="adm-modal-body">{children}</div>
        <div className="adm-modal-foot">
          <button className="adm-btn-secondary" onClick={onClose}>إلغاء</button>
          <button className="adm-btn-primary" onClick={onSave}>حفظ</button>
        </div>
      </div>
    </div>
  );
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
  } catch { return iso; }
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#FAF6F2", fontFamily: "Tajawal, system-ui, sans-serif", color: "#1A1A1A",
};
const loadingStyle: React.CSSProperties = { ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center" };

const adminCss = `
  .adm-nav { background:#fff; border-bottom:1px solid #E8DADA; padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 12px rgba(107,31,31,0.06); }
  .adm-brand { text-decoration:none; }
  .adm-brand-name { font-size:20px; font-weight:900; color:#6B1F1F; }
  .adm-brand-en { font-size:9px; letter-spacing:5px; color:#C47A7A; }
  .adm-nav-right { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
  .adm-link { color:#5A4A4A; text-decoration:none; font-size:13px; }
  .adm-link:hover { color:#6B1F1F; }
  .adm-user { font-size:12px; color:#5A4A4A; }
  .adm-logout { background:#fff; color:#6B1F1F; border:1px solid #6B1F1F; border-radius:50px; padding:6px 14px; font-family:inherit; font-size:12px; font-weight:600; cursor:pointer; }
  .adm-logout:hover { background:#6B1F1F; color:#fff; }

  .adm-layout { display:grid; grid-template-columns:240px 1fr; min-height:calc(100vh - 64px); }
  .adm-side { background:#fff; border-left:1px solid #E8DADA; padding:20px 12px; display:flex; flex-direction:column; gap:4px; }
  .adm-side-group { font-size:11px; color:#9A8A8A; padding:14px 12px 6px; letter-spacing:2px; font-weight:700; }
  .adm-side-btn { background:transparent; border:none; text-align:right; padding:10px 14px; border-radius:8px; cursor:pointer; font-family:inherit; font-size:14px; color:#5A4A4A; transition:all .2s; }
  .adm-side-btn:hover { background:#FAF6F2; color:#6B1F1F; }
  .adm-side-btn.active { background:#6B1F1F; color:#fff; font-weight:700; }
  .adm-content { padding:32px; max-width:100%; overflow-x:auto; }

  .adm-title { font-size:26px; font-weight:900; color:#1A1A1A; margin-bottom:20px; }
  .adm-stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:32px; }
  .adm-stat { background:#fff; border:1px solid #E8DADA; border-radius:14px; padding:20px; }
  .adm-stat-num { font-size:32px; font-weight:900; color:#6B1F1F; }
  .adm-stat-label { font-size:13px; color:#5A4A4A; margin-top:4px; }
  .adm-card { background:#fff; border:1px solid #E8DADA; border-radius:14px; padding:20px; }
  .adm-empty { color:#5A4A4A; font-size:14px; text-align:center; padding:30px; }
  .adm-error { color:#a01919; font-size:14px; }

  .adm-table-wrap { overflow-x:auto; }
  .adm-table { width:100%; border-collapse:collapse; font-size:14px; }
  .adm-table th, .adm-table td { text-align:right; padding:10px 12px; border-bottom:1px solid #F0E8E0; vertical-align:middle; }
  .adm-table th { background:#FAF6F2; font-weight:700; color:#5A4A4A; font-size:12px; }
  .adm-table tr:hover td { background:#FCFAF8; }

  .adm-badge { display:inline-block; padding:3px 10px; border-radius:50px; background:#F0E8E0; color:#5A4A4A; font-size:12px; font-weight:600; }
  .adm-badge-admin { background:#6B1F1F; color:#fff; }
  .adm-badge-on { background:#d4f5d4; color:#2a6e2a; }

  .adm-pill { background:#F0E8E0; border:none; padding:5px 12px; border-radius:50px; font-family:inherit; font-size:12px; cursor:pointer; color:#5A4A4A; }
  .adm-pill.on { background:#D4AF37; color:#fff; font-weight:700; }

  .adm-btn-primary { background:#6B1F1F; color:#fff; border:none; padding:10px 22px; border-radius:8px; font-family:inherit; font-size:14px; font-weight:600; cursor:pointer; }
  .adm-btn-primary:hover { background:#4A1414; }
  .adm-btn-primary:disabled { background:#999; cursor:not-allowed; }
  .adm-btn-secondary { background:#fff; color:#5A4A4A; border:1px solid #E8DADA; padding:10px 22px; border-radius:8px; font-family:inherit; font-size:14px; cursor:pointer; }
  .adm-section-h { font-size:13px; font-weight:700; color:#9A8A8A; letter-spacing:2px; margin:8px 0 12px; }
  .adm-btn-sm { background:#fff; color:#6B1F1F; border:1px solid #E8DADA; padding:5px 11px; border-radius:6px; font-family:inherit; font-size:12px; cursor:pointer; margin:0 2px; }
  .adm-btn-sm:hover { background:#FAF6F2; }
  .adm-btn-danger { color:#a01919; border-color:#f5d5d5; }
  .adm-btn-danger:hover { background:#fdf0f0; }

  .adm-select { padding:8px 14px; border:1px solid #E8DADA; border-radius:8px; font-family:inherit; font-size:13px; background:#fff; color:#1A1A1A; }

  .adm-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
  .adm-modal { background:#fff; border-radius:14px; width:100%; max-width:500px; max-height:90vh; display:flex; flex-direction:column; }
  .adm-modal.wide { max-width:800px; }
  .adm-modal-head { padding:18px 22px; border-bottom:1px solid #E8DADA; display:flex; justify-content:space-between; align-items:center; }
  .adm-modal-head h3 { font-size:18px; font-weight:800; }
  .adm-modal-x { background:none; border:none; font-size:28px; cursor:pointer; color:#9A8A8A; }
  .adm-modal-body { padding:22px; overflow-y:auto; flex:1; }
  .adm-modal-foot { padding:16px 22px; border-top:1px solid #E8DADA; display:flex; gap:10px; justify-content:flex-end; }

  .adm-field { margin-bottom:14px; }
  .adm-field label { display:block; font-size:13px; color:#5A4A4A; margin-bottom:6px; font-weight:600; }
  .adm-field input[type=text], .adm-field input[type=number], .adm-field input[type=datetime-local], .adm-field input:not([type]), .adm-field select, .adm-field textarea {
    width:100%; padding:9px 12px; border:1px solid #E8DADA; border-radius:8px; font-family:inherit; font-size:14px; background:#fff; color:#1A1A1A;
  }
  .adm-field input[type=checkbox] { width:18px; height:18px; }
  .adm-field textarea { resize:vertical; }

  .adm-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  @media (max-width: 768px) {
    .adm-layout { grid-template-columns:1fr; }
    .adm-side { flex-direction:row; overflow-x:auto; padding:10px; }
    .adm-side-group { display:none; }
    .adm-side-btn { white-space:nowrap; }
    .adm-content { padding:20px 16px; }
    .adm-grid2 { grid-template-columns:1fr; }
  }
`;

// ============ CODES ============
function CodesTab() {
  const gen = useServerFn(generateCodes);
  const list = useServerFn(listCodes);
  const del = useServerFn(deleteCode);
  const [count, setCount] = useState(1);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Array<{ id: string; code: string; email: string | null; note: string | null; used_at: string | null; used_by: string | null; created_at: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await list();
    setRows(res.codes as typeof rows);
  }, [list]);

  useEffect(() => { reload(); }, [reload]);

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await gen({ data: { count, email, note } });
      setMsg(`تم توليد ${res.codes.length} كود`);
      logActivity("generate", "purchase_codes", null, { count: res.codes.length, email: email || null, note: note || null });
      setEmail(""); setNote("");
      await reload();
    } catch (e) {
      setMsg("خطأ: " + (e as Error).message);
    } finally { setBusy(false); }
  }

  async function copy(code: string) {
    try { await navigator.clipboard.writeText(code); setMsg("تم نسخ الكود: " + code); } catch {}
  }

  function exportCsv() {
    const header = ["code", "email", "note", "used_at", "created_at"];
    const lines = [header.join(",")].concat(
      rows.map((r) => [r.code, r.email ?? "", (r.note ?? "").replaceAll(",", " "), r.used_at ?? "", r.created_at].join(","))
    );
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `purchase-codes-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const unused = rows.filter((r) => !r.used_at).length;

  return (
    <>
      <h1 className="adm-title">أكواد الاشتراك</h1>
      <p style={{ color: "#555", marginBottom: 16, fontSize: 14 }}>
        التسجيل في الموقع مغلق. يستطيع المشتري من سلة التسجيل فقط عبر كود يصله بالإيميل. ولّد الأكواد هنا ثم أرسلها للعملاء.
      </p>

      <div className="adm-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>توليد أكواد جديدة</h3>
        <form onSubmit={onGenerate} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            العدد
            <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} style={inp} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            ربط بإيميل محدد (اختياري)
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" style={inp} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            ملاحظة (اختياري)
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلا: طلب سلة #1234" style={inp} />
          </label>
          <button className="adm-btn-primary" disabled={busy}>{busy ? "..." : "توليد"}</button>
        </form>
        {msg && <p style={{ marginTop: 10, fontSize: 13, color: "#6B1F1F" }}>{msg}</p>}
      </div>

      <div className="adm-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14 }}>
            الإجمالي: <b>{rows.length}</b> &nbsp;|&nbsp; غير مستخدمة: <b>{unused}</b>
          </div>
          <button className="adm-btn-secondary" onClick={exportCsv} disabled={rows.length === 0}>تصدير CSV</button>
        </div>
        {rows.length === 0 ? (
          <p className="adm-empty">لا توجد أكواد بعد.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>الكود</th><th>الإيميل</th><th>ملاحظة</th><th>الحالة</th><th>تاريخ الإنشاء</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button onClick={() => copy(r.code)} title="نسخ" style={{ background: "#f6f0ea", border: "1px solid #e3d8cc", borderRadius: 6, padding: "4px 10px", fontFamily: "monospace", cursor: "pointer", fontWeight: 700 }}>
                        {r.code}
                      </button>
                    </td>
                    <td>{r.email ?? "—"}</td>
                    <td>{r.note ?? "—"}</td>
                    <td>
                      {r.used_at
                        ? <span className="adm-badge adm-badge-admin">مستخدم</span>
                        : <span className="adm-badge">متاح</span>}
                    </td>
                    <td>{fmt(r.created_at)}</td>
                    <td>
                      <button onClick={async () => { if (confirm("حذف هذا الكود؟")) { await del({ data: { id: r.id } }); logActivity("delete", "purchase_code", r.id, { code: r.code }); reload(); } }}
                        style={{ background: "transparent", border: "none", color: "#a00", cursor: "pointer" }}>حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

type SallaRow = {
  id: string; code: string; email: string | null; note: string | null;
  customer_name: string | null; customer_phone: string | null; salla_order_id: string | null;
  used_at: string | null; used_by: string | null; created_at: string;
};

function SallaOrdersTab() {
  const gen = useServerFn(generateCodes);
  const list = useServerFn(listCodes);
  const del = useServerFn(deleteCode);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState<SallaRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<SallaRow | null>(null);
  const [search, setSearch] = useState("");

  const reload = useCallback(async () => {
    const res = await list();
    const all = (res.codes as SallaRow[]).filter((r) => r.customer_name || r.customer_phone || r.salla_order_id);
    setRows(all);
  }, [list]);

  useEffect(() => { reload(); }, [reload]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setMsg("الاسم والجوال مطلوبان"); return; }
    setBusy(true); setMsg(null); setLastCode(null);
    try {
      const res = await gen({ data: {
        count: 1, email,
        note: orderId ? `طلب سلة #${orderId}` : "",
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        salla_order_id: orderId.trim(),
      }});
      const created = res.codes[0] as SallaRow;
      setLastCode(created);
      setMsg(`✅ تم توليد الكود: ${created.code}`);
      logActivity("salla_order", "purchase_codes", created.id, { customer_name: name, salla_order_id: orderId });
      setName(""); setPhone(""); setOrderId(""); setEmail("");
      await reload();
    } catch (e) {
      setMsg("خطأ: " + (e as Error).message);
    } finally { setBusy(false); }
  }

  function whatsappLink(r: SallaRow) {
    const phone = (r.customer_phone ?? "").replace(/\D/g, "").replace(/^0/, "966");
    const text = `مرحباً ${r.customer_name ?? ""}،%0Aشكراً لطلبك من إزهليها 🌸%0Aكود التسجيل الخاص بك: *${r.code}*%0Aفعّليه من هنا: ${window.location.origin}/signup`;
    return `https://wa.me/${phone}?text=${text}`;
  }

  async function copy(code: string) {
    try { await navigator.clipboard.writeText(code); setMsg("تم نسخ: " + code); } catch {}
  }

  function exportCsv() {
    const header = ["customer_name", "customer_phone", "salla_order_id", "code", "status", "used_at", "created_at"];
    const lines = [header.join(",")].concat(
      rows.map((r) => [
        (r.customer_name ?? "").replaceAll(",", " "),
        r.customer_phone ?? "",
        r.salla_order_id ?? "",
        r.code,
        r.used_at ? "مستخدم" : "متاح",
        r.used_at ?? "",
        r.created_at,
      ].join(","))
    );
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `salla-orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (r.customer_name ?? "").toLowerCase().includes(q)
      || (r.customer_phone ?? "").includes(q)
      || (r.salla_order_id ?? "").toLowerCase().includes(q)
      || r.code.toLowerCase().includes(q);
  });
  const used = rows.filter((r) => r.used_at).length;

  return (
    <>
      <h1 className="adm-title">طلبات سلة</h1>
      <p style={{ color: "#555", marginBottom: 16, fontSize: 14 }}>
        بعد ما يدفع العميل في سلة، انسخي بياناته من لوحة سلة، وأدخليها هنا. النظام بيولّد كود ويربطه بالعميل، وتقدرين ترسلين الكود مباشرة عبر واتساب.
      </p>

      <div className="adm-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>إضافة طلب سلة جديد</h3>
        <form onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            اسم العميلة *
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} style={inp} placeholder="فاطمة محمد" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            رقم الجوال *
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={30} style={inp} placeholder="05xxxxxxxx" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            رقم طلب سلة
            <input value={orderId} onChange={(e) => setOrderId(e.target.value)} maxLength={60} style={inp} placeholder="#12345" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            الإيميل (اختياري)
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} placeholder="customer@email.com" />
          </label>
          <button className="adm-btn-primary" disabled={busy}>{busy ? "..." : "توليد كود"}</button>
        </form>
        {msg && <p style={{ marginTop: 10, fontSize: 13, color: "#6B1F1F" }}>{msg}</p>}
        {lastCode && (
          <div style={{ marginTop: 12, padding: 12, background: "#f6f0ea", border: "1px solid #e3d8cc", borderRadius: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>الكود الجاهز:</span>
            <code style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>{lastCode.code}</code>
            <button type="button" onClick={() => copy(lastCode.code)} className="adm-btn-secondary">نسخ</button>
            <a href={whatsappLink(lastCode)} target="_blank" rel="noreferrer" className="adm-btn-primary" style={{ textDecoration: "none", background: "#25D366" }}>
              📱 إرسال عبر واتساب
            </a>
          </div>
        )}
      </div>

      <div className="adm-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14 }}>
            الإجمالي: <b>{rows.length}</b> &nbsp;|&nbsp; مستخدم: <b>{used}</b> &nbsp;|&nbsp; غير مستخدم: <b>{rows.length - used}</b>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث (اسم، جوال، رقم طلب، كود)" style={{ ...inp, minWidth: 260 }} />
            <button className="adm-btn-secondary" onClick={exportCsv} disabled={rows.length === 0}>تصدير CSV</button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="adm-empty">لا توجد طلبات بعد.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>العميلة</th><th>الجوال</th><th>رقم طلب سلة</th><th>الكود</th><th>الحالة</th><th>تاريخ الإضافة</th><th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.customer_name ?? "—"}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{r.customer_phone ?? "—"}</td>
                    <td>{r.salla_order_id ?? "—"}</td>
                    <td>
                      <button onClick={() => copy(r.code)} title="نسخ" style={{ background: "#f6f0ea", border: "1px solid #e3d8cc", borderRadius: 6, padding: "4px 10px", fontFamily: "monospace", cursor: "pointer", fontWeight: 700 }}>
                        {r.code}
                      </button>
                    </td>
                    <td>
                      {r.used_at
                        ? <span className="adm-badge adm-badge-admin">مستخدم</span>
                        : <span className="adm-badge">متاح</span>}
                    </td>
                    <td>{fmt(r.created_at)}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      {!r.used_at && r.customer_phone && (
                        <a href={whatsappLink(r)} target="_blank" rel="noreferrer" title="إرسال واتساب"
                          style={{ background: "#25D366", color: "#fff", borderRadius: 6, padding: "4px 10px", textDecoration: "none", fontSize: 13 }}>
                          📱
                        </a>
                      )}
                      <button onClick={async () => { if (confirm("حذف هذا الطلب؟")) { await del({ data: { id: r.id } }); logActivity("delete", "salla_order", r.id, { code: r.code }); reload(); } }}
                        style={{ background: "transparent", border: "none", color: "#a00", cursor: "pointer" }}>حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}



const inp: React.CSSProperties = { border: "1px solid #E8DADA", borderRadius: 8, padding: "9px 12px", fontFamily: "inherit", fontSize: 14, background: "#FAF6F2", outline: "none" };

// ============ ACTIVITY LOG ============
type LogRow = {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",
  feature: "ترقية لمميز",
  unfeature: "إلغاء التمييز",
  upload_image: "رفع صورة",
  upload_images: "رفع صور",
  delete_image: "حذف صورة",
  upload_video: "رفع فيديو",
  delete_video: "حذف فيديو",
  generate: "توليد",
};

const ENTITY_LABEL: Record<string, string> = {
  city: "مدينة",
  category: "تصنيف رئيسي",
  subcategory: "تصنيف فرعي",
  provider: "مقدم خدمة",
  banner: "بنر",
  review: "تقييم",
  purchase_code: "كود اشتراك",
  purchase_codes: "أكواد اشتراك",
};

const FIELD_LABEL: Record<string, string> = {
  name: "الاسم", name_ar: "الاسم", name_en: "الاسم (EN)", title: "العنوان",
  description: "الوصف", slug: "المعرّف", address: "العنوان",
  whatsapp: "واتساب", instagram: "إنستغرام", tiktok: "تيكتوك",
  twitter: "تويتر", snapchat: "سناب شات", image_url: "الصورة", icon: "الأيقونة",
  link_url: "الرابط", price_from: "السعر من", price_to: "السعر إلى",
  rating: "التقييم", sort_order: "الترتيب", active: "مفعّل",
  is_featured: "مميّز", featured_until: "تمييز حتى",
  city_id: "المدينة", subcategory_id: "التصنيف الفرعي",
  category_id: "التصنيف", parent_id: "التصنيف الأب",
  sub_parent_id: "التصنيف الأب الفرعي", video_url: "الفيديو",
};

const fmtVal = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  if (typeof v === "string") {
    if (v.startsWith("http") && v.length > 40) return "🔗 رابط";
    return v.length > 30 ? v.slice(0, 30) + "…" : v;
  }
  return String(v);
};


function ActivityLogTab() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data ?? []) as LogRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const filtered = rows.filter((r) => {
    if (filterAction !== "all" && r.action !== filterAction) return false;
    if (filterEntity !== "all" && r.entity !== filterEntity) return false;
    return true;
  });

  const actions = Array.from(new Set(rows.map((r) => r.action)));
  const entities = Array.from(new Set(rows.map((r) => r.entity)));

  const describe = (r: LogRow) => {
    const d = (r.details ?? {}) as Record<string, unknown>;
    const name = (d.name_ar || d.name || d.title || d.code) as string | undefined;
    const label = name ? `"${name}"` : (r.entity_id ? `#${r.entity_id.slice(0, 6)}` : "");

    if (r.action === "create") {
      return <span><b style={{ color: "#1a7f37" }}>أُضيف</b> {ENTITY_LABEL[r.entity] ?? r.entity} {label}</span>;
    }
    if (r.action === "delete") {
      return <span><b style={{ color: "#c0392b" }}>حُذف</b> {ENTITY_LABEL[r.entity] ?? r.entity} {label}</span>;
    }
    if (r.action === "feature" || r.action === "unfeature") {
      return <span>{r.action === "feature" ? "تم تمييز" : "أُلغي تمييز"} {label}</span>;
    }
    if (r.action === "upload_images") {
      return <span>رُفعت <b>{(d.count as number) ?? 0}</b> صور لـ {label}</span>;
    }
    if (r.action === "upload_image") return <span>رُفعت صورة لـ {label || ENTITY_LABEL[r.entity]}</span>;
    if (r.action === "delete_image") return <span>حُذفت صورة من {label || ENTITY_LABEL[r.entity]}</span>;
    if (r.action === "upload_video") return <span>رُفع فيديو لـ {label}</span>;
    if (r.action === "delete_video") return <span>حُذف فيديو من {label}</span>;
    if (r.action === "generate") {
      return <span>تم توليد <b>{(d.count as number) ?? 0}</b> كود اشتراك{d.email ? ` لـ ${d.email as string}` : ""}</span>;
    }
    if (r.action === "update") {
      const changes = (d.changes ?? {}) as Record<string, { from: unknown; to: unknown }>;
      const keys = Object.keys(changes);
      if (keys.length === 0) {
        return <span>تم تعديل {label} <span style={{ color: "#888" }}>(لا تغييرات مرصودة)</span></span>;
      }
      return (
        <div>
          <div style={{ marginBottom: 4 }}>تم تعديل {label}:</div>
          <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 12, color: "#444" }}>
            {keys.slice(0, 6).map((k) => (
              <li key={k}>
                <b>{FIELD_LABEL[k] ?? k}:</b>{" "}
                <span style={{ color: "#c0392b", textDecoration: "line-through" }}>{fmtVal(changes[k].from)}</span>
                {" ← "}
                <span style={{ color: "#1a7f37" }}>{fmtVal(changes[k].to)}</span>
              </li>
            ))}
            {keys.length > 6 && <li style={{ color: "#888" }}>+ {keys.length - 6} حقول أخرى</li>}
          </ul>
        </div>
      );
    }
    return label || "—";
  };


  return (
    <>
      <h1 className="adm-title">سجل تعديلات الأدمن</h1>
      <p style={{ color: "#5A4A4A", marginBottom: 16, fontSize: 13 }}>
        آخر 500 إجراء قام بها الأدمنون (إضافة، تعديل، حذف، رفع صور، إلخ).
      </p>
      <div className="adm-card">
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <select className="adm-select" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
            <option value="all">كل الإجراءات</option>
            {actions.map((a) => <option key={a} value={a}>{ACTION_LABEL[a] ?? a}</option>)}
          </select>
          <select className="adm-select" value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}>
            <option value="all">كل الأنواع</option>
            {entities.map((e) => <option key={e} value={e}>{ENTITY_LABEL[e] ?? e}</option>)}
          </select>
          <button className="adm-btn-secondary" onClick={reload} style={{ marginRight: "auto" }}>تحديث</button>
        </div>
        {loading ? (
          <p className="adm-empty">جارٍ التحميل...</p>
        ) : filtered.length === 0 ? (
          <p className="adm-empty">لا توجد إجراءات بعد.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الأدمن</th>
                  <th>الإجراء</th>
                  <th>النوع</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 12, color: "#5A4A4A", whiteSpace: "nowrap" }}>{fmt(r.created_at)}</td>
                    <td style={{ fontSize: 12 }}>{r.admin_email ?? r.admin_id.slice(0, 8)}</td>
                    <td><span className="adm-badge adm-badge-on">{ACTION_LABEL[r.action] ?? r.action}</span></td>
                    <td>{ENTITY_LABEL[r.entity] ?? r.entity}</td>
                    <td style={{ fontSize: 13, maxWidth: 480, lineHeight: 1.6 }}>{describe(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}



import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getAdminUsers } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "لوحة الأدمن — إزهليها" }] }),
});

function AdminPage() {
  const { session, isAdmin, loading, signOut, user } = useAuth();
  const navigate = useNavigate();
  const fetchUsers = useServerFn(getAdminUsers);

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/" });
  }, [session, isAdmin, loading, navigate]);

  const enabled = !!session && isAdmin;
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
    enabled,
  });

  if (loading || !enabled) {
    return <div style={loadingStyle}>جارٍ التحقق...</div>;
  }

  return (
    <div dir="rtl" style={pageStyle}>
      <style>{adminCss}</style>

      <header className="adm-nav">
        <Link to="/" className="adm-brand">
          <div className="adm-brand-name">إزهليها — أدمن</div>
          <div className="adm-brand-en">AZHLEHA ADMIN</div>
        </Link>
        <div className="adm-nav-right">
          <span className="adm-user">{user?.email}</span>
          <button className="adm-logout" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
            تسجيل خروج
          </button>
        </div>
      </header>

      <main className="adm-main">
        <h1 className="adm-title">لوحة التحكم</h1>
        <p className="adm-sub">إدارة المستخدمات وعرض بياناتهن</p>

        <div className="adm-stats">
          <Stat label="إجمالي المستخدمات" value={data?.total ?? "—"} />
          <Stat label="عدد الأدمن" value={data?.admins ?? "—"} />
          <Stat
            label="مفعّلات الإيميل"
            value={data ? data.users.filter((u) => u.email_confirmed).length : "—"}
          />
        </div>

        <div className="adm-card">
          <h2 className="adm-section-title">قائمة المستخدمات</h2>
          {isLoading && <p className="adm-empty">جارٍ التحميل...</p>}
          {error && <p className="adm-error">حدث خطأ: {(error as Error).message}</p>}
          {data && data.users.length === 0 && <p className="adm-empty">لا توجد مستخدمات بعد.</p>}
          {data && data.users.length > 0 && (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الإيميل</th>
                    <th>الجوال</th>
                    <th>المدينة</th>
                    <th>الدور</th>
                    <th>تاريخ التسجيل</th>
                    <th>آخر دخول</th>
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
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="adm-stat">
      <div className="adm-stat-num">{value}</div>
      <div className="adm-stat-label">{label}</div>
    </div>
  );
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#FAF6F2",
  fontFamily: "Tajawal, system-ui, sans-serif",
  color: "#1A1A1A",
};
const loadingStyle: React.CSSProperties = {
  ...pageStyle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const adminCss = `
  .adm-nav { background:#fff; border-bottom:1px solid #E8DADA; padding:0 32px; height:64px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 12px rgba(107,31,31,0.06); }
  .adm-brand { text-decoration:none; }
  .adm-brand-name { font-size:20px; font-weight:900; color:#6B1F1F; }
  .adm-brand-en { font-size:9px; letter-spacing:5px; color:#C47A7A; }
  .adm-nav-right { display:flex; align-items:center; gap:16px; }
  .adm-user { font-size:13px; color:#5A4A4A; }
  .adm-logout { background:#fff; color:#6B1F1F; border:1px solid #6B1F1F; border-radius:50px; padding:8px 18px; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; }
  .adm-logout:hover { background:#6B1F1F; color:#fff; }
  .adm-main { max-width:1300px; margin:0 auto; padding:40px 32px; }
  .adm-title { font-size:30px; font-weight:900; color:#1A1A1A; }
  .adm-sub { font-size:15px; color:#5A4A4A; margin-top:4px; margin-bottom:32px; }
  .adm-stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:32px; }
  .adm-stat { background:#fff; border:1px solid #E8DADA; border-radius:14px; padding:20px 22px; box-shadow:0 2px 12px rgba(107,31,31,0.04); }
  .adm-stat-num { font-size:32px; font-weight:900; color:#6B1F1F; }
  .adm-stat-label { font-size:13px; color:#5A4A4A; margin-top:4px; }
  .adm-card { background:#fff; border:1px solid #E8DADA; border-radius:14px; padding:24px; box-shadow:0 2px 12px rgba(107,31,31,0.04); }
  .adm-section-title { font-size:18px; font-weight:800; margin-bottom:16px; color:#1A1A1A; }
  .adm-empty { color:#5A4A4A; font-size:14px; }
  .adm-error { color:#a01919; font-size:14px; }
  .adm-table-wrap { overflow-x:auto; }
  .adm-table { width:100%; border-collapse:collapse; font-size:14px; }
  .adm-table th, .adm-table td { text-align:right; padding:12px 14px; border-bottom:1px solid #F0E8E0; }
  .adm-table th { background:#FAF6F2; font-weight:700; color:#5A4A4A; font-size:12px; letter-spacing:.5px; }
  .adm-table tr:hover td { background:#FCFAF8; }
  .adm-badge { display:inline-block; padding:4px 10px; border-radius:50px; background:#F0E8E0; color:#5A4A4A; font-size:12px; font-weight:600; }
  .adm-badge-admin { background:#6B1F1F; color:#fff; }
  @media (max-width: 640px) {
    .adm-nav { padding:0 16px; }
    .adm-main { padding:24px 16px; }
    .adm-title { font-size:22px; }
  }
`;

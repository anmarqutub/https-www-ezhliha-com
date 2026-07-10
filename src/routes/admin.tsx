import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getAdminUsers, claimFirstAdmin, getUserLoginEvents, setUserSuspended, getUserDevices, setDeviceStatus, getPendingDevicesSummary, setUserRole, createAdminUser, sendUserPasswordReset } from "@/lib/admin.functions";
import { listCodes, generateCodes, deleteCode, createSallaOrder, listSallaOrders } from "@/lib/codes.functions";

import { supabase } from "@/integrations/supabase/client";
import { ImportProvidersDialog } from "@/components/ImportProvidersDialog";
import { parseDevice, parseBrowser, lookupIp, formatGeo, type GeoInfo } from "@/lib/device-info";
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


type Tab = "stats" | "users" | "codes" | "salla" | "cities" | "categories" | "providers" | "banners" | "texts" | "reviews" | "activity";


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
          <SideBtn label="أكواد الاشتراك" active={tab === "codes"} onClick={() => setTab("codes")} />
          <SideBtn label="طلبات سلة" active={tab === "salla"} onClick={() => setTab("salla")} />

          <div className="adm-side-group">الإعدادات</div>
          <SideBtn label="المدن" active={tab === "cities"} onClick={() => setTab("cities")} />
          <SideBtn label="التصنيفات" active={tab === "categories"} onClick={() => setTab("categories")} />
          <SideBtn label="مقدمو الخدمة" active={tab === "providers"} onClick={() => setTab("providers")} />
          <SideBtn label="البنرات" active={tab === "banners"} onClick={() => setTab("banners")} />
          <SideBtn label="عبارات الموقع" active={tab === "texts"} onClick={() => setTab("texts")} />
          <SideBtn label="التقييمات" active={tab === "reviews"} onClick={() => setTab("reviews")} />
          <SideBtn label="سجل التعديلات" active={tab === "activity"} onClick={() => setTab("activity")} />
        </aside>
        <main className="adm-content">
          {tab === "stats" && <StatsAndUsers showUsers={false} />}
          {tab === "users" && <StatsAndUsers showUsers={true} />}
          {tab === "codes" && <CodesTab />}
          {tab === "salla" && <SallaOrdersTab />}

          {tab === "cities" && <CitiesTab />}
          {tab === "categories" && <CategoriesTab />}
          {tab === "providers" && <ProvidersTab />}
          {tab === "banners" && <BannersTab />}
          {tab === "texts" && <SiteTextsTab />}
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
  const fetchEvents = useServerFn(getUserLoginEvents);
  const toggleSuspend = useServerFn(setUserSuspended);
  const fetchDevices = useServerFn(getUserDevices);
  const updateDevice = useServerFn(setDeviceStatus);
  const fetchPending = useServerFn(getPendingDevicesSummary);
  const toggleRole = useServerFn(setUserRole);
  const createAdmin = useServerFn(createAdminUser);
  const resetPwd = useServerFn(sendUserPasswordReset);

  async function handleSendReset(u: { id: string; email: string | null }) {
    if (!u.email) { alert("هذا المستخدم لا يملك بريداً إلكترونياً."); return; }
    if (!confirm(`إرسال رابط إعادة تعيين كلمة المرور إلى:\n${u.email}؟`)) return;
    try {
      await resetPwd({ data: { userId: u.id, redirectTo: `${window.location.origin}/reset-password` } });
      await logActivity("user.password_reset_sent", "user", u.id, { email: u.email });
      alert(`تم إرسال رابط إعادة التعيين إلى:\n${u.email}`);
    } catch (e) {
      alert((e as Error).message);
    }
  }
  const [showCreate, setShowCreate] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: "", password: "", full_name: "", phone: "", city: "" });
  const [creating, setCreating] = useState(false);

  // Filters
  const [fName, setFName] = useState("");
  const [fStatus, setFStatus] = useState<"all" | "online" | "offline" | "suspended">("all");
  const [fCity, setFCity] = useState<string>("all");
  const [fRole, setFRole] = useState<"all" | "admin" | "user">("all");
  const [fDateField, setFDateField] = useState<"created_at" | "last_sign_in_at" | "last_seen_at">("last_sign_in_at");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  function resetFilters() {
    setFName(""); setFStatus("all"); setFCity("all"); setFRole("all");
    setFDateField("last_sign_in_at"); setFFrom(""); setFTo("");
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createAdmin({ data: newAdmin });
      await logActivity("user.create_admin", "user", newAdmin.email, { email: newAdmin.email });
      setShowCreate(false);
      setNewAdmin({ email: "", password: "", full_name: "", phone: "", city: "" });
      refetch();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCreating(false);
    }
  }
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });
  const { data: pending, refetch: refetchPending } = useQuery({
    queryKey: ["admin-pending-devices"],
    queryFn: () => fetchPending(),
    refetchInterval: 30000,
  });
  const [ipUserId, setIpUserId] = useState<string | null>(null);
  const [ipUserLabel, setIpUserLabel] = useState<string>("");
  const [ipData, setIpData] = useState<Array<{ ip: string | null; user_agent: string | null; first_seen_at: string; last_seen_at: string; hit_count: number }> | null>(null);
  const [ipLoading, setIpLoading] = useState(false);

  const [devUserId, setDevUserId] = useState<string | null>(null);
  const [devUserLabel, setDevUserLabel] = useState<string>("");
  const [devData, setDevData] = useState<Array<{ id: string; device_sid: string; user_agent: string | null; ip: string | null; approved: boolean; created_at: string; approved_at: string | null; last_seen_at: string }> | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  const [geoMap, setGeoMap] = useState<Record<string, GeoInfo | null>>({});
  const loadGeos = useCallback((ips: Array<string | null | undefined>) => {
    const unique = Array.from(new Set(ips.filter(Boolean) as string[]));
    unique.forEach((ip) => {
      if (ip in geoMap) return;
      lookupIp(ip).then((g) => setGeoMap((m) => ({ ...m, [ip]: g })));
    });
  }, [geoMap]);
  useEffect(() => { if (ipData) loadGeos(ipData.map((e) => e.ip)); }, [ipData, loadGeos]);
  useEffect(() => { if (devData) loadGeos(devData.map((d) => d.ip)); }, [devData, loadGeos]);

  async function openIps(userId: string, label: string) {
    setIpUserId(userId);
    setIpUserLabel(label);
    setIpData(null);
    setIpLoading(true);
    try {
      const res = await fetchEvents({ data: { userId } });
      setIpData(res.events);
    } finally {
      setIpLoading(false);
    }
  }

  async function openDevices(userId: string, label: string) {
    setDevUserId(userId);
    setDevUserLabel(label);
    setDevData(null);
    setDevLoading(true);
    try {
      const res = await fetchDevices({ data: { userId } });
      setDevData(res.devices);
    } finally {
      setDevLoading(false);
    }
  }

  async function handleDeviceAction(deviceId: string, action: "approve" | "revoke" | "delete") {
    const labels = { approve: "الموافقة على", revoke: "إلغاء", delete: "حذف" };
    if (!confirm(`هل أنت متأكد من ${labels[action]} هذا الجهاز؟`)) return;
    try {
      await updateDevice({ data: { deviceId, action } });
      await logActivity(`device.${action}`, "device", deviceId);
      if (devUserId) {
        const res = await fetchDevices({ data: { userId: devUserId } });
        setDevData(res.devices);
      }
      refetch();
      refetchPending();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleToggleSuspend(u: { id: string; email: string | null; profile: { suspended_at?: string | null } | null }) {
    const isSusp = !!u.profile?.suspended_at;
    const verb = isSusp ? "إلغاء التعليق عن" : "تعليق";
    if (!confirm(`هل أنت متأكد من ${verb} الحساب: ${u.email ?? u.id}؟`)) return;
    try {
      await toggleSuspend({ data: { userId: u.id, suspended: !isSusp } });
      await logActivity(isSusp ? "user.unsuspend" : "user.suspend", "user", u.id, { email: u.email });
      refetch();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleToggleRole(u: { id: string; email: string | null; roles: string[] }) {
    const isAdmin = u.roles.includes("admin");
    const verb = isAdmin ? "إزالة صلاحية الأدمن عن" : "ترقية إلى أدمن";
    if (!confirm(`هل أنت متأكدة من ${verb}: ${u.email ?? u.id}؟`)) return;
    try {
      await toggleRole({ data: { userId: u.id, makeAdmin: !isAdmin } });
      await logActivity(isAdmin ? "user.demote" : "user.promote", "user", u.id, { email: u.email });
      refetch();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <>
      <h1 className="adm-title">
        المستخدمات
        {pending && pending.total > 0 && (
          <span style={{
            marginInlineStart: 12, fontSize: 14, fontWeight: 700,
            background: "#fef3c7", color: "#92400e",
            padding: "4px 10px", borderRadius: 999,
          }}>
            ⚠️ {pending.total} جهاز بانتظار الموافقة
          </span>
        )}
      </h1>
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          style={{ background: "#660000", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer" }}
        >
          + إضافة أدمن جديد
        </button>
      </div>
      <div className="adm-card">
        {isLoading && <p className="adm-empty">جارٍ التحميل...</p>}
        {error && <p className="adm-error">خطأ: {(error as Error).message}</p>}
        {data && data.users.length === 0 && <p className="adm-empty">لا توجد مستخدمات بعد.</p>}
        {data && data.users.length > 0 && (() => {
          const allCities = Array.from(
            new Set(
              data.users
                .map((u) => (u.profile?.city ?? "").trim())
                .filter((c) => c.length > 0),
            ),
          ).sort();
          const fromTs = fFrom ? new Date(fFrom).getTime() : null;
          const toTs = fTo ? new Date(fTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
          const nameQ = fName.trim().toLowerCase();
          const filtered = data.users.filter((u) => {
            const prof = u.profile as { last_seen_at?: string | null; suspended_at?: string | null; city?: string | null; full_name?: string | null } | null;
            const lastSeen = prof?.last_seen_at ?? null;
            const suspended = !!prof?.suspended_at;
            const online = !suspended && lastSeen ? (Date.now() - new Date(lastSeen).getTime()) < 2 * 60 * 1000 : false;
            const isAdminRow = u.roles.includes("admin");
            if (fStatus === "online" && !online) return false;
            if (fStatus === "offline" && (online || suspended)) return false;
            if (fStatus === "suspended" && !suspended) return false;
            if (fRole === "admin" && !isAdminRow) return false;
            if (fRole === "user" && isAdminRow) return false;
            if (fCity !== "all" && (prof?.city ?? "") !== fCity) return false;
            if (nameQ) {
              const hay = `${prof?.full_name ?? ""} ${u.email ?? ""} ${prof?.city ?? ""}`.toLowerCase();
              if (!hay.includes(nameQ)) return false;
            }
            if (fromTs || toTs) {
              const raw = fDateField === "created_at" ? u.created_at
                : fDateField === "last_sign_in_at" ? u.last_sign_in_at
                : lastSeen;
              if (!raw) return false;
              const t = new Date(raw).getTime();
              if (fromTs && t < fromTs) return false;
              if (toTs && t > toTs) return false;
            }
            return true;
          });
          return (
            <>
              <div style={filterBarStyle}>
                <input
                  type="search"
                  placeholder="بحث بالاسم أو الإيميل..."
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  style={filterInputStyle}
                />
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)} style={filterInputStyle}>
                  <option value="all">كل الحالات</option>
                  <option value="online">متصل الآن</option>
                  <option value="offline">غير متصل</option>
                  <option value="suspended">معلّق</option>
                </select>
                <select value={fCity} onChange={(e) => setFCity(e.target.value)} style={filterInputStyle}>
                  <option value="all">كل المدن</option>
                  {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={fRole} onChange={(e) => setFRole(e.target.value as typeof fRole)} style={filterInputStyle}>
                  <option value="all">كل الأدوار</option>
                  <option value="admin">أدمن</option>
                  <option value="user">مستخدمة</option>
                </select>
                <select value={fDateField} onChange={(e) => setFDateField(e.target.value as typeof fDateField)} style={filterInputStyle} title="الحقل المستخدم للفلترة بالتاريخ">
                  <option value="last_sign_in_at">آخر دخول</option>
                  <option value="created_at">تاريخ التسجيل</option>
                  <option value="last_seen_at">آخر ظهور</option>
                </select>
                <label style={{ fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 4 }}>
                  من
                  <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} style={filterInputStyle} />
                </label>
                <label style={{ fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 4 }}>
                  إلى
                  <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} style={filterInputStyle} />
                </label>
                <button type="button" onClick={resetFilters} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  إعادة تعيين
                </button>
                <span style={{ fontSize: 12, color: "#666", marginInlineStart: "auto", fontWeight: 600 }}>
                  {filtered.length} من {data.users.length}
                </span>
              </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>الحالة</th><th>الاسم</th><th>الإيميل</th><th>الجوال</th><th>المدينة</th>
                  <th>الدور</th><th>الأجهزة</th><th>IPs</th><th>التسجيل</th><th>آخر دخول</th><th>آخر ظهور</th><th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const prof = u.profile as { last_seen_at?: string | null; suspended_at?: string | null } | null;
                  const lastSeen = prof?.last_seen_at ?? null;
                  const suspended = !!prof?.suspended_at;
                  const online = !suspended && lastSeen ? (Date.now() - new Date(lastSeen).getTime()) < 2 * 60 * 1000 : false;
                  const ipCount = (u as { ip_count?: number }).ip_count ?? 0;
                  const isAdmin = u.roles.includes("admin");
                  return (
                  <tr key={u.id} style={suspended ? { background: "#fef2f2" } : undefined}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: suspended ? "#dc2626" : (online ? "#16a34a" : "#9ca3af"),
                          display: "inline-block",
                          boxShadow: online ? "0 0 0 3px rgba(22,163,74,0.18)" : "none",
                        }} />
                        <span style={{ fontSize: 12, color: suspended ? "#dc2626" : (online ? "#16a34a" : "#777") }}>
                          {suspended ? "معلّق" : (online ? "متصل" : "غير متصل")}
                        </span>
                      </span>
                    </td>
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
                    <td>
                      {!isAdmin && (() => {
                        const pendCount = (pending?.byUser as Record<string, number> | undefined)?.[u.id] ?? 0;
                        return (
                          <button
                            type="button"
                            onClick={() => openDevices(u.id, u.email ?? u.profile?.full_name ?? u.id)}
                            style={{
                              background: pendCount > 0 ? "#fef3c7" : "#f3f4f6",
                              color: pendCount > 0 ? "#92400e" : "#374151",
                              border: "1px solid " + (pendCount > 0 ? "#fbbf24" : "#e5e7eb"),
                              borderRadius: 6, padding: "2px 8px", cursor: "pointer",
                              fontWeight: 600, fontSize: 12,
                            }}
                            title="عرض/إدارة أجهزة هذا الحساب"
                          >
                            🖥️ {pendCount > 0 ? `${pendCount} بانتظار` : "عرض"}
                          </button>
                        );
                      })()}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => openIps(u.id, u.email ?? u.profile?.full_name ?? u.id)}
                        style={{
                          background: ipCount > 2 ? "#fee2e2" : "#f3f4f6",
                          color: ipCount > 2 ? "#b91c1c" : "#374151",
                          border: "1px solid #e5e7eb",
                          borderRadius: 6, padding: "2px 8px", cursor: "pointer",
                          fontWeight: 600, fontSize: 12,
                        }}
                        title="عرض عناوين IP لهذا الحساب"
                      >
                        {ipCount} {ipCount > 2 ? "⚠️" : ""}
                      </button>
                    </td>
                    <td>{fmt(u.created_at)}</td>
                    <td>{u.last_sign_in_at ? fmt(u.last_sign_in_at) : "—"}</td>
                    <td>{lastSeen ? fmt(lastSeen) : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleRole(u)}
                          style={{
                            background: isAdmin ? "#fff" : "#660000",
                            color: isAdmin ? "#660000" : "#fff",
                            border: "1px solid #660000",
                            borderRadius: 6,
                            padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700,
                          }}
                          title={isAdmin ? "إزالة صلاحية الأدمن" : "ترقية إلى أدمن"}
                        >
                          {isAdmin ? "إزالة الأدمن" : "ترقية لأدمن"}
                        </button>
                        {!isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleToggleSuspend(u)}
                            style={{
                              background: suspended ? "#16a34a" : "#dc2626",
                              color: "#fff", border: "none", borderRadius: 6,
                              padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                            }}
                          >
                            {suspended ? "إلغاء التعليق" : "تعليق"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSendReset(u)}
                          title="إرسال رابط إعادة تعيين كلمة المرور للمستخدم"
                          style={{
                            background: "#fff", color: "#660000", border: "1px solid #660000",
                            borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700,
                          }}
                        >
                          🔑 إعادة تعيين كلمة المرور
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
            </>
          );
        })()}
      </div>

      {showCreate && (
        <div
          onClick={() => !creating && setShowCreate(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateAdmin}
            style={{ background: "#fff", borderRadius: 12, padding: 24, width: "92%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>إضافة أدمن جديد</h3>
              <button type="button" onClick={() => !creating && setShowCreate(false)} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: "#666", margin: 0 }}>يُنشأ الحساب مباشرة بصلاحية أدمن بدون الحاجة لكود اشتراك.</p>
            <label style={{ fontSize: 13, fontWeight: 600 }}>الاسم الكامل
              <input required value={newAdmin.full_name} onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>الإيميل
              <input required type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>كلمة المرور (٦ أحرف على الأقل)
              <input required type="text" minLength={6} value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>الجوال (اختياري)
              <input value={newAdmin.phone} onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>المدينة (اختياري)
              <input value={newAdmin.city} onChange={(e) => setNewAdmin({ ...newAdmin, city: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd", marginTop: 4 }} />
            </label>
            <button type="submit" disabled={creating} style={{ background: "#660000", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: creating ? "wait" : "pointer", marginTop: 4 }}>
              {creating ? "جارٍ الإنشاء..." : "إنشاء الأدمن"}
            </button>
          </form>
        </div>
      )}

      {ipUserId && (
        <div
          onClick={() => setIpUserId(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 12, padding: 20, maxWidth: 980,
              width: "92%", maxHeight: "80vh", overflow: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>عناوين IP — {ipUserLabel}</h3>
              <button onClick={() => setIpUserId(null)} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            {ipLoading && <p>جارٍ التحميل...</p>}
            {ipData && ipData.length === 0 && <p style={{ color: "#777" }}>لا توجد بيانات بعد.</p>}
            {ipData && ipData.length > 0 && (
              <table className="adm-table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr><th>IP</th><th>الموقع</th><th>الجهاز</th><th>المتصفح</th><th>عدد الزيارات</th><th>أول ظهور</th><th>آخر ظهور</th></tr>
                </thead>
                <tbody>
                  {ipData.map((e, i) => {
                    const g = e.ip ? geoMap[e.ip] : null;
                    return (
                      <tr key={i}>
                        <td style={{ fontFamily: "monospace" }}>{e.ip ?? "—"}</td>
                        <td style={{ fontSize: 12 }} title={g?.isp ?? ""}>
                          {e.ip ? (e.ip in geoMap ? formatGeo(g) : "…") : "—"}
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{parseDevice(e.user_agent)}</td>
                        <td style={{ fontSize: 12, color: "#555" }} title={e.user_agent ?? ""}>{parseBrowser(e.user_agent)}</td>
                        <td>{e.hit_count}</td>
                        <td>{fmt(e.first_seen_at)}</td>
                        <td>{fmt(e.last_seen_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {ipData && ipData.length > 2 && (
              <p style={{ marginTop: 12, padding: 10, background: "#fef3c7", borderRadius: 6, color: "#92400e", fontSize: 13 }}>
                ⚠️ هذا الحساب استُخدم من {ipData.length} عناوين مختلفة — قد يكون مشاركاً بين أشخاص.
              </p>
            )}
          </div>
        </div>
      )}

      {devUserId && (
        <div
          onClick={() => setDevUserId(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 12, padding: 20, maxWidth: 1080,
              width: "94%", maxHeight: "85vh", overflow: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>الأجهزة — {devUserLabel}</h3>
              <button onClick={() => setDevUserId(null)} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: "#666", marginTop: 0, marginBottom: 12 }}>
              يُسمح تلقائياً بأول جهازين. الجهاز الثالث وما بعده يحتاج موافقتك.
            </p>
            {devLoading && <p>جارٍ التحميل...</p>}
            {devData && devData.length === 0 && <p style={{ color: "#777" }}>لا توجد أجهزة بعد.</p>}
            {devData && devData.length > 0 && (
              <table className="adm-table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>الحالة</th><th>الجهاز</th><th>المتصفح</th><th>IP</th><th>الموقع</th>
                    <th>أول دخول</th><th>آخر نشاط</th><th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {devData.map((d) => {
                    const g = d.ip ? geoMap[d.ip] : null;
                    return (
                      <tr key={d.id} style={!d.approved ? { background: "#fffbeb" } : undefined}>
                        <td>
                          <span style={{
                            display: "inline-block", padding: "2px 8px", borderRadius: 999,
                            fontSize: 11, fontWeight: 700,
                            background: d.approved ? "#dcfce7" : "#fef3c7",
                            color: d.approved ? "#166534" : "#92400e",
                          }}>
                            {d.approved ? "موافَق عليه" : "بانتظار الموافقة"}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 600 }} title={d.user_agent ?? ""}>
                          {parseDevice(d.user_agent)}
                        </td>
                        <td style={{ fontSize: 12, color: "#555" }}>{parseBrowser(d.user_agent)}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{d.ip ?? "—"}</td>
                        <td style={{ fontSize: 12 }} title={g?.isp ?? ""}>
                          {d.ip ? (d.ip in geoMap ? formatGeo(g) : "…") : "—"}
                        </td>
                        <td>{fmt(d.created_at)}</td>
                        <td>{fmt(d.last_seen_at)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {!d.approved && (
                          <button
                            type="button"
                            onClick={() => handleDeviceAction(d.id, "approve")}
                            style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginInlineEnd: 6 }}
                          >موافقة</button>
                        )}
                        {d.approved && (
                          <button
                            type="button"
                            onClick={() => handleDeviceAction(d.id, "revoke")}
                            style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginInlineEnd: 6 }}
                          >إلغاء الموافقة</button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeviceAction(d.id, "delete")}
                          style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                        >حذف</button>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
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
  devicesTotal: number;
  devicesPending: number;
  suspendedUsers: number;
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
      reviewsRes, favRes, devicesRes, logsRes,
    ] = await Promise.all([
      supabase.from("providers").select("id,name,city_id,subcategory_id,active,is_featured,created_at"),
      supabase.from("cities").select("id,name_ar,active"),
      supabase.from("categories").select("id,name_ar,active"),
      supabase.from("subcategories").select("id,category_id"),
      supabase.from("banners").select("id,active"),
      supabase.from("reviews").select("id,provider_id,rating,created_at"),
      supabase.from("favorites").select("id", { count: "exact", head: true }),
      supabase.from("user_devices").select("id,approved"),
      supabase.from("admin_activity_log").select("id,admin_email,action,entity,created_at,details").order("created_at", { ascending: false }).limit(10),
    ]);

    const providers = provsRes.data ?? [];
    const cities = citiesRes.data ?? [];
    const cats = catsRes.data ?? [];
    const subs = subsRes.data ?? [];
    const banners = bannersRes.data ?? [];
      const reviews = reviewsRes.data ?? [];
      const devices = devicesRes.data ?? [];
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
      devicesTotal: devices.length,
      devicesPending: devices.filter((dev: { approved: boolean }) => !dev.approved).length,
      suspendedUsers: users.filter((u) => u.profile?.suspended_at).length,
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
        <StatCard label="الأجهزة المسجلة" value={d.devicesTotal} hint={`${d.devicesPending} بانتظار الموافقة`} color="#5A4A4A" />
        <StatCard label="المستخدمات المعلّقة" value={d.suspendedUsers} color={d.suspendedUsers > 0 ? "#C47A7A" : "#2E7D32"} />
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
type MediaItem = { url: string; thumbnail_url?: string | null };
type ProvRow = {
  id: string; subcategory_id: string; city_id: string; name: string;
  description: string | null; price_from: number | null; price_to: number | null;
  price: string | null; people_from: number | null; people_to: number | null;
  whatsapp: string | null; contact_phone: string | null; instagram: string | null;
  tiktok: string | null; twitter: string | null; snapchat: string | null;
  address: string | null; map_url: string | null;
  rating: number | null; is_featured: boolean; featured_until: string | null;
  sort_order: number; active: boolean;
  logo_url: string | null; video_url: string | null; video_thumbnail_url: string | null;
  show_packages: boolean; show_services: boolean; show_branches: boolean;
  videos: MediaItem[];
};
type ImgRow = { id: string; provider_id: string; image_url: string; sort_order: number };
type PackageRow = { id: string; provider_id: string; name: string; description: string | null; price: string | null; image_url: string | null; sort_order: number; images: MediaItem[]; videos: MediaItem[] };
type ServiceRow = { id: string; provider_id: string; name: string; description: string | null; price: string | null; image_url: string | null; sort_order: number; images: MediaItem[]; videos: MediaItem[] };

type BranchRow = { id: string; provider_id: string; city_id: string | null; name: string; address: string | null; map_url: string | null; phone: string | null; sort_order: number };

function normalizeSaudiPhoneInput(v: string | null | undefined): string | null {
  let s = String(v ?? "")
    .trim()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\D/g, "");
  if (!s) return null;
  if (s.startsWith("00966")) s = s.slice(2);
  if (s.length === 13 && s.startsWith("9660")) s = "966" + s.slice(4);
  if (s.length === 10 && s.startsWith("05")) s = "966" + s.slice(1);
  if (s.length === 9 && s.startsWith("5")) s = "966" + s;
  return s;
}

function toMediaArray(v: unknown): MediaItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x): MediaItem | null => {
      if (typeof x === "string") return { url: x };
      if (x && typeof x === "object" && typeof (x as { url?: unknown }).url === "string") {
        const it = x as { url: string; thumbnail_url?: unknown };
        return { url: it.url, thumbnail_url: typeof it.thumbnail_url === "string" ? it.thumbnail_url : null };
      }
      return null;
    })
    .filter((x): x is MediaItem => !!x)
    .slice(0, 5);
}

function MediaListEditor({
  kind, items, onChange, upload, max = 5,
}: {
  kind: "video" | "image";
  items: MediaItem[];
  onChange: (next: MediaItem[]) => void;
  upload: (file: File) => Promise<string | null>;
  max?: number;
}) {
  const [urlDraft, setUrlDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const addUrl = () => {
    const u = urlDraft.trim();
    if (!u) return;
    if (items.length >= max) { alert(`الحد الأقصى ${max}`); return; }
    onChange([...items, { url: u }]);
    setUrlDraft("");
  };
  const addFile = async (f: File) => {
    if (items.length >= max) { alert(`الحد الأقصى ${max}`); return; }
    setBusy(true);
    const url = await upload(f);
    setBusy(false);
    if (url) onChange([...items, { url }]);
  };
  const removeAt = (i: number) => onChange(items.filter((_, k) => k !== i));
  const setThumbAt = (i: number, url: string) =>
    onChange(items.map((it, k) => (k === i ? { ...it, thumbnail_url: url || null } : it)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          dir="ltr"
          placeholder={kind === "video" ? "رابط الفيديو (يوتيوب / تيك توك / إنستقرام / mp4)" : "رابط الصورة https://..."}
          style={{ flex: 1, minWidth: 220 }}
        />
        <button type="button" className="adm-btn-sm" onClick={addUrl} disabled={items.length >= max}>+ إضافة رابط</button>
        <label className="adm-btn-sm" style={{ cursor: "pointer", opacity: busy || items.length >= max ? 0.6 : 1 }}>
          {busy ? "جارٍ الرفع..." : (kind === "video" ? "رفع فيديو" : "رفع صورة")}
          <input
            type="file"
            accept={kind === "video" ? "video/*" : "image/*"}
            style={{ display: "none" }}
            disabled={busy || items.length >= max}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) addFile(f); e.target.value = ""; }}
          />
        </label>
        <span style={{ fontSize: 12, color: "#5A4A4A", alignSelf: "center" }}>{items.length}/{max}</span>
      </div>
      {items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
          {items.map((it, i) => (
            <div key={i} style={{ border: "1px solid #E8DADA", borderRadius: 10, padding: 8, background: "#fff", display: "flex", flexDirection: "column", gap: 6 }}>
              {kind === "image" ? (
                <img src={it.url} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 6 }} />
              ) : (
                <div style={{ width: "100%", height: 100, borderRadius: 6, background: it.thumbnail_url ? `url(${it.thumbnail_url}) center/cover` : "#F2E6E6", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B1F1F", fontSize: 12, fontWeight: 700 }}>
                  {it.thumbnail_url ? "▶" : "فيديو"}
                </div>
              )}
              <a href={it.url} target="_blank" rel="noopener noreferrer" dir="ltr" style={{ fontSize: 11, color: "#660000", textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.url}</a>
              {kind === "video" && (
                <input
                  value={it.thumbnail_url ?? ""}
                  onChange={(e) => setThumbAt(i, e.target.value)}
                  placeholder="رابط صورة غلاف (اختياري)"
                  dir="ltr"
                  style={{ fontSize: 12 }}
                />
              )}
              <button type="button" className="adm-btn-sm adm-btn-danger" onClick={() => removeAt(i)}>حذف</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProvidersTab() {

  const [rows, setRows] = useState<ProvRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [cats, setCats] = useState<CatRow[]>([]);
  const [images, setImages] = useState<ImgRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ProvRow> | null>(null);
  const [editingPackage, setEditingPackage] = useState<Partial<PackageRow> | null>(null);
  const [editingService, setEditingService] = useState<Partial<ServiceRow> | null>(null);
  const [editingBranch, setEditingBranch] = useState<Partial<BranchRow> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [showImport, setShowImport] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const [p, ci, s, c, i, pkg, srv, br] = await Promise.all([
      supabase.from("providers").select("*").order("is_featured", { ascending: false }).order("sort_order"),
      supabase.from("cities").select("*").order("sort_order"),
      supabase.from("subcategories").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("provider_images").select("*").order("sort_order"),
      supabase.from("packages").select("*").order("sort_order"),
      supabase.from("services").select("*").order("sort_order"),
      supabase.from("branches").select("*").order("sort_order"),
    ]);
    setRows((p.data ?? []) as unknown as ProvRow[]);
    setCities((ci.data ?? []) as CityRow[]);
    setSubs((s.data ?? []) as SubRow[]);
    setCats((c.data ?? []) as CatRow[]);
    setImages((i.data ?? []) as ImgRow[]);
    setPackages((pkg.data ?? []) as unknown as PackageRow[]);
    setServices((srv.data ?? []) as unknown as ServiceRow[]);

    setBranches((br.data ?? []) as BranchRow[]);
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
      price: editing.price ?? null,
      people_from: editing.people_from ? +editing.people_from : null,
      people_to: editing.people_to ? +editing.people_to : null,
      whatsapp: normalizeSaudiPhoneInput(editing.whatsapp),
      contact_phone: normalizeSaudiPhoneInput(editing.contact_phone),
      instagram: editing.instagram ?? null,
      tiktok: editing.tiktok ?? null, twitter: editing.twitter ?? null, snapchat: editing.snapchat ?? null,
      address: editing.address ?? null, map_url: editing.map_url ?? null, rating: editing.rating ?? null,
      is_featured: editing.is_featured ?? false,
      featured_until: editing.featured_until || null,
      sort_order: editing.sort_order ?? 0, active: editing.active ?? true,
      logo_url: editing.logo_url ?? null,
      video_url: editing.video_url ?? null,
      video_thumbnail_url: editing.video_thumbnail_url ?? null,
      show_packages: editing.show_packages ?? true,
      show_services: editing.show_services ?? true,
      show_branches: editing.show_branches ?? true,
      videos: toMediaArray(editing.videos) as unknown as never,

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

  const uploadProviderAsset = async (file: File, field: "logo_url" | "video_thumbnail_url") => {
    if (!editing?.id) { alert("احفظ مقدم الخدمة أولاً قبل رفع الملف"); return; }
    const ext = file.name.split(".").pop();
    const path = `${editing.id}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("provider-images").upload(path, file);
    if (error) { alert("خطأ رفع: " + error.message); return; }
    const { data: pub } = supabase.storage.from("provider-images").getPublicUrl(path);
    await supabase.from("providers").update({ [field]: pub.publicUrl } as never).eq("id", editing.id);
    setEditing({ ...editing, [field]: pub.publicUrl });
    logActivity("upload_image", "provider", editing.id, { field, name: editing.name });
    reload();
  };

  const uploadOfferImage = async (file: File, kind: "package" | "service") => {
    if (!editing?.id) { alert("احفظ مقدم الخدمة أولاً قبل رفع الصورة"); return null; }
    const ext = file.name.split(".").pop();
    const path = `${editing.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("provider-images").upload(path, file);
    if (error) { alert("خطأ رفع: " + error.message); return null; }
    const { data: pub } = supabase.storage.from("provider-images").getPublicUrl(path);
    return pub.publicUrl;
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
  const editingPackages = editing?.id ? packages.filter((p) => p.provider_id === editing.id) : [];
  const editingServices = editing?.id ? services.filter((x) => x.provider_id === editing.id) : [];
  const editingBranches = editing?.id ? branches.filter((x) => x.provider_id === editing.id) : [];
  const editSubs = editing?.subcategory_id ? subs : subs;

  const savePackage = async () => {
    if (!editing?.id || !editingPackage?.name?.trim()) { alert("اكتب اسم الباقة"); return; }
    const payload = {
      provider_id: editing.id,
      name: editingPackage.name.trim(),
      description: editingPackage.description?.trim() || null,
      price: editingPackage.price?.trim() || null,
      image_url: editingPackage.image_url?.trim() || null,
      sort_order: editingPackage.sort_order ?? 0,
      images: toMediaArray(editingPackage.images) as unknown as never,
      videos: toMediaArray(editingPackage.videos) as unknown as never,

    };
    if (editingPackage.id) {
      await supabase.from("packages").update(payload).eq("id", editingPackage.id);
      logActivity("update", "package", editingPackage.id, { name: payload.name });
    } else {
      const { data } = await supabase.from("packages").insert(payload).select().single();
      logActivity("create", "package", data?.id ?? null, { name: payload.name, provider: editing.name });
    }
    setEditingPackage(null);
    reload();
  };

  const deletePackage = async (pkg: PackageRow) => {
    if (!confirm("حذف هذه الباقة؟")) return;
    await supabase.from("packages").delete().eq("id", pkg.id);
    logActivity("delete", "package", pkg.id, { name: pkg.name });
    reload();
  };

  const saveService = async () => {
    if (!editing?.id || !editingService?.name?.trim()) { alert("اكتب اسم الخدمة"); return; }
    const payload = {
      provider_id: editing.id,
      name: editingService.name.trim(),
      description: editingService.description?.trim() || null,
      price: editingService.price?.trim() || null,
      image_url: editingService.image_url?.trim() || null,
      sort_order: editingService.sort_order ?? 0,
      images: toMediaArray(editingService.images) as unknown as never,
      videos: toMediaArray(editingService.videos) as unknown as never,

    };
    if (editingService.id) {
      await supabase.from("services").update(payload).eq("id", editingService.id);
      logActivity("update", "service", editingService.id, { name: payload.name });
    } else {
      const { data } = await supabase.from("services").insert(payload).select().single();
      logActivity("create", "service", data?.id ?? null, { name: payload.name, provider: editing.name });
    }
    setEditingService(null);
    reload();
  };
  const deleteService = async (row: ServiceRow) => {
    if (!confirm("حذف هذه الخدمة؟")) return;
    await supabase.from("services").delete().eq("id", row.id);
    logActivity("delete", "service", row.id, { name: row.name });
    reload();
  };

  const saveBranch = async () => {
    if (!editing?.id || !editingBranch?.name?.trim()) { alert("اكتب اسم الفرع"); return; }
    const payload = {
      provider_id: editing.id,
      name: editingBranch.name.trim(),
      city_id: editingBranch.city_id || null,
      address: editingBranch.address?.trim() || null,
      map_url: editingBranch.map_url?.trim() || null,
      phone: editingBranch.phone?.trim() || null,
      sort_order: editingBranch.sort_order ?? 0,
    };
    if (editingBranch.id) {
      await supabase.from("branches").update(payload).eq("id", editingBranch.id);
      logActivity("update", "branch", editingBranch.id, { name: payload.name });
    } else {
      const { data } = await supabase.from("branches").insert(payload).select().single();
      logActivity("create", "branch", data?.id ?? null, { name: payload.name, provider: editing.name });
    }
    setEditingBranch(null);
    reload();
  };
  const deleteBranch = async (row: BranchRow) => {
    if (!confirm("حذف هذا الفرع؟")) return;
    await supabase.from("branches").delete().eq("id", row.id);
    logActivity("delete", "branch", row.id, { name: row.name });
    reload();
  };

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
            onClick={() => setShowImport(true)}
          >
            📥 رفع من Excel
          </button>
          <button
            className="adm-btn-primary"
            onClick={() => exportProvidersCsv(filtered, cities, subs, cats, images)}
            disabled={filtered.length === 0}
          >
            📊 تصدير Excel ({filtered.length})
          </button>
        </div>
        {showImport && (
          <ImportProvidersDialog
            cities={cities}
            cats={cats}
            subs={subs}
            onClose={() => setShowImport(false)}
            onDone={reload}
          />
        )}
        {loading ? <p className="adm-empty">جارٍ التحميل...</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr>
                <th>الاسم</th><th>المدينة</th><th>التصنيف</th><th>السعر</th>
                <th>واتساب</th><th>اتصال</th><th>الباقات</th><th>مميز</th><th>الترتيب</th><th>الحالة</th><th></th>
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
                      <td style={{ direction: "ltr", fontSize: 12 }}>{r.contact_phone ?? "—"}</td>
                      <td>{packages.filter((p) => p.provider_id === r.id).length}</td>
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
              <input value={editing.whatsapp ?? ""} onChange={(e) => setEditing({ ...editing, whatsapp: e.target.value })} placeholder="05xxxxxxxx أو 9665xxxxxxxx" dir="ltr" />
            </Field>
            <Field label="رقم الاتصال (اختياري — إذا يختلف عن الواتساب)">
              <input value={editing.contact_phone ?? ""} onChange={(e) => setEditing({ ...editing, contact_phone: e.target.value })} placeholder="05xxxxxxxx أو 9665xxxxxxxx" dir="ltr" />
            </Field>
            <Field label="السعر من (ر.س)"><input type="number" value={editing.price_from ?? ""} onChange={(e) => setEditing({ ...editing, price_from: e.target.value ? +e.target.value : null })} /></Field>
            <Field label="السعر إلى (ر.س)"><input type="number" value={editing.price_to ?? ""} onChange={(e) => setEditing({ ...editing, price_to: e.target.value ? +e.target.value : null })} /></Field>
            <Field label="نص السعر / تفاصيل الباقة العامة"><input value={editing.price ?? ""} onChange={(e) => setEditing({ ...editing, price: e.target.value })} placeholder="مثال: تبدأ الباقات من ٢١٠٠ ريال / حسب الحجم" /></Field>
            <Field label="تكفي من"><input type="number" value={editing.people_from ?? ""} onChange={(e) => setEditing({ ...editing, people_from: e.target.value ? +e.target.value : null })} /></Field>
            <Field label="تكفي إلى"><input type="number" value={editing.people_to ?? ""} onChange={(e) => setEditing({ ...editing, people_to: e.target.value ? +e.target.value : null })} /></Field>
            <Field label="إنستغرام (اسم المستخدم)"><input value={editing.instagram ?? ""} onChange={(e) => setEditing({ ...editing, instagram: e.target.value })} dir="ltr" placeholder="username" /></Field>
            <Field label="تيك توك (اسم المستخدم)"><input value={editing.tiktok ?? ""} onChange={(e) => setEditing({ ...editing, tiktok: e.target.value })} dir="ltr" placeholder="username" /></Field>
            <Field label="اكس / تويتر (اسم المستخدم)"><input value={editing.twitter ?? ""} onChange={(e) => setEditing({ ...editing, twitter: e.target.value })} dir="ltr" placeholder="username" /></Field>
            <Field label="سناب شات (اسم المستخدم)"><input value={editing.snapchat ?? ""} onChange={(e) => setEditing({ ...editing, snapchat: e.target.value })} dir="ltr" placeholder="username" /></Field>
            <Field label="العنوان"><input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
            <Field label="رابط الخريطة"><input value={editing.map_url ?? ""} onChange={(e) => setEditing({ ...editing, map_url: e.target.value })} dir="ltr" placeholder="https://maps..." /></Field>
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
            <Field label="إظهار قسم الباقات"><input type="checkbox" checked={editing.show_packages ?? true} onChange={(e) => setEditing({ ...editing, show_packages: e.target.checked })} /></Field>
            <Field label="إظهار قسم الخدمات"><input type="checkbox" checked={editing.show_services ?? true} onChange={(e) => setEditing({ ...editing, show_services: e.target.checked })} /></Field>
            <Field label="إظهار قسم الفروع"><input type="checkbox" checked={editing.show_branches ?? true} onChange={(e) => setEditing({ ...editing, show_branches: e.target.checked })} /></Field>
          </div>

          {editing.id && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #E8DADA" }}>
              <h4 style={{ marginBottom: 12, fontWeight: 700 }}>الصور</h4>
              <Field label="لوقو مقدم الخدمة (اختياري)">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {editing.logo_url && <img src={editing.logo_url} alt="" style={{ width: 74, height: 74, objectFit: "cover", borderRadius: 12, border: "1px solid #E8DADA" }} />}
                  <input value={editing.logo_url ?? ""} onChange={(e) => setEditing({ ...editing, logo_url: e.target.value || null })} dir="ltr" placeholder="https://..." />
                  <FileInput accept="image/*" onChange={(e) => e.target.files?.[0] && uploadProviderAsset(e.target.files[0], "logo_url")} label="رفع لوقو" />
                </div>
              </Field>
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
              <Field label="صورة واجهة الفيديو (اختياري)">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {editing.video_thumbnail_url && <img src={editing.video_thumbnail_url} alt="" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8 }} />}
                  <input value={editing.video_thumbnail_url ?? ""} onChange={(e) => setEditing({ ...editing, video_thumbnail_url: e.target.value || null })} dir="ltr" placeholder="https://..." />
                  <FileInput accept="image/*" onChange={(e) => e.target.files?.[0] && uploadProviderAsset(e.target.files[0], "video_thumbnail_url")} label="رفع صورة واجهة الفيديو" />
                </div>
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
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed #E8DADA" }}>
                <h5 style={{ fontWeight: 700, marginBottom: 8 }}>فيديوهات إضافية (حتى 5)</h5>
                <MediaListEditor
                  kind="video"
                  items={toMediaArray(editing.videos)}
                  onChange={(next) => setEditing({ ...editing, videos: next })}
                  upload={async (f) => await uploadOfferImage(f, "package")}
                />
              </div>
            </div>
          )}

          {editing.id && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #E8DADA" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <h4 style={{ fontWeight: 700 }}>تفصيل الباقات</h4>
                <button type="button" className="adm-btn-sm" onClick={() => setEditingPackage({ sort_order: editingPackages.length })}>+ إضافة باقة</button>
              </div>
              {editingPackages.length === 0 ? <p className="adm-empty" style={{ padding: 12 }}>ما أضيفت باقات لهذا المزود.</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {editingPackages.map((pkg) => (
                    <div key={pkg.id} style={{ border: "1px solid #F0E5E5", borderRadius: 10, padding: 12, display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                      <div>
                        <strong>{pkg.name}</strong>
                        {pkg.price && <span style={{ color: "#6B1F1F", fontWeight: 700, marginInlineStart: 8 }}>{pkg.price}</span>}
                        {pkg.description && <div style={{ fontSize: 12, color: "#5A4A4A", marginTop: 4 }}>{pkg.description}</div>}
                      </div>
                      <div>
                        <button type="button" className="adm-btn-sm" onClick={() => setEditingPackage(pkg)}>تعديل</button>
                        <button type="button" className="adm-btn-sm adm-btn-danger" onClick={() => deletePackage(pkg)}>حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {editingPackage && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#FAF6F2", border: "1px solid #E8DADA" }}>
              <h4 style={{ marginBottom: 10, fontWeight: 800 }}>{editingPackage.id ? "تعديل باقة" : "إضافة باقة"}</h4>
              <div className="adm-grid2">
                <Field label="اسم الباقة"><input value={editingPackage.name ?? ""} onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })} /></Field>
                <Field label="السعر"><input value={editingPackage.price ?? ""} onChange={(e) => setEditingPackage({ ...editingPackage, price: e.target.value })} placeholder="مثال: 2100 ر.س" /></Field>
                <Field label="صورة الباقة">
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {editingPackage.image_url && <img src={editingPackage.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />}
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const url = await uploadOfferImage(f, "package");
                      if (url) setEditingPackage({ ...editingPackage, image_url: url });
                      e.target.value = "";
                    }} />
                    {editingPackage.image_url && <button type="button" className="adm-btn-sm adm-btn-danger" onClick={() => setEditingPackage({ ...editingPackage, image_url: null })}>حذف</button>}
                  </div>
                </Field>
                <Field label="الترتيب"><input type="number" value={editingPackage.sort_order ?? 0} onChange={(e) => setEditingPackage({ ...editingPackage, sort_order: +e.target.value })} /></Field>
              </div>
              <Field label="تفاصيل الباقة"><textarea rows={3} value={editingPackage.description ?? ""} onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })} /></Field>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #E8DADA" }}>
                <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>صور إضافية (حتى 5)</label>
                <MediaListEditor
                  kind="image"
                  items={toMediaArray(editingPackage.images)}
                  onChange={(next) => setEditingPackage({ ...editingPackage, images: next })}
                  upload={async (f) => await uploadOfferImage(f, "package")}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>فيديوهات الباقة (حتى 5)</label>
                <MediaListEditor
                  kind="video"
                  items={toMediaArray(editingPackage.videos)}
                  onChange={(next) => setEditingPackage({ ...editingPackage, videos: next })}
                  upload={async (f) => await uploadOfferImage(f, "package")}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="adm-btn-secondary" onClick={() => setEditingPackage(null)}>إلغاء</button>
                <button type="button" className="adm-btn-primary" onClick={savePackage}>حفظ الباقة</button>
              </div>
            </div>
          )}

          {editing.id && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #E8DADA" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <h4 style={{ fontWeight: 700 }}>الخدمات</h4>
                <button type="button" className="adm-btn-sm" onClick={() => setEditingService({ sort_order: editingServices.length })}>+ إضافة خدمة</button>
              </div>
              {editingServices.length === 0 ? <p className="adm-empty" style={{ padding: 12 }}>ما أضيفت خدمات لهذا المزود.</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {editingServices.map((row) => (
                    <div key={row.id} style={{ border: "1px solid #F0E5E5", borderRadius: 10, padding: 12, display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                      <div>
                        <strong>{row.name}</strong>
                        {row.price && <span style={{ color: "#6B1F1F", fontWeight: 700, marginInlineStart: 8 }}>{row.price}</span>}
                        {row.description && <div style={{ fontSize: 12, color: "#5A4A4A", marginTop: 4 }}>{row.description}</div>}
                      </div>
                      <div>
                        <button type="button" className="adm-btn-sm" onClick={() => setEditingService(row)}>تعديل</button>
                        <button type="button" className="adm-btn-sm adm-btn-danger" onClick={() => deleteService(row)}>حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {editingService && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#FAF6F2", border: "1px solid #E8DADA" }}>
              <h4 style={{ marginBottom: 10, fontWeight: 800 }}>{editingService.id ? "تعديل خدمة" : "إضافة خدمة"}</h4>
              <div className="adm-grid2">
                <Field label="اسم الخدمة"><input value={editingService.name ?? ""} onChange={(e) => setEditingService({ ...editingService, name: e.target.value })} /></Field>
                <Field label="السعر"><input value={editingService.price ?? ""} onChange={(e) => setEditingService({ ...editingService, price: e.target.value })} placeholder="مثال: 150 ر.س" /></Field>
                <Field label="صورة الخدمة">
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {editingService.image_url && <img src={editingService.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />}
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const url = await uploadOfferImage(f, "service");
                      if (url) setEditingService({ ...editingService, image_url: url });
                      e.target.value = "";
                    }} />
                    {editingService.image_url && <button type="button" className="adm-btn-sm adm-btn-danger" onClick={() => setEditingService({ ...editingService, image_url: null })}>حذف</button>}
                  </div>
                </Field>
                <Field label="الترتيب"><input type="number" value={editingService.sort_order ?? 0} onChange={(e) => setEditingService({ ...editingService, sort_order: +e.target.value })} /></Field>
              </div>
              <Field label="تفاصيل الخدمة"><textarea rows={3} value={editingService.description ?? ""} onChange={(e) => setEditingService({ ...editingService, description: e.target.value })} /></Field>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #E8DADA" }}>
                <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>صور إضافية (حتى 5)</label>
                <MediaListEditor
                  kind="image"
                  items={toMediaArray(editingService.images)}
                  onChange={(next) => setEditingService({ ...editingService, images: next })}
                  upload={async (f) => await uploadOfferImage(f, "service")}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>فيديوهات الخدمة (حتى 5)</label>
                <MediaListEditor
                  kind="video"
                  items={toMediaArray(editingService.videos)}
                  onChange={(next) => setEditingService({ ...editingService, videos: next })}
                  upload={async (f) => await uploadOfferImage(f, "service")}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="adm-btn-secondary" onClick={() => setEditingService(null)}>إلغاء</button>
                <button type="button" className="adm-btn-primary" onClick={saveService}>حفظ الخدمة</button>
              </div>
            </div>
          )}

          {editing.id && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #E8DADA" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <h4 style={{ fontWeight: 700 }}>الفروع</h4>
                <button type="button" className="adm-btn-sm" onClick={() => setEditingBranch({ sort_order: editingBranches.length })}>+ إضافة فرع</button>
              </div>
              {editingBranches.length === 0 ? <p className="adm-empty" style={{ padding: 12 }}>ما أضيفت فروع لهذا المزود.</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {editingBranches.map((row) => (
                    <div key={row.id} style={{ border: "1px solid #F0E5E5", borderRadius: 10, padding: 12, display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                      <div>
                        <strong>{row.name}</strong>
                        {row.address && <div style={{ fontSize: 12, color: "#5A4A4A", marginTop: 4 }}>📍 {row.address}</div>}
                        {row.phone && <div style={{ direction: "ltr", fontSize: 12, color: "#5A4A4A" }}>{row.phone}</div>}
                      </div>
                      <div>
                        <button type="button" className="adm-btn-sm" onClick={() => setEditingBranch(row)}>تعديل</button>
                        <button type="button" className="adm-btn-sm adm-btn-danger" onClick={() => deleteBranch(row)}>حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {editingBranch && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#FAF6F2", border: "1px solid #E8DADA" }}>
              <h4 style={{ marginBottom: 10, fontWeight: 800 }}>{editingBranch.id ? "تعديل فرع" : "إضافة فرع"}</h4>
              <div className="adm-grid2">
                <Field label="اسم الفرع"><input value={editingBranch.name ?? ""} onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })} placeholder="مثال: فرع العليا" /></Field>
                <Field label="المدينة">
                  <select value={editingBranch.city_id ?? ""} onChange={(e) => setEditingBranch({ ...editingBranch, city_id: e.target.value || null })}>
                    <option value="">— اختر المدينة —</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                  </select>
                </Field>
                <Field label="رقم الهاتف"><input value={editingBranch.phone ?? ""} onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })} dir="ltr" placeholder="05xxxxxxxx" /></Field>
                <Field label="العنوان"><input value={editingBranch.address ?? ""} onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })} /></Field>
                <Field label="رابط الخريطة"><input value={editingBranch.map_url ?? ""} onChange={(e) => setEditingBranch({ ...editingBranch, map_url: e.target.value })} dir="ltr" placeholder="https://maps..." /></Field>
                <Field label="الترتيب"><input type="number" value={editingBranch.sort_order ?? 0} onChange={(e) => setEditingBranch({ ...editingBranch, sort_order: +e.target.value })} /></Field>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="adm-btn-secondary" onClick={() => setEditingBranch(null)}>إلغاء</button>
                <button type="button" className="adm-btn-primary" onClick={saveBranch}>حفظ الفرع</button>
              </div>
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

// ============ SITE TEXTS ============
type SiteTextRow = { key: string; value: string; label: string | null; updated_at: string };

const SITE_TEXT_DEFAULTS: SiteTextRow[] = [
  { key: "home.hero.fallback", label: "نص البنر الافتراضي", value: "دليلك الأول لتجهيز مناسباتك.. من أفخم مزودين الخدمات في المملكة 🤍", updated_at: "" },
  { key: "home.search.placeholder", label: "عبارة البحث السريع", value: "دوّر على مقدم خدمة، تصنيف، أو أي شي تبيه...", updated_at: "" },
  { key: "home.city.label", label: "عبارة اختر مدينتك", value: "📍 اختر مدينتك", updated_at: "" },
  { key: "home.city.all", label: "خيار كل المدن", value: "🌍 كل المدن", updated_at: "" },
  { key: "home.city.empty", label: "ما فيه مدن", value: "ما فيه مدن لحد الحين", updated_at: "" },
  { key: "home.categories.title", label: "عنوان التصنيفات", value: "✿ تصفّح على كيفك.. حسب التصنيف", updated_at: "" },
  { key: "home.categories.empty", label: "لا توجد تصنيفات", value: "ما فيه تصنيفات لحد الحين.", updated_at: "" },
  { key: "home.category.count_suffix", label: "لاحقة عدد مقدمي الخدمة", value: "مقدم خدمة", updated_at: "" },
  { key: "home.category.coming_soon", label: "قريباً", value: "قريباً 🌟", updated_at: "" },
  { key: "home.category.back", label: "زر الرجوع للتصنيفات", value: "‹ رجوع للتصنيفات", updated_at: "" },
  { key: "home.category.search_placeholder", label: "بحث داخل التصنيف", value: "دوّر داخل هذا التصنيف...", updated_at: "" },
  { key: "home.subs.all", label: "كل التصنيفات الفرعية", value: "الكل", updated_at: "" },
  { key: "home.subs.tertiary_label", label: "عنوان التصنيفات الفرعية", value: "تصنيفات فرعية:", updated_at: "" },
  { key: "home.featured.title", label: "عنوان المميز", value: "⭐ نخبة مختارة لك", updated_at: "" },
  { key: "home.all_providers.title", label: "عنوان كل المقدمين", value: "كل المقدمين", updated_at: "" },
  { key: "home.category.empty", label: "لا يوجد مقدمين بالتصنيف", value: "ما فيه مقدمين بهذا التصنيف لحد الحين 🌷", updated_at: "" },
  { key: "home.search.results", label: "عنوان نتائج البحث (سيلحق العدد)", value: "🔍 نتائج البحث", updated_at: "" },
  { key: "home.loading", label: "رسالة التحميل", value: "لحظات.. نجهّز لك كل شي ✨", updated_at: "" },
  { key: "home.no_results", label: "رسالة لا توجد نتائج", value: "ما لقينا شي مطابق.. جرّب كلمة ثانية أو تصفّح التصنيفات 🌷", updated_at: "" },
  { key: "home.about.title", label: "عنوان من نحن", value: "من نحن", updated_at: "" },
  { key: "home.about.p1", label: "من نحن — الفقرة الأولى", value: "إزهليها منصتك الأولى لتجهيز مناسباتك في المملكة العربية السعودية. نجمع لك في مكان واحد نخبة من أفخم مزودين الخدمات وكل اللي تحتاجه عشان يومك يطلع على الأصول 🤍", updated_at: "" },
  { key: "home.about.p2", label: "من نحن — الفقرة الثانية", value: "مهمتنا نوفّر عليك عناء البحث، ونعطيك تجربة سهلة وسريعة تختار منها الأنسب لك من ناحية الجودة والسعر والموقع، مع تواصل مباشر وحفظ مفضّلتك بضغطة.", updated_at: "" },
  { key: "home.about.p3", label: "من نحن — الفقرة الثالثة", value: "هدفنا نكون الدليل الموثوق لكل شخص أو عائلة تبي مناسبة مميزة. شكراً لثقتك فينا 💐", updated_at: "" },
  { key: "footer.about", label: "زر من نحن (الفوتر)", value: "من نحن", updated_at: "" },
  { key: "footer.contact", label: "زر تواصل معنا (الفوتر)", value: "تواصل معنا", updated_at: "" },
  { key: "footer.copy", label: "حقوق الفوتر", value: "Ezhliha © 2026 — Powered by AQ", updated_at: "" },
  { key: "nav.login", label: "زر الدخول (الهيدر)", value: "دخول", updated_at: "" },
  { key: "nav.signup", label: "زر التسجيل (الهيدر)", value: "تسجيل", updated_at: "" },
  { key: "nav.admin", label: "زر لوحة الأدمن", value: "لوحة الأدمن", updated_at: "" },
  { key: "account.title", label: "عنوان قائمة الحساب", value: "حسابي", updated_at: "" },
  { key: "account.favorites", label: "زر المفضلة", value: "♥ المفضلة", updated_at: "" },
  { key: "account.signout", label: "زر تسجيل الخروج", value: "↩ تسجيل الخروج", updated_at: "" },
  { key: "auth_gate.title", label: "شاشة الأعضاء — العنوان", value: "محتوى للأعضاء بس", updated_at: "" },
  { key: "auth_gate.description", label: "شاشة الأعضاء — الوصف", value: "عشان تدخل على دليل مقدمين الخدمات لازم تسجّل دخولك. للتسجيل تحتاج كود الشراء اللي وصلك بعد طلبك من متجر سلة 🤍", updated_at: "" },
  { key: "auth_gate.login", label: "شاشة الأعضاء — زر الدخول", value: "تسجيل الدخول", updated_at: "" },
  { key: "auth_gate.signup", label: "شاشة الأعضاء — زر إنشاء الحساب", value: "إنشاء حساب جديد", updated_at: "" },
  { key: "provider.whatsapp.label", label: "عبارة زر الواتساب", value: "للمزيد من التفاصيل", updated_at: "" },
  { key: "provider.tabs.packages", label: "تبويب — الباقات", value: "الباقات", updated_at: "" },
  { key: "provider.tabs.services", label: "تبويب — الخدمات", value: "الخدمات", updated_at: "" },
  { key: "provider.tabs.branches", label: "تبويب — الفروع", value: "الفروع", updated_at: "" },
  { key: "site.font_family", label: "خط الموقع (اختر من القائمة)", value: "Tajawal", updated_at: "" },
];

const FONT_OPTIONS = [
  "Tajawal", "Cairo", "Almarai", "Amiri", "Reem Kufi Fun",
  "Noto Kufi Arabic", "Changa", "El Messiri", "Rakkas",
];

function SiteTextsTab() {
  const [rows, setRows] = useState<SiteTextRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("site_texts").select("*").order("key");
    const byKey = new Map((data ?? []).map((r) => [r.key, r as SiteTextRow]));
    const merged = SITE_TEXT_DEFAULTS.map((d) => byKey.get(d.key) ?? d);
    const extras = ((data ?? []) as SiteTextRow[]).filter((r) => !SITE_TEXT_DEFAULTS.some((d) => d.key === r.key));
    setRows([...merged, ...extras]);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const updateRow = (key: string, value: string) => {
    setRows((prev) => prev.map((r) => r.key === key ? { ...r, value } : r));
  };

  const save = async (row: SiteTextRow) => {
    setSavingKey(row.key);
    const payload = { key: row.key, label: row.label, value: row.value };
    const { error } = await supabase.from("site_texts").upsert(payload, { onConflict: "key" });
    setSavingKey(null);
    if (error) { alert(error.message); return; }
    logActivity("update", "site_text", row.key, { key: row.key, label: row.label });
    reload();
  };

  return (
    <>
      <h1 className="adm-title">عبارات الموقع</h1>
      <div className="adm-card">
        {loading ? <p className="adm-empty">جارٍ التحميل...</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {rows.map((r) => (
              <div key={r.key} style={{ border: "1px solid #F0E5E5", borderRadius: 12, padding: 14, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                  <div>
                    <strong>{r.label ?? r.key}</strong>
                    <div style={{ direction: "ltr", textAlign: "left", fontSize: 11, color: "#9A8A8A", marginTop: 3 }}>{r.key}</div>
                  </div>
                  <button className="adm-btn-sm" disabled={savingKey === r.key} onClick={() => save(r)}>
                    {savingKey === r.key ? "جارٍ الحفظ..." : "حفظ"}
                  </button>
                </div>
                {r.key === "site.font_family" ? (
                  <select
                    value={r.value}
                    onChange={(e) => updateRow(r.key, e.target.value)}
                    style={{ width: "100%", border: "1px solid #E8DADA", borderRadius: 8, padding: 10, fontFamily: `"${r.value}", inherit`, fontSize: 15 }}
                  >
                    {FONT_OPTIONS.map((f) => <option key={f} value={f} style={{ fontFamily: `"${f}", sans-serif` }}>{f}</option>)}
                  </select>
                ) : (
                  <textarea
                    value={r.value}
                    onChange={(e) => updateRow(r.key, e.target.value)}
                    rows={r.value.length > 90 ? 4 : 2}
                    style={{ width: "100%", border: "1px solid #E8DADA", borderRadius: 8, padding: 10, fontFamily: "inherit", resize: "vertical" }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ============ REVIEWS ============
type ReviewRow = {
  id: string; provider_id: string; user_id: string;
  rating: number; comment: string | null; created_at: string; custom_reviewer_name: string | null;
};

function ReviewsTab() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [providers, setProviders] = useState<Record<string, string>>({});
  const [providerRows, setProviderRows] = useState<Array<{ id: string; name: string }>>([]);
  const [editing, setEditing] = useState({ provider_id: "", custom_reviewer_name: "", rating: 5, comment: "" });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as ReviewRow[]);
    const { data: provs } = await supabase.from("providers").select("id,name");
    const map: Record<string, string> = {};
    (provs ?? []).forEach((p: { id: string; name: string }) => { map[p.id] = p.name; });
    setProviders(map);
    setProviderRows(((provs ?? []) as Array<{ id: string; name: string }>).sort((a, b) => a.name.localeCompare(b.name, "ar")));
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

  const addFakeReview = async () => {
    if (!editing.provider_id) { alert("اختر مقدم الخدمة"); return; }
    if (!editing.custom_reviewer_name.trim()) { alert("اكتب اسم صاحب التقييم"); return; }
    const payload = {
      provider_id: editing.provider_id,
      user_id: null,
      custom_reviewer_name: editing.custom_reviewer_name.trim(),
      rating: Math.max(1, Math.min(5, Number(editing.rating) || 5)),
      comment: editing.comment.trim() || null,
    };
    const { error } = await supabase.from("reviews").insert(payload);
    if (error) { alert(error.message); return; }
    logActivity("create", "review", editing.provider_id, { provider: providers[editing.provider_id], rating: payload.rating, fake: true });
    setEditing({ provider_id: "", custom_reviewer_name: "", rating: 5, comment: "" });
    reload();
  };

  return (
    <>
      <h1 className="adm-title">التقييمات</h1>
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>إضافة تقييم من جهة الأدمن</h3>
        <div className="adm-grid2">
          <Field label="مقدم الخدمة">
            <select value={editing.provider_id} onChange={(e) => setEditing({ ...editing, provider_id: e.target.value })}>
              <option value="">اختر...</option>
              {providerRows.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="اسم صاحب التقييم">
            <input value={editing.custom_reviewer_name} onChange={(e) => setEditing({ ...editing, custom_reviewer_name: e.target.value })} placeholder="مثال: عميل إزهليها" />
          </Field>
          <Field label="التقييم">
            <select value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: +e.target.value })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} نجوم</option>)}
            </select>
          </Field>
        </div>
        <Field label="التعليق">
          <textarea rows={3} value={editing.comment} onChange={(e) => setEditing({ ...editing, comment: e.target.value })} placeholder="اكتب التعليق الذي سيظهر للزوار" />
        </Field>
        <button className="adm-btn-primary" onClick={addFakeReview}>+ إضافة التقييم</button>
      </div>
      <div className="adm-card">
        {loading ? <p className="adm-empty">جارٍ التحميل...</p> : rows.length === 0 ? (
          <p className="adm-empty">لا توجد تقييمات بعد.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>مقدم الخدمة</th>
                  <th>الاسم</th>
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
                    <td>{r.custom_reviewer_name || "مستخدم"}</td>
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
const filterBarStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "10px 12px", background: "#fafafa", border: "1px solid #eee", borderRadius: 8, marginBottom: 12 };
const filterInputStyle: React.CSSProperties = { padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, background: "#fff", fontFamily: "inherit" };

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
  package: "باقة",
  site_text: "عبارة موقع",
  purchase_code: "كود اشتراك",
  purchase_codes: "أكواد اشتراك",
};

const FIELD_LABEL: Record<string, string> = {
  name: "الاسم", name_ar: "الاسم", name_en: "الاسم (EN)", title: "العنوان",
  description: "الوصف", slug: "المعرّف", address: "العنوان",
  whatsapp: "واتساب", contact_phone: "رقم الاتصال", instagram: "إنستغرام", tiktok: "تيكتوك",
  twitter: "تويتر", snapchat: "سناب شات", image_url: "الصورة", icon: "الأيقونة",
  link_url: "الرابط", price_from: "السعر من", price_to: "السعر إلى", price: "السعر النصي",
  people_from: "تكفي من", people_to: "تكفي إلى", logo_url: "اللوقو", video_thumbnail_url: "واجهة الفيديو",
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



function CodesTab() {
  const list = useServerFn(listCodes);
  const gen = useServerFn(generateCodes);
  const del = useServerFn(deleteCode);
  const q = useQuery({ queryKey: ["admin-codes"], queryFn: () => list() });
  const [count, setCount] = useState(10);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "unused" | "used">("all");

  const codes = q.data?.codes ?? [];
  const filtered = codes.filter((c: any) =>
    filter === "all" ? true : filter === "unused" ? !c.used_at : !!c.used_at
  );
  const unusedCount = codes.filter((c: any) => !c.used_at).length;

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await gen({ data: { count, note } });
      await q.refetch();
      setNote("");
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("حذف هذا الكود؟")) return;
    try {
      await del({ data: { id } });
      await q.refetch();
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      alert(msg);
    }
  }

  function copyAll() {
    const unused = codes.filter((c: any) => !c.used_at).map((c: any) => c.code).join("\n");
    navigator.clipboard.writeText(unused);
    alert("تم نسخ الأكواد غير المستخدمة");
  }

  return (
    <div dir="rtl" style={{ fontFamily: "Tajawal, system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#660000", marginBottom: 16 }}>
        أكواد الشراء — {codes.length} كود (متاح: {unusedCount})
      </h2>

      <form onSubmit={onGenerate} style={{ background: "#fff", padding: 16, borderRadius: 12, marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600 }}>
          عدد الأكواد
          <input type="number" min={1} max={200} value={count} onChange={(e) => setCount(parseInt(e.target.value) || 1)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd", width: 100 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600, flex: 1, minWidth: 200 }}>
          ملاحظة (اختياري)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: دفعة سلة يناير" style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
        </label>
        <button disabled={busy} style={{ background: "#660000", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 50, fontWeight: 700, cursor: "pointer" }}>
          {busy ? "..." : "توليد"}
        </button>
        <button type="button" onClick={copyAll} style={{ background: "#fff", color: "#660000", border: "2px solid #660000", padding: "10px 20px", borderRadius: 50, fontWeight: 700, cursor: "pointer" }}>
          نسخ غير المستخدمة
        </button>
      </form>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["all", "unused", "used"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 50, border: "1px solid #660000", background: filter === f ? "#660000" : "#fff", color: filter === f ? "#fff" : "#660000", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {f === "all" ? "الكل" : f === "unused" ? "غير مستخدم" : "مستخدم"}
          </button>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead style={{ background: "#f5f5f5" }}>
            <tr>
              <th style={cellStyle}>الكود</th>
              <th style={cellStyle}>الحالة</th>
              <th style={cellStyle}>الإيميل</th>
              <th style={cellStyle}>ملاحظة</th>
              <th style={cellStyle}>تاريخ الإنشاء</th>
              <th style={cellStyle}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={6} style={{ padding: 20, textAlign: "center" }}>جاري التحميل...</td></tr>}
            {filtered.map((c: any) => (
              <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ ...cellStyle, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}>{c.code}</td>
                <td style={cellStyle}>
                  {c.used_at
                    ? <span style={{ color: "#999" }}>مستخدم</span>
                    : <span style={{ color: "#0a7a3a", fontWeight: 700 }}>متاح</span>}
                </td>
                <td style={cellStyle}>{c.email || "—"}</td>
                <td style={cellStyle}>{c.note || "—"}</td>
                <td style={cellStyle}>{new Date(c.created_at).toLocaleDateString("ar-SA")}</td>
                <td style={cellStyle}>
                  <button onClick={() => onDelete(c.id)} style={{ background: "#fee", color: "#c00", border: "1px solid #fcc", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                    حذف
                  </button>
                </td>
              </tr>
            ))}
            {!q.isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#999" }}>لا توجد أكواد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cellStyle: React.CSSProperties = { padding: "10px 12px", textAlign: "right" };

function SallaOrdersTab() {
  const list = useServerFn(listSallaOrders);
  const create = useServerFn(createSallaOrder);
  const del = useServerFn(deleteCode);
  const q = useQuery({ queryKey: ["admin-salla-orders"], queryFn: () => list() });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [lastCode, setLastCode] = useState<{ code: string; phone: string; name: string } | null>(null);

  const orders = q.data?.orders ?? [];
  const filtered = orders.filter((o: any) => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    return (
      (o.customer_name || "").toLowerCase().includes(s) ||
      (o.customer_phone || "").includes(s) ||
      (o.salla_order_id || "").toLowerCase().includes(s) ||
      (o.code || "").toLowerCase().includes(s) ||
      (o.email || "").toLowerCase().includes(s)
    );
  });

  function normalizePhone(p: string) {
    let d = p.replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);
    if (d.startsWith("05")) d = "966" + d.slice(1);
    else if (d.startsWith("5") && d.length === 9) d = "966" + d;
    return d;
  }

  function waLink(phone: string, name: string, code: string) {
    const msg = `مرحباً ${name} 🌷\nشكراً لطلبك من متجرنا عبر سلة.\nكود الاشتراك الخاص بك:\n\n${code}\n\nاستخدمي الكود للتسجيل في الموقع.`;
    return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(msg)}`;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res: any = await create({ data: { customer_name: name, customer_phone: phone, salla_order_id: orderId, email } });
      setLastCode({ code: res.order.code, phone, name });
      await q.refetch();
      setName(""); setPhone(""); setOrderId(""); setEmail("");
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("حذف هذا الطلب وكوده؟")) return;
    try { await del({ data: { id } }); await q.refetch(); }
    catch (e) { alert(e instanceof Response ? await e.text() : (e as Error).message); }
  }

  function exportCSV() {
    const header = ["التاريخ", "اسم العميلة", "الجوال", "رقم طلب سلة", "الإيميل", "الكود", "الحالة"];
    const rows = filtered.map((o: any) => [
      new Date(o.created_at).toLocaleString("ar-SA"),
      o.customer_name || "",
      o.customer_phone || "",
      o.salla_order_id || "",
      o.email || "",
      o.code,
      o.used_at ? "مستخدم" : "متاح",
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `salla-orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div dir="rtl" style={{ fontFamily: "Tajawal, system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#660000", marginBottom: 16 }}>
        طلبات سلة — {orders.length} طلب
      </h2>

      <form onSubmit={onCreate} style={{ background: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600 }}>
          اسم العميلة *
          <input required value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600 }}>
          الجوال *
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600 }}>
          رقم طلب سلة *
          <input required value={orderId} onChange={(e) => setOrderId(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600 }}>
          الإيميل (اختياري)
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
        </label>
        <div style={{ display: "flex", alignItems: "end" }}>
          <button disabled={busy} style={{ background: "#660000", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 50, fontWeight: 700, cursor: "pointer", width: "100%" }}>
            {busy ? "..." : "توليد كود وحفظ"}
          </button>
        </div>
      </form>

      {lastCode && (
        <div style={{ background: "#e8f5e9", border: "1px solid #4caf50", padding: 14, borderRadius: 12, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, color: "#2e7d32", fontWeight: 600 }}>تم إنشاء الكود لـ {lastCode.name}</div>
            <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, letterSpacing: 2, color: "#1b5e20" }}>{lastCode.code}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { navigator.clipboard.writeText(lastCode.code); alert("نسخ"); }} style={{ background: "#fff", color: "#2e7d32", border: "1px solid #2e7d32", padding: "8px 16px", borderRadius: 50, fontWeight: 700, cursor: "pointer" }}>نسخ الكود</button>
            <a href={waLink(lastCode.phone, lastCode.name, lastCode.code)} target="_blank" rel="noreferrer" style={{ background: "#25D366", color: "#fff", padding: "8px 16px", borderRadius: 50, fontWeight: 700, textDecoration: "none" }}>إرسال واتساب</a>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم/الجوال/رقم الطلب/الكود..." style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd", flex: 1, minWidth: 200 }} />
        <button onClick={exportCSV} style={{ background: "#fff", color: "#660000", border: "2px solid #660000", padding: "8px 18px", borderRadius: 50, fontWeight: 700, cursor: "pointer" }}>تصدير CSV</button>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, overflow: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead style={{ background: "#f5f5f5" }}>
            <tr>
              <th style={cellStyle}>التاريخ</th>
              <th style={cellStyle}>العميلة</th>
              <th style={cellStyle}>الجوال</th>
              <th style={cellStyle}>رقم طلب سلة</th>
              <th style={cellStyle}>الكود</th>
              <th style={cellStyle}>الحالة</th>
              <th style={cellStyle}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={7} style={{ padding: 20, textAlign: "center" }}>جاري التحميل...</td></tr>}
            {filtered.map((o: any) => (
              <tr key={o.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ ...cellStyle, fontSize: 12, whiteSpace: "nowrap" }}>{new Date(o.created_at).toLocaleDateString("ar-SA")}</td>
                <td style={cellStyle}>{o.customer_name || "—"}</td>
                <td style={{ ...cellStyle, direction: "ltr", textAlign: "right" }}>{o.customer_phone || "—"}</td>
                <td style={cellStyle}>{o.salla_order_id || "—"}</td>
                <td style={{ ...cellStyle, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}>{o.code}</td>
                <td style={cellStyle}>
                  {o.used_at
                    ? <span style={{ color: "#999" }}>مستخدم</span>
                    : <span style={{ color: "#0a7a3a", fontWeight: 700 }}>متاح</span>}
                </td>
                <td style={cellStyle}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {!o.used_at && o.customer_phone && (
                      <a href={waLink(o.customer_phone, o.customer_name || "عميلتنا", o.code)} target="_blank" rel="noreferrer" style={{ background: "#25D366", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 12, textDecoration: "none", fontWeight: 700 }}>واتساب</a>
                    )}
                    <button onClick={() => { navigator.clipboard.writeText(o.code); }} style={{ background: "#eee", border: "1px solid #ddd", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>نسخ</button>
                    <button onClick={() => onDelete(o.id)} style={{ background: "#fee", color: "#c00", border: "1px solid #fcc", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
            {!q.isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#999" }}>لا توجد طلبات</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

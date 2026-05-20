import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getAdminUsers, claimFirstAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "لوحة الأدمن — إزهليها" }] }),
});

type Tab = "stats" | "users" | "cities" | "categories" | "providers";

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
          <Link to="/" className="adm-brand">
            <div className="adm-brand-name">إزهليها — أدمن</div>
            <div className="adm-brand-en">EZHLIHA ADMIN</div>
          </Link>
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
            <p style={{ margin: "12px 0", color: "#5A4A4A" }}>
              إذا كنتِ مالكة المشروع، اضغطي الزر أدناه لترقية حسابك إلى أدمن (يعمل مرة واحدة فقط، ولا أحد قام بذلك بعد).
            </p>
            <button
              className="adm-btn-primary"
              disabled={claiming}
              onClick={async () => {
                setClaiming(true);
                setClaimMsg(null);
                try {
                  await claim();
                  setClaimMsg("تمت الترقية! أعيدي تحميل الصفحة.");
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
        <Link to="/" className="adm-brand">
          <div className="adm-brand-name">إزهليها — أدمن</div>
          <div className="adm-brand-en">EZHLIHA ADMIN</div>
        </Link>
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
          <SideBtn label="المستخدمات" active={tab === "users"} onClick={() => setTab("users")} />
          <div className="adm-side-group">الإعدادات</div>
          <SideBtn label="المدن" active={tab === "cities"} onClick={() => setTab("cities")} />
          <SideBtn label="التصنيفات" active={tab === "categories"} onClick={() => setTab("categories")} />
          <SideBtn label="مقدمو الخدمة" active={tab === "providers"} onClick={() => setTab("providers")} />
        </aside>
        <main className="adm-content">
          {tab === "stats" && <StatsAndUsers showUsers={false} />}
          {tab === "users" && <StatsAndUsers showUsers={true} />}
          {tab === "cities" && <CitiesTab />}
          {tab === "categories" && <CategoriesTab />}
          {tab === "providers" && <ProvidersTab />}
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
  const fetchUsers = useServerFn(getAdminUsers);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });

  return (
    <>
      <h1 className="adm-title">{showUsers ? "المستخدمات" : "لوحة التحكم"}</h1>
      {!showUsers && (
        <div className="adm-stats">
          <Stat label="إجمالي المستخدمات" value={data?.total ?? "—"} />
          <Stat label="عدد الأدمن" value={data?.admins ?? "—"} />
          <Stat
            label="مفعّلات الإيميل"
            value={data ? data.users.filter((u) => u.email_confirmed).length : "—"}
          />
        </div>
      )}
      {showUsers && (
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
      )}
    </>
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
      await supabase.from("cities").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("cities").insert(payload);
    }
    setEditing(null);
    reload();
  };

  const del = async (id: string) => {
    if (!confirm("هل تريدين حذف هذه المدينة؟")) return;
    await supabase.from("cities").delete().eq("id", id);
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
      // Editing existing — type cannot change (select is disabled)
      if (editing.originalKind === "sub") {
        await supabase.from("subcategories")
          .update({ category_id: editing.parent_id, name_ar: name, name_en: name, sort_order, active })
          .eq("id", editing.id);
      } else {
        await supabase.from("categories")
          .update({ name_ar: name, name_en: name, icon: editing.icon ?? null, sort_order, active })
          .eq("id", editing.id);
      }
    } else if (isSub) {
      await supabase.from("subcategories").insert({
        category_id: editing.parent_id,
        name_ar: name, name_en: name, slug: makeSlug(name),
        sort_order, active,
      });
    } else {
      await supabase.from("categories").insert({
        name_ar: name, name_en: name, slug: makeSlug(name),
        icon: editing.icon ?? null, sort_order, active,
      });
    }
    setEditing(null);
    reload();
  };

  const delMain = async (id: string) => {
    if (!confirm("الحذف سيحذف التصنيفات الفرعية ومقدمي الخدمة المرتبطين. متأكدة؟")) return;
    await supabase.from("categories").delete().eq("id", id);
    reload();
  };
  const delSub = async (id: string) => {
    if (!confirm("الحذف سيحذف مقدمي الخدمة المرتبطين. متأكدة؟")) return;
    await supabase.from("subcategories").delete().eq("id", id);
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
              const children = subs.filter((s) => s.category_id === c.id);
              return (
                <div key={c.id} style={{ border: "1px solid #E8DADA", borderRadius: 12, padding: 14, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{c.icon ?? "📁"}</span>
                      <strong style={{ fontSize: 16 }}>{c.name_ar}</strong>
                      <span className={`adm-badge ${c.active ? "adm-badge-on" : ""}`}>{c.active ? "مفعّل" : "متوقف"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="adm-btn-sm" onClick={() => setEditing({ active: true, sort_order: 0, parent_id: c.id })}>+ تصنيف فرعي</button>
                      <button className="adm-btn-sm" onClick={() => setEditing({ id: c.id, name_ar: c.name_ar, icon: c.icon, sort_order: c.sort_order, active: c.active, parent_id: "", originalKind: "main" })}>تعديل</button>
                      <button className="adm-btn-sm adm-btn-danger" onClick={() => delMain(c.id)}>حذف</button>
                    </div>
                  </div>
                  {children.length > 0 && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, paddingRight: 16, borderRight: "2px solid #F0E5E5" }}>
                      {children.map((s) => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#FAF6F2", borderRadius: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#9A8A8A" }}>↳</span>
                            <span>{s.name_ar}</span>
                            <span className={`adm-badge ${s.active ? "adm-badge-on" : ""}`} style={{ fontSize: 10 }}>{s.active ? "مفعّل" : "متوقف"}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="adm-btn-sm" onClick={() => setEditing({ id: s.id, name_ar: s.name_ar, sort_order: s.sort_order, active: s.active, parent_id: s.category_id, originalKind: "sub" })}>تعديل</button>
                            <button className="adm-btn-sm adm-btn-danger" onClick={() => delSub(s.id)}>حذف</button>
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
          <Field label="التصنيف الأساسي (اتركيه فارغًا إذا كان تصنيفًا رئيسيًا)">
            <select
              value={editing.parent_id}
              disabled={!!editing.id}
              onChange={(e) => setEditing({ ...editing, parent_id: e.target.value })}
            >
              <option value="">— تصنيف رئيسي —</option>
              {cats.filter((c) => c.id !== editing.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
            </select>
          </Field>
          {!editing.parent_id && (
            <Field label="أيقونة (Emoji — اختياري)">
              <input
                value={editing.icon ?? ""}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                placeholder="💇‍♀️"
              />
            </Field>
          )}
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

// ============ PROVIDERS ============
type ProvRow = {
  id: string; subcategory_id: string; city_id: string; name: string;
  description: string | null; price_from: number | null; price_to: number | null;
  whatsapp: string | null; instagram: string | null; address: string | null;
  rating: number | null; is_featured: boolean; featured_until: string | null;
  sort_order: number; active: boolean;
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
      address: editing.address ?? null, rating: editing.rating ?? null,
      is_featured: editing.is_featured ?? false,
      featured_until: editing.featured_until || null,
      sort_order: editing.sort_order ?? 0, active: editing.active ?? true,
    };
    if (editing.id) await supabase.from("providers").update(payload).eq("id", editing.id);
    else {
      const { data } = await supabase.from("providers").insert(payload).select().single();
      if (data) editing.id = data.id;
    }
    setEditing(null); reload();
  };
  const del = async (id: string) => {
    if (!confirm("حذف مقدم الخدمة وكل صوره؟")) return;
    await supabase.from("providers").delete().eq("id", id); reload();
  };
  const toggleFeatured = async (r: ProvRow) => {
    await supabase.from("providers").update({ is_featured: !r.is_featured }).eq("id", r.id);
    reload();
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !editing?.id) { alert("احفظي مقدم الخدمة أولاً قبل رفع الصور"); return; }
    setUploading(true);
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
    }
    setUploading(false);
    reload();
  };

  const delImg = async (img: ImgRow) => {
    await supabase.from("provider_images").delete().eq("id", img.id);
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
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="adm-select">
            <option value="all">كل المدن</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="adm-select">
            <option value="all">كل التصنيفات</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
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
                  return <option key={s.id} value={s.id}>{cat?.name_ar} → {s.name_ar}</option>;
                })}
              </select>
            </Field>
            <Field label="رقم واتساب (مع رمز الدولة)">
              <input value={editing.whatsapp ?? ""} onChange={(e) => setEditing({ ...editing, whatsapp: e.target.value })} placeholder="966555555555" dir="ltr" />
            </Field>
            <Field label="السعر من (ر.س)"><input type="number" value={editing.price_from ?? ""} onChange={(e) => setEditing({ ...editing, price_from: e.target.value ? +e.target.value : null })} /></Field>
            <Field label="السعر إلى (ر.س)"><input type="number" value={editing.price_to ?? ""} onChange={(e) => setEditing({ ...editing, price_to: e.target.value ? +e.target.value : null })} /></Field>
            <Field label="إنستغرام"><input value={editing.instagram ?? ""} onChange={(e) => setEditing({ ...editing, instagram: e.target.value })} dir="ltr" /></Field>
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
              <input type="file" accept="image/*" multiple disabled={uploading} onChange={(e) => handleUpload(e.target.files)} />
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
          {!editing.id && <p style={{ marginTop: 12, fontSize: 13, color: "#5A4A4A" }}>احفظي أولاً ثم سترين خيار رفع الصور.</p>}
        </Modal>
      )}
    </>
  );
}

// ============ HELPERS ============
function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h1 className="adm-title">{title}</h1>
      <button className="adm-btn-primary" onClick={onAdd}>+ إضافة جديد</button>
    </div>
  );
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

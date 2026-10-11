import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AuthShell } from "./signup";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "حسابي — إزهليها" },
      { name: "description", content: "عدّلي اسمك ورقم جوالك في حسابك على إزهليها." },
      { property: "og:title", content: "حسابي — إزهليها" },
      { property: "og:description", content: "عدّلي اسمك ورقم جوالك في حسابك على إزهليها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle()
      .then(({ data }) => { setName(data?.full_name ?? ""); setPhone(data?.phone ?? ""); });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setMsg(null);
    const n = name.trim();
    const p = phone.trim().replace(/[^\d+]/g, "");
    if (n.length < 2 || n.length > 120) { setMsg({ ok: false, text: "اكتبي اسمك (حرفين على الأقل)." }); return; }
    if (p && !/^\+?\d{8,15}$/.test(p)) { setMsg({ ok: false, text: "رقم الجوال غير صحيح، مثال: 05xxxxxxxx" }); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: n, phone: p || null }).eq("id", user.id);
    setSaving(false);
    setMsg(error ? { ok: false, text: "ما قدرنا نحفظ، جربي مرة ثانية." } : { ok: true, text: "تم حفظ بياناتك ✅" });
  }

  return (
    <AuthShell title="حسابي" sub={user?.email ?? ""}>
      <form onSubmit={onSubmit} className="auth-form">
        <label className="auth-field">
          <span>الاسم</span>
          <input required value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="اسمك" />
        </label>
        <label className="auth-field">
          <span>رقم الجوال</span>
          <input type="tel" dir="ltr" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" />
        </label>
        {msg && <div className={msg.ok ? "auth-switch" : "auth-error"} style={msg.ok ? { color: "#166534", fontWeight: 700 } : undefined}>{msg.text}</div>}
        <button className="auth-btn" disabled={saving}>{saving ? "..." : "حفظ التغييرات"}</button>
        <div className="auth-switch" style={{ textAlign: "center" }}>
          <Link to="/forgot-password">تغيير كلمة المرور</Link>
        </div>
        <div className="auth-switch" style={{ textAlign: "center" }}>
          <Link to="/">الرجوع للرئيسية</Link>
        </div>
      </form>
    </AuthShell>
  );
}

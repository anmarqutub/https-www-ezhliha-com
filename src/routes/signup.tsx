import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [{ title: "إنشاء حساب — إزهليها" }],
  }),
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("الرياض");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [session, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, phone, city },
      },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate({ to: "/" });
  }

  return <AuthShell title="إنشاء حساب جديد" sub="انضمي الآن لاكتشاف أفضل مزودي الخدمات">
    <form onSubmit={onSubmit} className="auth-form">
      <Field label="الاسم الكامل">
        <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثال: منال الأحمدي" />
      </Field>
      <Field label="البريد الإلكتروني">
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" />
      </Field>
      <Field label="كلمة المرور">
        <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="٦ أحرف على الأقل" />
      </Field>
      <Field label="رقم الجوال (اختياري)">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XXXXXXXX" />
      </Field>
      <Field label="المدينة">
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option>الرياض</option>
          <option>جدة</option>
          <option>الدمام</option>
          <option>مكة المكرمة</option>
        </select>
      </Field>
      {error && <div className="auth-error">{error}</div>}
      <button className="auth-btn" disabled={submitting}>{submitting ? "..." : "إنشاء الحساب"}</button>
      <div className="auth-switch">
        لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link>
      </div>
    </form>
  </AuthShell>;
}

export function AuthShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div dir="rtl" style={shellStyle}>
      <style>{authCss}</style>
      <div className="auth-card">
        <Link to="/" className="auth-brand">
          <div className="auth-brand-name">إزهليها</div>
          <div className="auth-brand-en">AZHLEHA</div>
        </Link>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-sub">{sub}</p>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

const shellStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #FAF6F2 0%, #F5EEEE 100%)",
  padding: 24,
  fontFamily: "Tajawal, system-ui, sans-serif",
};

export const authCss = `
  .auth-card { background:#fff; border-radius:18px; padding:40px 32px; max-width:440px; width:100%; box-shadow:0 20px 60px rgba(107,31,31,0.15); }
  .auth-brand { display:block; text-align:center; text-decoration:none; margin-bottom:24px; }
  .auth-brand-name { font-size:28px; font-weight:900; color:#6B1F1F; }
  .auth-brand-en { font-size:10px; letter-spacing:5px; color:#C47A7A; }
  .auth-title { font-size:24px; font-weight:800; color:#1A1A1A; text-align:center; margin-bottom:6px; }
  .auth-sub { font-size:14px; color:#5A4A4A; text-align:center; margin-bottom:24px; }
  .auth-form { display:flex; flex-direction:column; gap:14px; }
  .auth-field { display:flex; flex-direction:column; gap:6px; font-size:13px; color:#5A4A4A; font-weight:600; }
  .auth-field input, .auth-field select {
    border:1px solid #E8DADA; border-radius:10px; padding:11px 14px;
    font-family:inherit; font-size:14px; color:#1A1A1A; background:#FAF6F2; outline:none; transition:border-color .2s;
  }
  .auth-field input:focus, .auth-field select:focus { border-color:#6B1F1F; background:#fff; }
  .auth-btn {
    margin-top:6px; background:#6B1F1F; color:#fff; border:none; border-radius:50px;
    padding:13px; font-family:inherit; font-size:15px; font-weight:700; cursor:pointer; transition:background .2s;
  }
  .auth-btn:hover { background:#4A1414; }
  .auth-btn:disabled { opacity:.6; cursor:not-allowed; }
  .auth-error { background:#fde8e8; color:#7a1a1a; padding:10px 14px; border-radius:8px; font-size:13px; }
  .auth-switch { text-align:center; font-size:14px; color:#5A4A4A; margin-top:8px; }
  .auth-switch a { color:#6B1F1F; font-weight:700; text-decoration:none; }
`;

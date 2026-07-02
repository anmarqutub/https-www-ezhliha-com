import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createUser } from "@/lib/signup.functions";
import logoUrl from "@/assets/logo.jpg";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({ meta: [{ title: "إنشاء حساب — إزهليها" }] }),
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const register = useServerFn(createUser);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("الرياض");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [session, loading, navigate]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneNorm = phone.replace(/[\s\-+]/g, "");
  const phoneValid = /^(05\d{8}|9665\d{8})$/.test(phoneNorm);
  const passwordValid = password.length >= 6;
  const formValid = emailValid && phoneValid && passwordValid && fullName.trim() && code.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!emailValid) return setError("البريد الإلكتروني غير صالح");
    if (!phoneValid) return setError("رقم الجوال يجب أن يبدأ بـ 05 (١٠ أرقام) أو 966 (١٢ رقم)");
    setSubmitting(true);
    try {
      await register({
        data: { email: email.trim(), password, full_name: fullName, phone: phoneNorm, city, code },
      });
      const { error: sErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (sErr) throw new Error(sErr.message);
      navigate({ to: "/" });
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      setError(msg || "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="إنشاء حساب جديد" sub="تحتاجين كود الشراء من متجر سلة للتسجيل">
      <form onSubmit={onSubmit} className="auth-form" noValidate>
        <Field label="كود الشراء (من متجر سلة)" hint="الكود المرسل لك بعد الشراء">
          <input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="مثال: A1B2C3D4" style={{ letterSpacing: 2, fontWeight: 700 }} />
        </Field>
        <Field label="الاسم الكامل" hint="كما تودين أن يظهر في حسابك">
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثال: نورة عبدالله" />
        </Field>
        <Field label="البريد الإلكتروني" hint="سيُستخدم لتسجيل الدخول واستعادة الحساب" error={email.length > 0 && !emailValid ? "صيغة البريد غير صحيحة" : undefined}>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" />
        </Field>
        <Field label="كلمة المرور" hint="٦ أحرف على الأقل" error={password.length > 0 && !passwordValid ? "كلمة المرور قصيرة" : undefined}>
          <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
        </Field>
        <Field
          label="رقم الجوال"
          hint="يبدأ بـ 05 (١٠ أرقام) أو 966 (١٢ رقم)"
          error={phone.length > 0 && !phoneValid ? "رقم الجوال غير صحيح" : undefined}
        >
          <input
            required
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05XXXXXXXX أو 9665XXXXXXXX"
          />
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
        <button className="auth-btn" disabled={submitting || !formValid}>{submitting ? "..." : "إنشاء الحساب"}</button>
        <div className="auth-switch">
          لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div dir="rtl" style={shellStyle}>
      <style>{authCss}</style>
      <div className="auth-card">
        <Link to="/" className="auth-brand">
          <img src={logoUrl} alt="إزهليها" style={{ height: 60, display: "block", margin: "0 auto" }} />
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
  .auth-card { background:#fff; border-radius:18px; padding:40px 32px; max-width:440px; width:100%; box-shadow:0 20px 60px rgba(102,0,0,0.15); }
  .auth-brand { display:block; text-align:center; text-decoration:none; margin-bottom:24px; }
  .auth-title { font-size:24px; font-weight:800; color:#000; text-align:center; margin-bottom:6px; }
  .auth-sub { font-size:14px; color:#555; text-align:center; margin-bottom:24px; }
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

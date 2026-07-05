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
  
  const [code, setCode] = useState("");
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [session, loading, navigate]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneNorm = phone.replace(/[\s\-]/g, "");
  const phoneValid = /^05\d{8}$/.test(phoneNorm)
    || /^9665\d{8}$/.test(phoneNorm)
    || /^\+[1-9]\d{6,14}$/.test(phoneNorm);
  const passwordValid = password.length >= 6;
  const nameValid = fullName.trim().length > 0;
  const codeValid = code.trim().length >= 4;
  const formValid = emailValid && phoneValid && passwordValid && nameValid && codeValid;

  const emailError = serverErrors.email ?? (email.length > 0 && !emailValid ? "صيغة البريد غير صحيحة" : undefined);
  const phoneError = serverErrors.phone ?? (phone.length > 0 && !phoneValid ? "رقم الجوال غير صحيح" : undefined);
  const passwordError = serverErrors.password ?? (password.length > 0 && !passwordValid ? "كلمة المرور يجب أن تكون ٦ أحرف على الأقل" : undefined);
  const nameError = serverErrors.full_name ?? undefined;
  const codeError = serverErrors.code ?? undefined;
  const formError = serverErrors.form ?? undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerErrors({});
    const errs: Record<string, string> = {};
    if (!nameValid) errs.full_name = "الاسم مطلوب";
    if (!codeValid) errs.code = "كود الشراء مطلوب";
    if (!emailValid) errs.email = "البريد الإلكتروني غير صالح";
    if (!passwordValid) errs.password = "كلمة المرور يجب أن تكون ٦ أحرف على الأقل";
    if (!phoneValid) errs.phone = "رقم الجوال غير صحيح";
    if (Object.keys(errs).length) { setServerErrors(errs); return; }

    setSubmitting(true);
    try {
      await register({
        data: { email: email.trim(), password, full_name: fullName, phone: phoneNorm, code },
      });
      const { error: sErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (sErr) throw new Error(sErr.message);
      navigate({ to: "/" });
    } catch (err: any) {
      const raw = err?.message || "حدث خطأ";
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.field && parsed.message) {
          setServerErrors({ [parsed.field]: parsed.message });
        } else {
          setServerErrors({ form: raw });
        }
      } catch {
        setServerErrors({ form: raw });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="إنشاء حساب جديد" sub="تحتاجين كود الشراء من متجر سلة للتسجيل">
      <form onSubmit={onSubmit} className="auth-form" noValidate>
        <Field label="كود الشراء" hint="الكود المُرسل لك بعد شرائك من سلة" error={codeError}>
          <input required value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setServerErrors((s) => ({ ...s, code: "" })); }} placeholder="مثال: A1B2C3D4" style={{ letterSpacing: 2, fontWeight: 700 }} />
        </Field>
        <Field label="الاسم الكامل" hint="كما تودين أن يظهر في حسابك" error={nameError}>
          <input required value={fullName} onChange={(e) => { setFullName(e.target.value); setServerErrors((s) => ({ ...s, full_name: "" })); }} placeholder="مثال: نورة عبدالله" />
        </Field>
        <Field label="البريد الإلكتروني" hint="سيُستخدم لتسجيل الدخول واستعادة الحساب" error={emailError}>
          <input required type="email" value={email} onChange={(e) => { setEmail(e.target.value); setServerErrors((s) => ({ ...s, email: "" })); }} placeholder="example@email.com" />
        </Field>
        <Field label="كلمة المرور" hint="٦ أحرف على الأقل" error={passwordError}>
          <input required type="password" minLength={6} value={password} onChange={(e) => { setPassword(e.target.value); setServerErrors((s) => ({ ...s, password: "" })); }} placeholder="••••••" />
        </Field>
        <Field label="رقم الجوال" error={phoneError}>
          <input
            required
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setServerErrors((s) => ({ ...s, phone: "" })); }}
            placeholder="05XXXXXXXX"
          />
        </Field>
        {formError && <div className="auth-error">{formError}</div>}
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

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      {children}
      {error ? <small className="auth-field-error">{error}</small> : hint ? <small className="auth-field-hint">{hint}</small> : null}
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
  .auth-field-hint { font-size:11.5px; color:#9A8A8A; font-weight:500; margin-top:2px; }
  .auth-field-error { font-size:11.5px; color:#B01818; font-weight:600; margin-top:2px; }
  .auth-switch a { color:#6B1F1F; font-weight:700; text-decoration:none; }
`;

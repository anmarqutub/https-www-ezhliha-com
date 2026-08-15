import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "./signup";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: "نسيت كلمة المرور — إزهليها" }] }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell title="نسيت كلمة المرور" sub="سنرسل لكِ رابط إعادة تعيين كلمة المرور عبر البريد">
      {sent ? (
        <div className="auth-form" style={{ textAlign: "center", gap: 12 }}>
          <div style={{ fontSize: 40 }}>📧</div>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            تم إرسال رابط إعادة تعيين كلمة المرور إلى:<br />
            <b>{email}</b>
          </p>
          <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
            تحققي من صندوق الوارد (وأيضًا مجلد الـ Spam).
          </p>
          <Link to="/login" className="auth-btn" style={{ textDecoration: "none", textAlign: "center" }}>
            العودة لتسجيل الدخول
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field">
            <span>البريد الإلكتروني</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" disabled={submitting}>
            {submitting ? "..." : "إرسال رابط إعادة التعيين"}
          </button>
          <div className="auth-switch">
            تذكرت كلمة المرور؟ <Link to="/login">تسجيل الدخول</Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "./signup";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "إعادة تعيين كلمة المرور — إزهليها" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase puts a recovery session in the URL hash; the client picks it up.
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Also check if already in a session (e.g. opened the link from same tab)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else {
        // give the hash listener a moment
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: d2 }) => {
            if (!d2.session) setInvalid(true);
          });
        }, 1200);
      }
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate({ to: "/login" }), 1800);
  }

  return (
    <AuthShell title="إعادة تعيين كلمة المرور" sub="اختر كلمة مرور جديدة لحسابك">
      {done ? (
        <div className="auth-form" style={{ textAlign: "center", gap: 12 }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <p style={{ margin: 0 }}>تم تحديث كلمة المرور بنجاح. سيتم تحويلك لتسجيل الدخول...</p>
        </div>
      ) : invalid ? (
        <div className="auth-form" style={{ textAlign: "center", gap: 12 }}>
          <p style={{ margin: 0 }}>الرابط غير صالح أو منتهي الصلاحية.</p>
          <a className="auth-btn" href="/forgot-password" style={{ textDecoration: "none", textAlign: "center" }}>
            طلب رابط جديد
          </a>
        </div>
      ) : !ready ? (
        <p className="auth-form" style={{ textAlign: "center" }}>جارٍ التحقق من الرابط...</p>
      ) : (
        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field">
            <span>كلمة المرور الجديدة</span>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </label>
          <label className="auth-field">
            <span>تأكيد كلمة المرور</span>
            <input
              required
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" disabled={submitting}>
            {submitting ? "..." : "حفظ كلمة المرور الجديدة"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

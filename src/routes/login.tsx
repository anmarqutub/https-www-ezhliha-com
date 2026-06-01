import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AuthShell } from "./signup";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "تسجيل الدخول — إزهليها" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: isAdmin ? "/admin" : "/" });
  }, [session, isAdmin, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
  }

  return (
    <AuthShell title="تسجيل الدخول" sub="مرحبًا بعودتك إلى إزهليها">
      <form onSubmit={onSubmit} className="auth-form">
        <label className="auth-field">
          <span>البريد الإلكتروني</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" />
        </label>
        <label className="auth-field">
          <span>كلمة المرور</span>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-btn" disabled={submitting}>{submitting ? "..." : "تسجيل الدخول"}</button>
        <div className="auth-switch">
          ليس لديك حساب؟ <Link to="/signup">سجّل الآن</Link>
        </div>
      </form>
    </AuthShell>
  );
}

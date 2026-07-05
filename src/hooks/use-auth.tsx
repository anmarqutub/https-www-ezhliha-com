import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { claimSession, verifySession, heartbeat } from "@/lib/session.functions";
import { toast } from "sonner";

type Role = "admin" | "user";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: Role[];
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SID_KEY = "lov_device_sid";

function getOrCreateDeviceSid(): string {
  try {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now());
      localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return Math.random().toString(36).slice(2) + Date.now();
  }
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const claim = useServerFn(claimSession);
  const verify = useServerFn(verifySession);
  const beat = useServerFn(heartbeat);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const kickedRef = useRef(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => fetchRoles(s.user.id), 0);
        startHeartbeat();
        if (event === "SIGNED_IN") {
          // Reuse the persistent device sid for this browser. Do NOT rotate,
          // or every token refresh / tab focus would register a new device.
          const sid = getOrCreateDeviceSid();
          claim({ data: { sessionId: sid } })
            .then(async (res) => {
              if (res?.status === "pending") {
                kickedRef.current = true;
                stopPolling();
                stopHeartbeat();
                toast.error(
                  "هذا جهاز جديد. وصلت الحد المسموح (جهازين). الطلب مرسل للإدارة، تواصل معنا للموافقة.",
                  { duration: 8000 }
                );
                await supabase.auth.signOut();
              }
            })
            .catch(() => {});
        }
      } else {
        setRoles([]);
        stopPolling();
        stopHeartbeat();
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        startHeartbeat();
        fetchRoles(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    return () => {
      sub.subscription.unsubscribe();
      stopPolling();
      stopHeartbeat();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRoles(userId: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const rs = (data ?? []).map((r) => r.role as Role);
    setRoles(rs);
    // Start single-session enforcement only for non-admin users
    if (!rs.includes("admin")) {
      startPolling();
    } else {
      stopPolling();
    }
  }

  function startPolling() {
    if (pollRef.current) return;
    const tick = async () => {
      if (kickedRef.current) return;
      try {
        const sid = getOrCreateDeviceSid();
        const res = await verify({ data: { sessionId: sid } });
        if (!res.valid && !res.admin) {
          kickedRef.current = true;
          stopPolling();
          const msg = (res as { status?: string }).status === "pending"
            ? "بانتظار موافقة الإدارة على هذا الجهاز."
            : "تم إلغاء الوصول من هذا الجهاز.";
          toast.error(msg);
          await supabase.auth.signOut();
        }
      } catch {
        /* network blip — ignore */
      }
    };
    // immediate check, then every 20s
    tick();
    pollRef.current = setInterval(tick, 20000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startHeartbeat() {
    if (beatRef.current) return;
    const tick = async () => {
      try {
        const res = await beat();
        if (res?.suspended && !kickedRef.current) {
          kickedRef.current = true;
          stopHeartbeat();
          stopPolling();
          toast.error("تم تعليق حسابك. يرجى التواصل مع الإدارة.");
          await supabase.auth.signOut();
        }
      } catch {
        /* network blip — ignore */
      }
    };
    tick();
    beatRef.current = setInterval(tick, 60000);
  }

  function stopHeartbeat() {
    if (beatRef.current) {
      clearInterval(beatRef.current);
      beatRef.current = null;
    }
  }


  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    roles,
    isAdmin: roles.includes("admin"),
    loading,
    signOut: async () => {
      try {
        localStorage.removeItem(SID_KEY);
      } catch {
        /* ignore */
      }
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

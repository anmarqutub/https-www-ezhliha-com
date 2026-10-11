import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const KEY = "ez_loc_consent"; // "yes" | "no"
const LAST = "ez_loc_last";
const INTERVAL_MS = 30 * 60 * 1000;

function sendLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase.from("user_locations").insert({
        user_id: data.user.id,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        user_agent: navigator.userAgent,
      });
      localStorage.setItem(LAST, String(Date.now()));
    },
    () => {},
    { enableHighAccuracy: true, timeout: 15000 },
  );
}

export default function LocationConsent() {
  const { user } = useAuth();
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (!user) return;
    const c = localStorage.getItem(KEY);
    if (!c) { setAsk(true); return; }
    if (c === "yes" && Date.now() - Number(localStorage.getItem(LAST) || 0) > INTERVAL_MS) sendLocation();
  }, [user]);

  if (!user || !ask) return null;

  const answer = (yes: boolean) => {
    localStorage.setItem(KEY, yes ? "yes" : "no");
    setAsk(false);
    if (yes) sendLocation();
  };

  return (
    <div dir="rtl" style={{ position: "fixed", inset: 0, background: "rgba(20,12,10,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#FDFBF5", borderRadius: 16, padding: 22, maxWidth: 380, width: "100%", textAlign: "center", fontFamily: "inherit" }}>
        <div style={{ fontSize: 34 }}>📍</div>
        <h3 style={{ margin: "6px 0 8px", color: "#640000", fontSize: 18 }}>نبي نعرف موقعك</h3>
        <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.7, color: "#3a2e29" }}>
          عشان نحمي حسابك ونتأكد إن الدخول منك أنتِ، نحتاج موافقتك على معرفة موقعك على الخريطة. موقعك ما يشوفه إلا إدارة إزهليها.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => answer(true)} style={{ flex: 1, background: "#640000", color: "#fff", border: 0, borderRadius: 10, padding: "11px 0", fontWeight: 800, cursor: "pointer" }}>أوافق</button>
          <button onClick={() => answer(false)} style={{ flex: 1, background: "#fff", color: "#640000", border: "1px solid #640000", borderRadius: 10, padding: "11px 0", fontWeight: 700, cursor: "pointer" }}>لا، شكراً</button>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpLeft,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  LayoutGrid,
  MapPin,
  Menu,
  Search,
  Shapes,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import SiteFooter from "@/components/SiteFooter";
import logoUrl from "@/assets/logo.jpg";
import { SmartImg } from "@/components/SmartImg";
import HomeLanding, { HomeTopStrip } from "@/components/HomeLanding";
import { SocialImg } from "@/components/SocialImg";
import defaultProviderUrl from "@/assets/default-provider.jpg";
import catHalls from "@/assets/cats/halls.jpg";
import catDecor from "@/assets/cats/decor.jpg";
import catCatering from "@/assets/cats/catering.jpg";
import catInvites from "@/assets/cats/invites.jpg";
import catPhoto from "@/assets/cats/photo.jpg";
import catLook from "@/assets/cats/look.jpg";
import catSpa from "@/assets/cats/spa.jpg";
import catExtra from "@/assets/cats/extra.jpg";
import heroBride from "@/assets/home-banner.webp.asset.json";

export const Route = createFileRoute("/")({
  component: () => <HomePage view="home" />,
  head: () => ({
    meta: [
      { title: "إزهليها — دليلك لأحلى المناسبات" },
      {
        name: "description",
        content:
          "إزهليها — دليلك الأول لتجهيز مناسباتك بأفخم مقدمي الخدمات في المملكة، بضغطة زر.",
      },
      { property: "og:title", content: "إزهليها — دليلك لأحلى المناسبات" },
      {
        property: "og:description",
        content: "ابحث عن الضيافة والقاعات والتصوير والتجميل، قارن براحتك، وتواصل مباشرة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "إزهليها — دليلك لأحلى المناسبات" },
      {
        name: "twitter:description",
        content: "ابحث عن الضيافة والقاعات والتصوير والتجميل، قارن براحتك، وتواصل مباشرة.",
      },
    ],
  }),
});

type City = { id: string; name_ar: string; name_en: string; slug: string };
type Category = { id: string; name_ar: string; name_en: string; slug: string; icon: string | null; image_url: string | null };
type Subcategory = { id: string; category_id: string; parent_id: string | null; name_ar: string; name_en: string; slug: string };
type Provider = {
  id: string;
  subcategory_id: string;
  city_id: string;
  name: string;
  description: string | null;
  price_from: number | null;
  price_to: number | null;
  price: string | null;
  people_from: number | null;
  people_to: number | null;
  whatsapp: string | null;
  contact_phone: string | null;
  instagram: string | null;
  tiktok: string | null;
  twitter: string | null;
  snapchat: string | null;
  address: string | null;
  rating: number | null;
  is_featured: boolean;
  featured_until: string | null;
  sort_order: number;
};
type ProviderImage = { id: string; provider_id: string; image_url: string };
type Banner = { id: string; title: string | null; image_url: string; link_url: string | null };
type SiteText = { key: string; value: string };

export const WA_MESSAGE = "هلا والله .. جيتك من موقع إزهليها 🤍";
export const CONTACT_WA_NUMBER = "+966573444242"; // رقم تواصل معنا (قابل للتغيير لاحقاً)
export const CONTACT_WA_MESSAGE = "اهلا ازهليها ، عندي استفسار 😎🤍";

const REF_IMAGES = [catCatering, catHalls, catPhoto, catLook];

export function fallbackCategoryImage(name: string, index: number) {
  const n = name || "";
  if (/ضياف|بوفيه|طعام|مأكول|قهو/.test(n)) return catCatering;
  if (/قاع|استراح|مكان|فيلا|شاليه/.test(n)) return catHalls;
  if (/تنسيق|تصميم|ديكور|زهور|ورد/.test(n)) return catDecor;
  if (/دعو|بطاق/.test(n)) return catInvites;
  if (/تصوير|فيديو|كامي|توثيق/.test(n)) return catPhoto;
  if (/إطلال|اطلال|تجميل|شعر|مكياج|عناي|فست|عبا/.test(n)) return catLook;
  if (/سبا|مساج|منزلي/.test(n)) return catSpa;
  if (/إضاف|اضاف|أخرى|اخرى/.test(n)) return catExtra;
  return REF_IMAGES[index % REF_IMAGES.length];
}


export type EzView = "home" | "providers" | "categories" | "cities" | "faq" | "about";

// فلاتر مؤقتة تنتقل بين الصفحات (من التصنيفات/المدن إلى صفحة مقدمي الخدمات)
export const pendingFilters: { categoryId?: string | null; cityId?: string; subId?: string } = {};

export function HomePage({ view = "home" }: { view?: EzView }) {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const pendingApplied = useRef(false);


  useEffect(() => {
    if (pendingFilters.categoryId !== undefined) setSelectedCategory(pendingFilters.categoryId ?? null);
    if (pendingFilters.cityId !== undefined) setSelectedCity(pendingFilters.cityId);
    if (pendingFilters.subId !== undefined) setSelectedSub(pendingFilters.subId);
    if (
      pendingFilters.categoryId !== undefined ||
      pendingFilters.cityId !== undefined ||
      pendingFilters.subId !== undefined
    ) {
      pendingApplied.current = true;
    }
    pendingFilters.categoryId = undefined;
    pendingFilters.cityId = undefined;
    pendingFilters.subId = undefined;
  }, []);
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaCat, setMegaCat] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [images, setImages] = useState<ProviderImage[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [branchCities, setBranchCities] = useState<{ provider_id: string; city_id: string | null }[]>([]);
  const [serviceTags, setServiceTags] = useState<{ provider_id: string; name: string }[]>([]);
  const [siteTexts, setSiteTexts] = useState<Record<string, string>>({});
  const [bannerIdx, setBannerIdx] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [quickSearch, setQuickSearch] = useState("");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [capacityRange, setCapacityRange] = useState<string>("all");
  const [favOnly, setFavOnly] = useState(false);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());


  useEffect(() => {
    (async () => {
      const [cRes, catRes, subRes, pRes, imgRes, bRes, txtRes, brRes, svcRes] = await Promise.all([
        supabase.from("cities").select("*").eq("active", true).order("sort_order"),
        supabase.from("categories").select("*").eq("active", true).order("sort_order"),
        supabase.from("subcategories").select("*").eq("active", true).order("sort_order"),
        supabase
          .from("providers")
          .select("*")
          .eq("active", true)
          .order("is_featured", { ascending: false })
          .order("sort_order"),
        supabase.from("provider_images").select("*").order("sort_order"),
        supabase.from("banners").select("*").eq("active", true).order("sort_order"),
        supabase.from("site_texts").select("key,value"),
        supabase.from("branches").select("provider_id,city_id"),
        supabase.from("services").select("provider_id,name").order("sort_order"),
      ]);
      setCities((cRes.data ?? []) as City[]);
      setSelectedCity("");
      setCategories((catRes.data ?? []) as Category[]);
      setSubcategories((subRes.data ?? []) as Subcategory[]);
      setProviders((pRes.data ?? []) as Provider[]);
      setImages((imgRes.data ?? []) as ProviderImage[]);
      setBanners((bRes.data ?? []) as Banner[]);
      setBranchCities((brRes.data ?? []) as { provider_id: string; city_id: string | null }[]);
      setServiceTags((svcRes.data ?? []) as { provider_id: string; name: string }[]);

      setSiteTexts(Object.fromEntries(((txtRes.data ?? []) as SiteText[]).map((x) => [x.key, x.value])));
      setLoading(false);
    })();
  }, []);

  // المفضلة الخاصة بالمستخدم
  useEffect(() => {
    if (!user) { setFavIds(new Set()); return; }
    supabase.from("favorites").select("provider_id").eq("user_id", user.id).then(({ data }) => {
      setFavIds(new Set(((data ?? []) as { provider_id: string }[]).map((f) => f.provider_id)));
    });
  }, [user]);

  const toggleFav = useCallback(async (providerId: string) => {
    if (!user) return;
    let wasFav = false;
    setFavIds((prev) => {
      const next = new Set(prev);
      wasFav = next.has(providerId);
      if (wasFav) next.delete(providerId); else next.add(providerId);
      return next;
    });
    if (wasFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("provider_id", providerId);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, provider_id: providerId });
    }
  }, [user]);




  const txt = (key: string, fallback: string) => siteTexts[key] || fallback;
  const statNumber = (key: string, auto: number) => {
    const raw = (siteTexts[key] ?? "").replace(/[^\d]/g, "");
    return raw ? Number(raw) : auto;
  };
  const contactLabel = siteTexts["provider.whatsapp.label"] || "للمزيد من التفاصيل";

  // Scroll to hash target after data loads (links coming from inner pages)
  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => clearTimeout(t);
  }, [loading]);

  // On the providers page, jump straight to the results section
  useEffect(() => {
    if (view !== "providers" || loading || typeof window === "undefined") return;
    if (window.location.hash) return;
    const t = setTimeout(() => {
      const el = document.getElementById("ez-results");
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
    }, 160);
    return () => clearTimeout(t);
  }, [view, loading]);

  // Banner rotator
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const imgsByProvider = useMemo(() => {
    const m = new Map<string, ProviderImage[]>();
    images.forEach((i) => {
      const arr = m.get(i.provider_id) ?? [];
      arr.push(i);
      m.set(i.provider_id, arr);
    });
    return m;
  }, [images]);

  const tagsByProvider = useMemo(() => {
    const m = new Map<string, string[]>();
    // الوسوم تأتي فقط من جدول «الخدمات» الذي يضيفه الأدمن (لا نستنتجها من الوصف)
    serviceTags.forEach((s) => {
      const name = (s.name ?? "")
        .replace(/[()\[\]{}（）]/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (!name || name.length < 2) return;
      const arr = m.get(s.provider_id) ?? [];
      if (arr.length < 3 && !arr.includes(name)) arr.push(name);
      m.set(s.provider_id, arr);
    });
    return m;
  }, [serviceTags]);





  const providerCityIds = useMemo(() => {
    const m = new Map<string, Set<string>>();
    providers.forEach((p) => {
      const s = new Set<string>();
      if (p.city_id) s.add(p.city_id);
      m.set(p.id, s);
    });
    branchCities.forEach((b) => {
      if (!b.city_id) return;
      const s = m.get(b.provider_id);
      if (s) s.add(b.city_id);
    });
    return m;
  }, [providers, branchCities]);

  const matchesCity = (p: Provider) =>
    !selectedCity || (providerCityIds.get(p.id)?.has(selectedCity) ?? false);

  const visibleSubs = selectedCategory
    ? subcategories.filter((s) => s.category_id === selectedCategory && !s.parent_id)
    : [];

  // في قائمة "نوع الخدمة" نعرض كل الأنواع إذا ما تم اختيار تصنيف
  const consoleSubs = selectedCategory
    ? visibleSubs
    : subcategories.filter((s) => !s.parent_id);

  const visibleTertiaries =
    selectedSub !== "all" ? subcategories.filter((s) => s.parent_id === selectedSub) : [];


  const providersCountByCat = useMemo(() => {
    const m = new Map<string, number>();
    const subToCat = new Map(subcategories.map((s) => [s.id, s.category_id]));
    providers.forEach((p) => {
      if (!matchesCity(p)) return;
      const cat = subToCat.get(p.subcategory_id);
      if (!cat) return;
      m.set(cat, (m.get(cat) ?? 0) + 1);
    });
    return m;
  }, [providers, subcategories, selectedCity, providerCityIds]);

  const providersCountByCity = useMemo(() => {
    const m = new Map<string, number>();
    providers.forEach((p) => {
      providerCityIds.get(p.id)?.forEach((cid) => m.set(cid, (m.get(cid) ?? 0) + 1));
    });
    return m;
  }, [providers, providerCityIds]);

  const subMatches = (providerSubId: string, selSub: string) => {
    if (providerSubId === selSub) return true;
    const ps = subcategories.find((s) => s.id === providerSubId);
    return !!ps && ps.parent_id === selSub;
  };

  const q = quickSearch.trim().toLowerCase();

  const PRICE_BANDS: Array<{ id: string; label: string; min: number; max: number }> = [
    { id: "all", label: txt("filter.price.all", "كل الأسعار"), min: 0, max: Infinity },
    { id: "lt5000", label: txt("filter.price.1", "أقل من 5,000 ر.س"), min: 0, max: 5000 },
    { id: "5000-10000", label: txt("filter.price.2", "من 5,000 إلى 10,000 ر.س"), min: 5000, max: 10000 },
    { id: "10000-20000", label: txt("filter.price.3", "من 10,000 إلى 20,000 ر.س"), min: 10000, max: 20000 },
    { id: "gt20000", label: txt("filter.price.4", "أكثر من 20,000 ر.س"), min: 20000, max: Infinity },
  ];

  const CAPACITY_BANDS: Array<{ id: string; label: string; min: number; max: number }> = [
    { id: "all", label: txt("filter.capacity.all", "كل السعات"), min: 0, max: Infinity },
    { id: "lt100", label: txt("filter.capacity.1", "أقل من 100 ضيف"), min: 0, max: 100 },
    { id: "100-200", label: txt("filter.capacity.2", "من 100 إلى 200 ضيف"), min: 100, max: 200 },
    { id: "200-300", label: txt("filter.capacity.3", "من 200 إلى 300 ضيف"), min: 200, max: 300 },
    { id: "300-500", label: txt("filter.capacity.4", "من 300 إلى 500 ضيف"), min: 300, max: 500 },
    { id: "500-700", label: txt("filter.capacity.5", "من 500 إلى 700 ضيف"), min: 500, max: 700 },
  ];

  const matchesPrice = (p: Provider) => {
    if (priceRange === "all") return true;
    const band = PRICE_BANDS.find((b) => b.id === priceRange);
    if (!band) return true;
    const val = p.price_from ?? p.price_to;
    if (val == null) return false;
    return val >= band.min && val < band.max;
  };

  const matchesCapacity = (p: Provider) => {
    if (capacityRange === "all") return true;
    const band = CAPACITY_BANDS.find((b) => b.id === capacityRange);
    if (!band) return true;
    const from = p.people_from ?? p.people_to;
    const to = p.people_to ?? p.people_from;
    if (from == null || to == null) return false;
    // تداخل نطاق سعة القاعة مع النطاق المختار
    return from < band.max && to >= band.min;
  };

  // هل التصنيف الحالي هو القاعات (لعرض فلتر السعة)
  const isVenueCategory = (() => {
    const cat = categories.find((c) => c.id === selectedCategory);
    if (cat) return /قاع|استراح/.test(cat.name_ar);
    return false;
  })();

  // كل الفلاتر ما عدا «نوع الخدمة» — تستخدم لحساب الأعداد في القائمة الجانبية
  const baseResults = providers.filter((p) => {
    if (!matchesCity(p)) return false;
    const sub = subcategories.find((s) => s.id === p.subcategory_id);
    if (!sub) return false;
    if (selectedCategory && sub.category_id !== selectedCategory) return false;
    if (!matchesPrice(p)) return false;
    if (isVenueCategory && !matchesCapacity(p)) return false;
    if (favOnly && !favIds.has(p.id)) return false;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !(p.description ?? "").toLowerCase().includes(s)) return false;
    }
    if (q) {
      const cat = categories.find((c) => c.id === sub.category_id);
      const hit =
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (sub.name_ar ?? "").toLowerCase().includes(q) ||
        (cat?.name_ar ?? "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const results = baseResults.filter(
    (p) => selectedSub === "all" || subMatches(p.subcategory_id, selectedSub)
  );

  // قائمة أنواع الخدمة الظاهرة في الشريط الجانبي مع عدد النتائج لكل نوع
  const sidebarSubs = (selectedCategory
    ? subcategories.filter((s) => s.category_id === selectedCategory && !s.parent_id)
    : subcategories.filter((s) => !s.parent_id)
  ).map((s) => ({
    ...s,
    count: baseResults.filter((p) => subMatches(p.subcategory_id, s.id)).length,
  }));

  const filtersActive = !!(
    q || selectedCategory || selectedCity || selectedSub !== "all" || search.trim() || priceRange !== "all" ||
    capacityRange !== "all" || favOnly
  );


  const featured = results.filter(
    (p) => p.is_featured && (!p.featured_until || new Date(p.featured_until) > new Date())
  );
  const featuredIds = useMemo(() => new Set(featured.map((p) => p.id)), [featured]);
  const regular = results.filter((p) => !featuredIds.has(p.id));

  // خرائط بحث سريعة (بدل find داخل الرندر لكل بطاقة)
  const cityById = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities]);
  const subById = useMemo(() => new Map(subcategories.map((s) => [s.id, s])), [subcategories]);

  // تحميل تدريجي للنتائج لتقليل زمن الرندر الأولي
  const PAGE = 18;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const keepCountRef = useRef<number | null>(null);
  const resultsKey = `${q}|${selectedCategory}|${selectedCity}|${selectedSub}|${priceRange}|${capacityRange}|${favOnly}|${search}`;
  useEffect(() => {
    // عند الرجوع من صفحة مزود نبقي نفس عدد النتائج المعروضة
    if (keepCountRef.current != null) {
      setVisibleCount(keepCountRef.current);
      keepCountRef.current = null;
      return;
    }
    setVisibleCount(PAGE);
  }, [resultsKey]);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisibleCount((c) => c + PAGE);
    }, { rootMargin: "600px 0px" });
    io.observe(node);
    return () => io.disconnect();
  }, [regular.length, view]);
  const visibleRegular = regular.slice(0, Math.max(0, visibleCount - featured.length));


  const homeFeatured = useMemo(
    () =>
      providers
        .filter((p) => p.is_featured && (!p.featured_until || new Date(p.featured_until) > new Date()))
        .slice(0, 6),
    [providers]
  );
  const showcase = homeFeatured.length > 0 ? homeFeatured : providers.slice(0, 6);

  const activeCategory = categories.find((c) => c.id === selectedCategory);
  const currentBanner = banners[bannerIdx];

  const scrollToResults = () => {
    if (view !== "providers") {
      pendingFilters.categoryId = selectedCategory;
      pendingFilters.cityId = selectedCity;
      navigate({ to: "/providers" });
      return;
    }
    document.getElementById("ez-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goProviders = (patch: { categoryId?: string | null; cityId?: string; subId?: string }) => {
    if (patch.categoryId !== undefined) {
      pendingFilters.categoryId = patch.categoryId;
      setSelectedCategory(patch.categoryId);
      setSelectedSub("all");
    }
    if (patch.subId !== undefined) {
      pendingFilters.subId = patch.subId;
      setSelectedSub(patch.subId);
    }
    if (patch.cityId !== undefined) {
      pendingFilters.cityId = patch.cityId;
      setSelectedCity(patch.cityId);
    }
    if (view !== "providers") navigate({ to: "/providers" });
    else setTimeout(() => document.getElementById("ez-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  // حفظ نقطة التصفح قبل الانتقال لصفحة مقدم الخدمة، لاسترجاعها عند الرجوع
  const saveBrowseState = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        "ez-browse-state",
        JSON.stringify({
          view,
          selectedCity,
          selectedCategory,
          selectedSub,
          search,
          quickSearch,
          priceRange,
          capacityRange,
          favOnly,
          visibleCount,
          scrollY: window.scrollY,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [view, selectedCity, selectedCategory, selectedSub, search, quickSearch, priceRange, capacityRange, favOnly, visibleCount]);

  const restoreRef = useRef<number | null>(null);
  const persistReady = useRef(false);
  // استرجاع الفلاتر ونقطة التصفح عند العودة للصفحة (رجوع للخلف أو إعادة فتح)
  useEffect(() => {
    if (typeof window === "undefined") return;
    // إذا جاء المستخدم من التصنيفات/المدن باختيار جديد، نحترم الاختيار الجديد
    if (
      pendingApplied.current ||
      pendingFilters.categoryId !== undefined ||
      pendingFilters.cityId !== undefined ||
      pendingFilters.subId !== undefined
    )
      return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem("ez-browse-state");
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      if (s.view !== view) return;
      setSelectedCity(s.selectedCity ?? "");
      setSelectedCategory(s.selectedCategory ?? null);
      setSelectedSub(s.selectedSub ?? "all");
      setSearch(s.search ?? "");
      setQuickSearch(s.quickSearch ?? "");
      setPriceRange(s.priceRange ?? "all");
      setCapacityRange(s.capacityRange ?? "all");
      setFavOnly(!!s.favOnly);
      keepCountRef.current = Math.max(PAGE, s.visibleCount ?? PAGE);
      setVisibleCount(keepCountRef.current);
      restoreRef.current = typeof s.scrollY === "number" ? s.scrollY : null;
    } catch {
      /* ignore */
    }
  }, []);

  // حفظ الفلاتر تلقائياً كل ما تغيرت، حتى يبقى التصفح كما هو عند الرجوع
  useEffect(() => {
    if (view !== "providers") return;
    if (!persistReady.current) {
      persistReady.current = true;
      return;
    }
    saveBrowseState();
  }, [view, saveBrowseState]);

  // استرجاع موضع التمرير بعد ما تجهز البيانات
  useEffect(() => {
    if (loading || restoreRef.current == null || typeof window === "undefined") return;
    const y = restoreRef.current;
    restoreRef.current = null;
    const t = setTimeout(() => window.scrollTo({ top: y, behavior: "auto" }), 80);
    return () => clearTimeout(t);
  }, [loading]);




  const resetAll = () => {
    setSelectedCategory(null);
    setSelectedSub("all");
    setSelectedCity("");
    setSearch("");
    setQuickSearch("");
    setPriceRange("all");
    setCapacityRange("all");
    setFavOnly(false);
  };


  const faqs = [
    { q: txt("faq.q1", "كيف أتواصل مع مقدم الخدمة؟"), a: txt("faq.a1", "افتح ملف مقدم الخدمة وبتلقى الواتساب والجوال وحسابات التواصل والفروع كلها في مكان واحد.") },
    { q: txt("faq.q2", "هل الأسعار نهائية؟"), a: txt("faq.a2", "الأسعار تقريبية للاسترشاد، والسعر النهائي يتحدد مع مقدم الخدمة حسب تفاصيل مناسبتك.") },
    { q: txt("faq.q3", "وين ألقى الخدمات اللي حفظتها؟"), a: txt("faq.a3", "من صفحة «المفضلة» في حسابك، وتبقى اختياراتك محفوظة دائماً.") },
    { q: txt("faq.q4", "كيف أضيف مقدم خدمة للموقع؟"), a: txt("faq.a4", "تواصل معنا عبر الواتساب ونرتب لك إضافة ملفك بكل تفاصيله.") },
  ];

  type NavItem = { label: string; to?: string; href?: string; active?: boolean };
  const navItems: NavItem[] = [
    { label: txt("nav.home", "الرئيسية"), to: "/", active: view === "home" },
    { label: txt("nav.providers", "مقدمي الخدمات"), to: "/providers", active: view === "providers" },
    { label: txt("nav.categories", "التصنيفات"), to: "/categories", active: view === "categories" },
    ...(user ? [{ label: txt("nav.favorites", "المفضلة"), to: "/favorites" } as NavItem] : []),
    { label: txt("footer.about", "من نحن"), to: "/about", active: view === "about" },
    { label: txt("nav.faq", "الأسئلة الشائعة"), to: "/faq", active: view === "faq" },
    { label: txt("nav.contact", "تواصل معنا"), href: waLink(CONTACT_WA_NUMBER, CONTACT_WA_MESSAGE) ?? "#" },
  ];

  const renderMega = (onPick?: () => void) => (
    <div className="ez-acc">
      <button
        type="button"
        className="ez-acc-all"
        onClick={() => {
          setSearch("");
          setQuickSearch("");
          onPick?.();
          goProviders({ categoryId: null });
        }}
      >
        <LayoutGrid size={15} />
        {txt("categories.all", "مشاهدة الكل")}
      </button>

      {categories.map((c, i) => {
        const open = megaCat === c.id;
        const subs = subcategories.filter((s) => s.category_id === c.id && !s.parent_id);
        return (
          <div key={c.id} className={`ez-acc-item ${open ? "open" : ""}`}>
            <div className="ez-acc-row">
              <button
                type="button"
                className="ez-acc-name"
                onClick={() => {
                  setSearch("");
                  setQuickSearch("");
                  onPick?.();
                  goProviders({ categoryId: c.id });
                }}
              >
                <img src={c.image_url || fallbackCategoryImage(c.name_ar, i)} alt="" loading="lazy" decoding="async" />
                <span>{c.name_ar}</span>
              </button>
              {subs.length > 0 && (
                <button
                  type="button"
                  className="ez-acc-tog"
                  aria-expanded={open}
                  aria-label={c.name_ar}
                  onClick={() => setMegaCat(open ? null : c.id)}
                >
                  <ChevronDown size={16} className={open ? "open" : ""} />
                </button>
              )}
            </div>

            {open && (
              <div className="ez-acc-subs">
                <button
                  type="button"
                  className="ez-acc-sub all"
                  onClick={() => {
                    setSearch("");
                    setQuickSearch("");
                    onPick?.();
                    goProviders({ categoryId: c.id });
                  }}
                >
                  {txt("mega.allIn", "كل الخدمات")}
                </button>
                {subs.map((s) => {
                  const kids = subcategories.filter((k) => k.parent_id === s.id);
                  return (
                    <div key={s.id} className="ez-acc-sub-group">
                      <button
                        type="button"
                        className="ez-acc-sub"
                        onClick={() => {
                          setSearch("");
                          setQuickSearch("");
                          onPick?.();
                          goProviders({ categoryId: s.category_id, subId: s.id });
                        }}
                      >
                        {s.name_ar}
                      </button>
                      {kids.map((k) => (
                        <button
                          key={k.id}
                          type="button"
                          className="ez-acc-sub kid"
                          onClick={() => {
                            setSearch("");
                            setQuickSearch("");
                            onPick?.();
                            goProviders({ categoryId: s.category_id, subId: s.id });
                          }}
                        >
                          {k.name_ar}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );


  if (!authLoading && !user) {
    return <AuthGate />;
  }

  return (
    <div dir="rtl" className="ez-root">
      <style>{css}</style>

      {view === "home" && (
        <HomeTopStrip text={txt("hl.topbar", "أزهليها، دليلكِ لكل متطلبات مناسبتكِ")} />
      )}

      <header className="ez-nav">
        <button
          type="button"
          className="ez-burger"
          aria-label={txt("nav.menu", "القائمة")}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={22} />
        </button>

        <Link to="/" className="ez-brand" aria-label="الرئيسية">
          <img src={logoUrl} alt="إزهليها" className="ez-brand-logo" />
        </Link>

        <nav className="ez-nav-menu">
          <div className="ez-mega-wrap">
            <button
              type="button"
              className={`ez-nav-link ez-mega-trigger ${megaOpen ? "open" : ""}`}
              onClick={() => setMegaOpen((v) => !v)}
              aria-expanded={megaOpen}
            >
              <LayoutGrid size={15} />
              {txt("nav.allCats", "جميع الأقسام")}
              <ChevronDown size={14} />
            </button>
            {megaOpen && categories.length > 0 && (
              <div className="ez-mega-pop">{renderMega(() => setMegaOpen(false))}</div>
            )}
          </div>
          {navItems.map((it) =>
            it.href ? (
              <a key={it.label} className="ez-nav-link" href={it.href} target="_blank" rel="noopener noreferrer">{it.label}</a>
            ) : (
              <Link key={it.label} to={it.to!} className={`ez-nav-link ${it.active ? "active" : ""}`}>{it.label}</Link>
            )
          )}
        </nav>



        <div className="ez-nav-actions">
          {!user && (
            <>
              <Link to="/login" className="ez-nav-link">{txt("nav.login", "دخول")}</Link>
              <Link to="/signup" className="ez-nav-btn">{txt("nav.signup", "تسجيل")}</Link>
            </>
          )}
          {user && (
            <>
              {isAdmin && <Link to="/admin" className="ez-nav-link">{txt("nav.admin", "لوحة الأدمن")}</Link>}
              <button type="button" className="ez-nav-cta" onClick={scrollToResults}>
                <Search size={16} strokeWidth={2} /> {txt("nav.cta", "ابحث عن مقدم خدمة")}
              </button>
              <AccountMenu email={user.email ?? ""} onSignOut={signOut} texts={siteTexts} />
            </>
          )}
        </div>
      </header>

      {menuOpen && (
        <div className="ez-drawer-overlay" onClick={() => setMenuOpen(false)}>
          <aside className="ez-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ez-drawer-head">
              <img src={logoUrl} alt="إزهليها" />
              <button type="button" className="ez-drawer-close" onClick={() => setMenuOpen(false)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <nav className="ez-drawer-menu">
              {navItems.map((it) =>
                it.href ? (
                  <a key={it.label} href={it.href} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
                    {it.label}
                  </a>
                ) : (
                  <Link key={it.label} to={it.to!} className={it.active ? "active" : ""} onClick={() => setMenuOpen(false)}>
                    {it.label}
                    {it.to === "/favorites" && <small>{favIds.size}</small>}
                  </Link>
                )
              )}
              {user && isAdmin && (
                <Link to="/admin" onClick={() => setMenuOpen(false)}>{txt("nav.admin", "لوحة الأدمن")}</Link>
              )}
            </nav>
            {categories.length > 0 && (
              <div className="ez-drawer-cats">
                <p className="ez-drawer-cats-title">{txt("nav.allCats", "جميع الأقسام")}</p>
                {renderMega(() => setMenuOpen(false))}
              </div>
            )}
            <div className="ez-drawer-cta">
              <span className="ez-drawer-cta-ico">✨</span>
              <p>{txt("drawer.cta.text", "حدد التصنيف والخدمة والمدينة، ونطلع لك الخيارات اللي تناسبك.")}</p>
              <Link to="/providers" className="ez-drawer-cta-btn" onClick={() => setMenuOpen(false)}>
                {txt("drawer.cta.btn", "ابدأ التصفح")}
              </Link>
            </div>
          </aside>
        </div>
      )}

      {view !== "home" && (
        <div className="ez-backhome">
          <Link to="/">
            <ArrowLeft size={14} strokeWidth={2} />
            {txt("nav.home", "الرئيسية")}
          </Link>
        </div>
      )}

      {/* ── LUXURY LANDING (home) ── */}
      {view === "home" && (
        <HomeLanding
          txt={txt}
          categories={categories}
          cityCount={cities.length}
          providerCount={providers.length}
          favCount={favIds.size}
          heroImage={heroBride.url}
          banner={currentBanner ?? null}
          showcase={showcase}
          renderProviderCard={(id) => {
            const p = providers.find((x) => x.id === id);
            if (!p) return null;
            return (
              <ProviderCard
                key={p.id}
                provider={p}
                city={cityById.get(p.city_id)}
                sub={subById.get(p.subcategory_id)}
                images={imgsByProvider.get(p.id) ?? []}
                tags={tagsByProvider.get(p.id) ?? []}
                contactLabel={contactLabel}
                featured={p.is_featured}
                isFav={favIds.has(p.id)}
                onToggleFav={user ? toggleFav : undefined}
                onOpen={saveBrowseState}
              />
            );
          }}
          onExploreCategory={(categoryId) => {
            setSearch("");
            setQuickSearch("");
            goProviders({ categoryId });
          }}
        />
      )}

      {/* ── HERO ── */}
      {view === "providers" && (
      <section className="ez-hero">
        {/* Search console */}
        <div className="ez-console">
          <div className="ez-console-field">
            <label><Shapes size={14} className="ez-fi" /> {txt("console.category", "التصنيف")}</label>
            <select
              value={selectedCategory ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedCategory(v || null);
                setSelectedSub("all");
              }}
            >
              <option value="">{txt("console.category.all", "كل التصنيفات")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
            </select>

          </div>
          <div className="ez-console-field">
            <label><SlidersHorizontal size={14} className="ez-fi" /> {txt("console.sub", "نوع الخدمة")}</label>
            <select value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)}>
              <option value="all">{txt("console.sub.all", "كل الخدمات")}</option>
              {consoleSubs.map((s) => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
              {visibleTertiaries.map((t) => <option key={t.id} value={t.id}>{t.name_ar}</option>)}
            </select>
          </div>

          <div className="ez-console-field">
            <label><MapPin size={14} className="ez-fi" /> {txt("console.city", "المدينة")}</label>
            <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
              <option value="">{txt("home.city.all", "كل المدن")}</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </div>
          <button type="button" className="ez-console-btn" onClick={scrollToResults}>
            <Search size={16} /> {txt("console.cta", "ابحث الآن")}
          </button>
        </div>

        {filtersActive && (
          <div className="ez-fchips">
            {activeCategory && (
              <button type="button" className="ez-fchip" onClick={() => { setSelectedCategory(null); setSelectedSub("all"); }}>
                {activeCategory.name_ar} ×
              </button>
            )}
            {selectedSub !== "all" && (
              <button type="button" className="ez-fchip" onClick={() => setSelectedSub("all")}>
                {subcategories.find((s) => s.id === selectedSub)?.name_ar} ×
              </button>
            )}
            {selectedCity && (
              <button type="button" className="ez-fchip" onClick={() => setSelectedCity("")}>
                {cities.find((c) => c.id === selectedCity)?.name_ar} ×
              </button>
            )}
            {(quickSearch.trim() || search.trim()) && (
              <button type="button" className="ez-fchip" onClick={() => { setQuickSearch(""); setSearch(""); }}>
                «{quickSearch.trim() || search.trim()}» ×
              </button>
            )}
            <button type="button" className="ez-fchip ez-fchip-clear" onClick={resetAll}>
              {txt("console.reset", "مسح الفلاتر")}
            </button>
            <span className="ez-fchips-count">{results.length} نتيجة</span>
          </div>
        )}



      </section>
      )}

      {/* ── PLATFORM STATS ── */}
      {view === "home" && (
      <section className="ez-stats" aria-label="أرقام إزهليها">
        <div className="ez-stat ez-stat--solo">
          <span className="ez-stat-icon"><Building2 size={16} /></span>
          <div>
            <strong>
              أكثر من <CountUp value={statNumber("stat.providers.value", providers.length)} /> {txt("stat.providers", "مقدم خدمة")}
            </strong>
          </div>
        </div>
      </section>
      )}


      {/* ── ADS / BANNERS ── */}
      {view === "home" && banners.length > 0 && currentBanner && (
        <section className="ez-ad-sec" aria-label="إعلان">
          <div className="ez-ad">
            <div className="ez-ad-media">
              <SmartImg src={currentBanner.image_url} alt={currentBanner.title ?? "إعلان"} loading="lazy" />
            </div>
            <div className="ez-ad-body">
              <div className="ez-ad-tags">
                <span className="ez-ad-tag">{txt("ad.tag", "إعلان")}</span>
                <span className="ez-ad-partner">🔖 {txt("ad.partner", "عرض شريك إزهليها")}</span>
              </div>
              <h2 className="ez-ad-title">{currentBanner.title || txt("ad.title", "مساحة إعلانية لشركائنا")}</h2>
              <p className="ez-ad-desc">{txt("ad.desc", "مساحة إعلانية تتغير صورتها ونصها ورابطها حسب حملة العميل، من دون ما تزاحم رحلة التصفح.")}</p>
              {currentBanner.link_url && (
                <a className="ez-ad-cta" href={currentBanner.link_url} target="_blank" rel="noopener noreferrer">
                  {txt("ad.cta", "شوف تفاصيل العرض")} ←
                </a>
              )}
              {banners.length > 1 && (
                <div className="ez-ad-dots">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={i === bannerIdx ? "active" : ""}
                      onClick={() => setBannerIdx(i)}
                      aria-label={`إعلان ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}





      {/* ── CATEGORIES ── */}
      {view === "categories" && (
      <section className="ez-sec" id="ez-categories">
        <div className="ez-cats-head">
          <div>
            <div className="ez-eyebrow"><span className="ez-eyebrow-line" />{txt("categories.eyebrow", "التصنيفات")}</div>
            <h2 className="ez-h2">{txt("categories.title", "تصفّحي حسب الفئات")}</h2>
          </div>
        </div>

        {loading ? (
          <p className="ez-empty">{txt("home.loading", "لحظات.. نجهّز لك كل شي ✨")}</p>
        ) : categories.length === 0 ? (
          <p className="ez-empty">
            {txt("home.categories.empty", "ما فيه تصنيفات لحد الحين.")} {isAdmin && <Link to="/admin">افتح لوحة الأدمن وأضِف تصنيفات.</Link>}
          </p>
        ) : (
          <div className="ez-cat-grid" id="ez-cat-rail">
            <button
              type="button"
              className="ez-cat-tile"
              onClick={() => {
                setSearch("");
                setQuickSearch("");
                goProviders({ categoryId: null });
              }}
            >
              <span className="ez-cat-thumb ez-cat-thumb-all"><LayoutGrid size={26} /></span>
              <span className="ez-cat-label">{txt("categories.all", "مشاهدة الكل")}</span>
            </button>
            {categories.map((c, i) => {
              const img = c.image_url || fallbackCategoryImage(c.name_ar, i);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`ez-cat-tile ${selectedCategory === c.id ? "active" : ""}`}
                  onClick={() => {
                    setSearch("");
                    setQuickSearch("");
                    goProviders({ categoryId: c.id });
                  }}
                >
                  <span className="ez-cat-thumb">
                    <img src={img} alt={c.name_ar} loading="lazy" decoding="async" />
                  </span>
                  <span className="ez-cat-label">{c.name_ar}</span>
                </button>
              );
            })}
          </div>
        )}

        {!loading && categories.length > 0 && (
          <div className="ez-mega-inline">{renderMega()}</div>
        )}
      </section>
      )}


      {/* ── CITIES ── */}
      {view === "cities" && (
      <section className="ez-sec" id="ez-cities">
        <div className="ez-eyebrow"><span className="ez-eyebrow-line" />{txt("cities.eyebrow", "المدن")}</div>
        <h2 className="ez-h2">{txt("cities.title", "اختر مدينتك")}</h2>
        <p className="ez-muted">{txt("cities.desc", "اضغط على المدينة وبنعرض لك مقدمي الخدمات المتوفرين فيها.")}</p>
        {loading ? (
          <p className="ez-empty">{txt("home.loading", "لحظات.. نجهّز لك كل شي ✨")}</p>
        ) : cities.length === 0 ? (
          <p className="ez-empty">{txt("cities.empty", "ما فيه مدن مضافة لحد الحين.")}</p>
        ) : (
          <div className="ez-city-grid">
            {cities.map((c) => (
              <button key={c.id} type="button" className="ez-city-card" onClick={() => goProviders({ cityId: c.id })}>
                <span className="ez-city-ico"><MapPin size={16} /></span>
                <span className="ez-city-name">{c.name_ar}</span>
                <span className="ez-city-count">
                  {(providersCountByCity.get(c.id) ?? 0) > 0
                    ? `${providersCountByCity.get(c.id)} ${txt("home.category.count_suffix", "مقدم خدمة")}`
                    : txt("home.category.coming_soon", "قريباً")}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      )}

      {/* ── ABOUT PAGE ── */}
      {view === "about" && (
      <section className="ez-sec" id="ez-about">
        <div className="ez-eyebrow"><span className="ez-eyebrow-line" />{txt("footer.about", "من نحن")}</div>
        <h2 className="ez-h2">{txt("home.about.title", "من نحن")}</h2>
        <div className="ez-about-page">
          <p>{txt("home.about.p1", "إزهليها منصتك الأولى لتجهيز مناسباتك في المملكة العربية السعودية. نجمع لك في مكان واحد نخبة من أفخم مقدمي الخدمات وكل اللي تحتاجه عشان يومك يطلع على الأصول 🤍")}</p>
          <p>{txt("home.about.p2", "مهمتنا نوفّر عليك عناء البحث، ونعطيك تجربة سهلة وسريعة تختار منها الأنسب لك من ناحية الجودة والسعر والموقع، مع تواصل مباشر وحفظ مفضّلتك بضغطة.")}</p>
          <p>{txt("home.about.p3", "هدفنا نكون الدليل الموثوق لكل شخص أو عائلة تبي مناسبة مميزة. شكراً لثقتك فينا 💐")}</p>
        </div>
      </section>
      )}


      {/* ── SHOWCASE ── */}
      {view === "home" && !loading && showcase.length > 0 && (
        <section className="ez-sec ez-sec-alt">
          <div className="ez-eyebrow"><span className="ez-eyebrow-line" />{txt("showcase.eyebrow", "اختيارات إزهليها")}</div>
          <h2 className="ez-h2">{txt("showcase.title", "خيارات تستاهل تبدأ منها")}</h2>
          <div className="ez-grid">
            {showcase.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                city={cities.find((c) => c.id === p.city_id)}
                sub={subcategories.find((s) => s.id === p.subcategory_id)}
                images={imgsByProvider.get(p.id) ?? []}
                tags={tagsByProvider.get(p.id) ?? []}
                contactLabel={txt("provider.whatsapp.label", "للمزيد من التفاصيل")}
                featured={p.is_featured}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── RESULTS ── */}
      {view === "providers" && (
      <section className="ez-sec" id="ez-results">
        <div className="ez-results-head">
          <div>
            <div className="ez-eyebrow"><span className="ez-eyebrow-line" />{txt("results.eyebrow", "مقدمي الخدمات")}</div>
            <h2 className="ez-h2">
              {filtersActive ? (activeCategory?.name_ar ?? txt("results.title.filtered", "نتائج البحث")) : txt("results.title", "كل مقدمي الخدمات")}
              <span className="ez-count">({results.length})</span>
            </h2>
          </div>
          <div className="ez-results-tools">
            <div className="ez-search">
              <span className="ez-search-icon"><Search size={15} /></span>
              <input
                type="text"
                placeholder={txt("home.search.placeholder", "ابحث عن مقدم خدمة، تصنيف، أو أي شي تبيه...")}
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
              />
              {quickSearch && <button className="ez-search-clear" onClick={() => setQuickSearch("")} aria-label="مسح"><X size={14} /></button>}
            </div>
            {filtersActive && (
              <button type="button" className="ez-btn-ghost" onClick={resetAll}>{txt("results.reset", "مسح الفلاتر")}</button>
            )}
          </div>
        </div>

        <div className="ez-results-layout">

          <div className="ez-results-main">
            {loading ? (
              <p className="ez-empty">{txt("home.loading", "لحظات.. نجهّز لك كل شي ✨")}</p>
            ) : results.length === 0 ? (
              <p className="ez-empty">{txt("home.no_results", "ما لقينا شي مطابق.. جرّب كلمة ثانية أو تصفّح التصنيفات 🌷")}</p>
            ) : (
              <>
                {featured.length > 0 && (
                  <>
                    <h3 className="ez-h3">{txt("home.featured.title", "⭐ نخبة مختارة لك")}</h3>
                    <div className="ez-grid">
                      {featured.map((p, i) => (
                        <ProviderCard
                          key={p.id}
                          provider={p}
                          city={cityById.get(p.city_id)}
                          sub={subById.get(p.subcategory_id)}
                          images={imgsByProvider.get(p.id) ?? []}
                          tags={tagsByProvider.get(p.id) ?? []}
                          contactLabel={contactLabel}
                          featured
                          eager={i < 3}
                          isFav={favIds.has(p.id)}
                          onToggleFav={user ? toggleFav : undefined}
                          onOpen={saveBrowseState}
                        />
                      ))}
                    </div>
                  </>
                )}
                {regular.length > 0 && (
                  <>
                    {featured.length > 0 && <h3 className="ez-h3">{txt("home.all_providers.title", "كل المقدمين")}</h3>}
                    <div className="ez-grid">
                      {visibleRegular.map((p, i) => (
                        <ProviderCard
                          key={p.id}
                          provider={p}
                          city={cityById.get(p.city_id)}
                          sub={subById.get(p.subcategory_id)}
                          images={imgsByProvider.get(p.id) ?? []}
                          tags={tagsByProvider.get(p.id) ?? []}
                          contactLabel={contactLabel}
                          eager={featured.length === 0 && i < 3}
                          isFav={favIds.has(p.id)}
                          onToggleFav={user ? toggleFav : undefined}
                          onOpen={saveBrowseState}
                        />
                      ))}
                    </div>
                    {visibleRegular.length < regular.length && (
                      <div ref={sentinelRef} className="ez-more-sentinel" aria-hidden="true" />
                    )}
                  </>
                )}

              </>
            )}
          </div>
        </div>
      </section>
      )}


      {/* ── FAQ ── */}
      {(view === "home" || view === "faq") && (
      <section className="ez-sec" id="ez-faq">
        <div className="ez-eyebrow"><span className="ez-eyebrow-line" />{txt("faq.eyebrow", "الأسئلة الشائعة")}</div>
        <h2 className="ez-h2">{txt("faq.title", "كل اللي ممكن تحتاج تعرفه")}</h2>
        <p className="ez-muted">{txt("faq.desc", "إجابات سريعة قبل ما تبدأ البحث أو ترسل طلبك.")}</p>
        <div className="ez-faq">
          {faqs.map((f, i) => (
            <div key={i} className={`ez-faq-item ${openFaq === i ? "open" : ""}`}>
              <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{f.q}</span>
                <i>+</i>
              </button>
              {openFaq === i && <p>{f.a}</p>}
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ── FOOTER ── */}
      <SiteFooter texts={siteTexts} />


      {aboutOpen && (
        <div className="ez-about-overlay" onClick={() => setAboutOpen(false)}>
          <div className="ez-about-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ez-about-close" onClick={() => setAboutOpen(false)} aria-label="إغلاق">×</button>
            <h2 className="ez-about-title">{txt("home.about.title", "من نحن")}</h2>
            <p className="ez-about-text">
              {txt("home.about.p1", "إزهليها منصتك الأولى لتجهيز مناسباتك في المملكة العربية السعودية. نجمع لك في مكان واحد نخبة من أفخم مقدمي الخدمات وكل اللي تحتاجه عشان يومك يطلع على الأصول 🤍")}
            </p>
            <p className="ez-about-text">
              {txt("home.about.p2", "مهمتنا نوفّر عليك عناء البحث، ونعطيك تجربة سهلة وسريعة تختار منها الأنسب لك من ناحية الجودة والسعر والموقع، مع تواصل مباشر وحفظ مفضّلتك بضغطة.")}
            </p>
            <p className="ez-about-text">
              {txt("home.about.p3", "هدفنا نكون الدليل الموثوق لكل شخص أو عائلة تبي مناسبة مميزة. شكراً لثقتك فينا 💐")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function waLink(whatsapp: string | null | undefined, message = WA_MESSAGE) {
  let wa = (whatsapp ?? "").replace(/\D/g, "");
  if (!wa) return null;
  if (wa.startsWith("00966")) wa = wa.slice(2);
  if (wa.length === 13 && wa.startsWith("9660")) wa = "966" + wa.slice(4);
  if (wa.length === 10 && wa.startsWith("05")) wa = "966" + wa.slice(1);
  else if (wa.length === 9 && wa.startsWith("5")) wa = "966" + wa;
  return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
}

export function cleanHandle(v: string | null) {
  return (v ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/[^/]+\//, "").replace(/\/$/, "");
}

const ProviderCard = memo(function ProviderCard({
  provider,
  city,
  sub,
  images,
  featured,
  contactLabel,
  isFav,
  onToggleFav,
  tags = [],
  eager = false,
  onOpen,
}: {
  provider: Provider;
  city?: City;
  sub?: Subcategory;
  images: ProviderImage[];
  featured?: boolean;
  contactLabel: string;
  isFav?: boolean;
  onToggleFav?: (providerId: string) => void;
  tags?: string[];
  eager?: boolean;
  onOpen?: () => void;
}) {
  const cover = images[0]?.image_url || defaultProviderUrl;
  const waUrl = waLink(provider.whatsapp);
  const capacity =
    provider.people_from && provider.people_to
      ? `${provider.people_from} – ${provider.people_to} ضيف`
      : provider.people_to
        ? `حتى ${provider.people_to} ضيف`
        : provider.people_from
          ? `من ${provider.people_from} ضيف`
          : null;

  return (
    <article className={`ez-card ${featured ? "ez-card-featured" : ""}`}>
      <Link to="/provider/$id" params={{ id: provider.id }} className="ez-card-link" onClick={() => onOpen?.()}>
        <div className="ez-card-img">
          <SocialImg
            src={cover}
            fallback={defaultProviderUrl}
            alt={provider.name}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            {...(eager ? { fetchPriority: "high" as const } : {})}
          />
          <span className="ez-badge">{featured ? "اختيار أزهليها" : "جديد في أزهليها"}</span>
          {onToggleFav && (
            <button
              type="button"
              className={`ez-card-fav ${isFav ? "active" : ""}`}
              aria-label={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(provider.id); }}
            >
              <Heart size={15} fill={isFav ? "currentColor" : "none"} />
            </button>

          )}
        </div>

        <div className="ez-card-body">
          <div className="ez-card-head">
            <h3>{provider.name}</h3>
          </div>
          {city && <span className="ez-card-meta"><MapPin size={12} /> {city.name_ar}</span>}
          {capacity && <span className="ez-card-meta"><Users size={12} /> {capacity}</span>}
          <div className="ez-card-price">
            <small>السعر التقريبي</small>
            <strong>
              {provider.price_from
                ? `يبدأ من ${provider.price_from} ر.س`
                : provider.price
                  ? provider.price
                  : "السعر حسب التفاصيل"}
            </strong>
          </div>
        </div>
      </Link>

      {waUrl && (
        <div className="ez-card-foot">
          <a className="ez-wa-btn" href={waUrl} target="_blank" rel="noopener noreferrer">
            <span>{contactLabel}</span>
            <WhatsAppIcon />
          </a>
        </div>
      )}

    </article>
  );
});

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setCurrent(value); return; }
    let raf = 0;
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || started) return;
        started = true;
        const startedAt = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - startedAt) / 1400, 1);
          setCurrent(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => { observer.disconnect(); window.cancelAnimationFrame(raf); };
  }, [value]);
  return (
    <span ref={ref} dir="ltr" style={{ display: "inline-block", unicodeBidi: "isolate" }}>
      {suffix}{current.toLocaleString("en-US")}
    </span>
  );
}


function WhatsAppIcon({ size = 18 }: { size?: number }) {

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.78 11.78 0 0012.06 0C5.5 0 .17 5.33.17 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 005.74 1.46h.01c6.56 0 11.89-5.33 11.89-11.9 0-3.18-1.24-6.17-3.44-8.42zM12.07 21.8h-.01a9.9 9.9 0 01-5.05-1.38l-.36-.21-3.75.99 1-3.66-.24-.38a9.86 9.86 0 01-1.51-5.26c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.13 1.03 7 2.9a9.83 9.83 0 012.9 7c0 5.46-4.44 9.9-9.88 9.9zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.06 2.88 1.21 3.08.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z" />
    </svg>
  );
}

function AccountMenu({ email, onSignOut, texts }: { email: string; onSignOut: () => void | Promise<void>; texts: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const initial = (email || "?").trim().charAt(0).toUpperCase();
  const t = (k: string, f: string) => texts[k] || f;
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);
  return (
    <div className="ez-acct" onClick={(e) => e.stopPropagation()}>
      <button className="ez-acct-btn" onClick={() => setOpen((o) => !o)} aria-label="حسابي">
        <span className="ez-acct-avatar">{initial}</span>
        <span className="ez-acct-caret">▾</span>
      </button>
      {open && (
        <div className="ez-acct-menu" role="menu">
          <div className="ez-acct-head">
            <div className="ez-acct-avatar lg">{initial}</div>
            <div>
              <div className="ez-acct-title">{t("account.title", "حسابي")}</div>
              <div className="ez-acct-email">{email}</div>
            </div>
          </div>
          <Link to="/favorites" className="ez-acct-item" onClick={() => setOpen(false)}>{t("account.favorites", "♥ المفضلة")}</Link>
          <button className="ez-acct-item ez-acct-out" onClick={() => { setOpen(false); void onSignOut(); }}>{t("account.signout", "↩ تسجيل الخروج")}</button>
        </div>
      )}
    </div>
  );
}

function AuthGate() {
  const [texts, setTexts] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("site_texts").select("key,value").then(({ data }) => {
      setTexts(Object.fromEntries(((data ?? []) as SiteText[]).map((x) => [x.key, x.value])));
    });
  }, []);
  const t = (k: string, f: string) => texts[k] || f;
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#e6e4d7", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Thmanyah Serif Display, Tajawal, system-ui, sans-serif" }}>
      <div style={{ background: "#fff", padding: "40px 32px", borderRadius: 20, maxWidth: 440, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(100,0,0,0.12)" }}>
        <img src={logoUrl} alt="إزهليها" style={{ height: 90, display: "block", margin: "0 auto 16px auto" }} />
        <h1 style={{ color: "#640000", fontSize: 28, marginBottom: 10 }}>{t("auth_gate.title", "محتوى للأعضاء بس")}</h1>
        <p style={{ color: "#555", fontSize: 15, marginBottom: 24, lineHeight: 1.8 }}>
          {t("auth_gate.description", "عشان تدخل على دليل مقدمين الخدمات لازم تسجّل دخولك. للتسجيل تحتاج كود الشراء اللي وصلك بعد طلبك من متجر سلة 🤍")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link to="/login" style={{ background: "#640000", color: "#fff", padding: "12px 24px", borderRadius: 50, textDecoration: "none", fontWeight: 700 }}>
            {t("auth_gate.login", "تسجيل الدخول")}
          </Link>
          <Link to="/signup" style={{ background: "#fff", color: "#640000", padding: "12px 24px", borderRadius: 50, textDecoration: "none", fontWeight: 700, border: "2px solid #640000" }}>
            {t("auth_gate.signup", "إنشاء حساب جديد")}
          </Link>
        </div>
      </div>
    </div>
  );
}

const css = `
  .ez-root { --bg:#e6e4d7; --surface:#FDFBF5; --brand:#640000; --brand-dark:#4D0000; --ink:#2A211C; --muted:#6E6259; --line:#DDD6C8; --sec:#E9E3D5; --gold:#C9A063;
    --ease-out:cubic-bezier(.23,1,.32,1);
    min-height:100vh; background:var(--bg);
    
    font-family:"Thmanyah Serif Display", "Noto Sans Arabic", Tajawal, system-ui, sans-serif; color:var(--ink); scroll-behavior:smooth; font-size:13.5px; line-height:1.75; }
  .ez-root * { box-sizing:border-box; }
  .ez-root h1, .ez-root h2, .ez-root h3, .ez-root h4, .ez-root button, .ez-root nav { font-family:"Thmanyah Serif Display","Alexandria","Noto Sans Arabic",Tajawal,sans-serif; }
  .ez-root ::selection { background:var(--brand); color:#FBF8F0; }
  .ez-root button, .ez-root a { transition:transform .16s var(--ease-out), opacity .18s var(--ease-out), color .18s var(--ease-out), background-color .18s var(--ease-out), border-color .18s var(--ease-out); }
  .ez-root button:active { transform:scale(.97); }
  .ez-logo-text { font-family:'Rakkas','Reem Kufi Fun',Tajawal,serif; font-weight:400; letter-spacing:1px; }

  .ez-soft-grid { background-image:linear-gradient(rgba(100,0,0,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(100,0,0,.045) 1px, transparent 1px); background-size:32px 32px; }
  @media (prefers-reduced-motion: no-preference) {
    .ez-reveal { animation:ezRevealUp 650ms var(--ease-out) both; }
    .ez-reveal-1 { animation-delay:80ms; }
    .ez-reveal-2 { animation-delay:150ms; }
  }
  @keyframes ezRevealUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }

  /* NAV */
  .ez-nav { background:rgba(253,251,245,.92); backdrop-filter:blur(8px); border-bottom:1px solid var(--line); padding:8px 32px; display:flex; align-items:center; justify-content:space-between; gap:18px; position:sticky; top:0; z-index:100; }
  .ez-brand { text-decoration:none; display:flex; align-items:center; }
  .ez-brand-logo { height:64px; width:auto; object-fit:contain; }
  .ez-nav-menu { display:flex; align-items:center; gap:22px; }
  .ez-nav-link { color:var(--ink); text-decoration:none; font-size:13.5px; font-weight:600; background:none; border:none; cursor:pointer; font-family:"Thmanyah Serif Display","Alexandria","Noto Sans Arabic",sans-serif; padding:4px 0; position:relative; }
  .ez-nav-link:hover { color:var(--brand); }
  .ez-nav-actions { display:flex; align-items:center; gap:12px; }
  .ez-nav-btn { background:var(--brand); color:#fff; padding:9px 20px; border-radius:6px; text-decoration:none; font-size:13px; font-weight:600; }
  .ez-nav-cta { display:inline-flex; align-items:center; justify-content:center; gap:8px; height:40px; background:var(--brand); color:#fff; border:none; padding:0 16px; border-radius:6px; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 10px 24px rgba(100,0,0,.14); transition:background .2s, transform .2s; white-space:nowrap; }
  .ez-nav-cta:hover { background:var(--brand-dark); transform:translateY(-1px); }

  /* MEGA MENU */
  .ez-mega-wrap { position:relative; }
  .ez-mega-trigger { display:inline-flex; align-items:center; gap:6px; }
  .ez-mega-trigger.open { color:var(--brand); }
  .ez-mega-pop { position:absolute; top:calc(100% + 10px); right:0; z-index:200; width:min(340px, 92vw); max-height:76vh; overflow-y:auto; background:#fff; border:1px solid var(--line); border-radius:12px; box-shadow:0 24px 60px rgba(0,0,0,.14); }
  .ez-acc { background:#fff; }
  .ez-acc-all { width:100%; display:flex; align-items:center; gap:8px; background:var(--cream, #F7F3EA); border:0; border-bottom:1px solid var(--line); padding:12px 16px; cursor:pointer; font-family:inherit; font-size:13.5px; font-weight:700; color:var(--brand); text-align:start; }
  .ez-acc-item { border-bottom:1px solid var(--line); }
  .ez-acc-row { display:flex; align-items:stretch; }
  .ez-acc-name { flex:1; display:flex; align-items:center; gap:10px; background:none; border:0; padding:11px 16px; cursor:pointer; font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); text-align:start; }
  .ez-acc-name img { width:30px; height:30px; border-radius:8px; object-fit:cover; flex:0 0 30px; }
  .ez-acc-name:hover { color:var(--brand); }
  .ez-acc-tog { background:none; border:0; padding:0 14px; cursor:pointer; color:#8A7C74; display:flex; align-items:center; }
  .ez-acc-tog svg { transition:transform .18s; }
  .ez-acc-tog svg.open { transform:rotate(180deg); color:var(--brand); }
  .ez-acc-subs { padding:2px 16px 14px; display:flex; flex-direction:column; gap:2px; }
  .ez-acc-sub-group { display:flex; flex-direction:column; gap:2px; margin-bottom:8px; }
  .ez-acc-sub { background:none; border:0; padding:6px 0; text-align:start; cursor:pointer; font-family:inherit; font-size:13px; color:#5B4C46; }
  .ez-acc-sub:hover { color:var(--brand); }
  .ez-acc-sub.all { font-weight:700; color:var(--ink); }
  .ez-acc-sub.kid { padding-inline-start:12px; color:#7A6A63; font-size:12.5px; }
  .ez-mega-inline { margin-top:22px; background:#fff; border:1px solid var(--line); border-radius:14px; overflow:hidden; }
  .ez-drawer-cats { margin-top:6px; border-top:1px solid var(--line); }
  .ez-drawer-cats-title { padding:12px 16px 6px; margin:0; font-size:12.5px; font-weight:800; color:#8A7C74; }

  /* SHARED */
  .ez-eyebrow { display:inline-flex; align-items:center; gap:.45rem; font-size:11.5px; color:var(--brand); font-weight:500; letter-spacing:.06em; margin-bottom:14px; font-family:"Thmanyah Serif Display","Alexandria",sans-serif; }
  .ez-eyebrow-line { display:inline-block; width:1.65rem; height:1px; background:linear-gradient(90deg, transparent, var(--brand)); }
  .ez-h2 { font-size:30px; font-weight:600; line-height:1.4; margin:0 0 10px; letter-spacing:-.035em; }
  .ez-h3 { font-size:17px; font-weight:600; margin:26px 0 14px; }
  .ez-muted { color:var(--muted); font-size:13.5px; line-height:1.9; max-width:560px; }
  .ez-count { color:var(--muted); font-size:16px; font-weight:600; margin-inline-start:8px; }
  .ez-btn-primary { display:inline-flex; align-items:center; justify-content:center; gap:8px; background:var(--brand); color:#fff; border:none; height:40px; padding:0 20px; border-radius:6px; font-family:inherit; font-size:13px; font-weight:500; cursor:pointer; margin-top:20px; }
  .ez-btn-primary:hover { background:var(--brand-dark); }
  .ez-btn-primary svg { width:16px; height:16px; }
  .ez-btn-ghost { display:inline-flex; align-items:center; justify-content:center; gap:8px; background:transparent; border:1px solid var(--line); color:var(--brand); height:36px; padding:0 16px; border-radius:6px; font-family:inherit; font-size:13px; font-weight:500; cursor:pointer; }
  .ez-btn-ghost:hover { border-color:var(--brand); }


  /* HERO */
  .ez-hero { position:relative; isolation:isolate; padding-bottom:20px; border-bottom:1px solid rgba(100,0,0,.08); }
  .ez-hero::before { content:""; position:absolute; inset:0; z-index:-2; background:linear-gradient(135deg,#f8f5ec 0%,#e6e4d7 62%,#ddd5c8 100%); }
  .ez-hero::after { content:""; position:absolute; inset:0; z-index:-1; opacity:.55;
    background-image:linear-gradient(rgba(100,0,0,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(100,0,0,.045) 1px, transparent 1px); background-size:32px 32px;
    -webkit-mask-image:linear-gradient(to bottom, black, transparent 88%); mask-image:linear-gradient(to bottom, black, transparent 88%); }
  .ez-hero-grid { max-width:1240px; margin:0 auto; padding:32px 32px 56px; display:grid; grid-template-columns:1fr 1fr; gap:44px; align-items:center; min-height:500px; }
  .ez-hero-title { font-size:clamp(2.2rem,4.2vw,4rem); line-height:1.18; font-weight:600; letter-spacing:-.05em; margin:16px 0 16px; }
  .ez-hero-title-accent { display:block; color:var(--brand); margin-top:4px; }
  .ez-hero-desc { color:var(--muted); font-size:15px; line-height:1.9; max-width:520px; margin:0 0 20px; }
  .ez-hero-checks { list-style:none; display:flex; gap:18px; padding:0; margin:0; flex-wrap:wrap; }
  .ez-hero-checks li { display:flex; align-items:center; gap:8px; font-size:12.5px; color:rgba(42,33,28,.72); }
  .ez-hero-checks i { width:20px; height:20px; border-radius:50%; border:1px solid rgba(100,0,0,.2); background:rgba(100,0,0,.06); display:flex; align-items:center; justify-content:center; font-style:normal; font-size:11px; color:var(--brand); }
  .ez-hero-media { position:relative; max-width:570px; width:100%; }
  .ez-hero-full { width:100%; margin:0; }
  .ez-hero-full img { display:block; width:100%; height:auto; max-height:520px; object-fit:cover; object-position:center; }
  @media (max-width:700px){ .ez-hero-full img { max-height:340px; } }
  .ez-hero-frame { position:absolute; top:-32px; inset-inline-start:-32px; width:38%; height:72%; border:1px solid rgba(100,0,0,.16); z-index:0; }
  .ez-hero-banner { display:block; position:relative; overflow:hidden; border-radius:14px; box-shadow:0 28px 70px rgba(53,24,19,.16); z-index:1; }
  .ez-hero-banner img { display:block; width:100%; aspect-ratio:16/10; height:auto; object-fit:cover; transition:transform .52s var(--ease-out); }
  .ez-hero-banner:hover img { transform:scale(1.035); }
  .ez-hero-banner-empty { position:relative; background:radial-gradient(120% 120% at 20% 0%, rgba(255,255,255,.14), transparent 55%), linear-gradient(135deg,var(--brand),var(--brand-dark)); color:#fff; aspect-ratio:16/10; display:flex; align-items:center; justify-content:center; text-align:center; padding:32px; }
  .ez-hero-banner-empty::after { content:""; position:absolute; inset:14px; border:1px solid rgba(255,255,255,.18); border-radius:10px; pointer-events:none; }
  .ez-hero-banner-empty h2 { font-size:clamp(30px,4vw,44px); margin-bottom:12px; letter-spacing:-.02em; }
  .ez-hero-banner-empty p { opacity:.88; font-size:14.5px; line-height:1.9; max-width:420px; margin:0 auto; }
  .ez-hero-banner-cap { position:absolute; inset:auto 0 0 0; padding:22px; background:linear-gradient(transparent, rgba(43,10,10,.72)); color:#fff; display:grid; gap:4px; text-align:start; }
  .ez-hero-banner-cap strong { font-size:19px; font-weight:600; }
  .ez-hero-banner-cap span { font-size:13px; opacity:.85; line-height:1.8; }

  .ez-hero-arrow { position:absolute; top:50%; transform:translateY(-50%); width:40px; height:40px; border-radius:50%; border:1px solid rgba(255,255,255,.35); background:rgba(255,255,255,.14); backdrop-filter:blur(6px); color:#fff; font-size:22px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:2; }
  .ez-hero-arrow:hover { background:var(--brand); border-color:var(--brand); }
  .ez-hero-arrow-prev { right:14px; }
  .ez-hero-arrow-next { left:14px; }
  .ez-hero-dots { position:absolute; bottom:14px; inset-inline-start:0; inset-inline-end:0; display:flex; gap:7px; justify-content:center; z-index:2; }
  .ez-hero-dots button { width:8px; height:8px; border-radius:50%; border:none; background:rgba(255,255,255,.55); cursor:pointer; padding:0; }
  .ez-hero-dots button.active { background:#fff; width:20px; border-radius:50px; }

  /* CONSOLE */
  .ez-console { position:relative; z-index:20; max-width:1240px; margin:-28px auto 0; background:#fff; border:1px solid var(--line); border-radius:20px; padding:14px; box-shadow:0 18px 44px rgba(53,24,19,.10); display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:10px; align-items:end; }
  .ez-console-field { display:flex; flex-direction:column; gap:6px; min-width:0; }
  .ez-console-field label { display:flex; align-items:center; gap:6px; font-size:11px; letter-spacing:.02em; color:var(--muted); font-weight:500; }
  .ez-console-field label .ez-fi { color:var(--brand); }
  .ez-console-field select { appearance:none; -webkit-appearance:none; width:100%; border:1px solid var(--line); background:#faf8f4 url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23875a5a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat left 12px center / 15px 15px; padding:0 14px 0 34px; border-radius:12px; font-family:inherit; font-size:13px; font-weight:500; color:var(--ink); outline:none; cursor:pointer; height:44px; transition:border-color .15s, background-color .15s, box-shadow .15s; }
  .ez-console-field select:hover { background-color:#fff; border-color:rgba(100,0,0,.28); }
  .ez-console-field select:focus { background-color:#fff; border-color:var(--brand); box-shadow:0 0 0 3px rgba(100,0,0,.10); }
  .ez-console-field select:disabled { color:var(--muted); cursor:not-allowed; opacity:.7; }
  .ez-console-field select optgroup { font-family:inherit; font-size:12.5px; font-weight:700; color:var(--brand); background:#f4efe6; padding:6px 0; }
  .ez-console-field select option { font-family:inherit; font-size:13px; font-weight:500; color:var(--ink); background:#fff; padding:8px 12px; }
  .ez-console-field select option:checked { background:var(--brand); color:#fff; }
  .ez-console-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; background:var(--brand); color:#fff; border:none; padding:0 26px; border-radius:12px; font-family:inherit; font-size:13.5px; font-weight:600; cursor:pointer; height:44px; box-shadow:0 8px 20px rgba(100,0,0,.20); transition:background .15s, transform .15s; }
  .ez-console-btn svg { width:16px; height:16px; }
  .ez-console-btn:hover { background:var(--brand-dark); transform:translateY(-1px); }

  .ez-fchips { max-width:1240px; margin:14px auto 0; padding:0 32px; display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  .ez-fchip { background:var(--surface); border:1px solid var(--line); color:var(--ink); font-family:inherit; font-size:12.5px; font-weight:600; padding:6px 12px; border-radius:6px; cursor:pointer; }
  .ez-fchip:hover { border-color:var(--brand); color:var(--brand); }
  .ez-fchip-clear { background:var(--brand); border-color:var(--brand); color:#fff; }
  .ez-fchip-clear:hover { background:var(--brand-dark); color:#fff; }
  .ez-fchips-count { font-size:12px; color:var(--muted); margin-inline-start:auto; }
  .ez-stats { border-bottom:1px solid rgba(100,0,0,.08); background:var(--surface); display:flex; justify-content:center; flex-wrap:wrap; padding:16px; margin-top:34px; }
  .ez-stat { display:flex; align-items:center; justify-content:center; gap:12px; padding:0 20px; }
  .ez-stat-icon { width:32px; height:32px; border-radius:50%; background:rgba(100,0,0,.06); color:var(--brand); display:flex; align-items:center; justify-content:center; }
  .ez-stat-icon svg { width:14px; height:14px; }
  .ez-stat strong { display:flex; align-items:center; gap:6px; color:var(--brand); font-size:22px; font-weight:600; letter-spacing:-.03em; }
  .ez-stat small { color:var(--muted); font-size:12px; line-height:1.25rem; }
  .ez-ad-sec { padding:26px 32px 6px; }
  .ez-ad { max-width:1240px; margin:0 auto; background:#fff; border:1px solid rgba(100,0,0,.10); border-radius:6px; display:grid; grid-template-columns:.9fr 1.1fr; overflow:hidden; }
  .ez-ad-media { min-height:260px; background:#efeade; }
  .ez-ad-media img { width:100%; height:100%; object-fit:cover; display:block; }
  .ez-ad-body { padding:34px 38px; display:flex; flex-direction:column; align-items:flex-start; gap:14px; }
  .ez-ad-tags { display:flex; align-items:center; gap:10px; font-size:11.5px; color:var(--muted); }
  .ez-ad-tag { background:rgba(100,0,0,.06); color:var(--brand); padding:3px 9px; border-radius:3px; font-weight:600; }
  .ez-ad-title { font-size:29px; font-weight:600; line-height:1.5; margin:0; color:var(--ink, #2A211C); }
  .ez-ad-desc { color:var(--muted); font-size:14px; line-height:1.9; margin:0; }
  .ez-ad-cta { background:var(--brand); color:#fff; text-decoration:none; padding:13px 26px; border-radius:4px; font-weight:500; font-size:14px; }
  .ez-ad-dots { display:flex; gap:6px; margin-top:4px; }
  .ez-ad-dots button { width:7px; height:7px; border-radius:50%; border:0; background:rgba(100,0,0,.2); cursor:pointer; padding:0; }
  .ez-ad-dots button.active { background:var(--brand); width:18px; border-radius:4px; }
  @media (max-width: 860px) { .ez-ad { grid-template-columns:1fr; } .ez-ad-body { padding:24px 20px; } .ez-ad-title { font-size:22px; } .ez-ad-sec { padding:20px 16px 0; } }


  /* SECTIONS */
  .ez-sec { max-width:1240px; margin:0 auto; padding:64px 32px; }
  .ez-sec-alt { background:#F2EDE1; max-width:none; }
  .ez-sec-alt > * { max-width:1240px; margin-inline:auto; }
  .ez-empty { text-align:center; color:var(--muted); padding:48px; font-size:15px; }
  .ez-empty a { color:var(--brand); font-weight:500; }

  /* STEPS */
  .ez-steps-sec { background:#F2EDE1; border-block:1px solid var(--line); }
  .ez-steps-wrap { max-width:1240px; margin:0 auto; padding:64px 32px; display:grid; grid-template-columns:1fr 1.3fr; gap:48px; align-items:center; }
  .ez-steps-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .ez-step-card { background:var(--surface); border:1px solid var(--line); border-radius:6px; padding:20px; }
  .ez-step-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
  .ez-step-icon { width:34px; height:34px; border-radius:50%; background:#F7EFE9; color:var(--brand); display:flex; align-items:center; justify-content:center; font-size:15px; }
  .ez-step-num { color:var(--muted); font-size:12px; letter-spacing:1px; }
  .ez-step-card h3 { font-size:17px; font-weight:600; margin:0 0 6px; }
  .ez-step-card p { color:var(--muted); font-size:13px; line-height:1.8; margin:0; }

  /* CATEGORIES */
  .ez-cats-head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; }
  .ez-cat-grid { display:grid; grid-template-columns:repeat(6, minmax(0,1fr)); gap:18px 14px; margin-top:24px; }
  @media (max-width: 1100px) { .ez-cat-grid { grid-template-columns:repeat(4, minmax(0,1fr)); } }
  .ez-cat-tile { display:flex; flex-direction:column; align-items:center; gap:9px; background:none; border:0; padding:0; font:inherit; cursor:pointer; }
  .ez-cat-thumb { position:relative; display:block; width:100%; aspect-ratio:1/1; border-radius:18px; overflow:hidden; background:#F1E9DA; border:1px solid var(--line); transition:border-color .2s, box-shadow .2s; }
  .ez-cat-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
  .ez-cat-thumb-all { display:flex; align-items:center; justify-content:center; color:var(--brand); }
  .ez-cat-tile:hover .ez-cat-thumb { border-color:var(--brand); box-shadow:0 10px 22px rgba(100,0,0,.12); }
  .ez-cat-tile.active .ez-cat-thumb { border-color:var(--brand); box-shadow:0 0 0 2px rgba(100,0,0,.25); }
  .ez-cat-label { font-size:13px; line-height:1.5; color:var(--ink); text-align:center; }
  .ez-cat-tile.active .ez-cat-label { color:var(--brand); font-weight:600; }
  .ez-subquick { display:flex; flex-wrap:wrap; gap:8px; margin-top:22px; }
  .ez-subquick-pill { background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:7px 14px; font:inherit; font-size:12.5px; color:var(--ink); cursor:pointer; transition:all .2s; }
  .ez-subquick-pill:hover { background:var(--brand); color:#FFFDF8; border-color:var(--brand); }



  /* RESULTS HEAD */
  .ez-results-head { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; flex-wrap:wrap; margin-bottom:18px; }
  .ez-results-tools { display:flex; align-items:center; gap:10px; }
  .ez-search { background:var(--surface); border:1px solid var(--line); border-radius:50px; display:flex; align-items:center; gap:6px; padding:4px 14px; min-width:320px; }
  .ez-search input { flex:1; border:none; outline:none; padding:10px 6px; font-size:14px; font-family:inherit; background:transparent; color:var(--ink); }
  .ez-search-icon { color:var(--brand); display:inline-flex; }
  .ez-search-clear { background:transparent; border:none; color:var(--brand); cursor:pointer; padding:4px 8px; display:inline-flex; align-items:center; font-family:inherit; }
  .ez-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
  .ez-chips button { background:var(--surface); border:1px solid var(--line); padding:8px 16px; border-radius:6px; font-family:inherit; font-size:13px; cursor:pointer; color:var(--ink); transition:all .2s; }
  .ez-chips button:hover { border-color:var(--brand); color:var(--brand); }
  .ez-chips button.active { background:var(--brand); color:#fff; border-color:var(--brand); }
  .ez-chips-tertiary { background:var(--surface); padding:8px 12px; border-radius:8px; align-items:center; border:1px solid var(--line); }
  .ez-tertiary-label { font-size:12px; color:var(--muted); font-weight:500; margin-left:6px; }

  /* CITY CHIPS */
  .ez-city-chips { display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }
  .ez-city-chips button { display:inline-flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--line); padding:12px 22px; border-radius:6px; font-family:inherit; font-size:14px; font-weight:500; cursor:pointer; color:var(--ink); transition:all .2s; }
  .ez-city-chips button small { color:var(--muted); font-weight:600; font-size:11px; }
  .ez-city-chips button:hover { border-color:var(--brand); color:var(--brand); }
  .ez-city-chips button.active { background:var(--brand); color:#fff; border-color:var(--brand); }
  .ez-city-chips button.active small { color:rgba(255,255,255,.75); }

  /* CARDS */
  .ez-grid { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:16px; }
  .ez-results-layout { display:block; }
  .ez-fpanel { position:sticky; top:16px; background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:18px; display:flex; flex-direction:column; gap:18px; }
  .ez-fpanel-head p { margin:6px 0 0; color:var(--muted); font-size:13px; line-height:1.7; }
  .ez-fgroup h4 { margin:0 0 10px; font-size:15px; color:var(--ink); }
  .ez-fgroup-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }
  .ez-fgroup-head h4 { margin:0; }
  .ez-fclear { background:none; border:none; color:var(--brand); font:inherit; font-size:13px; cursor:pointer; }
  .ez-flist { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
  .ez-flist button { width:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; background:none; border:none; border-inline-start:3px solid transparent; padding:9px 10px; font:inherit; font-size:14px; color:var(--ink); cursor:pointer; border-radius:8px; transition:background .2s var(--ease-out); }
  .ez-flist button:hover { background:rgba(100,0,0,.05); }
  .ez-flist button.active { background:var(--sec); border-inline-start-color:var(--brand); font-weight:500; color:var(--brand); }
  .ez-flist small { color:var(--muted); font-size:12px; }
  .ez-fselect { width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:10px; background:#fff; font:inherit; font-size:14px; color:var(--ink); }
  .ez-ffav { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:11px 12px; border:1px solid var(--line); border-radius:10px; background:#fff; font:inherit; font-size:14px; cursor:pointer; color:var(--ink); }
  .ez-ffav.active { background:var(--brand); border-color:var(--brand); color:#fff; }
  .ez-ffav small { opacity:.75; font-size:12px; }
  .ez-card { position:relative; }
  .ez-card-fav { position:absolute; top:9px; inset-inline-end:9px; z-index:2; width:28px; height:28px; border-radius:50%; border:1px solid rgba(100,0,0,.12); background:rgba(255,253,248,.94); color:var(--brand); font-size:14px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .ez-card-fav.active { background:var(--brand); color:#fff; border-color:var(--brand); }
  @media (max-width: 1200px) {
    .ez-grid { grid-template-columns:repeat(3, minmax(0,1fr)); }
  }
  @media (max-width: 900px) {
    .ez-results-layout { grid-template-columns:1fr; }
    .ez-fpanel { position:static; top:auto; }
    .ez-grid { grid-template-columns:repeat(2, minmax(0,1fr)); }
    .ez-card-body { padding:10px 11px 12px; }
    .ez-results-head { align-items:flex-start; gap:14px; }
    .ez-results-tools { width:100%; flex-wrap:wrap; }
    .ez-search { flex:1 1 100%; min-width:0; }
    .ez-flist { max-height:none; }
  }
  @media (max-width: 640px) {
    .ez-grid { grid-template-columns:repeat(2, minmax(0,1fr)); gap:12px; }
    .ez-fpanel { padding:14px; gap:14px; border-radius:12px; }
    .ez-fpanel-head p { font-size:12.5px; }
    .ez-flist { max-height:260px; overflow-y:auto; }
    .ez-flist button { padding:11px 10px; gap:8px; }
    .ez-flist button span { min-width:0; overflow-wrap:anywhere; }
    .ez-flist small { flex:0 0 auto; }
    .ez-chips-tertiary button { max-width:100%; overflow-wrap:anywhere; text-align:start; }
    .ez-fselect { font-size:16px; }
    .ez-search input { font-size:16px; }
    .ez-results-tools .ez-btn-ghost { width:100%; justify-content:center; text-align:center; white-space:nowrap; }
  }



  .ez-card { position:relative; background:#FFFDF8; border:1px solid #E7DFCE; box-shadow:0 6px 18px rgba(53,24,19,.05); border-radius:12px; overflow:hidden; transition:transform .2s var(--ease-out), box-shadow .2s var(--ease-out), border-color .18s var(--ease-out); display:flex; flex-direction:column; content-visibility:auto; contain-intrinsic-size:auto 300px; }
  .ez-card:hover { transform:translateY(-2px); box-shadow:0 12px 26px rgba(53,24,19,.09); border-color:rgba(100,0,0,.25); }
  .ez-card-featured { border-color:rgba(100,0,0,.28); }
  .ez-card-link { text-decoration:none; color:inherit; display:flex; flex-direction:column; flex:1; }
  .ez-card-img { aspect-ratio:4/3; background-color:#EFE7DA; position:relative; overflow:hidden; }
  .ez-card-img > img { width:100%; height:100%; object-fit:cover; display:block; }
  .ez-card:hover .ez-card-img { transform:none; }
  .ez-more-sentinel { height:1px; }

  .ez-badge { position:absolute; top:10px; inset-inline-start:10px; background:rgba(255,253,248,.92); border:1px solid rgba(100,0,0,.12); color:var(--brand); padding:3px 8px; border-radius:20px; font-size:9.5px; font-weight:600; }

  .ez-card-body { padding:11px 13px 13px; flex:1; display:flex; flex-direction:column; gap:3px; }

  .ez-card-kicker { font-size:11px; letter-spacing:2px; color:var(--brand); font-weight:500; margin-bottom:6px; }
  .ez-card-toprow { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .ez-card-toprow .ez-card-kicker, .ez-card-toprow .ez-card-meta { margin-bottom:6px; }
  .ez-card-more { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:600; color:var(--brand); white-space:nowrap; }

  .ez-card-head { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:0; }
  .ez-card-head h3 { font-size:15px; font-weight:600; color:var(--ink); margin:0; line-height:1.5; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
  .ez-rating { display:inline-flex; align-items:center; gap:4px; font-size:12px; color:var(--brand); white-space:nowrap; }
  .ez-card-meta { display:flex; align-items:center; gap:4px; font-size:11.5px; color:var(--muted); margin-bottom:0; }
  .ez-card-desc { font-size:13px; color:var(--muted); line-height:1.8; margin:0 0 12px; flex:1; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
  .ez-card-tags { display:flex; flex-wrap:wrap; align-items:flex-start; gap:6px; margin:0 0 12px; }
  .ez-card-tag { display:inline-block; max-width:100%; border:1px solid #000; background:color-mix(in oklab, var(--surface) 70%, transparent); color:#000; font-size:11px; font-weight:500; line-height:1.6; padding:4px 9px; border-radius:2px; white-space:normal; overflow-wrap:anywhere; text-align:start; }
  .ez-card-price { border-top:1px dashed var(--line); margin-top:7px; padding-top:7px; display:flex; align-items:baseline; gap:6px; }
  .ez-card-price small { color:var(--muted); font-size:10.5px; }


  .ez-card-price strong { color:var(--brand); font-size:13px; font-weight:600; }
  .ez-card-foot { padding:0 13px 12px; }
  .ez-wa-btn { display:flex; width:100%; align-items:center; justify-content:center; gap:7px; background:var(--brand); color:#fff; padding:9px 12px; border-radius:8px; text-decoration:none; font-size:12.5px; font-weight:600; border:1px solid var(--brand); cursor:pointer; font-family:inherit; transition:background .2s var(--ease-out), transform .2s var(--ease-out); }
  .ez-wa-btn svg, .ez-wa-btn svg path { color:#fff; fill:currentColor; }
  .ez-wa-btn:hover { background:var(--brand-dark); border-color:var(--brand-dark); color:#fff; transform:translateY(-1px); }
  .ez-wa-btn:disabled { background:color-mix(in oklab, var(--muted) 40%, transparent); border-color:transparent; color:#fff; cursor:not-allowed; transform:none; }

  /* FAQ */
  .ez-faq { margin-top:26px; border-top:1px solid var(--line); }
  .ez-faq-item { border-bottom:1px solid var(--line); }
  .ez-faq-item button { width:100%; display:flex; align-items:center; justify-content:space-between; gap:16px; background:none; border:none; padding:16px 4px; font-family:inherit; font-size:16px; font-weight:600; color:var(--ink); cursor:pointer; text-align:start; }
  .ez-faq-item i { font-style:normal; color:var(--brand); font-size:16px; width:28px; height:28px; border-radius:50%; background:var(--bg); display:inline-flex; align-items:center; justify-content:center; flex:0 0 auto; transition:transform .2s var(--ease-out); }
  .ez-faq-item p { color:var(--muted); font-size:15px; line-height:1.9; margin:0 4px 16px; max-width:760px; }
  .ez-faq-item.open button { color:var(--brand); }
  .ez-faq-item.open i { transform:rotate(45deg); }

  /* FOOTER */
  .ez-footer { background:var(--brand); color:#fff; padding:0; }
  .ez-footer-grid { max-width:1240px; margin:0 auto; padding:52px 32px 44px; display:grid; grid-template-columns:1.2fr .8fr .9fr; gap:36px; }
  .ez-footer-brand { max-width:400px; }
  .ez-footer-brand img { height:64px; width:auto; object-fit:contain; background:#fff; border-radius:8px; padding:6px 10px; }
  .ez-footer-brand p { color:#fff; font-size:13.5px; line-height:1.95; margin:16px 0 0; }
  .ez-footer-col h3 { font-size:14px; font-weight:500; margin:0; color:#fff; }
  .ez-footer-links { margin-top:18px; display:grid; gap:12px; justify-items:start; font-size:13.5px; color:#fff; }
  .ez-footer-links a, .ez-footer-links button { color:#fff; text-decoration:none; background:transparent; border:none; padding:0; cursor:pointer; font-family:inherit; font-size:13.5px; text-align:start; }
  .ez-footer-links a:hover, .ez-footer-links button:hover { color:#fff; }
  .ez-footer-wa { display:inline-flex !important; align-items:center; gap:8px; color:#fff !important; font-weight:500; border:1px solid rgba(255,255,255,.28); padding:9px 18px; border-radius:6px; }
  .ez-footer-wa:hover { background:#fff; color:var(--brand) !important; }
  .ez-footer-bar { border-top:1px solid rgba(255,255,255,.14); display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; padding:18px 32px; font-size:11.5px; color:#fff; }


  /* MODAL */
  .ez-about-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; animation:ezFade .2s ease; }
  .ez-about-modal { background:var(--surface); max-width:560px; width:100%; border-radius:10px; padding:28px 24px 24px; position:relative; box-shadow:0 20px 60px rgba(0,0,0,.3); max-height:85vh; overflow-y:auto; border-top:4px solid var(--brand); }
  .ez-about-close { position:absolute; top:10px; left:14px; background:transparent; border:none; font-size:28px; line-height:1; cursor:pointer; color:var(--muted); padding:4px 10px; border-radius:8px; }
  .ez-about-title { color:var(--brand); font-size:22px; margin:0 0 16px; font-weight:600; text-align:center; }
  .ez-about-text { color:var(--ink); font-size:15px; line-height:1.9; margin:0 0 12px; }
  @keyframes ezFade { from { opacity:0 } to { opacity:1 } }

  /* ACCOUNT */
  .ez-acct { position:relative; }
  .ez-acct-btn { display:flex; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--line); border-radius:50px; padding:4px 10px 4px 4px; cursor:pointer; font-family:inherit; }
  .ez-acct-btn:hover { border-color:var(--brand); }
  .ez-acct-avatar { width:32px; height:32px; border-radius:50%; background:var(--brand); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:14px; }
  .ez-acct-avatar.lg { width:44px; height:44px; font-size:18px; }
  .ez-acct-caret { color:var(--brand); font-size:12px; }
  .ez-acct-menu { position:absolute; top:calc(100% + 8px); inset-inline-end:0; background:var(--surface); border:1px solid var(--line); border-radius:10px; box-shadow:0 12px 30px rgba(122,20,20,.16); min-width:240px; padding:8px; z-index:200; }
  .ez-acct-head { display:flex; align-items:center; gap:10px; padding:10px 8px; border-bottom:1px solid var(--line); margin-bottom:6px; }
  .ez-acct-title { font-weight:600; font-size:14px; }
  .ez-acct-email { font-size:12px; color:var(--muted); word-break:break-all; }
  .ez-acct-item { display:block; width:100%; text-align:start; padding:10px 12px; border-radius:8px; color:var(--ink); text-decoration:none; font-size:14px; font-weight:500; background:transparent; border:none; cursor:pointer; font-family:inherit; }
  .ez-acct-item:hover { background:#F2EDE1; color:var(--brand); }
  .ez-acct-out { color:var(--brand); }

  /* ── burger + mobile drawer ── */
  .ez-burger { display:none; align-items:center; justify-content:center; width:40px; height:40px; border:1px solid var(--line); background:#fff; border-radius:8px; color:var(--ink); cursor:pointer; }
  .ez-backhome { max-width:1180px; margin:0 auto; padding:18px 24px 0; }
  .ez-backhome a { display:inline-flex; align-items:center; gap:8px; color:var(--brand); font-size:12.5px; font-weight:600; text-decoration:none; }
  .ez-backhome a:hover { color:var(--brand-dark); }
  .ez-backhome svg { transform:scaleX(-1); }
  .ez-drawer-overlay { position:fixed; inset:0; background:rgba(20,12,10,.45); z-index:300; display:flex; justify-content:flex-start; }
  .ez-drawer { width:min(320px, 86vw); height:100%; background:#FDFBF5; display:flex; flex-direction:column; box-shadow:0 0 40px rgba(0,0,0,.2); animation:ezDrawerIn .22s ease; }
  @keyframes ezDrawerIn { from { transform:translateX(-100%); } to { transform:none; } }
  .ez-drawer-head { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--line); }
  .ez-drawer-head img { height:46px; width:auto; }
  .ez-drawer-close { width:34px; height:34px; border:1px solid var(--line); background:#fff; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; color:var(--ink); }
  .ez-drawer-menu { flex:1; overflow-y:auto; padding:6px 0; }
  .ez-drawer-menu a { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; font-size:13.5px; font-weight:600; color:var(--ink); text-decoration:none; border-bottom:1px solid var(--line); }
  .ez-drawer-menu a.active { color:var(--brand); }
  .ez-drawer-menu a small { color:var(--muted); font-size:12px; font-weight:500; }
  .ez-drawer-cta { margin:16px; background:var(--brand); color:#fff; border-radius:10px; padding:18px; text-align:center; }
  .ez-drawer-cta-ico { font-size:18px; }
  .ez-drawer-cta p { margin:8px 0 14px; font-size:12.5px; line-height:1.8; color:rgba(255,255,255,.9); }
  .ez-drawer-cta-btn { display:block; background:#FDFBF5; color:var(--brand); border-radius:6px; padding:10px; font-weight:600; font-size:13px; text-decoration:none; }

  /* ── cities page ── */
  .ez-city-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px,1fr)); gap:14px; margin-top:22px; }
  .ez-city-card { display:flex; flex-direction:column; align-items:flex-start; gap:6px; background:#fff; border:1px solid var(--line); border-radius:10px; padding:16px; cursor:pointer; text-align:start; font-family:inherit; transition:border-color .2s, transform .2s; }
  .ez-city-card:hover { border-color:var(--brand); transform:translateY(-2px); }
  .ez-city-ico { color:var(--brand); }
  .ez-city-name { font-size:15px; font-weight:600; color:var(--ink); }
  .ez-city-count { font-size:12.5px; color:var(--muted); }
  .ez-about-page { max-width:760px; margin-top:18px; display:grid; gap:14px; }
  .ez-about-page p { font-size:15px; line-height:2; color:var(--ink); }

  @media (max-width: 1024px) {
    .ez-burger { display:inline-flex; }
    .ez-nav { flex-wrap:wrap; padding-bottom:8px; }
    .ez-nav-menu { display:none; }
    .ez-hero-grid { grid-template-columns:1fr; gap:32px; min-height:0; }
    .ez-hero-media { max-width:none; }
    .ez-console { grid-template-columns:repeat(2,1fr); margin-inline:16px; border-radius:18px; }
    .ez-console-btn { grid-column:1 / -1; margin-top:2px; }
  }

  @media (max-width: 640px) {
    .ez-nav { padding:8px 16px; }
    .ez-brand-logo { height:52px; }

    .ez-hero-grid { padding:24px 16px 44px; }
    .ez-hero-frame { display:none; }

    .ez-h2 { font-size:26px; }
    .ez-sec { padding:44px 16px; }
    .ez-console { grid-template-columns:1fr; padding:12px; }
    .ez-console-field label { font-size:11px; }
    .ez-console-field select { font-size:12.5px; max-width:100%; height:42px; }
    .ez-fchips { padding:0 16px; }

    .ez-cat-grid { grid-template-columns:repeat(3, minmax(0,1fr)); gap:14px 10px; }
    .ez-cat-thumb { border-radius:14px; }
    .ez-cat-label { font-size:12px; }
    .ez-search { min-width:0; width:100%; }
    .ez-results-tools { width:100%; }
    .ez-footer-brand { max-width:none; }
    .ez-footer-grid { grid-template-columns:1fr; padding:40px 16px 32px; gap:28px; }
    .ez-footer-bar { padding:16px; }

    /* unified with provider page */
    .ez-nav-cta { height:40px; padding:0 14px; font-size:12.5px; border-radius:6px; }
    .ez-nav-btn { height:40px; display:inline-flex; align-items:center; padding:0 14px; font-size:12.5px; border-radius:6px; }
    .ez-console-btn { min-height:48px; border-radius:12px; }
    .ez-wa-btn { min-height:42px; padding:0; font-size:12.5px; }
    .ez-card-fav { inset-inline-start:auto; inset-inline-end:9px; }
    .ez-hero-copy, .ez-sec-head, .ez-card-body { text-align:right; }
    .ez-card-head { flex-wrap:wrap; }
    .ez-fchips, .ez-filters-bar { justify-content:flex-start; }
    .ez-card-head h3 { font-size:13.5px; min-width:0; overflow-wrap:anywhere; }
    .ez-card-desc { -webkit-line-clamp:2; }
  }

  @media (max-width: 900px) {
    .ez-card-more { display:none; }
    .ez-card-head { flex-wrap:wrap; }
    .ez-card-head h3 { min-width:0; overflow-wrap:anywhere; }
    .ez-card-toprow { flex-wrap:wrap; }
    .ez-card-toprow .ez-card-kicker,
    .ez-card-toprow .ez-card-meta { min-width:0; overflow-wrap:anywhere; }
    .ez-card-price { min-width:0; }
    .ez-card-price strong { overflow-wrap:anywhere; }
  }
`;


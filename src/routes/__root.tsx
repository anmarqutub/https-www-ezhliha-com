import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const CANONICAL_HOST = "www.ezhliha.com";

function useCanonicalHostRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    if (host.endsWith(".lovable.app")) {
      const target = `https://${CANONICAL_HOST}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(target);
    }
  }, []);
}

function useAdminFont() {
  useEffect(() => {
    let cancelled = false;
    supabase.from("site_texts").select("value").eq("key", "site.font_family").maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const family = (data?.value ?? "").trim();
        if (!family) return;
        const stack = `"${family}", Tajawal, system-ui, sans-serif`;
        document.documentElement.style.setProperty("--site-font", stack);
        document.body.style.fontFamily = stack;
      });
    return () => { cancelled = true; };
  }, []);
}


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "إزهليها — دليلك للمناسبات" },
      { name: "description", content: "إزهليها منصة سعودية لاكتشاف مزودي خدمات المناسبات والتواصل معهم بسهولة." },
      { name: "author", content: "Ezhliha" },
      { name: "robots", content: "noai, noimageai" },
      { name: "GPTBot", content: "noindex, nofollow" },
      { name: "ChatGPT-User", content: "noindex, nofollow" },
      { name: "ClaudeBot", content: "noindex, nofollow" },
      { name: "anthropic-ai", content: "noindex, nofollow" },
      { name: "Google-Extended", content: "noindex, nofollow" },
      { name: "PerplexityBot", content: "noindex, nofollow" },
      { name: "CCBot", content: "noindex, nofollow" },
      { property: "og:title", content: "إزهليها — دليلك للمناسبات" },
      { property: "og:description", content: "اكتشف مزودي خدمات المناسبات في السعودية وتواصل معهم بسهولة عبر إزهليها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "إزهليها — دليلك للمناسبات" },
      { name: "twitter:description", content: "اكتشف مزودي خدمات المناسبات في السعودية وتواصل معهم بسهولة عبر إزهليها." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800&family=Almarai:wght@300;400;700;800&family=Amiri:wght@400;700&family=Cairo:wght@300;400;600;700;900&family=Changa:wght@300;400;600;800&family=El+Messiri:wght@400;600;700&family=Noto+Kufi+Arabic:wght@300;400;600;800&family=Noto+Sans+Arabic:wght@300;400;500;600;700&family=Rakkas&family=Reem+Kufi+Fun:wght@400..700&family=Tajawal:wght@300;400;500;700;800;900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useCanonicalHostRedirect();
  useAdminFont();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}

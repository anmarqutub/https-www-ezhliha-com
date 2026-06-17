import { createStart, createMiddleware } from "@tanstack/react-start";

import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { renderErrorPage } from "./lib/error-page";

const AI_BOT_PATTERN =
  /(GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|Google-Extended|PerplexityBot|Perplexity-User|CCBot|Bytespider|cohere-ai|Applebot-Extended|Meta-ExternalAgent|Meta-ExternalFetcher|Amazonbot|DuckAssistBot|YouBot|Diffbot|Omgilibot|Omgili|TimpiBot|Webzio-Extended|ImagesiftBot|FacebookBot)/i;

const blockAiBotsMiddleware = createMiddleware().server(async ({ next, request }) => {
  const ua = request?.headers?.get?.("user-agent") ?? "";
  if (ua && AI_BOT_PATTERN.test(ua)) {
    return new Response("Access denied: AI crawlers are not allowed.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noai, noimageai, noindex" },
    });
  }
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [blockAiBotsMiddleware, errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));

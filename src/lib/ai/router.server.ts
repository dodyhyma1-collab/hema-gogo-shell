import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type TaskType = "code" | "reasoning" | "long_context" | "fast";
export type ModelStat = { calls: number; fails: number; totalMs: number; tokens: number; accepted: number; rejected: number };
export type RouterPrefs = { auto: boolean; overrides: Partial<Record<TaskType, string>>; disabled: string[]; stats: Record<string, ModelStat> };

export const MODELS = ["anthropic/claude-sonnet-5", "openai/gpt-6-astra", "google/gemini-3.1-pro-preview", "google/gemini-3.8-flash"] as const;

/** Default preference order per task; the first entry is primary, the rest are fallbacks. */
export const CHAINS: Record<TaskType, string[]> = {
  code: ["anthropic/claude-sonnet-5", "openai/gpt-6-astra", "google/gemini-3.1-pro-preview"],
  reasoning: ["openai/gpt-6-astra", "anthropic/claude-sonnet-5", "google/gemini-3.1-pro-preview"],
  long_context: ["google/gemini-3.1-pro-preview", "openai/gpt-6-astra", "anthropic/claude-sonnet-5"],
  fast: ["google/gemini-3.8-flash", "openai/gpt-6-astra", "anthropic/claude-sonnet-5"],
};

const CODE_RE = /\b(code|component|page|layout|refactor|typescript|react|tailwind|api route|function|table|ui|bug|file)\b|كود|صفحة|تصميم الواجهة/i;
const FAST_RE = /\b(webhook|whatsapp|send|reply|remind|translate|dark mode|theme|open|filter)\b|ارسل|واتساب|ترجم/i;

export function classify(lastText: string, totalChars: number, mode: string): TaskType {
  if (totalChars > 24000 || lastText.length > 6000) return "long_context";
  if (mode === "developer" || CODE_RE.test(lastText)) return "code";
  if (lastText.length < 140 && FAST_RE.test(lastText)) return "fast";
  return "reasoning";
}

/** Learned score: acceptance rate penalised by failure rate; neutral until enough data. */
function score(s?: ModelStat) {
  if (!s || s.calls < 3) return 0.5;
  const rated = s.accepted + s.rejected;
  const acceptance = rated ? s.accepted / rated : 0.5;
  return acceptance - (s.fails / s.calls) * 0.8;
}

export function pickChain(task: TaskType, prefs: RouterPrefs): string[] {
  let chain = CHAINS[task].filter((m) => !prefs.disabled.includes(m));
  const override = prefs.overrides[task];
  if (override && !prefs.disabled.includes(override)) chain = [override, ...chain.filter((m) => m !== override)];
  else if (prefs.auto) {
    const [primary, ...rest] = chain;
    // Demote the primary only when learned data clearly favours another model.
    const best = rest.reduce<string | undefined>((b, m) => (score(prefs.stats[m]) > score(prefs.stats[b ?? ""]) ? m : b), undefined);
    if (primary && best && score(prefs.stats[best]) - score(prefs.stats[primary]) > 0.25) chain = [best, primary, ...rest.filter((m) => m !== best)];
  }
  return chain.length ? chain : ["openai/gpt-6-astra"];
}

const BASE = "https://ai.gateway.lovable.dev/v1";

export function modelFor(id: string, apiKey: string, fetchImpl: typeof fetch): { model: LanguageModel; providerOptions: Record<string, Record<string, never>> } {
  if (id.startsWith("openai/")) {
    const p = createOpenAI({ baseURL: BASE, apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: fetchImpl });
    return { model: p.responses(id), providerOptions: { openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } as never } };
  }
  if (id.startsWith("anthropic/")) {
    const p = createAnthropic({ baseURL: BASE, apiKey, headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: fetchImpl });
    return { model: p(id), providerOptions: { anthropic: { thinking: { type: "adaptive", display: "summarized" } } as never } };
  }
  const p = createOpenAICompatible({ name: "lovable", baseURL: BASE, apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: fetchImpl });
  return { model: p.chatModel(id), providerOptions: {} };
}

/** Only rate limits and provider outages trigger failover; credit, auth and denial errors stop. */
export function isRetryable(err: unknown) {
  const status = (err as { statusCode?: number })?.statusCode;
  return status === 429 || (typeof status === "number" && status >= 500);
}

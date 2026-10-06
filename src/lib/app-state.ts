import { useSyncExternalStore } from "react";
import { applyRuntimeConfig, readRuntimeConfig, type ThemeName } from "@/lib/ai-hema-runtime";

/** Global app state shared by every module and controllable by AI Hema (persisted in this browser). */
export type AppLead = { id: string; name: string; company: string; city: string; score: number };
export type InvoiceStatus = "paid" | "unpaid" | "cancelled";
export type AppState = {
  darkMode: boolean;
  inboxFilter: "unread" | "mine" | "all";
  aiLeads: AppLead[];
  invoiceStatus: Record<string, InvoiceStatus>;
  webhookUrl: string;
  webhookEvents: WebhookEvent[];
  leadScoreMin: number;
  jobKeywords: string[];
  workflowRuns: { id: string; workflow: string; at: string }[];
  connections: Record<string, { status: "connected" | "disconnected" | "reauth"; keyHint?: string; webhook?: string; connectedAt?: string }>;
  assignments: Partial<Record<"inbox" | "leads" | "finance" | "logistics" | "agentHub", string>>;
  wiredWorkflows: { id: string; name: string; integrations: string[]; at: string }[];
  agentPaused: boolean;
  pipelines: Pipeline[];
  router: { auto: boolean; overrides: Partial<Record<TaskType, string>>; disabled: string[] };
  modelStats: Record<string, ModelStat>;
};
export type TaskType = "code" | "reasoning" | "long_context" | "fast";
export type ModelStat = { calls: number; fails: number; totalMs: number; tokens: number; accepted: number; rejected: number };
export type PipelineStep = { integrationId: string; event: string; endpoint: string; payload: string };
export type Pipeline = { id: string; name: string; steps: PipelineStep[]; at: string };
export type WebhookEventName = "lead.contacted" | "lead.negotiation" | "payment.verified" | "design.export_ready" | "logo.sent_whatsapp" | "job_post.captured" | "workflow.triggered";
export type WebhookEvent = { id: string; event: WebhookEventName; at: string; payload: Record<string, unknown>; status: "delivered" | "failed"; target: string };

const KEY = "hema-gogo-app-state-v1";
const EVENT = "hema-gogo-app-state-change";
const initial: AppState = {
  darkMode: false, inboxFilter: "all", aiLeads: [], invoiceStatus: {}, webhookUrl: "https://hooks.hemagogo.app/v1/out/hg_live_7f3k", webhookEvents: [], leadScoreMin: 60, jobKeywords: ["logo", "graphic designer", "branding", "لوجو", "مصمم"], workflowRuns: [],
  connections: { whatsapp: { status: "connected", keyHint: "••••8f2a" }, instapay: { status: "connected", keyHint: "••••auto" }, bosta: { status: "reauth", keyHint: "••••41c0" } },
  assignments: { inbox: "whatsapp", finance: "instapay", logistics: "bosta" },
  wiredWorkflows: [],
  agentPaused: false,
  pipelines: [],
  router: { auto: true, overrides: {}, disabled: [] },
  modelStats: {},
};
let cache: AppState | null = null;

export function getAppState(): AppState {
  if (typeof window === "undefined") return initial;
  if (!cache) {
    try { cache = { ...initial, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { cache = initial; }
  }
  return cache!;
}

export function setAppState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const cur = getAppState();
  cache = { ...cur, ...(typeof patch === "function" ? patch(cur) : patch) };
  localStorage.setItem(KEY, JSON.stringify(cache));
  applyDarkMode(cache.darkMode);
  window.dispatchEvent(new Event(EVENT));
}

export function applyDarkMode(on: boolean) {
  document.documentElement.classList.toggle("dark", on);
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

export function useAppState<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => select(getAppState()), () => select(initial));
}

/** Fires an outgoing webhook (simulated delivery to the configured n8n/Make endpoint) and logs it. */
export function emitWebhook(event: WebhookEventName, payload: Record<string, unknown>) {
  const s = getAppState();
  const ev: WebhookEvent = { id: `WH-${Date.now().toString(36).toUpperCase()}`, event, at: new Date().toISOString(), payload, status: s.webhookUrl.startsWith("https://") ? "delivered" : "failed", target: s.webhookUrl };
  setAppState((x) => ({ webhookEvents: [ev, ...x.webhookEvents].slice(0, 60) }));
  return ev;
}

/** Action Execution Bridge: applies an AI Hema app action to global state. Returns a short confirmation. */
export type AppAction =
  | { type: "set_dark_mode"; enabled: boolean }
  | { type: "set_theme"; theme: ThemeName }
  | { type: "add_lead"; name: string; company: string; city: string; score: number }
  | { type: "update_invoice_status"; invoiceId: string; status: InvoiceStatus }
  | { type: "filter_inbox"; filter: AppState["inboxFilter"] }
  | { type: "navigate"; page: string }
  | { type: "set_layout"; density?: "comfortable" | "compact"; showQuickPrompts?: boolean; showGenerationHub?: boolean; showAuditLog?: boolean }
  | { type: "set_lead_scoring"; minScore: number; keywords?: string[] }
  | { type: "trigger_workflow"; workflow: string }
  | { type: "emit_webhook"; event: WebhookEventName; payload: Record<string, unknown> }
  | { type: "set_webhook_url"; url: string }
  | { type: "connect_integrations"; ids: string[] }
  | { type: "assign_integration"; workspace: "inbox" | "leads" | "finance" | "logistics" | "agentHub"; integrationId: string }
  | { type: "wire_workflow"; name: string; ids: string[] }
  | { type: "create_pipeline"; name: string; steps: PipelineStep[] };

let integrationOps: null | {
  connect: (id: string) => void;
  assign: (w: "inbox" | "leads" | "finance" | "logistics" | "agentHub", id: string) => void;
  wire: (name: string, ids: string[]) => void;
} = null;
/** Registered by src/lib/integrations.ts to avoid a circular import. */
export function registerIntegrationOps(ops: NonNullable<typeof integrationOps>) { integrationOps = ops; }

export function executeAppAction(action: AppAction, navigate: (path: string) => void): string {
  switch (action.type) {
    case "set_dark_mode":
      setAppState({ darkMode: action.enabled });
      return action.enabled ? "Dark mode on" : "Light mode on";
    case "set_theme": {
      const cfg = { ...readRuntimeConfig(), theme: action.theme };
      applyRuntimeConfig(cfg);
      return `Theme: ${action.theme}`;
    }
    case "add_lead":
      setAppState((s) => ({ aiLeads: [{ id: `ai-${Date.now()}`, name: action.name, company: action.company, city: action.city, score: action.score }, ...s.aiLeads] }));
      return `Lead added: ${action.name}`;
    case "update_invoice_status":
      setAppState((s) => ({ invoiceStatus: { ...s.invoiceStatus, [action.invoiceId]: action.status } }));
      return `${action.invoiceId} → ${action.status}`;
    case "filter_inbox":
      setAppState({ inboxFilter: action.filter });
      navigate("/inbox");
      return `Inbox filter: ${action.filter}`;
    case "navigate":
      navigate(action.page);
      return `Opened ${action.page}`;
    case "set_layout": {
      const { type: _t, ...patch } = action;
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== null));
      applyRuntimeConfig({ ...readRuntimeConfig(), ...clean });
      return "Layout updated";
    }
    case "set_lead_scoring":
      setAppState((s) => ({ leadScoreMin: action.minScore, jobKeywords: action.keywords?.length ? action.keywords : s.jobKeywords }));
      return `Lead threshold: ${action.minScore}`;
    case "trigger_workflow":
      setAppState((s) => ({ workflowRuns: [{ id: `RUN-${Date.now()}`, workflow: action.workflow, at: new Date().toISOString() }, ...s.workflowRuns].slice(0, 30) }));
      emitWebhook("workflow.triggered", { workflow: action.workflow });
      return `Workflow run: ${action.workflow}`;
    case "emit_webhook":
      emitWebhook(action.event, action.payload);
      return `Webhook sent: ${action.event}`;
    case "set_webhook_url":
      setAppState({ webhookUrl: action.url });
      return "Webhook URL updated";
    case "connect_integrations":
      action.ids.forEach((id) => integrationOps?.connect(id));
      return `Connected: ${action.ids.join(", ")}`;
    case "assign_integration":
      integrationOps?.assign(action.workspace, action.integrationId);
      return `${action.workspace} → ${action.integrationId}`;
    case "wire_workflow":
      integrationOps?.wire(action.name, action.ids);
      emitWebhook("workflow.triggered", { workflow: action.name, integrations: action.ids });
      return `Workflow wired: ${action.name}`;
    case "create_pipeline":
      setAppState((s) => ({ pipelines: [{ id: `PL-${Date.now().toString(36).toUpperCase()}`, name: action.name, steps: action.steps, at: new Date().toISOString() }, ...s.pipelines].slice(0, 30) }));
      return `Pipeline created: ${action.name}`;
  }
}

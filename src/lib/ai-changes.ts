import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyRuntimeConfig, readRuntimeConfig, type RuntimeConfig } from "@/lib/ai-hema-runtime";
import { executeAppAction, getAppState, setAppState, type AppAction, type AppState } from "@/lib/app-state";

/** Ledger of every change AI Hema makes or proposes. Config changes can be rolled back; code changes are proposals. */
export type ChangeKind = "config" | "code";
export type ChangeStatus = "pending" | "applied" | "rolled_back" | "rejected" | "approved";
export type Snapshot = { app: Partial<AppState>; config: Partial<RuntimeConfig> };
export type AiChange = {
  id: string;
  kind: ChangeKind;
  title: string;
  target: string;
  filePath?: string;
  before: Snapshot | null;
  after: Snapshot | null;
  action?: AppAction;
  code?: string;
  status: ChangeStatus;
  createdAt: string;
};

const KEY = "hema-gogo-ai-changes-v1";
const EVENT = "hema-gogo-ai-changes";
let cache: AiChange[] | null = null;
const empty: AiChange[] = [];

function read(): AiChange[] {
  if (typeof window === "undefined") return empty;
  if (!cache) {
    try { cache = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { cache = []; }
  }
  return cache!;
}

function write(list: AiChange[]) {
  cache = list.slice(0, 100);
  localStorage.setItem(KEY, JSON.stringify(cache));
  window.dispatchEvent(new Event(EVENT));
}

async function persist(c: AiChange) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;
  const { error } = await supabase.from("ai_changes").upsert({
    id: c.id, user_id: uid, kind: c.kind, title: c.title, target: c.target, file_path: c.filePath ?? null,
    before: c.before as never, after: { ...(c.after ?? {}), action: c.action ?? null } as never, code: c.code ?? null, status: c.status, created_at: c.createdAt,
  });
  if (error) console.error("[ai_changes] save failed", error.message);
}

export function upsertChange(c: AiChange) {
  const list = read();
  write(list.some((x) => x.id === c.id) ? list.map((x) => (x.id === c.id ? c : x)) : [c, ...list]);
  void persist(c);
}

export function useChanges(): AiChange[] {
  return useSyncExternalStore(
    (cb) => { window.addEventListener(EVENT, cb); return () => window.removeEventListener(EVENT, cb); },
    read,
    () => empty,
  );
}

export function getChange(id: string) { return read().find((c) => c.id === id); }

const snapshot = (): { app: AppState; config: RuntimeConfig } => ({ app: structuredClone(getAppState()), config: { ...readRuntimeConfig() } });

function diffKeys<T extends object>(a: T, b: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys({ ...a, ...b }) as (keyof T)[]) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out[k] = a[k];
  return out;
}

export const targetFor = (a: AppAction): string => {
  switch (a.type) {
    case "filter_inbox": return "/inbox";
    case "add_lead": case "set_lead_scoring": return "/leads";
    case "update_invoice_status": return "/finance";
    case "assign_integration": return `/${a.workspace === "agentHub" ? "agent-hub" : a.workspace}`;
    case "set_layout": case "set_theme": case "set_dark_mode": return "app";
    default: return "workflows";
  }
};

/** Runs an action and records exactly which settings it changed, so it can be rolled back. */
export function runTrackedAction(id: string, title: string, action: AppAction, navigate: (p: string) => void, status: ChangeStatus = "applied"): string {
  if (status === "pending") {
    upsertChange({ id, kind: "config", title, target: targetFor(action), before: null, after: null, action, status: "pending", createdAt: new Date().toISOString() });
    return "Queued for your approval (AI Hema is paused)";
  }
  const pre = snapshot();
  const msg = executeAppAction(action, navigate);
  const post = snapshot();
  const appBefore = diffKeys(pre.app, post.app);
  const keys = Object.keys(appBefore) as (keyof AppState)[];
  const appAfter = Object.fromEntries(keys.map((k) => [k, post.app[k]])) as Partial<AppState>;
  const cfgBefore = diffKeys(pre.config, post.config);
  const cfgAfter = Object.fromEntries(Object.keys(cfgBefore).map((k) => [k, post.config[k as keyof RuntimeConfig]])) as Partial<RuntimeConfig>;
  upsertChange({ id, kind: "config", title, target: targetFor(action), before: { app: appBefore, config: cfgBefore }, after: { app: appAfter, config: cfgAfter }, action, status: "applied", createdAt: new Date().toISOString() });
  return msg;
}

export function rollbackChange(id: string) {
  const c = getChange(id);
  if (!c || c.status !== "applied" || !c.before) return;
  if (Object.keys(c.before.app).length) setAppState(c.before.app);
  if (Object.keys(c.before.config).length) applyRuntimeConfig({ ...readRuntimeConfig(), ...c.before.config });
  upsertChange({ ...c, status: "rolled_back" });
}

export function reapplyChange(id: string, navigate: (p: string) => void) {
  const c = getChange(id);
  if (!c?.action) return;
  runTrackedAction(c.id, c.title, c.action, navigate);
}

export function setChangeStatus(id: string, status: ChangeStatus) {
  const c = getChange(id);
  if (c) upsertChange({ ...c, status });
}

export async function loadCloudChanges() {
  const { data, error } = await supabase.from("ai_changes").select("*").order("created_at", { ascending: false }).limit(100);
  if (error || !data) return;
  const list: AiChange[] = data.map((r) => {
    const after = (r.after ?? {}) as Snapshot & { action?: AppAction | null };
    return { id: r.id, kind: r.kind as ChangeKind, title: r.title, target: r.target ?? "", filePath: r.file_path ?? undefined, before: r.before as Snapshot | null, after: { app: after.app ?? {}, config: after.config ?? {} }, action: after.action ?? undefined, code: r.code ?? undefined, status: r.status as ChangeStatus, createdAt: r.created_at };
  });
  write(list);
}

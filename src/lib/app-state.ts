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
};

const KEY = "hema-gogo-app-state-v1";
const EVENT = "hema-gogo-app-state-change";
const initial: AppState = { darkMode: false, inboxFilter: "all", aiLeads: [], invoiceStatus: {} };
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

/** Action Execution Bridge: applies an AI Hema app action to global state. Returns a short confirmation. */
export type AppAction =
  | { type: "set_dark_mode"; enabled: boolean }
  | { type: "set_theme"; theme: ThemeName }
  | { type: "add_lead"; name: string; company: string; city: string; score: number }
  | { type: "update_invoice_status"; invoiceId: string; status: InvoiceStatus }
  | { type: "filter_inbox"; filter: AppState["inboxFilter"] }
  | { type: "navigate"; page: string };

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
  }
}

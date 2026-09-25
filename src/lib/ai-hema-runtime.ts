import type { UIMessage } from "ai";

export type ThemeName = "executive" | "ocean" | "emerald" | "graphite";
export type LayoutDensity = "comfortable" | "compact";

export type RuntimeConfig = {
  theme: ThemeName;
  density: LayoutDensity;
  showQuickPrompts: boolean;
  showGenerationHub: boolean;
  showAuditLog: boolean;
};

export type EvolutionStatus = "pending" | "applied" | "rejected";

export type EvolutionChange = {
  id: string;
  title: string;
  summary: string;
  command: string;
  createdAt: string;
  status: EvolutionStatus;
  patch: Partial<RuntimeConfig>;
  componentCode: string;
  configJson: string;
};

export type AiHemaThread = {
  id: string;
  title: string;
  updatedAt: string;
  messages: UIMessage[];
  audit: EvolutionChange[];
};

export const THREADS_KEY = "hema-gogo-ai-threads-v2";
export const CONFIG_KEY = "hema-gogo-runtime-config-v1";
export const RUNTIME_EVENT = "hema-gogo-runtime-change";

export const defaultRuntimeConfig: RuntimeConfig = {
  theme: "executive",
  density: "comfortable",
  showQuickPrompts: true,
  showGenerationHub: true,
  showAuditLog: true,
};

export function makeThread(id: string = crypto.randomUUID()): AiHemaThread {
  return {
    id,
    title: "New evolution session",
    updatedAt: new Date().toISOString(),
    messages: [],
    audit: [],
  };
}

export function readThreads(): AiHemaThread[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(THREADS_KEY) ?? "[]") as AiHemaThread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeThreads(threads: AiHemaThread[]) {
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

export function readRuntimeConfig(): RuntimeConfig {
  if (typeof window === "undefined") return defaultRuntimeConfig;
  try {
    return { ...defaultRuntimeConfig, ...JSON.parse(localStorage.getItem(CONFIG_KEY) ?? "{}") };
  } catch {
    return defaultRuntimeConfig;
  }
}

export function applyRuntimeConfig(config: RuntimeConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  document.documentElement.dataset["hemaTheme"] = config.theme;
  document.documentElement.dataset["hemaDensity"] = config.density;
  window.dispatchEvent(new CustomEvent(RUNTIME_EVENT, { detail: config }));
}

export function parseEvolutionCommand(command: string): Partial<RuntimeConfig> {
  const normalized = command.toLowerCase();
  const patch: Partial<RuntimeConfig> = {};

  if (/ocean|blue|أزرق|بحر/.test(normalized)) patch.theme = "ocean";
  if (/emerald|green|أخضر|زمرد/.test(normalized)) patch.theme = "emerald";
  if (/graphite|dark|داكن|رمادي/.test(normalized)) patch.theme = "graphite";
  if (/executive|default|افتراضي/.test(normalized)) patch.theme = "executive";
  if (/compact|dense|مضغوط/.test(normalized)) patch.density = "compact";
  if (/comfortable|spacious|مريح|واسع/.test(normalized)) patch.density = "comfortable";

  const hidden = /hide|remove|اخف|إخفاء/.test(normalized);
  const shown = /show|restore|اظهر|إظهار/.test(normalized);
  if (/quick prompt|suggestion|اقتراح/.test(normalized) && (hidden || shown)) patch.showQuickPrompts = shown;
  if (/generation hub|code hub|config hub|مركز التوليد|الكود/.test(normalized) && (hidden || shown)) patch.showGenerationHub = shown;
  if (/audit|evolution log|سجل/.test(normalized) && (hidden || shown)) patch.showAuditLog = shown;

  return patch;
}

export function createEvolutionChange(command: string, patch: Partial<RuntimeConfig>): EvolutionChange {
  const keys = Object.keys(patch) as Array<keyof RuntimeConfig>;
  const title = keys.length ? `Update ${keys.map((key) => key.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ")}` : "Review structural UI request";
  const configJson = JSON.stringify({ version: 1, scope: "workspace", changes: patch, approvalRequired: true }, null, 2);
  const componentCode = `export function EvolvedWorkspace() {\n  const config = ${JSON.stringify(patch, null, 2)};\n\n  return (\n    <WorkspaceShell theme={config.theme} density={config.density}>\n      {config.showQuickPrompts !== false && <QuickPrompts />}\n      {config.showGenerationHub !== false && <GenerationHub />}\n      {config.showAuditLog !== false && <EvolutionAudit />}\n    </WorkspaceShell>\n  );\n}`;

  return {
    id: crypto.randomUUID(),
    title,
    summary: keys.length ? `${keys.length} validated runtime setting${keys.length === 1 ? "" : "s"} ready for review.` : "A structural preview was generated. No executable source code will run automatically.",
    command,
    createdAt: new Date().toISOString(),
    status: "pending",
    patch,
    componentCode,
    configJson,
  };
}

import { getAppState, registerIntegrationOps, setAppState, useAppState } from "@/lib/app-state";

export type IntegrationCategory = "messaging" | "ai" | "payments" | "logistics" | "automation";
export type IntegrationStatus = "connected" | "disconnected" | "reauth";
export type WorkspaceKey = "inbox" | "leads" | "finance" | "logistics" | "agentHub";
export type AuthKind = "api_key" | "webhook" | "oauth";

export type IntegrationDef = {
  id: string;
  name: string;
  category: IntegrationCategory;
  auth: AuthKind;
  initials: string;
  description: { en: string; ar: string };
  workspaces: WorkspaceKey[];
};

export const INTEGRATIONS: IntegrationDef[] = [
  { id: "whatsapp", name: "WhatsApp Business", category: "messaging", auth: "api_key", initials: "WA", description: { en: "Send templates, replies and files to clients.", ar: "إرسال القوالب والردود والملفات للعملاء." }, workspaces: ["inbox", "agentHub", "leads"] },
  { id: "messenger", name: "Facebook Messenger", category: "messaging", auth: "oauth", initials: "FB", description: { en: "Page inbox and outreach messages.", ar: "رسائل الصفحة والتواصل." }, workspaces: ["inbox", "leads"] },
  { id: "instagram", name: "Instagram", category: "messaging", auth: "oauth", initials: "IG", description: { en: "Direct messages and comments.", ar: "الرسائل المباشرة والتعليقات." }, workspaces: ["inbox", "leads"] },
  { id: "lead_scraper", name: "Lead Scraper (n8n / Make)", category: "automation", auth: "webhook", initials: "LS", description: { en: "Job posts from Facebook groups and freelance boards.", ar: "طلبات من مجموعات فيسبوك ومنصات العمل الحر." }, workspaces: ["leads"] },
  { id: "openai", name: "OpenAI / DALL·E", category: "ai", auth: "api_key", initials: "OA", description: { en: "Text and image generation.", ar: "توليد النصوص والصور." }, workspaces: ["agentHub", "inbox"] },
  { id: "midjourney", name: "Midjourney", category: "ai", auth: "api_key", initials: "MJ", description: { en: "Logo and concept art generation.", ar: "توليد الشعارات والتصاميم." }, workspaces: ["agentHub"] },
  { id: "claude", name: "Claude", category: "ai", auth: "api_key", initials: "CL", description: { en: "Writing, negotiation and briefs.", ar: "الكتابة والتفاوض والملخصات." }, workspaces: ["agentHub", "inbox"] },
  { id: "instapay", name: "InstaPay OCR", category: "payments", auth: "webhook", initials: "IP", description: { en: "Verify transfer receipts automatically.", ar: "التحقق من إيصالات التحويل تلقائياً." }, workspaces: ["finance", "agentHub"] },
  { id: "paymob", name: "Paymob", category: "payments", auth: "api_key", initials: "PM", description: { en: "Card and wallet payment links.", ar: "روابط دفع بالبطاقات والمحافظ." }, workspaces: ["finance", "agentHub"] },
  { id: "fawry", name: "Fawry", category: "payments", auth: "api_key", initials: "FW", description: { en: "Fawry reference payments.", ar: "الدفع بكود فوري." }, workspaces: ["finance", "agentHub"] },
  { id: "bosta", name: "Bosta", category: "logistics", auth: "api_key", initials: "BS", description: { en: "Local delivery and COD.", ar: "التوصيل المحلي والدفع عند الاستلام." }, workspaces: ["logistics"] },
  { id: "aramex", name: "Aramex", category: "logistics", auth: "api_key", initials: "AX", description: { en: "Domestic and international shipping.", ar: "الشحن المحلي والدولي." }, workspaces: ["logistics"] },
];

export const INTEGRATION_IDS = INTEGRATIONS.map((i) => i.id) as [string, ...string[]];
export const getIntegration = (id: string) => INTEGRATIONS.find((i) => i.id === id);

export const WORKSPACE_TASKS: Record<WorkspaceKey, { en: string; ar: string }> = {
  inbox: { en: "Messaging channel", ar: "قناة المراسلة" },
  leads: { en: "Lead source", ar: "مصدر العملاء" },
  finance: { en: "Invoicing & payments", ar: "الفواتير والدفع" },
  logistics: { en: "Shipping carrier", ar: "شركة الشحن" },
  agentHub: { en: "Logo generation", ar: "توليد الشعارات" },
};

export type Connection = { status: IntegrationStatus; keyHint?: string; webhook?: string; connectedAt?: string };
export type WiredWorkflow = { id: string; name: string; integrations: string[]; at: string };

const webhookFor = (id: string) => `https://hooks.hemagogo.app/v1/in/${id}/hg_${Math.random().toString(36).slice(2, 8)}`;

export function connectIntegration(id: string, secret?: string) {
  setAppState((s) => ({
    connections: {
      ...s.connections,
      [id]: { status: "connected", keyHint: secret ? `••••${secret.slice(-4)}` : s.connections[id]?.keyHint ?? "••••auto", webhook: s.connections[id]?.webhook ?? webhookFor(id), connectedAt: new Date().toISOString() },
    },
  }));
}
export function setIntegrationStatus(id: string, status: IntegrationStatus) {
  setAppState((s) => ({ connections: { ...s.connections, [id]: { ...(s.connections[id] ?? {}), status } } }));
}
export function assignIntegration(workspace: WorkspaceKey, id: string) {
  if (getAppState().connections[id]?.status !== "connected") connectIntegration(id);
  setAppState((s) => ({ assignments: { ...s.assignments, [workspace]: id } }));
}
export function wireWorkflow(name: string, ids: string[]) {
  ids.forEach((id) => getAppState().connections[id]?.status !== "connected" && connectIntegration(id));
  // Auto-assign each workspace to the first matching integration from the workflow.
  const assignments = { ...getAppState().assignments };
  (Object.keys(WORKSPACE_TASKS) as WorkspaceKey[]).forEach((w) => {
    const match = ids.find((id) => getIntegration(id)?.workspaces.includes(w));
    if (match) assignments[w] = match;
  });
  setAppState((s) => ({ assignments, wiredWorkflows: [{ id: `WF-${Date.now().toString(36).toUpperCase()}`, name, integrations: ids, at: new Date().toISOString() }, ...s.wiredWorkflows].slice(0, 20) }));
}

export const useConnections = () => useAppState((s) => s.connections);
export const useAssignments = () => useAppState((s) => s.assignments);

registerIntegrationOps({ connect: (id) => connectIntegration(id), assign: assignIntegration, wire: wireWorkflow });

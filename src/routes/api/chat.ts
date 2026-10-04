import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai/run-id.server";

const bodySchema = z.object({
  messages: z.array(z.any()),
  conversationId: z.string().optional(),
  lang: z.enum(["en", "ar"]).optional(),
  memories: z.array(z.string()).optional(),
  tenant: z.string().optional(),
  mode: z.enum(["general", "developer"]).optional(),
});

const ref = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const shipments = [
  { id: "BST-48211", carrier: "Bosta", city: "Cairo", status: "out_for_delivery", cod: 1850, daysInTransit: 1 },
  { id: "ARX-77302", carrier: "Aramex", city: "Alexandria", status: "in_transit", cod: 4200, daysInTransit: 3 },
  { id: "BST-48219", carrier: "Bosta", city: "Giza", status: "delayed", cod: 960, daysInTransit: 5 },
  { id: "ARX-77311", carrier: "Aramex", city: "Mansoura", status: "delivered", cod: 2750, daysInTransit: 2 },
  { id: "BST-48230", carrier: "Bosta", city: "Assiut", status: "delayed", cod: 3100, daysInTransit: 6 },
];

const businessTools = {
  update_crm_lead: tool({
    description: "Create or update a lead/contact in the workspace CRM (status, stage, tags, notes, lead score).",
    inputSchema: z.object({
      name: z.string(),
      phone: z.string().nullable(),
      company: z.string().nullable(),
      stage: z.string().describe("e.g. new, qualified, proposal, negotiation, won, lost"),
      tags: z.array(z.string()),
      note: z.string().nullable(),
    }),
    execute: async (input) => ({ ok: true, leadId: ref("LD"), ...input, updatedAt: new Date().toISOString() }),
  }),
  create_invoice: tool({
    description: "Generate an Egyptian EGP tax invoice with 14% VAT and optional 1% withholding tax.",
    inputSchema: z.object({
      customer: z.string(),
      items: z.array(z.object({ description: z.string(), quantity: z.number(), unitPrice: z.number() })),
      discount: z.number().describe("Discount amount in EGP, 0 if none"),
      withholding: z.boolean(),
    }),
    execute: async ({ customer, items, discount, withholding }) => {
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const taxable = Math.max(0, subtotal - discount);
      const vat = +(taxable * 0.14).toFixed(2);
      const wht = withholding ? +(taxable * 0.01).toFixed(2) : 0;
      return { ok: true, invoiceNumber: ref("INV"), customer, currency: "EGP", subtotal, discount, vat, withholdingTax: wht, total: +(taxable + vat - wht).toFixed(2), status: "issued" };
    },
  }),
  send_whatsapp_template: tool({
    description: "Send an approved WhatsApp template message to a customer phone number.",
    inputSchema: z.object({
      phone: z.string(),
      template: z.string().describe("Template name, e.g. order_confirmation, payment_reminder, follow_up, welcome"),
      language: z.enum(["en", "ar"]),
      variables: z.array(z.string()),
      previewText: z.string().describe("The rendered message text"),
    }),
    execute: async (input) => ({ ok: true, messageId: ref("WA"), status: "queued", ...input }),
  }),
  analyze_logistics: tool({
    description: "Fetch current shipment data (Bosta/Aramex) for analysis of delays, COD exposure and performance.",
    inputSchema: z.object({ carrier: z.enum(["all", "Bosta", "Aramex"]) }),
    execute: async ({ carrier }) => {
      const list = carrier === "all" ? shipments : shipments.filter((s) => s.carrier === carrier);
      return {
        shipments: list,
        totals: {
          count: list.length,
          delayed: list.filter((s) => s.status === "delayed").length,
          codOutstanding: list.filter((s) => s.status !== "delivered").reduce((s, x) => s + x.cod, 0),
          avgDaysInTransit: +(list.reduce((s, x) => s + x.daysInTransit, 0) / Math.max(1, list.length)).toFixed(1),
        },
      };
    },
  }),
  draft_email: tool({
    description: "Save a drafted business email to the workspace outbox for review before sending.",
    inputSchema: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
    execute: async (input) => ({ ok: true, draftId: ref("EM"), status: "draft_saved", ...input }),
  }),
  set_dark_mode: tool({
    description: "Turn the app's dark mode on or off immediately.",
    inputSchema: z.object({ enabled: z.boolean() }),
    execute: async ({ enabled }) => ({ ok: true, appAction: { type: "set_dark_mode", enabled } }),
  }),
  set_theme: tool({
    description: "Change the app accent color theme immediately.",
    inputSchema: z.object({ theme: z.enum(["executive", "ocean", "emerald", "graphite"]) }),
    execute: async ({ theme }) => ({ ok: true, appAction: { type: "set_theme", theme } }),
  }),
  add_lead_to_app: tool({
    description: "Add a new lead directly into the app's Lead Discovery list.",
    inputSchema: z.object({ name: z.string(), company: z.string(), city: z.string(), score: z.number().describe("0-100 qualification score") }),
    execute: async (input) => ({ ok: true, appAction: { type: "add_lead", ...input } }),
  }),
  update_invoice_status: tool({
    description: "Change an invoice status in the app (e.g. INV-1042). Status paid, unpaid or cancelled.",
    inputSchema: z.object({ invoiceId: z.string(), status: z.enum(["paid", "unpaid", "cancelled"]) }),
    execute: async (input) => ({ ok: true, appAction: { type: "update_invoice_status", ...input } }),
  }),
  filter_inbox: tool({
    description: "Filter the Multi-Channel Inbox (unread, mine = assigned to me, all) and open it.",
    inputSchema: z.object({ filter: z.enum(["unread", "mine", "all"]) }),
    execute: async ({ filter }) => ({ ok: true, appAction: { type: "filter_inbox", filter } }),
  }),
  open_page: tool({
    description: "Navigate the user to an app page.",
    inputSchema: z.object({ page: z.enum(["/", "/inbox", "/leads", "/automations", "/logistics", "/approvals", "/finance", "/agent-hub", "/automations"]) }),
    execute: async ({ page }) => ({ ok: true, appAction: { type: "navigate", page } }),
  }),
  set_layout: tool({
    description: "Change UI layout instantly: density and visibility of AI Hema panels (quick prompts, code generation hub, audit log). Pass null for anything unchanged.",
    inputSchema: z.object({ density: z.enum(["comfortable", "compact"]).nullable(), showQuickPrompts: z.boolean().nullable(), showGenerationHub: z.boolean().nullable(), showAuditLog: z.boolean().nullable() }),
    execute: async (input) => ({ ok: true, appAction: { type: "set_layout", ...input } }),
  }),
  set_lead_scoring: tool({
    description: "Adjust lead scoring rules: minimum qualification score (0-100) for job posts/leads to be auto-captured, and optional keyword list for the job aggregator.",
    inputSchema: z.object({ minScore: z.number(), keywords: z.array(z.string()) }),
    execute: async (input) => ({ ok: true, appAction: { type: "set_lead_scoring", ...input } }),
  }),
  trigger_workflow: tool({
    description: "Run an automation workflow now (e.g. 'Welcome new lead', 'Overdue invoice reminder', 'Marketing broadcast').",
    inputSchema: z.object({ workflow: z.string() }),
    execute: async (input) => ({ ok: true, appAction: { type: "trigger_workflow", ...input } }),
  }),
  emit_webhook: tool({
    description: "Fire an outgoing webhook event to the connected n8n/Make endpoint.",
    inputSchema: z.object({ event: z.enum(["lead.contacted", "lead.negotiation", "payment.verified", "design.export_ready", "logo.sent_whatsapp", "job_post.captured", "workflow.triggered"]), note: z.string() }),
    execute: async ({ event, note }) => ({ ok: true, appAction: { type: "emit_webhook", event, payload: { note } } }),
  }),
  set_webhook_url: tool({
    description: "Set the outgoing webhook endpoint URL (n8n/Make) used for status-change events.",
    inputSchema: z.object({ url: z.string() }),
    execute: async (input) => ({ ok: true, appAction: { type: "set_webhook_url", ...input } }),
  }),
  save_memory: tool({
    description: "Remember a durable fact or preference about the user or their business for future conversations. Use when the user shares lasting information or asks you to remember something.",
    inputSchema: z.object({ fact: z.string() }),
    execute: async ({ fact }) => ({ ok: true, remembered: fact }),
  }),
};

function systemPrompt(lang: string, memories: string[], tenant?: string, mode: string = "general") {
  return `You are AI Hema, the general-purpose AI assistant and executive employee inside Hema Gogo, an Egyptian business operations platform.
You can do anything a top general assistant can: open-ended Q&A, writing and content creation, brainstorming, code generation (use fenced code blocks), analysis and multi-step planning.
You also act as an executive operations employee. When the user asks you to perform a business action, call the matching tool: update_crm_lead, create_invoice (EGP, 14% VAT), send_whatsapp_template, analyze_logistics, draft_email, save_memory. Write marketing content directly in your reply. Chain several tools when a task needs it, then summarize what was done with the key numbers/references.
These tools operate on the workspace's demo environment; never claim real external delivery beyond what the tool result says.
You have full system privileges inside the Hema Gogo app. When the user asks to change something in the app (dark mode, theme, add a lead, invoice status, inbox filter, open a page), call the matching tool (set_dark_mode, set_theme, add_lead_to_app, update_invoice_status, filter_inbox, open_page) — the change is applied instantly. Never tell the user to do it manually. Afterwards reply briefly, e.g. "Done! Changed to dark mode."
${mode === "developer" ? "MODE: System & UI Developer. Focus on code generation, UI layout edits and config tweaks; code blocks are welcome." : "MODE: General Chat & Assistant. Act as a personal/business co-pilot. Do not output code blocks unless the user explicitly asks for code."}
You are the System Master Agent: for any business or operational idea, first write a short numbered execution plan, then immediately carry out every step you can with tools (set_layout, set_lead_scoring, trigger_workflow, emit_webhook, set_webhook_url and all others), and finish with a checklist of what was done. For code/layout refactors that tools cannot apply, produce the code and say it goes to the Self-Evolution audit log for approval.
Use save_memory when the user shares durable facts or preferences.
Reply in the user's language (default ${lang === "ar" ? "Arabic" : "English"}). Use clear markdown.
${tenant ? `Active workspace: ${tenant}.` : ""}
${memories.length ? `Long-term memory about this user:\n${memories.map((m) => `- ${m}`).join("\n")}` : ""}`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY'];
        if (!apiKey) return Response.json({ error: "AI is not configured." }, { status: 500 });
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
        const { messages, lang = "en", memories = [], tenant, mode = "general" } = parsed.data;

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          system: systemPrompt(lang, memories.slice(0, 50), tenant, mode),
          messages: await convertToModelMessages(messages as UIMessage[]),
          tools: businessTools,
          stopWhen: stepCountIs(50),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "medium",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            sendReasoning: true,
            onError: (error) => {
              const status = (error as { statusCode?: number })?.statusCode;
              if (status === 429) return "AI Hema is busy right now. Please try again in a moment.";
              if (status === 402) return "AI credits have run out. Add credits to keep using AI Hema.";
              if (status === 403) return "This request was declined by the AI provider.";
              return "AI Hema couldn't finish that reply. Please try again.";
            },
          }),
          runIdFetch,
        );
      },
    },
  },
});

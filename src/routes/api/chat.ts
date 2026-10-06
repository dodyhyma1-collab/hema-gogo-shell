import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { classify, isRetryable, modelFor, pickChain, type RouterPrefs } from "@/lib/ai/router.server";
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
  paused: z.boolean().optional(),
  router: z.object({ auto: z.boolean(), overrides: z.record(z.string(), z.string()), disabled: z.array(z.string()), stats: z.record(z.string(), z.any()) }).optional(),
});

const INTS = ["whatsapp", "messenger", "instagram", "lead_scraper", "openai", "midjourney", "claude", "instapay", "paymob", "fawry", "bosta", "aramex"] as const;
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
    inputSchema: z.object({ page: z.enum(["/", "/inbox", "/leads", "/automations", "/logistics", "/approvals", "/finance", "/agent-hub", "/integrations"]) }),
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
  plan_workflow_setup: tool({
    description: "When the user describes a business goal or operational strategy, analyze it and show a Required Apps Setup Card listing the execution steps and every integration needed, with one-click connect. Call this BEFORE wiring.",
    inputSchema: z.object({
      goal: z.string(),
      steps: z.array(z.string()),
      required: z.array(z.object({ integrationId: z.enum(["whatsapp", "messenger", "instagram", "lead_scraper", "openai", "midjourney", "claude", "instapay", "paymob", "fawry", "bosta", "aramex"]), purpose: z.string() })),
    }),
    execute: async (input) => ({ ok: true, setupCard: input }),
  }),
  connect_integrations: tool({
    description: "Connect one or more integrations in the App Integrations Hub immediately.",
    inputSchema: z.object({ ids: z.array(z.enum(["whatsapp", "messenger", "instagram", "lead_scraper", "openai", "midjourney", "claude", "instapay", "paymob", "fawry", "bosta", "aramex"])) }),
    execute: async ({ ids }) => ({ ok: true, appAction: { type: "connect_integrations", ids } }),
  }),
  assign_integration: tool({
    description: "Assign which connected app handles tasks on a workspace page: inbox (messaging), leads (lead source), finance (invoicing/payments), logistics (carrier), agentHub (logo generation).",
    inputSchema: z.object({ workspace: z.enum(["inbox", "leads", "finance", "logistics", "agentHub"]), integrationId: z.enum(["whatsapp", "messenger", "instagram", "lead_scraper", "openai", "midjourney", "claude", "instapay", "paymob", "fawry", "bosta", "aramex"]) }),
    execute: async (input) => ({ ok: true, appAction: { type: "assign_integration", ...input } }),
  }),
  wire_workflow: tool({
    description: "Autonomously wire a workflow end-to-end: connects all listed integrations, maps webhooks and assigns each workspace to the right app. Use after the user confirms a setup card.",
    inputSchema: z.object({ name: z.string(), ids: z.array(z.enum(["whatsapp", "messenger", "instagram", "lead_scraper", "openai", "midjourney", "claude", "instapay", "paymob", "fawry", "bosta", "aramex"])) }),
    execute: async (input) => ({ ok: true, appAction: { type: "wire_workflow", ...input } }),
  }),
  propose_code_change: tool({
    description: "Write real source code for a change that settings cannot express (new page, new table component, layout refactor, API route). Produces a code proposal with a before/after view that waits for human approval in the AI Changes panel. Include the full file content.",
    inputSchema: z.object({
      filePath: z.string().describe("e.g. src/components/finance/expenses-table.tsx"),
      workspace: z.enum(["/inbox", "/leads", "/agent-hub", "/finance", "/logistics", "app"]),
      summary: z.string(),
      currentCode: z.string().describe("Relevant current code if known, empty string for a new file"),
      code: z.string(),
    }),
    execute: async (input) => ({ ok: true, codeProposal: { id: ref("CODE"), ...input }, status: "pending_approval" }),
  }),
  create_webhook_pipeline: tool({
    description: "Map an operational workflow (e.g. Lead Scraper -> OpenAI -> WhatsApp -> InstaPay OCR) into webhook endpoints, JSON payloads and a routing pipeline, and show a 1-click setup card.",
    inputSchema: z.object({
      name: z.string(),
      steps: z.array(z.object({ integrationId: z.enum(INTS), event: z.string().describe("e.g. job_post.captured"), payloadJson: z.string().describe("Example JSON payload as a string") })),
    }),
    execute: async ({ name, steps }) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      const mapped = steps.map((s, i) => ({ integrationId: s.integrationId, event: s.event, endpoint: `https://hooks.hemagogo.app/v1/pipe/${slug}/${i + 1}-${s.integrationId}`, payload: s.payloadJson }));
      return {
        ok: true,
        appAction: { type: "create_pipeline", name, steps: mapped },
        setupCard: { goal: name, steps: mapped.map((m) => `${m.event} → ${m.endpoint}`), required: [...new Set(steps.map((s) => s.integrationId))].map((integrationId) => ({ integrationId, purpose: steps.find((s) => s.integrationId === integrationId)!.event })) },
      };
    },
  }),
  evaluate_offer: tool({
    description: "Negotiation guardrails. Evaluate a client's price offer for a design job against owner rules (base 3500 EGP, floor 2500, max discount 15%, rush +30%). Always call before agreeing a price.",
    inputSchema: z.object({ offer: z.number(), rush: z.boolean(), clientBudget: z.number().nullable() }),
    execute: async ({ offer, rush, clientBudget }) => {
      const list = 3500 * (rush ? 1.3 : 1);
      const floor = Math.max(2500, list * 0.85);
      const discountPct = +(((list - offer) / list) * 100).toFixed(1);
      if (offer >= list) return { decision: "accept", price: offer, listPrice: list };
      if (offer >= floor) return { decision: "accept_with_discount", price: offer, discountPct, listPrice: list };
      if (offer >= list * 0.6) return { decision: "counter", counterPrice: Math.ceil(floor), reason: "Underspend: below max discount, counter at floor price", listPrice: list, discountPct };
      return { decision: "escalate", reason: `Offer ${offer} EGP is ${discountPct}% below list${clientBudget ? `, stated budget ${clientBudget}` : ""}. Needs owner approval.`, listPrice: list, escalation: true };
    },
  }),
  verify_instapay_receipt: tool({
    description: "Verify an InstaPay receipt (from OCR) against the expected invoice amount. On success fires payment.verified and starts the logo generation workflow.",
    inputSchema: z.object({ reference: z.string(), amountPaid: z.number(), expectedAmount: z.number(), invoiceId: z.string() }),
    execute: async ({ reference, amountPaid, expectedAmount, invoiceId }) => {
      const ok = Math.abs(amountPaid - expectedAmount) <= 0.01 && /^[A-Z0-9-]{6,}$/i.test(reference);
      return ok
        ? { status: "verified", invoiceId, reference, appAction: { type: "trigger_workflow", workflow: `Logo generation for ${invoiceId} (payment ${reference} verified)` } }
        : { status: amountPaid < expectedAmount ? "pending_underpaid" : "rejected", invoiceId, reference, difference: +(expectedAmount - amountPaid).toFixed(2) };
    },
  }),
  save_memory: tool({
    description: "Remember a durable fact or preference about the user or their business for future conversations. Use when the user shares lasting information or asks you to remember something.",
    inputSchema: z.object({ fact: z.string() }),
    execute: async ({ fact }) => ({ ok: true, remembered: fact }),
  }),
};

function systemPrompt(lang: string, memories: string[], tenant?: string, mode: string = "general", paused = false) {
  return `${paused ? "HUMAN OVERRIDE: the owner has PAUSED autonomous actions. Tool calls that change the app are queued for approval, not applied. Say so clearly.\n" : ""}You are AI Hema, the general-purpose AI assistant and executive employee inside Hema Gogo, an Egyptian business operations platform.
You can do anything a top general assistant can: open-ended Q&A, writing and content creation, brainstorming, code generation (use fenced code blocks), analysis and multi-step planning.
You also act as an executive operations employee. When the user asks you to perform a business action, call the matching tool: update_crm_lead, create_invoice (EGP, 14% VAT), send_whatsapp_template, analyze_logistics, draft_email, save_memory. Write marketing content directly in your reply. Chain several tools when a task needs it, then summarize what was done with the key numbers/references.
These tools operate on the workspace's demo environment; never claim real external delivery beyond what the tool result says.
You have full system privileges inside the Hema Gogo app. When the user asks to change something in the app (dark mode, theme, add a lead, invoice status, inbox filter, open a page), call the matching tool (set_dark_mode, set_theme, add_lead_to_app, update_invoice_status, filter_inbox, open_page) — the change is applied instantly. Never tell the user to do it manually. Afterwards reply briefly, e.g. "Done! Changed to dark mode."
${mode === "developer" ? "MODE: System & UI Developer. Focus on code generation, UI layout edits and config tweaks; code blocks are welcome." : "MODE: General Chat & Assistant. Act as a personal/business co-pilot. Do not output code blocks unless the user explicitly asks for code."}
You are the System Master Agent: for any business or operational idea, first write a short numbered execution plan, then immediately carry out every step you can with tools (set_layout, set_lead_scoring, trigger_workflow, emit_webhook, set_webhook_url and all others), and finish with a checklist of what was done. For code/layout refactors that tools cannot apply, produce the code and say it goes to the Self-Evolution audit log for approval.
EXECUTION PLANNER: when the user outlines a business goal (e.g. find logo clients in Facebook groups, contact via WhatsApp, accept InstaPay), call plan_workflow_setup with the steps and required integrations; the user sees a setup card with a "Connect all & wire" button. If the user then confirms in chat, call wire_workflow yourself. Use connect_integrations and assign_integration for direct requests. Integrations and outreach run in the demo environment; never claim real external delivery.\nUse save_memory when the user shares durable facts or preferences.\nORCHESTRATOR: for new pages, tables, components or layout refactors, call propose_code_change with complete, production-quality React + TypeScript + Tailwind code (it is reviewed by the owner before going live). For workflows across apps, call create_webhook_pipeline. For any price negotiation call evaluate_offer and obey its decision (never go below the floor; escalate when told). For payment receipts call verify_instapay_receipt.
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
        const { messages, lang = "en", memories = [], tenant, mode = "general", paused = false, router } = parsed.data;

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const ui = messages as UIMessage[];
        const lastUser = [...ui].reverse().find((m) => m.role === "user");
        const lastText = lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";
        const totalChars = JSON.stringify(ui).length;
        const task = classify(lastText, totalChars, mode);
        const prefs: RouterPrefs = { auto: router?.auto ?? true, overrides: (router?.overrides ?? {}) as RouterPrefs["overrides"], disabled: router?.disabled ?? [], stats: (router?.stats ?? {}) as RouterPrefs["stats"] };
        const chain = pickChain(task, prefs);
        // Reasoning items are provider-specific; drop past ones so any model can continue the thread.
        const history = await convertToModelMessages(ui.map((m) => ({ ...m, parts: m.parts.filter((p) => p.type !== "reasoning" && !p.type.startsWith("data-")) })));
        const system = systemPrompt(lang, memories.slice(0, 50), tenant, mode, paused);
        const friendly = (error: unknown) => {
          const status = (error as { statusCode?: number })?.statusCode;
          if (status === 429) return "AI Hema is busy right now. Please try again in a moment.";
          if (status === 402) return "AI credits have run out. Add credits to keep using AI Hema.";
          if (status === 403) return "This request was declined by the AI provider.";
          return "AI Hema couldn't finish that reply. Please try again.";
        };

        const stream = createUIMessageStream({
          originalMessages: ui,
          execute: async ({ writer }) => {
            const failed: string[] = [];
            for (let i = 0; i < chain.length; i++) {
              const id = chain[i]!;
              const t0 = Date.now();
              let failure: unknown;
              const { model, providerOptions } = modelFor(id, apiKey, runIdFetch.fetch);
              const result = streamText({
                model, system, messages: history, tools: businessTools, stopWhen: stepCountIs(50), abortSignal: request.signal, maxRetries: 0,
                ...(id.startsWith("anthropic/") ? { maxOutputTokens: 16000 } : {}),
                providerOptions,
                onError: ({ error }) => { failure = error; },
              });
              const buffered: unknown[] = [];
              let emitted = false;
              let retry = false;
              for await (const chunk of result.toUIMessageStream({
                sendReasoning: true,
                onError: friendly,
                messageMetadata: ({ part }) => part.type === "finish" ? { model: id, task, ms: Date.now() - t0, tokens: (part as { totalUsage?: { totalTokens?: number } }).totalUsage?.totalTokens ?? 0, failed } : undefined,
              })) {
                if (chunk.type === "error" && !emitted && i < chain.length - 1 && isRetryable(failure)) { retry = true; break; }
                if (!emitted && (chunk.type === "start" || chunk.type === "start-step")) { buffered.push(chunk); continue; }
                if (!emitted) {
                  emitted = true;
                  for (const b of buffered) writer.write(b as never);
                  writer.write({ type: "data-route", data: { task, model: id, fallbackFrom: failed } } as never);
                }
                writer.write(chunk);
              }
              if (!retry) return;
              failed.push(id);
            }
          },
        });
        return withLovableAiGatewayRunIdHeader(createUIMessageStreamResponse({ stream }), runIdFetch);
      },
    },
  },
});

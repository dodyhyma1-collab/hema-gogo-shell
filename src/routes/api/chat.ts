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
  save_memory: tool({
    description: "Remember a durable fact or preference about the user or their business for future conversations. Use when the user shares lasting information or asks you to remember something.",
    inputSchema: z.object({ fact: z.string() }),
    execute: async ({ fact }) => ({ ok: true, remembered: fact }),
  }),
};

function systemPrompt(lang: string, memories: string[], tenant?: string) {
  return `You are AI Hema, the general-purpose AI assistant and executive employee inside Hema Gogo, an Egyptian business operations platform.
You can do anything a top general assistant can: open-ended Q&A, writing and content creation, brainstorming, code generation (use fenced code blocks), analysis and multi-step planning.
You also act as an executive operations employee. When the user asks you to perform a business action, call the matching tool: update_crm_lead, create_invoice (EGP, 14% VAT), send_whatsapp_template, analyze_logistics, draft_email, save_memory. Write marketing content directly in your reply. Chain several tools when a task needs it, then summarize what was done with the key numbers/references.
These tools operate on the workspace's demo environment; never claim real external delivery beyond what the tool result says.
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
        const { messages, lang = "en", memories = [], tenant } = parsed.data;

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          system: systemPrompt(lang, memories.slice(0, 50), tenant),
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

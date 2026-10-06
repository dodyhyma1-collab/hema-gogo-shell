import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { getAppState, setAppState, type AppAction, type ModelStat } from "@/lib/app-state";
import { runTrackedAction, useChanges } from "@/lib/ai-changes";
import { ChangeCard, HitlControls, registerCodeProposal } from "@/components/ai-hema/change-views";
import { ThumbsDown, ThumbsUp, Route as RouteIcon } from "lucide-react";
import "@/lib/integrations";
import { SetupCard, type SetupCardData } from "@/components/ai-hema/setup-card";
import { Brain, Briefcase, Code2, FileText, Lightbulb, MessageCircle, PenLine, Truck } from "lucide-react";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const suggestions = {
  en: [
    { icon: Briefcase, label: "Add a CRM lead", prompt: "Add Omar Khaled from Nile Foods (+201001234567) to the CRM as a qualified lead tagged 'wholesale'." },
    { icon: FileText, label: "Create an invoice", prompt: "Create an invoice for Nile Foods: 20 cartons at 450 EGP each, 500 EGP discount, with withholding tax." },
    { icon: MessageCircle, label: "Send WhatsApp reminder", prompt: "Send a payment reminder WhatsApp template in Arabic to +201001234567 for invoice INV-2041." },
    { icon: Truck, label: "Analyze shipping", prompt: "Analyze our current shipments and tell me where delays and COD risk are." },
    { icon: PenLine, label: "Marketing content", prompt: "Write 3 Instagram captions in Egyptian Arabic for our Ramadan sale." },
    { icon: Code2, label: "Write code", prompt: "Write a TypeScript function that calculates Egyptian VAT and withholding tax for an invoice." },
    { icon: Lightbulb, label: "Brainstorm", prompt: "Brainstorm 10 ways to increase repeat orders for a Cairo e-commerce brand." },
  ],
  ar: [
    { icon: Briefcase, label: "أضف عميلاً محتملاً", prompt: "أضف عمر خالد من نايل فودز (+201001234567) إلى إدارة العملاء كعميل مؤهل بوسم 'جملة'." },
    { icon: FileText, label: "أنشئ فاتورة", prompt: "أنشئ فاتورة لنايل فودز: 20 كرتونة بسعر 450 جنيه، خصم 500 جنيه، مع ضريبة الخصم." },
    { icon: MessageCircle, label: "تذكير واتساب", prompt: "أرسل قالب تذكير بالدفع على واتساب بالعربية إلى +201001234567 للفاتورة INV-2041." },
    { icon: Truck, label: "حلل الشحنات", prompt: "حلل الشحنات الحالية ووضح أماكن التأخير ومخاطر الدفع عند الاستلام." },
    { icon: PenLine, label: "محتوى تسويقي", prompt: "اكتب 3 تعليقات إنستجرام بالعامية المصرية لتخفيضات رمضان." },
    { icon: Lightbulb, label: "عصف ذهني", prompt: "اقترح 10 طرق لزيادة الطلبات المتكررة لمتجر إلكتروني في القاهرة." },
  ],
};

const toolLabels: Record<string, { en: string; ar: string }> = {
  update_crm_lead: { en: "Updated CRM", ar: "تحديث إدارة العملاء" },
  create_invoice: { en: "Generated invoice", ar: "إنشاء فاتورة" },
  send_whatsapp_template: { en: "Sent WhatsApp template", ar: "إرسال قالب واتساب" },
  analyze_logistics: { en: "Analyzed logistics", ar: "تحليل الشحن" },
  draft_email: { en: "Drafted email", ar: "صياغة بريد" },
  save_memory: { en: "Saved to memory", ar: "حفظ في الذاكرة" },
  set_dark_mode: { en: "Changed display mode", ar: "تغيير وضع العرض" },
  set_theme: { en: "Changed theme", ar: "تغيير السمة" },
  add_lead_to_app: { en: "Added lead to app", ar: "إضافة عميل للتطبيق" },
  update_invoice_status: { en: "Updated invoice status", ar: "تحديث حالة الفاتورة" },
  filter_inbox: { en: "Filtered inbox", ar: "تصفية الوارد" },
  open_page: { en: "Opened page", ar: "فتح صفحة" },
  connect_integrations: { en: "Connected apps", ar: "ربط التطبيقات" },
  assign_integration: { en: "Assigned app to workspace", ar: "تعيين تطبيق لمساحة العمل" },
  wire_workflow: { en: "Wired workflow", ar: "ربط سير العمل" },
  propose_code_change: { en: "Generated code", ar: "إنشاء كود" },
  create_webhook_pipeline: { en: "Mapped webhook pipeline", ar: "ربط مسار الويب هوك" },
  evaluate_offer: { en: "Checked negotiation rules", ar: "فحص قواعد التفاوض" },
  verify_instapay_receipt: { en: "Verified InstaPay receipt", ar: "التحقق من إيصال إنستاباي" },
};

const stageFor = (tool?: string): { en: string; ar: string } => {
  if (!tool) return { en: "Analyzing request…", ar: "جارٍ تحليل الطلب…" };
  if (tool === "propose_code_change") return { en: "Generating UI components…", ar: "جارٍ إنشاء مكونات الواجهة…" };
  if (["create_webhook_pipeline", "emit_webhook", "set_webhook_url", "wire_workflow", "connect_integrations"].includes(tool)) return { en: "Updating webhook routes…", ar: "جارٍ تحديث مسارات الويب هوك…" };
  if (["evaluate_offer", "verify_instapay_receipt", "analyze_logistics"].includes(tool)) return { en: "Running business rules…", ar: "جارٍ تطبيق قواعد العمل…" };
  return { en: "Applying system changes…", ar: "جارٍ تطبيق التغييرات…" };
};

const MODEL_NAMES: Record<string, string> = { "anthropic/claude-sonnet-5": "Claude Sonnet", "openai/gpt-6-astra": "GPT Astra", "google/gemini-3.1-pro-preview": "Gemini Pro", "google/gemini-3.8-flash": "Gemini Flash" };
type Meta = { model?: string; task?: string; ms?: number; tokens?: number; failed?: string[] };
const blank: ModelStat = { calls: 0, fails: 0, totalMs: 0, tokens: 0, accepted: 0, rejected: 0 };
function bumpStat(model: string, patch: Partial<ModelStat>) {
  setAppState((s) => {
    const cur = s.modelStats[model] ?? blank;
    const next = Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, v + (patch[k as keyof ModelStat] ?? 0)])) as ModelStat;
    return { modelStats: { ...s.modelStats, [model]: next } };
  });
}

export function ChatPane({
  threadId,
  lang,
  initialMessages,
  memories,
  showSuggestions,
  onMessages,
  onCommand,
  onRemember,
  mode = "general",
}: {
  mode?: "general" | "developer";
  threadId: string;
  lang: "en" | "ar";
  initialMessages: UIMessage[];
  memories: string[];
  showSuggestions: boolean;
  onMessages: (messages: UIMessage[]) => void;
  onCommand?: ((text: string) => void) | undefined;
  onRemember: (fact: string) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const memoriesRef = useRef(memories);
  memoriesRef.current = memories;
  const navigate = useNavigate();
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const langRef = useRef(lang);
  langRef.current = lang;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => {
          const st = getAppState();
          return { conversationId: threadId, lang: langRef.current, memories: memoriesRef.current, mode: modeRef.current, paused: st.agentPaused, router: { ...st.router, stats: st.modelStats } };
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onFinish: ({ message }) => {
      const meta = message.metadata as Meta | undefined;
      if (!meta?.model) return;
      bumpStat(meta.model, { calls: 1, totalMs: meta.ms ?? 0, tokens: meta.tokens ?? 0 });
      meta.failed?.forEach((m) => bumpStat(m, { calls: 1, fails: 1 }));
    },
    onError: (err) => toast.error(err.message || (lang === "ar" ? "تعذر الاتصال بهيما" : "Couldn't reach AI Hema")),
  });

  const busy = status === "submitted" || status === "streaming";
  const seenTools = useRef(new Set<string>());

  useEffect(() => {
    if (!busy) {
      onMessages(messages);
      inputRef.current?.focus();
    }
    for (const m of messages) for (const p of m.parts) {
      if (isToolUIPart(p) && p.state === "output-available" && !seenTools.current.has(p.toolCallId) && (p.output as { appAction?: AppAction })?.appAction) {
        seenTools.current.add(p.toolCallId);
        if (!initialMessages.some((im) => im.id === m.id)) {
          const name = p.type.replace(/^tool-/, "");
          const msg = runTrackedAction(p.toolCallId, toolLabels[name]?.en ?? name, (p.output as { appAction: AppAction }).appAction, (to) => navigate({ to }), getAppState().agentPaused ? "pending" : "applied");
          toast.success(msg);
        }
      }
      const proposal = isToolUIPart(p) && p.state === "output-available" ? (p.output as { codeProposal?: Parameters<typeof registerCodeProposal>[0] })?.codeProposal : undefined;
      if (proposal && !seenTools.current.has(p.toolCallId)) {
        seenTools.current.add(p.toolCallId);
        if (!initialMessages.some((im) => im.id === m.id)) registerCodeProposal(proposal);
      }
      if (isToolUIPart(p) && p.type === "tool-save_memory" && p.state === "output-available" && !seenTools.current.has(p.toolCallId)) {
        seenTools.current.add(p.toolCallId);
        const fact = (p.input as { fact?: string })?.fact;
        if (fact && !initialMessages.some((im) => im.id === m.id)) onRemember(fact);
      }
    }
  }, [messages, busy, onMessages, onRemember, initialMessages, navigate]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    onCommand?.(t);
    sendMessage({ text: t });
  };

  const changes = useChanges();
  const [rated, setRated] = useState<Record<string, "up" | "down">>({});
  const last = messages[messages.length - 1];
  const runningTool = busy && last?.role === "assistant" ? [...last.parts].reverse().find((p) => isToolUIPart(p)) : undefined;
  const stage = stageFor(runningTool && isToolUIPart(runningTool) && runningTool.state !== "output-available" ? runningTool.type.replace(/^tool-/, "") : busy && runningTool ? "apply" : undefined);
  const waiting = busy && (!last || last.role === "user" || last.parts.every((p) => p.type === "step-start"));

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Conversation className="min-h-0">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title={lang === "ar" ? "كيف أساعدك اليوم؟" : "How can I help today?"}
              description={lang === "ar" ? "اسأل أي شيء، أو اطلب تنفيذ مهمة عمل: إدارة العملاء، الفواتير، واتساب، الشحن، البريد والمحتوى." : "Ask anything, or give me a business task: CRM, invoices, WhatsApp, logistics, emails and content."}
              icon={<span className="grid size-12 place-items-center rounded-md bg-primary text-lg font-black text-primary-foreground">H</span>}
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    if (part.type === "data-route") {
                      const d = part.data as { task: string; model: string; fallbackFrom: string[] };
                      return (
                        <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <RouteIcon className="size-3" /> {d.task.replace("_", " ")} → <Badge variant="outline">{MODEL_NAMES[d.model] ?? d.model}</Badge>
                          {d.fallbackFrom.length > 0 && <span>(fallback from {d.fallbackFrom.map((m) => MODEL_NAMES[m] ?? m).join(", ")})</span>}
                        </div>
                      );
                    }
                    if (part.type === "text") return <MessageResponse key={i}>{part.text}</MessageResponse>;
                    if (part.type === "reasoning" && part.text)
                      return (
                        <Reasoning key={i} isStreaming={busy && message.id === last?.id && i === message.parts.length - 1}>
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    if (isToolUIPart(part)) {
                      const name = part.type.replace(/^tool-/, "");
                      const card = part.state === "output-available" ? (part.output as { setupCard?: SetupCardData })?.setupCard : undefined;
                      const tracked = changes.find((c) => c.id === part.toolCallId || c.id === (part.output as { codeProposal?: { id: string } })?.codeProposal?.id);
                      if (card) return <SetupCard key={i} data={card} lang={lang} />;
                      if (tracked) return <ChangeCard key={i} change={tracked} />;
                      return (
                        <Tool key={i} defaultOpen={false}>
                          <ToolHeader type={part.type as `tool-${string}`} state={part.state} title={toolLabels[name]?.[lang] ?? name} />
                          <ToolContent>
                            <ToolInput input={part.input} />
                            <ToolOutput output={part.output} errorText={part.errorText} />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                  {message.role === "assistant" && (message.metadata as Meta | undefined)?.model && !(busy && message.id === last?.id) && (
                    <div className="flex items-center gap-1">
                      {(["up", "down"] as const).map((v) => (
                        <Button key={v} size="icon" variant={rated[message.id] === v ? "secondary" : "ghost"} className="size-7" aria-label={v === "up" ? "Good answer" : "Bad answer"} disabled={!!rated[message.id]}
                          onClick={() => { setRated((r) => ({ ...r, [message.id]: v })); bumpStat((message.metadata as Meta).model!, v === "up" ? { accepted: 1 } : { rejected: 1 }); }}>
                          {v === "up" ? <ThumbsUp /> : <ThumbsDown />}
                        </Button>
                      ))}
                    </div>
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {waiting && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>{stage[lang]}</Shimmer>
              </MessageContent>
            </Message>
          )}
          {busy && !waiting && <Shimmer className="text-xs">{stage[lang]}</Shimmer>}
          {error && !busy && <p className="text-sm text-destructive">{error.message}</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-background p-3 sm:p-4">
        <div className="mx-auto max-w-3xl">
          {showSuggestions && messages.length === 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {suggestions[lang].filter((s) => mode === "developer" || s.icon !== Code2).map((s) => (
                <Button key={s.label} variant="outline" size="sm" className="shrink-0" onClick={() => submit(s.prompt)}>
                  <s.icon />
                  {s.label}
                </Button>
              ))}
            </div>
          )}
          <PromptInput onSubmit={({ text }) => submit(text)}>
            <PromptInputTextarea ref={inputRef} autoFocus placeholder={lang === "ar" ? "اسأل هيما أو اطلب تنفيذ مهمة…" : "Ask AI Hema anything or give it a task…"} />
            <PromptInputFooter>
              <PromptInputTools>
                <HitlControls />
                <Badge variant="outline" className="gap-1">
                  <Brain className="size-3" />
                  {memories.length} {lang === "ar" ? "ذكريات" : "memories"}
                </Badge>
              </PromptInputTools>
              <PromptInputSubmit status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </section>
  );
}

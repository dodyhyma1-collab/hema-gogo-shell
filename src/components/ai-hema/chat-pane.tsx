import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { toast } from "sonner";
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
};

export function ChatPane({
  threadId,
  lang,
  initialMessages,
  memories,
  showSuggestions,
  onMessages,
  onCommand,
  onRemember,
}: {
  threadId: string;
  lang: "en" | "ar";
  initialMessages: UIMessage[];
  memories: string[];
  showSuggestions: boolean;
  onMessages: (messages: UIMessage[]) => void;
  onCommand: (text: string) => void;
  onRemember: (fact: string) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const memoriesRef = useRef(memories);
  memoriesRef.current = memories;
  const langRef = useRef(lang);
  langRef.current = lang;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ conversationId: threadId, lang: langRef.current, memories: memoriesRef.current }),
      }),
    [threadId],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
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
      if (isToolUIPart(p) && p.type === "tool-save_memory" && p.state === "output-available" && !seenTools.current.has(p.toolCallId)) {
        seenTools.current.add(p.toolCallId);
        const fact = (p.input as { fact?: string })?.fact;
        if (fact && !initialMessages.some((im) => im.id === m.id)) onRemember(fact);
      }
    }
  }, [messages, busy, onMessages, onRemember, initialMessages]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    onCommand(t);
    sendMessage({ text: t });
  };

  const last = messages[messages.length - 1];
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
                </MessageContent>
              </Message>
            ))
          )}
          {waiting && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>{lang === "ar" ? "هيما يفكر…" : "AI Hema is thinking…"}</Shimmer>
              </MessageContent>
            </Message>
          )}
          {error && !busy && <p className="text-sm text-destructive">{error.message}</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-background p-3 sm:p-4">
        <div className="mx-auto max-w-3xl">
          {showSuggestions && messages.length === 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {suggestions[lang].map((s) => (
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

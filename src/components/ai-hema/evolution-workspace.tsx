import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ChatStatus, UIMessage } from "ai";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Code2,
  FileJson2,
  History,
  LayoutTemplate,
  MessageSquarePlus,
  Palette,
  PanelRightOpen,
  ShieldCheck,
  SlidersHorizontal,
  Undo2,
  X,
} from "lucide-react";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import {
  applyRuntimeConfig,
  createEvolutionChange,
  defaultRuntimeConfig,
  makeThread,
  parseEvolutionCommand,
  readRuntimeConfig,
  readThreads,
  writeThreads,
  type AiHemaThread,
  type EvolutionChange,
  type RuntimeConfig,
} from "@/lib/ai-hema-runtime";

const promptSuggestions = {
  en: [
    { icon: Palette, label: "Use an emerald theme", prompt: "Change the workspace to an emerald theme" },
    { icon: LayoutTemplate, label: "Compact the layout", prompt: "Make the workspace layout compact" },
    { icon: SlidersHorizontal, label: "Hide quick prompts", prompt: "Hide the quick prompt suggestions" },
  ],
  ar: [
    { icon: Palette, label: "استخدم السمة الزمردية", prompt: "غيّر سمة مساحة العمل إلى الأخضر الزمردي" },
    { icon: LayoutTemplate, label: "اجعل التخطيط مضغوطاً", prompt: "اجعل تخطيط مساحة العمل مضغوطاً" },
    { icon: SlidersHorizontal, label: "أخفِ الاقتراحات", prompt: "إخفاء اقتراحات الأوامر السريعة" },
  ],
};

const copy = {
  en: {
    title: "AI Hema",
    subtitle: "Governed workspace evolution",
    conversations: "Conversations",
    newConversation: "New conversation",
    emptyTitle: "Direct your workspace",
    emptyDescription: "Describe a visual or structural change. AI Hema will generate a reviewable proposal before anything changes.",
    prompt: "Describe a UI or configuration change…",
    hub: "Code & Config Hub",
    react: "React preview",
    json: "JSON config",
    audit: "Self-Evolution Audit Log",
    noAudit: "No modifications yet",
    apply: "Apply Changes",
    reject: "Reject",
    applied: "Applied",
    rejected: "Rejected",
    pending: "Pending approval",
    safe: "Approval required",
    staged: "I created a governed change proposal. Review the generated code and configuration, then apply or reject it from the audit log.",
    structural: "This request is available as a code preview only. Runtime source execution is blocked for safety.",
    activeConfig: "Live configuration",
    theme: "Theme",
    density: "Density",
    visible: "visible",
    hidden: "hidden",
  },
  ar: {
    title: "هيما الذكي",
    subtitle: "تطوير مُحكَم لمساحة العمل",
    conversations: "المحادثات",
    newConversation: "محادثة جديدة",
    emptyTitle: "وجّه مساحة عملك",
    emptyDescription: "صِف تغييراً بصرياً أو هيكلياً. سيُنشئ هيما اقتراحاً قابلاً للمراجعة قبل تنفيذ أي تغيير.",
    prompt: "صِف تغييراً في الواجهة أو الإعدادات…",
    hub: "مركز الكود والإعدادات",
    react: "معاينة React",
    json: "إعدادات JSON",
    audit: "سجل التطور الذاتي",
    noAudit: "لا توجد تعديلات بعد",
    apply: "تطبيق التغييرات",
    reject: "رفض",
    applied: "تم التطبيق",
    rejected: "مرفوض",
    pending: "بانتظار الموافقة",
    safe: "يتطلب الموافقة",
    staged: "أنشأت اقتراح تغيير مُحكماً. راجع الكود والإعدادات ثم طبّقه أو ارفضه من سجل التدقيق.",
    structural: "هذا الطلب متاح كمعاينة كود فقط. تشغيل كود المصدر أثناء الاستخدام محظور للحماية.",
    activeConfig: "الإعدادات الحالية",
    theme: "السمة",
    density: "الكثافة",
    visible: "ظاهر",
    hidden: "مخفي",
  },
};

function textMessage(role: "user" | "assistant", text: string): UIMessage {
  return { id: crypto.randomUUID(), role, parts: [{ type: "text", text }] };
}

function statusBadge(change: EvolutionChange, labels: (typeof copy)["en"]) {
  if (change.status === "applied") return <Badge className="border-transparent bg-chart-2/15 text-chart-2"><Check className="me-1 size-3" />{labels.applied}</Badge>;
  if (change.status === "rejected") return <Badge variant="secondary"><X className="me-1 size-3" />{labels.rejected}</Badge>;
  return <Badge className="border-transparent bg-chart-4/20 text-foreground"><CircleDashed className="me-1 size-3" />{labels.pending}</Badge>;
}

export function EvolutionWorkspace({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const labels = copy[lang];
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [threads, setThreads] = useState<AiHemaThread[]>([]);
  const [config, setConfig] = useState<RuntimeConfig>(defaultRuntimeConfig);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"threads" | "audit" | null>(null);

  useEffect(() => {
    const stored = readThreads();
    const existing = stored.find((thread) => thread.id === threadId);
    const next = existing ? stored : [makeThread(threadId), ...stored];
    if (!existing) writeThreads(next);
    setThreads(next);
    const runtime = readRuntimeConfig();
    setConfig(runtime);
    applyRuntimeConfig(runtime);
    setReady(true);
  }, [threadId]);

  const activeThread = threads.find((thread) => thread.id === threadId);
  const selectedChange = activeThread?.audit.find((change) => change.id === selectedChangeId) ?? activeThread?.audit[0];

  const persistThreads = useCallback((updater: (current: AiHemaThread[]) => AiHemaThread[]) => {
    setThreads((current) => {
      const next = updater(current);
      writeThreads(next);
      return next;
    });
  }, []);

  const updateActiveThread = useCallback((updater: (thread: AiHemaThread) => AiHemaThread) => {
    persistThreads((current) => current.map((thread) => thread.id === threadId ? updater(thread) : thread));
  }, [persistThreads, threadId]);

  const submitCommand = useCallback(async (text: string) => {
    const command = text.trim();
    if (!command || status !== "ready") return;
    const patch = parseEvolutionCommand(command);
    const change = createEvolutionChange(command, patch);
    setSelectedChangeId(change.id);
    setStatus("submitted");
    updateActiveThread((thread) => ({
      ...thread,
      title: thread.messages.length === 0 ? command.slice(0, 42) : thread.title,
      updatedAt: new Date().toISOString(),
      messages: [...thread.messages, textMessage("user", command)],
      audit: [change, ...thread.audit],
    }));
    await new Promise((resolve) => window.setTimeout(resolve, 550));
    updateActiveThread((thread) => ({
      ...thread,
      updatedAt: new Date().toISOString(),
      messages: [...thread.messages, textMessage("assistant", `${labels.staged}\n\n${Object.keys(patch).length === 0 ? labels.structural : `**${change.title}**\n\n${change.summary}`}`)],
    }));
    setStatus("ready");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [labels.staged, labels.structural, status, updateActiveThread]);

  const changeStatus = (change: EvolutionChange, nextStatus: "applied" | "rejected") => {
    updateActiveThread((thread) => ({
      ...thread,
      updatedAt: new Date().toISOString(),
      audit: thread.audit.map((item) => item.id === change.id ? { ...item, status: nextStatus } : item),
    }));
    if (nextStatus === "applied") {
      const nextConfig = { ...config, ...change.patch };
      setConfig(nextConfig);
      applyRuntimeConfig(nextConfig);
    }
  };

  const newConversation = () => {
    const next = makeThread();
    const all = [next, ...threads];
    writeThreads(all);
    setThreads(all);
    navigate({ to: "/ai-hema/$threadId", params: { threadId: next.id } });
  };

  const statusText = (value: boolean) => value ? labels.visible : labels.hidden;
  const configRows = [
    [labels.theme, config.theme],
    [labels.density, config.density],
    ["Quick prompts", statusText(config.showQuickPrompts)],
    ["Generation hub", statusText(config.showGenerationHub)],
    ["Audit log", statusText(config.showAuditLog)],
  ];

  const threadsPanel = (
    <aside className="flex h-full min-h-0 flex-col border-e border-border bg-card/70">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div><p className="text-sm font-semibold">{labels.conversations}</p><p className="text-xs text-muted-foreground">{threads.length} saved locally</p></div>
        <Button size="icon" onClick={newConversation} aria-label={labels.newConversation} title={labels.newConversation}><MessageSquarePlus /></Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 p-2">
        <div className="space-y-1">
          {threads.map((thread) => (
            <Button key={thread.id} variant={thread.id === threadId ? "secondary" : "ghost"} className="h-auto w-full justify-start px-3 py-2.5 text-start" onClick={() => { navigate({ to: "/ai-hema/$threadId", params: { threadId: thread.id } }); setMobilePanel(null); }}>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{thread.title}</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">{new Date(thread.updatedAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}</span></span>
              <ChevronRight className="size-3.5 rtl:rotate-180" />
            </Button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );

  const auditPanel = (
    <aside className="flex h-full min-h-0 flex-col border-s border-border bg-card/70">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><History className="size-4 text-primary" /><p className="text-sm font-semibold">{labels.audit}</p></div><Badge variant="outline">{activeThread?.audit.filter((item) => item.status === "pending").length ?? 0}</Badge></div>
        <div className="mt-3 rounded-md border border-border bg-background p-3"><p className="text-xs font-semibold text-muted-foreground">{labels.activeConfig}</p><dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">{configRows.map(([term, value]) => <div key={term} className="contents"><dt className="text-muted-foreground">{term}</dt><dd className="truncate text-end font-medium">{value}</dd></div>)}</dl></div>
      </div>
      <ScrollArea className="min-h-0 flex-1 p-3">
        {activeThread?.audit.length ? <div className="space-y-3">{activeThread.audit.map((change) => (
          <article key={change.id} className={cn("rounded-md border bg-background p-3", selectedChange?.id === change.id && "border-primary/50 ring-1 ring-primary/20")} onClick={() => setSelectedChangeId(change.id)}>
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{change.title}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{change.command}</p></div>{statusBadge(change, labels)}</div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock3 className="size-3" />{new Date(change.createdAt).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })}</div>
            {change.status === "pending" && <div className="mt-3 flex gap-2"><Button size="sm" className="flex-1" onClick={(event) => { event.stopPropagation(); changeStatus(change, "applied"); }}><CheckCircle2 />{labels.apply}</Button><Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); changeStatus(change, "rejected"); }}><X />{labels.reject}</Button></div>}
          </article>
        ))}</div> : <div className="grid min-h-44 place-items-center text-center"><div><ShieldCheck className="mx-auto size-8 text-muted-foreground" /><p className="mt-2 text-sm font-medium">{labels.noAudit}</p></div></div>}
      </ScrollArea>
    </aside>
  );

  if (!ready || !activeThread) return <div className="grid h-full place-items-center"><Shimmer>Preparing AI Hema…</Shimmer></div>;

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-secondary/30">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-md bg-primary text-sm font-black text-primary-foreground">H</span><div><h1 className="text-base font-bold">{labels.title}</h1><p className="text-xs text-muted-foreground">{labels.subtitle}</p></div></div>
        <div className="flex items-center gap-2 lg:hidden"><Button variant="outline" size="icon" onClick={() => setMobilePanel("threads")} aria-label={labels.conversations}><MessageSquarePlus /></Button><Button variant="outline" size="icon" onClick={() => setMobilePanel("audit")} aria-label={labels.audit}><PanelRightOpen /></Button></div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[230px_minmax(0,1fr)_310px]">
        <div className="hidden min-h-0 lg:block">{threadsPanel}</div>
        <section className="flex min-h-0 min-w-0 flex-col">
          <Conversation className="min-h-0"><ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {activeThread.messages.length === 0 ? <ConversationEmptyState title={labels.emptyTitle} description={labels.emptyDescription} icon={<span className="grid size-12 place-items-center rounded-md bg-primary text-lg font-black text-primary-foreground">H</span>} /> : activeThread.messages.map((message) => {
              const text = message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
              return <Message from={message.role} key={message.id}><MessageContent><MessageResponse>{text}</MessageResponse></MessageContent></Message>;
            })}
            {status === "submitted" && <Message from="assistant"><MessageContent><Shimmer>{lang === "ar" ? "يُنشئ اقتراحاً آمناً…" : "Generating a governed proposal…"}</Shimmer></MessageContent></Message>}
          </ConversationContent><ConversationScrollButton /></Conversation>

          <div className="border-t border-border bg-background p-3 sm:p-4">
            <div className="mx-auto max-w-3xl">
              {config.showQuickPrompts && activeThread.messages.length === 0 && <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{promptSuggestions[lang].map((item) => <Button key={item.label} variant="outline" size="sm" className="shrink-0" onClick={() => submitCommand(item.prompt)}><item.icon />{item.label}</Button>)}</div>}
              <PromptInput onSubmit={({ text }) => submitCommand(text)}><PromptInputTextarea ref={inputRef} autoFocus placeholder={labels.prompt} disabled={status !== "ready"} /><PromptInputFooter><PromptInputTools><Badge variant="outline" className="gap-1"><ShieldCheck className="size-3" />{labels.safe}</Badge></PromptInputTools><PromptInputSubmit status={status} disabled={status !== "ready"} /></PromptInputFooter></PromptInput>
            </div>
          </div>
        </section>
        <div className="hidden min-h-0 lg:block">{auditPanel}</div>
      </div>

      {config.showGenerationHub && selectedChange && <section data-density-panel className="border-t border-border bg-background p-4 sm:p-5"><div className="mx-auto max-w-[1200px]"><div className="mb-3 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-sm font-semibold"><Code2 className="size-4 text-primary" />{labels.hub}</h2><p className="mt-0.5 text-xs text-muted-foreground">{selectedChange.summary}</p></div>{statusBadge(selectedChange, labels)}</div><Tabs defaultValue="react"><TabsList><TabsTrigger value="react"><Code2 className="me-1.5 size-3.5" />{labels.react}</TabsTrigger><TabsTrigger value="json"><FileJson2 className="me-1.5 size-3.5" />{labels.json}</TabsTrigger></TabsList><TabsContent value="react"><pre dir="ltr" className="max-h-56 overflow-auto rounded-md border border-border bg-secondary/60 p-4 text-xs leading-5"><code>{selectedChange.componentCode}</code></pre></TabsContent><TabsContent value="json"><pre dir="ltr" className="max-h-56 overflow-auto rounded-md border border-border bg-secondary/60 p-4 text-xs leading-5"><code>{selectedChange.configJson}</code></pre></TabsContent></Tabs></div></section>}

      {mobilePanel && <div className="fixed inset-0 z-50 bg-foreground/30 lg:hidden" onClick={() => setMobilePanel(null)}><div className={cn("absolute inset-y-0 w-[min(88vw,360px)] bg-background shadow-xl", lang === "ar" ? "right-0" : "left-0")} onClick={(event) => event.stopPropagation()}><Button variant="ghost" size="icon" className="absolute end-2 top-2 z-10" onClick={() => setMobilePanel(null)} aria-label="Close"><X /></Button>{mobilePanel === "threads" ? threadsPanel : auditPanel}</div></div>}
    </main>
  );
}

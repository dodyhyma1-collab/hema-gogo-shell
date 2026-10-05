import { useState } from "react";
import { Copy, KeyRound, Link2, RefreshCw, Unplug, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppState } from "@/lib/app-state";
import { useLanguage } from "@/lib/i18n";
import {
  INTEGRATIONS, WORKSPACE_TASKS, connectIntegration, getIntegration, setIntegrationStatus, useAssignments, useConnections,
  type IntegrationCategory, type IntegrationDef, type WorkspaceKey,
} from "@/lib/integrations";

const categories: { id: IntegrationCategory | "all"; en: string; ar: string }[] = [
  { id: "all", en: "All", ar: "الكل" },
  { id: "messaging", en: "Social & Messaging", ar: "التواصل والمراسلة" },
  { id: "ai", en: "AI Models", ar: "نماذج الذكاء" },
  { id: "payments", en: "Payments", ar: "المدفوعات" },
  { id: "logistics", en: "Logistics", ar: "الشحن" },
  { id: "automation", en: "Automation", ar: "الأتمتة" },
];

export function IntegrationsHub() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const connections = useConnections();
  const assignments = useAssignments();
  const wired = useAppState((s) => s.wiredWorkflows);
  const [active, setActive] = useState<IntegrationDef | null>(null);
  const [secret, setSecret] = useState("");

  const statusBadge = (id: string) => {
    const s = connections[id]?.status ?? "disconnected";
    return <Badge variant={s === "connected" ? "default" : s === "reauth" ? "destructive" : "outline"}>{s === "connected" ? (ar ? "متصل" : "Connected") : s === "reauth" ? (ar ? "إعادة توثيق" : "Re-authenticate") : ar ? "غير متصل" : "Disconnected"}</Badge>;
  };

  const connect = (def: IntegrationDef) => {
    if (def.auth === "oauth") {
      connectIntegration(def.id);
      toast.success(`${def.name} ${ar ? "متصل" : "connected"}`);
    } else {
      setSecret("");
      setActive(def);
    }
  };

  const saved = INTEGRATIONS.filter((i) => connections[i.id]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">{ar ? "مركز تكامل التطبيقات" : "App Integrations Hub"}</h1>
        <p className="text-sm text-muted-foreground">{ar ? "اربط أدواتك بنقرة واحدة أو بمفتاح أو رابط ويب هوك، وحدد أي تطبيق يتولى كل مساحة عمل." : "Connect your tools in one click or with an API key / webhook, then choose which app handles each workspace."}</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex h-auto flex-wrap">
          {categories.map((c) => <TabsTrigger key={c.id} value={c.id}>{ar ? c.ar : c.en}</TabsTrigger>)}
        </TabsList>
        {categories.map((c) => (
          <TabsContent key={c.id} value={c.id} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.filter((i) => c.id === "all" || i.category === c.id).map((i) => {
              const s = connections[i.id]?.status;
              return (
                <Card key={i.id}>
                  <CardHeader className="flex-row items-start gap-3 space-y-0">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">{i.initials}</span>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{i.name}</CardTitle>
                      <CardDescription>{i.description[lang]}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
                    {i.auth === "webhook" ? <Webhook className="size-3" /> : i.auth === "oauth" ? <Link2 className="size-3" /> : <KeyRound className="size-3" />}
                    {i.auth === "webhook" ? "Webhook" : i.auth === "oauth" ? (ar ? "نقرة واحدة" : "One-click") : ar ? "مفتاح API" : "API key"}
                    <span className="ms-auto">{statusBadge(i.id)}</span>
                  </CardContent>
                  <CardFooter className="gap-2">
                    {s === "connected" ? (
                      <Button variant="outline" size="sm" onClick={() => setIntegrationStatus(i.id, "disconnected")}><Unplug />{ar ? "فصل" : "Disconnect"}</Button>
                    ) : (
                      <Button size="sm" onClick={() => connect(i)}>{s === "reauth" ? <RefreshCw /> : <Link2 />}{s === "reauth" ? (ar ? "إعادة توثيق" : "Re-authenticate") : ar ? "اتصال" : "Connect"}</Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{ar ? "الاتصالات المحفوظة" : "Saved connections"}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {saved.length === 0 && <p className="text-sm text-muted-foreground">{ar ? "لا توجد اتصالات بعد." : "No connections yet."}</p>}
            {saved.map((i) => (
              <div key={i.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
                <span className="font-medium">{i.name}</span>
                <span className="text-xs text-muted-foreground">{connections[i.id]?.keyHint}</span>
                {connections[i.id]?.webhook && (
                  <Button variant="ghost" size="icon" className="size-7" aria-label="Copy webhook" onClick={() => { navigator.clipboard.writeText(connections[i.id]!.webhook!); toast.success(ar ? "تم النسخ" : "Copied"); }}><Copy /></Button>
                )}
                <span className="ms-auto">{statusBadge(i.id)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{ar ? "تعيين مساحات العمل" : "Workspace assignments"}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(Object.keys(WORKSPACE_TASKS) as WorkspaceKey[]).map((w) => (
              <div key={w} className="flex justify-between rounded-md border border-border p-2">
                <span>{WORKSPACE_TASKS[w][lang]}</span>
                <span className="font-medium">{assignments[w] ? getIntegration(assignments[w]!)?.name : "—"}</span>
              </div>
            ))}
            {wired.length > 0 && <p className="pt-2 font-medium">{ar ? "سير عمل مربوط بواسطة هيما" : "Workflows wired by AI Hema"}</p>}
            {wired.map((w) => <div key={w.id} className="text-xs text-muted-foreground">{w.name} — {w.integrations.map((id) => getIntegration(id)?.name ?? id).join(" → ")}</div>)}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ar ? "اتصال" : "Connect"} {active?.name}</DialogTitle>
            <DialogDescription>{active?.auth === "webhook" ? (ar ? "الصق رابط الويب هوك الخاص بك." : "Paste your webhook URL.") : ar ? "الصق مفتاح API. يُحفظ آخر 4 أحرف فقط للعرض." : "Paste your API key. Only the last 4 characters are kept for display."}</DialogDescription>
          </DialogHeader>
          <Label htmlFor="int-secret">{active?.auth === "webhook" ? "Webhook URL" : "API key"}</Label>
          <Input id="int-secret" type={active?.auth === "webhook" ? "url" : "password"} value={secret} onChange={(e) => setSecret(e.target.value)} />
          <DialogFooter>
            <Button disabled={secret.trim().length < 4} onClick={() => { connectIntegration(active!.id, secret.trim()); toast.success(`${active!.name} ${ar ? "متصل" : "connected"}`); setActive(null); }}>{ar ? "حفظ واتصال" : "Save & connect"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

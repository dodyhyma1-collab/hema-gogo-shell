import { CheckCircle2, Link2, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { connectIntegration, getIntegration, useConnections, wireWorkflow } from "@/lib/integrations";

export type SetupCardData = { goal: string; steps: string[]; required: { integrationId: string; purpose: string }[] };

/** Required Apps Setup Card rendered from AI Hema's plan_workflow_setup tool. */
export function SetupCard({ data, lang }: { data: SetupCardData; lang: "en" | "ar" }) {
  const connections = useConnections();
  const ar = lang === "ar";
  const ids = data.required.map((r) => r.integrationId);
  const allConnected = ids.every((id) => connections[id]?.status === "connected");

  return (
    <Card className="my-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Workflow className="size-4" />{ar ? "التطبيقات المطلوبة" : "Required apps setup"}</CardTitle>
        <p className="text-sm text-muted-foreground">{data.goal}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="list-decimal space-y-1 ps-5 text-sm">{data.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        <div className="space-y-2">
          {data.required.map((r) => {
            const def = getIntegration(r.integrationId);
            const on = connections[r.integrationId]?.status === "connected";
            return (
              <div key={r.integrationId} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <span className="grid size-7 place-items-center rounded bg-primary text-xs font-bold text-primary-foreground">{def?.initials}</span>
                <div className="min-w-0 flex-1"><div className="font-medium">{def?.name ?? r.integrationId}</div><div className="text-xs text-muted-foreground">{r.purpose}</div></div>
                {on ? <Badge className="gap-1"><CheckCircle2 className="size-3" />{ar ? "متصل" : "Connected"}</Badge> : (
                  <Button size="sm" variant="outline" onClick={() => connectIntegration(r.integrationId)}><Link2 />{ar ? "اتصال" : "Connect"}</Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => { wireWorkflow(data.goal, ids); toast.success(ar ? "تم ربط سير العمل عبر كل مساحات العمل" : "Workflow wired across all workspaces"); }}>
          <Workflow />{allConnected ? (ar ? "ربط سير العمل" : "Wire workflow") : ar ? "اتصال الكل وربط" : "Connect all & wire"}
        </Button>
      </CardFooter>
    </Card>
  );
}

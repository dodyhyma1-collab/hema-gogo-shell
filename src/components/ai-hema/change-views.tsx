import { useNavigate } from "@tanstack/react-router";
import { Check, Code2, History, Pause, Play, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { DiffView, pretty } from "@/components/ai-hema/diff-view";
import { reapplyChange, rollbackChange, setChangeStatus, upsertChange, useChanges, type AiChange } from "@/lib/ai-changes";
import { setAppState, useAppState } from "@/lib/app-state";

const statusTone: Record<AiChange["status"], "default" | "secondary" | "destructive" | "outline"> = { applied: "default", approved: "default", pending: "secondary", rolled_back: "outline", rejected: "destructive" };
const statusText: Record<AiChange["status"], string> = { applied: "Applied", approved: "Approved", pending: "Waiting for approval", rolled_back: "Rolled back", rejected: "Rejected" };

/** Records an AI code proposal in the ledger the first time it is seen. */
export function registerCodeProposal(p: { id: string; filePath: string; workspace: string; summary: string; currentCode: string; code: string }) {
  upsertChange({ id: p.id, kind: "code", title: p.summary, target: p.workspace, filePath: p.filePath, before: null, after: null, code: JSON.stringify({ current: p.currentCode, proposed: p.code }), status: "pending", createdAt: new Date().toISOString() });
}

export function ChangeCard({ change, compact }: { change: AiChange; compact?: boolean }) {
  const navigate = useNavigate();
  const go = (p: string) => navigate({ to: p });
  let code: { current: string; proposed: string } | null = null;
  if (change.kind === "code" && change.code) try { code = JSON.parse(change.code); } catch { code = { current: "", proposed: change.code }; }
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        {change.kind === "code" ? <Code2 className="size-4 text-primary" /> : <History className="size-4 text-primary" />}
        <span className="text-sm font-medium">{change.title}</span>
        <Badge variant="outline">{change.filePath ?? change.target}</Badge>
        <Badge variant={statusTone[change.status]} className="ms-auto">{statusText[change.status]}</Badge>
      </div>
      {!compact && (code
        ? <DiffView before={code.current || "// new file"} after={code.proposed} labels={["Current", "Proposed"]} />
        : change.before && <DiffView before={pretty({ ...change.before.app, ...change.before.config })} after={pretty({ ...change.after?.app, ...change.after?.config })} />)}
      {!compact && !code && !change.before && change.action && <pre className="rounded bg-muted p-2 text-xs" dir="ltr">{pretty(change.action)}</pre>}
      <div className="flex flex-wrap gap-2">
        {change.status === "applied" && change.kind === "config" && <Button size="sm" variant="outline" onClick={() => { rollbackChange(change.id); toast.success("Change rolled back"); }}><RotateCcw /> Roll back</Button>}
        {change.status === "rolled_back" && change.action && <Button size="sm" variant="outline" onClick={() => { reapplyChange(change.id, go); toast.success("Change re-applied"); }}><Play /> Re-apply</Button>}
        {change.status === "pending" && change.kind === "config" && <Button size="sm" onClick={() => { reapplyChange(change.id, go); toast.success("Change applied"); }}><Check /> Apply</Button>}
        {change.status === "pending" && change.kind === "code" && <Button size="sm" onClick={() => { setChangeStatus(change.id, "approved"); toast.success("Approved — ready to publish from the builder"); }}><Check /> Approve</Button>}
        {change.status === "pending" && <Button size="sm" variant="ghost" onClick={() => setChangeStatus(change.id, "rejected")}><X /> Reject</Button>}
        {change.kind === "code" && code && <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(code!.proposed); toast.success("Code copied"); }}>Copy code</Button>}
      </div>
    </div>
  );
}

/** Human-in-the-loop controls: pause AI Hema and review/roll back every change. */
export function HitlControls() {
  const paused = useAppState((s) => s.agentPaused);
  const changes = useChanges();
  const pending = changes.filter((c) => c.status === "pending").length;
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {paused ? <Pause className="size-3.5 text-destructive" /> : <Play className="size-3.5 text-primary" />}
        <span>{paused ? "AI paused" : "AI active"}</span>
        <Switch checked={!paused} onCheckedChange={(on) => { setAppState({ agentPaused: !on }); toast.success(on ? "AI Hema can act again" : "AI Hema paused — changes will wait for you"); }} aria-label="AI Hema autonomous actions" />
      </label>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm"><History /> AI changes{pending ? <Badge className="ms-1">{pending}</Badge> : null}</Button>
        </SheetTrigger>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>AI Hema changes</SheetTitle></SheetHeader>
          <div className="space-y-3 p-4">
            {changes.length === 0 && <p className="text-sm text-muted-foreground">No changes yet.</p>}
            {changes.map((c) => <ChangeCard key={c.id} change={c} />)}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

import { cn } from "@/lib/utils";

/** Side-by-side before/after viewer for config snapshots or code. */
export function DiffView({ before, after, labels = ["Before", "After"] }: { before: string; after: string; labels?: [string, string] }) {
  const a = before.split("\n");
  const b = after.split("\n");
  const setA = new Set(a);
  const setB = new Set(b);
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border text-xs">
      {[{ lines: a, other: setB, label: labels[0], tone: "bg-destructive/10 text-destructive" }, { lines: b, other: setA, label: labels[1], tone: "bg-primary/10 text-primary" }].map((side, i) => (
        <div key={i} className={cn("min-w-0", i === 0 && "border-e border-border")}>
          <div className="border-b border-border bg-muted px-2 py-1 font-medium">{side.label}</div>
          <pre className="max-h-64 overflow-auto p-0 font-mono" dir="ltr">
            {side.lines.map((l, j) => (
              <div key={j} className={cn("whitespace-pre px-2", !side.other.has(l) && l.trim() && side.tone)}>{l || " "}</div>
            ))}
          </pre>
        </div>
      ))}
    </div>
  );
}

export const pretty = (v: unknown) => JSON.stringify(v ?? {}, null, 2);

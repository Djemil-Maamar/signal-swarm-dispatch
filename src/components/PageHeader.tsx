import type { ReactNode } from "react";

export function PageHeader({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">{kicker}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      {children}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  sending: "bg-warning/15 text-warning",
  sent: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`rounded px-2 py-0.5 font-mono text-[11px] uppercase ${statusStyles[status] ?? statusStyles.pending}`}>
      {status}
    </span>
  );
}

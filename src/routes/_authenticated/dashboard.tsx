import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatusPill } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Overview — SignalDesk" }, { name: "description", content: "Live SMS delivery overview." }] }),
  component: Dashboard,
});

const statuses = ["pending", "sending", "sent", "failed"] as const;

function Dashboard() {
  const qc = useQueryClient();
  const counts = useQuery({
    queryKey: ["msg-counts"],
    queryFn: async () => {
      const res = await Promise.all(
        statuses.map((s) => supabase.from("messages").select("id", { count: "exact", head: true }).eq("status", s)),
      );
      return Object.fromEntries(statuses.map((s, i) => [s, res[i].count ?? 0])) as Record<string, number>;
    },
  });
  const recent = useQuery({
    queryKey: ["recent-msgs"],
    queryFn: async () =>
      (await supabase.from("messages").select("id, phone, body, status, error, scheduled_at, sent_at").order("created_at", { ascending: false }).limit(25)).data ?? [],
  });
  const devices = useQuery({
    queryKey: ["devices"],
    queryFn: async () => (await supabase.from("devices").select("id, name, last_seen").order("created_at")).data ?? [],
  });

  useEffect(() => {
    const ch = supabase
      .channel("dash-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["msg-counts"] });
        qc.invalidateQueries({ queryKey: ["recent-msgs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const online = (d: { last_seen: string | null }) => d.last_seen && Date.now() - new Date(d.last_seen).getTime() < 5 * 60_000;

  return (
    <div>
      <PageHeader kicker="Live" title="Delivery overview" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statuses.map((s) => (
          <div key={s} className="rounded-lg border border-border bg-card p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{s}</p>
            <p className="mt-2 font-mono text-4xl font-bold">{counts.data?.[s] ?? "—"}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-card lg:col-span-2">
          <h2 className="border-b border-border px-5 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Recent messages</h2>
          <ul className="divide-y divide-border">
            {(recent.data ?? []).map((m) => (
              <li key={m.id} className="flex items-start gap-4 px-5 py-3">
                <span className="w-36 shrink-0 font-mono text-sm">{m.phone}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground" title={m.error ?? m.body}>{m.error ?? m.body}</span>
                <StatusPill status={m.status} />
              </li>
            ))}
            {recent.data?.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">No messages yet — create a batch to start.</li>}
          </ul>
        </section>
        <section className="rounded-lg border border-border bg-card">
          <h2 className="border-b border-border px-5 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Gateways</h2>
          <ul className="divide-y divide-border">
            {(devices.data ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{d.name}</span>
                <span className={`font-mono text-xs ${online(d) ? "text-success" : "text-muted-foreground"}`}>{online(d) ? "● online" : "○ offline"}</span>
              </li>
            ))}
            {devices.data?.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">No phones connected.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

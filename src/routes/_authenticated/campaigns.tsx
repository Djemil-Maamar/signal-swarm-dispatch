import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { renderTemplate, smsSegments } from "@/lib/sms";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({ meta: [{ title: "Batches — SignalDesk" }, { name: "description", content: "Create and schedule batch SMS notifications." }] }),
  component: Campaigns,
});

function Campaigns() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  const contacts = useQuery({ queryKey: ["contacts"], queryFn: async () => (await supabase.from("contacts").select("*").limit(10000)).data ?? [] });
  const templates = useQuery({ queryKey: ["templates"], queryFn: async () => (await supabase.from("templates").select("*")).data ?? [] });
  const campaigns = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data: cs } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false }).limit(50);
      const { data: ms } = await supabase.from("messages").select("campaign_id, status").in("campaign_id", (cs ?? []).map((c) => c.id));
      return (cs ?? []).map((c) => {
        const mine = (ms ?? []).filter((m) => m.campaign_id === c.id);
        const by = (s: string) => mine.filter((m) => m.status === s).length;
        return { ...c, total: mine.length, sent: by("sent"), failed: by("failed"), pending: by("pending") + by("sending") };
      });
    },
  });

  useEffect(() => {
    const ch = supabase.channel("camp-msgs").on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => qc.invalidateQueries({ queryKey: ["campaigns"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const allTags = useMemo(() => Array.from(new Set((contacts.data ?? []).flatMap((c) => c.tags))).sort(), [contacts.data]);
  const audience = (contacts.data ?? []).filter((c) => c.phone && (!tag || c.tags.includes(tag)));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return void toast.error("Name and message are required");
    if (!audience.length) return void toast.error("No recipients match");
    setBusy(true);
    const scheduled_at = when ? new Date(when).toISOString() : new Date().toISOString();
    const { data: camp, error } = await supabase.from("campaigns").insert({ name: name.trim(), body, scheduled_at }).select().single();
    if (error || !camp) { setBusy(false); return void toast.error(error?.message ?? "Failed"); }
    const rows = audience.map((c) => ({ campaign_id: camp.id, contact_id: c.id, phone: c.phone!, body: renderTemplate(body, c), scheduled_at }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error: e2 } = await supabase.from("messages").insert(rows.slice(i, i + 500));
      if (e2) { setBusy(false); return void toast.error(e2.message); }
    }
    setBusy(false);
    toast.success(`Queued ${rows.length} SMS${when ? " for " + new Date(when).toLocaleString() : ""}`);
    setName(""); setBody(""); setWhen("");
    qc.invalidateQueries();
  }

  const preview = audience[0] ? renderTemplate(body, audience[0]) : body;

  return (
    <div>
      <PageHeader kicker="Dispatch" title="Batch notifications" />
      <form onSubmit={create} className="mb-10 grid gap-6 rounded-lg border border-border bg-card p-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Input placeholder="Batch name (e.g. Outage notice — Ikeja)" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value="" onChange={(e) => { const t = templates.data?.find((x) => x.id === e.target.value); if (t) setBody(t.body); }}>
            <option value="">Insert a template…</option>
            {(templates.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Textarea rows={5} placeholder="Hello {{name}}…" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">Audience tag
              <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">All contacts</option>
                {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">Send at (blank = now)
              <Input type="datetime-local" className="mt-1" value={when} onChange={(e) => setWhen(e.target.value)} />
            </label>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4">
          <div className="signal-grid rounded-lg border border-border p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Preview · {audience[0]?.name || "recipient"}</p>
            <div className="mt-3 max-w-xs rounded-2xl rounded-bl-sm bg-secondary p-3 text-sm whitespace-pre-wrap">{preview || "…"}</div>
            <p className="mt-3 font-mono text-xs text-muted-foreground">{preview.length} chars · {smsSegments(preview)} SMS each</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm"><span className="text-primary">{audience.length}</span> recipients</span>
            <Button type="submit" disabled={busy} className="signal-glow">{busy ? "Queuing…" : when ? "Schedule batch" : "Send batch"}</Button>
          </div>
        </div>
      </form>

      <div className="space-y-3">
        {(campaigns.data ?? []).map((c) => {
          const pct = c.total ? Math.round(((c.sent + c.failed) / c.total) * 100) : 0;
          return (
            <div key={c.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{c.name}</h3>
                <span className="font-mono text-xs text-muted-foreground">{new Date(c.scheduled_at) > new Date() ? "scheduled " : ""}{new Date(c.scheduled_at).toLocaleString()}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                <span className="text-success">{c.sent} sent</span> · <span className="text-destructive">{c.failed} failed</span> · {c.pending} waiting · {c.total} total
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

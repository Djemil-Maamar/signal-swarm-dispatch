import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { randomToken, sha256Hex } from "@/lib/sms";

export const Route = createFileRoute("/_authenticated/devices")({
  head: () => ({ meta: [{ title: "Gateways — SignalDesk" }, { name: "description", content: "Connect Android phones that send SMS over your SIM." }] }),
  component: Devices,
});

function Devices() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isAdmin = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.rpc("has_role", { _user_id: u.user!.id, _role: "admin" });
      return !!data;
    },
  });
  const { data = [] } = useQuery({ queryKey: ["devices"], queryFn: async () => (await supabase.from("devices").select("*").order("created_at")).data ?? [] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const t = randomToken();
    const { error } = await supabase.from("devices").insert({ name: name.trim(), token_hash: await sha256Hex(t) });
    if (error) return void toast.error(error.message);
    setToken(t); setName("");
    qc.invalidateQueries({ queryKey: ["devices"] });
  }

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied"); };

  return (
    <div>
      <PageHeader kicker="SIM network" title="Android gateways" />
      {isAdmin.data ? (
        <form onSubmit={add} className="mb-6 flex gap-2 rounded-lg border border-border bg-card p-4">
          <Input placeholder="Phone name (e.g. MTN Line 1)" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit">Add gateway</Button>
        </form>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">Only admins can add gateways.</p>
      )}
      {token && (
        <div className="signal-glow mb-6 rounded-lg border border-primary bg-card p-4">
          <p className="text-sm">Copy this gateway key now — it won't be shown again.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-muted p-2 font-mono text-xs">{token}</code>
            <Button size="icon" variant="outline" onClick={() => copy(token)}><Copy className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
      <ul className="mb-10 divide-y divide-border rounded-lg border border-border bg-card">
        {data.map((d) => (
          <li key={d.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <span>{d.name}</span>
            <span className="flex items-center gap-4">
              <span className="font-mono text-xs text-muted-foreground">{d.last_seen ? `seen ${new Date(d.last_seen).toLocaleString()}` : "never connected"}</span>
              {isAdmin.data && <button aria-label="Remove gateway" onClick={async () => { await supabase.from("devices").delete().eq("id", d.id); qc.invalidateQueries({ queryKey: ["devices"] }); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
            </span>
          </li>
        ))}
        {data.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">No gateways yet.</li>}
      </ul>

      <section className="rounded-lg border border-border bg-card p-6 text-sm">
        <h2 className="font-mono text-xs uppercase tracking-widest text-primary">Gateway protocol</h2>
        <p className="mt-2 text-muted-foreground">Your Android app (e.g. an HTTP-to-SMS gateway or Tasker/Automate flow) polls for due messages, sends them over its SIM, then reports the result. Send the key in the <code className="font-mono">X-Device-Token</code> header.</p>
        <pre className="mt-4 overflow-x-auto rounded bg-muted p-4 font-mono text-xs leading-relaxed">{`GET  ${origin}/api/public/gateway/outbox?limit=20
→ { "messages": [ { "id": "…", "phone": "+234…", "body": "…" } ] }

POST ${origin}/api/public/gateway/report
{ "reports": [ { "id": "…", "status": "sent" },
               { "id": "…", "status": "failed", "error": "No signal" } ] }`}</pre>
      </section>
    </div>
  );
}

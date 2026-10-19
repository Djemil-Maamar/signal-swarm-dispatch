import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { smsSegments } from "@/lib/sms";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Templates — SignalDesk" }, { name: "description", content: "Reusable SMS message templates." }] }),
  component: Templates,
});

function Templates() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await supabase.from("templates").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return void toast.error("Name and text are required");
    const { error } = await supabase.from("templates").insert({ name: name.trim(), body });
    if (error) return void toast.error(error.message);
    setName(""); setBody("");
    qc.invalidateQueries({ queryKey: ["templates"] });
  }

  return (
    <div>
      <PageHeader kicker="Library" title="Message templates" />
      <form onSubmit={save} className="mb-8 space-y-3 rounded-lg border border-border bg-card p-5">
        <Input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea rows={4} placeholder="Hello {{name}}, your service will be restored at 18:00." value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">{body.length} chars · {smsSegments(body)} SMS · placeholders: {"{{name}} {{phone}} {{email}}"}</span>
          <Button type="submit">Save template</Button>
        </div>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((t) => (
          <div key={t.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold">{t.name}</h3>
              <button aria-label="Delete template" onClick={async () => { await supabase.from("templates").delete().eq("id", t.id); qc.invalidateQueries({ queryKey: ["templates"] }); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-muted-foreground">{t.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizePhone, parseCsv } from "@/lib/sms";

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({ meta: [{ title: "Contacts — SignalDesk" }, { name: "description", content: "Manage SMS recipients." }] }),
  component: Contacts,
});

function Contacts() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", tags: "" });
  const [search, setSearch] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => (await supabase.from("contacts").select("*").order("created_at", { ascending: false }).limit(1000)).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["contacts"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone.trim()) return void toast.error("Phone is required");
    const { error } = await supabase.from("contacts").insert({
      name: form.name.trim(),
      phone: normalizePhone(form.phone),
      email: form.email.trim() || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    if (error) return void toast.error(error.message);
    setForm({ name: "", phone: "", email: "", tags: "" });
    refresh();
  }

  async function importCsv(file: File) {
    const rows = parseCsv(await file.text());
    const items = rows
      .filter((r) => r["phone"])
      .map((r) => ({
        name: r["name"] ?? "",
        phone: normalizePhone(r["phone"] ?? ""),
        email: r["email"] || null,
        tags: (r["tags"] ?? "").split(/[;|]/).map((t) => t.trim()).filter(Boolean),
      }));
    if (!items.length) return void toast.error("No rows with a 'phone' column found");
    for (let i = 0; i < items.length; i += 500) {
      const { error } = await supabase.from("contacts").insert(items.slice(i, i + 500));
      if (error) return void toast.error(error.message);
    }
    toast.success(`Imported ${items.length} contacts`);
    refresh();
  }

  const filtered = data.filter((c) =>
    [c.name, c.phone, c.email, c.tags.join(" ")].join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader kicker="Audience" title={`Contacts · ${data.length}`}>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Import CSV</Button>
      </PageHeader>
      <p className="mb-4 font-mono text-xs text-muted-foreground">CSV columns: name, phone, email, tags (tags separated by ; )</p>

      <form onSubmit={add} className="mb-6 grid gap-2 rounded-lg border border-border bg-card p-4 md:grid-cols-5">
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="+234…" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="tags, comma, separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <Button type="submit">Add contact</Button>
      </form>

      <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3 max-w-xs" />
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Email</th><th className="p-3">Tags</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="p-3">{c.name}</td>
                <td className="p-3 font-mono">{c.phone}</td>
                <td className="p-3 text-muted-foreground">{c.email}</td>
                <td className="p-3">{c.tags.map((t) => <span key={t} className="mr-1 rounded bg-accent px-1.5 py-0.5 font-mono text-[11px]">{t}</span>)}</td>
                <td className="p-3 text-right">
                  <button aria-label="Delete contact" onClick={async () => { await supabase.from("contacts").delete().eq("id", c.id); refresh(); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No contacts.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

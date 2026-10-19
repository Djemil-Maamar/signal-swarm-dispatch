import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SignalDesk" },
      { name: "description", content: "Sign in to the SignalDesk SMS dispatch console." },
      { property: "og:title", content: "Sign in — SignalDesk" },
      { property: "og:description", content: "Sign in to the SignalDesk SMS dispatch console." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/dashboard" }); });
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) navigate({ to: "/dashboard" }); });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/dashboard" } });
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm your account.");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  }

  return (
    <div className="signal-grid flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8">
        <Link to="/" className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-bold tracking-widest">SIGNALDESK</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold">{mode === "in" ? "Sign in" : "Create account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">The first account becomes admin; others join as operators.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <Input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Sign up"}</Button>
        </form>
        <Button variant="outline" className="mt-3 w-full" onClick={google}>Continue with Google</Button>
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground">
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

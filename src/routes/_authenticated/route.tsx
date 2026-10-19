import { createFileRoute, redirect, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Radio, Users, FileText, Send, Smartphone, LayoutDashboard, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/campaigns", label: "Batches", icon: Send },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/templates", label: "Templates", icon: FileText },
  { to: "/devices", label: "Gateways", icon: Smartphone },
] as const;

function Shell() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <Radio className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-bold tracking-widest">SIGNALDESK</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{ className: "bg-sidebar-accent text-primary" }}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <p className="truncate font-mono text-xs text-muted-foreground">{user.email}</p>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
            className="mt-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex gap-1 overflow-x-auto border-b border-border p-2 md:hidden">
          {nav.map(({ to, label }) => (
            <Link key={to} to={to} className="whitespace-nowrap rounded px-3 py-1.5 text-sm text-muted-foreground" activeProps={{ className: "bg-accent text-primary" }}>
              {label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 p-6 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

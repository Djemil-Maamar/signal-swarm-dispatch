import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio, Smartphone, CalendarClock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SignalDesk — Batch SMS over your own SIM network" },
      { name: "description", content: "Send scheduled batch SMS notifications through your own Android phones and SIM cards, with live delivery reports." },
      { property: "og:title", content: "SignalDesk — Batch SMS over your own SIM network" },
      { property: "og:description", content: "Scheduled batch SMS through your own Android gateways, with live delivery reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Smartphone, t: "Your SIMs, your network", d: "Android phones act as gateways and send over GSM." },
  { icon: CalendarClock, t: "Scheduled batches", d: "Queue thousands of personalised messages for later." },
  { icon: BarChart3, t: "Live delivery reports", d: "Sent, failed and waiting — updated in real time." },
];

function Index() {
  return (
    <div className="signal-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-bold tracking-widest">SIGNALDESK</span>
        </div>
        <Link to="/auth"><Button variant="outline" size="sm">Sign in</Button></Link>
      </header>
      <main className="mx-auto max-w-6xl px-6 pt-20 pb-24">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">● GSM dispatch console</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
          Batch notifications, routed through your own SIM cards.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Import contacts, write once with placeholders, schedule — and let your Android gateways deliver.
        </p>
        <Link to="/dashboard"><Button size="lg" className="signal-glow mt-10">Open console</Button></Link>
        <div className="mt-24 grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-lg border border-border bg-card/80 p-6 backdrop-blur">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

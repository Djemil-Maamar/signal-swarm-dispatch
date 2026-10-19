import { createFileRoute } from "@tanstack/react-router";
import { authenticateDevice } from "@/lib/gateway.server";

type Report = { id: string; status: "sent" | "failed"; error?: string };

// Android gateway reports delivery results here.
export const Route = createFileRoute("/api/public/gateway/report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateDevice(request);
        if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });
        const body = (await request.json().catch(() => null)) as { reports?: Report[] } | Report | null;
        const reports = body && "reports" in body ? body.reports ?? [] : body ? [body as Report] : [];
        let updated = 0;
        for (const r of reports.slice(0, 200)) {
          if (!r?.id || (r.status !== "sent" && r.status !== "failed")) continue;
          const { error } = await auth.supabaseAdmin
            .from("messages")
            .update({
              status: r.status,
              error: r.status === "failed" ? String(r.error ?? "unknown").slice(0, 500) : null,
              sent_at: r.status === "sent" ? new Date().toISOString() : null,
            })
            .eq("id", r.id)
            .eq("device_id", auth.deviceId);
          if (!error) updated++;
        }
        return Response.json({ updated });
      },
    },
  },
});

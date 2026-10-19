import { createFileRoute } from "@tanstack/react-router";
import { authenticateDevice } from "@/lib/gateway.server";

// Android gateway polls this: returns due SMS and marks them "sending".
export const Route = createFileRoute("/api/public/gateway/outbox")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticateDevice(request);
        if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });
        const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 20) || 20, 100);
        const { data, error } = await auth.supabaseAdmin.rpc("claim_messages", { _device: auth.deviceId, _limit: limit });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ messages: (data ?? []).map((m) => ({ id: m.id, phone: m.phone, body: m.body })) });
      },
    },
  },
});

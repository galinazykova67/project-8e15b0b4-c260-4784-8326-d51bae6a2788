import { createFileRoute } from "@tanstack/react-router";
import { syncJtcCatalog } from "@/lib/catalog.functions";

const handler = async () => {
  try {
    const r = await syncJtcCatalog();
    return new Response(JSON.stringify({ ok: true, ...r, at: new Date().toISOString() }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
};

export const Route = createFileRoute("/api/public/sync-jtc")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
});

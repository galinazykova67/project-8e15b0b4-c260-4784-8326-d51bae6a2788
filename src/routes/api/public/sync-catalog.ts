import { createFileRoute } from "@tanstack/react-router";
import { syncCatalogFromUrl } from "@/lib/catalog.functions";

const DEFAULT_URL = "https://www.master-instrument.ru/bitrix/catalog_export/export_DF_new.xml";

const handler = async ({ request }: { request: Request }) => {
  const url = new URL(request.url).searchParams.get("url") ?? DEFAULT_URL;
  try {
    const r = await syncCatalogFromUrl({ data: { url } });
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

export const Route = createFileRoute("/api/public/sync-catalog")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
});

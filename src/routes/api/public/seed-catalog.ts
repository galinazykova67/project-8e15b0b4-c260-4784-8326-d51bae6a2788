import { createFileRoute } from "@tanstack/react-router";
import { seedCatalogIfEmpty } from "@/lib/catalog.functions";

const DEFAULT_URL = "https://www.master-instrument.ru/bitrix/catalog_export/export_DF_new.xml";

export const Route = createFileRoute("/api/public/seed-catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url).searchParams.get("url") ?? DEFAULT_URL;
        try {
          const r = await seedCatalogIfEmpty({ data: { url } });
          return new Response(JSON.stringify(r), {
            headers: { "content-type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ error: (e as Error).message }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});

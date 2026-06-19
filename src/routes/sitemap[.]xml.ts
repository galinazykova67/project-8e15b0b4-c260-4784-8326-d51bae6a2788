import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

async function build(request: Request): Promise<string> {
  const sb = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const origin = new URL(request.url).origin;

  const [{ data: cats }, { data: prods }] = await Promise.all([
    sb.from("categories").select("slug, updated_at").eq("visible", true),
    sb
      .from("products")
      .select("slug, updated_at")
      .eq("visible", true)
      .order("updated_at", { ascending: false })
      .limit(5000),
  ]);

  const staticPaths = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/catalog", priority: "0.9", changefreq: "daily" },
    { loc: "/contacts", priority: "0.5", changefreq: "monthly" },
  ];

  const urls: string[] = [];
  for (const p of staticPaths) {
    urls.push(
      `<url><loc>${origin}${p.loc}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
    );
  }
  for (const c of cats ?? []) {
    urls.push(
      `<url><loc>${origin}/catalog/${escapeXml(c.slug)}</loc><lastmod>${new Date(c.updated_at).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    );
  }
  for (const p of prods ?? []) {
    urls.push(
      `<url><loc>${origin}/product/${escapeXml(p.slug)}</loc><lastmod>${new Date(p.updated_at).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}

export const Route = createFileRoute("/sitemap[.]xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const xml = await build(request);
          return new Response(xml, {
            headers: {
              "content-type": "application/xml; charset=utf-8",
              "cache-control": "public, max-age=3600",
            },
          });
        } catch (e) {
          return new Response(`<!-- sitemap error: ${(e as Error).message} -->`, {
            status: 500,
            headers: { "content-type": "application/xml" },
          });
        }
      },
    },
  },
});

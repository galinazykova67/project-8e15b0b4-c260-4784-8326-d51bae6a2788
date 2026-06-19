import { createFileRoute } from "@tanstack/react-router";
import { parseYml, slugify } from "@/lib/yml-parser";

const SOURCE = "jtc";
const FEED_URL = "https://www.jtcrussia.ru/yml.xml";
const ROOT_YML_ID = "jtc-root";
const ROOT_NAME = "Автоинструмент";

async function logStart(source: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("sync_runs")
    .insert({ source, status: "running" })
    .select("id, started_at")
    .single();
  if (error) throw new Error(`sync log start: ${error.message}`);
  return data as { id: string; started_at: string };
}

async function logFinish(
  id: string,
  startedAt: string,
  patch: {
    status: "success" | "error";
    categories_count?: number;
    products_count?: number;
    error?: string;
  },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const duration = Date.now() - new Date(startedAt).getTime();
  await supabaseAdmin
    .from("sync_runs")
    .update({ ...patch, finished_at: new Date().toISOString(), duration_ms: duration })
    .eq("id", id);
}

async function fetchWithRetry(url: string, attempts = 3, timeoutMs = 60000) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Сетевая ошибка загрузки фида");
}

async function runImport(xml: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const parsed = parseYml(xml);

  // root category
  const rootSlug = slugify(ROOT_NAME, `cat-${ROOT_YML_ID}`);
  {
    const { error } = await supabaseAdmin
      .from("categories")
      .upsert([{ yml_id: ROOT_YML_ID, parent_yml_id: null, name: ROOT_NAME, slug: rootSlug }], {
        onConflict: "yml_id",
      });
    if (error) throw new Error(`Корневая категория: ${error.message}`);
  }

  const usedSlugs = new Set<string>([rootSlug]);
  const catRows = parsed.categories.map((c) => {
    const base = slugify(`${c.name}-${c.yml_id}`, `cat-${c.yml_id}`);
    let slug = base;
    let i = 1;
    while (usedSlugs.has(slug)) slug = `${base}-${i++}`;
    usedSlugs.add(slug);
    return {
      yml_id: c.yml_id,
      parent_yml_id: c.parent_yml_id ?? ROOT_YML_ID,
      name: c.name,
      slug,
    };
  });

  const chunk = <T,>(arr: T[], n: number) =>
    Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  let catUpserted = 1;
  for (const batch of chunk(catRows, 300)) {
    const { error } = await supabaseAdmin
      .from("categories")
      .upsert(batch, { onConflict: "yml_id" });
    if (error) throw new Error(`Категории: ${error.message}`);
    catUpserted += batch.length;
  }

  const prodUsedSlugs = new Set<string>();
  const prodRows = parsed.offers.map((o) => {
    const base = slugify(`${o.name}-${o.yml_id}`, `p-${o.yml_id}`);
    let slug = base;
    let i = 1;
    while (prodUsedSlugs.has(slug)) slug = `${base}-${i++}`;
    prodUsedSlugs.add(slug);
    const searchParts = [o.name, o.vendor, o.vendor_code, o.description, ...Object.values(o.params)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return {
      yml_id: o.yml_id,
      category_yml_id: o.category_yml_id,
      name: o.name,
      slug,
      vendor: o.vendor,
      vendor_code: o.vendor_code,
      price: o.price,
      old_price: o.old_price,
      currency: o.currency,
      description: o.description,
      pictures: o.pictures,
      available: o.available,
      params: o.params,
      search_text: searchParts,
    };
  });

  let prodUpserted = 0;
  for (const batch of chunk(prodRows, 300)) {
    const { error } = await supabaseAdmin
      .from("products")
      .upsert(batch, { onConflict: "yml_id" });
    if (error) throw new Error(`Товары: ${error.message}`);
    prodUpserted += batch.length;
  }

  return { categories: catUpserted, products: prodUpserted };
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!expected) return true; // dev fallback
  const apikey = request.headers.get("apikey") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return apikey === expected;
}

const handler = async ({ request }: { request: Request }) => {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let runId: string | null = null;
  let startedAt: string | null = null;
  try {
    const started = await logStart(SOURCE);
    runId = started.id;
    startedAt = started.started_at;

    const xml = await fetchWithRetry(FEED_URL);
    const result = await runImport(xml);

    await logFinish(runId, startedAt, {
      status: "success",
      categories_count: result.categories,
      products_count: result.products,
    });

    return new Response(
      JSON.stringify({ ok: true, ...result, run_id: runId, at: new Date().toISOString() }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (e) {
    const msg = (e as Error).message ?? "Unknown error";
    console.error("[sync-jtc]", msg);
    if (runId && startedAt) {
      try {
        await logFinish(runId, startedAt, { status: "error", error: msg });
      } catch {
        // swallow logging errors
      }
    }
    return new Response(JSON.stringify({ ok: false, error: msg, run_id: runId }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
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

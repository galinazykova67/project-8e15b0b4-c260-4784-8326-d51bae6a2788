import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { parseYml, slugify } from "./yml-parser";

// ---------- PUBLIC READ ----------

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

async function withPublic<T>(fn: (sb: ReturnType<typeof publicClient>) => Promise<T>): Promise<T> {
  return fn(publicClient());
}

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await publicClient();
  const { data, error } = await sb
    .from("categories")
    .select("id, yml_id, parent_yml_id, name, slug")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        categorySlug: z.string().optional(),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(60).default(24),
        sort: z.enum(["new", "price_asc", "price_desc", "name"]).default("new"),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = await publicClient();
    let categoryYmlId: string | null = null;
    if (data.categorySlug) {
      const { data: cat } = await sb
        .from("categories")
        .select("yml_id")
        .eq("slug", data.categorySlug)
        .maybeSingle();
      if (!cat) return { items: [], total: 0 };
      categoryYmlId = cat.yml_id;
    }
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = sb
      .from("products")
      .select("id, yml_id, name, slug, price, old_price, currency, pictures, available, vendor", {
        count: "exact",
      });

    if (categoryYmlId) q = q.eq("category_yml_id", categoryYmlId);
    if (data.search && data.search.trim()) {
      const term = data.search.trim().replace(/[%,]/g, " ");
      q = q.ilike("search_text", `%${term}%`);
    }
    if (data.minPrice != null) q = q.gte("price", data.minPrice);
    if (data.maxPrice != null) q = q.lte("price", data.maxPrice);

    switch (data.sort) {
      case "price_asc": q = q.order("price", { ascending: true }); break;
      case "price_desc": q = q.order("price", { ascending: false }); break;
      case "name": q = q.order("name", { ascending: true }); break;
      default: q = q.order("created_at", { ascending: false });
    }

    const { data: items, count, error } = await q.range(from, to);
    if (error) throw new Error(error.message);
    return { items: items ?? [], total: count ?? 0 };
  });

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await publicClient();
    const { data: p, error } = await sb
      .from("products")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return p;
  });

// ---------- ADMIN ----------

export const importYmlCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ xml: z.string().min(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Доступ запрещён: требуется роль администратора");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const parsed = parseYml(data.xml);

    // categories — upsert by yml_id with unique slug
    const usedSlugs = new Set<string>();
    const catRows = parsed.categories.map((c) => {
      let base = slugify(`${c.name}-${c.yml_id}`, `cat-${c.yml_id}`);
      let slug = base;
      let i = 1;
      while (usedSlugs.has(slug)) slug = `${base}-${i++}`;
      usedSlugs.add(slug);
      return { yml_id: c.yml_id, parent_yml_id: c.parent_yml_id, name: c.name, slug };
    });

    let catUpserted = 0;
    const chunk = <T,>(arr: T[], n: number) =>
      Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
    for (const batch of chunk(catRows, 500)) {
      const { error } = await supabaseAdmin
        .from("categories")
        .upsert(batch, { onConflict: "yml_id" });
      if (error) throw new Error(`Категории: ${error.message}`);
      catUpserted += batch.length;
    }

    // products
    const prodUsedSlugs = new Set<string>();
    const prodRows = parsed.offers.map((o) => {
      let base = slugify(`${o.name}-${o.yml_id}`, `p-${o.yml_id}`);
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
    for (const batch of chunk(prodRows, 500)) {
      const { error } = await supabaseAdmin
        .from("products")
        .upsert(batch, { onConflict: "yml_id" });
      if (error) throw new Error(`Товары: ${error.message}`);
      prodUpserted += batch.length;
    }

    return {
      categories: catUpserted,
      products: prodUpserted,
    };
  });

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


export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("categories")
    .select("id, yml_id, parent_yml_id, name, slug, sort_order")
    .eq("visible", true)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

async function resolveCategoryTreeIds(
  sb: ReturnType<typeof publicClient>,
  slug: string,
): Promise<string[] | null> {
  const { data: all, error } = await sb
    .from("categories")
    .select("yml_id, parent_yml_id, slug, visible");
  if (error) throw new Error(error.message);
  const cats = all ?? [];
  const root = cats.find((c) => c.slug === slug);
  if (!root) return null;
  const byParent = new Map<string, typeof cats>();
  for (const c of cats) {
    const k = c.parent_yml_id ?? "";
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(c);
  }
  const ids: string[] = [];
  const walk = (ymlId: string) => {
    ids.push(ymlId);
    for (const child of byParent.get(ymlId) ?? []) {
      if (child.visible) walk(child.yml_id);
    }
  };
  walk(root.yml_id);
  return ids;
}

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
    const sb = publicClient();
    let categoryIds: string[] | null = null;
    if (data.categorySlug) {
      categoryIds = await resolveCategoryTreeIds(sb, data.categorySlug);
      if (!categoryIds || categoryIds.length === 0) return { items: [], total: 0 };
    }
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = sb
      .from("products")
      .select("id, yml_id, name, slug, price, old_price, currency, pictures, available, vendor", {
        count: "exact",
      })
      .eq("visible", true);

    if (categoryIds) q = q.in("category_yml_id", categoryIds);
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
    const sb = publicClient();
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

export const importYmlFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Доступ запрещён: требуется роль администратора");
    const res = await fetch(data.url);
    if (!res.ok) throw new Error(`Не удалось скачать файл: HTTP ${res.status}`);
    const xml = await res.text();
    return await runImport(xml);
  });

async function runImport(xml: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const parsed = parseYml(xml);

  const usedSlugs = new Set<string>();
  const catRows = parsed.categories.map((c) => {
    const base = slugify(`${c.name}-${c.yml_id}`, `cat-${c.yml_id}`);
    let slug = base;
    let i = 1;
    while (usedSlugs.has(slug)) slug = `${base}-${i++}`;
    usedSlugs.add(slug);
    return { yml_id: c.yml_id, parent_yml_id: c.parent_yml_id, name: c.name, slug };
  });

  const chunk = <T,>(arr: T[], n: number) =>
    Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  let catUpserted = 0;
  for (const batch of chunk(catRows, 500)) {
    const { error } = await supabaseAdmin.from("categories").upsert(batch, { onConflict: "yml_id" });
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
      .filter(Boolean).join(" ").toLowerCase();
    return {
      yml_id: o.yml_id, category_yml_id: o.category_yml_id, name: o.name, slug,
      vendor: o.vendor, vendor_code: o.vendor_code, price: o.price, old_price: o.old_price,
      currency: o.currency, description: o.description, pictures: o.pictures,
      available: o.available, params: o.params, search_text: searchParts,
    };
  });

  let prodUpserted = 0;
  for (const batch of chunk(prodRows, 500)) {
    const { error } = await supabaseAdmin.from("products").upsert(batch, { onConflict: "yml_id" });
    if (error) throw new Error(`Товары: ${error.message}`);
    prodUpserted += batch.length;
  }
  return { categories: catUpserted, products: prodUpserted };
}

// One-shot seed: only runs while the catalog is empty. Safe to leave deployed.
export const seedCatalogIfEmpty = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: cErr } = await supabaseAdmin
      .from("products").select("id", { count: "exact", head: true });
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) return { skipped: true, existing: count, categories: 0, products: 0 };
    const res = await fetch(data.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const r = await runImport(xml);
    return { skipped: false, existing: 0, ...r };
  });

// ---------- ADMIN CATEGORY MANAGEMENT ----------

async function assertAdmin(context: { supabase: ReturnType<typeof createClient<Database>>; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Доступ запрещён: требуется роль администратора");
}

export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("id, yml_id, parent_yml_id, name, slug, visible, sort_order")
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminCategoryToggleVisible = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), visible: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("categories")
      .update({ visible: data.visible })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminCategoryUpsert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(200),
      parent_yml_id: z.string().nullable().optional(),
      sort_order: z.number().int().optional(),
      visible: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin.from("categories").update({
        name: data.name,
        parent_yml_id: data.parent_yml_id ?? null,
        sort_order: data.sort_order ?? 0,
        visible: data.visible ?? true,
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const yml_id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const slugBase = slugify(`${data.name}-${yml_id}`, `cat-${yml_id}`);
    const { error } = await supabaseAdmin.from("categories").insert({
      yml_id,
      name: data.name,
      parent_yml_id: data.parent_yml_id ?? null,
      slug: slugBase,
      sort_order: data.sort_order ?? 0,
      visible: data.visible ?? true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminCategoryDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Find the category by id to get its yml_id
    const { data: cat, error: e1 } = await supabaseAdmin
      .from("categories")
      .select("yml_id")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!cat) throw new Error("Категория не найдена");
    // Check for children
    const { count: childCount } = await supabaseAdmin
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("parent_yml_id", cat.yml_id);
    if ((childCount ?? 0) > 0) throw new Error("Сначала удалите подкатегории");
    const { count: prodCount } = await supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_yml_id", cat.yml_id);
    if ((prodCount ?? 0) > 0) throw new Error(`В категории ${prodCount} товаров. Удаление запрещено.`);
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

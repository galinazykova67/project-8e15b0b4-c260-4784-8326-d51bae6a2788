import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

async function assertAdmin(context: { supabase: ReturnType<typeof createClient<Database>>; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Доступ запрещён");
}

// ---------- Public reads ----------
export const getPageSeo = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ path: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("page_seo")
      .select("title, description")
      .eq("path", data.path)
      .maybeSingle();
    return row ?? null;
  });

// ---------- Admin: listing & updating ----------
export const adminListSeoCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("id, yml_id, parent_yml_id, name, slug, seo_title, seo_description")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpdateCategorySeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      seo_title: z.string().max(200).nullable(),
      seo_description: z.string().max(500).nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("categories")
      .update({ seo_title: data.seo_title, seo_description: data.seo_description })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListSeoProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(25),
      onlyMissing: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabaseAdmin
      .from("products")
      .select("id, name, slug, vendor, vendor_code, description, seo_title, seo_description", { count: "exact" })
      .order("name");
    if (data.search?.trim()) {
      const t = data.search.trim().replace(/[%,]/g, " ");
      q = q.or(`name.ilike.%${t}%,vendor_code.ilike.%${t}%`);
    }
    if (data.onlyMissing) {
      q = q.or("seo_title.is.null,seo_description.is.null");
    }
    const { data: rows, count, error } = await q.range(from, to);
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0 };
  });

export const adminUpdateProductSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      seo_title: z.string().max(200).nullable(),
      seo_description: z.string().max(500).nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("products")
      .update({ seo_title: data.seo_title, seo_description: data.seo_description })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListPageSeo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("page_seo")
      .select("id, path, title, description")
      .order("path");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpsertPageSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      path: z.string().min(1),
      title: z.string().max(200).nullable(),
      description: z.string().max(500).nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("page_seo")
      .upsert({ path: data.path, title: data.title, description: data.description }, { onConflict: "path" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- AI generation ----------
const SYSTEM_PROMPT = `Ты SEO-копирайтер интернет-магазина автоинструмента и оборудования для автосервиса «Автоключ» в Смоленске.
Пиши на русском языке, естественно, без воды и без CAPS.
Возвращай строго JSON: {"title": string, "description": string}.
Требования:
- title: до 60 символов, ёмкий, с ключевым словом, без названия магазина в конце если уже не помещается.
- description: 140-160 символов, с пользой для покупателя и призывом, без точки в конце не обязательно.
- Не выдумывай характеристики, опирайся только на предоставленный контекст.`;

async function generateWithAI(userPrompt: string): Promise<{ title: string; description: string }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY не задан");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("Слишком много запросов к ИИ. Попробуйте позже.");
  if (res.status === 402) throw new Error("Закончились кредиты Lovable AI. Пополните в настройках.");
  if (!res.ok) throw new Error(`AI Gateway: ${res.status}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content);
    return {
      title: String(parsed.title ?? "").slice(0, 200),
      description: String(parsed.description ?? "").slice(0, 500),
    };
  } catch {
    throw new Error("ИИ вернул некорректный JSON");
  }
}

export const adminGenerateSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      kind: z.enum(["category", "product", "page"]),
      id: z.string().optional(),
      path: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let prompt = "";
    if (data.kind === "category") {
      if (!data.id) throw new Error("id обязателен");
      const { data: c, error } = await supabaseAdmin
        .from("categories")
        .select("name, slug, parent_yml_id")
        .eq("id", data.id)
        .maybeSingle();
      if (error || !c) throw new Error("Категория не найдена");
      let parentName = "";
      if (c.parent_yml_id) {
        const { data: p } = await supabaseAdmin
          .from("categories").select("name").eq("yml_id", c.parent_yml_id).maybeSingle();
        parentName = p?.name ?? "";
      }
      prompt = `Категория каталога: "${c.name}"${parentName ? ` (раздел: ${parentName})` : ""}.
Это страница списка товаров данной категории в магазине автоинструмента в Смоленске.
Сгенерируй SEO title и description для этой страницы каталога.`;
    } else if (data.kind === "product") {
      if (!data.id) throw new Error("id обязателен");
      const { data: p, error } = await supabaseAdmin
        .from("products")
        .select("name, vendor, vendor_code, description, params, category_yml_id")
        .eq("id", data.id)
        .maybeSingle();
      if (error || !p) throw new Error("Товар не найден");
      let categoryName = "";
      if (p.category_yml_id) {
        const { data: c } = await supabaseAdmin
          .from("categories").select("name").eq("yml_id", p.category_yml_id).maybeSingle();
        categoryName = c?.name ?? "";
      }
      const params = p.params && typeof p.params === "object"
        ? Object.entries(p.params as Record<string, unknown>).slice(0, 8).map(([k, v]) => `${k}: ${v}`).join("; ")
        : "";
      prompt = `Товар: "${p.name}".
Бренд: ${p.vendor ?? "—"}. Артикул: ${p.vendor_code ?? "—"}.
Категория: ${categoryName || "—"}.
Описание: ${(p.description ?? "").slice(0, 600) || "—"}.
Характеристики: ${params || "—"}.
Сгенерируй SEO title и description для карточки товара.`;
    } else {
      if (!data.path) throw new Error("path обязателен");
      const labels: Record<string, string> = {
        "/": "Главная страница магазина автоинструмента «Автоключ» в Смоленске",
        "/catalog": "Каталог всех товаров: автоинструмент, оборудование для автосервиса",
        "/cart": "Корзина покупателя",
        "/contacts": "Контакты магазина: адрес в Смоленске, телефон, режим работы",
      };
      prompt = `Страница сайта: ${data.path}. ${labels[data.path] ?? ""}
Сгенерируй SEO title и description для этой страницы.`;
    }

    return await generateWithAI(prompt);
  });

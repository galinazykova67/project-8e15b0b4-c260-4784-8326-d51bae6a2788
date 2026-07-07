import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Доступ запрещён: требуется роль администратора");
}

// Discounts of the currently signed-in user — used by the storefront to price products.
export const getMyDiscounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("customer_discounts")
      .select("vendor, percent")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as { vendor: string; percent: number }[];
  });

// Admin: list all users (from auth.users) with their current discounts.
export const adminListCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: users, error: uErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (uErr) throw new Error(uErr.message);

    const { data: discounts, error: dErr } = await supabaseAdmin
      .from("customer_discounts")
      .select("id, user_id, vendor, percent");
    if (dErr) throw new Error(dErr.message);

    const byUser = new Map<string, { id: string; vendor: string; percent: number }[]>();
    for (const d of discounts ?? []) {
      const arr = byUser.get(d.user_id) ?? [];
      arr.push({ id: d.id, vendor: d.vendor, percent: Number(d.percent) });
      byUser.set(d.user_id, arr);
    }

    return (users.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      discounts: byUser.get(u.id) ?? [],
    }));
  });

// Admin: distinct list of vendors from products for the vendor picker.
export const adminListVendors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("vendor")
      .not("vendor", "is", null)
      .limit(10000);
    if (error) throw new Error(error.message);
    const set = new Set<string>();
    for (const r of data ?? []) if (r.vendor) set.add(r.vendor);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  });

export const adminUpsertDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        user_id: z.string().uuid(),
        vendor: z.string().trim().min(1).max(200),
        percent: z.number().min(0).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("customer_discounts")
      .upsert(
        { user_id: data.user_id, vendor: data.vendor, percent: data.percent },
        { onConflict: "user_id,vendor" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("customer_discounts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OrderItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().min(1).max(300),
  vendor_code: z.string().max(100).nullable().optional(),
  price: z.number().min(0),
  quantity: z.number().int().min(1).max(999),
});

const CreateOrderSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  customer_phone: z.string().trim().min(5).max(30),
  customer_email: z.string().trim().email().max(200).optional().or(z.literal("")),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z.array(OrderItemSchema).min(1).max(100),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => CreateOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // recompute total from actual DB prices to avoid client tampering
    const ids = data.items.map((i) => i.product_id);
    const { data: dbProducts, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("id, name, price, vendor_code")
      .in("id", ids);
    if (prodErr) throw new Error(prodErr.message);

    const byId = new Map((dbProducts ?? []).map((p) => [p.id, p]));
    let total = 0;
    const itemsToInsert = data.items.map((it) => {
      const p = byId.get(it.product_id);
      const price = p ? Number(p.price) : it.price;
      total += price * it.quantity;
      return {
        product_id: it.product_id,
        product_name: p?.name ?? it.product_name,
        vendor_code: p?.vendor_code ?? it.vendor_code ?? null,
        price,
        quantity: it.quantity,
      };
    });

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || null,
        comment: data.comment || null,
        total,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(itemsToInsert.map((i) => ({ ...i, order_id: order.id })));
    if (itemsErr) throw new Error(itemsErr.message);

    return { id: order.id, total };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Доступ запрещён");

    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, customer_email, comment, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getOrderItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Доступ запрещён");
    const { data: items, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", data.orderId);
    if (error) throw new Error(error.message);
    return items ?? [];
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(["new", "processing", "completed", "cancelled"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Доступ запрещён");
    const { error } = await supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

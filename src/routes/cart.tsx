import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { useCart, formatPrice } from "@/lib/cart-store";
import { useMyDiscounts } from "@/hooks/use-my-discounts";
import { applyDiscount, discountPercentFor } from "@/lib/discount-utils";
import { createOrder } from "@/lib/orders.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Корзина — Автоключ" }, { name: "robots", content: "noindex" }],
  }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();
  const { map: discountMap } = useMyDiscounts();
  const total = items.reduce(
    (sum, i) => sum + applyDiscount(i.price, i.vendor, discountMap) * i.quantity,
    0,
  );
  const totalDiscount = items.reduce(
    (sum, i) => sum + (i.price - applyDiscount(i.price, i.vendor, discountMap)) * i.quantity,
    0,
  );

  const [form, setForm] = useState({ name: "", phone: "", email: "", comment: "" });
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (form.name.trim().length < 2) return toast.error("Введите имя");
    if (form.phone.trim().length < 5) return toast.error("Введите телефон");
    if (!agree) return toast.error("Необходимо согласие на обработку персональных данных");

    setSubmitting(true);
    try {
      const res = await createOrder({
        data: {
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          customer_email: form.email.trim() || undefined,
          comment: form.comment.trim() || undefined,
          items: items.map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            vendor_code: i.vendor_code,
            price: i.price,
            quantity: i.quantity,
          })),
        },
      });
      clear();
      setDone({ id: res.id });
    } catch (err) {
      toast.error("Ошибка отправки заказа", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-20 max-w-xl text-center">
          <div className="h-16 w-16 rounded-full bg-brand text-brand-foreground grid place-items-center mx-auto mb-6">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Заказ оформлен!</h1>
          <p className="text-muted-foreground mb-2">Номер заказа: <span className="font-mono">{done.id.slice(0, 8)}</span></p>
          <p className="text-muted-foreground mb-8">Мы свяжемся с вами по указанному телефону в ближайшее время.</p>
          <button onClick={() => navigate({ to: "/catalog" })} className="btn-brand h-11 px-6 rounded-md font-medium">
            Продолжить покупки
          </button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Корзина</h1>

        {items.length === 0 ? (
          <div className="text-center py-20 rounded-lg border border-dashed border-border">
            <p className="text-muted-foreground mb-4">В корзине пока ничего нет</p>
            <Link to="/catalog" className="text-brand hover:underline">Перейти в каталог</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* items */}
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.product_id} className="flex gap-4 p-3 rounded-lg border border-border bg-card">
                  <Link to="/product/$slug" params={{ slug: it.slug }} className="shrink-0 h-20 w-20 rounded bg-surface overflow-hidden grid place-items-center">
                    {it.picture ? (
                      <img src={it.picture} alt={it.product_name} className="w-full h-full object-contain p-1" />
                    ) : <div className="text-xs text-muted-foreground">фото</div>}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to="/product/$slug" params={{ slug: it.slug }} className="font-medium hover:text-brand line-clamp-2">
                      {it.product_name}
                    </Link>
                    {it.vendor_code && <div className="text-xs text-muted-foreground">арт. {it.vendor_code}</div>}
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center border border-input rounded-md">
                        <button onClick={() => setQty(it.product_id, it.quantity - 1)} className="h-8 w-8 grid place-items-center hover:bg-accent">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm">{it.quantity}</span>
                        <button onClick={() => setQty(it.product_id, it.quantity + 1)} className="h-8 w-8 grid place-items-center hover:bg-accent">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      {(() => {
                        const pct = discountPercentFor(it.vendor, discountMap);
                        const unit = applyDiscount(it.price, it.vendor, discountMap);
                        return (
                          <div className="text-right">
                            <div className="font-semibold">{formatPrice(unit * it.quantity)}</div>
                            {pct > 0 && (
                              <div className="text-xs text-muted-foreground">
                                <span className="line-through">{formatPrice(it.price * it.quantity)}</span>
                                <span className="ml-1 text-brand">−{pct}%</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <button onClick={() => remove(it.product_id)} className="text-muted-foreground hover:text-destructive p-2">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* checkout form */}
            <form onSubmit={submit} className="rounded-lg border border-border bg-card p-5 space-y-4 h-fit lg:sticky lg:top-32">
              <h2 className="font-bold text-lg">Оформление заказа</h2>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Имя *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Телефон *</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required maxLength={30} type="tel" className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={200} type="email" className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Комментарий</label>
                <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} maxLength={1000} rows={3} className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
              </div>
              <div className="pt-3 border-t border-border space-y-1">
                {totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">Ваша скидка:</div>
                    <div className="text-brand font-medium">−{formatPrice(totalDiscount)}</div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Итого:</div>
                  <div className="text-2xl font-bold">{formatPrice(total)}</div>
                </div>
              </div>
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                />
                <span>
                  Я согласен(-на) на обработку персональных данных и принимаю условия{" "}
                  <Link to="/privacy" target="_blank" className="text-brand hover:underline">
                    Политики конфиденциальности
                  </Link>.
                </span>
              </label>
              <button disabled={submitting || !agree} type="submit" className="w-full h-11 rounded-md btn-brand font-semibold disabled:opacity-50">
                {submitting ? "Отправка..." : "Оформить заказ"}
              </button>
              <p className="text-xs text-muted-foreground">Мы свяжемся с вами для подтверждения заказа.</p>
            </form>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

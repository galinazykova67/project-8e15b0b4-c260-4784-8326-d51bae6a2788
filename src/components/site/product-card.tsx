import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useCart, formatPrice } from "@/lib/cart-store";
import { useMyDiscounts } from "@/hooks/use-my-discounts";
import { applyDiscount, discountPercentFor } from "@/lib/discount-utils";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: number;
  old_price: number | null;
  pictures: string[];
  available: boolean;
  vendor: string | null;
  vendor_code?: string | null;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const add = useCart((s) => s.add);
  const { map } = useMyDiscounts();
  const img = p.pictures[0];

  const percent = discountPercentFor(p.vendor, map);
  const finalPrice = applyDiscount(Number(p.price), p.vendor, map);

  return (
    <div className="group rounded-lg border border-border bg-card overflow-hidden flex flex-col hover:border-brand transition-colors">
      <Link to="/product/$slug" params={{ slug: p.slug }} className="block aspect-square bg-surface relative overflow-hidden">
        {img ? (
          <img src={img} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-contain p-3 group-hover:scale-105 transition-transform" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground text-xs">Нет фото</div>
        )}
        {!p.available && (
          <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] uppercase rounded bg-muted text-muted-foreground">Нет в наличии</div>
        )}
        {percent > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold rounded bg-brand text-brand-foreground">−{percent}%</div>
        )}
      </Link>
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 gap-2 min-w-0">
        {p.vendor && <div className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{p.vendor}</div>}
        <Link to="/product/$slug" params={{ slug: p.slug }} className="font-medium text-sm leading-snug line-clamp-2 hover:text-brand break-words [overflow-wrap:anywhere]">
          {p.name}
        </Link>
        {p.vendor_code && <div className="text-xs text-muted-foreground truncate">Артикул: <span className="font-mono">{p.vendor_code}</span></div>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2 min-w-0">
          <div className="min-w-0">
            <div className="font-bold text-sm sm:text-base text-foreground break-words">{formatPrice(finalPrice)}</div>
            {percent > 0 ? (
              <div className="text-xs text-muted-foreground line-through">{formatPrice(Number(p.price))}</div>
            ) : p.old_price && p.old_price > p.price ? (
              <div className="text-xs text-muted-foreground line-through">{formatPrice(p.old_price)}</div>
            ) : null}
          </div>

          <button
            onClick={() =>
              add({
                product_id: p.id,
                product_name: p.name,
                slug: p.slug,
                vendor: p.vendor ?? null,
                vendor_code: p.vendor_code ?? null,
                price: Number(p.price),
                picture: img ?? null,
              })
            }
            disabled={!p.available}
            className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-md btn-brand disabled:opacity-50 disabled:cursor-not-allowed"
            title="В корзину"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

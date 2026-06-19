import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingCart, Check, Minus, Plus } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { getProduct } from "@/lib/catalog.functions";
import { useCart, formatPrice } from "@/lib/cart-store";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const p = await getProduct({ data: { slug: params.slug } });
    if (!p) throw notFound();
    return { product: p };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) return { meta: [{ title: "Товар — Автоключ" }] };
    const seoT = (p as { seo_title?: string | null }).seo_title?.trim();
    const seoD = (p as { seo_description?: string | null }).seo_description?.trim();
    const title = seoT || `${p.name} — Автоключ`;
    const description = seoD || (p.description ?? p.name).slice(0, 160);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(p.pictures?.[0] ? [{ property: "og:image", content: p.pictures[0] }] : []),
      ],
      links: [{ rel: "canonical", href: `/product/${p.slug}` }],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Товар не найден</h1>
        <Link to="/catalog" className="text-brand hover:underline">В каталог</Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold mb-2">Ошибка</h1>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    </SiteLayout>
  ),
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const add = useCart((s) => s.add);

  const pictures: string[] = product.pictures ?? [];
  const params = (product.params ?? {}) as Record<string, string>;

  const handleAdd = () => {
    add(
      {
        product_id: product.id,
        product_name: product.name,
        slug: product.slug,
        vendor_code: product.vendor_code,
        price: Number(product.price),
        picture: pictures[0] ?? null,
      },
      qty,
    );
    toast.success("Добавлено в корзину", { description: product.name });
  };

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="text-sm text-muted-foreground mb-4">
          <Link to="/" className="hover:text-brand">Главная</Link>
          {" / "}
          <Link to="/catalog" className="hover:text-brand">Каталог</Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* IMAGES */}
          <div>
            <div className="aspect-square rounded-lg border border-border bg-surface overflow-hidden grid place-items-center">
              {pictures[activeImg] ? (
                <img src={pictures[activeImg]} alt={product.name} className="w-full h-full object-contain p-6" />
              ) : (
                <div className="text-muted-foreground">Нет фото</div>
              )}
            </div>
            {pictures.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {pictures.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`shrink-0 h-20 w-20 rounded border-2 overflow-hidden bg-surface ${i === activeImg ? "border-brand" : "border-border"}`}
                  >
                    <img src={src} alt="" className="w-full h-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div>
            {product.vendor && <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{product.vendor}</div>}
            <h1 className="text-2xl lg:text-3xl font-bold mb-3">{product.name}</h1>
            {product.vendor_code && <div className="text-sm text-muted-foreground mb-4">Артикул: <span className="font-mono">{product.vendor_code}</span></div>}

            <div className="flex items-center gap-2 mb-6">
              {product.available ? (
                <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                  <Check className="h-4 w-4" /> В наличии
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Нет в наличии</span>
              )}
            </div>

            <div className="flex items-end gap-4 mb-6">
              <div className="text-4xl font-extrabold">{formatPrice(Number(product.price))}</div>
              {product.old_price && Number(product.old_price) > Number(product.price) && (
                <div className="text-lg text-muted-foreground line-through pb-1">{formatPrice(Number(product.old_price))}</div>
              )}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex items-center border border-input rounded-md">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-11 w-11 grid place-items-center hover:bg-accent">
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 h-11 text-center bg-transparent focus:outline-none"
                />
                <button onClick={() => setQty((q) => q + 1)} className="h-11 w-11 grid place-items-center hover:bg-accent">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={handleAdd}
                disabled={!product.available}
                className="flex-1 h-11 rounded-md btn-brand font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" /> В корзину
              </button>
            </div>

            {product.description && (
              <div className="prose prose-sm max-w-none mb-6">
                <h3 className="font-semibold mb-2">Описание</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {Object.keys(params).length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Характеристики</h3>
                <dl className="divide-y divide-border border border-border rounded-md text-sm">
                  {Object.entries(params).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-2">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

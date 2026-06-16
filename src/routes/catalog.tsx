import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState, type FormEvent } from "react";
import { SiteLayout } from "@/components/site/site-layout";
import { ProductCard } from "@/components/site/product-card";
import { getCategories, listProducts } from "@/lib/catalog.functions";

const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(["new", "price_asc", "price_desc", "name"]).default("new"),
});

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Каталог автотоваров — Автоключ" },
      { name: "description", content: "Полный каталог автотоваров магазина Автоключ в Смоленске." },
    ],
    links: [{ rel: "canonical", href: "/catalog" }],
  }),
  validateSearch: searchSchema,
  component: CatalogPage,
});

function CatalogPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: () => getCategories() });
  const { data, isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: () =>
      listProducts({
        data: { page: search.page, pageSize: 24, sort: search.sort, search: search.q },
      }),
  });

  const [q, setQ] = useState(search.q ?? "");
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate({ search: (s: typeof search) => ({ ...s, q: q.trim() || undefined, page: 1 }) });
  };

  const topCats = (cats ?? []).filter((c) => !c.parent_yml_id);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / 24)) : 1;

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Каталог</h1>
        <p className="text-muted-foreground mb-6">{data?.total ?? 0} товаров</p>

        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          {/* SIDEBAR */}
          <aside className="space-y-6">
            <form onSubmit={onSearch} className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Поиск</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Название или артикул"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button className="w-full h-10 rounded-md btn-brand text-sm font-medium">Найти</button>
            </form>

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Категории</div>
              <div className="space-y-1">
                <Link to="/catalog" className="block text-sm px-3 py-1.5 rounded hover:bg-accent font-medium">
                  Все товары
                </Link>
                {topCats.map((c) => (
                  <Link
                    key={c.id}
                    to="/catalog/$slug"
                    params={{ slug: c.slug }}
                    className="block text-sm px-3 py-1.5 rounded hover:bg-accent"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* GRID */}
          <div>
            <div className="flex items-center justify-end mb-4">
              <select
                value={search.sort}
                onChange={(e) =>
                  navigate({ search: (s: typeof search) => ({ ...s, sort: e.target.value as typeof search.sort }) })
                }
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="new">Сначала новые</option>
                <option value="price_asc">Цена: по возрастанию</option>
                <option value="price_desc">Цена: по убыванию</option>
                <option value="name">По названию</option>
              </select>
            </div>

            {isLoading ? (
              <div className="text-center py-20 text-muted-foreground">Загрузка...</div>
            ) : data && data.items.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {data.items.map((p) => (
                    <ProductCard key={p.id} p={p} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      disabled={search.page <= 1}
                      onClick={() => navigate({ search: (s: typeof search) => ({ ...s, page: s.page - 1 }) })}
                      className="h-9 px-4 rounded-md border border-input disabled:opacity-50 hover:bg-accent text-sm"
                    >
                      Назад
                    </button>
                    <div className="text-sm text-muted-foreground px-3">
                      Стр. {search.page} из {totalPages}
                    </div>
                    <button
                      disabled={search.page >= totalPages}
                      onClick={() => navigate({ search: (s: typeof search) => ({ ...s, page: s.page + 1 }) })}
                      className="h-9 px-4 rounded-md border border-input disabled:opacity-50 hover:bg-accent text-sm"
                    >
                      Вперёд
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 rounded-lg border border-dashed border-border text-muted-foreground">
                Ничего не найдено
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { SiteLayout } from "@/components/site/site-layout";
import { ProductCard } from "@/components/site/product-card";
import { getCategories, listProducts } from "@/lib/catalog.functions";

const searchSchema = z.object({
  page: z.number().int().min(1).default(1),
  sort: z.enum(["new", "price_asc", "price_desc", "name"]).default("new"),
});

export const Route = createFileRoute("/catalog/$slug")({
  validateSearch: searchSchema,
  loader: async ({ params, context }) => {
    const cats = await context.queryClient.ensureQueryData({
      queryKey: ["categories"],
      queryFn: () => getCategories(),
    });
    const cat = cats.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return { category: cat };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.category?.name ?? "Категория"} — Автоключ` },
      { name: "description", content: `${loaderData?.category?.name ?? "Категория"} в каталоге автотоваров Автоключ.` },
    ],
    links: [{ rel: "canonical", href: `/catalog/${loaderData?.category?.slug ?? ""}` }],
  }),
  component: CategoryPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Категория не найдена</h1>
        <Link to="/catalog" className="text-brand hover:underline">Вернуться в каталог</Link>
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

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["products", "cat", category.slug, search],
    queryFn: () =>
      listProducts({
        data: { categorySlug: category.slug, page: search.page, pageSize: 24, sort: search.sort },
      }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 24)) : 1;

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="text-sm text-muted-foreground mb-2">
          <Link to="/" className="hover:text-brand">Главная</Link>
          {" / "}
          <Link to="/catalog" className="hover:text-brand">Каталог</Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
        <p className="text-muted-foreground mb-6">{data?.total ?? 0} товаров</p>

        <div className="flex justify-end mb-4">
          <select
            value={search.sort}
            onChange={(e) => navigate({ search: (s) => ({ ...s, sort: e.target.value as typeof search.sort }) })}
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
              {data.items.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  disabled={search.page <= 1}
                  onClick={() => navigate({ search: (s) => ({ ...s, page: s.page - 1 }) })}
                  className="h-9 px-4 rounded-md border border-input disabled:opacity-50 hover:bg-accent text-sm"
                >Назад</button>
                <div className="text-sm text-muted-foreground px-3">Стр. {search.page} из {totalPages}</div>
                <button
                  disabled={search.page >= totalPages}
                  onClick={() => navigate({ search: (s) => ({ ...s, page: s.page + 1 }) })}
                  className="h-9 px-4 rounded-md border border-input disabled:opacity-50 hover:bg-accent text-sm"
                >Вперёд</button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 rounded-lg border border-dashed border-border text-muted-foreground">
            В этой категории пока нет товаров
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

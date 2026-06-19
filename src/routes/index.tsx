import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Truck, Wrench, Phone } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { ProductCard } from "@/components/site/product-card";
import { getCategories, listProducts } from "@/lib/catalog.functions";
import { getPageSeo } from "@/lib/seo.functions";
import { SITE } from "@/lib/site-config";
import { RouteErrorFallback, RouteNotFoundFallback } from "@/components/site/route-fallbacks";

const featuredOpts = queryOptions({
  queryKey: ["featured-products"],
  queryFn: () => listProducts({ data: { page: 1, pageSize: 8, sort: "new" } }),
});
const categoriesOpts = queryOptions({
  queryKey: ["categories"],
  queryFn: () => getCategories(),
});
const pageSeoOpts = queryOptions({
  queryKey: ["page-seo", "/"],
  queryFn: () => getPageSeo({ data: { path: "/" } }),
});

export const Route = createFileRoute("/")({
  head: ({ loaderData }) => {
    const seo = (loaderData as { seo?: { title: string | null; description: string | null } | null } | undefined)?.seo;
    const title = seo?.title?.trim() || "Автоключ — автотовары в Смоленске";
    const description = seo?.description?.trim() || "Каталог автотоваров: запчасти, аксессуары, автокомпоненты. Магазин в Смоленске на Шевченко 86Б.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
      links: [{ rel: "canonical", href: "/" }],
    };
  },
  loader: async ({ context }) => {
    const [_, __, seo] = await Promise.all([
      context.queryClient.ensureQueryData(featuredOpts),
      context.queryClient.ensureQueryData(categoriesOpts),
      context.queryClient.ensureQueryData(pageSeoOpts),
    ]);
    return { seo };
  },
  component: Home,
  errorComponent: RouteErrorFallback,
  notFoundComponent: RouteNotFoundFallback,
});

function Home() {
  const { data: featured } = useSuspenseQuery(featuredOpts);
  const { data: categories } = useSuspenseQuery(categoriesOpts);
  const topCats = categories.filter((c) => !c.parent_yml_id).slice(0, 8);

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(800px 400px at 80% -10%, oklch(0.52 0.18 255) 0%, transparent 60%), radial-gradient(600px 300px at 10% 110%, oklch(0.48 0.17 257) 0%, transparent 60%)",
          }}
        />
        <div className="container relative mx-auto px-4 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Магазин в Смоленске
            </div>
            <h1 className="text-4xl lg:text-6xl font-extrabold leading-[1.05] mb-5">
              Автоинструмент и оборудование для автосервиса — <span className="text-brand">в Смоленске</span>
            </h1>
            <p className="text-base lg:text-lg opacity-80 mb-8 max-w-xl">
              Запчасти, расходники, аксессуары и автокомпоненты. Более 3000 позиций в каталоге, самовывоз с {SITE.address}.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/catalog" className="btn-brand h-12 px-6 rounded-md font-semibold inline-flex items-center gap-2">
                Открыть каталог <ArrowRight className="h-4 w-4" />
              </Link>
              <a href={SITE.phoneHref} target="_top" rel="noopener" className="h-12 px-6 rounded-md border border-white/20 bg-white/5 hover:bg-white/10 font-medium inline-flex items-center gap-2">
                <Phone className="h-4 w-4" /> {SITE.phone}
              </a>
            </div>
          </div>
          <div className="hidden lg:grid grid-cols-2 gap-3">
            {[
              { icon: ShieldCheck, t: "Качество", d: "Только проверенные поставщики" },
              { icon: Truck, t: "Доставка", d: "По Смоленску и области" },
              { icon: Wrench, t: "Подбор", d: "Поможем найти нужную деталь" },
              { icon: Phone, t: "Связь", d: "Звоните в рабочие часы" },
            ].map((f) => (
              <div key={f.t} className="rounded-lg border border-white/10 bg-white/5 p-5">
                <f.icon className="h-6 w-6 text-brand mb-2" />
                <div className="font-semibold">{f.t}</div>
                <div className="text-sm opacity-70">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      {topCats.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold">Категории</h2>
            <Link to="/catalog" className="text-sm text-brand hover:underline inline-flex items-center gap-1">
              Все категории <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {topCats.map((c) => (
              <Link
                key={c.id}
                to="/catalog/$slug"
                params={{ slug: c.slug }}
                className="group rounded-lg border border-border bg-card p-5 hover:border-brand hover:shadow-md transition-all"
              >
                <div className="font-semibold text-foreground group-hover:text-brand">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                  Перейти <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FEATURED */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl lg:text-3xl font-bold">Новинки каталога</h2>
          <Link to="/catalog" className="text-sm text-brand hover:underline inline-flex items-center gap-1">
            В каталог <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {featured.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            Каталог пуст. Администратор может загрузить YML-файл в админ-панели.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.items.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

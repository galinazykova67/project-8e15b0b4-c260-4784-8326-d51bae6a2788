import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Phone, Clock, Mail } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { SITE } from "@/lib/site-config";
import { getPageSeo } from "@/lib/seo.functions";
import { RouteErrorFallback, RouteNotFoundFallback } from "@/components/site/route-fallbacks";

export const Route = createFileRoute("/contacts")({
  loader: async ({ context }) => {
    const seo = await context.queryClient.ensureQueryData({
      queryKey: ["page-seo", "/contacts"],
      queryFn: () => getPageSeo({ data: { path: "/contacts" } }),
    });
    return { seo };
  },
  head: ({ loaderData }) => {
    const seo = (loaderData as { seo?: { title: string | null; description: string | null } | null } | undefined)?.seo;
    const title = seo?.title?.trim() || "Контакты — Автоключ";
    const description = seo?.description?.trim() || `Магазин автотоваров Автоключ. ${SITE.address}. Телефон: ${SITE.phone}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
      links: [{ rel: "canonical", href: "/contacts" }],
    };
  },
  component: ContactsPage,
  errorComponent: RouteErrorFallback,
  notFoundComponent: RouteNotFoundFallback,
});

function ContactsPage() {
  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Контакты</h1>
        <p className="text-muted-foreground mb-8">Приезжайте к нам в магазин или позвоните для подбора автотоваров</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <MapPin className="h-6 w-6 text-brand mb-3" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Адрес</div>
            <div className="font-semibold">{SITE.address}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <Phone className="h-6 w-6 text-brand mb-3" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Телефон</div>
            <a href={SITE.phoneHref} className="font-semibold hover:text-brand">{SITE.phone}</a>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <Mail className="h-6 w-6 text-brand mb-3" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Email</div>
            <a href={SITE.emailHref} className="font-semibold hover:text-brand">{SITE.email}</a>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <Clock className="h-6 w-6 text-brand mb-3" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Режим работы</div>
            <div className="font-semibold">Пн–Пт: 9:00–19:00</div>
            <div className="font-semibold">Сб–Вс: 10:00–17:00</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 sm:col-span-2 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Мы в соцсетях</div>
              <div className="font-semibold">Группа ВКонтакте</div>
            </div>
            <a
              href={SITE.vk}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-brand text-brand-foreground font-semibold hover:opacity-90"
            >
              Открыть vk.ru/avtom67
            </a>
          </div>
        </div>

        <div className="mt-8 rounded-lg overflow-hidden border border-border">
          <iframe
            title="Карта"
            src="https://yandex.ru/map-widget/v1/?text=Смоленск, ул. Шевченко 86Б&z=16"
            width="100%"
            height="400"
            frameBorder={0}
            className="block w-full"
          />
        </div>
      </div>
    </SiteLayout>
  );
}

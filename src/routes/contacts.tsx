import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Phone, Clock } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { SITE } from "@/lib/site-config";

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [
      { title: "Контакты — Автоключ" },
      { name: "description", content: `Магазин автотоваров Автоключ. ${SITE.address}. Телефон: ${SITE.phone}.` },
      { property: "og:title", content: "Контакты — Автоключ" },
      { property: "og:description", content: `${SITE.address}. ${SITE.phone}.` },
    ],
    links: [{ rel: "canonical", href: "/contacts" }],
  }),
  component: ContactsPage,
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
          <div className="rounded-lg border border-border bg-card p-6 sm:col-span-2">
            <Clock className="h-6 w-6 text-brand mb-3" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Режим работы</div>
            <div className="font-semibold">Пн–Пт: 9:00–19:00</div>
            <div className="font-semibold">Сб–Вс: 10:00–17:00</div>
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

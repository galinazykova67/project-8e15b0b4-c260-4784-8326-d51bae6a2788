import { MapPin, Phone, Clock } from "lucide-react";
import { SITE } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-md bg-brand text-brand-foreground grid place-items-center font-bold">А</div>
            <div className="font-bold text-lg">{SITE.name}</div>
          </div>
          <p className="text-sm opacity-80">{SITE.tagline}</p>
        </div>
        <div className="space-y-2 text-sm">
          <h3 className="font-semibold uppercase text-xs tracking-wider opacity-70 mb-3">Контакты</h3>
          <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /> {SITE.address}</div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> <a href={SITE.phoneHref} className="hover:underline">{SITE.phone}</a></div>
        </div>
        <div className="space-y-2 text-sm">
          <h3 className="font-semibold uppercase text-xs tracking-wider opacity-70 mb-3">Режим работы</h3>
          <div className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5 shrink-0" /> <div>Пн–Пт: 9:00–19:00<br/>Сб–Вс: 10:00–17:00</div></div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4 text-xs opacity-70">
          © {new Date().getFullYear()} {SITE.name}. Все права защищены.
        </div>
      </div>
    </footer>
  );
}

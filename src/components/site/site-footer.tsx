import { MapPin, Phone, Clock, Mail } from "lucide-react";
import { SITE } from "@/lib/site-config";

function VkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.162 18.994c.494 0 .701-.337.696-.752-.026-1.564.59-2.404 1.673-1.32 1.196 1.197 1.444 2.072 2.882 2.072h2.551c.71 0 1.04-.225 1.04-.586 0-.764-1.265-2.116-2.346-3.122-1.515-1.41-1.583-1.45-.266-3.125 1.575-2.005 3.66-4.708 1.948-4.708h-2.927c-.717 0-.767.298-1.066.952-1.084 2.355-2.985 5.31-3.711 4.81-.76-.523-.413-2.682-.355-6.187.015-.913.012-1.544-1.395-1.879-.769-.183-1.522-.252-2.21-.252-2.749 0-4.605.797-3.7 1.224 1.586.751 1.435 4.273 1.054 5.755-.66 2.581-3.123-2.262-4.16-4.687-.246-.581-.317-.96-1.214-.96H-.0073c-.477 0-.832.137-.832.503 0 .768 3.06 7.882 6.018 11.563 2.872 3.572 5.815 3.286 7.984 3.286z" transform="translate(.832)"/>
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="font-bold text-lg mb-3">{SITE.name}</div>
          <p className="text-sm opacity-80 mb-4">{SITE.tagline}</p>
          <a
            href={SITE.vk}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 h-9 rounded-md bg-white/10 hover:bg-white/20 text-sm"
          >
            <VkIcon className="h-4 w-4" /> ВКонтакте
          </a>
        </div>
        <div className="space-y-2 text-sm">
          <h3 className="font-semibold uppercase text-xs tracking-wider opacity-70 mb-3">Контакты</h3>
          <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /> {SITE.address}</div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> <a href={SITE.phoneHref} target="_top" rel="noopener" className="hover:underline">{SITE.phone}</a></div>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> <a href={SITE.emailHref} target="_top" rel="noopener" className="hover:underline">{SITE.email}</a></div>
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

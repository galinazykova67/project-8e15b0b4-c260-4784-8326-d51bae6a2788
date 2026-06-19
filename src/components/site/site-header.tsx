import { Link } from "@tanstack/react-router";
import { ShoppingCart, MapPin, Phone, User, LogOut, Mail } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { SITE } from "@/lib/site-config";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { SearchBox } from "@/components/site/search-box";
import logoAsset from "@/assets/avtoklyuch-logo.png.asset.json";

function VkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.162 18.994c.494 0 .701-.337.696-.752-.026-1.564.59-2.404 1.673-1.32 1.196 1.197 1.444 2.072 2.882 2.072h2.551c.71 0 1.04-.225 1.04-.586 0-.764-1.265-2.116-2.346-3.122-1.515-1.41-1.583-1.45-.266-3.125 1.575-2.005 3.66-4.708 1.948-4.708h-2.927c-.717 0-.767.298-1.066.952-1.084 2.355-2.985 5.31-3.711 4.81-.76-.523-.413-2.682-.355-6.187.015-.913.012-1.544-1.395-1.879-.769-.183-1.522-.252-2.21-.252-2.749 0-4.605.797-3.7 1.224 1.586.751 1.435 4.273 1.054 5.755-.66 2.581-3.123-2.262-4.16-4.687-.246-.581-.317-.96-1.214-.96H-.0073c-.477 0-.832.137-.832.503 0 .768 3.06 7.882 6.018 11.563 2.872 3.572 5.815 3.286 7.984 3.286z" transform="translate(.832)"/>
    </svg>
  );
}

export function SiteHeader() {
  const count = useCart((s) => s.count());
  const { user, isAdmin } = useAuth();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-40">
      {/* top bar */}
      <div className="bg-primary text-primary-foreground text-xs">
        <div className="container mx-auto px-4 h-9 flex items-center justify-between gap-4">
          <div className="hidden sm:flex items-center gap-1.5 opacity-90">
            <MapPin className="h-3.5 w-3.5" /> {SITE.address}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <a href={SITE.emailHref} target="_top" rel="noopener" className="hidden sm:flex items-center gap-1.5 hover:opacity-80">
              <Mail className="h-3.5 w-3.5" /> {SITE.email}
            </a>
            <a href={SITE.phoneHref} target="_top" rel="noopener" className="flex items-center gap-1.5 font-medium hover:opacity-80">
              <Phone className="h-3.5 w-3.5" /> {SITE.phone}
            </a>
          </div>
        </div>
      </div>

      {/* main bar */}
      <div className="container mx-auto px-4 py-4 flex items-center gap-4 lg:gap-8">
        <Link to="/" className="flex items-center shrink-0" aria-label={SITE.name}>
          <img
            src={logoAsset.url}
            alt={SITE.name}
            className="h-10 sm:h-12 w-auto"
            loading="eager"
          />
        </Link>

        <SearchBox className="flex-1 max-w-2xl hidden md:block" />

        <nav className="flex items-center gap-1 sm:gap-2 ml-auto md:ml-0">
          <a
            href={SITE.phoneHref}
            className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent text-foreground"
            title={SITE.phone}
            aria-label="Позвонить"
          >
            <Phone className="h-4 w-4" />
          </a>
          <a
            href={SITE.vk}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent text-foreground"
            title="ВКонтакте"
            aria-label="Группа ВКонтакте"
          >
            <VkIcon className="h-5 w-5" />
          </a>
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 h-10 text-sm font-medium rounded-md hover:bg-accent"
            >
              Админка
            </Link>
          )}
          {user ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="inline-flex items-center gap-1.5 px-3 h-10 text-sm rounded-md hover:bg-accent"
              title="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <Link to="/auth" className="inline-flex items-center gap-1.5 px-3 h-10 text-sm rounded-md hover:bg-accent">
              <User className="h-4 w-4" />
            <span className="hidden sm:inline">Войти</span>
            </Link>
          )}
          <Link
            to="/cart"
            className="relative inline-flex items-center gap-1.5 sm:gap-2 btn-brand h-10 px-2.5 sm:px-4 rounded-md text-sm font-medium shrink-0"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Корзина</span>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 sm:-right-1.5 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-foreground text-background text-[10px] font-bold">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {/* mobile search */}
      <div className="md:hidden border-t border-border px-4 py-3">
        <SearchBox />
      </div>

      {/* secondary nav */}
      <div className="border-t border-border bg-surface">
        <div className="container mx-auto px-4 h-11 flex items-center gap-1 overflow-x-auto text-sm">
          <Link to="/" className="px-3 py-2 rounded hover:bg-accent" activeOptions={{ exact: true }}>Главная</Link>
          <Link to="/catalog" className="px-3 py-2 rounded hover:bg-accent">Каталог</Link>
          <Link to="/contacts" className="px-3 py-2 rounded hover:bg-accent">Контакты</Link>
        </div>
      </div>
    </header>
  );
}

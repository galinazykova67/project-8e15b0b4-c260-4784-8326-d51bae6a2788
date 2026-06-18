import { Link } from "@tanstack/react-router";
import { ShoppingCart, MapPin, Phone, User, LogOut } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { SITE } from "@/lib/site-config";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { SearchBox } from "@/components/site/search-box";

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
          <a href={SITE.phoneHref} className="flex items-center gap-1.5 font-medium hover:opacity-80">
            <Phone className="h-3.5 w-3.5" /> {SITE.phone}
          </a>
        </div>
      </div>

      {/* main bar */}
      <div className="container mx-auto px-4 py-4 flex items-center gap-4 lg:gap-8">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-10 w-10 rounded-md bg-brand text-brand-foreground grid place-items-center font-bold text-lg">А</div>
          <div className="leading-tight">
            <div className="font-bold text-lg text-foreground">{SITE.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Автотовары</div>
          </div>
        </Link>

        <SearchBox className="flex-1 max-w-2xl hidden md:block" />

        <nav className="flex items-center gap-1 sm:gap-2 ml-auto md:ml-0">
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
            className="relative inline-flex items-center gap-2 btn-brand h-10 px-4 rounded-md text-sm font-medium"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Корзина</span>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-foreground text-background text-[10px] font-bold">
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

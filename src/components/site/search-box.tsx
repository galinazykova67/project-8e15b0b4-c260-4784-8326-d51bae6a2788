import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { listProducts } from "@/lib/catalog.functions";
import { formatPrice } from "@/lib/cart-store";

export function SearchBox({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["search-suggest", debounced],
    queryFn: () => listProducts({ data: { search: debounced, page: 1, pageSize: 8, sort: "new" } }),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    setOpen(false);
    navigate({ to: "/catalog", search: term ? { q: term, page: 1, sort: "new" } : { page: 1, sort: "new" } });
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form onSubmit={submit}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Поиск по названию, артикулу..."
          className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>

      {open && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-[70vh] overflow-auto">
          {isFetching && !data ? (
            <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Поиск...
            </div>
          ) : data && data.items.length > 0 ? (
            <>
              <ul className="py-1">
                {data.items.map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/product/$slug"
                      params={{ slug: p.slug }}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-accent"
                    >
                      <div className="h-10 w-10 rounded bg-surface overflow-hidden shrink-0 grid place-items-center">
                        {p.pictures?.[0] ? (
                          <img src={p.pictures[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <Search className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.vendor_code ? `Артикул: ${p.vendor_code}` : p.vendor}
                        </div>
                      </div>
                      <div className="text-sm font-semibold whitespace-nowrap">{formatPrice(Number(p.price))}</div>
                    </Link>
                  </li>
                ))}
              </ul>
              {data.total > data.items.length && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={submit}
                  className="block w-full text-center py-2.5 text-sm font-medium text-brand border-t border-border hover:bg-accent"
                >
                  Все результаты ({data.total})
                </button>
              )}
            </>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">Ничего не найдено</div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Save, Search, FolderTree, Package, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  adminListSeoCategories,
  adminUpdateCategorySeo,
  adminListSeoProducts,
  adminUpdateProductSeo,
  adminListPageSeo,
  adminUpsertPageSeo,
  adminGenerateSeo,
} from "@/lib/seo.functions";

type Sub = "categories" | "products" | "pages";

export function SeoTab() {
  const [sub, setSub] = useState<Sub>("categories");
  return (
    <div>
      <div className="flex gap-2 mb-5 flex-wrap">
        <SubBtn active={sub === "categories"} onClick={() => setSub("categories")} icon={<FolderTree className="h-4 w-4" />}>
          Категории
        </SubBtn>
        <SubBtn active={sub === "products"} onClick={() => setSub("products")} icon={<Package className="h-4 w-4" />}>
          Товары
        </SubBtn>
        <SubBtn active={sub === "pages"} onClick={() => setSub("pages")} icon={<FileText className="h-4 w-4" />}>
          Страницы
        </SubBtn>
      </div>
      {sub === "categories" && <CategoriesSeo />}
      {sub === "products" && <ProductsSeo />}
      {sub === "pages" && <PagesSeo />}
    </div>
  );
}

function SubBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border ${
        active ? "border-brand bg-brand/10 text-brand" : "border-border hover:bg-accent"
      }`}
    >
      {icon} {children}
    </button>
  );
}

// ------- SeoEditor -------
function SeoEditor({
  title,
  description,
  onSave,
  onGenerate,
  saving,
  generating,
  compact = false,
}: {
  title: string | null;
  description: string | null;
  onSave: (t: string | null, d: string | null) => void;
  onGenerate: () => Promise<{ title: string; description: string } | null>;
  saving: boolean;
  generating: boolean;
  compact?: boolean;
}) {
  const [t, setT] = useState(title ?? "");
  const [d, setD] = useState(description ?? "");

  const doGenerate = async () => {
    const r = await onGenerate();
    if (r) {
      setT(r.title);
      setD(r.description);
    }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Title</label>
          <span className={`text-xs ${t.length > 60 ? "text-destructive" : "text-muted-foreground"}`}>{t.length}/60</span>
        </div>
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          placeholder="SEO заголовок страницы"
          className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
          <span className={`text-xs ${d.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>{d.length}/160</span>
        </div>
        <textarea
          value={d}
          onChange={(e) => setD(e.target.value)}
          placeholder="SEO описание для поисковиков"
          rows={2}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-y"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={doGenerate}
          disabled={generating || saving}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-brand text-brand text-sm font-medium hover:bg-brand/10 disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Сгенерировать ИИ
        </button>
        <button
          onClick={() => onSave(t.trim() || null, d.trim() || null)}
          disabled={saving || generating}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-md btn-brand text-sm font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Сохранить
        </button>
      </div>
    </div>
  );
}

// ------- Categories -------
function CategoriesSeo() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["seo-categories"], queryFn: () => adminListSeoCategories() });

  const saveMut = useMutation({
    mutationFn: (v: { id: string; seo_title: string | null; seo_description: string | null }) =>
      adminUpdateCategorySeo({ data: v }),
    onSuccess: () => {
      toast.success("SEO сохранено");
      qc.invalidateQueries({ queryKey: ["seo-categories"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const genMut = useMutation({
    mutationFn: (id: string) => adminGenerateSeo({ data: { kind: "category", id } }),
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <div className="text-muted-foreground">Загрузка...</div>;
  const items = (data ?? []).filter((c) => !filter || c.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <div className="mb-4 relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Поиск категорий..."
          className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm"
        />
      </div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {items.slice(0, 200).map((c) => {
          const isOpen = openId === c.id;
          const hasSeo = c.seo_title || c.seo_description;
          return (
            <div key={c.id}>
              <button
                onClick={() => setOpenId(isOpen ? null : c.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 text-left"
              >
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${hasSeo ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {hasSeo ? "SEO задан" : "Нет SEO"}
                </span>
                <span className="text-xs text-muted-foreground font-mono hidden sm:inline">/{c.slug}</span>
              </button>
              {isOpen && (
                <div className="px-4 py-4 bg-muted/30">
                  <SeoEditor
                    title={c.seo_title}
                    description={c.seo_description}
                    saving={saveMut.isPending}
                    generating={genMut.isPending}
                    onSave={(t, d) => saveMut.mutate({ id: c.id, seo_title: t, seo_description: d })}
                    onGenerate={async () => {
                      try { return await genMut.mutateAsync(c.id); } catch { return null; }
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
        {items.length > 200 && (
          <div className="px-4 py-3 text-xs text-muted-foreground">Показаны первые 200. Уточните поиск.</div>
        )}
      </div>
    </div>
  );
}

// ------- Products -------
function ProductsSeo() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["seo-products", searchQ, page, onlyMissing],
    queryFn: () => adminListSeoProducts({ data: { search: searchQ, page, pageSize, onlyMissing } }),
  });

  const saveMut = useMutation({
    mutationFn: (v: { id: string; seo_title: string | null; seo_description: string | null }) =>
      adminUpdateProductSeo({ data: v }),
    onSuccess: () => {
      toast.success("SEO сохранено");
      qc.invalidateQueries({ queryKey: ["seo-products"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const genMut = useMutation({
    mutationFn: (id: string) => adminGenerateSeo({ data: { kind: "product", id } }),
    onError: (e) => toast.error((e as Error).message),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div>
      <form
        onSubmit={(e) => { e.preventDefault(); setPage(1); setSearchQ(search); }}
        className="mb-4 flex flex-wrap gap-2 items-center"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или артикулу..."
            className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => { setOnlyMissing(e.target.checked); setPage(1); }}
          />
          Только без SEO
        </label>
        <button type="submit" className="h-10 px-4 rounded-md btn-brand text-sm font-medium">Найти</button>
      </form>

      {isLoading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {(data?.items ?? []).length === 0 && (
              <div className="p-8 text-center text-muted-foreground">Товары не найдены</div>
            )}
            {(data?.items ?? []).map((p) => {
              const isOpen = openId === p.id;
              const hasSeo = p.seo_title || p.seo_description;
              return (
                <div key={p.id}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.vendor ?? ""} {p.vendor_code ? `· арт. ${p.vendor_code}` : ""}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${hasSeo ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {hasSeo ? "SEO задан" : "Нет SEO"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 py-4 bg-muted/30">
                      <SeoEditor
                        title={p.seo_title}
                        description={p.seo_description}
                        saving={saveMut.isPending}
                        generating={genMut.isPending}
                        onSave={(t, d) => saveMut.mutate({ id: p.id, seo_title: t, seo_description: d })}
                        onGenerate={async () => {
                          try { return await genMut.mutateAsync(p.id); } catch { return null; }
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <div>Всего: {data?.total ?? 0}</div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-9 w-9 rounded-md border border-border grid place-items-center disabled:opacity-40"
              ><ChevronLeft className="h-4 w-4" /></button>
              <span>{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 w-9 rounded-md border border-border grid place-items-center disabled:opacity-40"
              ><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ------- Pages -------
const PAGE_LABELS: Record<string, string> = {
  "/": "Главная",
  "/catalog": "Каталог",
  "/cart": "Корзина",
  "/contacts": "Контакты",
};

function PagesSeo() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["seo-pages"], queryFn: () => adminListPageSeo() });

  const saveMut = useMutation({
    mutationFn: (v: { path: string; title: string | null; description: string | null }) =>
      adminUpsertPageSeo({ data: v }),
    onSuccess: () => {
      toast.success("SEO сохранено");
      qc.invalidateQueries({ queryKey: ["seo-pages"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const genMut = useMutation({
    mutationFn: (path: string) => adminGenerateSeo({ data: { kind: "page", path } }),
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <div className="text-muted-foreground">Загрузка...</div>;

  return (
    <div className="space-y-4">
      {(data ?? []).map((p) => (
        <div key={p.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold">{PAGE_LABELS[p.path] ?? p.path}</div>
              <div className="text-xs text-muted-foreground font-mono">{p.path}</div>
            </div>
          </div>
          <SeoEditor
            title={p.title}
            description={p.description}
            saving={saveMut.isPending}
            generating={genMut.isPending}
            onSave={(t, d) => saveMut.mutate({ path: p.path, title: t, description: d })}
            onGenerate={async () => {
              try { return await genMut.mutateAsync(p.path); } catch { return null; }
            }}
          />
        </div>
      ))}
    </div>
  );
}

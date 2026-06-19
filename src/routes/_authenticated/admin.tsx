import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Loader2, Package, ShoppingBag, FolderTree, Search } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { CategoriesTab } from "@/components/admin/categories-tab";
import { SeoTab } from "@/components/admin/seo-tab";
import { importYmlCatalog } from "@/lib/catalog.functions";
import { listOrders, getOrderItems, updateOrderStatus } from "@/lib/orders.functions";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/cart-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Админ-панель — Автоключ" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [tab, setTab] = useState<"import" | "categories" | "orders">("import");

  if (authLoading) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Загрузка...</div>
      </SiteLayout>
    );
  }

  if (!isAdmin) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-20 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-3">Доступ ограничен</h1>
          <p className="text-muted-foreground">
            Вы вошли как <span className="font-mono">{user?.email}</span>, но у этого аккаунта нет роли администратора.
            Войдите с email <span className="font-mono">galinaarsenina@gmail.com</span> — роль admin будет выдана автоматически при регистрации.
          </p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Админ-панель</h1>
        <div className="flex gap-2 border-b border-border mb-6 flex-wrap">
          <button
            onClick={() => setTab("import")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === "import" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Upload className="h-4 w-4 inline mr-2" /> Импорт каталога
          </button>
          <button
            onClick={() => setTab("categories")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === "categories" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <FolderTree className="h-4 w-4 inline mr-2" /> Категории
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === "orders" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <ShoppingBag className="h-4 w-4 inline mr-2" /> Заказы
          </button>
        </div>

        {tab === "import" ? <ImportTab /> : tab === "categories" ? <CategoriesTab /> : <OrdersTab />}
      </div>
    </SiteLayout>
  );
}

function ImportTab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ categories: number; products: number } | null>(null);
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: async (xml: string) => importYmlCatalog({ data: { xml } }),
    onSuccess: (r) => {
      setResult(r);
      toast.success(`Импортировано: ${r.products} товаров, ${r.categories} категорий`);
      qc.invalidateQueries();
    },
    onError: (err) => toast.error("Ошибка импорта", { description: (err as Error).message }),
  });

  const onUpload = async () => {
    if (!file) return;
    const text = await file.text();
    mut.mutate(text);
  };

  return (
    <div className="max-w-2xl">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Загрузка YML-файла</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Формат Яндекс.Маркет (YML). Загрузка обновит существующие товары по ID и добавит новые. Поддерживается более 3000 позиций.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="block">
            <input
              ref={inputRef}
              type="file"
              accept=".xml,.yml,text/xml,application/xml"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
              className="hidden"
            />
            <div
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-brand transition-colors"
            >
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              {file ? (
                <div>
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} КБ</div>
                </div>
              ) : (
                <>
                  <div className="font-medium">Выберите YML/XML файл</div>
                  <div className="text-xs text-muted-foreground mt-1">или перетащите сюда</div>
                </>
              )}
            </div>
          </label>

          <button
            onClick={onUpload}
            disabled={!file || mut.isPending}
            className="mt-4 w-full h-11 rounded-md btn-brand font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {mut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Импортируем...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Загрузить
              </>
            )}
          </button>

          {result && (
            <div className="mt-4 p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
              <div className="font-semibold mb-1">Импорт завершён</div>
              Категорий: {result.categories}<br />
              Товаров: {result.products}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  new: "Новый",
  processing: "В работе",
  completed: "Выполнен",
  cancelled: "Отменён",
};

function OrdersTab() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => listOrders(),
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const qc = useQueryClient();

  const statusMut = useMutation({
    mutationFn: (v: { orderId: string; status: "new" | "processing" | "completed" | "cancelled" }) =>
      updateOrderStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Статус обновлён");
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Загрузка...</div>;

  if (!orders || orders.length === 0) {
    return <div className="text-center py-20 text-muted-foreground rounded-lg border border-dashed border-border">Пока нет заказов</div>;
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="rounded-lg border border-border bg-card">
          <div className="p-4 flex flex-wrap items-center gap-4">
            <div className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</div>
            <div className="flex-1 min-w-[200px]">
              <div className="font-semibold">{o.customer_name}</div>
              <div className="text-sm text-muted-foreground">{o.customer_phone}{o.customer_email && ` · ${o.customer_email}`}</div>
            </div>
            <div className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString("ru-RU")}</div>
            <div className="font-bold">{formatPrice(Number(o.total))}</div>
            <select
              value={o.status}
              onChange={(e) => statusMut.mutate({ orderId: o.id, status: e.target.value as "new" | "processing" | "completed" | "cancelled" })}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={() => setOpenId(openId === o.id ? null : o.id)} className="text-sm text-brand hover:underline">
              {openId === o.id ? "Скрыть" : "Состав"}
            </button>
          </div>
          {openId === o.id && <OrderItems orderId={o.id} comment={o.comment} />}
        </div>
      ))}
    </div>
  );
}

function OrderItems({ orderId, comment }: { orderId: string; comment: string | null }) {
  const { data: items, isLoading } = useQuery({
    queryKey: ["order-items", orderId],
    queryFn: () => getOrderItems({ data: { orderId } }),
  });
  if (isLoading) return <div className="p-4 border-t border-border text-sm text-muted-foreground">Загрузка...</div>;
  return (
    <div className="border-t border-border p-4 bg-surface">
      {comment && (
        <div className="mb-3 text-sm">
          <span className="text-muted-foreground">Комментарий: </span>{comment}
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr><th className="text-left py-1">Товар</th><th className="text-left">Артикул</th><th className="text-right">Цена</th><th className="text-right">Кол-во</th><th className="text-right">Сумма</th></tr>
        </thead>
        <tbody>
          {items?.map((it) => (
            <tr key={it.id} className="border-t border-border">
              <td className="py-2">{it.product_name}</td>
              <td className="font-mono text-xs text-muted-foreground">{it.vendor_code ?? "—"}</td>
              <td className="text-right">{formatPrice(Number(it.price))}</td>
              <td className="text-right">{it.quantity}</td>
              <td className="text-right font-semibold">{formatPrice(Number(it.price) * it.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

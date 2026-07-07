import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Percent, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  adminListCustomers,
  adminListVendors,
  adminUpsertDiscount,
  adminDeleteDiscount,
} from "@/lib/discounts.functions";

export function DiscountsTab() {
  const qc = useQueryClient();
  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => adminListCustomers(),
  });
  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: () => adminListVendors(),
  });

  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const upsertMut = useMutation({
    mutationFn: (v: { user_id: string; vendor: string; percent: number }) =>
      adminUpsertDiscount({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("Скидка сохранена");
    },
    onError: (e) => toast.error("Ошибка", { description: (e as Error).message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteDiscount({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("Скидка удалена");
    },
  });

  const filtered = useMemo(() => {
    const list = customers ?? [];
    if (!q.trim()) return list;
    const term = q.trim().toLowerCase();
    return list.filter((c) => c.email.toLowerCase().includes(term));
  }, [customers, q]);

  if (isLoading) return <div className="text-muted-foreground">Загрузка клиентов...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по email"
            className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <div className="text-sm text-muted-foreground">{filtered.length} клиентов</div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground rounded-lg border border-dashed border-border">
          Клиенты не найдены
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-card">
              <button
                onClick={() => setOpenId(openId === c.id ? null : c.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-accent/50"
              >
                <div className="h-10 w-10 rounded-full bg-brand/10 text-brand grid place-items-center shrink-0">
                  <Percent className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.email || "(без email)"}</div>
                  <div className="text-xs text-muted-foreground">
                    Зарегистрирован: {new Date(c.created_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {c.discounts.length > 0
                    ? `${c.discounts.length} скидок`
                    : "Нет скидок"}
                </div>
              </button>

              {openId === c.id && (
                <div className="border-t border-border p-4 space-y-3">
                  {c.discounts.length > 0 && (
                    <div className="space-y-2">
                      {c.discounts.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 p-2 rounded border border-border bg-background"
                        >
                          <div className="flex-1 font-medium">{d.vendor}</div>
                          <div className="font-bold text-brand">−{d.percent}%</div>
                          <button
                            onClick={() => deleteMut.mutate(d.id)}
                            disabled={deleteMut.isPending}
                            className="p-2 text-muted-foreground hover:text-destructive"
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <AddDiscountForm
                    userId={c.id}
                    vendors={vendors ?? []}
                    existing={c.discounts.map((d) => d.vendor)}
                    onAdd={(vendor, percent) =>
                      upsertMut.mutate({ user_id: c.id, vendor, percent })
                    }
                    pending={upsertMut.isPending}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddDiscountForm({
  userId: _userId,
  vendors,
  existing,
  onAdd,
  pending,
}: {
  userId: string;
  vendors: string[];
  existing: string[];
  onAdd: (vendor: string, percent: number) => void;
  pending: boolean;
}) {
  const [vendor, setVendor] = useState("");
  const [customVendor, setCustomVendor] = useState("");
  const [percent, setPercent] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = (useCustom ? customVendor : vendor).trim();
    const p = Number(percent);
    if (!v) return toast.error("Выберите или укажите бренд");
    if (isNaN(p) || p < 0 || p > 100) return toast.error("Процент от 0 до 100");
    onAdd(v, p);
    setVendor("");
    setCustomVendor("");
    setPercent("");
  };

  const availableVendors = vendors.filter((v) => !existing.includes(v));

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[200px]">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">
          Бренд
        </label>
        {useCustom ? (
          <input
            value={customVendor}
            onChange={(e) => setCustomVendor(e.target.value)}
            placeholder="Название бренда"
            className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          />
        ) : (
          <select
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">— выберите —</option>
            {availableVendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setUseCustom(!useCustom)}
          className="mt-1 text-xs text-brand hover:underline"
        >
          {useCustom ? "выбрать из списка" : "указать вручную"}
        </button>
      </div>
      <div className="w-32">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">
          Скидка, %
        </label>
        <input
          type="number"
          step="0.1"
          min={0}
          max={100}
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-10 px-4 rounded-md btn-brand text-sm font-medium inline-flex items-center gap-1 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Добавить
      </button>
    </form>
  );
}

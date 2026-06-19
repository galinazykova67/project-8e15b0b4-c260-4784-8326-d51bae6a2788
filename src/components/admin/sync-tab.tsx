import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { adminListSyncRuns, adminTriggerJtcSync } from "@/lib/catalog.functions";

type SyncRun = {
  id: string;
  source: string;
  status: "running" | "success" | "error";
  categories_count: number | null;
  products_count: number | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
};

function StatusBadge({ status }: { status: SyncRun["status"] }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="h-3 w-3" /> Успех
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
        <XCircle className="h-3 w-3" /> Ошибка
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
      <Clock className="h-3 w-3" /> Выполняется
    </span>
  );
}

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} мс`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s} с`;
  const m = Math.floor(s / 60);
  return `${m} мин ${Math.round(s % 60)} с`;
}

export function SyncTab() {
  const qc = useQueryClient();
  const { data: runs, isLoading, refetch } = useQuery({
    queryKey: ["admin-sync-runs"],
    queryFn: () => adminListSyncRuns() as Promise<SyncRun[]>,
    refetchInterval: 5000,
  });

  const trigger = useMutation({
    mutationFn: () => adminTriggerJtcSync(),
    onSuccess: (r) => {
      toast.success(`Синхронизация JTC завершена`, {
        description: `Категорий: ${r.categories}, товаров: ${r.products}`,
      });
      qc.invalidateQueries({ queryKey: ["admin-sync-runs"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e) => toast.error("Ошибка синхронизации", { description: (e as Error).message }),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-semibold">Каталог JTC</div>
          <div className="text-sm text-muted-foreground">
            Автоматическая синхронизация ежедневно в 07:00 по МСК. Можно запустить вручную.
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="h-10 px-4 rounded-md border border-input hover:bg-accent text-sm inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Обновить
          </button>
          <button
            onClick={() => trigger.mutate()}
            disabled={trigger.isPending}
            className="h-10 px-4 rounded-md btn-brand font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            {trigger.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Синхронизируем...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" /> Запустить сейчас
              </>
            )}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border font-semibold">Журнал синхронизаций</div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : !runs || runs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Пока нет ни одного запуска</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-surface">
                <tr>
                  <th className="text-left px-4 py-2">Когда</th>
                  <th className="text-left px-4 py-2">Источник</th>
                  <th className="text-left px-4 py-2">Статус</th>
                  <th className="text-right px-4 py-2">Категории</th>
                  <th className="text-right px-4 py-2">Товары</th>
                  <th className="text-right px-4 py-2">Длительность</th>
                  <th className="text-left px-4 py-2">Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(r.started_at).toLocaleString("ru-RU")}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.source}</td>
                    <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2 text-right">{r.categories_count ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{r.products_count ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{formatDuration(r.duration_ms)}</td>
                    <td className="px-4 py-2 text-xs text-red-700 max-w-md truncate" title={r.error ?? ""}>
                      {r.error ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

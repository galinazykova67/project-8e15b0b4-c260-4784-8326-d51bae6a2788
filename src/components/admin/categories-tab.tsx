import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, Eye, EyeOff, Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminListCategories,
  adminCategoryToggleVisible,
  adminCategoryUpsert,
  adminCategoryDelete,
} from "@/lib/catalog.functions";

type Cat = {
  id: string;
  yml_id: string;
  parent_yml_id: string | null;
  name: string;
  slug: string;
  visible: boolean;
  sort_order: number;
};

type EditState =
  | null
  | { mode: "create"; parent_yml_id: string | null }
  | { mode: "edit"; cat: Cat };

export function CategoriesTab() {
  const qc = useQueryClient();
  const { data: cats, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => adminListCategories(),
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<EditState>(null);
  const [filter, setFilter] = useState("");

  const tree = useMemo(() => {
    const list = (cats ?? []) as Cat[];
    const byParent = new Map<string, Cat[]>();
    for (const c of list) {
      const k = c.parent_yml_id ?? "";
      if (!byParent.has(k)) byParent.set(k, []);
      byParent.get(k)!.push(c);
    }
    for (const arr of byParent.values()) {
      arr.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    }
    return byParent;
  }, [cats]);

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; visible: boolean }) => adminCategoryToggleVisible({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => adminCategoryDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("Категория удалена");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const upsertMut = useMutation({
    mutationFn: (v: { id?: string; name: string; parent_yml_id: string | null; sort_order: number; visible: boolean }) =>
      adminCategoryUpsert({ data: v }),
    onSuccess: () => {
      toast.success("Сохранено");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleExpand = (id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) return <div className="text-muted-foreground">Загрузка...</div>;

  const filterLower = filter.trim().toLowerCase();
  const matches = (c: Cat) => !filterLower || c.name.toLowerCase().includes(filterLower);

  const renderNode = (cat: Cat, depth: number) => {
    const children = tree.get(cat.yml_id) ?? [];
    const hasChildren = children.length > 0;
    const isOpen = expanded.has(cat.id) || (filterLower.length > 0);
    const visibleChildren = filterLower
      ? children.filter((c) => matches(c) || subtreeMatches(c))
      : children;
    if (filterLower && !matches(cat) && !subtreeMatches(cat)) return null;
    return (
      <div key={cat.id}>
        <div
          className="flex items-center gap-2 py-2 border-b border-border hover:bg-accent/50 group"
          style={{ paddingLeft: depth * 20 + 8 }}
        >
          <button
            onClick={() => hasChildren && toggleExpand(cat.id)}
            className="w-5 h-5 grid place-items-center text-muted-foreground"
          >
            {hasChildren ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : null}
          </button>
          <span className={`flex-1 text-sm ${cat.visible ? "" : "text-muted-foreground line-through"}`}>
            {cat.name}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{cat.slug}</span>
          <button
            title={cat.visible ? "Скрыть" : "Показать"}
            onClick={() => toggleMut.mutate({ id: cat.id, visible: !cat.visible })}
            className="p-1.5 rounded hover:bg-background"
          >
            {cat.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button
            title="Добавить подкатегорию"
            onClick={() => setEdit({ mode: "create", parent_yml_id: cat.yml_id })}
            className="p-1.5 rounded hover:bg-background opacity-0 group-hover:opacity-100"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            title="Редактировать"
            onClick={() => setEdit({ mode: "edit", cat })}
            className="p-1.5 rounded hover:bg-background opacity-0 group-hover:opacity-100"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            title="Удалить"
            onClick={() => {
              if (confirm(`Удалить категорию "${cat.name}"?`)) delMut.mutate(cat.id);
            }}
            className="p-1.5 rounded hover:bg-background opacity-0 group-hover:opacity-100 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {hasChildren && isOpen && visibleChildren.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  function subtreeMatches(c: Cat): boolean {
    if (matches(c)) return true;
    const ch = tree.get(c.yml_id) ?? [];
    return ch.some(subtreeMatches);
  }

  const roots = tree.get("") ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Поиск по названию..."
          className="h-10 px-3 rounded-md border border-input bg-background text-sm flex-1 min-w-[200px]"
        />
        <button
          onClick={() => setEdit({ mode: "create", parent_yml_id: null })}
          className="h-10 px-4 rounded-md btn-brand text-sm font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Новая категория
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {roots.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Категорий нет</div>
        ) : (
          roots.map((r) => renderNode(r, 0))
        )}
      </div>

      {edit && (
        <EditDialog
          state={edit}
          allCats={(cats ?? []) as Cat[]}
          onClose={() => setEdit(null)}
          onSubmit={(v) => upsertMut.mutate(v)}
          pending={upsertMut.isPending}
        />
      )}
    </div>
  );
}

function EditDialog({
  state,
  allCats,
  onClose,
  onSubmit,
  pending,
}: {
  state: NonNullable<EditState>;
  allCats: Cat[];
  onClose: () => void;
  onSubmit: (v: { id?: string; name: string; parent_yml_id: string | null; sort_order: number; visible: boolean }) => void;
  pending: boolean;
}) {
  const initial =
    state.mode === "edit"
      ? state.cat
      : { id: undefined, name: "", parent_yml_id: state.parent_yml_id, sort_order: 0, visible: true };
  const [name, setName] = useState(initial.name);
  const [parent, setParent] = useState<string>(initial.parent_yml_id ?? "");
  const [order, setOrder] = useState(initial.sort_order);
  const [visible, setVisible] = useState(initial.visible);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">
            {state.mode === "edit" ? "Редактировать категорию" : "Новая категория"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X className="h-5 w-5" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSubmit({
              id: state.mode === "edit" ? state.cat.id : undefined,
              name: name.trim(),
              parent_yml_id: parent || null,
              sort_order: Number(order) || 0,
              visible,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Название</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Родительская категория</label>
            <select
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">— Корневая —</option>
              {allCats
                .filter((c) => !(state.mode === "edit" && c.id === state.cat.id))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c.id} value={c.yml_id}>{c.name}</option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Порядок</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <label className="flex items-end gap-2 pb-2">
              <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm">Показывать на сайте</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-md border border-input text-sm">Отмена</button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="h-10 px-4 rounded-md btn-brand text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

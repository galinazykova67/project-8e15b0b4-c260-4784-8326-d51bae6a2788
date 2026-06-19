import { Link, useRouter } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/site-layout";

export function RouteErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Не удалось загрузить страницу</h1>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">{error.message || "Попробуйте обновить страницу."}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="h-10 px-5 rounded-md btn-brand font-medium"
          >
            Повторить
          </button>
          <Link to="/" className="h-10 px-5 rounded-md border border-input hover:bg-accent inline-flex items-center font-medium">
            На главную
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
}

export function RouteNotFoundFallback() {
  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Страница не найдена</h1>
        <p className="text-muted-foreground mb-6">Возможно, она была удалена или перемещена.</p>
        <Link to="/" className="h-10 px-5 rounded-md btn-brand inline-flex items-center font-medium">
          На главную
        </Link>
      </div>
    </SiteLayout>
  );
}

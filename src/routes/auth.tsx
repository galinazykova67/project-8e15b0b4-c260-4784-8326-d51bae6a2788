import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteLayout } from "@/components/site/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Вход — Автоключ" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Аккаунт создан");
        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-2xl font-bold mb-1">{mode === "login" ? "Вход" : "Регистрация"}</h1>
          <p className="text-sm text-muted-foreground mb-6">Доступ к админ-панели магазина</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Пароль</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
            </div>
            <button disabled={loading} className="w-full h-11 rounded-md btn-brand font-semibold disabled:opacity-50">
              {loading ? "..." : mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="mt-4 text-sm text-brand hover:underline">
            {mode === "login" ? "Создать аккаунт" : "У меня уже есть аккаунт"}
          </button>
        </div>
      </div>
    </SiteLayout>
  );
}

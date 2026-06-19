import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setIsAdmin(false);
      setRoleLoading(false);
      return;
    }
    setRoleLoading(true);

    const check = async (attempt = 0): Promise<void> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      if (error && attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        return check(attempt + 1);
      }
      setIsAdmin(!!data);
      setRoleLoading(false);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { session, user, isAdmin, loading: loading || roleLoading };
}

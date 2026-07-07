import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getMyDiscounts } from "@/lib/discounts.functions";
import { buildDiscountMap, type DiscountMap } from "@/lib/discount-utils";

export function useMyDiscounts(): { map: DiscountMap; isLoading: boolean } {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["my-discounts", user?.id ?? "anon"],
    queryFn: () => getMyDiscounts(),
    enabled: !!user,
    staleTime: 60_000,
  });
  return { map: buildDiscountMap(q.data), isLoading: q.isLoading };
}

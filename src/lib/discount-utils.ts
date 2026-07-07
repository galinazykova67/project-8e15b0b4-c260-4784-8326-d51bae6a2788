export type DiscountMap = Record<string, number>; // vendor (lowercased) -> percent

export function buildDiscountMap(discounts: { vendor: string; percent: number }[] | undefined | null): DiscountMap {
  const m: DiscountMap = {};
  for (const d of discounts ?? []) m[d.vendor.trim().toLowerCase()] = Number(d.percent);
  return m;
}

export function discountPercentFor(vendor: string | null | undefined, map: DiscountMap): number {
  if (!vendor) return 0;
  return map[vendor.trim().toLowerCase()] ?? 0;
}

export function applyDiscount(price: number, vendor: string | null | undefined, map: DiscountMap): number {
  const p = discountPercentFor(vendor, map);
  if (!p) return price;
  return Math.round(price * (100 - p)) / 100;
}

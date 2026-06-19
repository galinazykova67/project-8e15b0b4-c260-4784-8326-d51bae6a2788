import { XMLParser } from "fast-xml-parser";

export interface YmlCategory {
  yml_id: string;
  parent_yml_id: string | null;
  name: string;
}

export interface YmlOffer {
  yml_id: string;
  category_yml_id: string | null;
  name: string;
  vendor: string | null;
  vendor_code: string | null;
  price: number;
  old_price: number | null;
  currency: string;
  description: string | null;
  pictures: string[];
  available: boolean;
  params: Record<string, string>;
}

export interface YmlParseResult {
  categories: YmlCategory[];
  offers: YmlOffer[];
}

const toArr = <T,>(v: T | T[] | undefined): T[] =>
  v == null ? [] : Array.isArray(v) ? v : [v];

const toStr = (v: unknown): string =>
  v == null ? "" : typeof v === "string" ? v : String(v);

export function parseYml(xml: string): YmlParseResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseTagValue: false,
    trimValues: true,
  });
  const data = parser.parse(xml);
  const shop = data?.yml_catalog?.shop ?? data?.shop;
  if (!shop) throw new Error("Неверный формат YML: не найден элемент <shop>");

  const rawCategories = toArr(shop?.categories?.category);
  const categories: YmlCategory[] = rawCategories.map((c: Record<string, unknown>) => ({
    yml_id: toStr(c["@_id"]),
    parent_yml_id: c["@_parentId"] ? toStr(c["@_parentId"]) : null,
    name: toStr(c["#text"] ?? c).trim() || "Без названия",
  }));

  const rawOffers = toArr(shop?.offers?.offer);
  const offers: YmlOffer[] = rawOffers.map((o: Record<string, unknown>) => {
    const params: Record<string, string> = {};
    for (const p of toArr<Record<string, unknown>>(o.param as Record<string, unknown>)) {
      const k = toStr(p["@_name"]);
      if (k) params[k] = toStr(p["#text"] ?? p);
    }
    // YML allows multiple <categoryId> per offer (broad → narrow). Pick the most specific (last).
    const catIds = toArr<unknown>(o.categoryId as unknown);
    const categoryIdLeaf = catIds.length ? toStr(catIds[catIds.length - 1]) : null;
    const priceStr = toStr(o.price);
    const oldPriceStr = toStr(o.oldprice);
    const name = toStr(o.name) || toStr(o.model) || "Товар";
    const availableAttr = o["@_available"];
    return {
      yml_id: toStr(o["@_id"]),
      category_yml_id: categoryIdLeaf,
      name,
      vendor: o.vendor ? toStr(o.vendor) : null,
      vendor_code: o.vendorCode ? toStr(o.vendorCode) : null,
      price: parseFloat(priceStr.replace(",", ".")) || 0,
      old_price: oldPriceStr ? parseFloat(oldPriceStr.replace(",", ".")) || null : null,
      currency: toStr(o.currencyId) || "RUB",
      description: o.description ? toStr(o.description) : null,
      pictures: toArr<string>(o.picture as string | string[] | undefined).map(toStr).filter(Boolean),
      available: availableAttr == null ? true : toStr(availableAttr) !== "false",
      params,
    };
  });

  return { categories, offers };
}

export function slugify(input: string, fallback = "item"): string {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };
  const s = input.toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || fallback;
}

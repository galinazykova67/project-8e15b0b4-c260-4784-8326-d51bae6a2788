
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS categories_parent_yml_id_idx ON public.categories(parent_yml_id);
CREATE INDEX IF NOT EXISTS products_category_yml_id_idx ON public.products(category_yml_id);

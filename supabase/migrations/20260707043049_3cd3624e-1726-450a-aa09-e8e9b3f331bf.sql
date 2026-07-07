
CREATE TABLE public.customer_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor text NOT NULL,
  percent numeric(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, vendor)
);

CREATE INDEX idx_customer_discounts_user ON public.customer_discounts(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_discounts TO authenticated;
GRANT ALL ON public.customer_discounts TO service_role;

ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own discounts"
  ON public.customer_discounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all discounts"
  ON public.customer_discounts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_customer_discounts_updated_at
  BEFORE UPDATE ON public.customer_discounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

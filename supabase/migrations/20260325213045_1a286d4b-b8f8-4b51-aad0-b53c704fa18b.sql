
-- Affiliates table
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  affiliate_code text NOT NULL UNIQUE,
  commission_rate numeric NOT NULL DEFAULT 0.10,
  status text NOT NULL DEFAULT 'pending',
  whatsapp text,
  reason text,
  joined_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own affiliate" ON public.affiliates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own affiliate" ON public.affiliates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage affiliates" ON public.affiliates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Affiliate clicks
CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  clicked_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own clicks" ON public.affiliate_clicks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_clicks.affiliate_id AND user_id = auth.uid())
);
CREATE POLICY "Anyone can insert clicks" ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all clicks" ON public.affiliate_clicks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Affiliate commissions
CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_mzn numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own commissions" ON public.affiliate_commissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_commissions.affiliate_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage commissions" ON public.affiliate_commissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Affiliate payouts
CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount_mzn numeric NOT NULL DEFAULT 0,
  method text NOT NULL,
  account_details text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone
);

ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own payouts" ON public.affiliate_payouts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_payouts.affiliate_id AND user_id = auth.uid())
);
CREATE POLICY "Affiliates can insert own payouts" ON public.affiliate_payouts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_payouts.affiliate_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage payouts" ON public.affiliate_payouts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add affiliate_id to orders
ALTER TABLE public.orders ADD COLUMN affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL;

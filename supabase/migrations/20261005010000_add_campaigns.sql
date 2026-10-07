-- Campanhas promocionais: um desconto (%) aplicado a um grupo de produtos durante um período.
-- Reutiliza os campos de promoção que já existem em products (promotional_price_mzn,
-- has_promotion, promotion_start_date, promotion_end_date), por isso o preço promocional
-- aparece no catálogo, na página do produto, no carrinho e no checkout sem mais alterações.

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  banner_url text,
  discount_percent numeric NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 90),
  starts_at date NOT NULL,
  ends_at date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_dates_check CHECK (ends_at >= starts_at)
);

CREATE TABLE IF NOT EXISTS public.campaign_products (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, product_id)
);

CREATE INDEX IF NOT EXISTS campaign_products_product_idx ON public.campaign_products (product_id);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_products ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante vê campanhas activas; só o admin gere.
CREATE POLICY campaigns_public_read ON public.campaigns
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY campaigns_admin_all ON public.campaigns
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY campaign_products_public_read ON public.campaign_products
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.active = true));
CREATE POLICY campaign_products_admin_all ON public.campaign_products
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Aplica o desconto da campanha aos seus produtos.
-- A promoção termina no fim do dia "ends_at": a página do produto compara a data de fim
-- com a hora actual (meia-noite UTC), por isso guardamos ends_at + 1 dia.
CREATE OR REPLACE FUNCTION public.apply_campaign(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.campaigns%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Operação não permitida.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO c FROM public.campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campanha não encontrada.';
  END IF;

  UPDATE public.products p
  SET promotional_price_mzn = round(p.price_mzn * (1 - c.discount_percent / 100.0)),
      has_promotion = true,
      promotion_start_date = c.starts_at,
      promotion_end_date = c.ends_at + 1,
      updated_at = now()
  FROM public.campaign_products cp
  WHERE cp.campaign_id = c.id
    AND cp.product_id = p.id
    AND round(p.price_mzn * (1 - c.discount_percent / 100.0)) < p.price_mzn;
END;
$$;

-- Remove o desconto dos produtos da campanha (só se a promoção ainda for a da campanha,
-- para não apagar uma promoção definida à mão no produto).
CREATE OR REPLACE FUNCTION public.clear_campaign(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.campaigns%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Operação não permitida.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO c FROM public.campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.products p
  SET promotional_price_mzn = NULL,
      has_promotion = false,
      promotion_start_date = NULL,
      promotion_end_date = NULL,
      updated_at = now()
  FROM public.campaign_products cp
  WHERE cp.campaign_id = c.id
    AND cp.product_id = p.id
    AND p.promotion_start_date = c.starts_at
    AND p.promotion_end_date = c.ends_at + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_campaign(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clear_campaign(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_campaign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_campaign(uuid) TO authenticated;

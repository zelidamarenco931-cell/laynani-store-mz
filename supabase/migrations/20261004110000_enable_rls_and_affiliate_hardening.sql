-- Migração aplicada no Supabase em 2026-10-04.
-- =====================================================================
-- 1. Funções auxiliares
-- =====================================================================
ALTER FUNCTION public.has_role(uuid, text) SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.user_role_type
  );
$$;

-- =====================================================================
-- 2. Activar RLS + admin total + leitura pública do catálogo
-- =====================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ad_campaigns','affiliate_clicks','affiliate_commissions','affiliate_payouts','affiliates',
    'categories','color_options','coupons','order_items','orders','product_featured',
    'product_images','product_variants','products','profiles','reviews','shipping_rates',
    'size_options','user_roles'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY admin_all ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'ad_campaigns','categories','color_options','product_featured','product_images',
    'product_variants','products','reviews','shipping_rates','size_options'
  ] LOOP
    EXECUTE format('CREATE POLICY public_read ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;

-- =====================================================================
-- 3. Cargos e perfis
-- =====================================================================
CREATE POLICY own_read ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY own_select ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY own_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY own_update ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- 4. Avaliações
-- =====================================================================
CREATE POLICY own_insert ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY own_update ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own_delete ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =====================================================================
-- 5. Pedidos e itens
-- =====================================================================
CREATE POLICY own_select ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY own_insert ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status IN ('pending','processing'));
CREATE POLICY own_update ON public.orders FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY own_select ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY own_insert ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- Cliente não pode alterar estado, total, afiliado, método ou ids de pagamento
CREATE OR REPLACE FUNCTION public.orders_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.total_mzn IS DISTINCT FROM OLD.total_mzn
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.affiliate_id IS DISTINCT FROM OLD.affiliate_id
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.tracking_code IS DISTINCT FROM OLD.tracking_code
       OR NEW.debitopay_payment_id IS DISTINCT FROM OLD.debitopay_payment_id
       OR NEW.netshop_payment_id IS DISTINCT FROM OLD.netshop_payment_id THEN
      RAISE EXCEPTION 'Operação não permitida.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_guard_update ON public.orders;
CREATE TRIGGER trg_orders_guard_update BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_guard_update();

-- Afiliado do pedido: tem de estar activo e não pode ser o próprio comprador
CREATE OR REPLACE FUNCTION public.orders_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.affiliate_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.id = NEW.affiliate_id AND a.status = 'active' AND a.user_id <> NEW.user_id
    ) THEN
      NEW.affiliate_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_before_insert ON public.orders;
CREATE TRIGGER trg_orders_before_insert BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_before_insert();

-- Comissão criada pelo servidor (taxa real do afiliado), uma por pedido
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_commissions_order_unique
  ON public.affiliate_commissions (order_id) WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.orders_create_commission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.affiliate_id IS NOT NULL THEN
    INSERT INTO public.affiliate_commissions (affiliate_id, order_id, amount_mzn, status)
    SELECT a.id, NEW.id, round(NEW.total_mzn * a.commission_rate, 2), 'pending'
    FROM public.affiliates a WHERE a.id = NEW.affiliate_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_create_commission ON public.orders;
CREATE TRIGGER trg_orders_create_commission AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_create_commission();

-- =====================================================================
-- 6. Afiliados
-- =====================================================================
REVOKE ALL ON public.affiliates FROM anon;
GRANT SELECT (id, affiliate_code, status) ON public.affiliates TO anon;

CREATE POLICY select_active_or_own ON public.affiliates FOR SELECT TO anon, authenticated
  USING (status = 'active' OR user_id = auth.uid());
CREATE POLICY own_insert ON public.affiliates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.affiliates_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.status := 'pending';
    NEW.commission_rate := 0.05;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_affiliates_before_insert ON public.affiliates;
CREATE TRIGGER trg_affiliates_before_insert BEFORE INSERT ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.affiliates_before_insert();

-- Cliques: qualquer visitante regista; só o dono lê
CREATE POLICY anyone_insert ON public.affiliate_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY owner_select ON public.affiliate_clicks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));

-- Comissões: só leitura para o dono (criação/alteração só servidor e admin)
CREATE POLICY owner_select ON public.affiliate_commissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));

-- Saques: dono lê e cria (limitado ao saldo livre)
CREATE POLICY owner_select ON public.affiliate_payouts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY owner_insert ON public.affiliate_payouts FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND EXISTS (SELECT 1 FROM public.affiliates a
                WHERE a.id = affiliate_id AND a.user_id = auth.uid() AND a.status = 'active')
  );

CREATE OR REPLACE FUNCTION public.affiliate_payouts_check_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE available numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    -- serializa pedidos do mesmo afiliado
    PERFORM 1 FROM public.affiliates WHERE id = NEW.affiliate_id FOR UPDATE;

    IF NEW.amount_mzn < 500 THEN
      RAISE EXCEPTION 'Valor mínimo para saque: 500 MZN.' USING ERRCODE = '23514';
    END IF;

    SELECT COALESCE((SELECT SUM(amount_mzn) FROM public.affiliate_commissions
                      WHERE affiliate_id = NEW.affiliate_id AND status = 'approved'), 0)
         - COALESCE((SELECT SUM(amount_mzn) FROM public.affiliate_payouts
                      WHERE affiliate_id = NEW.affiliate_id
                        AND status NOT IN ('rejected','cancelled')), 0)
      INTO available;

    IF NEW.amount_mzn > available THEN
      RAISE EXCEPTION 'Saldo insuficiente.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_affiliate_payouts_check_balance ON public.affiliate_payouts;
CREATE TRIGGER trg_affiliate_payouts_check_balance BEFORE INSERT ON public.affiliate_payouts
FOR EACH ROW EXECUTE FUNCTION public.affiliate_payouts_check_balance();

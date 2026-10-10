-- Endurecimento de segurança (revisto contra o estado actual do projecto)
-- NÃO mexe em is_admin() / has_role(): são usadas pelas políticas RLS.

BEGIN;

-- 1. handle_new_user sem search_path fixo (aviso do Supabase Advisor)
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. Funções que só servem de trigger não devem ser chamáveis via /rest/v1/rpc.
--    O EXECUTE só é verificado ao criar o trigger, por isso os triggers continuam a funcionar.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.affiliate_payouts_check_balance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.affiliates_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_create_commission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_affiliate_commission_on_order_status() FROM PUBLIC, anon, authenticated;

-- 3. A política profiles.own_update deixa o utilizador editar a própria linha,
--    incluindo a coluna `role`. Bloquear alterações de `role` por não-admins.
CREATE OR REPLACE FUNCTION public.profiles_guard_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.is_admin()
     AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Operação não permitida.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.profiles_guard_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profiles_guard_role ON public.profiles;
CREATE TRIGGER trg_profiles_guard_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_role();

COMMIT;

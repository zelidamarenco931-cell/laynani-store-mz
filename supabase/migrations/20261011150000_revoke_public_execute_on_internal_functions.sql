-- Já aplicada em produção (duas migrações: revoke_public_execute_on_internal_functions e revoke_anon_execute_has_role).
-- Mantida aqui para o repositório reflectir a base de dados.

-- Funções de trigger: só são chamadas pelo Postgres, nunca via /rest/v1/rpc
REVOKE EXECUTE ON FUNCTION public.affiliate_payouts_check_balance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.affiliates_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_create_commission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_affiliate_commission_on_order_status() FROM PUBLIC, anon, authenticated;

-- Campanhas: já exigem is_admin() internamente; remover acesso anónimo
REVOKE EXECUTE ON FUNCTION public.apply_campaign(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.clear_campaign(uuid) FROM PUBLIC, anon;

-- has_role é usada pelo login (rpc) e por gatilhos do storage; manter authenticated, remover anónimo
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;

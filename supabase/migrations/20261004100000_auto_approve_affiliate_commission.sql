-- Migração aplicada no Supabase em 2026-10-04.
-- Aprova automaticamente a comissão quando o pagamento do pedido é confirmado ('paid')
-- e cancela-a se o pedido for cancelado/rejeitado. Vale para todos os métodos
-- (Débito Pay via webhook; M-Pesa/e-Mola/BIM via painel admin).
CREATE OR REPLACE FUNCTION public.sync_affiliate_commission_on_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'paid' THEN
      UPDATE public.affiliate_commissions
         SET status = 'approved'
       WHERE order_id = NEW.id
         AND status = 'pending';
    ELSIF NEW.status IN ('cancelled', 'rejected') THEN
      UPDATE public.affiliate_commissions
         SET status = 'cancelled'
       WHERE order_id = NEW.id
         AND status IN ('pending', 'approved');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_affiliate_commission ON public.orders;
CREATE TRIGGER trg_sync_affiliate_commission
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_affiliate_commission_on_order_status();

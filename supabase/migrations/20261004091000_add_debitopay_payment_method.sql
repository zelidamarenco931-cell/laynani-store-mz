-- Migração aplicada no Supabase em 2026-10-04.
-- Permite guardar pedidos pagos pelo Débito Pay.
ALTER TYPE public.payment_method_type ADD VALUE IF NOT EXISTS 'debitopay';

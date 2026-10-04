-- Migração aplicada no Supabase em 2026-10-04.
-- Adiciona o estado 'paid' usado pelo painel de pedidos.
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'paid';

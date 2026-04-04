
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS tiktok text;
ALTER TABLE public.affiliates DROP COLUMN IF EXISTS whatsapp;

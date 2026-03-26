
-- Add new columns to products table
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS promotional_price_mzn numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_promotion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promotion_start_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promotion_end_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_time_min integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS delivery_time_max integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS origin text DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS meta_title text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meta_description text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create color_options table
CREATE TABLE IF NOT EXISTS public.color_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hex_code text NOT NULL
);
ALTER TABLE public.color_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Color options are publicly readable" ON public.color_options FOR SELECT USING (true);
CREATE POLICY "Admins can manage color options" ON public.color_options FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Insert predefined colors
INSERT INTO public.color_options (name, hex_code) VALUES
  ('Preto', '#000000'), ('Branco', '#FFFFFF'), ('Vermelho', '#EF4444'),
  ('Azul', '#3B82F6'), ('Verde', '#22C55E'), ('Amarelo', '#EAB308'),
  ('Rosa', '#EC4899'), ('Roxo', '#8B5CF6'), ('Laranja', '#F97316'),
  ('Cinza', '#6B7280'), ('Bege', '#D2B48C'), ('Marrom', '#92400E'),
  ('Dourado', '#D4AF37'), ('Prata', '#C0C0C0');

-- Create size_options table
CREATE TABLE IF NOT EXISTS public.size_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_type text NOT NULL DEFAULT 'roupas',
  size_name text NOT NULL
);
ALTER TABLE public.size_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Size options are publicly readable" ON public.size_options FOR SELECT USING (true);
CREATE POLICY "Admins can manage size options" ON public.size_options FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Insert predefined sizes
INSERT INTO public.size_options (category_type, size_name) VALUES
  ('roupas', 'P'), ('roupas', 'M'), ('roupas', 'G'), ('roupas', 'GG'), ('roupas', 'XG'),
  ('roupas', '36'), ('roupas', '37'), ('roupas', '38'), ('roupas', '39'), ('roupas', '40'), ('roupas', '41'), ('roupas', '42'),
  ('calcados', '35'), ('calcados', '36'), ('calcados', '37'), ('calcados', '38'), ('calcados', '39'),
  ('calcados', '40'), ('calcados', '41'), ('calcados', '42'), ('calcados', '43'), ('calcados', '44'), ('calcados', '45'),
  ('acessorios', 'Único'), ('acessorios', 'P'), ('acessorios', 'M'), ('acessorios', 'G');

-- Create product_variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color text,
  color_hex text,
  size text,
  weight_kg numeric,
  price_adjustment_mzn numeric DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  sku_variant text
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Variants are publicly readable" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Admins can manage variants" ON public.product_variants FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create product_images table
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  color text DEFAULT NULL
);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product images are publicly readable" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage product images" ON public.product_images FOR ALL USING (has_role(auth.uid(), 'admin'));

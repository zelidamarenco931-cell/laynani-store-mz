
-- Create ad_campaigns table
CREATE TABLE public.ad_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'facebook',
  budget_mzn numeric NOT NULL DEFAULT 0,
  spent_mzn numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  utm_source text,
  utm_medium text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create product_featured table
CREATE TABLE public.product_featured (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_sponsored boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_featured ENABLE ROW LEVEL SECURITY;

-- RLS for ad_campaigns
CREATE POLICY "Admins can manage campaigns" ON public.ad_campaigns FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Campaigns are publicly readable" ON public.ad_campaigns FOR SELECT USING (true);

-- RLS for product_featured
CREATE POLICY "Admins can manage featured" ON public.product_featured FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Featured are publicly readable" ON public.product_featured FOR SELECT USING (true);

-- Update trigger for ad_campaigns
CREATE TRIGGER update_ad_campaigns_updated_at BEFORE UPDATE ON public.ad_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP POLICY "Anyone can insert clicks" ON public.affiliate_clicks;
CREATE POLICY "Authenticated can insert clicks" ON public.affiliate_clicks FOR INSERT TO authenticated WITH CHECK (true);

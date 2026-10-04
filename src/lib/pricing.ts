// Preço efectivo de um produto, com a mesma regra de promoção usada na página do produto.

export interface PricedProduct {
  price_mzn: number | string;
  promotional_price_mzn?: number | string | null;
  has_promotion?: boolean | null;
  promotion_start_date?: string | null;
  promotion_end_date?: string | null;
}

export interface Pricing {
  price: number;
  originalPrice?: number;
  hasPromotion: boolean;
  discountPercent: number;
}

export const getPricing = (p: PricedProduct): Pricing => {
  const base = Number(p.price_mzn || 0);
  const promo = Number(p.promotional_price_mzn || 0);

  let active = !!p.has_promotion && promo > 0 && promo < base;
  if (active) {
    const now = new Date();
    if (p.promotion_start_date && new Date(p.promotion_start_date) > now) active = false;
    if (p.promotion_end_date && new Date(p.promotion_end_date) < now) active = false;
  }

  if (!active) return { price: base, hasPromotion: false, discountPercent: 0 };
  return {
    price: promo,
    originalPrice: base,
    hasPromotion: true,
    discountPercent: Math.round((1 - promo / base) * 100),
  };
};

export const formatMZN = (value: number | string) => `${Number(value || 0).toLocaleString("pt-MZ")} MZN`;

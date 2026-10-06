// Utilitários para criar anúncios de produtos (Facebook / Instagram) com link direto à Laynani Store.

export const SITE_URL =
  ((import.meta.env.VITE_SITE_URL as string | undefined) || "https://laynani-store.vercel.app").replace(/\/$/, "");

export interface AdProduct {
  id: string;
  name: string;
  description?: string | null;
  images?: string[] | null;
  price_mzn: number;
  has_promotion?: boolean | null;
  promotional_price_mzn?: number | null;
  promotion_start_date?: string | null;
  promotion_end_date?: string | null;
}

export const getAdPrice = (p: AdProduct) => {
  const now = new Date();
  const promoActive =
    !!p.has_promotion &&
    !!p.promotional_price_mzn &&
    !(p.promotion_start_date && new Date(p.promotion_start_date) > now) &&
    !(p.promotion_end_date && new Date(p.promotion_end_date) < now);
  const price = Number(p.price_mzn);
  const finalPrice = promoActive ? Number(p.promotional_price_mzn) : price;
  const discount = promoActive ? Math.round((1 - finalPrice / price) * 100) : 0;
  return { promoActive, finalPrice, oldPrice: promoActive ? price : null, discount };
};

const fmt = (n: number) => n.toLocaleString("pt-MZ");

// Link final do anúncio: abre directamente a página do produto na Laynani Store, com UTMs para medir resultados.
export const buildAdLink = (opts: { productId: string; platform: string; campaignName: string; content?: string }) => {
  const params = new URLSearchParams({
    utm_source: opts.platform,
    utm_medium: "cpc",
    utm_campaign: opts.campaignName.toLowerCase().trim().replace(/\s+/g, "-"),
    utm_content: opts.content || "anuncio",
  });
  return `${SITE_URL}/produto/${opts.productId}?${params.toString()}`;
};

export const buildAdHeadline = (p: AdProduct) => {
  const { promoActive, discount } = getAdPrice(p);
  const base = promoActive ? `-${discount}% ${p.name}` : p.name;
  return base.length > 40 ? `${base.slice(0, 37)}...` : base;
};

export const buildAdCopy = (p: AdProduct, platform: string, link: string) => {
  const { promoActive, finalPrice, oldPrice, discount } = getAdPrice(p);
  const lines: string[] = [];

  if (promoActive && oldPrice) {
    lines.push(`🔥 ${p.name} com ${discount}% de desconto!`, "", `De ${fmt(oldPrice)} MZN por apenas ${fmt(finalPrice)} MZN.`);
  } else {
    lines.push(`✨ ${p.name}`, "", `Apenas ${fmt(finalPrice)} MZN.`);
  }

  lines.push("🚚 Entrega em Moçambique", "🔒 Compra segura na Laynani Store", "");

  if (platform === "instagram") {
    lines.push("👉 Toque em “Comprar agora” e garanta o seu!", "", "#LaynaniStore #Moçambique #ComprasOnline");
  } else {
    lines.push(`👉 Compre agora: ${link}`);
  }
  return lines.join("\n");
};

export const ADS_MANAGER_URL = "https://adsmanager.facebook.com/adsmanager/manage/campaigns";

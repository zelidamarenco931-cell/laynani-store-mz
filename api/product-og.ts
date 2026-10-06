// Vercel Serverless Function — pré-visualização (Open Graph) de um produto para Facebook, Instagram e WhatsApp.
// Os robôs da Meta não executam JavaScript, por isso o site (SPA) precisa devolver as meta tags já prontas.
// O vercel.json encaminha para aqui apenas os robôs; os clientes normais continuam a receber a loja normal.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default async function handler(req: any, res: any) {
  const id = String(req.query?.id || "");
  const site = (process.env.VITE_SITE_URL || "https://laynani-store.vercel.app").replace(/\/$/, "");
  const supaUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supaKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  let title = "Laynani Store";
  let description = "Sua loja online favorita em Moçambique.";
  let image = `${site}/og-image.png.png`;
  let price: number | null = null;

  if (UUID.test(id) && supaUrl && supaKey) {
    try {
      const r = await fetch(
        `${supaUrl}/rest/v1/products?id=eq.${id}&select=name,description,images,price_mzn,has_promotion,promotional_price_mzn&limit=1`,
        { headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` } },
      );
      const [p] = (await r.json()) as any[];
      if (p) {
        title = p.name;
        description = (p.description || description).toString().slice(0, 200);
        if (p.images?.[0]) image = p.images[0];
        price = Number(p.has_promotion && p.promotional_price_mzn ? p.promotional_price_mzn : p.price_mzn);
      }
    } catch {
      /* usa os valores padrão */
    }
  }

  const qs = new URLSearchParams(req.query || {});
  qs.delete("id");
  const url = `${site}/produto/${UUID.test(id) ? id : ""}${qs.toString() ? `?${qs.toString()}` : ""}`;

  const html = `<!doctype html>
<html lang="pt"><head>
<meta charset="UTF-8" />
<title>${esc(title)} | Laynani Store</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="product" />
<meta property="og:site_name" content="Laynani Store" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(image)}" />
${price !== null ? `<meta property="product:price:amount" content="${price}" />\n<meta property="product:price:currency" content="MZN" />` : ""}
<meta name="twitter:card" content="summary_large_image" />
</head><body><a href="${esc(url)}">${esc(title)}</a></body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.status(200).send(html);
}

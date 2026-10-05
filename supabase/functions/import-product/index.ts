import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

// Páginas: só aceita lojas conhecidas (evita que a função seja usada para aceder a outros sites).
const ALLOWED = ["pinduoduo.com", "yangkeduo.com", "aliexpress.com", "aliexpress.us", "shein.com", "shein.top", "temu.com"];
const hostAllowed = (host: string) => ALLOWED.some((d) => host === d || host.endsWith("." + d));

// Imagens: qualquer CDN público, mas nunca endereços internos.
const isPrivateHost = (host: string) =>
  host === "localhost" || /^[\d.]+$/.test(host) || host.includes(":") || host.endsWith(".local") || host.endsWith(".internal");

const sourceOf = (host: string) =>
  host.includes("aliexpress") ? "aliexpress" : host.includes("shein") ? "shein" : host.includes("temu") ? "temu" : "pinduoduo";

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .trim();

const metaContent = (html: string, key: string) => {
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, "i");
  const m = html.match(re1) || html.match(re2);
  return m ? decode(m[1]) : "";
};

const absolute = (u: string, base: string) => {
  try {
    if (u.startsWith("//")) return "https:" + u;
    return new URL(u, base).toString();
  } catch {
    return "";
  }
};

async function fetchPage(startUrl: string) {
  let current = startUrl;
  for (let hop = 0; hop < 5; hop++) {
    const u = new URL(current);
    if (!/^https?:$/.test(u.protocol) || !hostAllowed(u.hostname.toLowerCase())) {
      throw new Error("Link não suportado. Use um link do Pinduoduo, AliExpress, Shein ou Temu.");
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(current, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9,pt;q=0.8",
        },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = new URL(res.headers.get("location")!, current).toString();
        continue;
      }
      const html = (await res.text()).slice(0, 1_500_000);
      return { html, finalUrl: current, status: res.status };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Demasiados redirecionamentos.");
}

function extract(html: string, finalUrl: string) {
  let name = metaContent(html, "og:title") || metaContent(html, "twitter:title");
  if (!name) name = decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "");
  let description = metaContent(html, "og:description") || metaContent(html, "description");
  const images: string[] = [];
  const addImg = (u?: string) => {
    if (!u) return;
    const abs = absolute(decode(u), finalUrl);
    if (abs && /^https?:/.test(abs) && !images.includes(abs)) images.push(abs);
  };
  let price = "";
  let currency = "";

  // JSON-LD (Product)
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1]);
      const list = Array.isArray(parsed) ? parsed : [parsed, ...(parsed["@graph"] || [])];
      for (const node of list) {
        if (!node || !String(node["@type"] || "").includes("Product")) continue;
        if (!name && node.name) name = String(node.name);
        if (!description && node.description) description = String(node.description);
        const imgs = Array.isArray(node.image) ? node.image : node.image ? [node.image] : [];
        imgs.forEach((i: any) => addImg(typeof i === "string" ? i : i?.url));
        const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        if (offer) {
          price = price || String(offer.price ?? offer.lowPrice ?? "");
          currency = currency || String(offer.priceCurrency || "");
        }
      }
    } catch { /* ignora JSON inválido */ }
  }

  addImg(metaContent(html, "og:image"));
  addImg(metaContent(html, "twitter:image"));

  // Listas de imagens embebidas no estado da página (AliExpress/Shein/Temu/Pinduoduo)
  for (const m of html.matchAll(/"imagePathList"\s*:\s*\[([^\]]*)\]/g)) {
    for (const u of m[1].matchAll(/"([^"]+)"/g)) addImg(u[1]);
  }
  for (const m of html.matchAll(/"(?:goods_img|hd_thumb_url|thumb_url|image_url)"\s*:\s*"([^"]+)"/g)) addImg(m[1]);

  if (!price) price = metaContent(html, "product:price:amount") || metaContent(html, "og:price:amount");
  if (!currency) currency = metaContent(html, "product:price:currency") || metaContent(html, "og:price:currency");

  return {
    name: name.slice(0, 200),
    description: description.slice(0, 600),
    images: images.slice(0, 8),
    original_price: price ? `${price}${currency ? " " + currency : ""}` : "",
  };
}

// Traduz para português (detecta o idioma de origem automaticamente, ex.: chinês).
async function translate(text: string): Promise<{ text: string; translated: boolean }> {
  if (!text.trim()) return { text, translated: false };
  try {
    const res = await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ q: text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`translate ${res.status}`);
    const data = await res.json();
    const out = ((data?.[0] as any[]) || []).map((s) => s?.[0] ?? "").join("").trim();
    const lang = String(data?.[2] || "");
    return { text: out || text, translated: !!out && !lang.startsWith("pt") };
  } catch (err) {
    console.error("translate failed:", err);
    return { text, translated: false };
  }
}

// Descarrega a imagem e guarda-a no Storage da loja (as lojas chinesas bloqueiam imagens usadas noutros sites).
async function storeImage(sb: any, src: string, referer: string, index: number, stamp: number): Promise<string | null> {
  try {
    let current = src.replace(/^http:\/\//i, "https://");
    let res: Response | null = null;
    for (let hop = 0; hop < 3; hop++) {
      const u = new URL(current);
      if (u.protocol !== "https:" || isPrivateHost(u.hostname.toLowerCase())) return null;
      res = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(12000),
        headers: { "User-Agent": UA, "Referer": referer, "Accept": "image/avif,image/webp,image/*,*/*;q=0.8" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = new URL(res.headers.get("location")!, current).toString();
        res = null;
        continue;
      }
      break;
    }
    if (!res || !res.ok) return null;

    const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!type.startsWith("image/")) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 6 * 1024 * 1024) return null;

    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("gif") ? "gif" : type.includes("avif") ? "avif" : "jpg";
    const path = `imported/${stamp}-${index}.${ext}`;
    const { error } = await sb.storage.from("products").upload(path, bytes, { contentType: type, upsert: false });
    if (error) throw error;
    return sb.storage.from("products").getPublicUrl(path).data.publicUrl as string;
  } catch (err) {
    console.error("storeImage failed:", src, err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    // Apenas administradores
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: isAdmin } = await sb.rpc("is_admin");
    if (!isAdmin) return json({ error: "Sem permissão." }, 403);

    const { url } = await req.json();
    if (typeof url !== "string" || !/^https?:\/\//i.test(url.trim())) {
      return json({ error: "Cole um link válido (começa por https://)." }, 400);
    }

    const { html, finalUrl, status } = await fetchPage(url.trim());
    const host = new URL(finalUrl).hostname.toLowerCase();
    const data = extract(html, finalUrl);
    const found = !!(data.name || data.images.length);

    if (!found) {
      return json({
        ...data,
        source: sourceOf(host),
        found: false,
        note: `A loja não devolveu os dados do produto (código ${status}). Preencha manualmente.`,
      });
    }

    // Tradução imediata + importação das fotos para o Storage da loja
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const stamp = Date.now();
    const [nameT, descT, stored] = await Promise.all([
      translate(data.name),
      translate(data.description),
      Promise.all(data.images.slice(0, 6).map((src, i) => storeImage(admin, src, finalUrl, i, stamp))),
    ]);
    const savedImages = stored.filter((u): u is string => !!u);

    return json({
      name: nameT.text,
      description: descT.text,
      original_name: data.name,
      translated: nameT.translated || descT.translated,
      images: savedImages.length > 0 ? savedImages : data.images,
      images_saved: savedImages.length,
      images_found: data.images.length,
      original_price: data.original_price,
      source: sourceOf(host),
      found: true,
    });
  } catch (err: any) {
    console.error("import-product error:", err);
    return json({ error: err?.message || "Erro ao ler o link." }, 400);
  }
});

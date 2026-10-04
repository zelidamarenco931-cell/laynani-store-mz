import { supabase } from "@/integrations/supabase/client";

// Remove acentos e maiúsculas para que "cafe" encontre "Café".
export const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const haystack = (p: any) =>
  normalizeText(
    [p.name, p.description, p.sku, p.color, Array.isArray(p.tags) ? p.tags.join(" ") : "", p.categories?.name]
      .filter(Boolean)
      .join(" "),
  );

// Todas as palavras da pesquisa têm de aparecer em algum campo do produto.
export const matchesQuery = (product: any, query: string) => {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = haystack(product);
  return tokens.every((t) => hay.includes(t));
};

// Pontuação para ordenar por relevância: nome começa pela pesquisa > nome contém > resto.
export const relevance = (product: any, query: string) => {
  const q = normalizeText(query);
  if (!q) return 0;
  const name = normalizeText(product.name);
  if (name.startsWith(q)) return 3;
  if (name.includes(q)) return 2;
  return 1;
};

// Índice leve de produtos para sugestões (carregado uma vez e guardado 5 minutos).
const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; data: any[] } | null = null;
let inflight: Promise<any[]> | null = null;

export const loadSearchIndex = async (): Promise<any[]> => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, description, sku, color, tags, images, price_mzn, promotional_price_mzn, has_promotion, promotion_start_date, promotion_end_date, categories(name)",
        )
        .eq("status", "active");
      if (error) throw error;
      cache = { at: Date.now(), data: data ?? [] };
      return cache.data;
    } catch (err) {
      console.error("Erro ao carregar produtos para pesquisa:", err);
      return cache?.data ?? [];
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};

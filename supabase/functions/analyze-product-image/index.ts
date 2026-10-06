// Lê a foto de um produto e sugere nome, descrição, categoria e tags (em português).
// Requer o segredo ANTHROPIC_API_KEY no Supabase. Só administradores podem usar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-4-5-20251001";
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_B64 = 6_000_000; // ~4.5 MB de imagem

const SYSTEM = `És o assistente de catálogo da Laynani Store, uma loja online em Moçambique.
Recebes a foto de um produto e devolves APENAS um objeto JSON, sem texto à volta, com esta forma:
{"name": string, "description": string, "category": string, "tags": string[]}

Regras:
- Escreve sempre em português de Moçambique.
- "name": nome comercial curto e claro (máximo 60 caracteres), com o tipo de produto e os atributos visíveis mais importantes (cor, material, estilo). Não inventes marcas nem modelos: só uses uma marca se o logotipo estiver claramente legível. Sem preços, sem emojis, sem MAIÚSCULAS a gritar.
- "description": 1 a 2 frases (máximo 250 caracteres) sobre o que se vê. Não inventes medidas, materiais não visíveis, garantias nem funcionalidades.
- "category": escolhe exactamente UMA das categorias da lista fornecida, copiada letra a letra. Se nenhuma servir, devolve "".
- "tags": até 5 palavras-chave em minúsculas.
- Se a imagem não mostrar um produto à venda, devolve {"name":"","description":"","category":"","tags":[]}.`;

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

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "A IA ainda não está configurada (falta ANTHROPIC_API_KEY no Supabase)." }, 503);

    const { image, media_type, categories } = await req.json();
    if (typeof image !== "string" || !image || image.length > MAX_B64) return json({ error: "Imagem inválida ou demasiado grande." }, 400);
    if (!TYPES.includes(media_type)) return json({ error: "Formato de imagem não suportado." }, 400);
    const cats: string[] = Array.isArray(categories) ? categories.filter((c) => typeof c === "string").slice(0, 60) : [];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type, data: image } },
              { type: "text", text: `Categorias disponíveis: ${JSON.stringify(cats)}\nDevolve o JSON.` },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("anthropic error", res.status, await res.text());
      return json({ error: "O serviço de IA não respondeu. Tente de novo." }, 502);
    }

    const data = await res.json();
    const text: string = (data?.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: "Não consegui interpretar a foto." }, 502);

    const raw = JSON.parse(match[0]);
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const category = str(raw.category, 80);
    return json({
      name: str(raw.name, 120),
      description: str(raw.description, 400),
      category: cats.includes(category) ? category : "",
      tags: Array.isArray(raw.tags) ? raw.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim().toLowerCase()).filter(Boolean).slice(0, 5) : [],
    });
  } catch (err: any) {
    console.error("analyze-product-image error:", err);
    return json({ error: "Erro ao analisar a foto." }, 500);
  }
});

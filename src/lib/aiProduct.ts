import { supabase } from "@/integrations/supabase/client";

export interface AiProductSuggestion {
  name: string;
  description: string;
  category: string;
  tags: string[];
}

// Reduz a foto (máx. 1024px) antes de enviar: mais rápido, mais barato e funciona bem com fotos grandes do telemóvel.
const shrink = (file: Blob, max = 1024): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("canvas")); return; }
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Imagem inválida")); };
    img.src = url;
  });

export async function analyzeProductImage(file: Blob, categories: string[]): Promise<AiProductSuggestion> {
  const image = await shrink(file);
  const { data, error } = await supabase.functions.invoke("analyze-product-image", {
    body: { image, media_type: "image/jpeg", categories },
  });

  if (error) {
    let msg = "Não foi possível analisar a foto.";
    try {
      const body = await (error as any).context?.json?.();
      if (body?.error) msg = body.error;
    } catch { /* usa a mensagem padrão */ }
    throw new Error(msg);
  }
  return data as AiProductSuggestion;
}

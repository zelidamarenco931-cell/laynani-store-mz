import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { matchesQuery, normalizeText, relevance } from "@/lib/search";
import { getPricing } from "@/lib/pricing";
import { campaignPhase, slugify, todayStr } from "@/lib/campaigns";

describe("pesquisa", () => {
  it("ignora acentos e maiúsculas", () => {
    expect(normalizeText("  Café  Preto ")).toBe("cafe  preto");
    expect(matchesQuery({ name: "Vestido Satin" }, "vestido")).toBe(true);
    expect(matchesQuery({ name: "Sapatilha Calçada" }, "calcada")).toBe(true);
  });

  it("exige todas as palavras", () => {
    const p = { name: "Vestido Curto", description: "Cor vermelha", tags: ["festa"] };
    expect(matchesQuery(p, "vestido vermelha")).toBe(true);
    expect(matchesQuery(p, "vestido azul")).toBe(false);
    expect(matchesQuery(p, "festa")).toBe(true);
    expect(matchesQuery(p, "")).toBe(true);
  });

  it("ordena por relevância", () => {
    expect(relevance({ name: "Vestido" }, "vest")).toBe(3);
    expect(relevance({ name: "Meu vestido" }, "vest")).toBe(2);
    expect(relevance({ name: "Camisa", description: "vestido" }, "vest")).toBe(1);
  });
});

describe("preços", () => {
  it("usa o preço normal sem promoção", () => {
    expect(getPricing({ price_mzn: 1000 })).toMatchObject({ price: 1000, hasPromotion: false });
  });

  it("usa o preço promocional dentro das datas", () => {
    const r = getPricing({ price_mzn: 1000, promotional_price_mzn: 800, has_promotion: true, promotion_start_date: "2000-01-01", promotion_end_date: "2999-01-01" });
    expect(r).toMatchObject({ price: 800, originalPrice: 1000, hasPromotion: true, discountPercent: 20 });
  });

  it("ignora promoção expirada, futura ou inválida", () => {
    expect(getPricing({ price_mzn: 1000, promotional_price_mzn: 800, has_promotion: true, promotion_end_date: "2000-01-01" }).hasPromotion).toBe(false);
    expect(getPricing({ price_mzn: 1000, promotional_price_mzn: 800, has_promotion: true, promotion_start_date: "2999-01-01" }).hasPromotion).toBe(false);
    expect(getPricing({ price_mzn: 1000, promotional_price_mzn: 1200, has_promotion: true }).hasPromotion).toBe(false);
    expect(getPricing({ price_mzn: "1000", promotional_price_mzn: "800", has_promotion: false }).price).toBe(1000);
  });
});

describe("campanhas", () => {
  it("calcula a fase pela data", () => {
    const today = todayStr();
    expect(campaignPhase({ starts_at: "2000-01-01", ends_at: "2000-01-02" })).toBe("ended");
    expect(campaignPhase({ starts_at: "2999-01-01", ends_at: "2999-01-02" })).toBe("upcoming");
    expect(campaignPhase({ starts_at: today, ends_at: today })).toBe("running");
  });

  it("gera slugs limpos", () => {
    expect(slugify("Black Friday — Moçambique 2026!")).toBe("black-friday-mocambique-2026");
  });
});

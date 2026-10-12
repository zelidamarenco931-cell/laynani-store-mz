import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import { getPricing } from "@/lib/pricing";

const MAX_PRODUCTS = 8;

// Mostra primeiro um artigo de cada categoria e, se sobrar espaço, os seguintes
// artigos de cada categoria, alternando entre elas (assim a página inicial
// nunca fica só com uma categoria).
const mixByCategory = (products: any[], limit: number) => {
  const groups = new Map<string, any[]>();
  products.forEach((p) => {
    const key = p.category_id || "sem-categoria";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });

  const lists = Array.from(groups.values());
  const result: any[] = [];

  for (let round = 0; result.length < limit; round++) {
    let added = false;
    for (const list of lists) {
      if (list[round]) {
        result.push(list[round]);
        added = true;
        if (result.length >= limit) break;
      }
    }
    if (!added) break;
  }

  return result;
};

const FeaturedProducts = () => {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (data) setProducts(mixByCategory(data, MAX_PRODUCTS));
      });
  }, []);

  return (
    <section className="container py-12">
      <h2 className="mb-6 text-2xl font-bold">Produtos em Destaque</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => {
          const pricing = getPricing(p);
          return (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              price={pricing.price}
              originalPrice={pricing.originalPrice}
              hasPromotion={pricing.hasPromotion}
              image={p.images?.[0] || "/placeholder.svg"}
            />
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedProducts;

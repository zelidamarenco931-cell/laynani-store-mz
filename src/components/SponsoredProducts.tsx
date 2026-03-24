import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import { Sparkles } from "lucide-react";

const SponsoredProducts = () => {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("product_featured")
        .select("*, products(*)")
        .eq("is_sponsored", true)
        .order("priority");
      if (data && data.length > 0) {
        setProducts(data.map((f: any) => f.products).filter(Boolean));
      }
    };
    fetch();
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="container py-12">
      <div className="mb-6 flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Recomendados para Você</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p: any) => (
          <ProductCard
            key={p.id}
            id={p.id}
            name={p.name}
            price={Number(p.price_mzn)}
            image={p.images?.[0] || "/placeholder.svg"}
            isSponsored
          />
        ))}
      </div>
    </section>
  );
};

export default SponsoredProducts;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";

const FeaturedProducts = () => {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("products").select("*").limit(8).then(({ data }) => {
      if (data) setProducts(data);
    });
  }, []);

  return (
    <section className="container py-12">
      <h2 className="mb-6 text-2xl font-bold">Produtos em Destaque</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            id={p.id}
            name={p.name}
            price={Number(p.price_mzn)}
            image={p.images?.[0] || "/placeholder.svg"}
          />
        ))}
      </div>
    </section>
  );
};

export default FeaturedProducts;

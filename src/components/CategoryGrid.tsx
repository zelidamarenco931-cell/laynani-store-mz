import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CategoryGrid = () => {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("categories").select("*").order("name").then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  return (
    <section className="container py-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Compre por Categoria</h2>
        <p className="mt-2 text-sm text-muted-foreground">Encontre exactamente o que procura</p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/catalogo?cat=${cat.slug}`}
            className="group flex flex-col items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:shadow-elevated hover:border-primary/30 sm:p-4"
          >
            <div className="h-14 w-14 overflow-hidden rounded-full bg-muted ring-2 ring-transparent transition-all group-hover:ring-primary/30 sm:h-16 sm:w-16">
              <img src={cat.image_url} alt={cat.name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
            </div>
            <span className="text-center text-[11px] font-medium leading-tight sm:text-xs">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;

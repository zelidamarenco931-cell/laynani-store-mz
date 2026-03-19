import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CategoryGrid = () => {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("categories").select("*").then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  return (
    <section className="container py-12">
      <h2 className="mb-6 text-2xl font-bold">Categorias</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/catalogo?cat=${cat.slug}`}
            className="group flex flex-col items-center gap-3 rounded-xl border p-4 transition-all hover:shadow-elevated hover:border-primary/30"
          >
            <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
              <img src={cat.image_url} alt={cat.name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
            </div>
            <span className="text-center text-xs font-medium">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;

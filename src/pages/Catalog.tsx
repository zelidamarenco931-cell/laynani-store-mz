import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get("cat");
  const [selectedCat, setSelectedCat] = useState(catParam || "all");
  const [sort, setSort] = useState("default");
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("categories").select("*").then(({ data }) => { if (data) setCategories(data); });
    supabase.from("products").select("*, categories(slug)").then(({ data }) => { if (data) setProducts(data); });
  }, []);

  useEffect(() => { if (catParam) setSelectedCat(catParam); }, [catParam]);

  const filtered = useMemo(() => {
    let result = [...products];
    if (selectedCat !== "all") {
      result = result.filter((p) => p.categories?.slug === selectedCat);
    }
    if (sort === "price-asc") result.sort((a, b) => a.price_mzn - b.price_mzn);
    if (sort === "price-desc") result.sort((a, b) => b.price_mzn - a.price_mzn);
    return result;
  }, [selectedCat, sort, products]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8">
        <h1 className="mb-6 text-3xl font-bold">Catálogo</h1>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <Button variant={selectedCat === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedCat("all")}>Todos</Button>
            {categories.map((c) => (
              <Button key={c.id} variant={selectedCat === c.slug ? "default" : "outline"} size="sm" onClick={() => setSelectedCat(c.slug)}>{c.name}</Button>
            ))}
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Relevância</SelectItem>
              <SelectItem value="price-asc">Menor Preço</SelectItem>
              <SelectItem value="price-desc">Maior Preço</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} id={p.id} name={p.name} price={Number(p.price_mzn)} image={p.images?.[0] || "/placeholder.svg"} />
          ))}
        </div>
        {filtered.length === 0 && <p className="py-20 text-center text-muted-foreground">Nenhum produto encontrado.</p>}
      </main>
      <Footer />
    </div>
  );
};

export default Catalog;

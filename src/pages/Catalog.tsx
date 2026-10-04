import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPricing } from "@/lib/pricing";
import { matchesQuery, relevance } from "@/lib/search";

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = searchParams.get("cat");
  const q = searchParams.get("q") ?? "";
  const [selectedCat, setSelectedCat] = useState(catParam || "all");
  const [sort, setSort] = useState("default");
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("categories").select("*").then(({ data }) => { if (data) setCategories(data); });
    supabase.from("products").select("*, categories(name, slug)").then(({ data }) => {
      if (data) setProducts(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { if (catParam) setSelectedCat(catParam); }, [catParam]);

  const setQuery = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    let result = [...products];
    if (selectedCat !== "all") {
      result = result.filter((p) => p.categories?.slug === selectedCat);
    }
    if (q.trim()) {
      result = result.filter((p) => matchesQuery(p, q));
    }
    if (sort === "price-asc") result.sort((a, b) => getPricing(a).price - getPricing(b).price);
    else if (sort === "price-desc") result.sort((a, b) => getPricing(b).price - getPricing(a).price);
    else if (q.trim()) result.sort((a, b) => relevance(b, q) - relevance(a, q));
    return result;
  }, [selectedCat, sort, products, q]);

  const hasFilters = selectedCat !== "all" || !!q.trim();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8">
        <h1 className="mb-1 text-3xl font-bold">{q.trim() ? "Resultados da pesquisa" : "Catálogo"}</h1>
        {q.trim() && !loading && (
          <p className="mb-4 text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "produto encontrado" : "produtos encontrados"} para “{q.trim()}”
          </p>
        )}

        <div className="relative mb-4 mt-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            value={q}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar no catálogo..."
            aria-label="Pesquisar no catálogo"
            className="pl-9 pr-9"
          />
          {q && (
            <button
              type="button"
              aria-label="Limpar pesquisa"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

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
          {filtered.map((p) => {
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

        {!loading && filtered.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">
              {q.trim() ? `Nenhum produto encontrado para “${q.trim()}”.` : "Nenhum produto encontrado."}
            </p>
            {hasFilters && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSelectedCat("all");
                  setSearchParams({}, { replace: true });
                }}
              >
                Limpar pesquisa e filtros
              </Button>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Catalog;

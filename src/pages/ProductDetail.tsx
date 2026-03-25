import { useParams, Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart, Truck, ArrowLeft, Minus, Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from("products").select("*").eq("id", id).single().then(({ data }) => {
      setProduct(data);
      setLoading(false);
    });

    // Track affiliate click
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("affiliate_ref", ref);
      supabase.from("affiliates").select("id").eq("affiliate_code", ref).single().then(({ data: aff }) => {
        if (aff) {
          supabase.from("affiliate_clicks").insert({
            affiliate_id: aff.id,
            product_id: id,
            user_agent: navigator.userAgent,
          } as any).then(() => {});
        }
      });
    }
  }, [id, searchParams]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p>Carregando...</p></div>;

  if (!product) return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Produto não encontrado.</p>
          <Button variant="outline" className="mt-4" asChild><Link to="/catalogo"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addItem({ id: product.id, name: product.name, price: Number(product.price_mzn), image: product.images?.[0] || "/placeholder.svg" });
    }
    toast.success(`${qty}x ${product.name} adicionado!`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8">
        <Button variant="ghost" size="sm" className="mb-4" asChild><Link to="/catalogo"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link></Button>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-muted">
            <img src={product.images?.[0] || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold md:text-3xl">{product.name}</h1>
            <p className="text-3xl font-extrabold text-primary">{Number(product.price_mzn).toLocaleString("pt-MZ")} MZN</p>
            <p className="text-muted-foreground">{product.description}</p>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Entrega: {product.delivery_time}</span>
            </div>
            <Badge variant="secondary" className="w-fit">
              {product.stock > 0 ? `${product.stock} em stock` : "Esgotado"}
            </Badge>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center rounded-lg border">
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></Button>
                <span className="w-10 text-center font-medium">{qty}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></Button>
              </div>
              <Button size="lg" className="flex-1" onClick={handleAdd} disabled={product.stock === 0}>
                <ShoppingCart className="mr-2 h-4 w-4" /> Adicionar ao Carrinho
              </Button>
            </div>
            {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;

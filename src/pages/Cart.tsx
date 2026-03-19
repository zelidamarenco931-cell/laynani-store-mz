import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Cart = () => {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const [province, setProvince] = useState("");
  const [coupon, setCoupon] = useState("");
  const [shippingRates, setShippingRates] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("shipping_rates").select("*").order("province").then(({ data }) => {
      if (data) setShippingRates(data);
    });
  }, []);

  const shippingCost = province ? shippingRates.find((r) => r.province === province)?.price_mzn || 0 : 0;
  const grandTotal = totalPrice + Number(shippingCost);

  if (items.length === 0) return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">O seu carrinho está vazio</h2>
        <Button asChild><Link to="/catalogo">Ver Catálogo <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8">
        <h1 className="mb-6 text-3xl font-bold">Carrinho ({totalItems})</h1>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-xl border p-4 shadow-card">
                <img src={item.image} alt={item.name} className="h-24 w-24 rounded-lg object-cover" />
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link to={`/produto/${item.id}`} className="font-medium hover:text-primary">{item.name}</Link>
                    <p className="text-sm font-bold text-primary">{item.price.toLocaleString("pt-MZ")} MZN</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-lg border">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border p-6 shadow-card h-fit">
            <h3 className="mb-4 text-lg font-semibold">Resumo</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{totalPrice.toLocaleString("pt-MZ")} MZN</span>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Província (Frete)</label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {shippingRates.map((r) => (
                      <SelectItem key={r.id} value={r.province}>{r.province} — {Number(r.price_mzn).toLocaleString("pt-MZ")} MZN</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {province && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="font-medium">{Number(shippingCost).toLocaleString("pt-MZ")} MZN</span>
                </div>
              )}
              <div className="flex gap-2">
                <Input placeholder="Cupom de desconto" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                <Button variant="outline" size="sm" onClick={() => toast.info("Cupom será aplicado no checkout.")}>Aplicar</Button>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{grandTotal.toLocaleString("pt-MZ")} MZN</span>
                </div>
              </div>
              <Button className="w-full" size="lg" asChild>
                <Link to="/checkout">Finalizar Compra <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;

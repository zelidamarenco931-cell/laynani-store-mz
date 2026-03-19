import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, Smartphone, ArrowLeft, CheckCircle } from "lucide-react";

const paymentMethods = [
  { id: "mpesa", label: "M-Pesa / e-Mola", icon: Smartphone, desc: "Pagamento manual — envie e anexe comprovante" },
  { id: "paygate", label: "PayGate (Cartão)", icon: CreditCard, desc: "Cartão internacional ou local" },
  { id: "dpo", label: "DPO Group", icon: CreditCard, desc: "Cartões africanos" },
  { id: "paypal", label: "PayPal", icon: CreditCard, desc: "Conta PayPal" },
] as const;

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [province, setProvince] = useState("");
  const [payment, setPayment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", city: "", bairro: "", reference: "" });

  useEffect(() => {
    supabase.from("shipping_rates").select("*").order("province").then(({ data }) => {
      if (data) setShippingRates(data);
    });
  }, []);

  const shippingCost = province ? Number(shippingRates.find((r) => r.province === province)?.price_mzn || 0) : 0;
  const grandTotal = totalPrice + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!province || !payment) { toast.error("Preencha todos os campos obrigatórios."); return; }
    if (!user) { toast.error("Faça login para continuar."); navigate("/login"); return; }

    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      total_mzn: grandTotal,
      status: "pending" as const,
      payment_method: payment as "mpesa" | "paygate" | "dpo" | "paypal",
      shipping_address: { province, city: formData.city, bairro: formData.bairro, reference: formData.reference, name: formData.name, phone: formData.phone },
    }).select().single();

    if (error || !order) { toast.error("Erro ao criar pedido."); return; }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price_mzn: item.price,
    }));
    await supabase.from("order_items").insert(orderItems);

    setSubmitted(true);
    clearCart();
    toast.success("Pedido realizado com sucesso!");
  };

  if (submitted) return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <CheckCircle className="h-20 w-20 text-primary" />
        <h2 className="text-2xl font-bold">Pedido Confirmado!</h2>
        <p className="text-center text-muted-foreground max-w-md">
          {payment === "mpesa" ? "Envie o comprovante M-Pesa para confirmarmos o pagamento." : "Será redirecionado para o gateway de pagamento."}
        </p>
        <Button asChild><Link to="/conta">Ver Meus Pedidos</Link></Button>
      </main>
      <Footer />
    </div>
  );

  if (items.length === 0) return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-20">
        <div className="text-center">
          <p className="text-muted-foreground">Carrinho vazio.</p>
          <Button className="mt-4" asChild><Link to="/catalogo">Ver Catálogo</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8">
        <Button variant="ghost" size="sm" className="mb-4" asChild><Link to="/carrinho"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Carrinho</Link></Button>
        <h1 className="mb-6 text-3xl font-bold">Checkout</h1>
        {!user && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm">Precisa de uma conta para finalizar. <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link> ou <Link to="/registrar" className="font-medium text-primary hover:underline">Criar Conta</Link></p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-xl border p-6 shadow-card space-y-4">
              <h2 className="text-lg font-semibold">Dados de Entrega</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Nome Completo</Label><Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+258 8X XXX XXXX" /></div>
              </div>
              <div><Label>Província</Label>
                <Select value={province} onValueChange={setProvince}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{shippingRates.map((r) => <SelectItem key={r.id} value={r.province}>{r.province}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Cidade</Label><Input required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
                <div><Label>Bairro</Label><Input required value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} /></div>
              </div>
              <div><Label>Referência</Label><Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="Ponto de referência (opcional)" /></div>
            </div>
            <div className="rounded-xl border p-6 shadow-card space-y-4">
              <h2 className="text-lg font-semibold">Método de Pagamento</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {paymentMethods.map((m) => (
                  <button type="button" key={m.id} onClick={() => setPayment(m.id)}
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${payment === m.id ? "border-primary bg-primary/5 shadow-card" : "hover:border-primary/30"}`}>
                    <m.icon className={`mt-0.5 h-5 w-5 shrink-0 ${payment === m.id ? "text-primary" : "text-muted-foreground"}`} />
                    <div><p className="text-sm font-medium">{m.label}</p><p className="text-xs text-muted-foreground">{m.desc}</p></div>
                  </button>
                ))}
              </div>
              {payment === "mpesa" && (
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p className="font-medium">Instruções M-Pesa:</p>
                  <p className="text-muted-foreground">Envie <strong>{grandTotal.toLocaleString("pt-MZ")} MZN</strong> para o número <strong>84 XXX XXXX</strong>. Após o envio, anexe o comprovante.</p>
                  <Input type="file" className="mt-3" accept="image/*,.pdf" />
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="sticky top-28 rounded-xl border p-6 shadow-card space-y-4">
              <h2 className="text-lg font-semibold">Resumo do Pedido</h2>
              <div className="max-h-60 space-y-3 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                    <div className="flex-1"><p className="text-sm font-medium line-clamp-1">{item.name}</p><p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p></div>
                    <p className="text-sm font-medium">{(item.price * item.quantity).toLocaleString("pt-MZ")} MZN</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t pt-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{totalPrice.toLocaleString("pt-MZ")} MZN</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{shippingCost.toLocaleString("pt-MZ")} MZN</span></div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Total</span><span className="text-primary">{grandTotal.toLocaleString("pt-MZ")} MZN</span>
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={!user}>Confirmar Pedido</Button>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;

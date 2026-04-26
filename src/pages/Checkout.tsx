import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { Smartphone, ArrowLeft, Building2, Upload, ImageIcon, CreditCard } from "lucide-react";

const paymentMethods = [
  { id: "mpesa", label: "M-Pesa", icon: Smartphone, desc: "Envie para 852506942 (Felizarda I.M)" },
  { id: "emola", label: "e-Mola", icon: Smartphone, desc: "Envie para 868214712 (Zelida Isac Marenço)" },
  { id: "bank", label: "Transferência BIM", icon: Building2, desc: "NIB: 000100000109942147557" },
  { id: "stripe", label: "Cartão / PayPal", icon: CreditCard, desc: "Visa, Mastercard, PayPal (pagamento seguro)" },
] as const;

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [province, setProvince] = useState("");
  const [payment, setPayment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", city: "", bairro: "", reference: "" });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      clearCart();
      setSubmitted(true);
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.from("shipping_rates").select("*").order("province").then(({ data }) => {
      if (data) setShippingRates(data);
    });
  }, []);

  const shippingCost = province ? Number(shippingRates.find((r) => r.province === province)?.price_mzn || 0) : 0;
  const grandTotal = totalPrice + shippingCost;

  const uploadProof = async (orderId: string): Promise<string | null> => {
    if (!proofFile || !user) return null;
    const ext = proofFile.name.split(".").pop();
    const path = `${user.id}/${orderId}.${ext}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, proofFile, { upsert: true });
    if (error) { console.error(error); return null; }
    const { data } = supabase.storage.from("payment-proofs").getPublicUrl(path);
    return data.publicUrl;
  };


  const handleStripeCheckout = async () => {
    if (!province) { toast.error("Selecione a província de entrega."); return; }
    if (!formData.name || !formData.phone || !formData.city || !formData.bairro) {
      toast.error("Preencha todos os dados de entrega."); return;
    }
    if (!user) { toast.error("Faça login para continuar."); navigate("/login"); return; }

    setStripeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-session", {
        body: {
          items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
          shippingCost,
          successUrl: `${window.location.origin}/pedido-sucesso?stripe=true`,
          cancelUrl: `${window.location.origin}/checkout`,
          customerEmail: user.email,
          metadata: {
            user_id: user.id,
            province,
            city: formData.city,
            bairro: formData.bairro,
            reference: formData.reference,
            name: formData.name,
            phone: formData.phone,
          }
        }
      });
      if (error || !data?.url) { toast.error("Erro ao iniciar pagamento com cartão."); return; }
      window.location.href = data.url;
    } catch {
      toast.error("Erro ao conectar com Stripe.");
    } finally {
      setStripeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payment === "stripe") { await handleStripeCheckout(); return; }
    if (!province || !payment) { toast.error("Preencha todos os campos obrigatórios."); return; }
    if (!user) { toast.error("Faça login para continuar."); navigate("/login"); return; }
    if (!proofFile && payment !== "stripe") { toast.error("Anexe o comprovante de pagamento."); return; }

    setUploading(true);

    let affiliateId: string | null = null;
    const refCode = localStorage.getItem("affiliate_ref");
    if (refCode) {
      const { data: aff } = await supabase.from("affiliates").select("id, user_id").eq("affiliate_code", refCode).eq("status", "active").single();
      if (aff && aff.user_id !== user.id) affiliateId = aff.id;
    }

    const paymentMethodMap: Record<string, string> = { mpesa: "mpesa", emola: "mpesa", bank: "manual" };

    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      total_mzn: grandTotal,
      status: "pending" as const,
      payment_method: paymentMethodMap[payment] as "mpesa" | "manual",
      shipping_address: { province, city: formData.city, bairro: formData.bairro, reference: formData.reference, name: formData.name, phone: formData.phone, payment_detail: payment },
      ...(affiliateId ? { affiliate_id: affiliateId } : {}),
    } as any).select().single();

    if (error || !order) { toast.error("Erro ao criar pedido."); setUploading(false); return; }

    const proofUrl = await uploadProof(order.id);
    if (proofUrl) {
      await supabase.from("orders").update({ payment_proof_url: proofUrl }).eq("id", order.id);
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price_mzn: item.price,
    }));
    await supabase.from("order_items").insert(orderItems);

    if (affiliateId) {
      const { data: affData } = await supabase.from("affiliates").select("commission_rate").eq("id", affiliateId).single();
      const rate = affData?.commission_rate || 0.10;
      await supabase.from("affiliate_commissions").insert({
        affiliate_id: affiliateId,
        order_id: order.id,
        amount_mzn: grandTotal * Number(rate),
        status: "pending",
      } as any);
      localStorage.removeItem("affiliate_ref");
    }

    setUploading(false);
    clearCart();
    toast.success("Pedido realizado com sucesso!");

    const orderSummary = items.map(i => `${i.name} x${i.quantity}`).join(", ");
    const waMsg = encodeURIComponent(
      `🛒 *Novo Pedido #${order.id.slice(0, 8).toUpperCase()}*\n\n` +
      `👤 ${formData.name}\n📞 ${formData.phone}\n📍 ${province}, ${formData.city}\n\n` +
      `📦 ${orderSummary}\n💰 Total: ${grandTotal.toLocaleString("pt-MZ")} MZN\n💳 ${paymentMethods.find(m => m.id === payment)?.label || payment}\n\n` +
      `Verifique o comprovante no painel admin.`
    );
    window.open(`https://wa.me/258868214712?text=${waMsg}`, "_blank");

    navigate(`/pedido-sucesso?order=${order.id}`);
  };

  if (submitted) return null;

  if (items.length === 0) return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-20 px-4">
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
      <main className="container flex-1 px-4 py-6 sm:py-8">
        <Button variant="ghost" size="sm" className="mb-3" asChild>
          <Link to="/carrinho"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
        </Button>
        <h1 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl">Checkout</h1>

        {!user && (
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:mb-6 sm:p-4">
            <p className="text-sm">Precisa de uma conta para finalizar. <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link> ou <Link to="/registrar" className="font-medium text-primary hover:underline">Criar Conta</Link></p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Order summary first on mobile for better UX */}
          <div className="order-first lg:order-last">
            <div className="lg:sticky lg:top-28 rounded-xl border p-4 sm:p-6 shadow-card space-y-4">
              <h2 className="text-base font-semibold sm:text-lg">Resumo do Pedido</h2>
              <div className="max-h-48 sm:max-h-60 space-y-3 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 sm:gap-3">
                    <img src={item.image} alt={item.name} className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover shrink-0" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                    </div>
                    <p className="text-xs sm:text-sm font-medium shrink-0">{(item.price * item.quantity).toLocaleString("pt-MZ")} MZN</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t pt-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{totalPrice.toLocaleString("pt-MZ")} MZN</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{shippingCost.toLocaleString("pt-MZ")} MZN</span></div>
                <div className="flex justify-between border-t pt-2 text-base sm:text-lg font-bold">
                  <span>Total</span><span className="text-primary">{grandTotal.toLocaleString("pt-MZ")} MZN</span>
                </div>
              </div>
              {/* Submit button visible in summary on desktop */}
              <Button type="submit" size="lg" className="hidden w-full lg:flex" disabled={!user || uploading}>
                {stripeLoading ? "Redirecionando..." : uploading ? "Enviando..." : payment === "stripe" ? "Pagar com Cartão" : "Confirmar Pedido"}
              </Button>
            </div>
          </div>

          {/* Form fields */}
          <div className="order-last lg:order-first space-y-4 sm:space-y-6">
            <div className="rounded-xl border p-4 sm:p-6 shadow-card space-y-3 sm:space-y-4">
              <h2 className="text-base font-semibold sm:text-lg">Dados de Entrega</h2>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm">Nome Completo</Label>
                  <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm">Telefone</Label>
                  <Input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+258 8X XXX XXXX" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Província</Label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{shippingRates.map((r) => <SelectItem key={r.id} value={r.province}>{r.province}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm">Cidade</Label>
                  <Input required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm">Bairro</Label>
                  <Input required value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Referência</Label>
                <Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="Ponto de referência (opcional)" />
              </div>
            </div>

            <div className="rounded-xl border p-4 sm:p-6 shadow-card space-y-3 sm:space-y-4">
              <h2 className="text-base font-semibold sm:text-lg">Método de Pagamento</h2>
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                {paymentMethods.map((m) => (
                  <button type="button" key={m.id} onClick={() => { setPayment(m.id); setProofFile(null); }}
                    className={`flex items-start gap-3 rounded-lg border p-3 sm:p-4 text-left transition-all ${payment === m.id ? "border-primary bg-primary/5 shadow-card" : "hover:border-primary/30"}`}>
                    <m.icon className={`mt-0.5 h-5 w-5 shrink-0 ${payment === m.id ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-xs text-muted-foreground break-all">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {payment === "mpesa" && (
                <div className="rounded-lg bg-muted p-3 sm:p-4 text-sm space-y-2 sm:space-y-3">
                  <p className="font-medium">📱 Instruções M-Pesa:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm text-muted-foreground">
                    <li>Abra o M-Pesa no seu telefone</li>
                    <li>Envie <strong className="text-foreground">{grandTotal.toLocaleString("pt-MZ")} MZN</strong></li>
                    <li>Para: <strong className="text-foreground">852 506 942</strong></li>
                    <li>Nome: <strong className="text-foreground">Felizarda I.M</strong></li>
                    <li>Tire screenshot e anexe abaixo</li>
                  </ol>
                </div>
              )}

              {payment === "emola" && (
                <div className="rounded-lg bg-muted p-3 sm:p-4 text-sm space-y-2 sm:space-y-3">
                  <p className="font-medium">📱 Instruções e-Mola:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm text-muted-foreground">
                    <li>Abra o e-Mola no seu telefone</li>
                    <li>Envie <strong className="text-foreground">{grandTotal.toLocaleString("pt-MZ")} MZN</strong></li>
                    <li>Para: <strong className="text-foreground">868 214 712</strong></li>
                    <li>Nome: <strong className="text-foreground">Zelida Isac Marenço</strong></li>
                    <li>Tire screenshot e anexe abaixo</li>
                  </ol>
                </div>
              )}

              {payment === "bank" && (
                <div className="rounded-lg bg-muted p-3 sm:p-4 text-sm space-y-2 sm:space-y-3">
                  <p className="font-medium">🏦 Transferência Bancária (BIM):</p>
                  <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                    <p>NIB: <strong className="text-foreground break-all">000100000109942147557</strong></p>
                    <p>Valor: <strong className="text-foreground">{grandTotal.toLocaleString("pt-MZ")} MZN</strong></p>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Após a transferência, anexe o comprovante abaixo.</p>
                </div>
              )}


              {payment === "stripe" && (
                <div className="rounded-lg bg-muted p-3 sm:p-4 text-sm space-y-2 sm:space-y-3">
                  <p className="font-medium">💳 Pagamento com Cartão / PayPal:</p>
                  <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                    <li>✅ Visa, Mastercard, Amex aceites</li>
                    <li>✅ PayPal aceite</li>
                    <li>✅ Pagamento 100% seguro via Stripe</li>
                    <li>💰 Total: <strong className="text-foreground">{grandTotal.toLocaleString("pt-MZ")} MZN</strong></li>
                  </ul>
                  <p className="text-xs text-muted-foreground">Será redirecionado para a página segura de pagamento da Stripe.</p>
                </div>
              )}

              {["mpesa", "emola", "bank"].includes(payment) && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm">
                    <Upload className="h-4 w-4" /> Comprovante de Pagamento *
                  </Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    required
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="cursor-pointer text-xs sm:text-sm"
                  />
                  {proofFile && (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs">
                      <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate min-w-0">{proofFile.name}</span>
                      <span className="text-muted-foreground shrink-0">({(proofFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky submit button on mobile */}
            <div className="lg:hidden sticky bottom-0 -mx-4 bg-background border-t p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
              <Button type="submit" size="lg" className="w-full" disabled={!user || uploading}>
                {stripeLoading ? "Redirecionando..." : uploading ? "Enviando..." : payment === "stripe" ? `Pagar com Cartão • ${grandTotal.toLocaleString("pt-MZ")} MZN` : `Confirmar Pedido • ${grandTotal.toLocaleString("pt-MZ")} MZN`}
              </Button>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
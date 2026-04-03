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
import { Smartphone, ArrowLeft, CheckCircle, Building2, Upload, ImageIcon, Loader2 } from "lucide-react";

const paymentMethods = [
  { id: "mpesa", label: "M-Pesa", icon: Smartphone, desc: "Envie para 852506942 (Felizarda I.M)" },
  { id: "emola", label: "e-Mola", icon: Smartphone, desc: "Envie para 868214712 (Zelida Isac Marenço)" },
  { id: "bank", label: "Transferência BIM", icon: Building2, desc: "NIB: 000100000109942147557" },
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

  // Handle success redirect
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!province || !payment) { toast.error("Preencha todos os campos obrigatórios."); return; }
    if (!user) { toast.error("Faça login para continuar."); navigate("/login"); return; }
    if (!proofFile) {
      toast.error("Anexe o comprovante de pagamento.");
      return;
    }

    setUploading(true);

    // Check for affiliate ref
    let affiliateId: string | null = null;
    const refCode = localStorage.getItem("affiliate_ref");
    if (refCode) {
      const { data: aff } = await supabase.from("affiliates").select("id, user_id").eq("affiliate_code", refCode).eq("status", "active").single();
      if (aff && aff.user_id !== user.id) affiliateId = aff.id;
    }

    // Stripe payment flow
    if (payment === "stripe") {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (!accessToken) {
          throw new Error("A sua sessão expirou. Faça login novamente para continuar.");
        }

        const { data, error } = await supabase.functions.invoke("create-checkout", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: {
            items: items.map(item => ({ name: item.name, price: item.price, quantity: item.quantity, image: item.image })),
            shippingCost,
            shippingAddress: { province, city: formData.city, bairro: formData.bairro, reference: formData.reference, name: formData.name, phone: formData.phone },
            affiliateId,
            origin: window.location.origin,
          },
        });
        if (error) throw error;

        const checkoutUrl = typeof data?.url === "string" ? data.url : "";
        if (!checkoutUrl || !/^https?:\/\//.test(checkoutUrl)) {
          throw new Error("URL de checkout inválida.");
        }

        if (stripeCheckoutWindow) {
          stripeCheckoutWindow.location.replace(checkoutUrl);
          toast.success("Abrimos o pagamento numa nova aba.");
          setUploading(false);
          return;
        }

        if (isEmbeddedPreview) {
          throw new Error("O navegador bloqueou a abertura do checkout. Permita pop-ups e tente novamente.");
        }

        window.location.assign(checkoutUrl);
        return;
      } catch (err: any) {
        if (stripeCheckoutWindow && !stripeCheckoutWindow.closed) {
          stripeCheckoutWindow.document.body.innerHTML = "<p style='font-family: Arial, sans-serif; padding: 24px;'>Não foi possível iniciar o pagamento. Volte à loja e tente novamente.</p>";
          setTimeout(() => stripeCheckoutWindow.close(), 1800);
        }
        toast.error("Erro ao processar pagamento: " + (err.message || "Tente novamente."));
        setUploading(false);
        return;
      }
    }

    // Manual payment flow (M-Pesa, e-Mola, Bank)
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
          O seu comprovante foi enviado. O administrador irá verificar e confirmar o pagamento em breve.
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
                  <button type="button" key={m.id} onClick={() => { setPayment(m.id); setProofFile(null); }}
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${payment === m.id ? "border-primary bg-primary/5 shadow-card" : "hover:border-primary/30"}`}>
                    <m.icon className={`mt-0.5 h-5 w-5 shrink-0 ${payment === m.id ? "text-primary" : "text-muted-foreground"}`} />
                    <div><p className="text-sm font-medium">{m.label}</p><p className="text-xs text-muted-foreground">{m.desc}</p></div>
                  </button>
                ))}
              </div>

              {payment === "mpesa" && (
                <div className="rounded-lg bg-muted p-4 text-sm space-y-3">
                  <p className="font-medium">📱 Instruções M-Pesa:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Abra o M-Pesa no seu telefone</li>
                    <li>Envie <strong className="text-foreground">{grandTotal.toLocaleString("pt-MZ")} MZN</strong></li>
                    <li>Para o número: <strong className="text-foreground">852 506 942</strong></li>
                    <li>Nome: <strong className="text-foreground">Felizarda I.M</strong></li>
                    <li>Tire screenshot do comprovante e anexe abaixo</li>
                  </ol>
                </div>
              )}

              {payment === "emola" && (
                <div className="rounded-lg bg-muted p-4 text-sm space-y-3">
                  <p className="font-medium">📱 Instruções e-Mola:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Abra o e-Mola no seu telefone</li>
                    <li>Envie <strong className="text-foreground">{grandTotal.toLocaleString("pt-MZ")} MZN</strong></li>
                    <li>Para o número: <strong className="text-foreground">868 214 712</strong></li>
                    <li>Nome: <strong className="text-foreground">Zelida Isac Marenço</strong></li>
                    <li>Tire screenshot do comprovante e anexe abaixo</li>
                  </ol>
                </div>
              )}

              {payment === "bank" && (
                <div className="rounded-lg bg-muted p-4 text-sm space-y-3">
                  <p className="font-medium">🏦 Dados para Transferência Bancária (BIM):</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p>NIB: <strong className="text-foreground">000100000109942147557</strong></p>
                    <p>Valor: <strong className="text-foreground">{grandTotal.toLocaleString("pt-MZ")} MZN</strong></p>
                  </div>
                  <p className="text-muted-foreground">Após a transferência, tire screenshot do comprovante e anexe abaixo.</p>
                </div>
              )}

              {payment === "stripe" && (
                <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
                  <p className="font-medium">💳 Pagamento por Cartão:</p>
                  <p className="text-muted-foreground">Será redirecionado para a página segura do Stripe para completar o pagamento com Visa, Mastercard ou outro cartão.</p>
                </div>
              )}

              {["mpesa", "emola", "bank"].includes(payment) && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Comprovante de Pagamento *
                  </Label>
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      required
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                  </div>
                  {proofFile && (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <span className="truncate">{proofFile.name}</span>
                      <span className="text-muted-foreground">({(proofFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  )}
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
                    <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover" loading="lazy" />
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
              <Button type="submit" size="lg" className="w-full" disabled={!user || uploading}>
                {uploading ? "Enviando..." : "Confirmar Pedido"}
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

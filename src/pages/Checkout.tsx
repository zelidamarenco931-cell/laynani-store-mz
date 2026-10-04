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
import { Smartphone, ArrowLeft, Upload, ImageIcon, Zap } from "lucide-react";

const paymentMethods = [
  { id: "mpesa_auto", label: "M-Pesa", icon: Smartphone, desc: "Pagamento automático - confirme no telemóvel" },
  { id: "emola", label: "e-Mola", icon: Smartphone, desc: "Envie para 868214712 (Zelida Isac Marenço)" },
  { id: "debitopay", label: "Cartão Visa / Mastercard", icon: Zap, desc: "Pagamento automático seguro (Débito Pay)" },
] as const;

// Métodos automáticos (confirmados pelo Débito Pay, sem comprovante)
const AUTO_METHODS = ["mpesa_auto", "debitopay"];

const normalizeMpesaPhone = (value: string) => value.replace(/\D/g, "").replace(/^258/, "");
const isValidMpesaPhone = (value: string) => /^8[45]\d{7}$/.test(normalizeMpesaPhone(value));

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
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [debitopayLoading, setDebitopayLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      clearCart();
      setSubmitted(true);
    }
  }, [searchParams, clearCart]);

  useEffect(() => {
    supabase.from("shipping_rates").select("*").order("province").then(({ data }) => {
      if (data) setShippingRates(data);
    });
  }, []);

  const shippingCost = province ? Number(shippingRates.find((r) => r.province === province)?.price_mzn || 0) : 0;
  const grandTotal = totalPrice + shippingCost;

  const uploadProof = async (orderId: string): Promise<string | null> => {
    if (!proofFile || !user) return null;
    try {
      const ext = proofFile.name.split(".").pop();
      const path = `${user.id}/${orderId}.${ext}`;
      const { error } = await supabase.storage.from("payment-proofs").upload(path, proofFile, { upsert: true });
      if (error) {
        console.error(error);
        return null;
      }
      const { data } = supabase.storage.from("payment-proofs").getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading proof:", error);
      return null;
    }
  };

  // Pagamento automático pelo Débito Pay: cartão (redireciona) ou M-Pesa (confirmação no telemóvel)
  const handleDebitopayCheckout = async (orderId: string, method: "card" | "mpesa", phone?: string) => {
    setDebitopayLoading(true);
    try {
      // O valor do pedido é lido no servidor a partir da base de dados.
      const { data, error } = await supabase.functions.invoke("create-debitopay-session", {
        body: {
          orderId,
          method,
          phone,
          successUrl: `${window.location.origin}/pedido-sucesso?debitopay=true&order=${orderId}`,
          cancelUrl: `${window.location.origin}/checkout`,
          customerEmail: user?.email,
        }
      });

      if (error) {
        console.error("Débito Pay error:", error);
        let message = "Erro ao iniciar o pagamento.";
        try {
          const detail = await (error as any).context?.json?.();
          if (detail) {
            console.error("Débito Pay detalhe:", detail);
            if (detail.message) message = detail.message;
          }
        } catch (_) {
          /* sem detalhe */
        }
        toast.error(message);
        setDebitopayLoading(false);
        return;
      }

      if (method === "mpesa") {
        if (!data?.success) {
          toast.error(data?.message || "O pagamento M-Pesa não foi concluído.");
          setDebitopayLoading(false);
          return;
        }
        // M-Pesa confirma na hora: esvazia o carrinho e mostra o resultado
        clearCart();
        navigate(`/pedido-sucesso?debitopay=true&order=${orderId}`);
        return;
      }

      if (!data?.url) {
        toast.error("Erro: URL de pagamento não gerada.");
        setDebitopayLoading(false);
        return;
      }

      // O carrinho só é esvaziado depois do pagamento (página de sucesso)
      window.location.href = data.url;
    } catch (error) {
      console.error("Error calling Débito Pay:", error);
      toast.error("Erro ao conectar com o Débito Pay.");
      setDebitopayLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!province || !payment) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!user) {
      toast.error("Faça login para continuar.");
      navigate("/login");
      return;
    }

    if (payment === "mpesa_auto" && !isValidMpesaPhone(mpesaPhone)) {
      toast.error("Número M-Pesa inválido. Deve começar por 84 ou 85.");
      return;
    }

    if (!proofFile && !AUTO_METHODS.includes(payment)) {
      toast.error("Anexe o comprovante de pagamento.");
      return;
    }

    setUploading(true);

    try {
      let affiliateId: string | null = null;
      const refCode = localStorage.getItem("affiliate_ref");

      if (refCode) {
        const { data: aff } = await supabase
          .from("affiliates")
          .select("id, user_id")
          .eq("affiliate_code", refCode)
          .eq("status", "active")
          .single();

        if (aff && aff.user_id !== user.id) {
          affiliateId = aff.id;
        }
      }

      const paymentMethodMap: Record<string, string> = {
        mpesa_auto: "debitopay",
        emola: "mpesa",
        debitopay: "debitopay",
      };

      const isAuto = AUTO_METHODS.includes(payment);

      // A comissão do afiliado é criada pelo servidor (gatilho na base de dados)
      // e aprovada automaticamente quando o pedido passa a "paid".
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total_mzn: grandTotal,
          status: isAuto ? "processing" : "pending",
          payment_method: paymentMethodMap[payment] as "mpesa" | "debitopay",
          shipping_address: {
            province,
            city: formData.city,
            bairro: formData.bairro,
            reference: formData.reference,
            name: formData.name,
            phone: formData.phone,
            payment_detail: payment,
          },
          ...(affiliateId ? { affiliate_id: affiliateId } : {}),
        } as any)
        .select()
        .single();

      if (error || !order) {
        console.error("Order creation error:", error);
        toast.error("Erro ao criar pedido.");
        setUploading(false);
        return;
      }

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price_mzn: item.price,
      }));

      // Pagamentos automáticos (Débito Pay)
      if (isAuto) {
        await supabase.from("order_items").insert(orderItems);

        if (affiliateId) localStorage.removeItem("affiliate_ref");

        setUploading(false);
        if (payment === "mpesa_auto") {
          toast.info("Confirme o pagamento no seu telemóvel (introduza o PIN do M-Pesa).", { duration: 15000 });
          await handleDebitopayCheckout(order.id, "mpesa", normalizeMpesaPhone(mpesaPhone));
        } else {
          await handleDebitopayCheckout(order.id, "card");
        }
        return;
      }

      // Pagamento manual (e-Mola) com comprovante
      const proofUrl = await uploadProof(order.id);

      if (proofUrl) {
        await supabase.from("orders").update({ payment_proof_url: proofUrl }).eq("id", order.id);
      }

      await supabase.from("order_items").insert(orderItems);

      if (affiliateId) localStorage.removeItem("affiliate_ref");

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
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Erro ao processar pedido.");
      setUploading(false);
    }
  };

  if (submitted) return null;

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="container flex flex-1 items-center justify-center py-20 px-4">
          <div className="text-center">
            <p className="text-muted-foreground">Carrinho vazio.</p>
            <Button className="mt-4" asChild>
              <Link to="/catalogo">Ver Catálogo</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const submitLabel = (withTotal: boolean) => {
    const total = withTotal ? ` • ${grandTotal.toLocaleString("pt-MZ")} MZN` : "";
    if (debitopayLoading) return payment === "mpesa_auto" ? "Confirme no telemóvel..." : "Redirecionando...";
    if (uploading) return "Enviando...";
    if (payment === "mpesa_auto") return `Pagar com M-Pesa${total}`;
    if (payment === "debitopay") return `Pagar com cartão${total}`;
    return `Confirmar Pedido${total}`;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 px-4 py-6 sm:py-8">
        <Button variant="ghost" size="sm" className="mb-3" asChild>
          <Link to="/carrinho">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Link>
        </Button>
        <h1 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl">Checkout</h1>

        {!user && (
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:mb-6 sm:p-4">
            <p className="text-sm">
              Precisa de uma conta para finalizar.{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Entrar
              </Link>{" "}
              ou{" "}
              <Link to="/registrar" className="font-medium text-primary hover:underline">
                Registar
              </Link>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Order summary */}
          <div className="order-first lg:order-last">
            <div className="lg:sticky lg:top-28 rounded-xl border p-4 sm:p-6 shadow-card space-y-4">
              <h2 className="text-base font-semibold sm:text-lg">Resumo do Pedido</h2>
              <div className="max-h-48 sm:max-h-60 space-y-3 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 sm:gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                    </div>
                    <p className="text-xs sm:text-sm font-medium shrink-0">
                      {(item.price * item.quantity).toLocaleString("pt-MZ")} MZN
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{totalPrice.toLocaleString("pt-MZ")} MZN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{shippingCost.toLocaleString("pt-MZ")} MZN</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base sm:text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{grandTotal.toLocaleString("pt-MZ")} MZN</span>
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                className="hidden w-full lg:flex"
                disabled={!user || uploading || debitopayLoading}
              >
                {submitLabel(false)}
              </Button>
            </div>
          </div>

          {/* Form fields */}
          <div className="order-last lg:order-first space-y-4 sm:space-y-6">
            {/* Delivery info */}
            <div className="rounded-xl border p-4 sm:p-6 shadow-card space-y-3 sm:space-y-4">
              <h2 className="text-base font-semibold sm:text-lg">Dados de Entrega</h2>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm">Nome Completo</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm">Telefone</Label>
                  <Input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+258 8X XXX XXXX"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Província</Label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shippingRates.map((r) => (
                      <SelectItem key={r.id} value={r.province}>
                        {r.province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm">Cidade</Label>
                  <Input
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm">Bairro</Label>
                  <Input
                    required
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Referência</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Ponto de referência (opcional)"
                />
              </div>
            </div>

            {/* Payment methods */}
            <div className="rounded-xl border p-4 sm:p-6 shadow-card space-y-3 sm:space-y-4">
              <h2 className="text-base font-semibold sm:text-lg">Método de Pagamento</h2>
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                {paymentMethods.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => {
                      setPayment(m.id);
                      setProofFile(null);
                      if (m.id === "mpesa_auto" && !mpesaPhone) setMpesaPhone(formData.phone);
                    }}
                    className={`flex items-start gap-3 rounded-lg border p-3 sm:p-4 text-left transition-all ${
                      payment === m.id
                        ? "border-primary bg-primary/5 shadow-card"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <m.icon
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        payment === m.id ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-xs text-muted-foreground break-words">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {payment === "mpesa_auto" && (
                <div className="rounded-lg bg-muted p-3 sm:p-4 text-sm space-y-3">
                  <p className="font-medium">📱 M-Pesa (automático):</p>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">Número M-Pesa que vai pagar *</Label>
                    <Input
                      required
                      inputMode="numeric"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      placeholder="84 XXX XXXX ou 85 XXX XXXX"
                    />
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm text-muted-foreground">
                    <li>Toque em "Pagar com M-Pesa"</li>
                    <li>Vai aparecer um pedido no seu telemóvel</li>
                    <li>Introduza o PIN do M-Pesa para confirmar</li>
                    <li>
                      Total: <strong className="text-foreground">{grandTotal.toLocaleString("pt-MZ")} MZN</strong>
                    </li>
                  </ol>
                  <p className="text-xs text-muted-foreground">Sem comprovante: o pedido é confirmado automaticamente.</p>
                </div>
              )}

              {payment === "emola" && (
                <div className="rounded-lg bg-muted p-3 sm:p-4 text-sm space-y-2 sm:space-y-3">
                  <p className="font-medium">📱 Instruções e-Mola:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm text-muted-foreground">
                    <li>Abra o e-Mola no seu telefone</li>
                    <li>
                      Envie <strong className="text-foreground">{grandTotal.toLocaleString("pt-MZ")} MZN</strong>
                    </li>
                    <li>
                      Para: <strong className="text-foreground">868 214 712</strong>
                    </li>
                    <li>
                      Nome: <strong className="text-foreground">Zelida Isac Marenço</strong>
                    </li>
                    <li>Tire screenshot e anexe abaixo</li>
                  </ol>
                </div>
              )}

              {payment === "debitopay" && (
                <div className="rounded-lg bg-muted p-3 sm:p-4 text-sm space-y-2 sm:space-y-3">
                  <p className="font-medium">⚡ Cartão Visa / Mastercard (Automático):</p>
                  <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                    <li>✅ Pagamento automático e seguro</li>
                    <li>✅ Confirmação instantânea</li>
                    <li>✅ Sem necessidade de comprovante</li>
                    <li>
                      💰 Total: <strong className="text-foreground">{grandTotal.toLocaleString("pt-MZ")} MZN</strong>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Será redirecionado para a página segura de pagamento do Débito Pay.
                  </p>
                </div>
              )}

              {payment === "emola" && (
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
                      <span className="text-muted-foreground shrink-0">
                        ({(proofFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile button */}
            <div className="lg:hidden sticky bottom-0 -mx-4 bg-background border-t p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
              <Button type="submit" size="lg" className="w-full" disabled={!user || uploading || debitopayLoading}>
                {submitLabel(true)}
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

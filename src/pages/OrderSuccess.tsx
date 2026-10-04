import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Package, Clock, ArrowRight } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  processing: "A processar",
  paid: "Pago",
  accepted: "Aceite",
  rejected: "Rejeitado",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const PAID_STATES = ["paid", "shipped", "delivered"];
const FAILED_STATES = ["cancelled", "rejected"];

const paymentLabel = (method?: string) => {
  if (method === "debitopay") return "Débito Pay (cartão)";
  if (method === "mpesa") return "M-Pesa / e-Mola";
  return "Transferência Bancária";
};

const OrderSuccess = () => {
  const { user } = useAuth();
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");
  const returnStatus = searchParams.get("status"); // success | failed (devolvido pelo Débito Pay)
  const cameFromDebitopay = searchParams.get("debitopay") === "true";
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const isDebitopay = cameFromDebitopay || order?.payment_method === "debitopay";

  // Pagamento Débito Pay: só esvazia o carrinho se não falhou
  useEffect(() => {
    if (cameFromDebitopay && returnStatus !== "failed") clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameFromDebitopay, returnStatus]);

  useEffect(() => {
    if (!user || !orderId) return;
    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setInterval> | undefined;

    const load = async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).eq("user_id", user.id).single();
      if (cancelled) return null;
      if (o) setOrder(o);
      const { data: oi } = await supabase.from("order_items").select("*, products(name, images)").eq("order_id", orderId);
      if (!cancelled && oi) setItems(oi);
      return o;
    };

    load().then((o) => {
      // O estado do Débito Pay chega por webhook: volta a consultar durante ~1 minuto
      if (cancelled || !o || o.payment_method !== "debitopay" || o.status !== "processing") return;
      timer = setInterval(async () => {
        tries += 1;
        const updated = await load();
        if (!updated || updated.status !== "processing" || tries >= 12) clearInterval(timer);
      }, 5000);
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [user, orderId]);

  // Estado a mostrar (só para pagamentos Débito Pay)
  const failed = isDebitopay && (returnStatus === "failed" || FAILED_STATES.includes(order?.status));
  const paid = isDebitopay && !failed && PAID_STATES.includes(order?.status);
  const confirming = isDebitopay && !failed && !paid;

  let title = "Pedido Confirmado!";
  let message = "O seu comprovante foi enviado. O administrador irá verificar e confirmar o pagamento em breve.";
  if (isDebitopay) {
    if (failed) {
      title = "Pagamento não concluído";
      message = "O pagamento não foi aprovado e nenhum valor foi cobrado. Os seus produtos continuam no carrinho — pode tentar novamente.";
    } else if (paid) {
      title = "Pagamento recebido!";
      message = "Recebemos o seu pagamento. Vamos preparar o seu pedido.";
    } else {
      title = "A confirmar o pagamento…";
      message = "Estamos a aguardar a confirmação do Débito Pay. Esta página atualiza sozinha.";
    }
  }

  const StatusIcon = failed ? XCircle : confirming ? Clock : CheckCircle;
  const iconColor = failed ? "text-destructive" : "text-primary";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <StatusIcon className={`mx-auto h-20 w-20 ${iconColor}`} />
          <h1 className="mt-4 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-muted-foreground">{message}</p>

          {order && (
            <div className="mt-8 rounded-xl border bg-card p-6 text-left shadow-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Número do Pedido</p>
                  <p className="font-mono font-bold text-lg">#{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  <Clock className="mr-1 h-3 w-3" />
                  {statusLabels[order.status] || order.status}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">{new Date(order.created_at).toLocaleDateString("pt-MZ", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Método de Pagamento</p>
                  <p className="font-medium capitalize">{paymentLabel(order.payment_method)}</p>
                </div>
              </div>

              {items.length > 0 && (
                <div className="border-t pt-4 space-y-3">
                  <p className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Itens do Pedido</p>
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <img
                        src={item.products?.images?.[0] || "/placeholder.svg"}
                        alt={item.products?.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">{item.products?.name || "Produto"}</p>
                        <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">{Number(item.price_mzn * item.quantity).toLocaleString("pt-MZ")} MZN</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-4 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{Number(order.total_mzn).toLocaleString("pt-MZ")} MZN</span>
              </div>

              {order.payment_proof_url && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Comprovante Enviado ✓</p>
                  <img src={order.payment_proof_url} alt="Comprovante" className="h-32 rounded-lg border object-cover" />
                </div>
              )}
            </div>
          )}

          <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <p>📱 Dúvidas? Fale connosco no <a href="https://wa.me/258868214712" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">WhatsApp</a> ou ligue para <strong>868 214 712</strong></p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {failed ? (
              <Button asChild>
                <Link to="/checkout">Tentar novamente <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/conta">Ver Meus Pedidos <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/catalogo">Continuar Comprando</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderSuccess;

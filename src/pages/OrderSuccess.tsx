import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Clock, ArrowRight } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const OrderSuccess = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !orderId) return;
    const fetch = async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).eq("user_id", user.id).single();
      if (o) setOrder(o);
      const { data: oi } = await supabase.from("order_items").select("*, products(name, images)").eq("order_id", orderId);
      if (oi) setItems(oi);
    };
    fetch();
  }, [user, orderId]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <CheckCircle className="mx-auto h-20 w-20 text-primary" />
          <h1 className="mt-4 text-3xl font-bold">Pedido Confirmado!</h1>
          <p className="mt-2 text-muted-foreground">
            O seu comprovante foi enviado. O administrador irá verificar e confirmar o pagamento em breve.
          </p>

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
                  <p className="font-medium capitalize">{order.payment_method === "mpesa" ? "M-Pesa / e-Mola" : "Transferência Bancária"}</p>
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

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild>
              <Link to="/conta">Ver Meus Pedidos <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
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

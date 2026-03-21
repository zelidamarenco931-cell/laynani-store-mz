import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, Truck, Package } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Pendente", paid: "Pago", shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado",
};
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800", paid: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800", delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [trackingCode, setTrackingCode] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*, profiles!orders_user_id_fkey(name, email, phone)").order("created_at", { ascending: false });
    if (data) setOrders(data);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) toast.error("Erro ao actualizar.");
    else { toast.success(`Status: ${statusLabels[status]}`); fetchOrders(); }
  };

  const addTracking = async (orderId: string) => {
    if (!trackingCode.trim()) return;
    const { error } = await supabase.from("orders").update({ tracking_code: trackingCode, status: "shipped" as OrderStatus }).eq("id", orderId);
    if (error) toast.error("Erro.");
    else { toast.success("Código de rastreio adicionado!"); setTrackingCode(""); fetchOrders(); }
  };

  const getPaymentDetail = (order: any) => {
    const detail = order.shipping_address?.payment_detail;
    if (detail === "mpesa") return "M-Pesa (852506942)";
    if (detail === "emola") return "e-Mola (868214712)";
    if (detail === "bank") return "Transferência BIM";
    return order.payment_method || "—";
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Pedidos</h1>
      <div className="space-y-3">
        {orders.length === 0 && <p className="text-muted-foreground">Nenhum pedido.</p>}
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">#{order.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">
                  {order.profiles?.name || order.profiles?.email} • {new Date(order.created_at).toLocaleDateString("pt-MZ")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pagamento: <strong>{getPaymentDetail(order)}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status]}`}>
                  {statusLabels[order.status]}
                </span>
                <span className="font-bold text-primary">{Number(order.total_mzn).toLocaleString("pt-MZ")} MZN</span>
              </div>
            </div>

            {order.tracking_code && (
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3" /> Rastreio: <strong>{order.tracking_code}</strong>
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {/* Comprovante */}
              {order.payment_proof_url && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => setProofUrl(order.payment_proof_url)}>
                      <Eye className="mr-1 h-4 w-4" /> Ver Comprovante
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Comprovante de Pagamento</DialogTitle></DialogHeader>
                    <div className="flex justify-center">
                      <img
                        src={order.payment_proof_url}
                        alt="Comprovante"
                        className="max-h-[60vh] rounded-lg object-contain"
                      />
                    </div>
                    {order.status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <Button className="flex-1" onClick={() => updateStatus(order.id, "paid")}>
                          <CheckCircle className="mr-1 h-4 w-4" /> Aceitar Pagamento
                        </Button>
                        <Button variant="destructive" className="flex-1" onClick={() => updateStatus(order.id, "cancelled")}>
                          <XCircle className="mr-1 h-4 w-4" /> Rejeitar
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              )}

              {/* Ações por status */}
              {order.status === "pending" && !order.payment_proof_url && (
                <>
                  <Button size="sm" onClick={() => updateStatus(order.id, "paid")}>
                    <CheckCircle className="mr-1 h-4 w-4" /> Confirmar Pagamento
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => updateStatus(order.id, "cancelled")}>
                    <XCircle className="mr-1 h-4 w-4" /> Cancelar
                  </Button>
                </>
              )}

              {order.status === "paid" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Truck className="mr-1 h-4 w-4" /> Enviar + Rastreio
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Código de Rastreio</DialogTitle></DialogHeader>
                    <Input value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="Código de rastreio" />
                    <Button onClick={() => addTracking(order.id)}>Salvar e Marcar Enviado</Button>
                  </DialogContent>
                </Dialog>
              )}

              {order.status === "shipped" && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, "delivered")}>
                  <CheckCircle className="mr-1 h-4 w-4" /> Marcar Entregue
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOrders;

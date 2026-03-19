import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

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
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingCode, setTrackingCode] = useState("");

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
                <p className="text-xs text-muted-foreground">{order.profiles?.name || order.profiles?.email} • {new Date(order.created_at).toLocaleDateString("pt-MZ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status]}`}>
                  {statusLabels[order.status]}
                </span>
                <span className="font-bold text-primary">{Number(order.total_mzn).toLocaleString("pt-MZ")} MZN</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {order.status === "pending" && (
                <Button size="sm" onClick={() => updateStatus(order.id, "paid")}>Confirmar Pagamento</Button>
              )}
              {order.status === "paid" && (
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" variant="outline">Enviar + Rastreio</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Código de Rastreio</DialogTitle></DialogHeader>
                    <Input value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="Código de rastreio" />
                    <Button onClick={() => addTracking(order.id)}>Salvar e Marcar Enviado</Button>
                  </DialogContent>
                </Dialog>
              )}
              {order.status === "shipped" && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, "delivered")}>Marcar Entregue</Button>
              )}
              {order.payment_proof_url && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={order.payment_proof_url} target="_blank" rel="noopener">Ver Comprovante</a>
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

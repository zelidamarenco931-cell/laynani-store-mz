import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, Eye, Truck, Package, MessageCircle, Search, RefreshCw,
  ChevronDown, ChevronUp, MapPin, Clock, Wallet, ShoppingBag, Zap, Download, AlertTriangle,
} from "lucide-react";

type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

const statusLabels: Record<string, string> = {
  pending: "Pendente", processing: "A processar", paid: "Pago", shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado",
};
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800", processing: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800", shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800",
};
const filterTabs: { key: "all" | OrderStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "paid", label: "Pagos" },
  { key: "shipped", label: "Enviados" },
  { key: "delivered", label: "Entregues" },
  { key: "cancelled", label: "Cancelados" },
];

// "processing" conta como pendente nos filtros e no resumo
const groupStatus = (s: string) => (s === "processing" ? "pending" : s);

const paymentFilters = [
  { key: "all", label: "Todos os pagamentos" },
  { key: "mpesa_auto", label: "M-Pesa automático" },
  { key: "debitopay", label: "Cartão Visa / Mastercard" },
  { key: "emola", label: "e-Mola" },
  { key: "other", label: "Outros" },
];
const periodFilters = [
  { key: "all", label: "Todo o período" },
  { key: "today", label: "Hoje" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
];
// Pedidos "A processar" há mais tempo do que isto, sem pagamento confirmado, consideram-se abandonados
const STALE_MINUTES = 60;

const paymentKey = (o: any) => {
  const detail = o.shipping_address?.payment_detail;
  if (detail === "mpesa_auto" || detail === "emola" || detail === "debitopay") return detail;
  if (o.payment_method === "debitopay") return "debitopay";
  if (o.payment_method === "emola") return "emola";
  return "other";
};
const minutesSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const fmt = (n: number) => Number(n || 0).toLocaleString("pt-MZ");
const normalizePhone = (raw?: string) => {
  const phone = (raw || "").replace(/\D/g, "");
  if (!phone) return "";
  return phone.startsWith("258") ? phone : `258${phone}`;
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingCode, setTrackingCode] = useState("");
  const [filter, setFilter] = useState<"all" | OrderStatus>("paid");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      toast.error("Erro ao carregar pedidos.");
      setLoading(false);
      return;
    }
    if (!ordersData || ordersData.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(ordersData.map((o) => o.user_id))];
    const orderIds = ordersData.map((o) => o.id);

    const [{ data: profiles }, { data: items }] = await Promise.all([
      supabase.from("profiles").select("user_id, name, email, phone").in("user_id", userIds),
      supabase
        .from("order_items")
        .select("order_id, quantity, price_mzn, product_id, products(name, images)")
        .in("order_id", orderIds),
    ]);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p) => { profileMap[p.user_id] = p; });

    const itemsMap: Record<string, any[]> = {};
    ((items as any[]) || []).forEach((it) => {
      (itemsMap[it.order_id] ||= []).push(it);
    });

    setOrders(
      ordersData.map((o) => ({
        ...o,
        profile: profileMap[o.user_id] || null,
        items: itemsMap[o.id] || [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  // Actualiza sozinho quando o Débito Pay confirma um pagamento (webhook)
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { fetchOrders(); })
      .subscribe();
    const interval = setInterval(fetchOrders, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const notifyCustomerWhatsApp = (order: any, accepted: boolean) => {
    const phoneNum = normalizePhone(order.shipping_address?.phone);
    if (!phoneNum) return;
    const status = accepted ? "✅ *ACEITE*" : "❌ *REJEITADO*";
    const msg = encodeURIComponent(
      `${status}\n\n` +
      `Olá ${order.shipping_address?.name || "Cliente"},\n\n` +
      `O comprovante do seu pedido #${order.id.slice(0, 8).toUpperCase()} foi ${accepted ? "aceite" : "rejeitado"}.\n` +
      `💰 Total: ${fmt(order.total_mzn)} MZN\n\n` +
      (accepted
        ? "O seu pedido será processado em breve. Obrigado!"
        : "Por favor, envie um novo comprovante ou entre em contacto connosco.")
    );
    window.open(`https://wa.me/${phoneNum}?text=${msg}`, "_blank");
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) { toast.error("Erro ao actualizar."); return; }
    toast.success(`Estado: ${statusLabels[status]}`);
    const order = orders.find((o) => o.id === orderId);
    if (order && (status === "paid" || status === "cancelled")) notifyCustomerWhatsApp(order, status === "paid");
    fetchOrders();
  };

  const addTracking = async (orderId: string) => {
    if (!trackingCode.trim()) return;
    const { error } = await supabase
      .from("orders")
      .update({ tracking_code: trackingCode.trim(), status: "shipped" as OrderStatus })
      .eq("id", orderId);
    if (error) toast.error("Erro.");
    else { toast.success("Código de rastreio adicionado!"); setTrackingCode(""); fetchOrders(); }
  };

  const isAuto = (order: any) => !!order.debitopay_payment_id;

  const getPaymentDetail = (order: any) => {
    if (isAuto(order)) return "Débito Pay (automático)";
    const detail = order.shipping_address?.payment_detail;
    if (detail === "mpesa") return "M-Pesa";
    if (detail === "emola") return "e-Mola";
    if (detail === "debitopay") return "Débito Pay (automático)";
    if (detail === "bank") return "Transferência bancária";
    return order.payment_method || "—";
  };

  const stats = useMemo(() => {
    const count = (s: string) => orders.filter((o) => groupStatus(o.status) === s).length;
    const sum = (list: any[]) => list.reduce((acc, o) => acc + Number(o.total_mzn || 0), 0);
    const today = new Date().toDateString();
    const paidLike = orders.filter((o) => ["paid", "shipped", "delivered"].includes(o.status));
    return {
      pending: count("pending"),
      toShip: count("paid"),
      revenue: sum(paidLike),
      today: orders.filter((o) => new Date(o.created_at).toDateString() === today).length,
    };
  }, [orders]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    orders.forEach((o) => { const k = groupStatus(o.status); c[k] = (c[k] || 0) + 1; });
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const cutoff =
      periodFilter === "today" ? startToday.getTime()
      : periodFilter === "7d" ? now - 7 * 86_400_000
      : periodFilter === "30d" ? now - 30 * 86_400_000
      : 0;
    return orders.filter((o) => {
      if (filter !== "all" && groupStatus(o.status) !== filter) return false;
      if (paymentFilter !== "all" && paymentKey(o) !== paymentFilter) return false;
      if (cutoff && new Date(o.created_at).getTime() < cutoff) return false;
      if (!q) return true;
      const hay = [
        o.id,
        o.profile?.name, o.profile?.email, o.profile?.phone,
        o.shipping_address?.name, o.shipping_address?.phone,
        o.tracking_code,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [orders, filter, search, paymentFilter, periodFilter]);

  const staleOrders = useMemo(
    () => orders.filter((o) => o.status === "processing" && minutesSince(o.created_at) >= STALE_MINUTES),
    [orders],
  );

  const cancelStale = async () => {
    if (staleOrders.length === 0) return;
    if (!window.confirm(`Cancelar ${staleOrders.length} pedido(s) "A processar" sem pagamento confirmado há mais de ${STALE_MINUTES} minutos?`)) return;
    const ids = staleOrders.map((o) => o.id);
    const { error } = await supabase.from("orders").update({ status: "cancelled" } as any).in("id", ids).eq("status", "processing" as any);
    if (error) { toast.error("Erro ao cancelar pedidos."); return; }
    toast.success(`${ids.length} pedido(s) cancelado(s).`);
    fetchOrders();
  };

  const exportCsv = () => {
    if (visible.length === 0) { toast.error("Não há pedidos para exportar."); return; }
    const header = ["Pedido", "Data", "Cliente", "Telefone", "Província", "Cidade", "Pagamento", "Estado", "Total (MZN)", "Rastreio"];
    const rows = visible.map((o) => {
      const a = o.shipping_address || {};
      return [
        `#${String(o.id).slice(0, 8).toUpperCase()}`,
        new Date(o.created_at).toLocaleString("pt-MZ"),
        a.name || o.profile?.name || o.profile?.email || "Cliente",
        a.phone || o.profile?.phone || "",
        a.province || "", a.city || "",
        getPaymentDetail(o), statusLabels[o.status] || o.status,
        Number(o.total_mzn || 0), o.tracking_code || "",
      ];
    });
    const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>
      </div>

      {/* Pedidos abandonados */}
      {staleOrders.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm dark:border-orange-900 dark:bg-orange-950/30">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <span>
              {staleOrders.length} {staleOrders.length === 1 ? "pedido está" : "pedidos estão"} "A processar" há mais de {STALE_MINUTES} minutos sem pagamento confirmado.
            </span>
          </p>
          <Button size="sm" variant="outline" onClick={cancelStale}>
            Cancelar {staleOrders.length === 1 ? "este" : "todos"}
          </Button>
        </div>
      )}

      {/* Resumo */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border p-3 shadow-card">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> A aguardar pagamento</p>
          <p className="text-xl font-bold">{stats.pending}</p>
        </div>
        <div className="rounded-xl border p-3 shadow-card">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Truck className="h-3 w-3" /> Por enviar</p>
          <p className="text-xl font-bold">{stats.toShip}</p>
        </div>
        <div className="rounded-xl border p-3 shadow-card">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><ShoppingBag className="h-3 w-3" /> Pedidos hoje</p>
          <p className="text-xl font-bold">{stats.today}</p>
        </div>
        <div className="rounded-xl border p-3 shadow-card">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Wallet className="h-3 w-3" /> Vendas (pagos)</p>
          <p className="text-xl font-bold text-primary">{fmt(stats.revenue)} MZN</p>
        </div>
      </div>

      {/* Pesquisa e filtros */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nº do pedido, cliente, telefone ou rastreio"
          className="pl-9"
        />
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === t.key ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
            }`}
          >
            {t.label} ({counts[t.key] || 0})
          </button>
        ))}
      </div>
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{paymentFilters.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{periodFilters.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {loading && orders.length === 0 && <p className="text-muted-foreground">A carregar…</p>}
        {!loading && visible.length === 0 && <p className="text-muted-foreground">Nenhum pedido encontrado.</p>}

        {visible.map((order) => {
          const isOpen = expanded === order.id;
          const addr = order.shipping_address || {};
          const customerName = addr.name || order.profile?.name || order.profile?.email || "Cliente";
          const phoneNum = normalizePhone(addr.phone || order.profile?.phone);
          const firstImage = order.items?.[0]?.products?.images?.[0];
          const waiting = ["pending", "processing"].includes(order.status);
          // Só pedidos antigos, com comprovante e sem Débito Pay, precisam de revisão manual
          const legacyProof = waiting && !isAuto(order) && !!order.payment_proof_url;

          return (
            <div key={order.id} className="rounded-xl border p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex gap-3">
                  {firstImage ? (
                    <img src={firstImage} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {customerName} • {new Date(order.created_at).toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Pagamento: <strong>{getPaymentDetail(order)}</strong>
                      {order.items?.length > 0 && <> • {order.items.reduce((a: number, i: any) => a + i.quantity, 0)} artigo(s)</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status] || ""}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                  <span className="font-bold text-primary">{fmt(order.total_mzn)} MZN</span>
                </div>
              </div>

              {order.tracking_code && (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Package className="h-3 w-3" /> Rastreio: <strong>{order.tracking_code}</strong>
                </p>
              )}

              {waiting && !legacyProof && (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" /> A aguardar pagamento — será confirmado automaticamente pelo Débito Pay.
                </p>
              )}

              {/* Detalhes */}
              <button
                onClick={() => setExpanded(isOpen ? null : order.id)}
                className="mt-2 flex items-center gap-1 text-xs font-medium text-primary"
              >
                {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {isOpen ? "Ocultar detalhes" : "Ver detalhes"}
              </button>

              {isOpen && (
                <div className="mt-3 space-y-3 rounded-lg bg-muted/40 p-3 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Produtos</p>
                    {order.items.length === 0 && <p className="text-xs text-muted-foreground">Sem itens registados.</p>}
                    {order.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between gap-2 py-1">
                        <div className="flex min-w-0 items-center gap-2">
                          {it.products?.images?.[0] && (
                            <img src={it.products.images[0]} alt="" className="h-8 w-8 rounded object-cover" />
                          )}
                          <span className="truncate">{it.products?.name || "Produto removido"}</span>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {it.quantity} × {fmt(it.price_mzn)} MZN
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                      <MapPin className="h-3 w-3" /> Entrega
                    </p>
                    <p>{addr.name || customerName}</p>
                    {addr.phone && <p className="text-xs text-muted-foreground">{addr.phone}</p>}
                    <p className="text-xs text-muted-foreground">
                      {[addr.address, addr.city, addr.province].filter(Boolean).join(", ") || "Sem morada registada"}
                    </p>
                  </div>
                </div>
              )}

              {/* Acções */}
              <div className="mt-3 flex flex-wrap gap-2">
                {order.payment_proof_url && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Eye className="mr-1 h-4 w-4" /> Ver Comprovante
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader><DialogTitle>Comprovante de Pagamento</DialogTitle></DialogHeader>
                      <div className="flex justify-center">
                        <img src={order.payment_proof_url} alt="Comprovante" className="max-h-[60vh] rounded-lg object-contain" />
                      </div>
                      {legacyProof && (
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
                      <Button onClick={() => addTracking(order.id)}>Guardar e Marcar Enviado</Button>
                    </DialogContent>
                  </Dialog>
                )}

                {order.status === "shipped" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, "delivered")}>
                    <CheckCircle className="mr-1 h-4 w-4" /> Marcar Entregue
                  </Button>
                )}

                {phoneNum && (
                  <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/${phoneNum}`, "_blank")}>
                    <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminOrders;

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle, Clock, DollarSign, Package, Receipt, ShoppingBag, Users,
} from "lucide-react";

const PERIODS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
  { days: 365, label: "12 meses" },
];

const PAID = ["paid", "shipped", "delivered"];
const STATUS_LABEL: Record<string, string> = { pending: "Pendente", paid: "Pago", shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado" };
const STATUS_COLOR: Record<string, string> = { pending: "#f59e0b", paid: "#10b981", shipped: "#3b82f6", delivered: "#6366f1", cancelled: "#ef4444" };

const fmt = (n: number) => Math.round(n).toLocaleString("pt-MZ");
const pctChange = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100);

interface Order { id: string; total_mzn: number; status: string; created_at: string; user_id: string | null }

const Trend = ({ value }: { value: number }) => {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value).toFixed(0)}%
    </span>
  );
};

const AdminDashboard = () => {
  const [days, setDays] = useState(30);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dados gerais (uma vez)
  useEffect(() => {
    (async () => {
      const [{ data: o }, { count: pc }, { count: cc }, { data: ls }] = await Promise.all([
        supabase.from("orders").select("id, total_mzn, status, created_at, user_id").order("created_at", { ascending: false }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("id, name, stock").lte("stock", 5).order("stock").limit(5),
      ]);
      const list = (o || []) as Order[];
      setOrders(list);
      setProductCount(pc || 0);
      setCustomers(cc || 0);
      setLowStock(ls || []);

      const ids = Array.from(new Set(list.slice(0, 6).map((x) => x.user_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: pr } = await supabase.from("profiles").select("user_id, name").in("user_id", ids);
        setNames(Object.fromEntries((pr || []).map((p: any) => [p.user_id, p.name])));
      }
      setLoading(false);
    })();
  }, []);

  // Janelas de tempo e séries
  const { buckets, since, prevSince } = useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    const list: { start: number; end: number; label: string }[] = [];
    if (days === 365) {
      for (let i = 11; i >= 0; i--) {
        const s = new Date(end.getFullYear(), end.getMonth() - i, 1);
        const e = new Date(end.getFullYear(), end.getMonth() - i + 1, 1);
        list.push({ start: s.getTime(), end: e.getTime(), label: s.toLocaleDateString("pt-MZ", { month: "short" }) });
      }
    } else {
      const step = days === 90 ? 7 : 1;
      const n = Math.ceil(days / step);
      for (let i = n - 1; i >= 0; i--) {
        const e = new Date(end);
        e.setDate(e.getDate() - i * step);
        const s = new Date(e);
        s.setDate(s.getDate() - step);
        list.push({ start: s.getTime(), end: e.getTime(), label: s.toLocaleDateString("pt-MZ", { day: "2-digit", month: "2-digit" }) });
      }
    }
    const sinceTs = list[0].start;
    return { buckets: list, since: sinceTs, prevSince: sinceTs - (end.getTime() - sinceTs) };
  }, [days]);

  // Produtos mais vendidos no período
  useEffect(() => {
    supabase
      .from("order_items")
      .select("quantity, price_mzn, product_id, products(name), orders!inner(status, created_at)")
      .gte("orders.created_at", new Date(since).toISOString())
      .in("orders.status", PAID)
      .then(({ data }) => setItems(data || []));
  }, [since]);

  const m = useMemo(() => {
    const ts = (o: Order) => new Date(o.created_at).getTime();
    const cur = orders.filter((o) => ts(o) >= since);
    const prev = orders.filter((o) => ts(o) >= prevSince && ts(o) < since);
    const rev = (l: Order[]) => l.filter((o) => PAID.includes(o.status)).reduce((s, o) => s + Number(o.total_mzn), 0);
    const paidCount = (l: Order[]) => l.filter((o) => PAID.includes(o.status)).length;

    const revenue = rev(cur), prevRevenue = rev(prev);
    const paid = paidCount(cur), prevPaid = paidCount(prev);
    const ticket = paid ? revenue / paid : 0;
    const prevTicket = prevPaid ? prevRevenue / prevPaid : 0;

    const series = buckets.map((b) => ({
      label: b.label,
      vendas: Math.round(
        cur.filter((o) => PAID.includes(o.status) && ts(o) >= b.start && ts(o) < b.end).reduce((s, o) => s + Number(o.total_mzn), 0),
      ),
    }));

    const counts: Record<string, number> = {};
    cur.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    const status = Object.entries(counts).map(([k, v]) => ({ key: k, name: STATUS_LABEL[k] || k, value: v }));

    return {
      revenue, revTrend: pctChange(revenue, prevRevenue),
      total: cur.length, ordersTrend: pctChange(cur.length, prev.length),
      ticket, ticketTrend: pctChange(ticket, prevTicket),
      paid, conversion: cur.length ? (paid / cur.length) * 100 : 0,
      pending: orders.filter((o) => o.status === "pending").length,
      series, status,
    };
  }, [orders, since, prevSince, buckets]);

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    items.forEach((i) => {
      const k = i.product_id;
      if (!map[k]) map[k] = { name: i.products?.name || "Produto", qty: 0, revenue: 0 };
      map[k].qty += i.quantity;
      map[k].revenue += i.quantity * Number(i.price_mzn);
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [items]);

  const kpis = [
    { title: "Receita", value: `${fmt(m.revenue)} MZN`, trend: m.revTrend, icon: DollarSign, tint: "bg-emerald-50 text-emerald-600" },
    { title: "Pedidos", value: m.total, trend: m.ordersTrend, icon: ShoppingBag, tint: "bg-blue-50 text-blue-600" },
    { title: "Ticket médio", value: `${fmt(m.ticket)} MZN`, trend: m.ticketTrend, icon: Receipt, tint: "bg-violet-50 text-violet-600" },
    { title: "Pendentes", value: m.pending, hint: "a aguardar ação", icon: Clock, tint: "bg-amber-50 text-amber-600" },
  ];

  const chartConfig = { vendas: { label: "Vendas (MZN)", color: "hsl(var(--primary))" } };
  const today = new Date().toLocaleDateString("pt-MZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (loading) return <p className="text-sm text-muted-foreground">A carregar dashboard...</p>;

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Dashboard</h1>
          <p className="text-sm capitalize text-muted-foreground">{today}</p>
        </div>
        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${days === p.days ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.title} className="min-w-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{k.title}</p>
                <span className={`rounded-lg p-2 ${k.tint}`}><k.icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-2 truncate text-lg font-bold sm:text-2xl">{k.value}</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                {"trend" in k && k.trend !== undefined ? (<><Trend value={k.trend} /> vs período anterior</>) : k.hint}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Indicadores secundários */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { t: "Taxa de pagamento", v: `${m.conversion.toFixed(0)}%`, i: CheckCircle },
          { t: "Produtos", v: productCount, i: Package },
          { t: "Clientes", v: customers, i: Users },
        ].map((s) => (
          <div key={s.t} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <s.i className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground">{s.t}</p>
              <p className="text-base font-semibold">{s.v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 overflow-hidden shadow-card lg:col-span-2">
          <CardHeader className="px-4 pb-2"><CardTitle className="text-sm sm:text-base">Evolução das vendas</CardTitle></CardHeader>
          <CardContent className="px-1 sm:px-4">
            <ChartContainer config={chartConfig} className="h-[230px] w-full sm:h-[290px]">
              <AreaChart data={m.series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-vendas)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-vendas)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="vendas" stroke="var(--color-vendas)" strokeWidth={2} fill="url(#fillVendas)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden shadow-card">
          <CardHeader className="px-4 pb-2"><CardTitle className="text-sm sm:text-base">Estado dos pedidos</CardTitle></CardHeader>
          <CardContent className="px-4">
            {m.status.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Sem pedidos neste período</p>
            ) : (
              <>
                <div className="h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={m.status} dataKey="value" innerRadius={48} outerRadius={75} paddingAngle={3}>
                        {m.status.map((s) => <Cell key={s.key} fill={STATUS_COLOR[s.key] || "#94a3b8"} />)}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {m.status.map((s) => (
                    <li key={s.key} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s.key] || "#94a3b8" }} />
                        {s.name}
                      </span>
                      <span className="font-medium">{s.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Listas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between px-4 pb-2">
            <CardTitle className="text-sm sm:text-base">Pedidos recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link to="/admin/pedidos">Ver todos</Link></Button>
          </CardHeader>
          <CardContent className="px-4">
            {orders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Ainda sem pedidos</p>
            ) : (
              <ul className="divide-y">
                {orders.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{(o.user_id && names[o.user_id]) || "Cliente"}</p>
                      <p className="text-xs text-muted-foreground">
                        #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("pt-MZ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{fmt(Number(o.total_mzn))} MZN</p>
                      <Badge variant="outline" className="mt-0.5 text-[10px]" style={{ borderColor: STATUS_COLOR[o.status], color: STATUS_COLOR[o.status] }}>
                        {STATUS_LABEL[o.status] || o.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="min-w-0 shadow-card">
            <CardHeader className="px-4 pb-2"><CardTitle className="text-sm sm:text-base">Mais vendidos</CardTitle></CardHeader>
            <CardContent className="px-4">
              {topProducts.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem vendas neste período</p>
              ) : (
                <ol className="space-y-2.5">
                  {topProducts.map((p, i) => (
                    <li key={p.name + i} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.qty} un.</span>
                      <span className="w-24 text-right text-sm font-medium">{fmt(p.revenue)} MZN</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 shadow-card">
            <CardHeader className="px-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Stock baixo
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {lowStock.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">Todos os produtos com stock suficiente</p>
              ) : (
                <ul className="space-y-2">
                  {lowStock.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{p.name}</span>
                      <Badge variant={p.stock === 0 ? "destructive" : "secondary"}>{p.stock === 0 ? "Esgotado" : `${p.stock} un.`}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

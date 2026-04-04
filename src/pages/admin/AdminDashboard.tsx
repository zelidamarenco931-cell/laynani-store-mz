import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingBag, Package, TrendingUp, Users, CheckCircle } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#ef4444"];

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalSales: 0, pendingOrders: 0, totalProducts: 0, totalOrders: 0, paidOrders: 0, totalCustomers: 0 });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [{ data: orders }, { count: productCount }, { count: customerCount }] = await Promise.all([
        supabase.from("orders").select("total_mzn, status, created_at"),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);

      const paidStatuses = ["paid", "shipped", "delivered"];
      const paidOrders = orders?.filter((o) => paidStatuses.includes(o.status)) || [];
      const totalSales = paidOrders.reduce((s, o) => s + Number(o.total_mzn), 0);
      const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;

      setStats({
        totalSales,
        pendingOrders,
        totalProducts: productCount || 0,
        totalOrders: orders?.length || 0,
        paidOrders: paidOrders.length,
        totalCustomers: customerCount || 0,
      });

      // Monthly sales data (last 6 months)
      const months: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString("pt-MZ", { month: "short", year: "2-digit" });
        months[key] = 0;
      }
      paidOrders.forEach((o) => {
        const d = new Date(o.created_at);
        const key = d.toLocaleDateString("pt-MZ", { month: "short", year: "2-digit" });
        if (key in months) months[key] += Number(o.total_mzn);
      });
      setMonthlyData(Object.entries(months).map(([month, vendas]) => ({ month, vendas: Math.round(vendas) })));

      // Status breakdown
      const statusCounts: Record<string, number> = {};
      orders?.forEach((o) => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      });
      const labels: Record<string, string> = { pending: "Pendente", paid: "Pago", shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado" };
      setStatusData(Object.entries(statusCounts).map(([status, count]) => ({ name: labels[status] || status, value: count })));
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Vendas (Aceites)", value: `${stats.totalSales.toLocaleString("pt-MZ")} MZN`, icon: DollarSign, color: "text-primary" },
    { title: "Pedidos Pendentes", value: stats.pendingOrders, icon: ShoppingBag, color: "text-orange-500" },
    { title: "Pedidos Aceites", value: stats.paidOrders, icon: CheckCircle, color: "text-green-500" },
    { title: "Total de Pedidos", value: stats.totalOrders, icon: TrendingUp, color: "text-blue-500" },
    { title: "Produtos", value: stats.totalProducts, icon: Package, color: "text-purple-500" },
    { title: "Clientes", value: stats.totalCustomers, icon: Users, color: "text-teal-500" },
  ];

  const chartConfig = {
    vendas: { label: "Vendas (MZN)", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.title} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Sales Bar Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Vendas Mensais (Aceites)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="vendas" fill="var(--color-vendas)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Order Status Pie Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Estado dos Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;

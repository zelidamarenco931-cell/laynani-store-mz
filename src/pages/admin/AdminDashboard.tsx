import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Package, TrendingUp } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalSales: 0, pendingOrders: 0, totalProducts: 0, totalOrders: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: orders } = await supabase.from("orders").select("total_mzn, status");
      const { count: productCount } = await supabase.from("products").select("*", { count: "exact", head: true });

      const totalSales = orders?.reduce((s, o) => s + Number(o.total_mzn), 0) || 0;
      const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;

      setStats({
        totalSales,
        pendingOrders,
        totalProducts: productCount || 0,
        totalOrders: orders?.length || 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Vendas Totais", value: `${stats.totalSales.toLocaleString("pt-MZ")} MZN`, icon: DollarSign, color: "text-primary" },
    { title: "Pedidos Pendentes", value: stats.pendingOrders, icon: ShoppingBag, color: "text-orange-500" },
    { title: "Total de Pedidos", value: stats.totalOrders, icon: TrendingUp, color: "text-green-500" },
    { title: "Produtos", value: stats.totalProducts, icon: Package, color: "text-blue-500" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;

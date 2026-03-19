import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const paymentLabels: Record<string, string> = {
  mpesa: "M-Pesa / e-Mola",
  paygate: "PayGate",
  dpo: "DPO Group",
  paypal: "PayPal",
  manual: "Manual",
};

const AdminFinancial = () => {
  const [byMethod, setByMethod] = useState<Record<string, { count: number; total: number }>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("orders").select("payment_method, total_mzn").in("status", ["paid", "shipped", "delivered"]);
      if (!data) return;
      const grouped: Record<string, { count: number; total: number }> = {};
      data.forEach((o) => {
        const method = o.payment_method || "manual";
        if (!grouped[method]) grouped[method] = { count: 0, total: 0 };
        grouped[method].count++;
        grouped[method].total += Number(o.total_mzn);
      });
      setByMethod(grouped);
    };
    fetch();
  }, []);

  const totalAll = Object.values(byMethod).reduce((s, v) => s + v.total, 0);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Financeiro</h1>
      <Card className="mb-6 shadow-card">
        <CardHeader><CardTitle className="text-muted-foreground text-sm">Receita Total</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-primary">{totalAll.toLocaleString("pt-MZ")} MZN</p></CardContent>
      </Card>
      <h2 className="mb-4 text-lg font-semibold">Por Método de Pagamento</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(byMethod).map(([method, data]) => (
          <Card key={method} className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{paymentLabels[method] || method}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{data.total.toLocaleString("pt-MZ")} MZN</p>
              <p className="text-xs text-muted-foreground">{data.count} pedido(s)</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {Object.keys(byMethod).length === 0 && <p className="text-muted-foreground">Nenhuma venda registada.</p>}
    </div>
  );
};

export default AdminFinancial;

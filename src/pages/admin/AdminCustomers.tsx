import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Mail, Phone, MapPin, Calendar, ShoppingBag } from "lucide-react";

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      const [{ data: profiles }, { data: orders }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("user_id, total_mzn"),
      ]);

      // Calcular total gasto e nº de pedidos por utilizador
      const orderMap: Record<string, { count: number; total: number }> = {};
      (orders || []).forEach(o => {
        const key = o.user_id;
        if (!orderMap[key]) orderMap[key] = { count: 0, total: 0 };
        orderMap[key].count++;
        orderMap[key].total += Number(o.total_mzn || 0);
      });

      // Remover perfis duplicados (manter só o user_id === id)
      const unique = (profiles || []).filter(p => p.id === p.user_id || !p.user_id);

      const combined = unique.map(p => ({
        ...p,
        name: p.name?.trim() || "—",
        orders: orderMap[p.user_id]?.count || 0,
        total_spent: orderMap[p.user_id]?.total || 0,
      }));

      setCustomers(combined);
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q)
    );
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{customers.length} registered customers</p>
        </div>
        <Badge variant="secondary">{customers.length} total</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Users className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No customers found</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold truncate">{c.name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Calendar className="h-3 w-3" />
                  {new Date(c.created_at).toLocaleDateString("pt-MZ")}
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                {c.email && (
                  <p className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-primary/60" /> {c.email}
                  </p>
                )}
                {c.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-primary/60" /> {c.phone}
                  </p>
                )}
                {c.province && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" /> {c.province}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {c.orders} order{c.orders !== 1 ? "s" : ""}
                </div>
                {c.total_spent > 0 && (
                  <span className="text-xs font-semibold text-foreground">
                    {c.total_spent.toLocaleString("pt-MZ")} MZN
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
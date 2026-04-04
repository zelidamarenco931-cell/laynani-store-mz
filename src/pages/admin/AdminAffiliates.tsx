import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, CheckCircle, XCircle, Ban, DollarSign, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminAffiliates = () => {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [{ data: affs }, { data: comms }, { data: pays }] = await Promise.all([
      supabase.from("affiliates").select("*").order("joined_at", { ascending: false }),
      supabase.from("affiliate_commissions").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliate_payouts").select("*").order("requested_at", { ascending: false }),
    ]);
    setAffiliates(affs || []);
    setCommissions(comms || []);
    setPayouts(pays || []);
    setLoading(false);
  };

  const updateAffiliateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("affiliates").update({ status } as any).eq("id", id);
    if (error) toast.error("Erro ao actualizar.");
    else { toast.success("Status actualizado!"); fetchAll(); }
  };

  const updateCommissionStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("affiliate_commissions").update({ status } as any).eq("id", id);
    if (error) toast.error("Erro.");
    else { toast.success("Comissão actualizada!"); fetchAll(); }
  };

  const updatePayoutStatus = async (id: string, status: string) => {
    const update: any = { status };
    if (status === "paid") update.paid_at = new Date().toISOString();
    const { error } = await supabase.from("affiliate_payouts").update(update).eq("id", id);
    if (error) toast.error("Erro.");
    else { toast.success("Pagamento actualizado!"); fetchAll(); }
  };

  const exportPayouts = () => {
    const csv = ["Data,Afiliado,Valor,Método,Conta,Status"]
      .concat(payouts.map((p) => `${p.requested_at},${p.affiliate_id},${p.amount_mzn},${p.method},${p.account_details},${p.status}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pagamentos_afiliados.csv"; a.click();
  };

  const statusLabels: Record<string, string> = { pending: "Pendente", active: "Activo", blocked: "Bloqueado", approved: "Aprovada", paid: "Paga", cancelled: "Cancelada", requested: "Solicitado" };
  const statusColors: Record<string, string> = { pending: "secondary", active: "default", blocked: "destructive", approved: "default", paid: "default", cancelled: "destructive", requested: "secondary" };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Gestão de Afiliados</h1>

      <Tabs defaultValue="affiliates">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="affiliates">Afiliados ({affiliates.length})</TabsTrigger>
          <TabsTrigger value="commissions">Comissões ({commissions.length})</TabsTrigger>
          <TabsTrigger value="payouts">Pagamentos ({payouts.length})</TabsTrigger>
        </TabsList>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates" className="space-y-4">
          {affiliates.length === 0 ? <p className="text-muted-foreground">Nenhum afiliado.</p> : (
            <div className="space-y-3">
              {affiliates.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                  <div>
                    <p className="font-medium">Código: <span className="text-primary">{a.affiliate_code}</span></p>
                    <p className="text-xs text-muted-foreground">FB: {(a as any).facebook || "—"} • IG: {(a as any).instagram || "—"} • TT: {(a as any).tiktok || "—"} • Comissão: {(Number(a.commission_rate) * 100).toFixed(0)}%</p>
                    {a.reason && <p className="text-xs text-muted-foreground mt-1">Motivo: {a.reason}</p>}
                    <p className="text-xs text-muted-foreground">Inscrito em: {new Date(a.joined_at).toLocaleDateString("pt-MZ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[a.status] as any}>{statusLabels[a.status]}</Badge>
                    {a.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => updateAffiliateStatus(a.id, "active")}><CheckCircle className="mr-1 h-4 w-4" /> Aprovar</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateAffiliateStatus(a.id, "blocked")}><XCircle className="mr-1 h-4 w-4" /> Rejeitar</Button>
                      </>
                    )}
                    {a.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => updateAffiliateStatus(a.id, "blocked")}><Ban className="mr-1 h-4 w-4" /> Bloquear</Button>
                    )}
                    {a.status === "blocked" && (
                      <Button size="sm" variant="outline" onClick={() => updateAffiliateStatus(a.id, "active")}>Reactivar</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-4">
          {commissions.length === 0 ? <p className="text-muted-foreground">Nenhuma comissão.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2">Data</th><th className="pb-2">Afiliado</th><th className="pb-2">Pedido</th><th className="pb-2">Valor</th><th className="pb-2">Status</th><th className="pb-2">Acções</th></tr></thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(c.created_at).toLocaleDateString("pt-MZ")}</td>
                      <td className="py-2">{c.affiliate_id?.slice(0, 8)}</td>
                      <td className="py-2">#{c.order_id?.slice(0, 8)}</td>
                      <td className="py-2 font-medium">{Number(c.amount_mzn).toLocaleString("pt-MZ")} MZN</td>
                      <td className="py-2"><Badge variant={statusColors[c.status] as any}>{statusLabels[c.status]}</Badge></td>
                      <td className="py-2 space-x-1">
                        {c.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateCommissionStatus(c.id, "approved")}>Aprovar</Button>
                            <Button size="sm" variant="destructive" onClick={() => updateCommissionStatus(c.id, "cancelled")}>Cancelar</Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportPayouts}><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button>
          </div>
          {payouts.length === 0 ? <p className="text-muted-foreground">Nenhum pagamento.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2">Data</th><th className="pb-2">Afiliado</th><th className="pb-2">Valor</th><th className="pb-2">Método</th><th className="pb-2">Conta</th><th className="pb-2">Status</th><th className="pb-2">Acções</th></tr></thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(p.requested_at).toLocaleDateString("pt-MZ")}</td>
                      <td className="py-2">{p.affiliate_id?.slice(0, 8)}</td>
                      <td className="py-2 font-medium">{Number(p.amount_mzn).toLocaleString("pt-MZ")} MZN</td>
                      <td className="py-2">{p.method === "mpesa" ? "M-Pesa" : p.method === "emola" ? "e-Mola" : "Banco"}</td>
                      <td className="py-2">{p.account_details}</td>
                      <td className="py-2"><Badge variant={statusColors[p.status] as any}>{statusLabels[p.status]}</Badge></td>
                      <td className="py-2 space-x-1">
                        {p.status === "requested" && (
                          <Button size="sm" variant="outline" onClick={() => updatePayoutStatus(p.id, "approved")}>Aprovar</Button>
                        )}
                        {p.status === "approved" && (
                          <Button size="sm" onClick={() => updatePayoutStatus(p.id, "paid")}><DollarSign className="mr-1 h-4 w-4" /> Marcar Pago</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAffiliates;

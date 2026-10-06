import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Ban, CheckCircle, Clock, DollarSign, Download, Facebook, Instagram, Mail, MousePointerClick, Phone, Search, Users, XCircle,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Pendente", active: "Activo", blocked: "Bloqueado", approved: "Aprovada", paid: "Paga", cancelled: "Cancelada", requested: "Solicitado",
};
const statusColors: Record<string, string> = {
  pending: "secondary", active: "default", blocked: "destructive", approved: "default", paid: "default", cancelled: "destructive", requested: "secondary",
};
const FILTERS = [
  { key: "pending", label: "Pendentes" },
  { key: "active", label: "Activos" },
  { key: "blocked", label: "Bloqueados" },
  { key: "all", label: "Todos" },
];

const mzn = (n: number) => `${Math.round(n).toLocaleString("pt-MZ")} MZN`;
const socialUrl = (kind: "instagram" | "facebook" | "tiktok", v: string) => {
  if (/^https?:\/\//i.test(v)) return v;
  const h = v.replace(/^@/, "");
  return kind === "instagram" ? `https://instagram.com/${h}` : kind === "tiktok" ? `https://tiktok.com/@${h}` : `https://facebook.com/${h}`;
};

const AdminAffiliates = () => {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [clicks, setClicks] = useState<Record<string, number>>({});
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [{ data: affs }, { data: comms }, { data: pays }, { data: cl }] = await Promise.all([
      supabase.from("affiliates").select("*").order("joined_at", { ascending: false }),
      supabase.from("affiliate_commissions").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliate_payouts").select("*").order("requested_at", { ascending: false }),
      supabase.from("affiliate_clicks").select("affiliate_id"),
    ]);
    const list = affs || [];
    setAffiliates(list);
    setCommissions(comms || []);
    setPayouts(pays || []);

    const c: Record<string, number> = {};
    (cl || []).forEach((x: any) => { c[x.affiliate_id] = (c[x.affiliate_id] || 0) + 1; });
    setClicks(c);

    const ids = Array.from(new Set(list.map((a: any) => a.user_id).filter(Boolean)));
    if (ids.length) {
      const { data: pr } = await supabase.from("profiles").select("user_id, name, email, phone").in("user_id", ids as string[]);
      setProfiles(Object.fromEntries((pr || []).map((p: any) => [p.user_id, p])));
    }
    setLoading(false);
  };

  const affById = useMemo(() => Object.fromEntries(affiliates.map((a) => [a.id, a])), [affiliates]);
  const nameOf = (affiliateId: string) => {
    const a = affById[affiliateId];
    return (a && profiles[a.user_id]?.name) || a?.affiliate_code || affiliateId?.slice(0, 8);
  };

  const updateAffiliateStatus = async (id: string, status: string, ask?: string) => {
    if (ask && !window.confirm(ask)) return;
    const { error } = await supabase.from("affiliates").update({ status } as any).eq("id", id);
    if (error) toast.error("Erro ao actualizar.");
    else {
      toast.success(status === "active" ? "Afiliado aprovado!" : status === "blocked" ? "Afiliado bloqueado." : "Estado actualizado!");
      fetchAll();
    }
  };

  const updateRate = async (id: string, percent: number, current: number) => {
    if (isNaN(percent) || percent < 0 || percent > 100) { toast.error("Comissão inválida (0-100%)."); return; }
    if (percent / 100 === Number(current)) return;
    const { error } = await supabase.from("affiliates").update({ commission_rate: percent / 100 } as any).eq("id", id);
    if (error) toast.error("Erro ao guardar comissão.");
    else { toast.success("Comissão actualizada!"); fetchAll(); }
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
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = ["Data,Afiliado,Valor,Método,Conta,Status"]
      .concat(payouts.map((p) => [p.requested_at, nameOf(p.affiliate_id), p.amount_mzn, p.method, p.account_details, p.status].map(q).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pagamentos_afiliados.csv";
    a.click();
  };

  // Totais por afiliado
  const totals = useMemo(() => {
    const t: Record<string, { sales: number; earned: number }> = {};
    commissions.filter((c) => c.status !== "cancelled").forEach((c) => {
      t[c.affiliate_id] = t[c.affiliate_id] || { sales: 0, earned: 0 };
      t[c.affiliate_id].sales += 1;
      t[c.affiliate_id].earned += Number(c.amount_mzn);
    });
    return t;
  }, [commissions]);

  const counts = {
    pending: affiliates.filter((a) => a.status === "pending").length,
    active: affiliates.filter((a) => a.status === "active").length,
    blocked: affiliates.filter((a) => a.status === "blocked").length,
    all: affiliates.length,
  } as Record<string, number>;
  const pendingCommissions = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount_mzn), 0);
  const payoutsToPay = payouts.filter((p) => p.status === "requested" || p.status === "approved").reduce((s, p) => s + Number(p.amount_mzn), 0);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return affiliates
      .filter((a) => filter === "all" || a.status === filter)
      .filter((a) => {
        if (!q) return true;
        const p = profiles[a.user_id] || {};
        return [a.affiliate_code, p.name, p.email, p.phone].some((v) => (v || "").toLowerCase().includes(q));
      });
  }, [affiliates, filter, search, profiles]);

  if (loading) return <p className="text-sm text-muted-foreground">A carregar...</p>;

  const stats = [
    { t: "A aguardar aprovação", v: counts.pending, i: Clock, c: "bg-amber-50 text-amber-600" },
    { t: "Afiliados activos", v: counts.active, i: CheckCircle, c: "bg-emerald-50 text-emerald-600" },
    { t: "Comissões pendentes", v: mzn(pendingCommissions), i: DollarSign, c: "bg-blue-50 text-blue-600" },
    { t: "Pagamentos a fazer", v: mzn(payoutsToPay), i: DollarSign, c: "bg-violet-50 text-violet-600" },
  ];

  return (
    <div className="space-y-6 overflow-x-hidden">
      <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><Users className="h-6 w-6" /> Gestão de Afiliados</h1>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.t} className="min-w-0">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{s.t}</p>
                <span className={`rounded-lg p-2 ${s.c}`}><s.i className="h-4 w-4" /></span>
              </div>
              <p className="mt-2 truncate text-lg font-bold sm:text-2xl">{s.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="affiliates">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="affiliates">Afiliados{counts.pending > 0 && <Badge className="ml-1.5 px-1.5">{counts.pending}</Badge>}</TabsTrigger>
          <TabsTrigger value="commissions">Comissões ({commissions.length})</TabsTrigger>
          <TabsTrigger value="payouts">Pagamentos ({payouts.length})</TabsTrigger>
        </TabsList>

        {/* Afiliados */}
        <TabsContent value="affiliates" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {f.label} ({counts[f.key]})
                </button>
              ))}
            </div>
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Nome, email, telefone ou código" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum afiliado nesta lista.</p>
          ) : (
            <div className="space-y-3">
              {visible.map((a) => {
                const p = profiles[a.user_id] || {};
                const t = totals[a.id] || { sales: 0, earned: 0 };
                return (
                  <div key={a.id} className="space-y-3 rounded-xl border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">
                          Código <span className="font-medium text-primary">{a.affiliate_code}</span> · inscrito em {new Date(a.joined_at).toLocaleDateString("pt-MZ")}
                        </p>
                      </div>
                      <Badge variant={statusColors[a.status] as any}>{statusLabels[a.status] || a.status}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-1 hover:text-foreground"><Mail className="h-3.5 w-3.5" />{p.email}</a>}
                      {p.phone && <a href={`tel:${p.phone}`} className="flex items-center gap-1 hover:text-foreground"><Phone className="h-3.5 w-3.5" />{p.phone}</a>}
                      {a.instagram && <a href={socialUrl("instagram", a.instagram)} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground"><Instagram className="h-3.5 w-3.5" />{a.instagram}</a>}
                      {a.facebook && <a href={socialUrl("facebook", a.facebook)} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground"><Facebook className="h-3.5 w-3.5" />{a.facebook}</a>}
                      {a.tiktok && <a href={socialUrl("tiktok", a.tiktok)} target="_blank" rel="noreferrer" className="hover:text-foreground">TikTok: {a.tiktok}</a>}
                    </div>

                    {a.reason && (
                      <p className="rounded-lg bg-muted/60 p-2.5 text-xs"><span className="font-medium">Motivo: </span>{a.reason}</p>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border p-2"><p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground"><MousePointerClick className="h-3 w-3" />Cliques</p><p className="text-sm font-semibold">{clicks[a.id] || 0}</p></div>
                      <div className="rounded-lg border p-2"><p className="text-[11px] text-muted-foreground">Vendas</p><p className="text-sm font-semibold">{t.sales}</p></div>
                      <div className="rounded-lg border p-2"><p className="text-[11px] text-muted-foreground">Ganho</p><p className="truncate text-sm font-semibold">{mzn(t.earned)}</p></div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        Comissão
                        <Input
                          key={`${a.id}-${a.commission_rate}`}
                          type="number" min={0} max={100} step={1}
                          className="h-8 w-16"
                          defaultValue={Number(a.commission_rate) * 100}
                          onBlur={(e) => updateRate(a.id, Number(e.target.value), a.commission_rate)}
                        />
                        %
                      </label>

                      <div className="flex gap-2">
                        {a.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => updateAffiliateStatus(a.id, "active")}><CheckCircle className="mr-1 h-4 w-4" /> Aprovar</Button>
                            <Button size="sm" variant="destructive" onClick={() => updateAffiliateStatus(a.id, "blocked", "Rejeitar esta candidatura?")}><XCircle className="mr-1 h-4 w-4" /> Rejeitar</Button>
                          </>
                        )}
                        {a.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => updateAffiliateStatus(a.id, "blocked", "Bloquear este afiliado? Os links dele deixam de gerar comissões.")}><Ban className="mr-1 h-4 w-4" /> Bloquear</Button>
                        )}
                        {a.status === "blocked" && (
                          <Button size="sm" variant="outline" onClick={() => updateAffiliateStatus(a.id, "active")}>Aprovar / Reactivar</Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Comissões */}
        <TabsContent value="commissions" className="space-y-4">
          {commissions.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma comissão.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2">Data</th><th className="pb-2">Afiliado</th><th className="pb-2">Pedido</th><th className="pb-2">Valor</th><th className="pb-2">Estado</th><th className="pb-2">Acções</th></tr></thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(c.created_at).toLocaleDateString("pt-MZ")}</td>
                      <td className="py-2">{nameOf(c.affiliate_id)}</td>
                      <td className="py-2">#{c.order_id?.slice(0, 8)}</td>
                      <td className="py-2 font-medium">{mzn(Number(c.amount_mzn))}</td>
                      <td className="py-2"><Badge variant={statusColors[c.status] as any}>{statusLabels[c.status] || c.status}</Badge></td>
                      <td className="space-x-1 whitespace-nowrap py-2">
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

        {/* Pagamentos */}
        <TabsContent value="payouts" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportPayouts}><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button>
          </div>
          {payouts.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nenhum pagamento.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2">Data</th><th className="pb-2">Afiliado</th><th className="pb-2">Valor</th><th className="pb-2">Método</th><th className="pb-2">Conta</th><th className="pb-2">Estado</th><th className="pb-2">Acções</th></tr></thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(p.requested_at).toLocaleDateString("pt-MZ")}</td>
                      <td className="py-2">{nameOf(p.affiliate_id)}</td>
                      <td className="py-2 font-medium">{mzn(Number(p.amount_mzn))}</td>
                      <td className="py-2">{p.method === "mpesa" ? "M-Pesa" : p.method === "emola" ? "e-Mola" : "Banco"}</td>
                      <td className="py-2">{p.account_details}</td>
                      <td className="py-2"><Badge variant={statusColors[p.status] as any}>{statusLabels[p.status] || p.status}</Badge></td>
                      <td className="space-x-1 whitespace-nowrap py-2">
                        {p.status === "requested" && <Button size="sm" variant="outline" onClick={() => updatePayoutStatus(p.id, "approved")}>Aprovar</Button>}
                        {p.status === "approved" && <Button size="sm" onClick={() => updatePayoutStatus(p.id, "paid")}><DollarSign className="mr-1 h-4 w-4" /> Marcar Pago</Button>}
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

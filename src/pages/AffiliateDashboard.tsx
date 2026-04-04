import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Share2, MousePointerClick, ShoppingCart, DollarSign, Wallet, ArrowLeft, ExternalLink } from "lucide-react";

const AffiliateDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [clicks, setClicks] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loading, setLoading] = useState(true);

  // Payout form
  const [payoutMethod, setPayoutMethod] = useState("");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [requestingPayout, setRequestingPayout] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    const { data: aff } = await supabase.from("affiliates").select("*").eq("user_id", user.id).single();
    if (!aff) { setLoading(false); return; }
    setAffiliate(aff);

    const [{ data: prods }, { data: comms }, { data: pays }, { count }] = await Promise.all([
      supabase.from("products").select("id, name").order("name"),
      supabase.from("affiliate_commissions").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }),
      supabase.from("affiliate_payouts").select("*").eq("affiliate_id", aff.id).order("requested_at", { ascending: false }),
      supabase.from("affiliate_clicks").select("*", { count: "exact", head: true }).eq("affiliate_id", aff.id),
    ]);
    setProducts(prods || []);
    setCommissions(comms || []);
    setPayouts(pays || []);
    setClicks(count || 0);
    setLoading(false);
  };

  const generateLink = () => {
    if (!selectedProduct || !affiliate) return "";
    return `${window.location.origin}/produto/${selectedProduct}?ref=${affiliate.affiliate_code}`;
  };

  const copyLink = () => {
    const link = generateLink();
    if (!link) { toast.error("Selecione um produto."); return; }
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const shareFacebook = () => {
    const link = generateLink();
    if (!link) return;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, "_blank");
  };

  const shareInstagram = () => {
    const link = generateLink();
    if (!link) return;
    navigator.clipboard.writeText("Confira este produto na Laynani Store! " + link);
    toast.success("Link copiado! Cole no seu Instagram.");
  };

  const shareTikTok = () => {
    const link = generateLink();
    if (!link) return;
    navigator.clipboard.writeText("Confira este produto na Laynani Store! " + link);
    toast.success("Link copiado! Cole no seu TikTok.");
  };

  const pendingCommission = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount_mzn), 0);
  const approvedCommission = commissions.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.amount_mzn), 0);
  const paidOut = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount_mzn), 0);
  const availableBalance = approvedCommission - paidOut;

  const requestPayout = async () => {
    if (!affiliate) return;
    const amount = Number(payoutAmount);
    if (amount < 500) { toast.error("Valor mínimo para saque: 500 MZN."); return; }
    if (amount > availableBalance) { toast.error("Saldo insuficiente."); return; }
    if (!payoutMethod || !payoutAccount) { toast.error("Preencha todos os campos."); return; }

    setRequestingPayout(true);
    const { error } = await supabase.from("affiliate_payouts").insert({
      affiliate_id: affiliate.id,
      amount_mzn: amount,
      method: payoutMethod,
      account_details: payoutAccount,
    } as any);
    setRequestingPayout(false);
    if (error) { toast.error("Erro ao solicitar saque."); return; }
    toast.success("Solicitação de saque enviada!");
    setPayoutAmount(""); setPayoutAccount(""); setPayoutMethod("");
    fetchData();
  };

  if (loading || authLoading) return (
    <div className="flex min-h-screen flex-col"><Navbar /><main className="flex flex-1 items-center justify-center"><p>Carregando...</p></main><Footer /></div>
  );

  if (!affiliate) return (
    <div className="flex min-h-screen flex-col"><Navbar />
      <main className="container flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <Share2 className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Você ainda não é afiliado</h2>
        <Button asChild><Link to="/afiliados">Candidatar-se</Link></Button>
      </main>
    <Footer /></div>
  );

  if (affiliate.status === "pending") return (
    <div className="flex min-h-screen flex-col"><Navbar />
      <main className="container flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <Share2 className="h-16 w-16 text-primary/40" />
        <h2 className="text-xl font-semibold">Candidatura em Análise</h2>
        <p className="text-muted-foreground">Aguarde a aprovação do administrador.</p>
        <Button variant="outline" asChild><Link to="/conta">Voltar à Conta</Link></Button>
      </main>
    <Footer /></div>
  );

  if (affiliate.status === "blocked") return (
    <div className="flex min-h-screen flex-col"><Navbar />
      <main className="container flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <h2 className="text-xl font-semibold text-destructive">Conta Bloqueada</h2>
        <p className="text-muted-foreground">Entre em contacto com o suporte.</p>
      </main>
    <Footer /></div>
  );

  const statusLabels: Record<string, string> = { pending: "Pendente", approved: "Aprovada", paid: "Paga", cancelled: "Cancelada", requested: "Solicitado" };
  const statusColors: Record<string, string> = { pending: "secondary", approved: "default", paid: "default", cancelled: "destructive", requested: "secondary" };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8">
        <Button variant="ghost" size="sm" className="mb-4" asChild><Link to="/conta"><ArrowLeft className="mr-2 h-4 w-4" /> Minha Conta</Link></Button>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Painel do Afiliado</h1>
          <Badge variant="outline" className="text-sm">Código: {affiliate.affiliate_code}</Badge>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MousePointerClick, label: "Cliques", value: clicks },
            { icon: ShoppingCart, label: "Vendas", value: commissions.length },
            { icon: DollarSign, label: "Pendente", value: `${pendingCommission.toLocaleString("pt-MZ")} MZN` },
            { icon: Wallet, label: "Disponível", value: `${availableBalance.toLocaleString("pt-MZ")} MZN` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <s.icon className="h-8 w-8 text-primary" />
                <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Link Generator */}
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Share2 className="h-5 w-5 text-primary" /> Gerador de Links</h2>
            <div>
              <Label>Selecione um Produto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedProduct && (
              <div className="space-y-3">
                <Input readOnly value={generateLink()} className="text-xs bg-muted" />
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={copyLink} size="sm"><Copy className="mr-1 h-4 w-4" /> Copiar</Button>
                  <Button onClick={shareFacebook} size="sm" variant="outline">Facebook</Button>
                  <Button onClick={shareInstagram} size="sm" variant="outline">Instagram</Button>
                  <Button onClick={shareTikTok} size="sm" variant="outline">TikTok</Button>
                </div>
              </div>
            )}
          </div>

          {/* Payout Request */}
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Solicitar Saque</h2>
            <p className="text-sm text-muted-foreground">Saldo disponível: <strong className="text-foreground">{availableBalance.toLocaleString("pt-MZ")} MZN</strong> (mín. 500 MZN)</p>
            <div>
              <Label>Valor (MZN)</Label>
              <Input type="number" min={500} max={availableBalance} value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} />
            </div>
            <div>
              <Label>Método</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="emola">e-Mola</SelectItem>
                  <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{payoutMethod === "bank_transfer" ? "NIB" : "Número da Carteira"}</Label>
              <Input value={payoutAccount} onChange={(e) => setPayoutAccount(e.target.value)} placeholder={payoutMethod === "bank_transfer" ? "NIB da conta" : "+258 8X XXX XXXX"} />
            </div>
            <Button onClick={requestPayout} className="w-full" disabled={requestingPayout || availableBalance < 500}>
              {requestingPayout ? "Enviando..." : "Solicitar Saque"}
            </Button>
          </div>
        </div>

        {/* Commissions History */}
        <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Histórico de Comissões</h2>
          {commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma comissão ainda. Partilhe seus links!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2">Data</th><th className="pb-2">Pedido</th><th className="pb-2">Valor</th><th className="pb-2">Status</th></tr></thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(c.created_at).toLocaleDateString("pt-MZ")}</td>
                      <td className="py-2">#{c.order_id?.slice(0, 8)}</td>
                      <td className="py-2 font-medium">{Number(c.amount_mzn).toLocaleString("pt-MZ")} MZN</td>
                      <td className="py-2"><Badge variant={statusColors[c.status] as any}>{statusLabels[c.status]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payouts History */}
        {payouts.length > 0 && (
          <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Histórico de Saques</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2">Data</th><th className="pb-2">Valor</th><th className="pb-2">Método</th><th className="pb-2">Status</th></tr></thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(p.requested_at).toLocaleDateString("pt-MZ")}</td>
                      <td className="py-2 font-medium">{Number(p.amount_mzn).toLocaleString("pt-MZ")} MZN</td>
                      <td className="py-2">{p.method === "mpesa" ? "M-Pesa" : p.method === "emola" ? "e-Mola" : "Banco"}</td>
                      <td className="py-2"><Badge variant={statusColors[p.status] as any}>{statusLabels[p.status]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AffiliateDashboard;

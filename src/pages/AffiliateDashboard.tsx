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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Copy, Share2, MousePointerClick, ShoppingCart, DollarSign,
  Wallet, ArrowLeft, TrendingUp, Link2, Facebook, Instagram,
  Music2, BarChart3, ArrowUpRight, Clock
} from "lucide-react";

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
  const totalEarned = approvedCommission + paidOut;
  const conversionRate = clicks > 0 ? ((commissions.length / clicks) * 100).toFixed(1) : "0";

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

  const statusLabels: Record<string, string> = { pending: "Pendente", approved: "Aprovada", paid: "Paga", cancelled: "Cancelada", requested: "Solicitado" };
  const statusColors: Record<string, string> = { pending: "secondary", approved: "default", paid: "default", cancelled: "destructive", requested: "secondary" };

  if (loading || authLoading) return (
    <div className="flex min-h-screen flex-col"><Navbar /><main className="flex flex-1 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></main><Footer /></div>
  );

  if (!affiliate) return (
    <div className="flex min-h-screen flex-col"><Navbar />
      <main className="container flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20">
        <div className="rounded-full bg-muted p-6"><Share2 className="h-12 w-12 text-muted-foreground" /></div>
        <h2 className="text-xl font-bold text-foreground">Ainda não é afiliado</h2>
        <p className="text-center text-sm text-muted-foreground max-w-sm">Junte-se ao programa e comece a ganhar comissões.</p>
        <Button asChild className="rounded-full px-8"><Link to="/afiliados">Candidatar-se</Link></Button>
      </main>
    <Footer /></div>
  );

  if (affiliate.status === "pending") return (
    <div className="flex min-h-screen flex-col"><Navbar />
      <main className="container flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20">
        <div className="rounded-full bg-primary/10 p-6"><Clock className="h-12 w-12 text-primary" /></div>
        <h2 className="text-xl font-bold text-foreground">Candidatura em Análise</h2>
        <p className="text-center text-sm text-muted-foreground max-w-sm">Estamos a analisar a sua candidatura. Será notificado em breve.</p>
        <Button variant="outline" asChild className="rounded-full"><Link to="/conta"><ArrowLeft className="mr-2 h-4 w-4" /> Minha Conta</Link></Button>
      </main>
    <Footer /></div>
  );

  if (affiliate.status === "blocked") return (
    <div className="flex min-h-screen flex-col"><Navbar />
      <main className="container flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20">
        <h2 className="text-xl font-bold text-destructive">Conta Suspensa</h2>
        <p className="text-center text-sm text-muted-foreground">Entre em contacto com o suporte para mais informações.</p>
      </main>
    <Footer /></div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <div className="border-b bg-gradient-primary">
          <div className="container mx-auto px-4 py-8 sm:py-10">
            <Button variant="ghost" size="sm" className="mb-4 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10" asChild>
              <Link to="/conta"><ArrowLeft className="mr-2 h-4 w-4" /> Minha Conta</Link>
            </Button>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-primary-foreground sm:text-3xl">Painel do Afiliado</h1>
                <p className="mt-1 text-sm text-primary-foreground/70">Gerencie os seus links, comissões e saques</p>
              </div>
              <Badge className="rounded-full border-white/20 bg-white/15 px-4 py-1.5 text-sm font-semibold text-primary-foreground backdrop-blur-sm">
                {affiliate.affiliate_code}
              </Badge>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 sm:py-8">
          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              { icon: MousePointerClick, label: "Cliques", value: clicks.toLocaleString("pt-MZ"), change: "", color: "bg-blue-500/10 text-blue-600" },
              { icon: ShoppingCart, label: "Conversões", value: commissions.length.toString(), change: `${conversionRate}%`, color: "bg-green-500/10 text-green-600" },
              { icon: DollarSign, label: "Total Ganho", value: `${totalEarned.toLocaleString("pt-MZ")}`, change: "MZN", color: "bg-primary/10 text-primary" },
              { icon: Wallet, label: "Disponível", value: `${availableBalance.toLocaleString("pt-MZ")}`, change: "MZN", color: "bg-amber-500/10 text-amber-600" },
            ].map((s) => (
              <Card key={s.label} className="border shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.color}`}>
                      <s.icon className="h-4 w-4" />
                    </div>
                    {s.change && <span className="text-xs font-medium text-muted-foreground">{s.change}</span>}
                  </div>
                  <p className="text-xl font-extrabold text-foreground sm:text-2xl">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="links" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted p-1 h-auto">
              <TabsTrigger value="links" className="rounded-lg py-2.5 text-xs sm:text-sm data-[state=active]:shadow-sm">
                <Link2 className="mr-1.5 h-4 w-4 hidden sm:inline" /> Links
              </TabsTrigger>
              <TabsTrigger value="earnings" className="rounded-lg py-2.5 text-xs sm:text-sm data-[state=active]:shadow-sm">
                <BarChart3 className="mr-1.5 h-4 w-4 hidden sm:inline" /> Comissões
              </TabsTrigger>
              <TabsTrigger value="payouts" className="rounded-lg py-2.5 text-xs sm:text-sm data-[state=active]:shadow-sm">
                <Wallet className="mr-1.5 h-4 w-4 hidden sm:inline" /> Saques
              </TabsTrigger>
            </TabsList>

            {/* Links Tab */}
            <TabsContent value="links" className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Share2 className="h-5 w-5 text-primary" /> Gerador de Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Selecione um Produto</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Escolha um produto..." /></SelectTrigger>
                      <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {selectedProduct && (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-2 rounded-xl border bg-muted/50 p-3">
                        <Input readOnly value={generateLink()} className="border-0 bg-transparent text-xs focus-visible:ring-0" />
                        <Button onClick={copyLink} size="sm" variant="secondary" className="shrink-0">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button onClick={shareFacebook} variant="outline" className="h-11 gap-2 text-xs sm:text-sm">
                          <Facebook className="h-4 w-4" /> Facebook
                        </Button>
                        <Button onClick={shareInstagram} variant="outline" className="h-11 gap-2 text-xs sm:text-sm">
                          <Instagram className="h-4 w-4" /> Instagram
                        </Button>
                        <Button onClick={shareTikTok} variant="outline" className="h-11 gap-2 text-xs sm:text-sm">
                          <Music2 className="h-4 w-4" /> TikTok
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Tips */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-5">
                  <h3 className="mb-3 font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Dicas para Vender Mais
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> Partilhe stories com o produto e adicione o link na bio</li>
                    <li className="flex items-start gap-2"><ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> Crie conteúdo autêntico mostrando o produto em uso</li>
                    <li className="flex items-start gap-2"><ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> Publique nos horários de maior engajamento (12h-14h e 19h-22h)</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Earnings Tab */}
            <TabsContent value="earnings" className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Pendente</p>
                    <p className="text-lg font-bold text-foreground">{pendingCommission.toLocaleString("pt-MZ")} <span className="text-xs font-normal text-muted-foreground">MZN</span></p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Aprovada</p>
                    <p className="text-lg font-bold text-primary">{approvedCommission.toLocaleString("pt-MZ")} <span className="text-xs font-normal text-muted-foreground">MZN</span></p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Histórico de Comissões</CardTitle>
                </CardHeader>
                <CardContent>
                  {commissions.length === 0 ? (
                    <div className="py-8 text-center">
                      <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">Nenhuma comissão ainda.<br />Partilhe os seus links para começar!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {commissions.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">Pedido #{c.order_id?.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-MZ")}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-bold text-foreground">{Number(c.amount_mzn).toLocaleString("pt-MZ")} MZN</span>
                            <Badge variant={statusColors[c.status] as any} className="text-xs">{statusLabels[c.status]}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payouts Tab */}
            <TabsContent value="payouts" className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wallet className="h-5 w-5 text-primary" /> Solicitar Saque
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-muted/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Saldo Disponível</p>
                    <p className="text-2xl font-extrabold text-foreground">{availableBalance.toLocaleString("pt-MZ")} <span className="text-sm font-normal text-muted-foreground">MZN</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Mínimo: 500 MZN</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Valor (MZN)</Label>
                    <Input type="number" min={500} max={availableBalance} value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="Ex: 1000" className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Método de Pagamento</Label>
                    <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mpesa">M-Pesa</SelectItem>
                        <SelectItem value="emola">e-Mola</SelectItem>
                        <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{payoutMethod === "bank_transfer" ? "NIB" : "Número da Carteira"}</Label>
                    <Input value={payoutAccount} onChange={(e) => setPayoutAccount(e.target.value)} placeholder={payoutMethod === "bank_transfer" ? "NIB da conta" : "+258 8X XXX XXXX"} className="h-11" />
                  </div>
                  <Button onClick={requestPayout} className="h-12 w-full rounded-xl font-semibold" disabled={requestingPayout || availableBalance < 500}>
                    {requestingPayout ? "Enviando..." : "Solicitar Saque"}
                  </Button>
                </CardContent>
              </Card>

              {payouts.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Histórico de Saques</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {payouts.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{p.method === "mpesa" ? "M-Pesa" : p.method === "emola" ? "e-Mola" : "Banco"}</p>
                            <p className="text-xs text-muted-foreground">{new Date(p.requested_at).toLocaleDateString("pt-MZ")}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-bold text-foreground">{Number(p.amount_mzn).toLocaleString("pt-MZ")} MZN</span>
                            <Badge variant={statusColors[p.status] as any} className="text-xs">{statusLabels[p.status]}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AffiliateDashboard;

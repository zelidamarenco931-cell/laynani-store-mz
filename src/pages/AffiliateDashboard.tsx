import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Copy, Share2, MousePointerClick, ShoppingBag, Wallet, ArrowLeft, Link2,
  Facebook, Instagram, Music2, Clock, MessageCircle, Search, RefreshCw,
  Percent, Smartphone, Building2, ChevronDown, CheckCircle2, XCircle,
  Sparkles, TrendingUp, LayoutDashboard, Receipt, Info,
} from "lucide-react";

const MIN_PAYOUT = 500;

const fmt = (n: number) => Number(n || 0).toLocaleString("pt-MZ");

const PAYOUT_METHODS = [
  { id: "mpesa", label: "M-Pesa", icon: Smartphone, hint: "Número M-Pesa (84 ou 85)" },
  { id: "emola", label: "e-Mola", icon: Smartphone, hint: "Número e-Mola (86 ou 87)" },
  { id: "bank_transfer", label: "Banco", icon: Building2, hint: "NIB com 21 dígitos" },
] as const;

const COMMISSION_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  approved: { label: "Aprovada", cls: "bg-green-500/10 text-green-600 border-green-500/20" },
  paid: { label: "Paga", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  cancelled: { label: "Cancelada", cls: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const PAYOUT_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Em análise", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  requested: { label: "Em análise", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  approved: { label: "Aprovado", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  paid: { label: "Pago", cls: "bg-green-500/10 text-green-600 border-green-500/20" },
  rejected: { label: "Rejeitado", cls: "bg-red-500/10 text-red-600 border-red-500/20" },
  cancelled: { label: "Cancelado", cls: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const normalizePhone = (value: string) => value.replace(/\D/g, "").replace(/^258/, "");

const validateAccount = (method: string, value: string): string | null => {
  if (method === "bank_transfer") {
    return /^\d{21}$/.test(value.replace(/\s/g, "")) ? null : "O NIB deve ter 21 dígitos.";
  }
  const phone = normalizePhone(value);
  if (method === "mpesa") return /^8[45]\d{7}$/.test(phone) ? null : "Número M-Pesa inválido (deve começar por 84 ou 85).";
  if (method === "emola") return /^8[67]\d{7}$/.test(phone) ? null : "Número e-Mola inválido (deve começar por 86 ou 87).";
  return "Escolha o método de recebimento.";
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    {children}
    <Footer />
  </div>
);

const AffiliateDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [recentClicks, setRecentClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [tab, setTab] = useState("resumo");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [commissionFilter, setCommissionFilter] = useState("all");

  const [payoutMethod, setPayoutMethod] = useState("");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [requestingPayout, setRequestingPayout] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { data: aff } = await supabase.from("affiliates").select("*").eq("user_id", user.id).single();
    if (!aff) { setLoading(false); return; }
    setAffiliate(aff);

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [prods, comms, pays, clicksCount, clicksRecent] = await Promise.all([
      supabase.from("products").select("id, name, images, price_mzn, promotional_price_mzn, has_promotion").eq("status", "active").order("name"),
      supabase.from("affiliate_commissions").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }),
      supabase.from("affiliate_payouts").select("*").eq("affiliate_id", aff.id).order("requested_at", { ascending: false }),
      supabase.from("affiliate_clicks").select("*", { count: "exact", head: true }).eq("affiliate_id", aff.id),
      supabase.from("affiliate_clicks").select("clicked_at").eq("affiliate_id", aff.id).gte("clicked_at", since.toISOString()).limit(5000),
    ]);

    setProducts(prods.data || []);
    setCommissions(comms.data || []);
    setPayouts(pays.data || []);
    setTotalClicks(clicksCount.count || 0);
    setRecentClicks(clicksRecent.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    fetchData();
  }, [user, authLoading, fetchData, navigate]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ---------- Números ----------
  const stats = useMemo(() => {
    const sum = (list: any[]) => list.reduce((s, x) => s + Number(x.amount_mzn || 0), 0);
    const pending = sum(commissions.filter((c) => c.status === "pending"));
    const approved = sum(commissions.filter((c) => c.status === "approved"));
    const paidComm = sum(commissions.filter((c) => c.status === "paid"));
    // Mesma regra do servidor: aprovado menos saques não rejeitados/cancelados
    const reserved = sum(payouts.filter((p) => !["rejected", "cancelled"].includes(p.status)));
    const inProgress = sum(payouts.filter((p) => ["pending", "requested", "approved"].includes(p.status)));
    const received = sum(payouts.filter((p) => p.status === "paid"));
    const available = Math.max(0, approved - reserved);
    const validOrders = commissions.filter((c) => c.status !== "cancelled").length;
    return {
      pending, approved, inProgress, received, available,
      totalEarned: approved + paidComm,
      validOrders,
      conversion: totalClicks > 0 ? ((validOrders / totalClicks) * 100).toFixed(1) : "0.0",
    };
  }, [commissions, payouts, totalClicks]);

  const chart = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (13 - i));
      return d;
    });
    const clicksByDay: Record<string, number> = {};
    recentClicks.forEach((c) => {
      const k = dayKey(new Date(c.clicked_at));
      clicksByDay[k] = (clicksByDay[k] || 0) + 1;
    });
    const ordersByDay: Record<string, number> = {};
    commissions.filter((c) => c.status !== "cancelled").forEach((c) => {
      const k = dayKey(new Date(c.created_at));
      ordersByDay[k] = (ordersByDay[k] || 0) + 1;
    });
    const rows = days.map((d) => ({
      day: d.getDate(),
      clicks: clicksByDay[dayKey(d)] || 0,
      orders: ordersByDay[dayKey(d)] || 0,
    }));
    const max = Math.max(1, ...rows.map((r) => Math.max(r.clicks, r.orders)));
    return { rows, max, total: rows.reduce((s, r) => s + r.clicks, 0) };
  }, [recentClicks, commissions]);

  const rate = Number(affiliate?.commission_rate ?? 0.05);
  const ratePct = Number((rate * 100).toFixed(1));

  // ---------- Links ----------
  const linkFor = (productId: string) => `${window.location.origin}/produto/${productId}?ref=${affiliate.affiliate_code}`;
  const messageFor = (p: any) => `Confira ${p.name} na Laynani Store! ${linkFor(p.id)}`;

  const copy = async (text: string, okMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(okMsg);
      return true;
    } catch {
      toast.error("Não foi possível copiar. Copie o link manualmente.");
      return false;
    }
  };

  const nativeShare = async (p: any) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: p.name, text: `Confira ${p.name} na Laynani Store!`, url: linkFor(p.id) });
      } catch { /* cancelado */ }
      return;
    }
    copy(linkFor(p.id), "Link copiado!");
  };

  const openApp = (scheme: string, web: string) => {
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      window.location.href = scheme;
      setTimeout(() => window.open(web, "_blank", "noopener,noreferrer"), 1500);
    } else {
      window.open(web, "_blank", "noopener,noreferrer");
    }
  };

  const shareWhatsApp = (p: any) =>
    window.open(`https://wa.me/?text=${encodeURIComponent(messageFor(p))}`, "_blank", "noopener,noreferrer");
  const shareFacebook = (p: any) =>
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkFor(p.id))}`, "_blank", "noopener,noreferrer");
  const shareInstagram = async (p: any) => {
    if (await copy(messageFor(p), "Link copiado! Cole no seu story ou na bio.")) openApp("instagram://", "https://www.instagram.com");
  };
  const shareTikTok = async (p: any) => {
    if (await copy(messageFor(p), "Link copiado! Cole na sua bio ou vídeo.")) openApp("snssdk1128://", "https://www.tiktok.com");
  };

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));
  const priceOf = (p: any) => Number(p.has_promotion && p.promotional_price_mzn ? p.promotional_price_mzn : p.price_mzn);

  // ---------- Saques ----------
  const selectMethod = (id: string) => {
    setPayoutMethod(id);
    const last = payouts.find((p) => p.method === id);
    setPayoutAccount(last?.account_details || "");
  };

  const requestPayout = async () => {
    if (!affiliate) return;
    const amount = Number(payoutAmount);
    if (!amount || amount < MIN_PAYOUT) { toast.error(`Valor mínimo para saque: ${MIN_PAYOUT} MZN.`); return; }
    if (amount > stats.available) { toast.error("Saldo insuficiente."); return; }
    if (!payoutMethod) { toast.error("Escolha como quer receber."); return; }
    const accountError = validateAccount(payoutMethod, payoutAccount);
    if (accountError) { toast.error(accountError); return; }

    const account = payoutMethod === "bank_transfer" ? payoutAccount.replace(/\s/g, "") : `+258${normalizePhone(payoutAccount)}`;

    setRequestingPayout(true);
    const { error } = await supabase.from("affiliate_payouts").insert({
      affiliate_id: affiliate.id,
      amount_mzn: amount,
      method: payoutMethod,
      account_details: account,
    } as any);
    setRequestingPayout(false);

    if (error) {
      const known = ["Saldo insuficiente", "Valor mínimo"].find((m) => error.message?.includes(m));
      toast.error(known ? error.message : "Erro ao solicitar saque. Tente novamente.");
      return;
    }
    toast.success("Pedido de saque enviado! Vamos analisar em breve.");
    setPayoutAmount("");
    fetchData();
  };

  const filteredCommissions = commissions.filter((c) => commissionFilter === "all" || c.status === commissionFilter);
  const filterChips = [
    { id: "all", label: "Todas", count: commissions.length },
    { id: "pending", label: "Pendentes", count: commissions.filter((c) => c.status === "pending").length },
    { id: "approved", label: "Aprovadas", count: commissions.filter((c) => c.status === "approved").length },
    { id: "cancelled", label: "Canceladas", count: commissions.filter((c) => c.status === "cancelled").length },
  ];

  // ---------- Estados da conta ----------
  if (loading || authLoading) return (
    <Shell>
      <main className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    </Shell>
  );

  if (!affiliate) return (
    <Shell>
      <main className="container flex flex-1 flex-col items-center justify-center gap-5 px-4 py-20 text-center">
        <div className="rounded-full bg-primary/10 p-6"><Sparkles className="h-12 w-12 text-primary" /></div>
        <h2 className="text-2xl font-extrabold tracking-tight">Ganhe com a Laynani</h2>
        <p className="max-w-sm text-sm text-muted-foreground">Partilhe produtos, receba comissão por cada venda confirmada e levante o dinheiro por M-Pesa, e-Mola ou banco.</p>
        <Button asChild className="rounded-full px-8"><Link to="/afiliados">Candidatar-me</Link></Button>
      </main>
    </Shell>
  );

  if (affiliate.status === "pending") return (
    <Shell>
      <main className="container flex flex-1 flex-col items-center justify-center gap-5 px-4 py-20 text-center">
        <div className="rounded-full bg-primary/10 p-6"><Clock className="h-12 w-12 text-primary" /></div>
        <h2 className="text-2xl font-extrabold tracking-tight">Candidatura em análise</h2>
        <p className="max-w-sm text-sm text-muted-foreground">Estamos a analisar o seu pedido. Assim que for aprovado, o seu painel e os seus links ficam disponíveis aqui.</p>
        <Button variant="outline" asChild className="rounded-full"><Link to="/conta"><ArrowLeft className="mr-2 h-4 w-4" /> Minha Conta</Link></Button>
      </main>
    </Shell>
  );

  if (affiliate.status === "blocked") return (
    <Shell>
      <main className="container flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <div className="rounded-full bg-destructive/10 p-6"><XCircle className="h-12 w-12 text-destructive" /></div>
        <h2 className="text-2xl font-extrabold tracking-tight text-destructive">Conta suspensa</h2>
        <p className="max-w-sm text-sm text-muted-foreground">Entre em contacto com o suporte para mais informações.</p>
      </main>
    </Shell>
  );

  const StatusBadge = ({ map, status }: { map: Record<string, { label: string; cls: string }>; status: string }) => {
    const s = map[status] || { label: status, cls: "" };
    return <Badge variant="outline" className={`shrink-0 text-[11px] font-semibold ${s.cls}`}>{s.label}</Badge>;
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 pb-10">
        {/* ===== Cabeçalho + saldo ===== */}
        <div className="bg-gradient-primary pb-16 pt-6 sm:pb-20">
          <div className="container mx-auto px-4">
            <div className="mb-5 flex items-center justify-between">
              <Button variant="ghost" size="sm" className="-ml-2 text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground" asChild>
                <Link to="/conta"><ArrowLeft className="mr-1.5 h-4 w-4" /> Minha Conta</Link>
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground" onClick={refresh} aria-label="Atualizar">
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">Programa de Afiliados</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-primary-foreground sm:text-3xl">O seu painel</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => copy(affiliate.affiliate_code, "Código copiado!")}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-sm font-bold text-primary-foreground backdrop-blur-sm"
              >
                {affiliate.affiliate_code} <Copy className="h-3.5 w-3.5 opacity-80" />
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-sm font-bold text-primary-foreground backdrop-blur-sm">
                <Percent className="h-3.5 w-3.5" /> {ratePct}% de comissão
              </span>
            </div>
          </div>
        </div>

        <div className="container mx-auto -mt-12 px-4 sm:-mt-14">
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardContent className="p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo disponível</p>
              <p className="mt-1 text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                {fmt(stats.available)} <span className="text-base font-semibold text-muted-foreground">MZN</span>
              </p>
              <div className="mt-4 grid grid-cols-3 divide-x rounded-xl border bg-muted/40 text-center">
                {[
                  { label: "Pendente", value: stats.pending },
                  { label: "Em saque", value: stats.inProgress },
                  { label: "Total ganho", value: stats.totalEarned },
                ].map((s) => (
                  <div key={s.label} className="px-2 py-3">
                    <p className="text-sm font-extrabold text-foreground sm:text-base">{fmt(s.value)}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button className="h-12 rounded-xl font-bold" onClick={() => setTab("saques")} disabled={stats.available < MIN_PAYOUT}>
                  <Wallet className="mr-2 h-4 w-4" /> Sacar
                </Button>
                <Button variant="outline" className="h-12 rounded-xl font-bold" onClick={() => setTab("links")}>
                  <Share2 className="mr-2 h-4 w-4" /> Partilhar
                </Button>
              </div>
              {stats.available < MIN_PAYOUT && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Faltam {fmt(MIN_PAYOUT - stats.available)} MZN para o primeiro saque (mínimo {MIN_PAYOUT} MZN).
                </p>
              )}
            </CardContent>
          </Card>

          {/* ===== Separadores ===== */}
          <Tabs value={tab} onValueChange={setTab} className="mt-6 space-y-5">
            <TabsList className="grid h-auto w-full grid-cols-4 rounded-xl bg-background p-1 shadow-sm">
              {[
                { v: "resumo", label: "Resumo", icon: LayoutDashboard },
                { v: "links", label: "Links", icon: Link2 },
                { v: "comissoes", label: "Vendas", icon: Receipt },
                { v: "saques", label: "Saques", icon: Wallet },
              ].map((t) => (
                <TabsTrigger key={t.v} value={t.v} className="flex-col gap-1 rounded-lg py-2 text-[11px] font-semibold sm:flex-row sm:gap-1.5 sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <t.icon className="h-4 w-4" /> {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ===== RESUMO ===== */}
            <TabsContent value="resumo" className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: MousePointerClick, label: "Cliques", value: fmt(totalClicks), color: "bg-blue-500/10 text-blue-600" },
                  { icon: ShoppingBag, label: "Vendas", value: fmt(stats.validOrders), color: "bg-green-500/10 text-green-600" },
                  { icon: TrendingUp, label: "Conversão", value: `${stats.conversion}%`, color: "bg-purple-500/10 text-purple-600" },
                  { icon: Wallet, label: "Já recebido", value: `${fmt(stats.received)} MZN`, color: "bg-amber-500/10 text-amber-600" },
                ].map((k) => (
                  <Card key={k.label} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${k.color}`}><k.icon className="h-4 w-4" /></div>
                      <p className="text-xl font-black tracking-tight text-foreground">{k.value}</p>
                      <p className="text-xs text-muted-foreground">{k.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-foreground">Últimos 14 dias</h3>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary/40" /> Cliques</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Vendas</span>
                    </div>
                  </div>
                  {chart.total === 0 && stats.validOrders === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Ainda sem atividade. Partilhe o seu primeiro link!</p>
                  ) : (
                    <div className="flex h-32 items-end gap-1">
                      {chart.rows.map((r, i) => (
                        <div key={i} className="flex flex-1 flex-col items-center gap-1">
                          <div className="flex h-24 w-full items-end justify-center gap-0.5">
                            <div className="w-1/2 rounded-t bg-primary/40" style={{ height: `${(r.clicks / chart.max) * 100}%`, minHeight: r.clicks ? 3 : 0 }} />
                            <div className="w-1/2 rounded-t bg-primary" style={{ height: `${(r.orders / chart.max) * 100}%`, minHeight: r.orders ? 3 : 0 }} />
                          </div>
                          <span className="text-[9px] text-muted-foreground">{r.day}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="mb-4 font-bold text-foreground">Como funciona</h3>
                  <ol className="space-y-4">
                    {[
                      { t: "Partilhe", d: "Copie o link de qualquer produto e envie aos seus contactos ou redes sociais." },
                      { t: "O cliente compra", d: "Quando alguém compra através do seu link, a venda fica associada a si." },
                      { t: "Comissão aprovada", d: `Assim que o pagamento é confirmado, recebe ${ratePct}% do valor do pedido, automaticamente.` },
                      { t: "Levante o dinheiro", d: `Peça o saque a partir de ${MIN_PAYOUT} MZN por M-Pesa, e-Mola ou banco.` },
                    ].map((s, i) => (
                      <li key={s.t} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">{i + 1}</span>
                        <div>
                          <p className="text-sm font-bold text-foreground">{s.t}</p>
                          <p className="text-sm text-muted-foreground">{s.d}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="divide-y p-0">
                  {[
                    { q: "Quando a minha comissão é aprovada?", a: "Quando o pagamento do pedido é confirmado. Até lá fica como pendente. Se o pedido for cancelado, a comissão também é cancelada." },
                    { q: "Posso comprar com o meu próprio link?", a: "Não. Compras feitas pela própria conta de afiliado não geram comissão." },
                    { q: "Quanto tempo demora o saque?", a: "Os pedidos de saque são analisados pela nossa equipa e pagos para o número ou conta que indicar." },
                  ].map((f) => (
                    <details key={f.q} className="group px-5 py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
                        {f.q}
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                    </details>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== LINKS ===== */}
            <TabsContent value="links" className="space-y-4">
              {selectedProduct && (
                <Card className="border-primary/30 shadow-md">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <img src={selectedProduct.images?.[0] || "/placeholder.svg"} alt={selectedProduct.name} className="h-14 w-14 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-bold text-foreground">{selectedProduct.name}</p>
                        <p className="text-xs text-muted-foreground">Ganha ≈ {fmt(priceOf(selectedProduct) * rate)} MZN por venda</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedProduct(null)} aria-label="Fechar"><XCircle className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border bg-muted/50 p-2">
                      <Input readOnly value={linkFor(selectedProduct.id)} className="h-9 border-0 bg-transparent text-xs focus-visible:ring-0" />
                      <Button size="sm" onClick={() => copy(linkFor(selectedProduct.id), "Link copiado!")}><Copy className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      <Button variant="outline" className="h-11 gap-2 border-green-200 text-green-600 hover:bg-green-50" onClick={() => shareWhatsApp(selectedProduct)}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
                      <Button variant="outline" className="h-11 gap-2" onClick={() => shareFacebook(selectedProduct)}><Facebook className="h-4 w-4" /> Facebook</Button>
                      <Button variant="outline" className="h-11 gap-2" onClick={() => shareInstagram(selectedProduct)}><Instagram className="h-4 w-4" /> Instagram</Button>
                      <Button variant="outline" className="h-11 gap-2" onClick={() => shareTikTok(selectedProduct)}><Music2 className="h-4 w-4" /> TikTok</Button>
                      <Button className="col-span-2 h-11 gap-2 sm:col-span-1" onClick={() => nativeShare(selectedProduct)}><Share2 className="h-4 w-4" /> Mais</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Procurar produto..." className="h-12 rounded-xl bg-background pl-10" />
              </div>

              {filteredProducts.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredProducts.map((p) => {
                    const active = selectedProduct?.id === p.id;
                    return (
                      <div key={p.id} className={`overflow-hidden rounded-xl border bg-background shadow-sm transition ${active ? "border-primary ring-2 ring-primary/30" : ""}`}>
                        <button type="button" className="block w-full text-left" onClick={() => { setSelectedProduct(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          <img src={p.images?.[0] || "/placeholder.svg"} alt={p.name} loading="lazy" className="aspect-square w-full object-cover" />
                          <div className="p-3">
                            <p className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold text-foreground">{p.name}</p>
                            <p className="mt-1 text-sm font-black text-foreground">{fmt(priceOf(p))} MZN</p>
                            <p className="text-[11px] font-semibold text-green-600">Ganha ≈ {fmt(priceOf(p) * rate)} MZN</p>
                          </div>
                        </button>
                        <div className="grid grid-cols-2 gap-1 border-t p-2">
                          <Button size="sm" variant="secondary" className="h-9 text-xs" onClick={() => copy(linkFor(p.id), "Link copiado!")}><Copy className="mr-1 h-3.5 w-3.5" /> Copiar</Button>
                          <Button size="sm" className="h-9 text-xs" onClick={() => nativeShare(p)}><Share2 className="mr-1 h-3.5 w-3.5" /> Partilhar</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ===== VENDAS / COMISSÕES ===== */}
            <TabsContent value="comissoes" className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {filterChips.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCommissionFilter(c.id)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${commissionFilter === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                  >
                    {c.label} ({c.count})
                  </button>
                ))}
              </div>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 sm:p-4">
                  {filteredCommissions.length === 0 ? (
                    <div className="py-10 text-center">
                      <Receipt className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {commissions.length === 0 ? "Ainda não tem vendas. Partilhe os seus links para começar!" : "Nenhuma venda neste filtro."}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredCommissions.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 py-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${c.status === "approved" || c.status === "paid" ? "bg-green-500/10 text-green-600" : c.status === "cancelled" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>
                            {c.status === "approved" || c.status === "paid" ? <CheckCircle2 className="h-5 w-5" /> : c.status === "cancelled" ? <XCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-foreground">Pedido #{c.order_id?.slice(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(c.created_at).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" })}
                              {c.status === "pending" && " · a aguardar pagamento"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-sm font-black ${c.status === "cancelled" ? "text-muted-foreground line-through" : "text-foreground"}`}>+{fmt(c.amount_mzn)} MZN</span>
                            <StatusBadge map={COMMISSION_STATUS} status={c.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== SAQUES ===== */}
            <TabsContent value="saques" className="space-y-5">
              <Card className="border-0 shadow-sm">
                <CardContent className="space-y-5 p-5">
                  <div className="rounded-xl bg-muted/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Disponível para saque</p>
                    <p className="text-3xl font-black tracking-tight text-foreground">{fmt(stats.available)} <span className="text-sm font-semibold text-muted-foreground">MZN</span></p>
                    {stats.inProgress > 0 && <p className="mt-1 text-xs text-muted-foreground">{fmt(stats.inProgress)} MZN já em saque</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Quanto quer sacar?</Label>
                    <Input type="number" inputMode="numeric" min={MIN_PAYOUT} max={stats.available} value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder={`Mínimo ${MIN_PAYOUT} MZN`} className="h-12 text-lg font-bold" />
                    <div className="flex flex-wrap gap-2">
                      {[500, 1000, 2000].filter((v) => v <= stats.available).map((v) => (
                        <button key={v} type="button" onClick={() => setPayoutAmount(String(v))} className="rounded-full border bg-background px-3 py-1.5 text-xs font-bold">{fmt(v)}</button>
                      ))}
                      {stats.available >= MIN_PAYOUT && (
                        <button type="button" onClick={() => setPayoutAmount(String(Math.floor(stats.available)))} className="rounded-full border border-primary bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary">Tudo</button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Como quer receber?</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYOUT_METHODS.map((m) => (
                        <button key={m.id} type="button" onClick={() => selectMethod(m.id)} className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition ${payoutMethod === m.id ? "border-primary bg-primary/5 text-primary" : "bg-background text-muted-foreground"}`}>
                          <m.icon className="h-5 w-5" /> {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {payoutMethod && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">{payoutMethod === "bank_transfer" ? "NIB" : "Número da carteira"}</Label>
                      <Input inputMode="numeric" value={payoutAccount} onChange={(e) => setPayoutAccount(e.target.value)} placeholder={payoutMethod === "bank_transfer" ? "21 dígitos" : "8X XXX XXXX"} className="h-12" />
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5" /> {PAYOUT_METHODS.find((m) => m.id === payoutMethod)?.hint}. Confirme com atenção.</p>
                    </div>
                  )}

                  <Button onClick={requestPayout} className="h-12 w-full rounded-xl font-bold" disabled={requestingPayout || stats.available < MIN_PAYOUT}>
                    {requestingPayout ? "A enviar..." : "Pedir saque"}
                  </Button>
                  {stats.available < MIN_PAYOUT && <p className="text-center text-xs text-muted-foreground">Precisa de pelo menos {MIN_PAYOUT} MZN aprovados para pedir um saque.</p>}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 sm:p-4">
                  <h3 className="mb-2 px-2 font-bold text-foreground">Histórico de saques</h3>
                  {payouts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Ainda não pediu nenhum saque.</p>
                  ) : (
                    <div className="divide-y">
                      {payouts.map((p) => {
                        const m = PAYOUT_METHODS.find((x) => x.id === p.method);
                        const Icon = m?.icon || Wallet;
                        return (
                          <div key={p.id} className="flex items-center gap-3 px-2 py-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted"><Icon className="h-5 w-5 text-muted-foreground" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-foreground">{m?.label || "Saque"}</p>
                              <p className="truncate text-xs text-muted-foreground">{new Date(p.requested_at).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" })} · {p.account_details}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-sm font-black text-foreground">{fmt(p.amount_mzn)} MZN</span>
                              <StatusBadge map={PAYOUT_STATUS} status={p.status} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AffiliateDashboard;

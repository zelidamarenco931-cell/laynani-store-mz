import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Copy, TrendingUp, DollarSign, Target, Pause, Play, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const PLATFORMS = [
  { value: "facebook", label: "Facebook", color: "bg-blue-500" },
  { value: "instagram", label: "Instagram", color: "bg-pink-500" },
  { value: "google", label: "Google Ads", color: "bg-yellow-500" },
  { value: "tiktok", label: "TikTok", color: "bg-black" },
];

interface Campaign {
  id: string;
  product_id: string;
  name: string;
  platform: string;
  budget_mzn: number;
  spent_mzn: number;
  start_date: string;
  end_date: string | null;
  status: string;
  utm_source: string | null;
  utm_medium: string | null;
  products?: { name: string; price_mzn: number };
}

interface FeaturedProduct {
  id: string;
  product_id: string;
  is_sponsored: boolean;
  priority: number;
  products?: { name: string; images: string[] | null; price_mzn: number };
}

const AdminMarketing = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({
    product_id: "",
    name: "",
    platform: "facebook",
    budget_mzn: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });

  const fetchAll = async () => {
    setLoading(true);
    const [campRes, featRes, prodRes] = await Promise.all([
      supabase.from("ad_campaigns").select("*, products(name, price_mzn)").order("created_at", { ascending: false }),
      supabase.from("product_featured").select("*, products(name, images, price_mzn)").order("priority"),
      supabase.from("products").select("id, name, price_mzn"),
    ]);
    if (campRes.data) setCampaigns(campRes.data as any);
    if (featRes.data) setFeatured(featRes.data as any);
    if (prodRes.data) setProducts(prodRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const createCampaign = async () => {
    if (!form.product_id || !form.name || !form.budget_mzn) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const utm_source = form.platform;
    const utm_medium = "cpc";
    const { error } = await supabase.from("ad_campaigns").insert({
      product_id: form.product_id,
      name: form.name,
      platform: form.platform,
      budget_mzn: Number(form.budget_mzn),
      start_date: form.start_date,
      end_date: form.end_date || null,
      utm_source,
      utm_medium,
    });
    if (error) { toast.error("Erro ao criar campanha"); return; }
    toast.success("Campanha criada!");
    setDialogOpen(false);
    setForm({ product_id: "", name: "", platform: "facebook", budget_mzn: "", start_date: new Date().toISOString().split("T")[0], end_date: "" });
    fetchAll();
  };

  const toggleCampaignStatus = async (id: string, current: string) => {
    const newStatus = current === "active" ? "paused" : "active";
    await supabase.from("ad_campaigns").update({ status: newStatus }).eq("id", id);
    fetchAll();
  };

  const deleteCampaign = async (id: string) => {
    await supabase.from("ad_campaigns").delete().eq("id", id);
    toast.success("Campanha removida");
    fetchAll();
  };

  const updateSpent = async (id: string, spent: number) => {
    await supabase.from("ad_campaigns").update({ spent_mzn: spent }).eq("id", id);
    fetchAll();
  };

  const generateUtmLink = (campaign: Campaign) => {
    const base = `${window.location.origin}/produto/${campaign.product_id}`;
    const params = new URLSearchParams({
      utm_source: campaign.utm_source || campaign.platform,
      utm_medium: campaign.utm_medium || "cpc",
      utm_campaign: campaign.name.toLowerCase().replace(/\s+/g, "-"),
    });
    return `${base}?${params.toString()}`;
  };

  const copyLink = (campaign: Campaign) => {
    navigator.clipboard.writeText(generateUtmLink(campaign));
    toast.success("Link UTM copiado!");
  };

  const toggleSponsored = async (productId: string, current: FeaturedProduct | undefined) => {
    if (current) {
      const newVal = !current.is_sponsored;
      if (!newVal) {
        await supabase.from("product_featured").delete().eq("id", current.id);
      } else {
        await supabase.from("product_featured").update({ is_sponsored: newVal }).eq("id", current.id);
      }
    } else {
      await supabase.from("product_featured").insert({ product_id: productId, is_sponsored: true, priority: featured.length });
    }
    fetchAll();
  };

  const updatePriority = async (id: string, priority: number) => {
    await supabase.from("product_featured").update({ priority }).eq("id", id);
    fetchAll();
  };

  // Stats
  const totalBudget = campaigns.reduce((s, c) => s + Number(c.budget_mzn), 0);
  const totalSpent = campaigns.reduce((s, c) => s + Number(c.spent_mzn), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;

  const platformIcon = (p: string) => {
    const plat = PLATFORMS.find(x => x.value === p);
    return <span className={`inline-block h-3 w-3 rounded-full ${plat?.color || "bg-muted"}`} />;
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Marketing & Patrocínio</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campanhas Ativas</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeCampaigns}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalBudget.toLocaleString("pt-MZ")} MZN</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gasto</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalSpent.toLocaleString("pt-MZ")} MZN</p>
            {totalBudget > 0 && (
              <Progress value={(totalSpent / totalBudget) * 100} className="mt-2" />
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="sponsored">Produtos Patrocinados</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova Campanha</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Criar Campanha</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nome da Campanha *</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Campanha Ebook Verão" />
                </div>
                <div>
                  <label className="text-sm font-medium">Produto *</label>
                  <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar produto" /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Plataforma</label>
                  <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Orçamento (MZN) *</label>
                    <Input type="number" value={form.budget_mzn} onChange={e => setForm(f => ({ ...f, budget_mzn: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Início</label>
                    <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Fim (opcional)</label>
                  <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={createCampaign}>Criar Campanha</Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Orçamento</TableHead>
                  <TableHead>Gasto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma campanha criada</TableCell></TableRow>
                )}
                {campaigns.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{(c as any).products?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {platformIcon(c.platform)}
                        <span className="text-sm capitalize">{c.platform}</span>
                      </div>
                    </TableCell>
                    <TableCell>{Number(c.budget_mzn).toLocaleString("pt-MZ")} MZN</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="h-8 w-24"
                          defaultValue={c.spent_mzn}
                          onBlur={e => {
                            const val = Number(e.target.value);
                            if (val !== Number(c.spent_mzn)) updateSpent(c.id, val);
                          }}
                        />
                        <span className="text-xs text-muted-foreground">MZN</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : c.status === "paused" ? "secondary" : "outline"}>
                        {c.status === "active" ? "Ativa" : c.status === "paused" ? "Pausada" : "Terminada"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => toggleCampaignStatus(c.id, c.status)} title={c.status === "active" ? "Pausar" : "Ativar"}>
                          {c.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => copyLink(c)} title="Copiar link UTM">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteCampaign(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Sponsored Products Tab */}
        <TabsContent value="sponsored" className="space-y-4">
          <p className="text-sm text-muted-foreground">Marque produtos como patrocinados para destacá-los na homepage.</p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Patrocinado</TableHead>
                  <TableHead>Prioridade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(p => {
                  const feat = featured.find(f => f.product_id === p.id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{Number(p.price_mzn).toLocaleString("pt-MZ")} MZN</TableCell>
                      <TableCell>
                        <Switch checked={!!feat?.is_sponsored} onCheckedChange={() => toggleSponsored(p.id, feat)} />
                      </TableCell>
                      <TableCell>
                        {feat?.is_sponsored && (
                          <Input
                            type="number"
                            className="h-8 w-20"
                            defaultValue={feat.priority}
                            onBlur={e => updatePriority(feat.id, Number(e.target.value))}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMarketing;

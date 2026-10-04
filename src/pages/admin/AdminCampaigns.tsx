import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  campaignsDb, campaignPhase, phaseLabel, formatDate, slugify, todayStr, type Campaign,
} from "@/lib/campaigns";
import { normalizeText } from "@/lib/search";

const phaseColors = {
  upcoming: "bg-blue-100 text-blue-800",
  running: "bg-green-100 text-green-800",
  ended: "bg-gray-100 text-gray-700",
} as const;

interface FormState {
  id?: string;
  name: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  banner_url: string;
  discount_percent: string;
  starts_at: string;
  ends_at: string;
  active: boolean;
  productIds: string[];
}

const emptyForm = (): FormState => ({
  name: "",
  slug: "",
  slugTouched: false,
  description: "",
  banner_url: "",
  discount_percent: "10",
  starts_at: todayStr(),
  ends_at: todayStr(),
  active: true,
  productIds: [],
});

const fmt = (n: number) => Number(n || 0).toLocaleString("pt-MZ");

const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [productSearch, setProductSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: camps, error }, { data: prods }] = await Promise.all([
      campaignsDb
        .from("campaigns")
        .select("*, campaign_products(product_id)")
        .order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, price_mzn, images, status").order("name"),
    ]);
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar campanhas.");
    }
    setCampaigns((camps as Campaign[]) || []);
    setProducts(prods || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const openNew = () => {
    setForm(emptyForm());
    setProductSearch("");
    setOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setForm({
      id: c.id,
      name: c.name,
      slug: c.slug,
      slugTouched: true,
      description: c.description || "",
      banner_url: c.banner_url || "",
      discount_percent: String(c.discount_percent),
      starts_at: c.starts_at,
      ends_at: c.ends_at,
      active: c.active,
      productIds: (c.campaign_products || []).map((p) => p.product_id),
    });
    setProductSearch("");
    setOpen(true);
  };

  const toggleProduct = (id: string) =>
    set({
      productIds: form.productIds.includes(id)
        ? form.productIds.filter((p) => p !== id)
        : [...form.productIds, id],
    });

  const filteredProducts = useMemo(() => {
    const q = normalizeText(productSearch);
    if (!q) return products;
    return products.filter((p) => normalizeText(p.name).includes(q));
  }, [products, productSearch]);

  const save = async () => {
    const discount = Number(form.discount_percent);
    const name = form.name.trim();
    const slug = slugify(form.slug || form.name);

    if (!name) return toast.error("Indique o nome da campanha.");
    if (!slug) return toast.error("Indique um endereço (slug) válido.");
    if (!(discount > 0 && discount < 100)) return toast.error("O desconto deve ser entre 1% e 99%.");
    if (!form.starts_at || !form.ends_at) return toast.error("Indique as datas de início e fim.");
    if (form.ends_at < form.starts_at) return toast.error("A data de fim não pode ser antes do início.");
    if (form.productIds.length === 0) return toast.error("Escolha pelo menos um produto.");

    setSaving(true);
    try {
      let id = form.id;

      // Ao editar, remove primeiro os preços da versão anterior (datas e produtos antigos).
      if (id) {
        const { error } = await campaignsDb.rpc("clear_campaign", { p_campaign_id: id });
        if (error) throw error;
      }

      const row = {
        name,
        slug,
        description: form.description.trim() || null,
        banner_url: form.banner_url.trim() || null,
        discount_percent: discount,
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        active: form.active,
      };

      if (id) {
        const { error } = await campaignsDb.from("campaigns").update(row).eq("id", id);
        if (error) throw error;
        const { error: delErr } = await campaignsDb.from("campaign_products").delete().eq("campaign_id", id);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await campaignsDb.from("campaigns").insert(row).select("id").single();
        if (error) throw error;
        id = data.id as string;
      }

      const { error: linkErr } = await campaignsDb
        .from("campaign_products")
        .insert(form.productIds.map((product_id) => ({ campaign_id: id, product_id })));
      if (linkErr) throw linkErr;

      // Só aplica os descontos aos produtos se a campanha estiver activa.
      if (form.active) {
        const { error } = await campaignsDb.rpc("apply_campaign", { p_campaign_id: id });
        if (error) throw error;
      }

      toast.success(form.id ? "Campanha actualizada." : "Campanha criada.");
      setOpen(false);
      load();
    } catch (err: any) {
      console.error(err);
      if (err?.code === "23505") toast.error("Já existe uma campanha com esse endereço (slug).");
      else toast.error(err?.message || "Erro ao guardar a campanha.");
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Campaign) => {
    if (!window.confirm(`Apagar a campanha "${c.name}"? Os preços promocionais dos produtos serão removidos.`)) return;
    try {
      const { error: clearErr } = await campaignsDb.rpc("clear_campaign", { p_campaign_id: c.id });
      if (clearErr) throw clearErr;
      await campaignsDb.from("campaign_products").delete().eq("campaign_id", c.id);
      const { error } = await campaignsDb.from("campaigns").delete().eq("id", c.id);
      if (error) throw error;
      toast.success("Campanha apagada.");
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao apagar.");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Campanhas</h1>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Nova campanha</Button>
      </div>

      {loading && <p className="text-muted-foreground">A carregar…</p>}
      {!loading && campaigns.length === 0 && (
        <div className="rounded-xl border p-8 text-center text-muted-foreground">
          <Megaphone className="mx-auto mb-2 h-8 w-8" />
          Ainda não há campanhas. Crie uma com desconto em vários produtos e um período definido.
        </div>
      )}

      <div className="space-y-3">
        {campaigns.map((c) => {
          const phase = campaignPhase(c);
          return (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 shadow-card">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {c.name}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${phaseColors[phase]}`}>{phaseLabel[phase]}</span>
                  {!c.active && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Desactivada</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  -{Number(c.discount_percent)}% • {formatDate(c.starts_at)} a {formatDate(c.ends_at)} • {(c.campaign_products || []).length} produto(s)
                </p>
                <p className="text-xs text-muted-foreground">/campanhas/{c.slug}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>
                <Button size="sm" variant="destructive" onClick={() => remove(c)}><Trash2 className="mr-1 h-4 w-4" /> Apagar</Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar campanha" : "Nova campanha"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome</label>
              <Input
                value={form.name}
                placeholder="Ex: Black Friday"
                onChange={(e) => set({ name: e.target.value, ...(form.slugTouched ? {} : { slug: slugify(e.target.value) }) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Endereço (slug)</label>
              <Input value={form.slug} onChange={(e) => set({ slug: slugify(e.target.value), slugTouched: true })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Descrição (opcional)</label>
              <textarea
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Imagem de banner (URL, opcional)</label>
              <Input value={form.banner_url} onChange={(e) => set({ banner_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Desconto %</label>
                <Input type="number" min={1} max={99} value={form.discount_percent} onChange={(e) => set({ discount_percent: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Início</label>
                <Input type="date" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Fim (inclusivo)</label>
                <Input type="date" value={form.ends_at} onChange={(e) => set({ ends_at: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
              Campanha activa (aplica o desconto aos produtos no período definido)
            </label>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium">Produtos ({form.productIds.length} seleccionados)</label>
                <button
                  type="button"
                  className="text-xs text-primary"
                  onClick={() => set({ productIds: filteredProducts.map((p) => p.id) })}
                >
                  Seleccionar todos {productSearch ? "os filtrados" : ""}
                </button>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Pesquisar produto" />
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
                {filteredProducts.length === 0 && <p className="p-2 text-sm text-muted-foreground">Nenhum produto.</p>}
                {filteredProducts.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-muted">
                    <input type="checkbox" checked={form.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                    <img src={p.images?.[0] || "/placeholder.svg"} alt="" className="h-8 w-8 rounded object-cover" />
                    <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{fmt(p.price_mzn)} MZN</span>
                  </label>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? "A guardar…" : "Guardar campanha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCampaigns;

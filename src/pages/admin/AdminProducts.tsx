import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Upload, X, ImageIcon, Package, Ruler, Palette, Weight, Hash, Search, Calendar,
  Percent, Copy, ChevronRight, Check, Star, ExternalLink, AlertTriangle, CheckCircle, XCircle, Loader2,
} from "lucide-react";
import { prepareImage } from "@/lib/imageUpload";

const PREDEFINED_COLORS = [
  { name: "Preto", hex: "#000000" }, { name: "Branco", hex: "#FFFFFF" },
  { name: "Vermelho", hex: "#EF4444" }, { name: "Azul", hex: "#3B82F6" },
  { name: "Verde", hex: "#22C55E" }, { name: "Amarelo", hex: "#EAB308" },
  { name: "Rosa", hex: "#EC4899" }, { name: "Roxo", hex: "#8B5CF6" },
  { name: "Laranja", hex: "#F97316" }, { name: "Cinza", hex: "#6B7280" },
  { name: "Bege", hex: "#D2B48C" }, { name: "Marrom", hex: "#92400E" },
  { name: "Dourado", hex: "#D4AF37" }, { name: "Prata", hex: "#C0C0C0" },
];

const SIZE_OPTIONS: Record<string, string[]> = {
  roupas: ["P", "M", "G", "GG", "XG"],
  calcados: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  acessorios: ["Único", "P", "M", "G"],
};

const LOW_STOCK = 5;
const MAX_IMAGES = 10;

// Os prazos de entrega e o SEO deixaram de ter ecrã próprio: mantêm-se no produto (valores por omissão
// em produtos novos, intactos ao editar) mas não aparecem no formulário.
interface ProductForm {
  name: string; description: string; price_mzn: string; promotional_price_mzn: string;
  stock: string; category_id: string; sku: string; status: string;
  has_promotion: boolean; promotion_start_date: string; promotion_end_date: string;
  delivery_time_min: string; delivery_time_max: string; origin: string;
  meta_title: string; meta_description: string; tags: string; weight: string;
}

const emptyForm: ProductForm = {
  name: "", description: "", price_mzn: "", promotional_price_mzn: "",
  stock: "0", category_id: "", sku: "", status: "active",
  has_promotion: false, promotion_start_date: "", promotion_end_date: "",
  delivery_time_min: "7", delivery_time_max: "20", origin: "local",
  meta_title: "", meta_description: "", tags: "", weight: "",
};

// Foto na lista: já guardada (só url) ou nova (ficheiro preparado + pré-visualização local)
interface Photo { key: string; url: string; file?: File }

const mzn = (n: number) => `${Number(n).toLocaleString("pt-MZ")} MZN`;
const slugPart = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "PROD";
const revoke = (list: Photo[]) => list.forEach((p) => p.file && URL.revokeObjectURL(p.url));
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<ProductForm>({ ...emptyForm });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedColors, setSelectedColors] = useState<{ name: string; hex: string }[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizeCategory, setSizeCategory] = useState("roupas");
  const [customColorHex, setCustomColorHex] = useState("#000000");
  const [customColorName, setCustomColorName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const snapshot = useRef("");
  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;

  const fetchData = useCallback(async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    if (p) setProducts(p);
    if (c) setCategories(c);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => () => revoke(photosRef.current), []);

  const currentSnapshot = () =>
    JSON.stringify([form, selectedColors, selectedSizes, photos.map((p) => p.key)]);

  const resetForm = () => {
    revoke(photosRef.current);
    setForm({ ...emptyForm });
    setEditing(null);
    setPhotos([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setAdvancedOpen(false);
    setProcessing(false);
    setProgress("");
  };

  const openNew = () => {
    resetForm();
    snapshot.current = JSON.stringify([emptyForm, [], [], []]);
    setDialogOpen(true);
  };

  const loadProduct = (p: any, asCopy = false) => {
    revoke(photosRef.current);
    const f: ProductForm = {
      name: asCopy ? `${p.name} (Cópia)` : p.name, description: p.description || "", price_mzn: String(p.price_mzn),
      promotional_price_mzn: p.promotional_price_mzn ? String(p.promotional_price_mzn) : "",
      stock: String(p.stock ?? 0), category_id: p.category_id || "", sku: asCopy ? "" : p.sku || "",
      status: p.status || "active", has_promotion: p.has_promotion || false,
      promotion_start_date: p.promotion_start_date || "", promotion_end_date: p.promotion_end_date || "",
      delivery_time_min: String(p.delivery_time_min || 7), delivery_time_max: String(p.delivery_time_max || 20),
      origin: p.origin || "local", meta_title: p.meta_title || "", meta_description: p.meta_description || "",
      tags: (p.tags || []).join(", "), weight: p.weight ? String(p.weight) : "",
    };
    const colors = p.color
      ? p.color.split(",").map((c: string) => c.trim()).filter(Boolean).map((c: string) => PREDEFINED_COLORS.find((pc) => pc.name === c) || { name: c, hex: "#888888" })
      : [];
    const sizes = p.size ? p.size.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
    const list: Photo[] = (p.images || []).map((url: string, i: number) => ({ key: `old-${i}-${url}`, url }));

    setEditing(asCopy ? null : p);
    setForm(f);
    setSelectedColors(colors);
    setSelectedSizes(sizes);
    setPhotos(list);
    setAdvancedOpen(!!(f.has_promotion || colors.length || sizes.length || f.weight || f.tags));
    snapshot.current = JSON.stringify([f, colors, sizes, list.map((x) => x.key)]);
    setDialogOpen(true);
  };

  const requestClose = (open: boolean) => {
    if (open) { setDialogOpen(true); return; }
    if (uploading) return;
    if (currentSnapshot() !== snapshot.current && !window.confirm("Tem alterações por guardar. Sair mesmo assim?")) return;
    setDialogOpen(false);
    resetForm();
  };

  // Lê e reduz cada foto logo ao escolher; se alguma não puder ser lida, avisa já (e não só ao guardar).
  const addFiles = async (files: File[]) => {
    const room = MAX_IMAGES - photosRef.current.length;
    if (room <= 0) { toast.error(`Máximo de ${MAX_IMAGES} fotos.`); return; }
    if (files.length > room) toast.message(`Só cabem mais ${room} foto(s). As restantes foram ignoradas.`);

    setProcessing(true);
    const added: Photo[] = [];
    for (const f of files.slice(0, room)) {
      try {
        const out = await prepareImage(f);
        added.push({ key: `new-${out.name}`, url: URL.createObjectURL(out), file: out });
      } catch {
        toast.error(`Não foi possível ler "${f.name || "a foto"}". Tente outra foto (JPG, PNG ou WebP).`);
      }
    }
    setPhotos((prev) => [...prev, ...added]);
    setProcessing(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await addFiles(files); // só limpa o seletor depois de as fotos estarem lidas
    if (fileRef.current) fileRef.current.value = "";
  };

  const makeCover = (idx: number) => setPhotos((prev) => [prev[idx], ...prev.filter((_, i) => i !== idx)]);
  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      revoke([prev[idx]]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const price = Number(form.price_mzn) || 0;
  const promo = Number(form.promotional_price_mzn) || 0;
  const promoValid = form.has_promotion && promo > 0 && promo < price;
  const discountPercent = promoValid ? Math.round((1 - promo / price) * 100) : 0;

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Indique o nome do produto."); return; }
    if (!(price > 0)) { toast.error("Indique o preço."); return; }
    if (form.has_promotion && form.promotional_price_mzn && !promoValid) {
      toast.error("O preço promocional deve ser menor que o normal.");
      setAdvancedOpen(true);
      return;
    }
    if (processing) { toast.message("A preparar as fotos... um momento."); return; }

    setUploading(true);
    const productId: string = editing?.id ?? newId();
    const uploaded: string[] = [];
    try {
      // 1) Envia as fotos novas. Se alguma falhar, o produto NÃO é criado/alterado (nada fica sem foto em silêncio).
      const newCount = photos.filter((p) => p.file).length;
      const urls: string[] = [];
      let n = 0;
      for (const p of photos) {
        if (!p.file) { urls.push(p.url); continue; }
        n++;
        setProgress(`A enviar foto ${n} de ${newCount}...`);
        const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage.from("product-images").upload(path, p.file, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
        });
        if (error) throw new Error(`Não foi possível enviar a foto ${n}. Verifique a internet e tente de novo.`);
        uploaded.push(path);
        urls.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
      }

      // 2) Guarda o produto já com as fotos
      setProgress("A guardar...");
      const payload: any = {
        name: form.name.trim(), description: form.description,
        price_mzn: price, stock: Math.max(Number(form.stock) || 0, 0),
        category_id: form.category_id || null,
        sku: form.sku.trim() || (editing?.sku ?? `LYN-${slugPart(form.name)}-${Date.now().toString().slice(-4)}`),
        status: form.status,
        has_promotion: form.has_promotion,
        promotional_price_mzn: form.has_promotion && form.promotional_price_mzn ? promo : null,
        promotion_start_date: form.has_promotion && form.promotion_start_date ? form.promotion_start_date : null,
        promotion_end_date: form.has_promotion && form.promotion_end_date ? form.promotion_end_date : null,
        delivery_time_min: Number(form.delivery_time_min) || 7,
        delivery_time_max: Number(form.delivery_time_max) || 20,
        origin: form.origin,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        color: selectedColors.map((c) => c.name).join(", ") || null,
        size: selectedSizes.join(", ") || null,
        weight: form.weight || null,
        images: urls,
      };

      const { error } = editing
        ? await supabase.from("products").update(payload).eq("id", editing.id)
        : await supabase.from("products").insert({ id: productId, ...payload });
      if (error) throw new Error(editing ? "Erro ao actualizar o produto." : "Erro ao criar o produto.");

      toast.success(editing ? "Produto actualizado!" : "Produto criado!");
      snapshot.current = currentSnapshot();
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (e: any) {
      if (uploaded.length) await supabase.storage.from("product-images").remove(uploaded).catch(() => undefined);
      toast.error(e?.message || "Não foi possível guardar. Tente de novo.");
    } finally {
      setUploading(false);
      setProgress("");
    }
  };

  const handleDelete = async (p: any) => {
    if (!window.confirm(`Remover "${p.name}"? Esta acção não pode ser desfeita.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error("Não foi possível remover (pode ter pedidos associados). Desactive o produto.");
    else { toast.success("Produto removido."); fetchData(); }
  };

  const toggleStatus = async (p: any) => {
    const status = p.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("products").update({ status }).eq("id", p.id);
    if (error) toast.error("Erro ao mudar estado.");
    else { toast.success(status === "active" ? "Produto activado" : "Produto desactivado"); fetchData(); }
  };

  const toggleColor = (color: { name: string; hex: string }) =>
    setSelectedColors((prev) => (prev.some((c) => c.name === color.name) ? prev.filter((c) => c.name !== color.name) : [...prev, color]));

  const addCustomColor = () => {
    if (!customColorName.trim()) return;
    toggleColor({ name: customColorName.trim(), hex: customColorHex });
    setCustomColorName("");
  };

  const toggleSize = (size: string) =>
    setSelectedSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));

  // Estatísticas e filtros
  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter((p) => p.status === "active").length,
    low: products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length,
    out: products.filter((p) => p.stock <= 0).length,
  }), [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !(`${p.name} ${p.sku || ""}`.toLowerCase().includes(q))) return false;
      if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
      if (statusFilter === "active") return p.status === "active";
      if (statusFilter === "inactive") return p.status !== "active";
      if (statusFilter === "low") return p.stock > 0 && p.stock <= LOW_STOCK;
      if (statusFilter === "out") return p.stock <= 0;
      return true;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  const statCards = [
    { t: "Produtos", v: stats.total, i: Package, c: "bg-blue-50 text-blue-600" },
    { t: "Activos", v: stats.active, i: CheckCircle, c: "bg-emerald-50 text-emerald-600" },
    { t: "Stock baixo", v: stats.low, i: AlertTriangle, c: "bg-amber-50 text-amber-600" },
    { t: "Esgotados", v: stats.out, i: XCircle, c: "bg-red-50 text-red-600" },
  ];
  const statusChips = [
    { k: "all", l: "Todos" }, { k: "active", l: "Activos" }, { k: "inactive", l: "Inactivos" }, { k: "low", l: "Stock baixo" }, { k: "out", l: "Esgotados" },
  ];

  const saveLabel = uploading ? progress || "A guardar..." : editing ? "Guardar alterações" : "Criar produto";

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerir catálogo, preços e stock</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.t}><CardContent className="flex items-center gap-3 p-3">
            <span className={`rounded-lg p-2 ${s.c}`}><s.i className="h-4 w-4" /></span>
            <div><p className="text-[11px] text-muted-foreground">{s.t}</p><p className="text-lg font-bold leading-none">{s.v}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Pesquisar por nome ou SKU..." className="pl-10" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {statusChips.map((c) => (
            <button key={c.k} onClick={() => setStatusFilter(c.k)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === c.k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {c.l}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Package className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((p) => {
            const onPromo = p.has_promotion && p.promotional_price_mzn;
            return (
              <div key={p.id} className="flex items-start gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30 sm:p-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground/40" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {p.categories?.name && <Badge variant="outline" className="text-[10px]">{p.categories.name}</Badge>}
                        {onPromo && <Badge className="bg-destructive text-[10px]">PROMO</Badge>}
                        {p.stock <= 0 ? <Badge variant="destructive" className="text-[10px]">Esgotado</Badge>
                          : p.stock <= LOW_STOCK ? <Badge className="bg-amber-500 text-[10px]">Stock: {p.stock}</Badge>
                          : <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>}
                        {p.sku && <span className="text-[11px] text-muted-foreground">{p.sku}</span>}
                      </div>
                    </div>
                    <Switch checked={p.status === "active"} onCheckedChange={() => toggleStatus(p)} title={p.status === "active" ? "Activo" : "Inactivo"} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      {onPromo ? (<>
                        <span className="whitespace-nowrap text-sm font-bold text-destructive sm:text-base">{mzn(p.promotional_price_mzn)}</span>
                        <span className="whitespace-nowrap text-xs text-muted-foreground line-through">{mzn(p.price_mzn)}</span>
                      </>) : <span className="whitespace-nowrap text-sm font-bold text-primary sm:text-base">{mzn(p.price_mzn)}</span>}
                    </div>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Ver na loja"><a href={`/produto/${p.id}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadProduct(p, true)} title="Duplicar"><Copy className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadProduct(p)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p)} title="Remover"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulário numa só página */}
      <Dialog open={dialogOpen} onOpenChange={requestClose}>
        <DialogContent className="flex max-h-[92vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="border-b px-4 py-3 text-left sm:px-6">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {editing ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
            {/* Fotos */}
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-1.5"><ImageIcon className="h-4 w-4" /> Fotos</Label>
                <span className="text-xs text-muted-foreground">{photos.length}/{MAX_IMAGES} · a primeira é a capa</span>
              </div>
              <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.length < MAX_IMAGES && (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={processing || uploading}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:opacity-60">
                    {processing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                    <span className="text-[11px] font-medium">{processing ? "A preparar..." : "Adicionar"}</span>
                  </button>
                )}
                {photos.map((p, i) => (
                  <div key={p.key} className={`relative aspect-square overflow-hidden rounded-lg bg-muted ${i === 0 ? "ring-2 ring-primary" : "border"}`}>
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    {i === 0 ? (
                      <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">Capa</span>
                    ) : (
                      <button type="button" onClick={() => makeCover(i)} title="Definir como capa" disabled={uploading}
                        className="absolute left-1 top-1 rounded-full bg-background/90 p-1.5 shadow"><Star className="h-3.5 w-3.5" /></button>
                    )}
                    <button type="button" onClick={() => removePhoto(i)} title="Remover foto" disabled={uploading}
                      className="absolute right-1 top-1 rounded-full bg-destructive p-1.5 text-destructive-foreground"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </section>

            {/* Essencial */}
            <section className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome do produto *</Label>
                <Input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Camiseta Casual Premium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Preço (MZN) *</Label>
                  <Input type="number" inputMode="decimal" min="0" step="0.01" value={form.price_mzn} onChange={(e) => setForm({ ...form, price_mzn: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Stock</Label>
                  <Input type="number" inputMode="numeric" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
              </div>
              {Number(form.stock) <= LOW_STOCK && (
                <p className="-mt-2 text-xs text-amber-600">{Number(form.stock) === 0 ? "Produto aparecerá como esgotado" : "Stock baixo"}</p>
              )}
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Material, medidas, cuidados, o que vem na embalagem..." rows={4} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <Label>Visível na loja</Label>
                  <p className="text-xs text-muted-foreground">{form.status === "active" ? "Os clientes podem ver e comprar" : "Escondido da loja"}</p>
                </div>
                <Switch checked={form.status === "active"} onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} />
              </div>
            </section>

            {/* Opcional: promoção, cores, tamanhos... */}
            <details open={advancedOpen} onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)} className="group rounded-lg border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <span>Mais opções <span className="font-normal text-muted-foreground">(promoção, cores, tamanhos…)</span></span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <div className="space-y-5 border-t p-3">
                {/* Promoção */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /><Label>Preço promocional</Label></div>
                    <Switch checked={form.has_promotion} onCheckedChange={(v) => setForm({ ...form, has_promotion: v })} />
                  </div>
                  {form.has_promotion && (
                    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <div className="space-y-1.5">
                        <Label>Preço promocional (MZN)</Label>
                        <Input type="number" inputMode="decimal" min="0" step="0.01" value={form.promotional_price_mzn} onChange={(e) => setForm({ ...form, promotional_price_mzn: e.target.value })} />
                        {promoValid && <p className="text-sm font-semibold text-primary">🏷️ {discountPercent}% OFF — de {mzn(price)} por {mzn(promo)}</p>}
                        {form.promotional_price_mzn && !promoValid && <p className="text-sm text-destructive">⚠️ Deve ser menor que o preço normal.</p>}
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Início</Label><Input type="date" value={form.promotion_start_date} onChange={(e) => setForm({ ...form, promotion_start_date: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Término</Label><Input type="date" value={form.promotion_end_date} onChange={(e) => setForm({ ...form, promotion_end_date: e.target.value })} /></div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Cores */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-1.5"><Palette className="h-4 w-4" /> Cores</Label>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_COLORS.map((color) => {
                      const selected = selectedColors.some((c) => c.name === color.name);
                      return (
                        <button key={color.name} type="button" onClick={() => toggleColor(color)}
                          className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${selected ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:border-primary/50"}`}>
                          <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: color.hex }} />
                          {color.name}
                          {selected && <Check className="h-3 w-3 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="color" value={customColorHex} onChange={(e) => setCustomColorHex(e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded border" />
                    <Input value={customColorName} onChange={(e) => setCustomColorName(e.target.value)} placeholder="Cor personalizada" className="min-w-[140px] flex-1" />
                    <Button type="button" size="sm" variant="outline" onClick={addCustomColor} className="shrink-0">Adicionar</Button>
                  </div>
                  {selectedColors.some((c) => !PREDEFINED_COLORS.some((p) => p.name === c.name)) && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedColors.filter((c) => !PREDEFINED_COLORS.some((p) => p.name === c.name)).map((c) => (
                        <Badge key={c.name} variant="secondary" className="gap-1.5">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.hex }} />{c.name}
                          <button type="button" onClick={() => toggleColor(c)}><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Tamanhos */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-1.5"><Ruler className="h-4 w-4" /> Tamanhos</Label>
                  <Select value={sizeCategory} onValueChange={setSizeCategory}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="roupas">Roupas</SelectItem>
                      <SelectItem value="calcados">Calçados</SelectItem>
                      <SelectItem value="acessorios">Acessórios</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {(SIZE_OPTIONS[sizeCategory] || []).map((size) => (
                      <button key={size} type="button" onClick={() => toggleSize(size)}
                        className={`min-w-[40px] rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${selectedSizes.includes(size) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>
                        {size}
                      </button>
                    ))}
                  </div>
                  {selectedSizes.length > 0 && <p className="text-xs text-muted-foreground">Seleccionados: {selectedSizes.join(", ")}</p>}
                </div>

                <Separator />

                {/* Peso, SKU, tags */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Weight className="h-4 w-4" /> Peso (kg)</Label>
                    <Input type="number" inputMode="decimal" min="0" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="Ex: 0.5" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> SKU</Label>
                    <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Vazio = automático" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Tags (separadas por vírgula)</Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="moda, verão, premium" />
                </div>
              </div>
            </details>
          </div>

          <div className="flex gap-2 border-t bg-background px-4 py-3 sm:px-6">
            <Button variant="outline" onClick={() => requestClose(false)} disabled={uploading}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} disabled={uploading || processing}>
              {(uploading || processing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {processing && !uploading ? "A preparar fotos..." : saveLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;

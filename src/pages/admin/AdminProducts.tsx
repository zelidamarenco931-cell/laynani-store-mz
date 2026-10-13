import { useEffect, useState, useRef, useCallback, useMemo, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, X, ImageIcon, Package, Ruler, Palette, Search, Percent, Copy, Check, Star,
  ExternalLink, AlertTriangle, CheckCircle, XCircle, Loader2, ChevronDown, SlidersHorizontal,
} from "lucide-react";

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
const MAX_SIDE = 1600;

interface ProductForm {
  name: string; description: string; price_mzn: string; promotional_price_mzn: string;
  stock: string; category_id: string; sku: string; status: string;
  has_promotion: boolean; promotion_start_date: string; promotion_end_date: string;
  meta_title: string; meta_description: string; tags: string; weight: string;
}

const emptyForm: ProductForm = {
  name: "", description: "", price_mzn: "", promotional_price_mzn: "",
  stock: "", category_id: "", sku: "", status: "active",
  has_promotion: false, promotion_start_date: "", promotion_end_date: "",
  meta_title: "", meta_description: "", tags: "", weight: "",
};

const mzn = (n: number) => `${Number(n).toLocaleString("pt-MZ")} MZN`;
const slugPart = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "PROD";

const newId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

// Lê a foto logo ao escolhê-la e guarda uma cópia em memória (JPEG reduzido).
// No telemóvel o ficheiro original pode deixar de estar acessível passado algum tempo,
// por isso ao guardar o produto nunca dependemos dele.
const processImage = async (file: File): Promise<File> => {
  const base = (file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30)) || "foto";
  const name = `${base}.jpg`;

  const draw = (src: CanvasImageSource, w: number, h: number): Promise<File> => {
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.reject(new Error("canvas"));
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(new File([b], name, { type: "image/jpeg" })) : reject(new Error("blob"))), "image/jpeg", 0.85),
    );
  };

  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      try { return await draw(bmp, bmp.width, bmp.height); } finally { bmp.close(); }
    } catch { /* tenta com <img> */ }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    return await draw(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
};

const Section = ({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {right}
    </div>
    {children}
  </section>
);

const Fold = ({ title, icon: Icon, hint, defaultOpen, children }: {
  title: string; icon: typeof Palette; hint?: string; defaultOpen?: boolean; children: ReactNode;
}) => (
  <Collapsible defaultOpen={defaultOpen} className="rounded-lg border">
    <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 p-3 text-left">
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        {title}
        {hint && <span className="truncate text-xs font-normal text-muted-foreground">{hint}</span>}
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
    <CollapsibleContent className="space-y-4 border-t p-3">{children}</CollapsibleContent>
  </Collapsible>
);

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<ProductForm>({ ...emptyForm });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [selectedColors, setSelectedColors] = useState<{ name: string; hex: string }[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizeCategory, setSizeCategory] = useState("roupas");
  const [customColorHex, setCustomColorHex] = useState("#000000");
  const [customColorName, setCustomColorName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const snapshot = useRef("");

  const fetchData = useCallback(async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    if (p) setProducts(p);
    if (c) setCategories(c);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pré-visualizações das imagens novas (com limpeza de memória)
  const previews = useMemo(() => mediaFiles.map((f) => URL.createObjectURL(f)), [mediaFiles]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const currentSnapshot = () =>
    JSON.stringify([form, selectedColors, selectedSizes, existingImages, mediaFiles.map((f) => f.name + f.size)]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditing(null);
    setMediaFiles([]);
    setExistingImages([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setProcessing(false);
    setSaving(false);
    setProgress("");
  };

  const openNew = () => {
    resetForm();
    snapshot.current = JSON.stringify([emptyForm, [], [], [], []]);
    setDialogOpen(true);
  };

  const loadProduct = (p: any, asCopy = false) => {
    const f: ProductForm = {
      name: asCopy ? `${p.name} (Cópia)` : p.name, description: p.description || "", price_mzn: String(p.price_mzn),
      promotional_price_mzn: p.promotional_price_mzn ? String(p.promotional_price_mzn) : "",
      stock: String(p.stock ?? 0), category_id: p.category_id || "", sku: asCopy ? "" : p.sku || "",
      status: p.status || "active", has_promotion: p.has_promotion || false,
      promotion_start_date: p.promotion_start_date || "", promotion_end_date: p.promotion_end_date || "",
      meta_title: p.meta_title || "", meta_description: p.meta_description || "",
      tags: (p.tags || []).join(", "), weight: p.weight ? String(p.weight) : "",
    };
    const colors = p.color
      ? p.color.split(",").map((c: string) => c.trim()).filter(Boolean).map((c: string) => PREDEFINED_COLORS.find((pc) => pc.name === c) || { name: c, hex: "#888888" })
      : [];
    const sizes = p.size ? p.size.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
    const imgs = p.images || [];

    setEditing(asCopy ? null : p);
    setForm(f);
    setSelectedColors(colors);
    setSelectedSizes(sizes);
    setExistingImages(imgs);
    setMediaFiles([]);
    snapshot.current = JSON.stringify([f, colors, sizes, imgs, []]);
    setDialogOpen(true);
  };

  const requestClose = (open: boolean) => {
    if (open) { setDialogOpen(true); return; }
    if (saving) return;
    if (currentSnapshot() !== snapshot.current && !window.confirm("Tem alterações por guardar. Sair mesmo assim?")) return;
    setDialogOpen(false);
    resetForm();
  };

  // ---------- Fotos ----------
  const addFiles = async (files: File[]) => {
    if (!files.length) return;
    const room = MAX_IMAGES - existingImages.length - mediaFiles.length;
    if (room <= 0) { toast.error(`Máximo de ${MAX_IMAGES} fotos.`); return; }
    if (files.length > room) toast.message(`Só cabem mais ${room} foto(s). As restantes foram ignoradas.`);

    setProcessing(true);
    const ready: File[] = [];
    let failed = 0;
    for (const f of files.slice(0, room)) {
      try { ready.push(await processImage(f)); } catch { failed++; }
    }
    setProcessing(false);

    if (failed) toast.error(failed === 1 ? "Não foi possível ler uma das fotos. Use JPG, PNG ou WebP." : `Não foi possível ler ${failed} fotos. Use JPG, PNG ou WebP.`);
    if (ready.length) setMediaFiles((prev) => [...prev, ...ready]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    await addFiles(files);
    input.value = "";
  };

  const makeMain = (idx: number) => setExistingImages((prev) => [prev[idx], ...prev.filter((_, i) => i !== idx)]);
  const makeMainNew = (idx: number) => setMediaFiles((prev) => [prev[idx], ...prev.filter((_, i) => i !== idx)]);

  const uploadOne = async (productId: string, file: File): Promise<{ path: string; url: string }> => {
    const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: "image/jpeg", upsert: true });
      if (!error) return { path, url: supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl };
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
    throw new Error("upload");
  };

  const removeUploaded = async (list: { path: string }[]) => {
    if (!list.length) return;
    try { await supabase.storage.from("product-images").remove(list.map((u) => u.path)); } catch { /* best-effort */ }
  };

  // Envia todas as fotos novas. Se alguma falhar, apaga as já enviadas e cancela (não cria produto sem foto por engano).
  const uploadAll = async (productId: string) => {
    const done: { path: string; url: string }[] = [];
    try {
      for (let i = 0; i < mediaFiles.length; i++) {
        setProgress(`A enviar fotos ${i + 1}/${mediaFiles.length}...`);
        done.push(await uploadOne(productId, mediaFiles[i]));
      }
      return done;
    } catch (e) {
      await removeUploaded(done);
      throw e;
    }
  };

  // ---------- Validação e guardar ----------
  const price = Number(form.price_mzn) || 0;
  const promo = Number(form.promotional_price_mzn) || 0;
  const promoValid = form.has_promotion && promo > 0 && promo < price;
  const discountPercent = promoValid ? Math.round((1 - promo / price) * 100) : 0;

  const handleSave = async () => {
    if (processing) { toast.message("A preparar as fotos... só um momento."); return; }
    if (!form.name.trim()) { toast.error("Escreva o nome do produto."); return; }
    if (!(price > 0)) { toast.error("Indique o preço do produto."); return; }
    if (form.has_promotion && form.promotional_price_mzn && !promoValid) { toast.error("O preço promocional deve ser menor que o normal."); return; }

    setSaving(true);
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
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      color: selectedColors.map((c) => c.name).join(", ") || null,
      size: selectedSizes.join(", ") || null,
      weight: form.weight || null,
    };

    try {
      if (editing) {
        const uploaded = mediaFiles.length ? await uploadAll(editing.id) : [];
        const { error } = await supabase.from("products").update({ ...payload, images: [...existingImages, ...uploaded.map((u) => u.url)] }).eq("id", editing.id);
        if (error) { await removeUploaded(uploaded); throw error; }
        toast.success("Produto actualizado!");
      } else {
        const id = newId();
        const uploaded = mediaFiles.length ? await uploadAll(id) : [];
        const { error } = await supabase.from("products").insert({ ...payload, id, images: [...existingImages, ...uploaded.map((u) => u.url)] });
        if (error) { await removeUploaded(uploaded); throw error; }
        toast.success("Produto criado!");
      }
    } catch (e: any) {
      toast.error(
        e?.message === "upload"
          ? "Não foi possível enviar as fotos. Verifique a internet e tente de novo. O produto não foi guardado."
          : "Não foi possível guardar o produto. Tente de novo.",
      );
      setSaving(false);
      setProgress("");
      return;
    }

    snapshot.current = currentSnapshot();
    setDialogOpen(false);
    resetForm();
    fetchData();
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

  const totalMediaCount = existingImages.length + mediaFiles.length;
  const colorsHint = [selectedColors.length ? `${selectedColors.length} cor(es)` : "", selectedSizes.length ? `${selectedSizes.length} tamanho(s)` : ""].filter(Boolean).join(" · ");

  const statCards = [
    { t: "Produtos", v: stats.total, i: Package, c: "bg-blue-50 text-blue-600" },
    { t: "Activos", v: stats.active, i: CheckCircle, c: "bg-emerald-50 text-emerald-600" },
    { t: "Stock baixo", v: stats.low, i: AlertTriangle, c: "bg-amber-50 text-amber-600" },
    { t: "Esgotados", v: stats.out, i: XCircle, c: "bg-red-50 text-red-600" },
  ];
  const statusChips = [
    { k: "all", l: "Todos" }, { k: "active", l: "Activos" }, { k: "inactive", l: "Inactivos" }, { k: "low", l: "Stock baixo" }, { k: "out", l: "Esgotados" },
  ];

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

      {/* Formulário único */}
      <Dialog open={dialogOpen} onOpenChange={requestClose}>
        <DialogContent className="flex max-h-[92vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-4 py-3 text-left sm:px-6">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {editing ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription className="sr-only">Preencha os dados do produto e guarde.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
            {/* Fotos */}
            <Section title="Fotos" right={<span className="text-xs text-muted-foreground">{totalMediaCount}/{MAX_IMAGES} · a 1.ª é a capa</span>}>
              <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {existingImages.map((url, i) => (
                  <div key={url + i} className={`relative aspect-square overflow-hidden rounded-lg ${i === 0 ? "ring-2 ring-primary" : "border"}`}>
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {i === 0 ? (
                      <span className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground">Capa</span>
                    ) : (
                      <button type="button" onClick={() => makeMain(i)} title="Definir como capa" className="absolute left-1 top-1 rounded-full bg-background/90 p-1 shadow"><Star className="h-3 w-3" /></button>
                    )}
                    <button type="button" onClick={() => setExistingImages((p) => p.filter((_, j) => j !== i))} title="Remover" className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                {previews.map((url, i) => (
                  <div key={url} className={`relative aspect-square overflow-hidden rounded-lg bg-muted ${existingImages.length === 0 && i === 0 ? "ring-2 ring-primary" : "border"}`}>
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {existingImages.length === 0 && i === 0 ? (
                      <span className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground">Capa</span>
                    ) : existingImages.length === 0 ? (
                      <button type="button" onClick={() => makeMainNew(i)} title="Definir como capa" className="absolute left-1 top-1 rounded-full bg-background/90 p-1 shadow"><Star className="h-3 w-3" /></button>
                    ) : (
                      <span className="absolute left-1 top-1 rounded bg-amber-500 px-1 py-0.5 text-[9px] font-bold text-white">Nova</span>
                    )}
                    <button type="button" onClick={() => setMediaFiles((p) => p.filter((_, j) => j !== i))} title="Remover" className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                {totalMediaCount < MAX_IMAGES && (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={processing}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:opacity-60">
                    {processing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
                    <span className="text-[11px] font-medium">{processing ? "A ler..." : "Adicionar"}</span>
                  </button>
                )}
              </div>
            </Section>

            {/* Dados principais */}
            <Section title="Produto">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Camiseta Casual Premium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Preço (MZN) *</Label>
                  <Input type="number" inputMode="decimal" min="0" step="0.01" value={form.price_mzn} onChange={(e) => setForm({ ...form, price_mzn: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Stock</Label>
                  <Input type="number" inputMode="numeric" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Ex: 20" />
                </div>
              </div>
              {form.stock !== "" && Number(form.stock) <= LOW_STOCK && <p className="-mt-1 text-xs text-amber-600">{Number(form.stock) === 0 ? "O produto vai aparecer como esgotado" : "Stock baixo"}</p>}
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
            </Section>

            {/* Promoção */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /><Label>Preço promocional</Label></div>
                <Switch checked={form.has_promotion} onCheckedChange={(v) => setForm({ ...form, has_promotion: v })} />
              </div>
              {form.has_promotion && (
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="space-y-1.5">
                    <Label>Preço promocional (MZN)</Label>
                    <Input type="number" inputMode="decimal" min="0" step="0.01" value={form.promotional_price_mzn} onChange={(e) => setForm({ ...form, promotional_price_mzn: e.target.value })} />
                    {promoValid && <p className="text-sm font-semibold text-primary">🏷️ {discountPercent}% OFF — de {mzn(price)} por {mzn(promo)}</p>}
                    {form.promotional_price_mzn && !promoValid && <p className="text-sm text-destructive">⚠️ O preço promocional deve ser menor que o normal.</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Início</Label><Input type="date" value={form.promotion_start_date} onChange={(e) => setForm({ ...form, promotion_start_date: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Fim</Label><Input type="date" value={form.promotion_end_date} onChange={(e) => setForm({ ...form, promotion_end_date: e.target.value })} /></div>
                  </div>
                </div>
              )}
            </div>

            {/* Opcionais (fechados por defeito) */}
            <div className="space-y-3">
              <Fold title="Cores e tamanhos" icon={Palette} hint={colorsHint} defaultOpen={selectedColors.length > 0 || selectedSizes.length > 0}>
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
                <div className="space-y-3 border-t pt-4">
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
              </Fold>

              <Fold title="Mais opções" icon={SlidersHorizontal} hint="SKU, peso, tags, SEO">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">SKU</Label>
                    <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Automático" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Peso (kg)</Label>
                    <Input type="number" inputMode="decimal" min="0" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="Ex: 0.5" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tags (separadas por vírgula)</Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="moda, verão, premium" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><Label className="text-xs">Título para pesquisa (Google)</Label><span className="text-xs text-muted-foreground">{form.meta_title.length}/60</span></div>
                  <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} placeholder={form.name || "Igual ao nome, se vazio"} maxLength={60} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><Label className="text-xs">Descrição para pesquisa (Google)</Label><span className="text-xs text-muted-foreground">{form.meta_description.length}/160</span></div>
                  <Textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} maxLength={160} rows={2} />
                </div>
              </Fold>
            </div>
          </div>

          <div className="flex gap-3 border-t bg-background px-4 py-3 sm:px-6">
            <Button type="button" variant="outline" onClick={() => requestClose(false)} disabled={saving}>Cancelar</Button>
            <Button type="button" className="flex-1" onClick={handleSave} disabled={saving || processing}>
              {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{progress || "A guardar..."}</>) : editing ? "Guardar alterações" : "Criar produto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;

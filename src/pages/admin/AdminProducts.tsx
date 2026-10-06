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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Upload, X, ImageIcon, Package, Ruler, Palette, Weight, Hash, Search, Calendar,
  Percent, Globe, Copy, ChevronRight, Check, Star, ExternalLink, AlertTriangle, CheckCircle, XCircle, Sparkles, Loader2,
} from "lucide-react";
import { analyzeProductImage } from "@/lib/aiProduct";

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

// A foto vem primeiro: ao adicioná-la, a IA lê a imagem e preenche o nome.
const STEPS = ["Fotos", "Informações", "Preço", "Variantes", "Entrega & SEO"];
const STEP_IDS = [3, 0, 1, 2, 4]; // posição -> conteúdo (0 info, 1 preço, 2 variantes, 3 fotos, 4 entrega)
const LOW_STOCK = 5;
const MAX_IMAGES = 10;

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

const mzn = (n: number) => `${Number(n).toLocaleString("pt-MZ")} MZN`;
const slugPart = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "PROD";

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<ProductForm>({ ...emptyForm });
  const [step, setStep] = useState(0);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
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
    setAiFilled(false);
    setAiLoading(false);
    setStep(0);
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
      delivery_time_min: String(p.delivery_time_min || 7), delivery_time_max: String(p.delivery_time_max || 20),
      origin: p.origin || "local", meta_title: p.meta_title || "", meta_description: p.meta_description || "",
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
    setAiFilled(false);
    setStep(1); // ao editar, abre directamente em "Informações"
    snapshot.current = JSON.stringify([f, colors, sizes, imgs, []]);
    setDialogOpen(true);
  };

  const requestClose = (open: boolean) => {
    if (open) { setDialogOpen(true); return; }
    if (currentSnapshot() !== snapshot.current && !window.confirm("Tem alterações por guardar. Sair mesmo assim?")) return;
    setDialogOpen(false);
    resetForm();
  };

  // IA: lê a foto e sugere nome, descrição, categoria e tags
  const runAi = async (file: Blob, force = false) => {
    setAiLoading(true);
    try {
      const s = await analyzeProductImage(file, categories.map((c) => c.name));
      if (!s.name) {
        toast.error("Não consegui identificar o produto nesta foto. Escreva o nome manualmente.");
        return;
      }
      const catId = categories.find((c) => c.name === s.category)?.id || "";
      setForm((prev) => ({
        ...prev,
        name: force || !prev.name.trim() ? s.name : prev.name,
        description: prev.description.trim() ? prev.description : s.description,
        category_id: prev.category_id || catId,
        tags: prev.tags.trim() ? prev.tags : s.tags.join(", "),
      }));
      setAiFilled(true);
      toast.success(`Nome sugerido: ${s.name}`);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível analisar a foto. Escreva o nome manualmente.");
    } finally {
      setAiLoading(false);
    }
  };

  const regenerateFromPhoto = async () => {
    let file: Blob | null = mediaFiles[0] ?? null;
    if (!file && existingImages[0]) {
      file = await fetch(existingImages[0]).then((r) => r.blob()).catch(() => null);
    }
    if (!file) { toast.error("Adicione uma foto primeiro."); return; }
    runAi(file, true);
  };

  const addFiles = (files: File[]) => {
    const room = MAX_IMAGES - existingImages.length - mediaFiles.length;
    const images = files.filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    const valid = images.slice(0, Math.max(room, 0)).filter((f) => f.size <= 5 * 1024 * 1024);
    if (valid.length < files.length) toast.error("Aceites: JPG, PNG ou WebP, até 5MB cada, máximo 10 imagens.");
    if (valid.length) {
      // Primeira foto de um produto sem nome: a IA lê a imagem e cria o nome automaticamente
      if (!form.name.trim() && existingImages.length + mediaFiles.length === 0) runAi(valid[0]);
      setMediaFiles((prev) => [...prev, ...valid]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    if (fileRef.current) fileRef.current.value = "";
  };

  const makeMain = (idx: number) => setExistingImages((prev) => [prev[idx], ...prev.filter((_, i) => i !== idx)]);
  const makeMainNew = (idx: number) => setMediaFiles((prev) => [prev[idx], ...prev.filter((_, i) => i !== idx)]);

  const uploadMedia = async (productId: string): Promise<string[]> => {
    const urls: string[] = [];
    let failed = 0;
    for (const file of mediaFiles) {
      const ext = file.name.split(".").pop();
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) { failed++; continue; }
      urls.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    }
    if (failed) toast.error(`${failed} imagem(ns) não foram enviadas.`);
    return urls;
  };

  const price = Number(form.price_mzn) || 0;
  const promo = Number(form.promotional_price_mzn) || 0;
  const promoValid = form.has_promotion && promo > 0 && promo < price;
  const discountPercent = promoValid ? Math.round((1 - promo / price) * 100) : 0;

  // validade por conteúdo (0 nome, 1 preço, ...)
  const contentValid = [
    form.name.trim().length > 0,
    price > 0 && (!form.has_promotion || !form.promotional_price_mzn || promoValid),
    true, true, true,
  ];
  const stepOk = (i: number) => contentValid[STEP_IDS[i]];

  const goNext = () => {
    if (aiLoading) { toast.message("A ler a foto... só um momento."); return; }
    if (!stepOk(step)) {
      toast.error(STEP_IDS[step] === 0 ? "Indique o nome do produto." : "Verifique o preço (e o preço promocional, que deve ser menor).");
      return;
    }
    setStep(step + 1);
  };

  const handleSave = async () => {
    if (!contentValid[0]) { toast.error("Nome é obrigatório."); setStep(STEP_IDS.indexOf(0)); return; }
    if (!contentValid[1]) { toast.error("Verifique o preço."); setStep(STEP_IDS.indexOf(1)); return; }
    setUploading(true);

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
    };

    if (editing) {
      const newUrls = mediaFiles.length ? await uploadMedia(editing.id) : [];
      payload.images = [...existingImages, ...newUrls];
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao actualizar."); setUploading(false); return; }
      toast.success("Produto actualizado!");
    } else {
      payload.images = [];
      const { data, error } = await supabase.from("products").insert(payload).select().single();
      if (error || !data) { toast.error("Erro ao criar."); setUploading(false); return; }
      const newUrls = mediaFiles.length ? await uploadMedia(data.id) : [];
      const images = [...existingImages, ...newUrls];
      if (images.length) await supabase.from("products").update({ images }).eq("id", data.id);
      toast.success("Produto criado!");
    }

    setUploading(false);
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
  const coverImage = existingImages[0] || previews[0];
  const categoryName = categories.find((c) => c.id === form.category_id)?.name;

  const renderStep = () => {
    switch (STEP_IDS[step]) {
      case 0: return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>Nome do Produto *</Label>
              {totalMediaCount > 0 && (
                <button type="button" onClick={regenerateFromPhoto} disabled={aiLoading}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50">
                  {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Gerar da foto
                </button>
              )}
            </div>
            <Input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={aiLoading ? "A ler a foto..." : "Ex: Camiseta Casual Premium"} />
            {aiFilled && !aiLoading && <p className="flex items-center gap-1 text-xs text-primary"><Sparkles className="h-3 w-3" /> Sugerido pela IA a partir da foto. Confira e ajuste se quiser.</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between"><Label>Descrição</Label><span className="text-xs text-muted-foreground">{form.description.length} caracteres</span></div>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Material, medidas, cuidados, o que vem na embalagem..." rows={5} />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Visibilidade na loja</Label>
              <p className="text-xs text-muted-foreground">{form.status === "active" ? "Os clientes podem ver e comprar" : "Escondido da loja"}</p>
            </div>
            <Switch checked={form.status === "active"} onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} />
          </div>
        </div>
      );
      case 1: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Preço Normal (MZN) *</Label>
              <div className="relative">
                <Input type="number" inputMode="decimal" min="0" step="0.01" value={form.price_mzn} onChange={(e) => setForm({ ...form, price_mzn: e.target.value })} className="pl-14" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">MZN</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input type="number" inputMode="numeric" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              {Number(form.stock) <= LOW_STOCK && <p className="text-xs text-amber-600">{Number(form.stock) === 0 ? "Produto aparecerá como esgotado" : "Stock baixo"}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> SKU</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Deixe vazio para gerar automaticamente" />
          </div>
          <Separator />
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /><Label>Preço promocional</Label></div>
            <Switch checked={form.has_promotion} onCheckedChange={(v) => setForm({ ...form, has_promotion: v })} />
          </div>
          {form.has_promotion && (
            <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="space-y-1.5">
                <Label>Preço Promocional (MZN)</Label>
                <div className="relative">
                  <Input type="number" inputMode="decimal" min="0" step="0.01" value={form.promotional_price_mzn} onChange={(e) => setForm({ ...form, promotional_price_mzn: e.target.value })} className="pl-14" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">MZN</span>
                </div>
                {promoValid && <p className="text-sm font-semibold text-primary">🏷️ {discountPercent}% OFF — de {mzn(price)} por {mzn(promo)}</p>}
                {form.promotional_price_mzn && !promoValid && <p className="text-sm text-destructive">⚠️ O preço promocional deve ser menor que o normal.</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Início</Label><Input type="date" value={form.promotion_start_date} onChange={(e) => setForm({ ...form, promotion_start_date: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Término</Label><Input type="date" value={form.promotion_end_date} onChange={(e) => setForm({ ...form, promotion_end_date: e.target.value })} /></div>
              </div>
            </div>
          )}
        </div>
      );
      case 2: return (
        <div className="space-y-6">
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
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Weight className="h-4 w-4" /> Peso (kg)</Label>
            <Input type="number" inputMode="decimal" min="0" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="Ex: 0.5" />
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5"><ImageIcon className="h-4 w-4" /> Galeria de Imagens</Label>
            <Badge variant="secondary">{totalMediaCount}/{MAX_IMAGES}</Badge>
          </div>
          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Adicione a foto e a IA da Laynani Store lê a imagem e cria o nome do produto automaticamente. A primeira imagem é a capa. JPG, PNG ou WebP, até 5MB cada.
          </p>
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
          <div
            onClick={() => totalMediaCount < MAX_IMAGES && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 transition-colors ${totalMediaCount >= MAX_IMAGES ? "cursor-not-allowed border-muted opacity-50" : dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50"}`}
          >
            <Upload className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-center text-sm font-medium text-muted-foreground">Arraste as imagens ou toque para escolher</p>
          </div>

          {(aiLoading || aiFilled || form.name) && totalMediaCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
              {aiLoading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" /> : <Sparkles className="h-5 w-5 shrink-0 text-primary" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{aiLoading ? "A ler a foto..." : aiFilled ? "Nome criado pela IA" : "Nome do produto"}</p>
                {!aiLoading && <p className="truncate text-sm font-semibold">{form.name || "—"}</p>}
              </div>
              {!aiLoading && (
                <Button type="button" size="sm" variant="outline" onClick={regenerateFromPhoto}>Gerar outro</Button>
              )}
            </div>
          )}

          {totalMediaCount > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {existingImages.map((url, i) => (
                <div key={url + i} className={`group relative aspect-square overflow-hidden rounded-lg ${i === 0 ? "ring-2 ring-primary" : "border"}`}>
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {i === 0 ? (
                    <span className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground">Capa</span>
                  ) : (
                    <button type="button" onClick={() => makeMain(i)} title="Definir como capa" className="absolute left-1 top-1 rounded-full bg-background/90 p-1 shadow"><Star className="h-3 w-3" /></button>
                  )}
                  <button type="button" onClick={() => setExistingImages((p) => p.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {previews.map((url, i) => (
                <div key={url} className={`group relative aspect-square overflow-hidden rounded-lg bg-muted ${existingImages.length === 0 && i === 0 ? "ring-2 ring-primary" : "border"}`}>
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {existingImages.length === 0 && i === 0 ? (
                    <span className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground">Capa</span>
                  ) : existingImages.length === 0 ? (
                    <button type="button" onClick={() => makeMainNew(i)} title="Definir como capa" className="absolute left-1 top-1 rounded-full bg-background/90 p-1 shadow"><Star className="h-3 w-3" /></button>
                  ) : (
                    <span className="absolute left-1 top-1 rounded bg-amber-500 px-1 py-0.5 text-[9px] font-bold text-white">Nova</span>
                  )}
                  <button type="button" onClick={() => setMediaFiles((p) => p.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
      case 4: return (
        <div className="space-y-4">
          <div className="space-y-3">
            <Label>🚚 Prazo de entrega (dias úteis)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Mínimo</Label><Input type="number" min="1" value={form.delivery_time_min} onChange={(e) => setForm({ ...form, delivery_time_min: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Máximo</Label><Input type="number" min="1" value={form.delivery_time_max} onChange={(e) => setForm({ ...form, delivery_time_max: e.target.value })} /></div>
            </div>
            {Number(form.delivery_time_min) > Number(form.delivery_time_max) && <p className="text-xs text-destructive">O mínimo não pode ser maior que o máximo.</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Origem</Label>
            <Select value={form.origin} onValueChange={(v) => setForm({ ...form, origin: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local (Moçambique)</SelectItem>
                <SelectItem value="internacional">Internacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-semibold">SEO & Marketing</Label>
            <div className="space-y-1.5">
              <div className="flex justify-between"><Label className="text-xs text-muted-foreground">Meta título</Label><span className="text-xs text-muted-foreground">{form.meta_title.length}/60</span></div>
              <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} placeholder={form.name || "Título para motores de busca"} maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between"><Label className="text-xs text-muted-foreground">Meta descrição</Label><span className="text-xs text-muted-foreground">{form.meta_description.length}/160</span></div>
              <Textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} maxLength={160} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tags (separadas por vírgula)</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="moda, verão, premium" />
            </div>
          </div>

          {/* Pré-visualização */}
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Pré-visualização na loja</Label>
            <div className="flex gap-3 rounded-xl border bg-card p-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {coverImage ? <img src={coverImage} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground/40" /></div>}
              </div>
              <div className="min-w-0">
                {categoryName && <p className="text-[11px] text-muted-foreground">{categoryName}</p>}
                <p className="truncate font-medium">{form.name || "Nome do produto"}</p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className={`font-bold ${promoValid ? "text-destructive" : "text-primary"}`}>{mzn(promoValid ? promo : price)}</span>
                  {promoValid && <><span className="text-xs text-muted-foreground line-through">{mzn(price)}</span><Badge className="bg-destructive text-[10px]">-{discountPercent}%</Badge></>}
                </div>
                <p className="text-xs text-muted-foreground">Entrega em {form.delivery_time_min} a {form.delivery_time_max} dias úteis</p>
              </div>
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

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

      {/* Assistente */}
      <Dialog open={dialogOpen} onOpenChange={requestClose}>
        <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {editing ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 sm:hidden">
              {STEPS.map((s, i) => (
                <button key={s} type="button" onClick={() => setStep(i)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${i === step ? "bg-primary text-primary-foreground" : stepOk(i) && i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {i < step && stepOk(i) ? <Check className="h-4 w-4" /> : i + 1}
                </button>
              ))}
            </div>
            <p className="text-center text-xs font-semibold text-primary sm:hidden">{STEPS[step]}</p>
            <div className="hidden justify-between text-xs text-muted-foreground sm:flex">
              {STEPS.map((s, i) => (
                <button key={s} type="button" onClick={() => setStep(i)}
                  className={`flex items-center gap-1 transition-colors ${i === step ? "font-semibold text-primary" : i < step ? "text-foreground" : ""}`}>
                  {i < step && stepOk(i) ? <Check className="h-3 w-3 text-primary" /> : `${i + 1}.`} {s}
                </button>
              ))}
            </div>
            <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
          </div>

          <div className="min-h-[260px] pt-2">{renderStep()}</div>

          <Separator />
          <div className="flex gap-3">
            {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Anterior</Button>}
            <div className="flex-1" />
            {step < STEPS.length - 1 ? (
              <Button onClick={goNext}>Próximo <ChevronRight className="ml-1 h-4 w-4" /></Button>
            ) : (
              <Button onClick={handleSave} disabled={uploading || aiLoading}>{uploading ? "A guardar..." : editing ? "Guardar alterações" : "Criar Produto"}</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;

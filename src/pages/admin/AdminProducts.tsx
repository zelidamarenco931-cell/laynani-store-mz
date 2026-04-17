import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Upload, X, ImageIcon, Package, Tag, Ruler, Palette,
  Weight, Hash, Search, Calendar, Percent, Globe, Copy, ChevronRight, Check,
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
  roupas: ["P", "M", "G", "GG", "XG", "36", "37", "38", "39", "40", "41", "42"],
  calcados: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  acessorios: ["Único", "P", "M", "G"],
};

const STEPS = ["Informações Básicas", "Preço & Promoção", "Variantes", "Imagens", "Entrega & SEO"];

interface ProductForm {
  name: string; description: string; price_mzn: string; promotional_price_mzn: string;
  stock: string; category_id: string; sku: string; status: string;
  has_promotion: boolean; promotion_start_date: string; promotion_end_date: string;
  delivery_time_min: string; delivery_time_max: string; origin: string;
  meta_title: string; meta_description: string; tags: string;
  weight: string;
}

const emptyForm: ProductForm = {
  name: "", description: "", price_mzn: "", promotional_price_mzn: "",
  stock: "0", category_id: "", sku: "", status: "active",
  has_promotion: false, promotion_start_date: "", promotion_end_date: "",
  delivery_time_min: "7", delivery_time_max: "20", origin: "local",
  meta_title: "", meta_description: "", tags: "", weight: "",
};

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<ProductForm>({ ...emptyForm });
  const [step, setStep] = useState(0);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedColors, setSelectedColors] = useState<{ name: string; hex: string }[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizeCategory, setSizeCategory] = useState("roupas");
  const [customColorHex, setCustomColorHex] = useState("#000000");
  const [customColorName, setCustomColorName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    if (p) setProducts(p);
    if (c) setCategories(c);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditing(null);
    setMediaFiles([]);
    setExistingImages([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setStep(0);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || "", price_mzn: String(p.price_mzn),
      promotional_price_mzn: p.promotional_price_mzn ? String(p.promotional_price_mzn) : "",
      stock: String(p.stock), category_id: p.category_id || "", sku: p.sku || "",
      status: p.status || "active", has_promotion: p.has_promotion || false,
      promotion_start_date: p.promotion_start_date || "", promotion_end_date: p.promotion_end_date || "",
      delivery_time_min: String(p.delivery_time_min || 7), delivery_time_max: String(p.delivery_time_max || 20),
      origin: p.origin || "local", meta_title: p.meta_title || "", meta_description: p.meta_description || "",
      tags: (p.tags || []).join(", "), weight: p.weight || "",
    });
    setExistingImages(p.images || []);
    if (p.color) {
      const colors = p.color.split(",").map((c: string) => c.trim());
      setSelectedColors(colors.map((c: string) => {
        const found = PREDEFINED_COLORS.find(pc => pc.name === c);
        return found || { name: c, hex: "#888888" };
      }));
    } else {
      setSelectedColors([]);
    }
    if (p.size) {
      setSelectedSizes(p.size.split(",").map((s: string) => s.trim()));
    } else {
      setSelectedSizes([]);
    }
    setMediaFiles([]);
    setStep(0);
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 10 - existingImages.length - mediaFiles.length;
    const valid = files.slice(0, maxFiles).filter(f => f.size <= 5 * 1024 * 1024);
    if (valid.length < files.length) toast.error("Máx 10 imagens, 5MB cada.");
    setMediaFiles(prev => [...prev, ...valid]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeNewFile = (idx: number) => setMediaFiles(prev => prev.filter((_, i) => i !== idx));
  const removeExisting = (idx: number) => setExistingImages(prev => prev.filter((_, i) => i !== idx));

  const uploadMedia = async (productId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of mediaFiles) {
      const ext = file.name.split(".").pop();
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) continue;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const discountPercent = form.price_mzn && form.promotional_price_mzn
    ? Math.round((1 - Number(form.promotional_price_mzn) / Number(form.price_mzn)) * 100) : 0;

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório."); setStep(0); return; }
    if (!form.price_mzn || Number(form.price_mzn) <= 0) { toast.error("Preço é obrigatório."); setStep(1); return; }
    if (form.has_promotion && form.promotional_price_mzn) {
      if (Number(form.promotional_price_mzn) >= Number(form.price_mzn)) {
        toast.error("Preço promocional deve ser menor que o normal."); setStep(1); return;
      }
      if (Number(form.promotional_price_mzn) <= 0) {
        toast.error("Preço promocional inválido."); setStep(1); return;
      }
    }
    setUploading(true);

    let allImages = [...existingImages];
    const payload: any = {
      name: form.name, description: form.description,
      price_mzn: Number(form.price_mzn), stock: Number(form.stock) || 0,
      category_id: form.category_id || null, sku: form.sku || null,
      status: form.status,
      has_promotion: form.has_promotion,
      promotional_price_mzn: form.has_promotion && form.promotional_price_mzn ? Number(form.promotional_price_mzn) : null,
      promotion_start_date: form.has_promotion && form.promotion_start_date ? form.promotion_start_date : null,
      promotion_end_date: form.has_promotion && form.promotion_end_date ? form.promotion_end_date : null,
      delivery_time_min: Number(form.delivery_time_min) || 7,
      delivery_time_max: Number(form.delivery_time_max) || 20,
      origin: form.origin,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      color: selectedColors.map(c => c.name).join(", ") || null,
      size: selectedSizes.join(", ") || null,
      weight: form.weight || null,
    };

    if (editing) {
      if (mediaFiles.length > 0) {
        const newUrls = await uploadMedia(editing.id);
        allImages = [...allImages, ...newUrls];
      }
      payload.images = allImages;
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao actualizar."); setUploading(false); return; }
      toast.success("Produto actualizado!");
    } else {
      payload.images = [];
      const { data, error } = await supabase.from("products").insert(payload).select().single();
      if (error || !data) { toast.error("Erro ao criar."); setUploading(false); return; }
      if (mediaFiles.length > 0) {
        const newUrls = await uploadMedia(data.id);
        await supabase.from("products").update({ images: newUrls }).eq("id", data.id);
      }
      toast.success("Produto criado!");
    }

    setUploading(false);
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este produto?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("Produto removido.");
    fetchData();
  };

  const duplicateProduct = (p: any) => {
    openEdit({ ...p, id: undefined, name: `${p.name} (Cópia)` });
    setEditing(null);
  };

  const toggleColor = (color: { name: string; hex: string }) => {
    setSelectedColors(prev =>
      prev.some(c => c.name === color.name)
        ? prev.filter(c => c.name !== color.name)
        : [...prev, color]
    );
  };

  const addCustomColor = () => {
    if (!customColorName.trim()) return;
    toggleColor({ name: customColorName, hex: customColorHex });
    setCustomColorName("");
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMediaCount = existingImages.length + mediaFiles.length;

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do Produto *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Camiseta Casual Premium" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descreva o produto em detalhes..." rows={4} />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Status do Produto</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{form.status === "active" ? "Ativo" : "Inativo"}</span>
              <Switch checked={form.status === "active"} onCheckedChange={v => setForm({ ...form, status: v ? "active" : "inactive" })} />
            </div>
          </div>
        </div>
      );
      case 1: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Preço Normal (MZN) *</Label>
              <div className="relative">
                <Input type="number" min="0" step="0.01" value={form.price_mzn} onChange={e => setForm({ ...form, price_mzn: e.target.value })} className="pl-14" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">MZN</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Estoque Total</Label>
              <Input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> SKU</Label>
            <Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Ex: CAM-001-BK (auto-gerado se vazio)" />
          </div>
          <Separator />
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              <Label>Ativar Preço Promocional</Label>
            </div>
            <Switch checked={form.has_promotion} onCheckedChange={v => setForm({ ...form, has_promotion: v })} />
          </div>
          {form.has_promotion && (
            <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="space-y-1.5">
                <Label>Preço Promocional (MZN)</Label>
                <div className="relative">
                  <Input type="number" min="0" step="0.01" value={form.promotional_price_mzn}
                    onChange={e => setForm({ ...form, promotional_price_mzn: e.target.value })} className="pl-14" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">MZN</span>
                </div>
                {discountPercent > 0 && (
                  <p className="text-sm font-semibold text-primary">
                    🏷️ {discountPercent}% OFF — De {Number(form.price_mzn).toLocaleString("pt-MZ")} por {Number(form.promotional_price_mzn).toLocaleString("pt-MZ")} MZN
                  </p>
                )}
                {form.promotional_price_mzn && Number(form.promotional_price_mzn) >= Number(form.price_mzn) && (
                  <p className="text-sm text-destructive">⚠️ Preço promocional deve ser menor que o normal!</p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Início</Label>
                  <Input type="date" value={form.promotion_start_date} onChange={e => setForm({ ...form, promotion_start_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Término</Label>
                  <Input type="date" value={form.promotion_end_date} onChange={e => setForm({ ...form, promotion_end_date: e.target.value })} />
                </div>
              </div>
            </div>
          )}
        </div>
      );
      case 2: return (
        <div className="space-y-6">
          {/* Colors */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5"><Palette className="h-4 w-4" /> Cores do Produto</Label>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_COLORS.map(color => {
                const selected = selectedColors.some(c => c.name === color.name);
                return (
                  <button key={color.name} type="button" onClick={() => toggleColor(color)}
                    className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${selected ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:border-primary/50"}`}
                    title={color.name}>
                    <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: color.hex }} />
                    {color.name}
                    {selected && <Check className="h-3 w-3 text-primary" />}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="color" value={customColorHex} onChange={e => setCustomColorHex(e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded border" />
              <Input value={customColorName} onChange={e => setCustomColorName(e.target.value)} placeholder="Nome da cor personalizada" className="min-w-[140px] flex-1" />
              <Button type="button" size="sm" variant="outline" onClick={addCustomColor} className="shrink-0">Adicionar</Button>
            </div>
            {selectedColors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedColors.map(c => (
                  <Badge key={c.name} variant="secondary" className="gap-1.5">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.hex }} />
                    {c.name}
                    <button onClick={() => toggleColor(c)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Sizes */}
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
              {(SIZE_OPTIONS[sizeCategory] || []).map(size => {
                const selected = selectedSizes.includes(size);
                return (
                  <button key={size} type="button" onClick={() => toggleSize(size)}
                    className={`min-w-[40px] rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Weight */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Weight className="h-4 w-4" /> Peso (kg)</Label>
            <Input type="number" min="0" step="0.1" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} placeholder="Ex: 0.5" />
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5"><ImageIcon className="h-4 w-4" /> Galeria de Imagens</Label>
            <Badge variant="secondary">{totalMediaCount}/10</Badge>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p>📐 Dimensões ideais: 1080×1080px</p>
            <p>📁 Formatos: JPG, PNG, WebP</p>
            <p>📦 Máximo: 5MB por imagem, 10 imagens por produto</p>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
          <div onClick={() => totalMediaCount < 10 && fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 transition-colors ${totalMediaCount >= 10 ? "opacity-50 cursor-not-allowed border-muted" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50"}`}>
            <Upload className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground text-center">Arrastar e soltar ou clique para selecionar</p>
          </div>

          {existingImages.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Imagens actuais (a 1ª é principal)</p>
              {/* FIX: grid-cols-3 on mobile instead of 4 — avoids cramped thumbnails */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {existingImages.map((url, i) => (
                  <div key={i} className={`group relative aspect-square rounded-lg overflow-hidden ${i === 0 ? "ring-2 ring-primary" : "border"}`}>
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && <span className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground">Principal</span>}
                    <button type="button" onClick={() => removeExisting(i)}
                      className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mediaFiles.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Novas imagens</p>
              {/* FIX: grid-cols-3 on mobile instead of 4 */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {mediaFiles.map((file, i) => (
                  <div key={i} className="group relative aspect-square rounded-lg border overflow-hidden bg-muted">
                    <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeNewFile(i)}
                      className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[10px] text-white truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
      case 4: return (
        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5">🚚 Prazo de Entrega (dias úteis)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mínimo</Label>
                <Input type="number" min="1" value={form.delivery_time_min} onChange={e => setForm({ ...form, delivery_time_min: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Máximo</Label>
                <Input type="number" min="1" value={form.delivery_time_max} onChange={e => setForm({ ...form, delivery_time_max: e.target.value })} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">🚚 Entrega estimada: {form.delivery_time_min} a {form.delivery_time_max} dias úteis</p>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Origem</Label>
            <Select value={form.origin} onValueChange={v => setForm({ ...form, origin: v })}>
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
              <Label className="text-xs text-muted-foreground">Meta Título</Label>
              <Input value={form.meta_title} onChange={e => setForm({ ...form, meta_title: e.target.value })} placeholder="Título para motores de busca" maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Meta Descrição</Label>
              <Textarea value={form.meta_description} onChange={e => setForm({ ...form, meta_description: e.target.value })} placeholder="Descrição para motores de busca" maxLength={160} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tags (separadas por vírgula)</Label>
              <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="Ex: moda, verão, premium" />
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground">{products.length} produto(s) • {categories.length} categoria(s)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
          </DialogTrigger>
          {/* FIX: w-[95vw] ensures dialog doesn't overflow on mobile */}
          <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {editing ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>

            {/* Progress stepper */}
            <div className="space-y-2">
              {/* Mobile: larger numbered circles for easier tapping */}
              <div className="flex sm:hidden items-center justify-between px-1">
                {STEPS.map((s, i) => (
                  <button key={i} onClick={() => setStep(i)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      i === step ? "bg-primary text-primary-foreground"
                        : i < step ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <p className="sm:hidden text-center text-xs font-semibold text-primary">{STEPS[step]}</p>
              {/* Desktop: text labels */}
              <div className="hidden sm:flex justify-between text-xs text-muted-foreground">
                {STEPS.map((s, i) => (
                  <button key={i} onClick={() => setStep(i)}
                    className={`transition-colors ${i === step ? "font-semibold text-primary" : i < step ? "text-foreground" : ""}`}>
                    {i + 1}. {s}
                  </button>
                ))}
              </div>
              <Progress value={(step + 1) / STEPS.length * 100} className="h-1.5" />
            </div>

            <div className="min-h-[260px] pt-2">
              {renderStep()}
            </div>

            <Separator />

            <div className="flex gap-3">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>Anterior</Button>
              )}
              <div className="flex-1" />
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(step + 1)}>
                  Próximo <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={uploading}>
                  {uploading ? "Enviando..." : editing ? "Actualizar Produto" : "Criar Produto"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Pesquisar produtos..." className="pl-10" />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Package className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map(p => (
            <div key={p.id} className="flex items-start gap-3 rounded-xl border p-3 sm:p-4 transition-colors hover:bg-muted/30">
              {/* Thumbnail */}
              <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-lg border bg-muted overflow-hidden">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground/40" /></div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Top row: name + action buttons */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium truncate">{p.name}</p>
                      {p.status === "inactive" && <Badge variant="outline" className="text-[10px] text-destructive">Inativo</Badge>}
                      {p.has_promotion && <Badge className="text-[10px] bg-destructive">PROMO</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {p.categories?.name && <Badge variant="outline" className="text-[10px]">{p.categories.name}</Badge>}
                      <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex shrink-0 gap-0.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateProduct(p)} title="Duplicar"><Copy className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                {/* FIX: Price display — original price with line-through when promo active, promo price highlighted */}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {p.has_promotion && p.promotional_price_mzn ? (
                    <>
                      <p className="font-bold text-destructive text-sm sm:text-base whitespace-nowrap">
                        {Number(p.promotional_price_mzn).toLocaleString("pt-MZ")} MZN
                      </p>
                      <p className="text-xs text-muted-foreground line-through whitespace-nowrap">
                        {Number(p.price_mzn).toLocaleString("pt-MZ")} MZN
                      </p>
                    </>
                  ) : (
                    <p className="font-bold text-primary text-sm sm:text-base whitespace-nowrap">
                      {Number(p.price_mzn).toLocaleString("pt-MZ")} MZN
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
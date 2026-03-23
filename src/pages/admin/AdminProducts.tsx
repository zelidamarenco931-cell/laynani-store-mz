import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, X, ImageIcon, Package, Tag, Ruler, Palette, Weight, Hash, Search } from "lucide-react";

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", price_mzn: "", stock: "",
    category_id: "", sku: "", color: "", size: "", weight: "",
  });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const [{ data: p, error: pErr }, { data: c, error: cErr }] = await Promise.all([
      supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    console.log("Products:", p, pErr);
    console.log("Categories:", c, cErr);
    if (p) setProducts(p);
    if (c) setCategories(c);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setForm({ name: "", description: "", price_mzn: "", stock: "", category_id: "", sku: "", color: "", size: "", weight: "" });
    setEditing(null);
    setMediaFiles([]);
    setExistingImages([]);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || "", price_mzn: String(p.price_mzn),
      stock: String(p.stock), category_id: p.category_id || "", sku: p.sku || "",
      color: p.color || "", size: p.size || "", weight: p.weight || "",
    });
    setExistingImages(p.images || []);
    setMediaFiles([]);
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMediaFiles((prev) => [...prev, ...files]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeNewFile = (idx: number) => setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
  const removeExisting = (idx: number) => setExistingImages((prev) => prev.filter((_, i) => i !== idx));

  const uploadMedia = async (productId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of mediaFiles) {
      const ext = file.name.split(".").pop();
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) { console.error(error); continue; }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório."); return; }
    if (!form.price_mzn || Number(form.price_mzn) <= 0) { toast.error("Preço é obrigatório."); return; }
    setUploading(true);

    let allImages = [...existingImages];

    const payload: any = {
      name: form.name, description: form.description,
      price_mzn: Number(form.price_mzn), stock: Number(form.stock) || 0,
      category_id: form.category_id || null, sku: form.sku || null,
      color: form.color || null, size: form.size || null, weight: form.weight || null,
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

  const isVideo = (name: string) => /\.(mp4|webm|mov|avi)$/i.test(name);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMediaCount = existingImages.length + mediaFiles.length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground">{products.length} produto(s) cadastrado(s) • {categories.length} categoria(s)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {editing ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Section: Informações Básicas */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Tag className="h-4 w-4" />
                  Informações Básicas
                </div>
                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nome do Produto *</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Camiseta Casual Premium" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="desc">Descrição</Label>
                    <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o produto em detalhes..." rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Selecione uma categoria..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {categories.length === 0 && (
                      <p className="text-xs text-destructive">Nenhuma categoria encontrada. Verifique se está autenticado como admin.</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section: Preço & Stock */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Package className="h-4 w-4" />
                  Preço & Stock
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="price">Preço (MZN) *</Label>
                    <div className="relative">
                      <Input id="price" type="number" min="0" step="0.01" value={form.price_mzn} onChange={(e) => setForm({ ...form, price_mzn: e.target.value })} placeholder="0.00" className="pl-14" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">MZN</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stock">Quantidade em Stock</Label>
                    <Input id="stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sku" className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" /> SKU (Código do Produto)
                  </Label>
                  <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ex: CAM-001-BK" />
                </div>
              </div>

              <Separator />

              {/* Section: Variantes */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Ruler className="h-4 w-4" />
                  Variantes & Especificações
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="color" className="flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5" /> Cor
                    </Label>
                    <Input id="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Preto, Azul" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="size" className="flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5" /> Tamanho
                    </Label>
                    <Input id="size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="M, L, 42" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="weight" className="flex items-center gap-1.5">
                      <Weight className="h-3.5 w-3.5" /> Peso
                    </Label>
                    <Input id="weight" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="500g, 1.2kg" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section: Media */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <ImageIcon className="h-4 w-4" />
                    Fotos & Vídeos
                  </div>
                  {totalMediaCount > 0 && (
                    <Badge variant="secondary">{totalMediaCount} ficheiro(s)</Badge>
                  )}
                </div>

                <input ref={fileRef} type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50"
                >
                  <Upload className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium text-muted-foreground">Clique para selecionar fotos e vídeos</p>
                  <p className="text-xs text-muted-foreground/60">JPG, PNG, MP4, WebM — múltiplos ficheiros</p>
                </div>

                {/* Existing images */}
                {existingImages.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Imagens actuais</p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {existingImages.map((url, i) => (
                        <div key={i} className="group relative aspect-square rounded-lg border overflow-hidden">
                          {isVideo(url) ? (
                            <video src={url} className="h-full w-full object-cover" />
                          ) : (
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          )}
                          <button type="button" onClick={() => removeExisting(i)}
                            className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New files preview */}
                {mediaFiles.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Novos ficheiros</p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {mediaFiles.map((file, i) => (
                        <div key={i} className="group relative aspect-square rounded-lg border overflow-hidden bg-muted">
                          {file.type.startsWith("video/") ? (
                            <video src={URL.createObjectURL(file)} className="h-full w-full object-cover" />
                          ) : (
                            <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                          )}
                          <button type="button" onClick={() => removeNewFile(i)}
                            className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            <X className="h-3 w-3" />
                          </button>
                          <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[10px] text-white truncate">
                            {file.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="flex-1" disabled={uploading}>
                  {uploading ? "Enviando..." : editing ? "Actualizar Produto" : "Criar Produto"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar produtos..."
          className="pl-10"
        />
      </div>

      {/* Product list */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Package className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Nenhum produto encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground/60">Adicione o primeiro produto clicando em "Novo Produto"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/30">
              <div className="h-14 w-14 shrink-0 rounded-lg border bg-muted overflow-hidden">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  {p.categories?.name && <Badge variant="outline" className="text-[10px]">{p.categories.name}</Badge>}
                  <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
                </div>
                {(p.color || p.size || p.weight) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[p.color && `Cor: ${p.color}`, p.size && `Tam: ${p.size}`, p.weight && `Peso: ${p.weight}`].filter(Boolean).join(" • ")}
                  </p>
                )}
              </div>
              <p className="font-bold text-primary whitespace-nowrap">{Number(p.price_mzn).toLocaleString("pt-MZ")} MZN</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;

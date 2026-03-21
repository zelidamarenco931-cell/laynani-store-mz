import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, X, ImageIcon } from "lucide-react";

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", description: "", price_mzn: "", stock: "",
    category_id: "", sku: "", color: "", size: "", weight: "",
  });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*"),
    ]);
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
    setUploading(true);

    let allImages = [...existingImages];

    // If creating, we need product ID first
    const payload: any = {
      name: form.name, description: form.description,
      price_mzn: Number(form.price_mzn), stock: Number(form.stock),
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
    if (!confirm("Tem certeza?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("Produto removido.");
    fetchData();
  };

  const isVideo = (name: string) => /\.(mp4|webm|mov|avi)$/i.test(name);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader><DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Preço (MZN)</Label><Input type="number" value={form.price_mzn} onChange={(e) => setForm({ ...form, price_mzn: e.target.value })} /></div>
                <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Cor</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Ex: Preto, Azul" /></div>
                <div><Label>Tamanho</Label><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="Ex: M, L, 42" /></div>
                <div><Label>Peso</Label><Input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="Ex: 500g, 1.2kg" /></div>
              </div>
              <div><Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>

              {/* Media upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Fotos e Vídeos</Label>
                <input ref={fileRef} type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
                <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> Selecionar da Galeria
                </Button>

                {/* Existing images */}
                {existingImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
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
                )}

                {/* New files preview */}
                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
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
                )}
              </div>

              <Button onClick={handleSave} className="w-full" disabled={uploading}>
                {uploading ? "Enviando..." : editing ? "Actualizar" : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-4 rounded-xl border p-4 shadow-card">
            {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="h-14 w-14 rounded-lg object-cover" loading="lazy" />}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{p.name}</p>
              <p className="text-sm text-muted-foreground">{p.categories?.name} • Stock: {p.stock}</p>
              {(p.color || p.size || p.weight) && (
                <p className="text-xs text-muted-foreground">
                  {[p.color && `Cor: ${p.color}`, p.size && `Tam: ${p.size}`, p.weight && `Peso: ${p.weight}`].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>
            <p className="font-bold text-primary">{Number(p.price_mzn).toLocaleString("pt-MZ")} MZN</p>
            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminProducts;

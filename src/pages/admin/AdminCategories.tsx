import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, X, FolderOpen, ImageIcon } from "lucide-react";

const AdminCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", slug: "", image_url: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  };

  useEffect(() => { fetchCategories(); }, []);

  const resetForm = () => {
    setForm({ name: "", slug: "", image_url: "" });
    setEditing(null);
    setImageFile(null);
  };

  const generateSlug = (name: string) =>
    name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, image_url: c.image_url || "" });
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório."); return; }
    setUploading(true);

    let imageUrl = form.image_url;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `categories/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, imageFile);
      if (!error) {
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    }

    const slug = form.slug || generateSlug(form.name);
    const payload = { name: form.name, slug, image_url: imageUrl || null };

    if (editing) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao actualizar."); setUploading(false); return; }
      toast.success("Categoria actualizada!");
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) { toast.error("Erro ao criar. Verifique se o slug já existe."); setUploading(false); return; }
      toast.success("Categoria criada!");
    }

    setUploading(false);
    setDialogOpen(false);
    resetForm();
    fetchCategories();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover a categoria "${name}"? Produtos associados ficarão sem categoria.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover."); return; }
    toast.success("Categoria removida.");
    fetchCategories();
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-sm text-muted-foreground">{categories.length} categoria(s)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nova Categoria</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                {editing ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm({ ...form, name, slug: editing ? form.slug : generateSlug(name) });
                  }}
                  placeholder="Ex: Moda Feminina"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug (URL)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="moda-feminina"
                />
                <p className="text-xs text-muted-foreground">Gerado automaticamente a partir do nome</p>
              </div>
              <div className="space-y-1.5">
                <Label>Imagem</Label>
                <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="hidden" />

                {(form.image_url || imageFile) && (
                  <div className="relative w-full h-32 rounded-lg border overflow-hidden bg-muted">
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : form.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setForm({ ...form, image_url: "" }); }}
                      className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> {form.image_url || imageFile ? "Alterar Imagem" : "Selecionar Imagem"}
                </Button>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ou cole um URL de imagem</Label>
                  <Input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="flex-1" disabled={uploading}>
                  {uploading ? "Salvando..." : editing ? "Actualizar" : "Criar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <FolderOpen className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Nenhuma categoria</p>
          <p className="mt-1 text-sm text-muted-foreground/60">Crie a primeira categoria para organizar os produtos</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="group flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30">
              <div className="h-12 w-12 shrink-0 rounded-lg border bg-muted overflow-hidden">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">/{c.slug}</p>
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id, c.name)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCategories;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", price_mzn: "", stock: "", category_id: "", sku: "", images: "" });

  const fetchData = async () => {
    const { data: p } = await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false });
    const { data: c } = await supabase.from("categories").select("*");
    if (p) setProducts(p);
    if (c) setCategories(c);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setForm({ name: "", description: "", price_mzn: "", stock: "", category_id: "", sku: "", images: "" });
    setEditing(null);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || "", price_mzn: String(p.price_mzn),
      stock: String(p.stock), category_id: p.category_id || "", sku: p.sku || "",
      images: (p.images || []).join(", "),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name, description: form.description,
      price_mzn: Number(form.price_mzn), stock: Number(form.stock),
      category_id: form.category_id || null, sku: form.sku || null,
      images: form.images.split(",").map((s) => s.trim()).filter(Boolean),
    };

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao actualizar."); return; }
      toast.success("Produto actualizado!");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error("Erro ao criar."); return; }
      toast.success("Produto criado!");
    }
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Preço (MZN)</Label><Input type="number" value={form.price_mzn} onChange={(e) => setForm({ ...form, price_mzn: e.target.value })} /></div>
                <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              </div>
              <div><Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              <div><Label>URLs das Imagens (separadas por vírgula)</Label><Input value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} /></div>
              <Button onClick={handleSave} className="w-full">{editing ? "Actualizar" : "Criar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-4 rounded-xl border p-4 shadow-card">
            {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="h-14 w-14 rounded-lg object-cover" />}
            <div className="flex-1">
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted-foreground">{p.categories?.name} • Stock: {p.stock}</p>
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

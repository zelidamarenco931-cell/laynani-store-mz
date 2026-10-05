import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Loader2, Package, ArrowLeft, Check, ExternalLink, Plus } from "lucide-react";

const ImportProduct = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [product, setProduct] = useState<any>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    price_mzn: "",
    promotional_price_mzn: "",
    stock: "10",
    category_id: "",
    delivery_time_min: "7",
    delivery_time_max: "20",
    status: "active",
  });

  useEffect(() => {
    supabase.from("categories").select("*").order("name").then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  const manualMode = (message: string) => {
    toast.info(message);
    setProduct({ manual: true, images: [] });
    setSelectedImages([]);
  };

  const extractFromUrl = async () => {
    if (!url.trim()) { toast.error("Cole um link do produto!"); return; }

    setLoading(true);
    setProduct(null);
    setExtraImages([]);

    try {
      const { data, error } = await supabase.functions.invoke("import-product", {
        body: { url: url.trim() },
      });

      if (error) {
        // Tenta ler a mensagem de erro devolvida pela função
        let message = "Não foi possível ler o link. Preencha os dados manualmente.";
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) message = body.error;
        } catch { /* mantém a mensagem padrão */ }
        manualMode(message);
        setLoading(false);
        return;
      }

      if (!data?.found) {
        manualMode(data?.note || "A loja não devolveu os dados. Preencha manualmente.");
        setLoading(false);
        return;
      }

      setProduct(data);
      setSelectedImages((data.images || []).slice(0, 5));
      setForm(prev => ({
        ...prev,
        name: data.name || "",
        description: data.description || "",
      }));
      toast.success("Produto lido! Confira os dados e defina o preço em MZN.");
    } catch (err) {
      console.error(err);
      manualMode("Erro ao processar o link. Preencha manualmente.");
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Nome é obrigatório!"); return; }
    if (!form.price_mzn) { toast.error("Preço é obrigatório!"); return; }

    setSaving(true);

    const { error } = await supabase.from("products").insert({
      name: form.name,
      description: form.description,
      price_mzn: parseFloat(form.price_mzn),
      promotional_price_mzn: form.promotional_price_mzn ? parseFloat(form.promotional_price_mzn) : null,
      stock: parseInt(form.stock),
      category_id: form.category_id || null,
      delivery_time_min: parseInt(form.delivery_time_min),
      delivery_time_max: parseInt(form.delivery_time_max),
      status: form.status,
      images: selectedImages,
      has_promotion: !!form.promotional_price_mzn,
    } as any);

    if (error) {
      toast.error("Erro ao guardar produto.");
      console.error(error);
    } else {
      toast.success("Produto importado com sucesso!");
      navigate("/admin/produtos");
    }

    setSaving(false);
  };

  const toggleImage = (img: string) => {
    setSelectedImages(prev =>
      prev.includes(img) ? prev.filter(i => i !== img) : [...prev, img]
    );
  };

  const addImageByUrl = () => {
    const link = imageUrl.trim();
    if (!/^https?:\/\//i.test(link)) { toast.error("Cole o link de uma imagem (https://...)."); return; }
    if (!extraImages.includes(link)) setExtraImages(prev => [...prev, link]);
    setSelectedImages(prev => (prev.includes(link) ? prev : [...prev, link]));
    setImageUrl("");
  };

  const allImages: string[] = [...(product?.images || []), ...extraImages];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/produtos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Importar Produto</h1>
          <p className="text-sm text-muted-foreground">Cole um link do Pinduoduo, AliExpress, Shein ou Temu</p>
        </div>
      </div>

      {/* URL Input */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <Label className="text-base font-medium">Link do Produto</Label>
        <div className="flex gap-2">
          <Input
            placeholder="https://www.aliexpress.com/item/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && extractFromUrl()}
            className="flex-1"
          />
          <Button onClick={extractFromUrl} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "A ler..." : "Extrair"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Algumas lojas bloqueiam a leitura automática. Nesse caso o formulário abre vazio e pode preencher à mão e adicionar imagens por link.
        </p>
      </div>

      {/* Product Preview + Form */}
      {product && (
        <div className="space-y-5">
          {/* Images */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Imagens ({selectedImages.length} seleccionadas)</Label>
              {allImages.length > 0 && <span className="text-xs text-muted-foreground">Clique para seleccionar/remover</span>}
            </div>
            {allImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {allImages.map((img: string, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleImage(img)}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImages.includes(img) ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    {selectedImages.includes(img) && (
                      <div className="absolute right-1 top-1 rounded-full bg-primary p-0.5">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addImageByUrl()}
                placeholder="Adicionar imagem por link (https://...)"
              />
              <Button type="button" variant="outline" onClick={addImageByUrl}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Info extraída */}
          {!product.manual && (
            <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Info lida da loja</p>
              <div className="flex flex-wrap gap-2">
                {product.source && <Badge variant="outline">{product.source}</Badge>}
                {product.original_price && <Badge variant="outline">Preço original: {product.original_price}</Badge>}
              </div>
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> Ver produto original
              </a>
            </div>
          )}

          {/* Form */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <p className="font-medium">Dados do Produto</p>

            <div className="space-y-2">
              <Label>Nome do Produto *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do produto" />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Descrição do produto..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço (MZN) *</Label>
                <Input type="number" value={form.price_mzn} onChange={e => setForm(p => ({ ...p, price_mzn: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Preço Promocional (MZN)</Label>
                <Input type="number" value={form.promotional_price_mzn} onChange={e => setForm(p => ({ ...p, promotional_price_mzn: e.target.value }))} placeholder="Opcional" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={v => setForm(p => ({ ...p, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prazo mínimo (dias)</Label>
                <Input type="number" value={form.delivery_time_min} onChange={e => setForm(p => ({ ...p, delivery_time_min: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Prazo máximo (dias)</Label>
                <Input type="number" value={form.delivery_time_max} onChange={e => setForm(p => ({ ...p, delivery_time_max: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Save */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/admin/produtos")}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
              {saving ? "A guardar..." : "Guardar Produto"}
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!product && !loading && (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">Cole um link acima para ler o produto automaticamente</p>
        </div>
      )}
    </div>
  );
};

export default ImportProduct;

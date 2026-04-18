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
  Plus, Pencil, Trash2, Upload, X, ImageIcon, Package,
  Palette, Search, Percent, Copy, ChevronRight, Check, Tag,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const PREDEFINED_COLORS = [
  { name: "Black",  hex: "#000000" }, { name: "White",  hex: "#FFFFFF" },
  { name: "Red",    hex: "#EF4444" }, { name: "Blue",   hex: "#3B82F6" },
  { name: "Green",  hex: "#22C55E" }, { name: "Yellow", hex: "#EAB308" },
  { name: "Pink",   hex: "#EC4899" }, { name: "Purple", hex: "#8B5CF6" },
  { name: "Orange", hex: "#F97316" }, { name: "Gray",   hex: "#6B7280" },
  { name: "Beige",  hex: "#D2B48C" }, { name: "Brown",  hex: "#92400E" },
  { name: "Gold",   hex: "#D4AF37" }, { name: "Silver", hex: "#C0C0C0" },
  { name: "Navy",   hex: "#1E3A5F" }, { name: "Cream",  hex: "#FFFDD0" },
];

const SIZE_OPTIONS: Record<string, string[]> = {
  clothing:    ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
  shoes:       ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  accessories: ["One Size", "S", "M", "L"],
  kids:        ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y", "14Y"],
};

const SIZE_LABELS: Record<string, string> = {
  clothing: "Clothing", shoes: "Shoes", accessories: "Accessories", kids: "Kids",
};

const STEPS = ["Basic Info", "Price & Stock", "Variants", "Images"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductForm {
  name: string; description: string; price_mzn: string;
  promotional_price_mzn: string; stock: string; category_id: string;
  sku: string; status: string; has_promotion: boolean;
}

const emptyForm: ProductForm = {
  name: "", description: "", price_mzn: "", promotional_price_mzn: "",
  stock: "0", category_id: "", sku: "", status: "active", has_promotion: false,
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminProducts = () => {
  const [products, setProducts]         = useState<any[]>([]);
  const [categories, setCategories]     = useState<any[]>([]);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editing, setEditing]           = useState<any>(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [form, setForm]                 = useState<ProductForm>({ ...emptyForm });
  const [step, setStep]                 = useState(0);
  const [mediaFiles, setMediaFiles]     = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [selectedColors, setSelectedColors] = useState<{ name: string; hex: string }[]>([]);
  const [selectedSizes, setSelectedSizes]   = useState<string[]>([]);
  const [sizeCategory, setSizeCategory]     = useState("clothing");
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
    setForm({ ...emptyForm }); setEditing(null);
    setMediaFiles([]); setExistingImages([]);
    setSelectedColors([]); setSelectedSizes([]);
    setSizeCategory("clothing"); setStep(0);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || "",
      price_mzn: String(p.price_mzn),
      promotional_price_mzn: p.promotional_price_mzn ? String(p.promotional_price_mzn) : "",
      stock: String(p.stock), category_id: p.category_id || "",
      sku: p.sku || "", status: p.status || "active",
      has_promotion: p.has_promotion || false,
    });
    setExistingImages(p.images || []);
    if (p.color) {
      const colors = p.color.split(",").map((c: string) => c.trim());
      setSelectedColors(colors.map((c: string) => {
        const found = PREDEFINED_COLORS.find(pc => pc.name === c);
        return found || { name: c, hex: "#888888" };
      }));
    } else { setSelectedColors([]); }
    if (p.size) {
      setSelectedSizes(p.size.split(",").map((s: string) => s.trim()));
    } else { setSelectedSizes([]); }
    setMediaFiles([]); setStep(0); setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 10 - existingImages.length - mediaFiles.length;
    const valid = files.slice(0, maxFiles).filter(f => f.size <= 5 * 1024 * 1024);
    if (valid.length < files.length) toast.error("Max 10 images, 5MB each.");
    setMediaFiles(prev => [...prev, ...valid]);
    if (fileRef.current) fileRef.current.value = "";
  };

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
    if (!form.name.trim()) { toast.error("Product name is required."); setStep(0); return; }
    if (!form.price_mzn || Number(form.price_mzn) <= 0) { toast.error("Price is required."); setStep(1); return; }
    if (form.has_promotion && form.promotional_price_mzn) {
      if (Number(form.promotional_price_mzn) >= Number(form.price_mzn)) {
        toast.error("Sale price must be lower than regular price."); setStep(1); return;
      }
    }
    setUploading(true);

    let allImages = [...existingImages];
    const payload: any = {
      name: form.name, description: form.description,
      price_mzn: Number(form.price_mzn), stock: Number(form.stock) || 0,
      category_id: form.category_id || null, sku: form.sku || null,
      status: form.status, has_promotion: form.has_promotion,
      promotional_price_mzn: form.has_promotion && form.promotional_price_mzn
        ? Number(form.promotional_price_mzn) : null,
      color: selectedColors.map(c => c.name).join(", ") || null,
      size: selectedSizes.join(", ") || null,
    };

    if (editing) {
      if (mediaFiles.length > 0) {
        const newUrls = await uploadMedia(editing.id);
        allImages = [...allImages, ...newUrls];
      }
      payload.images = allImages;
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error("Failed to update product."); setUploading(false); return; }
      toast.success("Product updated!");
    } else {
      payload.images = [];
      const { data, error } = await supabase.from("products").insert(payload).select().single();
      if (error || !data) { toast.error("Failed to create product."); setUploading(false); return; }
      if (mediaFiles.length > 0) {
        const newUrls = await uploadMedia(data.id);
        await supabase.from("products").update({ images: newUrls }).eq("id", data.id);
      }
      toast.success("Product created!");
    }

    setUploading(false); setDialogOpen(false); resetForm(); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("Product deleted."); fetchData();
  };

  const duplicateProduct = (p: any) => {
    openEdit({ ...p, id: undefined, name: `${p.name} (Copy)` });
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

  // ─── Steps ──────────────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {

      case 0: return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Product Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Premium Cotton T-Shirt"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your product in detail..."
              rows={4}
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Category</Label>
            <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select a category..." /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
            <div>
              <Label className="text-sm font-medium">Product Status</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Visible to customers when active</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${form.status === "active" ? "text-green-600" : "text-muted-foreground"}`}>
                {form.status === "active" ? "Active" : "Inactive"}
              </span>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={v => setForm({ ...form, status: v ? "active" : "inactive" })}
              />
            </div>
          </div>
        </div>
      );

      case 1: return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Price (MZN) <span className="text-destructive">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">MZN</span>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.price_mzn}
                  onChange={e => setForm({ ...form, price_mzn: e.target.value })}
                  className="h-11 pl-14" placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Stock Quantity</Label>
              <Input
                type="number" min="0"
                value={form.stock}
                onChange={e => setForm({ ...form, stock: e.target.value })}
                className="h-11" placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">SKU</Label>
            <Input
              value={form.sku}
              onChange={e => setForm({ ...form, sku: e.target.value })}
              placeholder="e.g. TEE-001-BLK (auto-generated if empty)"
              className="h-11"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <Percent className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <Label className="text-sm font-medium">Sale Price</Label>
                <p className="text-xs text-muted-foreground">Enable a discounted price</p>
              </div>
            </div>
            <Switch checked={form.has_promotion} onCheckedChange={v => setForm({ ...form, has_promotion: v })} />
          </div>
          {form.has_promotion && (
            <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Sale Price (MZN)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">MZN</span>
                  <Input
                    type="number" min="0" step="0.01"
                    value={form.promotional_price_mzn}
                    onChange={e => setForm({ ...form, promotional_price_mzn: e.target.value })}
                    className="h-11 pl-14 border-destructive/30" placeholder="0.00"
                  />
                </div>
              </div>
              {discountPercent > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
                  <Tag className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-sm font-semibold text-destructive">
                    {discountPercent}% OFF — {Number(form.price_mzn).toLocaleString("pt-MZ")} → {Number(form.promotional_price_mzn).toLocaleString("pt-MZ")} MZN
                  </p>
                </div>
              )}
              {form.promotional_price_mzn && Number(form.promotional_price_mzn) >= Number(form.price_mzn) && (
                <p className="text-xs text-destructive">⚠️ Sale price must be lower than regular price</p>
              )}
            </div>
          )}
        </div>
      );

      case 2: return (
        <div className="space-y-6">
          {/* Colors */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Colours</Label>
              {selectedColors.length > 0 && (
                <Badge variant="secondary" className="text-xs">{selectedColors.length} selected</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_COLORS.map(color => {
                const selected = selectedColors.some(c => c.name === color.name);
                return (
                  <button key={color.name} type="button" onClick={() => toggleColor(color)}
                    className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                      selected ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:border-primary/50"
                    }`}>
                    <span className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-sm shrink-0" style={{ backgroundColor: color.hex }} />
                    {color.name}
                    {selected && <Check className="h-3 w-3 text-primary" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-3">
              <input type="color" value={customColorHex} onChange={e => setCustomColorHex(e.target.value)}
                className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border" />
              <Input value={customColorName} onChange={e => setCustomColorName(e.target.value)}
                placeholder="Custom colour name..." className="h-9 flex-1"
                onKeyDown={e => e.key === "Enter" && addCustomColor()} />
              <Button type="button" size="sm" variant="outline" onClick={addCustomColor} className="shrink-0 h-9">Add</Button>
            </div>
            {selectedColors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedColors.map(c => (
                  <Badge key={c.name} variant="secondary" className="gap-1.5 pl-1.5 pr-1">
                    <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                    {c.name}
                    <button onClick={() => toggleColor(c)} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Sizes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Sizes</Label>
              {selectedSizes.length > 0 && (
                <Badge variant="secondary" className="text-xs">{selectedSizes.length} selected</Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(SIZE_LABELS).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setSizeCategory(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    sizeCategory === key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(SIZE_OPTIONS[sizeCategory] || []).map(size => {
                const selected = selectedSizes.includes(size);
                return (
                  <button key={size} type="button" onClick={() => toggleSize(size)}
                    className={`min-w-[44px] rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border hover:border-primary/50"
                    }`}>
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );

      case 3: return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Product Images</Label>
            </div>
            <Badge variant={totalMediaCount >= 10 ? "destructive" : "secondary"} className="text-xs">
              {totalMediaCount}/10
            </Badge>
          </div>
          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p>📐 Ideal: 1080×1080px · 📁 JPG, PNG, WebP · Max 5MB each</p>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect} className="hidden" />
          <div onClick={() => totalMediaCount < 10 && fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
              totalMediaCount >= 10
                ? "opacity-40 cursor-not-allowed border-muted"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40"
            }`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Drop images here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-0.5">First image will be the main product photo</p>
            </div>
          </div>
          {existingImages.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Images</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {existingImages.map((url, i) => (
                  <div key={i} className={`group relative aspect-square rounded-xl overflow-hidden ${i === 0 ? "ring-2 ring-primary ring-offset-1" : "border"}`}>
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && <span className="absolute left-1 top-1 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">Main</span>}
                    <button type="button" onClick={() => setExistingImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {mediaFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New Images</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {mediaFiles.map((file, i) => (
                  <div key={i} className="group relative aspect-square rounded-xl border overflow-hidden bg-muted">
                    <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );

      default: return null;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full min-w-0 overflow-x-hidden">

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} product{products.length !== 1 ? "s" : ""} · {categories.length} categories
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto gap-2">
              <Plus className="h-4 w-4" /> New Product
            </Button>
          </DialogTrigger>

          <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {editing ? "Edit Product" : "New Product"}
              </DialogTitle>
            </DialogHeader>

            {/* Progress stepper */}
            <div className="space-y-3">
              <div className="flex sm:hidden items-center justify-center gap-4">
                {STEPS.map((_, i) => (
                  <button key={i} onClick={() => setStep(i)}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      i === step ? "bg-primary text-primary-foreground shadow-md scale-110"
                      : i < step ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                    }`}>
                      {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                  </button>
                ))}
              </div>
              <p className="sm:hidden text-center text-sm font-semibold text-primary">{STEPS[step]}</p>

              <div className="hidden sm:flex justify-between">
                {STEPS.map((s, i) => (
                  <button key={i} onClick={() => setStep(i)}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${
                      i === step ? "font-semibold text-primary"
                      : i < step ? "text-foreground font-medium"
                      : "text-muted-foreground"
                    }`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      i === step ? "bg-primary text-primary-foreground"
                      : i < step ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                    }`}>
                      {i < step ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    {s}
                  </button>
                ))}
              </div>
              <Progress value={(step + 1) / STEPS.length * 100} className="h-1.5" />
            </div>

            <div className="min-h-[280px] pt-1">{renderStep()}</div>

            <Separator />

            <div className="flex items-center gap-3">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
              )}
              <div className="flex-1" />
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(step + 1)} className="gap-1.5">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={uploading} className="min-w-[140px]">
                  {uploading ? "Saving..." : editing ? "Update Product" : "Create Product"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search products..." className="pl-10" />
      </div>

      {/* Product list */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Package className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No products found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Add your first product to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map(p => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/30">
              <div className="h-14 w-14 shrink-0 rounded-xl border bg-muted overflow-hidden">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold truncate">{p.name}</p>
                      {p.status === "inactive" && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>
                      )}
                      {p.has_promotion && <Badge className="text-[10px] bg-destructive">SALE</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {p.categories?.name && <span className="text-xs text-muted-foreground">{p.categories.name}</span>}
                      <span className="text-xs text-muted-foreground">· Stock: {p.stock}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => duplicateProduct(p)} title="Duplicate">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {p.has_promotion && p.promotional_price_mzn ? (
                    <>
                      <p className="font-bold text-destructive text-sm">{Number(p.promotional_price_mzn).toLocaleString("pt-MZ")} MZN</p>
                      <p className="text-xs text-muted-foreground line-through">{Number(p.price_mzn).toLocaleString("pt-MZ")} MZN</p>
                    </>
                  ) : (
                    <p className="font-bold text-primary text-sm">{Number(p.price_mzn).toLocaleString("pt-MZ")} MZN</p>
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
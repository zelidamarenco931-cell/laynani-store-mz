import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const AdminSettings = () => {
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponForm, setCouponForm] = useState({ code: "", discount_type: "percent" as "percent" | "fixed", value: "", min_purchase: "", active: true });
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);

  const fetchData = async () => {
    const { data: sr } = await supabase.from("shipping_rates").select("*").order("province");
    const { data: cp } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    if (sr) setShippingRates(sr);
    if (cp) setCoupons(cp);
  };

  useEffect(() => { fetchData(); }, []);

  const updateRate = async (id: string, price_mzn: number) => {
    await supabase.from("shipping_rates").update({ price_mzn }).eq("id", id);
    toast.success("Frete actualizado.");
    fetchData();
  };

  const saveCoupon = async () => {
    const { error } = await supabase.from("coupons").insert({
      code: couponForm.code.toUpperCase(),
      discount_type: couponForm.discount_type,
      value: Number(couponForm.value),
      min_purchase: Number(couponForm.min_purchase) || 0,
      active: couponForm.active,
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Cupom criado!");
    setCouponDialogOpen(false);
    setCouponForm({ code: "", discount_type: "percent", value: "", min_purchase: "", active: true });
    fetchData();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Cupom removido.");
    fetchData();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-6 text-2xl font-bold">Configurações</h1>

        {/* Shipping rates */}
        <h2 className="mb-4 text-lg font-semibold">Taxas de Frete por Província</h2>
        <div className="space-y-2">
          {shippingRates.map((r) => (
            <div key={r.id} className="flex items-center gap-4 rounded-lg border p-3">
              <span className="flex-1 text-sm font-medium">{r.province}</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  defaultValue={r.price_mzn}
                  className="w-28"
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== r.price_mzn) updateRate(r.id, v);
                  }}
                />
                <span className="text-xs text-muted-foreground">MZN</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coupons */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cupons de Desconto</h2>
          <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Novo Cupom</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Cupom</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Código</Label><Input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })} placeholder="EX: BEMVINDO10" /></div>
                <div><Label>Tipo</Label>
                  <Select value={couponForm.discount_type} onValueChange={(v: "percent" | "fixed") => setCouponForm({ ...couponForm, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Fixo (MZN)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Valor</Label><Input type="number" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} /></div>
                <div><Label>Compra Mínima (MZN)</Label><Input type="number" value={couponForm.min_purchase} onChange={(e) => setCouponForm({ ...couponForm, min_purchase: e.target.value })} /></div>
                <Button onClick={saveCoupon} className="w-full">Criar Cupom</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <span className="font-mono font-medium">{c.code}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {c.discount_type === "percent" ? `${c.value}%` : `${c.value} MZN`}
                  {c.min_purchase > 0 && ` (min: ${c.min_purchase} MZN)`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${c.active ? "text-green-600" : "text-red-500"}`}>{c.active ? "Activo" : "Inactivo"}</span>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteCoupon(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {coupons.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cupom.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

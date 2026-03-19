import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Package, User, LogOut, Settings } from "lucide-react";

const provinces = [
  "Maputo Cidade", "Maputo Província", "Gaza", "Inhambane", "Sofala",
  "Manica", "Tete", "Zambézia", "Nampula", "Cabo Delgado", "Niassa"
];

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const Account = () => {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", province: "" });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p) {
        setProfile(p);
        setForm({ name: p.name || "", phone: p.phone || "", address: p.address || "", province: p.province || "" });
      }
      const { data: o } = await supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (o) setOrders(o);
    };
    fetchData();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(form).eq("user_id", user.id);
    if (error) toast.error("Erro ao salvar.");
    else { toast.success("Perfil actualizado!"); setEditing(false); }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><p>Carregando...</p></div>;
  if (!user) return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <User className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Faça login para acessar sua conta</h2>
        <div className="flex gap-3">
          <Button asChild><Link to="/login">Entrar</Link></Button>
          <Button variant="outline" asChild><Link to="/registrar">Criar Conta</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Minha Conta</h1>
            {isAdmin && <Badge>Administrador</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button asChild>
                <Link to="/admin">Abrir Painel Admin</Link>
              </Button>
            )}
            <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sair</Button>
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile */}
          <div className="rounded-xl border p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Settings className="h-5 w-5" /> Perfil</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>{editing ? "Cancelar" : "Editar"}</Button>
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {editing ? (
              <div className="space-y-3">
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Endereço</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div>
                  <Label>Província</Label>
                  <Select value={form.province} onValueChange={(v) => setForm({ ...form, province: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={saveProfile} className="w-full">Salvar</Button>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <p><strong>Nome:</strong> {profile?.name || "—"}</p>
                <p><strong>Telefone:</strong> {profile?.phone || "—"}</p>
                <p><strong>Endereço:</strong> {profile?.address || "—"}</p>
                <p><strong>Província:</strong> {profile?.province || "—"}</p>
              </div>
            )}
          </div>

          {/* Orders */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> Meus Pedidos</h2>
            {orders.length === 0 ? (
              <div className="rounded-xl border p-8 text-center text-muted-foreground">
                <p>Nenhum pedido ainda.</p>
                <Button className="mt-4" asChild><Link to="/catalogo">Comprar Agora</Link></Button>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="rounded-xl border p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Pedido #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("pt-MZ")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{statusLabels[order.status] || order.status}</Badge>
                      <span className="font-bold text-primary">{Number(order.total_mzn).toLocaleString("pt-MZ")} MZN</span>
                    </div>
                  </div>
                  {order.tracking_code && <p className="mt-2 text-xs text-muted-foreground">Rastreio: {order.tracking_code}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Account;

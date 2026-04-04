import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, TrendingUp, DollarSign, Share2, CheckCircle } from "lucide-react";

const AffiliateJoin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", facebook: "", instagram: "", tiktok: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Faça login primeiro."); navigate("/login"); return; }
    if (!form.name) { toast.error("Preencha o nome."); return; }

    setSubmitting(true);
    const code = "LAY" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase.from("affiliates").insert({
      user_id: user.id,
      affiliate_code: code,
      whatsapp: form.whatsapp,
      reason: form.reason,
      status: "pending",
    } as any);

    setSubmitting(false);
    if (error) {
      if (error.code === "23505") toast.error("Você já está cadastrado como afiliado.");
      else toast.error("Erro ao cadastrar. Tente novamente.");
      return;
    }
    setSubmitted(true);
    toast.success("Solicitação enviada com sucesso!");
  };

  if (submitted) return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <CheckCircle className="h-20 w-20 text-primary" />
        <h2 className="text-2xl font-bold">Solicitação Enviada!</h2>
        <p className="text-center text-muted-foreground max-w-md">A sua candidatura está em análise. Será notificado quando for aprovado.</p>
        <Button asChild><Link to="/conta">Voltar à Conta</Link></Button>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold">Seja um Afiliado Laynani</h1>
            <p className="text-lg text-muted-foreground">Ganhe comissões em cada venda que indicar. É simples, rápido e gratuito.</p>
          </div>

          <div className="mb-12 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Share2, title: "Partilhe", desc: "Gere links únicos para qualquer produto e partilhe com amigos." },
              { icon: TrendingUp, title: "Converta", desc: "Quando alguém comprar pelo seu link, você ganha comissão." },
              { icon: DollarSign, title: "Receba", desc: "Ganhe 10% em MZN por cada venda. Saque via M-Pesa ou e-Mola." },
            ].map((b) => (
              <div key={b.title} className="rounded-xl border bg-card p-6 text-center shadow-sm">
                <b.icon className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="mb-1 font-semibold">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto max-w-md rounded-xl border bg-card p-8 shadow-card">
            <h2 className="mb-6 text-center text-xl font-semibold flex items-center justify-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Formulário de Inscrição
            </h2>
            {!user && (
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-center text-sm">
                <Link to="/login" className="font-medium text-primary hover:underline">Faça login</Link> ou{" "}
                <Link to="/registrar" className="font-medium text-primary hover:underline">crie uma conta</Link> primeiro.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Nome Completo *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>WhatsApp *</Label><Input required value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+258 8X XXX XXXX" /></div>
              <div><Label>Por que quer ser afiliado?</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Conte-nos a sua motivação (opcional)" /></div>
              <Button type="submit" className="w-full" disabled={!user || submitting}>
                {submitting ? "Enviando..." : "Candidatar-se"}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AffiliateJoin;

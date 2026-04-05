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
import {
  Users, TrendingUp, DollarSign, Share2, CheckCircle, Star,
  Gift, Zap, ShieldCheck, ArrowRight, ChevronDown, ChevronUp,
  Smartphone, BarChart3, Wallet
} from "lucide-react";

const FAQ_ITEMS = [
  { q: "Quanto posso ganhar como afiliado?", a: "Você ganha 10% de comissão em cada venda realizada através do seu link. Não há limite de ganhos — quanto mais partilhar, mais ganha!" },
  { q: "Como recebo o pagamento?", a: "Os pagamentos são feitos via M-Pesa, e-Mola ou transferência bancária. O valor mínimo para saque é de 500 MZN." },
  { q: "Preciso pagar para me tornar afiliado?", a: "Não! O programa é totalmente gratuito. Basta candidatar-se e aguardar a aprovação." },
  { q: "Quanto tempo demora a aprovação?", a: "Normalmente analisamos as candidaturas em até 48 horas." },
  { q: "Posso promover em qualquer plataforma?", a: "Sim! Partilhe os seus links no Facebook, Instagram, TikTok, WhatsApp ou qualquer outra plataforma." },
];

const AffiliateJoin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", facebook: "", instagram: "", tiktok: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Faça login primeiro."); navigate("/login"); return; }
    if (!form.name) { toast.error("Preencha o nome."); return; }

    setSubmitting(true);
    const code = "LAY" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase.from("affiliates").insert({
      user_id: user.id,
      affiliate_code: code,
      facebook: form.facebook || null,
      instagram: form.instagram || null,
      tiktok: form.tiktok || null,
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
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20">
        <div className="rounded-full bg-primary/10 p-6">
          <CheckCircle className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Solicitação Enviada!</h2>
        <p className="text-center text-muted-foreground max-w-md">
          A sua candidatura está em análise. Iremos notificá-lo em até 48 horas.
        </p>
        <div className="flex gap-3">
          <Button asChild><Link to="/conta">Minha Conta</Link></Button>
          <Button variant="outline" asChild><Link to="/">Explorar Produtos</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-primary py-16 sm:py-24">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
          <div className="container relative z-10 mx-auto px-4 text-center">
            <div className="mx-auto max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-primary-foreground backdrop-blur-sm">
                <Star className="h-4 w-4" /> Programa de Afiliados
              </div>
              <h1 className="mb-4 text-3xl font-extrabold leading-tight text-primary-foreground sm:text-5xl lg:text-6xl">
                Ganhe dinheiro <br className="hidden sm:block" />partilhando o que ama
              </h1>
              <p className="mx-auto mb-8 max-w-xl text-base text-primary-foreground/80 sm:text-lg">
                Junte-se a centenas de criadores e influenciadores que já ganham comissões com a Laynani. Sem investimento, sem risco.
              </p>
              <a href="#formulario" className="inline-flex items-center gap-2 rounded-full bg-background px-8 py-3.5 font-semibold text-primary shadow-elevated transition-all hover:scale-105 hover:shadow-lg">
                Começar Agora <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-b bg-card py-6">
          <div className="container mx-auto grid grid-cols-3 gap-4 px-4 text-center">
            {[
              { value: "10%", label: "Comissão" },
              { value: "48h", label: "Aprovação" },
              { value: "500+", label: "Produtos" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-extrabold text-primary sm:text-3xl">{s.value}</p>
                <p className="text-xs text-muted-foreground sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it Works */}
        <section className="py-14 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-10 text-center">
              <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">Como Funciona</h2>
              <p className="text-muted-foreground">3 passos simples para começar a ganhar</p>
            </div>
            <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
              {[
                { step: "01", icon: Smartphone, title: "Inscreva-se", desc: "Preencha o formulário abaixo. É rápido, gratuito e sem compromisso.", color: "from-primary/20 to-primary/5" },
                { step: "02", icon: Share2, title: "Partilhe", desc: "Gere links únicos para qualquer produto e publique nas suas redes sociais.", color: "from-accent to-accent/30" },
                { step: "03", icon: Wallet, title: "Ganhe", desc: "Receba 10% de comissão por cada venda. Saque via M-Pesa ou e-Mola.", color: "from-primary/15 to-primary/5" },
              ].map((item) => (
                <div key={item.step} className="group relative overflow-hidden rounded-2xl border bg-card p-6 text-center shadow-sm transition-all hover:shadow-elevated hover:-translate-y-1">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 transition-opacity group-hover:opacity-100`} />
                  <div className="relative z-10">
                    <span className="mb-3 inline-block text-4xl font-extrabold text-primary/20">{item.step}</span>
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <item.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-y bg-muted/30 py-14 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-10 text-center">
              <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">Porquê ser Afiliado Laynani?</h2>
              <p className="text-muted-foreground">Vantagens exclusivas para os nossos parceiros</p>
            </div>
            <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: DollarSign, title: "Comissões Altas", desc: "10% por cada venda — acima da média do mercado." },
                { icon: Zap, title: "Pagamento Rápido", desc: "Saque via M-Pesa ou e-Mola com processamento ágil." },
                { icon: BarChart3, title: "Dashboard Completo", desc: "Acompanhe cliques, vendas e comissões em tempo real." },
                { icon: Gift, title: "Sem Investimento", desc: "Gratuito para participar. Sem taxas, sem riscos." },
                { icon: ShieldCheck, title: "Links Rastreáveis", desc: "Cada venda é atribuída automaticamente à sua conta." },
                { icon: TrendingUp, title: "Sem Limites", desc: "Sem teto de ganhos. Quanto mais vender, mais ganha." },
              ].map((b) => (
                <div key={b.title} className="flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <b.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sign Up Form */}
        <section id="formulario" className="py-14 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-lg">
              <div className="mb-8 text-center">
                <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">Candidatar-se Agora</h2>
                <p className="text-muted-foreground">Preencha os dados abaixo para se inscrever</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
                {!user && (
                  <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <Users className="h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm text-foreground">
                      <Link to="/login" className="font-semibold text-primary hover:underline">Faça login</Link> ou{" "}
                      <Link to="/registrar" className="font-semibold text-primary hover:underline">crie uma conta</Link> para continuar.
                    </p>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Nome Completo *</Label>
                    <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Seu nome completo" className="h-11" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Facebook</Label>
                      <Input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} placeholder="Link (opcional)" className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Instagram</Label>
                      <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@user" className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">TikTok</Label>
                      <Input value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} placeholder="@user" className="h-11" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Motivação</Label>
                    <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Por que quer ser afiliado? (opcional)" className="h-11" />
                  </div>
                  <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold" disabled={!user || submitting}>
                    {submitting ? "Enviando..." : "Candidatar-se Gratuitamente"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Ao se candidatar, concorda com os nossos termos e condições.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t bg-muted/30 py-14 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-10 text-center">
              <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">Perguntas Frequentes</h2>
              <p className="text-muted-foreground">Tire as suas dúvidas sobre o programa</p>
            </div>
            <div className="mx-auto max-w-2xl space-y-3">
              {FAQ_ITEMS.map((faq, i) => (
                <div key={i} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left font-medium text-foreground transition-colors hover:bg-muted/50 sm:p-5"
                  >
                    <span className="text-sm sm:text-base">{faq.q}</span>
                    {openFaq === i ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  </button>
                  {openFaq === i && (
                    <div className="border-t px-4 pb-4 pt-3 sm:px-5">
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-primary py-14 sm:py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-3 text-2xl font-bold text-primary-foreground sm:text-3xl">Pronto para começar a ganhar?</h2>
            <p className="mx-auto mb-6 max-w-md text-primary-foreground/80">
              Junte-se ao programa de afiliados da Laynani e transforme as suas redes sociais numa fonte de renda.
            </p>
            <a href="#formulario" className="inline-flex items-center gap-2 rounded-full bg-background px-8 py-3.5 font-semibold text-primary shadow-elevated transition-all hover:scale-105">
              Inscrever-me Agora <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AffiliateJoin;

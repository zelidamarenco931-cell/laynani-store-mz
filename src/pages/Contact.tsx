import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      toast.success("Mensagem enviada! Entraremos em contacto em breve.");
      setForm({ name: "", email: "", message: "" });
      setSending(false);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-primary py-16 text-center text-white">
          <div className="container">
            <h1 className="text-3xl font-extrabold sm:text-4xl">Contacte-nos</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-white/70">
              Estamos sempre disponíveis para ajudar
            </p>
          </div>
        </section>

        <section className="container max-w-4xl py-12">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Info */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Fale Connosco</h2>
              <p className="text-sm text-muted-foreground">
                Tem alguma dúvida, sugestão ou precisa de ajuda com o seu pedido? 
                Entre em contacto connosco através dos canais abaixo ou preencha o formulário.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Telefone / WhatsApp</p>
                    <p className="text-sm text-muted-foreground">+258 86 821 4712</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Email</p>
                    <p className="text-sm text-muted-foreground">zelidanegocios@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Localização</p>
                    <p className="text-sm text-muted-foreground">Maputo, Moçambique</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Horário de Atendimento</p>
                    <p className="text-sm text-muted-foreground">Segunda a Sábado, 8h - 18h</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-card">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" /> Enviar Mensagem
              </h3>
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Seu nome completo" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="seu@email.com" />
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required placeholder="Escreva a sua mensagem..." rows={5} />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? "Enviando..." : "Enviar Mensagem"}
              </Button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;

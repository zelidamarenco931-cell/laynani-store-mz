import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);

    if (error) {
      console.error("Erro ao pedir recuperação de senha:", error);
      // Limite de envios: o Supabase só deixa pedir de tempos a tempos
      if (error.status === 429 || /rate limit|security purposes/i.test(error.message)) {
        toast.error("Já pediu há pouco tempo. Espere cerca de 1 minuto e tente de novo.");
      } else {
        toast.error("Não foi possível enviar o email. Tente de novo.");
      }
      return;
    }
    // Mesma resposta exista a conta ou não, para não revelar quem tem conta.
    setSent(true);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md space-y-6">
          {sent ? (
            <div className="space-y-4 rounded-xl border p-6 text-center shadow-card">
              <CheckCircle className="mx-auto h-12 w-12 text-primary" />
              <h1 className="text-2xl font-bold">Verifique o seu email</h1>
              <p className="text-sm text-muted-foreground">
                Se existir uma conta com <strong className="text-foreground">{email.trim().toLowerCase()}</strong>, enviámos
                um link para definir uma senha nova. Veja também a pasta de spam.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Usar outro email
              </Button>
              <Button className="w-full" asChild>
                <Link to="/login">Voltar ao login</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gradient">Esqueci a senha</h1>
                <p className="mt-2 text-muted-foreground">Enviámos um link para definir uma senha nova.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-6 shadow-card">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "A enviar..." : "Enviar link"}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground">
                Lembrou-se? <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link>
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForgotPassword;

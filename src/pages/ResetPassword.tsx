import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Phase = "checking" | "ready" | "invalid";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // O link do email deixa o utilizador com uma sessão de recuperação.
  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setPhase("ready");
    });

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setPhase("ready");
        return;
      }
      // Dá tempo ao Supabase para processar o link antes de dizer que é inválido.
      setTimeout(async () => {
        if (!active) return;
        const { data: again } = await supabase.auth.getSession();
        if (active) setPhase(again.session ? "ready" : "invalid");
      }, 2500);
    };
    check();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres."); return; }
    if (password !== confirm) { toast.error("As senhas não são iguais."); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      console.error("Erro ao definir nova senha:", error);
      if (/different from the old password|same_password/i.test(error.message)) {
        toast.error("Escolha uma senha diferente da anterior.");
      } else if (/session/i.test(error.message)) {
        toast.error("O link expirou. Peça um novo.");
        setPhase("invalid");
      } else {
        toast.error("Não foi possível guardar a senha. Tente de novo.");
      }
      return;
    }
    toast.success("Senha alterada! Já pode usar a conta.");
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md space-y-6">
          {phase === "checking" && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>A validar o link...</p>
            </div>
          )}

          {phase === "invalid" && (
            <div className="space-y-4 rounded-xl border p-6 text-center shadow-card">
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <h1 className="text-2xl font-bold">Link inválido ou expirado</h1>
              <p className="text-sm text-muted-foreground">Peça um link novo para definir a senha.</p>
              <Button className="w-full" asChild>
                <Link to="/esqueci-senha">Pedir novo link</Link>
              </Button>
            </div>
          )}

          {phase === "ready" && (
            <>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gradient">Nova senha</h1>
                <p className="mt-2 text-muted-foreground">Escolha uma senha que consiga lembrar.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-6 shadow-card">
                <div>
                  <Label>Senha nova</Label>
                  <div className="relative">
                    <Input
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      aria-label={show ? "Esconder senha" : "Mostrar senha"}
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Repita a senha</Label>
                  <Input
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Repita a senha"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "A guardar..." : "Guardar senha"}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;

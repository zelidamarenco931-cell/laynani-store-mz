import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        // O Supabase passa o token via hash (#) ou query string (?)
        // Precisamos de deixar o Supabase processar automaticamente via onAuthStateChange
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setStatus("error");
          setMessage("O link de confirmação é inválido ou expirou. Por favor registe-se novamente.");
          return;
        }

        if (data.session?.user?.email_confirmed_at) {
          setStatus("success");
          setMessage("O seu email foi confirmado com sucesso! Já pode entrar na sua conta.");
          // Redirecionar para login após 3 segundos
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        // Verificar parâmetros na URL (token_hash, type)
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));

        const tokenHash = params.get("token_hash") || hashParams.get("token_hash");
        const type = params.get("type") || hashParams.get("type");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        // Caso 1: token_hash (método mais recente do Supabase)
        if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });

          if (verifyError) {
            setStatus("error");
            setMessage("O link de confirmação é inválido ou expirou.");
          } else {
            setStatus("success");
            setMessage("O seu email foi confirmado com sucesso! Já pode entrar na sua conta.");
            setTimeout(() => navigate("/login"), 3000);
          }
          return;
        }

        // Caso 2: access_token e refresh_token no hash (método antigo)
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setStatus("error");
            setMessage("O link de confirmação é inválido ou expirou.");
          } else {
            setStatus("success");
            setMessage("O seu email foi confirmado com sucesso! Já pode entrar na sua conta.");
            setTimeout(() => navigate("/login"), 3000);
          }
          return;
        }

        // Nenhum token encontrado
        setStatus("error");
        setMessage("Link de confirmação inválido. Por favor verifique o seu email ou registe-se novamente.");

      } catch {
        setStatus("error");
        setMessage("Ocorreu um erro inesperado. Por favor tente novamente.");
      }
    };

    handleConfirmation();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md space-y-6 text-center">

          {status === "loading" && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-6">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground">A confirmar o seu email...</h1>
              <p className="text-muted-foreground">Por favor aguarde um momento.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-6">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground">Email Confirmado! 🎉</h1>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">A redirecionar para o login em 3 segundos...</p>
              <Button asChild className="w-full rounded-xl">
                <Link to="/login">Entrar Agora</Link>
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-destructive/10 p-6">
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground">Link Inválido</h1>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex flex-col gap-3">
                <Button asChild className="w-full rounded-xl">
                  <Link to="/registrar">Criar Nova Conta</Link>
                </Button>
                <Button asChild variant="outline" className="w-full rounded-xl">
                  <Link to="/login">Já tenho conta</Link>
                </Button>
              </div>
            </>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ConfirmEmail;

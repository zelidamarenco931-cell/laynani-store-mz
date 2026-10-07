import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSessionSave, useSessionRestore } from "@/hooks/useSessionRestore";

// Componente interno ao BrowserRouter para ter acesso ao useLocation/useNavigate
const SessionManager = () => {
  const navigate = useNavigate();

  useSessionSave();    // Guarda a página actual sempre que muda
  useSessionRestore(); // Restaura a última página ao abrir o app

  // Se o link do email de recuperação cair noutra página (ex.: a página inicial),
  // leva o utilizador ao ecrã de nova senha.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") navigate("/redefinir-senha", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
};

export default SessionManager;

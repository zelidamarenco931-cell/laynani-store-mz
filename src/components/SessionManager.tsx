import { useSessionSave, useSessionRestore } from "@/hooks/useSessionRestore";

// Componente interno ao BrowserRouter para ter acesso ao useLocation/useNavigate
const SessionManager = () => {
  useSessionSave();    // Guarda a página actual sempre que muda
  useSessionRestore(); // Restaura a última página ao abrir o app
  return null;
};

export default SessionManager;

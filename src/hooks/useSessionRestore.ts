import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const SESSION_KEY = "laynani_last_path";

// Páginas que NÃO devem ser restauradas (login, registo, etc.)
const EXCLUDE_PATHS = ["/login", "/registrar", "/confirmar", "/admin"];

export const useSessionSave = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname + location.search;
    const isExcluded = EXCLUDE_PATHS.some(p => path.startsWith(p));
    if (!isExcluded) {
      try {
        sessionStorage.setItem(SESSION_KEY, path);
      } catch {}
    }
  }, [location]);
};

export const useSessionRestore = () => {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved && saved !== "/" && window.location.pathname === "/") {
        navigate(saved, { replace: true });
      }
    } catch {}
  }, [navigate]);
};

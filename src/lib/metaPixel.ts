// Meta Pixel (Facebook + Instagram) — rastreio de visitas e conversões vindas dos anúncios.
// Configure VITE_META_PIXEL_ID no .env / Vercel. Sem o ID, tudo fica desativado (sem erros).

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
let initialized = false;

export const initMetaPixel = () => {
  if (initialized || !PIXEL_ID || typeof window === "undefined") return;

  if (!window.fbq) {
    const n: any = (window.fbq = function (...args: any[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq("init", PIXEL_ID);
  initialized = true;
};

export const trackPixel = (event: string, params?: Record<string, unknown>) => {
  if (!PIXEL_ID || typeof window === "undefined") return;
  initMetaPixel();
  window.fbq?.("track", event, params);
};

// ---- Atribuição: guarda de onde veio o cliente (utm_*, fbclid) ----
const ATTR_KEY = "laynani_attribution";
const ATTR_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"];

export const captureAttribution = () => {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    ATTR_FIELDS.forEach((k) => {
      const v = params.get(k);
      if (v) found[k] = v;
    });
    if (Object.keys(found).length > 0) {
      localStorage.setItem(ATTR_KEY, JSON.stringify({ ...found, landing: window.location.pathname, at: new Date().toISOString() }));
    }
  } catch {
    /* storage indisponível */
  }
};

export const getAttribution = (): Record<string, string> | null => {
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

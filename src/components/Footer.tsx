import { Link } from "react-router-dom";
import { Truck, ShieldCheck, CreditCard, Headphones, MessageCircle, Instagram, Facebook, Youtube, Phone } from "lucide-react";

const WHATSAPP_NUMBER = "258868214712";

const features = [
  { icon: Truck, label: "Entrega Rápida", desc: "3-7 dias úteis" },
  { icon: ShieldCheck, label: "Compra Segura", desc: "Dados protegidos" },
  { icon: CreditCard, label: "Pagamento Fácil", desc: "M-Pesa, e-Mola, Cartão" },
  { icon: Headphones, label: "Suporte 24/7", desc: "Sempre disponível" },
];

// Redes sociais: só aparecem as que tiverem link preenchido.
const SOCIAL_LINKS = [
  { name: "WhatsApp", href: `https://wa.me/${WHATSAPP_NUMBER}`, icon: MessageCircle, hover: "hover:bg-green-500 hover:text-white hover:border-green-500" },
  { name: "Instagram", href: "https://www.instagram.com/laynanistore", icon: Instagram, hover: "hover:bg-pink-600 hover:text-white hover:border-pink-600" },
  { name: "Facebook", href: "https://www.facebook.com/share/1Qaicvpp22/", icon: Facebook, hover: "hover:bg-blue-600 hover:text-white hover:border-blue-600" },
  { name: "YouTube", href: "https://www.youtube.com/@laynanistore", icon: Youtube, hover: "hover:bg-red-600 hover:text-white hover:border-red-600" },
].filter((s) => s.href);

const linkCls = "text-sm text-muted-foreground transition-colors hover:text-primary";

const Footer = () => (
  <footer className="mt-auto border-t">
    {/* Vantagens */}
    <div className="border-b bg-muted/50">
      <div className="container grid grid-cols-2 gap-4 py-6 md:grid-cols-4">
        {features.map((f) => (
          <div key={f.label} className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Corpo */}
    <div className="container grid grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 md:grid-cols-12">
      {/* Marca + redes sociais */}
      <div className="col-span-2 md:col-span-4">
        <h3 className="text-xl font-extrabold text-gradient">Laynani Store</h3>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">Tudo o que você precisa, entregue em Moçambique.</p>

        <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wider text-foreground">Siga-nos</p>
        <div className="flex flex-wrap gap-2.5">
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.name}
              title={s.name}
              className={`flex h-11 w-11 items-center justify-center rounded-full border bg-background text-foreground transition-all ${s.hover}`}
            >
              <s.icon className="h-5 w-5" />
            </a>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <h4 className="mb-3 text-sm font-semibold">Comprar</h4>
        <div className="flex flex-col gap-2">
          <Link to="/catalogo" className={linkCls}>Catálogo</Link>
          <Link to="/catalogo?cat=moda-feminina" className={linkCls}>Moda Feminina</Link>
          <Link to="/catalogo?cat=electronicos" className={linkCls}>Electrónicos</Link>
        </div>
      </div>

      <div className="md:col-span-2">
        <h4 className="mb-3 text-sm font-semibold">Ajuda</h4>
        <div className="flex flex-col gap-2">
          <Link to="/sobre" className={linkCls}>Sobre Nós</Link>
          <Link to="/politica" className={linkCls}>Política de Vendas</Link>
          <Link to="/contacto" className={linkCls}>Contacto</Link>
          <Link to="/afiliados" className={linkCls}>Seja Afiliado</Link>
        </div>
      </div>

      <div className="col-span-2 md:col-span-4">
        <h4 className="mb-3 text-sm font-semibold">Fale connosco</h4>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
        </a>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" /> 868 214 712
        </p>

        <h4 className="mb-3 mt-6 text-sm font-semibold">Pagamentos aceites</h4>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {["M-Pesa", "e-Mola", "Visa / Mastercard", "Débito Pay"].map((p) => (
            <span key={p} className="rounded-md border bg-background px-2 py-1">{p}</span>
          ))}
        </div>
      </div>
    </div>

    <div className="border-t">
      <div className="container flex h-12 items-center justify-center px-4 text-center text-xs text-muted-foreground">
        © 2026 Laynani Store. Todos os direitos reservados.
      </div>
    </div>
  </footer>
);

export default Footer;

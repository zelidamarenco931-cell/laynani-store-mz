import { Link } from "react-router-dom";
import { Truck, ShieldCheck, CreditCard, Headphones } from "lucide-react";

const features = [
  { icon: Truck, label: "Entrega Rápida", desc: "3-15 dias úteis" },
  { icon: ShieldCheck, label: "Compra Segura", desc: "Dados protegidos" },
  { icon: CreditCard, label: "Pagamento Fácil", desc: "M-Pesa, Cartão, PayPal" },
  { icon: Headphones, label: "Suporte 24/7", desc: "Sempre disponível" },
];

const Footer = () => (
  <footer className="mt-auto border-t">
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
    <div className="container grid gap-8 py-10 md:grid-cols-4">
      <div>
        <h3 className="text-lg font-bold text-gradient">Laynani Store</h3>
        <p className="mt-2 text-sm text-muted-foreground">Tudo o que você precisa, entregue em Moçambique.</p>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-semibold">Comprar</h4>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Link to="/catalogo" className="hover:text-primary transition-colors">Catálogo</Link>
          <Link to="/catalogo?cat=moda-feminina" className="hover:text-primary transition-colors">Moda Feminina</Link>
          <Link to="/catalogo?cat=electronicos" className="hover:text-primary transition-colors">Electrónicos</Link>
        </div>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-semibold">Ajuda</h4>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Link to="/sobre" className="hover:text-primary transition-colors">Sobre Nós</Link>
          <Link to="/politica" className="hover:text-primary transition-colors">Política de Vendas</Link>
          <Link to="/contacto" className="hover:text-primary transition-colors">Contacto</Link>
        </div>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-semibold">Pagamentos Aceites</h4>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {["M-Pesa", "e-Mola", "PayPal", "Visa", "Mastercard"].map((p) => (
            <span key={p} className="rounded-md border bg-background px-2 py-1">{p}</span>
          ))}
        </div>
      </div>
    </div>
    <div className="border-t">
      <div className="container flex h-12 items-center justify-center text-xs text-muted-foreground">
        © 2026 Laynani Store. Todos os direitos reservados.
      </div>
    </div>
  </footer>
);

export default Footer;

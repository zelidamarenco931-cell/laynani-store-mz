import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, ShieldCheck, CreditCard } from "lucide-react";

const HeroBanner = () => (
  <section className="relative overflow-hidden">
    {/* Background gradient */}
    <div className="absolute inset-0 bg-gradient-dark" />
    <div className="absolute inset-0 opacity-30" style={{
      backgroundImage: "radial-gradient(circle at 70% 30%, hsl(262 83% 58% / 0.4) 0%, transparent 50%), radial-gradient(circle at 20% 80%, hsl(280 80% 50% / 0.3) 0%, transparent 50%)"
    }} />
    
    <div className="container relative z-10 py-12 md:py-20 lg:py-28">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        {/* Left content */}
        <div className="flex flex-col gap-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            🔥 Novidades Todas as Semanas
          </span>
          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            Tudo o que você{" "}
            <span className="text-gradient">precisa</span>,{" "}
            num só lugar
          </h1>
          <p className="max-w-md text-sm text-white/60 sm:text-base">
            Moda, electrónicos, beleza, casa e muito mais — com os melhores preços em MZN e entrega para todo Moçambique.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/catalogo">
                Comprar Agora <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
              <Link to="/catalogo?promo=true">Ver Promoções</Link>
            </Button>
          </div>
        </div>
        
        {/* Right feature cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-4">
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Entrega Rápida</p>
              <p className="text-xs text-white/50">3 a 15 dias úteis</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Compra Segura</p>
              <p className="text-xs text-white/50">Pagamentos protegidos</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">M-Pesa & Cartão</p>
              <p className="text-xs text-white/50">Múltiplas opções</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroBanner;

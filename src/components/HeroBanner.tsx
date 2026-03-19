import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

const HeroBanner = () => (
  <section className="relative overflow-hidden bg-gradient-dark">
    <div className="container relative z-10 flex min-h-[420px] flex-col items-start justify-center gap-6 py-16 md:min-h-[520px]">
      <span className="rounded-full bg-primary/20 px-4 py-1.5 text-xs font-semibold text-primary-foreground">
        🔥 Novidades Todas as Semanas
      </span>
      <h1 className="max-w-lg text-4xl font-extrabold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
        Tudo o que você <span className="text-gradient">precisa</span>
      </h1>
      <p className="max-w-md text-base text-primary-foreground/70">
        Moda, electrónicos, casa e muito mais. Entrega rápida para todo Moçambique com os melhores preços.
      </p>
      <div className="flex gap-3">
        <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
          <Link to="/catalogo">Comprar Agora <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
        <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" asChild>
          <Link to="/catalogo?promo=true">Ver Promoções</Link>
        </Button>
      </div>
    </div>
    <div className="absolute inset-0 opacity-30">
      <img src={heroBanner} alt="" className="h-full w-full object-cover" />
    </div>
  </section>
);

export default HeroBanner;

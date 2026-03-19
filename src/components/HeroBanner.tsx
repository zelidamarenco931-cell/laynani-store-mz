import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingCart, Truck, Star, Gift, Sparkles, ShieldCheck, CreditCard } from "lucide-react";

const FloatingIcon = ({ children, className }: { children: React.ReactNode; className: string }) => (
  <div className={`absolute flex items-center justify-center rounded-2xl shadow-elevated ${className}`}>
    {children}
  </div>
);

const HeroBanner = () => (
  <section className="relative overflow-hidden">
    {/* Fun gradient background */}
    <div className="absolute inset-0" style={{
      background: "linear-gradient(135deg, hsl(262 83% 55%) 0%, hsl(280 75% 45%) 40%, hsl(300 65% 50%) 70%, hsl(330 70% 55%) 100%)"
    }} />
    {/* Decorative blobs */}
    <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
    <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
    <div className="absolute left-1/2 top-1/3 h-48 w-48 rounded-full bg-yellow-300/10 blur-3xl" />

    {/* Floating pattern dots */}
    <div className="absolute inset-0 opacity-[0.06]" style={{
      backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
      backgroundSize: "32px 32px"
    }} />

    <div className="container relative z-10 py-10 md:py-16 lg:py-24">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        {/* Left content */}
        <div className="flex flex-col gap-5">
          <span className="inline-flex w-fit animate-bounce items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
            🔥 Novidades Todas as Semanas
          </span>
          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            Compre com{" "}
            <span className="inline-block rounded-xl bg-white/20 px-3 py-1 backdrop-blur-sm">
              alegria
            </span>{" "}
            <br className="hidden sm:block" />
            na Laynani! 🛍️
          </h1>
          <p className="max-w-md text-sm text-white/80 sm:text-base">
            Moda, electrónicos, beleza, casa e muito mais — preços incríveis em MZN com entrega para todo Moçambique.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="bg-white text-primary font-bold hover:bg-white/90 shadow-elevated" asChild>
              <Link to="/catalogo">
                <ShoppingCart className="mr-2 h-5 w-5" /> Comprar Agora
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white font-semibold hover:bg-white/15 backdrop-blur-sm" asChild>
              <Link to="/catalogo?promo=true">
                Ver Promoções <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {/* Trust badges inline */}
          <div className="mt-2 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              <Truck className="h-3.5 w-3.5" /> 3-15 dias úteis
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" /> Compra segura
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              <CreditCard className="h-3.5 w-3.5" /> M-Pesa & Cartão
            </div>
          </div>
        </div>

        {/* Right side — fun floating shopping illustration */}
        <div className="relative hidden h-80 lg:block">
          {/* Big cart icon */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-white/15 shadow-elevated backdrop-blur-sm">
              <ShoppingCart className="h-16 w-16 text-white" />
            </div>
          </div>
          {/* Floating elements around the cart */}
          <FloatingIcon className="left-4 top-4 h-14 w-14 bg-yellow-400/90 text-yellow-900 animate-[bounce_3s_ease-in-out_infinite]">
            <Star className="h-7 w-7" />
          </FloatingIcon>
          <FloatingIcon className="right-8 top-2 h-12 w-12 bg-pink-400/90 text-white animate-[bounce_2.5s_ease-in-out_infinite_0.5s]">
            <Gift className="h-6 w-6" />
          </FloatingIcon>
          <FloatingIcon className="left-12 bottom-8 h-12 w-12 bg-emerald-400/90 text-white animate-[bounce_2.8s_ease-in-out_infinite_0.3s]">
            <Truck className="h-6 w-6" />
          </FloatingIcon>
          <FloatingIcon className="right-4 bottom-16 h-14 w-14 bg-white/90 text-primary animate-[bounce_3.2s_ease-in-out_infinite_0.7s]">
            <Sparkles className="h-7 w-7" />
          </FloatingIcon>
          {/* Price tags floating */}
          <div className="absolute left-0 top-1/3 animate-[bounce_4s_ease-in-out_infinite_1s] rounded-xl bg-white/90 px-3 py-2 shadow-elevated">
            <p className="text-[10px] font-medium text-muted-foreground">A partir de</p>
            <p className="text-lg font-extrabold text-primary">499 MZN</p>
          </div>
          <div className="absolute right-0 top-1/2 animate-[bounce_3.5s_ease-in-out_infinite_0.2s] rounded-xl bg-white/90 px-3 py-2 shadow-elevated">
            <p className="text-[10px] font-bold text-destructive">-30%</p>
            <p className="text-xs font-semibold text-foreground">Promoção</p>
          </div>
        </div>

        {/* Mobile floating elements (simplified) */}
        <div className="relative flex h-24 items-center justify-center gap-4 lg:hidden">
          <div className="flex h-16 w-16 animate-[bounce_3s_ease-in-out_infinite] items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <ShoppingCart className="h-8 w-8 text-white" />
          </div>
          <div className="flex h-12 w-12 animate-[bounce_2.5s_ease-in-out_infinite_0.5s] items-center justify-center rounded-2xl bg-yellow-400/80">
            <Star className="h-6 w-6 text-yellow-900" />
          </div>
          <div className="rounded-xl bg-white/90 px-3 py-2 shadow-elevated animate-[bounce_4s_ease-in-out_infinite_1s]">
            <p className="text-[10px] font-medium text-muted-foreground">A partir de</p>
            <p className="text-base font-extrabold text-primary">499 MZN</p>
          </div>
          <div className="flex h-12 w-12 animate-[bounce_2.8s_ease-in-out_infinite_0.3s] items-center justify-center rounded-2xl bg-pink-400/80">
            <Gift className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroBanner;

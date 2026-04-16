import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, ShieldCheck, CreditCard } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import heroBanner1 from "@/assets/hero-banner-1.jpg";
import heroBanner2 from "@/assets/hero-banner-2.jpg";
import heroBanner3 from "@/assets/hero-banner-3.jpg";

const slides = [
  {
    image: heroBanner2,
    tag: "🔥 Novidades Todas as Semanas",
    title: "Compre com estilo na Laynani Store!",
    subtitle: "Moda, acessórios e muito mais — preços incríveis em MZN com entrega para todo Moçambique.",
    cta: "Comprar Agora",
    ctaLink: "/catalogo",
    overlayAlign: "left" as const,
  },
  {
    image: heroBanner1,
    tag: "🛍️ Tudo Num Só Lugar",
    title: "Electrónicos, Beleza & Casa",
    subtitle: "Smartphones, headphones, cosméticos e decoração — tudo o que precisa com os melhores preços.",
    cta: "Ver Catálogo",
    ctaLink: "/catalogo",
    overlayAlign: "left" as const,
  },
  {
    image: heroBanner3,
    tag: "✨ Cuide de Si & do Seu Lar",
    title: "Beleza & Decoração Premium",
    subtitle: "Skincare, velas aromáticas e peças decorativas para transformar o seu dia-a-dia.",
    cta: "Explorar",
    ctaLink: "/catalogo",
    overlayAlign: "left" as const,
  },
];

const HeroBanner = () => (
  <section className="relative">
    <Carousel
      opts={{ loop: true }}
      plugins={[Autoplay({ delay: 5000, stopOnInteraction: false })]}
      className="w-full"
    >
      <CarouselContent>
        {slides.map((slide, i) => (
          <CarouselItem key={i}>
            <div className="relative h-[420px] sm:h-[480px] md:h-[520px] lg:h-[560px] w-full overflow-hidden">
              {/* Background image */}
              <img
                src={slide.image}
                alt={slide.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

              {/* Content */}
              <div className="container relative z-10 flex h-full items-center">
                <div className="flex max-w-lg flex-col gap-4">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                    {slide.tag}
                  </span>
                  <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
                    {slide.title}
                  </h1>
                  <p className="text-sm text-white/80 sm:text-base leading-relaxed">
                    {slide.subtitle}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      size="lg"
                      className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-elevated"
                      asChild
                    >
                      <Link to={slide.ctaLink}>
                        {slide.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/30 text-white font-semibold hover:bg-white/15 backdrop-blur-sm"
                      asChild
                    >
                      <Link to="/catalogo?promo=true">Ver Promoções</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-4 top-1/2 h-10 w-10 border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hidden sm:flex" />
      <CarouselNext className="right-4 top-1/2 h-10 w-10 border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hidden sm:flex" />
    </Carousel>

    {/* Trust bar */}
    <div className="bg-primary/5 border-b border-border">
      <div className="container flex flex-wrap items-center justify-center gap-6 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Truck className="h-4 w-4 text-primary" /> Entrega 7-20 dias úteis
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Compra 100% segura
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CreditCard className="h-4 w-4 text-primary" /> M-Pesa & Cartão
        </div>
      </div>
    </div>
  </section>
);

export default HeroBanner;

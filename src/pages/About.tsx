import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Users, Heart, Globe, Truck } from "lucide-react";

const About = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1">
      {/* Hero */}
      <section className="bg-gradient-primary py-16 text-center text-white">
        <div className="container">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Sobre a Laynani Store</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/70">
            A sua loja online de confiança em Moçambique
          </p>
        </div>
      </section>

      <section className="container max-w-3xl space-y-8 py-12">
        <div>
          <h2 className="mb-3 text-xl font-bold">Quem Somos</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            A <strong>Laynani Store</strong> é uma plataforma de comércio electrónico moçambicana dedicada a oferecer produtos de qualidade a preços acessíveis. 
            Nascemos com a missão de facilitar o acesso a moda, electrónicos, beleza, artigos para casa e muito mais — tudo entregue à sua porta em qualquer ponto de Moçambique.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-bold">A Nossa Missão</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Queremos democratizar as compras online em Moçambique, tornando-as simples, seguras e acessíveis para todos. 
            Acreditamos que cada moçambicano merece ter acesso a produtos de qualidade sem sair de casa, com métodos de pagamento locais como M-Pesa e e-Mola.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[
            { icon: Users, label: "Equipa Dedicada", desc: "Profissionais ao seu serviço" },
            { icon: Heart, label: "Feito com Amor", desc: "Para o povo moçambicano" },
            { icon: Globe, label: "Todo Moçambique", desc: "De Maputo a Cabo Delgado" },
            { icon: Truck, label: "Entrega Rápida", desc: "3 a 15 dias úteis" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border bg-card p-4 text-center shadow-card">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="mb-3 text-xl font-bold">Os Nossos Valores</h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li><strong>Transparência</strong> — Preços claros, sem surpresas.</li>
            <li><strong>Qualidade</strong> — Seleccionamos cuidadosamente cada produto.</li>
            <li><strong>Acessibilidade</strong> — Pagamento via M-Pesa, e-Mola, cartão e PayPal.</li>
            <li><strong>Compromisso</strong> — Entrega garantida em todo o território nacional.</li>
          </ul>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default About;

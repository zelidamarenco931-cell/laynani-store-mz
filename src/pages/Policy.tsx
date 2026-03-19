import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AlertTriangle, XCircle, CheckCircle, HelpCircle } from "lucide-react";

const Policy = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1">
      <section className="bg-gradient-primary py-16 text-center text-white">
        <div className="container">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Política de Vendas</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/70">
            Termos importantes sobre as suas compras
          </p>
        </div>
      </section>

      <section className="container max-w-3xl space-y-8 py-12">
        {/* No returns banner */}
        <div className="flex items-start gap-4 rounded-xl border-2 border-destructive/30 bg-destructive/5 p-5">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-destructive" />
          <div>
            <h2 className="text-lg font-bold text-destructive">Não Aceitamos Devoluções</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A Laynani Store <strong>não aceita devoluções nem trocas</strong> após a confirmação e envio do pedido. 
              Por favor, verifique cuidadosamente todos os detalhes do produto (tamanho, cor, quantidade) antes de finalizar a sua compra.
            </p>
          </div>
        </div>

        <div>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
            <XCircle className="h-5 w-5 text-destructive" /> Porquê Não Há Devoluções?
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Devido à natureza dos nossos produtos e à logística de entrega em todo o território moçambicano, 
            não nos é possível processar devoluções ou trocas. Os nossos produtos são encomendados especificamente 
            para cada cliente, e os custos logísticos tornam o processo de devolução inviável.
          </p>
        </div>

        <div>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
            <CheckCircle className="h-5 w-5 text-primary" /> Antes de Comprar, Verifique
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>O <strong>tamanho e cor</strong> do produto são os desejados.</li>
            <li>A <strong>descrição e especificações</strong> correspondem às suas expectativas.</li>
            <li>O <strong>endereço de entrega</strong> está correcto e completo.</li>
            <li>A <strong>quantidade</strong> seleccionada é a pretendida.</li>
            <li>As <strong>imagens do produto</strong> correspondem ao que espera receber.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
            <AlertTriangle className="h-5 w-5 text-yellow-500" /> Excepções
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Apenas em casos de <strong>produto danificado durante o transporte</strong> ou <strong>produto diferente do encomendado</strong> (erro nosso), 
            entraremos em contacto para encontrar uma solução. Nestes casos, o cliente deve:
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
            <li>Contactar-nos dentro de <strong>24 horas</strong> após a recepção.</li>
            <li>Enviar <strong>fotos claras</strong> do produto recebido.</li>
            <li>Aguardar a análise da nossa equipa (até 48 horas).</li>
          </ol>
        </div>

        <div>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
            <HelpCircle className="h-5 w-5 text-primary" /> Dúvidas?
          </h2>
          <p className="text-sm text-muted-foreground">
            Se tiver alguma questão antes de comprar, não hesite em contactar-nos pelo WhatsApp 
            <strong> +258 86 821 4712</strong> ou pelo email <strong>zelidanegocios@gmail.com</strong>. 
            Estamos aqui para o ajudar a fazer a melhor escolha!
          </p>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default Policy;

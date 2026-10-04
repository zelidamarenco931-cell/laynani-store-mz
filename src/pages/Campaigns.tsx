import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Percent } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Campaign, campaignPhase, campaignsDb, timeLeftLabel, todayStr } from "@/lib/campaigns";

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campaignsDb
      .from("campaigns")
      .select("*, campaign_products(product_id)")
      .eq("active", true)
      .gte("ends_at", todayStr())
      .order("starts_at")
      .then(({ data }: { data: Campaign[] | null }) => {
        if (data) setCampaigns(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8">
        <h1 className="mb-1 text-3xl font-bold">Campanhas</h1>
        <p className="mb-6 text-sm text-muted-foreground">Descontos por tempo limitado em produtos seleccionados.</p>

        {!loading && campaigns.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">Não há campanhas activas de momento.</p>
            <Link to="/catalogo" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Ver todo o catálogo
            </Link>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => {
            const phase = campaignPhase(c);
            const count = c.campaign_products?.length ?? 0;
            return (
              <Link
                key={c.id}
                to={`/campanhas/${c.slug}`}
                className="group overflow-hidden rounded-xl border bg-card shadow-card transition-all hover:shadow-elevated"
              >
                <div
                  className="relative flex h-32 items-end bg-primary p-3 text-primary-foreground"
                  style={
                    c.banner_url
                      ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.6)), url(${c.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                >
                  <span className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-sm font-extrabold text-primary">
                    -{Number(c.discount_percent)}%
                  </span>
                  <Percent className="h-6 w-6 opacity-80" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 text-lg font-semibold leading-tight">{c.name}</h2>
                    {phase === "upcoming" && <Badge variant="secondary">Em breve</Badge>}
                  </div>
                  {c.description && <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {timeLeftLabel(c)}
                    </span>
                    <span>{count} {count === 1 ? "produto" : "produtos"}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Campaigns;

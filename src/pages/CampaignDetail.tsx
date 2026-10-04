import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Campaign, campaignPhase, campaignsDb, formatDate, timeLeftLabel } from "@/lib/campaigns";
import { getPricing } from "@/lib/pricing";

const PRODUCT_FIELDS =
  "id, name, images, status, price_mzn, promotional_price_mzn, has_promotion, promotion_start_date, promotion_end_date";

const CampaignDetail = () => {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    campaignsDb
      .from("campaigns")
      .select(`*, campaign_products(products(${PRODUCT_FIELDS}))`)
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (data) {
          setCampaign(data);
          setProducts(
            (data.campaign_products ?? [])
              .map((cp: any) => cp.products)
              .filter((p: any) => p && p.status === "active"),
          );
        } else {
          setCampaign(null);
          setProducts([]);
        }
        setLoading(false);
      });
  }, [slug]);

  const phase = useMemo(() => (campaign ? campaignPhase(campaign) : null), [campaign]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="container flex-1 py-8 space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="container flex flex-1 items-center justify-center py-20">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Campanha não encontrada.</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/campanhas"><ArrowLeft className="mr-2 h-4 w-4" /> Ver campanhas</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-6 sm:py-8">
        <Button variant="ghost" size="sm" className="mb-3" asChild>
          <Link to="/campanhas"><ArrowLeft className="mr-2 h-4 w-4" /> Campanhas</Link>
        </Button>

        <div
          className="relative mb-6 overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-card sm:p-8"
          style={
            campaign.banner_url
              ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.2)), url(${campaign.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <span className="inline-block rounded-full bg-white/90 px-3 py-1 text-sm font-extrabold text-primary">
            -{Number(campaign.discount_percent)}%
          </span>
          <h1 className="mt-3 text-2xl font-extrabold sm:text-4xl">{campaign.name}</h1>
          {campaign.description && <p className="mt-2 max-w-2xl text-sm opacity-95 sm:text-base">{campaign.description}</p>}
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium">
            <Clock className="h-4 w-4" /> {timeLeftLabel(campaign)}
            <span className="opacity-80">• {formatDate(campaign.starts_at)} a {formatDate(campaign.ends_at)}</span>
          </p>
        </div>

        {phase === "ended" && (
          <p className="mb-4 rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
            Esta campanha terminou. Os preços voltaram ao normal.
          </p>
        )}
        {phase === "upcoming" && (
          <p className="mb-4 rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
            Os descontos começam a {formatDate(campaign.starts_at)}.
          </p>
        )}

        {products.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">Esta campanha ainda não tem produtos.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => {
              const pricing = getPricing(p);
              return (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  price={pricing.price}
                  originalPrice={pricing.originalPrice}
                  hasPromotion={pricing.hasPromotion}
                  image={p.images?.[0] || "/placeholder.svg"}
                />
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CampaignDetail;

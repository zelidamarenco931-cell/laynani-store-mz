import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Percent } from "lucide-react";
import { Campaign, campaignsDb, timeLeftLabel, todayStr } from "@/lib/campaigns";

// Faixa na página inicial com as campanhas em curso.
const CampaignBanner = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    const today = todayStr();
    campaignsDb
      .from("campaigns")
      .select("*")
      .eq("active", true)
      .lte("starts_at", today)
      .gte("ends_at", today)
      .order("ends_at")
      .limit(3)
      .then(({ data }: { data: Campaign[] | null }) => {
        if (data) setCampaigns(data);
      });
  }, []);

  if (campaigns.length === 0) return null;

  return (
    <section className="container space-y-3 pt-6">
      {campaigns.map((c) => (
        <Link
          key={c.id}
          to={`/campanhas/${c.slug}`}
          className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl bg-primary px-4 py-4 text-primary-foreground shadow-card sm:px-6"
          style={
            c.banner_url
              ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.25)), url(${c.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-extrabold">
              {Number(c.discount_percent)}%
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-base font-bold sm:text-lg">
                <Percent className="h-4 w-4 shrink-0" /> {c.name}
              </p>
              <p className="truncate text-xs opacity-90 sm:text-sm">{timeLeftLabel(c)}</p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold">
            Ver ofertas <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      ))}
    </section>
  );
};

export default CampaignBanner;

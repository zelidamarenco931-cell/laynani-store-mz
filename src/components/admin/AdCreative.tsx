import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, ExternalLink, Facebook, ImageDown, Megaphone } from "lucide-react";
import {
  ADS_MANAGER_URL, SITE_URL, buildAdCopy, buildAdHeadline, buildAdLink, getAdPrice, type AdProduct,
} from "@/lib/ads";

interface Props {
  campaign: { id: string; name: string; platform: string; product_id: string } | null;
  onOpenChange: (open: boolean) => void;
}

const AdCreative = ({ campaign, onOpenChange }: Props) => {
  const [product, setProduct] = useState<AdProduct | null>(null);
  const [headline, setHeadline] = useState("");
  const [text, setText] = useState("");

  const link = useMemo(
    () => (campaign ? buildAdLink({ productId: campaign.product_id, platform: campaign.platform, campaignName: campaign.name }) : ""),
    [campaign],
  );

  useEffect(() => {
    if (!campaign) { setProduct(null); return; }
    supabase
      .from("products")
      .select("id, name, description, images, price_mzn, has_promotion, promotional_price_mzn, promotion_start_date, promotion_end_date")
      .eq("id", campaign.product_id)
      .single()
      .then(({ data }) => {
        if (!data) { toast.error("Produto não encontrado"); return; }
        const p = data as AdProduct;
        setProduct(p);
        setHeadline(buildAdHeadline(p));
        setText(buildAdCopy(p, campaign.platform, link));
      });
  }, [campaign, link]);

  const copy = (value: string, msg: string) => {
    navigator.clipboard.writeText(value);
    toast.success(msg);
  };

  const image = product?.images?.[0] || "/placeholder.svg";
  const price = product ? getAdPrice(product) : null;
  const isInstagram = campaign?.platform === "instagram";

  return (
    <Dialog open={!!campaign} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Anúncio — {campaign?.name}</DialogTitle>
        </DialogHeader>

        {!product ? (
          <p className="text-sm text-muted-foreground">A carregar produto...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pré-visualização */}
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center gap-2 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">L</div>
                <div>
                  <p className="text-sm font-semibold leading-none">Laynani Store</p>
                  <p className="text-xs text-muted-foreground">Patrocinado · {isInstagram ? "Instagram" : "Facebook"}</p>
                </div>
              </div>
              <p className="whitespace-pre-line px-3 pb-3 text-sm">{text}</p>
              <img src={image} alt={product.name} className="aspect-square w-full object-cover" />
              <div className="flex items-center justify-between gap-2 bg-muted p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs uppercase text-muted-foreground">{SITE_URL.replace(/^https?:\/\//, "")}</p>
                  <p className="truncate text-sm font-semibold">{headline}</p>
                  {price && <p className="text-xs text-muted-foreground">{price.finalPrice.toLocaleString("pt-MZ")} MZN</p>}
                </div>
                <span className="shrink-0 rounded-md bg-background px-3 py-1.5 text-xs font-semibold shadow-sm">Comprar agora</span>
              </div>
            </div>

            {/* Edição e ações */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título (máx. 40 caracteres)</label>
                <Input value={headline} maxLength={40} onChange={(e) => setHeadline(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Texto principal</label>
                <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Link de destino (abre directo no produto)</label>
                <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => copy(text, "Texto copiado!")}><Copy className="mr-2 h-4 w-4" /> Texto</Button>
                <Button variant="outline" onClick={() => copy(link, "Link copiado!")}><Copy className="mr-2 h-4 w-4" /> Link</Button>
                <Button variant="outline" asChild>
                  <a href={image} target="_blank" rel="noreferrer"><ImageDown className="mr-2 h-4 w-4" /> Imagem</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noreferrer">
                    <Facebook className="mr-2 h-4 w-4" /> Partilhar
                  </a>
                </Button>
              </div>

              <Button className="w-full" asChild>
                <a href={ADS_MANAGER_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Publicar no Gestor de Anúncios da Meta
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">
                No Gestor de Anúncios: objetivo “Vendas” ou “Tráfego”, posicionamentos Facebook + Instagram, cole o texto, o título e o link acima, e botão “Comprar agora”.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdCreative;

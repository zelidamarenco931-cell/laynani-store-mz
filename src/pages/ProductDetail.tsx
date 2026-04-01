import { useParams, Link, useSearchParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import ProductCard from "@/components/ProductCard";
import {
  Star, ShoppingCart, Truck, ArrowLeft, Minus, Plus, Heart, Share2,
  ChevronLeft, ChevronRight, Zap, Clock, Check, Package,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const PREDEFINED_COLORS: Record<string, string> = {
  "Preto": "#000000", "Branco": "#FFFFFF", "Vermelho": "#EF4444",
  "Azul": "#3B82F6", "Verde": "#22C55E", "Amarelo": "#EAB308",
  "Rosa": "#EC4899", "Roxo": "#8B5CF6", "Laranja": "#F97316",
  "Cinza": "#6B7280", "Bege": "#D2B48C", "Marrom": "#92400E",
  "Dourado": "#D4AF37", "Prata": "#C0C0C0",
};

const ProductDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { addItem } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      const { data } = await supabase.from("products").select("*, categories(name, slug)").eq("id", id).single();
      setProduct(data);
      setLoading(false);
      if (data?.category_id) {
        const { data: rel } = await supabase.from("products").select("*")
          .eq("category_id", data.category_id).neq("id", id).eq("status", "active").limit(6);
        if (rel) setRelated(rel);
      }
    };
    const fetchReviews = async () => {
      const { data } = await supabase.from("reviews").select("*, profiles!reviews_user_id_fkey(name)")
        .eq("product_id", id).order("created_at", { ascending: false });
      if (data) setReviews(data);
    };
    fetchProduct();
    fetchReviews();

    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("affiliate_ref", ref);
      supabase.from("affiliates").select("id").eq("affiliate_code", ref).single().then(({ data: aff }) => {
        if (aff) {
          supabase.from("affiliate_clicks").insert({
            affiliate_id: aff.id, product_id: id, user_agent: navigator.userAgent,
          } as any);
        }
      });
    }
  }, [id, searchParams]);

  const images = useMemo(() => product?.images?.length ? product.images : ["/placeholder.svg"], [product]);
  const colors = useMemo(() => product?.color ? product.color.split(",").map((c: string) => c.trim()).filter(Boolean) : [], [product]);
  const sizes = useMemo(() => product?.size ? product.size.split(",").map((s: string) => s.trim()).filter(Boolean) : [], [product]);

  const isPromoActive = useMemo(() => {
    if (!product?.has_promotion || !product?.promotional_price_mzn) return false;
    const now = new Date();
    if (product.promotion_start_date && new Date(product.promotion_start_date) > now) return false;
    if (product.promotion_end_date && new Date(product.promotion_end_date) < now) return false;
    return true;
  }, [product]);

  const finalPrice = isPromoActive ? Number(product.promotional_price_mzn) : Number(product?.price_mzn || 0);
  const discountPercent = isPromoActive ? Math.round((1 - Number(product.promotional_price_mzn) / Number(product.price_mzn)) * 100) : 0;

  const avgRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;

  const promoTimeLeft = useMemo(() => {
    if (!isPromoActive || !product?.promotion_end_date) return null;
    const end = new Date(product.promotion_end_date);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  }, [isPromoActive, product]);

  const handleAdd = () => {
    if (colors.length > 0 && !selectedColor) { toast.error("Selecione uma cor."); return; }
    if (sizes.length > 0 && !selectedSize) { toast.error("Selecione um tamanho."); return; }
    for (let i = 0; i < qty; i++) {
      addItem({ id: product.id, name: product.name, price: finalPrice, image: images[0] });
    }
    toast.success(`${qty}x ${product.name} adicionado!`);
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `Confira ${product.name} na Laynani Store!`;
    const links: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };
    window.open(links[platform], "_blank");
  };

  const submitReview = async () => {
    if (!user) { toast.error("Faça login para avaliar."); return; }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      product_id: id!, user_id: user.id, rating: reviewRating, comment: reviewText || null,
    });
    if (error) toast.error("Erro ao enviar avaliação.");
    else {
      toast.success("Avaliação enviada!");
      setReviewText("");
      setReviewRating(5);
      const { data } = await supabase.from("reviews").select("*, profiles!reviews_user_id_fkey(name)")
        .eq("product_id", id!).order("created_at", { ascending: false });
      if (data) setReviews(data);
    }
    setSubmittingReview(false);
  };

  if (loading) return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );

  if (!product) return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Produto não encontrado.</p>
          <Button variant="outline" className="mt-4" asChild><Link to="/catalogo"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 px-3 py-4 md:px-4 md:py-8">
        <Button variant="ghost" size="sm" className="mb-2 md:mb-4" asChild>
          <Link to="/catalogo"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
        </Button>

        <div className="grid gap-4 md:gap-8 md:grid-cols-2">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl bg-muted aspect-[4/3] md:aspect-square">
              <img src={images[currentImage]} alt={product.name} className="h-full w-full object-cover" />
              {images.length > 1 && (
                <>
                  <button onClick={() => setCurrentImage(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-md backdrop-blur-sm hover:bg-background">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => setCurrentImage(i => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-md backdrop-blur-sm hover:bg-background">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="absolute bottom-3 right-3 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                    {currentImage + 1}/{images.length}
                  </span>
                </>
              )}
              {isPromoActive && (
                <Badge className="absolute left-3 top-3 bg-destructive text-destructive-foreground animate-pulse text-sm px-3 py-1">
                  {discountPercent}% OFF
                </Badge>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img: string, i: number) => (
                  <button key={i} onClick={() => setCurrentImage(i)}
                    className={`h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === currentImage ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-primary/50"}`}>
                    <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3 md:gap-4">
            <div>
              {product.categories?.name && (
                <Badge variant="outline" className="mb-2">{product.categories.name}</Badge>
              )}
              <h1 className="text-2xl font-bold md:text-3xl">{product.name}</h1>
            </div>

            {/* Rating */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({reviews.length} avaliações)</span>
              </div>
            )}

            {/* Price */}
            <div className="space-y-1">
              {isPromoActive ? (
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-extrabold text-destructive">{finalPrice.toLocaleString("pt-MZ")} MZN</p>
                  <p className="text-lg text-muted-foreground line-through">{Number(product.price_mzn).toLocaleString("pt-MZ")} MZN</p>
                </div>
              ) : (
                <p className="text-3xl font-extrabold text-primary">{finalPrice.toLocaleString("pt-MZ")} MZN</p>
              )}
              {promoTimeLeft && (
                <div className="flex items-center gap-1.5 text-sm text-destructive font-medium">
                  <Clock className="h-4 w-4" />
                  <span>Promoção termina em {promoTimeLeft}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">ou 12x de {(finalPrice / 12).toFixed(0)} MZN</p>
            </div>

            <p className="text-muted-foreground">{product.description}</p>

            {/* Colors */}
            {colors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cor: {selectedColor || "Selecione"}</Label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c: string) => {
                    const hex = PREDEFINED_COLORS[c] || "#888";
                    return (
                      <button key={c} onClick={() => setSelectedColor(c)}
                        className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${selectedColor === c ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                        <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: hex }} />
                        {c}
                        {selectedColor === c && <Check className="h-3 w-3 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sizes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tamanho: {selectedSize || "Selecione"}</Label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s: string) => (
                    <button key={s} onClick={() => setSelectedSize(s)}
                      className={`min-w-[40px] rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${selectedSize === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Weight */}
            {product.weight && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>Peso: {product.weight} kg</span>
              </div>
            )}

            {/* Delivery */}
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <Truck className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                Entrega em {product.delivery_time_min || 3} a {product.delivery_time_max || 15} dias úteis
              </span>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              {product.stock > 0 ? (
                <Badge variant={product.stock <= 5 ? "destructive" : "secondary"}>
                  {product.stock <= 5 ? `Apenas ${product.stock} unidades!` : `${product.stock} em stock`}
                </Badge>
              ) : (
                <Badge variant="destructive">Esgotado</Badge>
              )}
            </div>

            {/* Quantity + Add to cart */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center rounded-lg border">
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></Button>
                <span className="w-10 text-center font-medium">{qty}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></Button>
              </div>
              <Button size="lg" className="flex-1" onClick={handleAdd} disabled={product.stock === 0}>
                <ShoppingCart className="mr-2 h-4 w-4" /> Adicionar ao Carrinho
              </Button>
            </div>

            {/* Buy now + Favorite + Share */}
            <div className="flex gap-2">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => { handleAdd(); window.location.href = "/checkout"; }} disabled={product.stock === 0}>
                <Zap className="mr-2 h-4 w-4" /> Comprar Agora
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => { setIsFavorite(!isFavorite); toast.success(isFavorite ? "Removido dos favoritos" : "Salvo nos favoritos!"); }}>
                <Heart className={`h-5 w-5 ${isFavorite ? "fill-destructive text-destructive" : ""}`} />
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => handleShare("whatsapp")}>
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
          </div>
        </div>

        {/* Reviews Section */}
        <section className="mt-16 space-y-6">
          <h2 className="text-xl font-bold">Avaliações ({reviews.length})</h2>

          {/* Submit review */}
          {user && (
            <div className="rounded-xl border p-4 space-y-3">
              <p className="font-medium text-sm">Deixe sua avaliação</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setReviewRating(s)}>
                    <Star className={`h-6 w-6 transition-colors ${s <= reviewRating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
              <Textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Conte sua experiência..." rows={3} />
              <Button onClick={submitReview} disabled={submittingReview} size="sm">
                {submittingReview ? "Enviando..." : "Enviar Avaliação"}
              </Button>
            </div>
          )}

          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma avaliação ainda. Seja o primeiro!</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{r.profiles?.name || "Anónimo"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-MZ")}</span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-16 space-y-6">
            <h2 className="text-xl font-bold">Você Também Pode Gostar</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {related.map(p => (
                <ProductCard key={p.id} id={p.id} name={p.name} price={Number(p.has_promotion && p.promotional_price_mzn ? p.promotional_price_mzn : p.price_mzn)} image={p.images?.[0] || "/placeholder.svg"} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-3 md:hidden">
        <div className="flex items-center gap-3">
          <div>
            {isPromoActive ? (
              <p className="text-lg font-bold text-destructive">{finalPrice.toLocaleString("pt-MZ")} MZN</p>
            ) : (
              <p className="text-lg font-bold text-primary">{finalPrice.toLocaleString("pt-MZ")} MZN</p>
            )}
          </div>
          <Button className="flex-1" onClick={handleAdd} disabled={product?.stock === 0}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`text-sm font-medium ${className}`}>{children}</label>
);

export default ProductDetail;

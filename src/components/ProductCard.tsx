import { Link } from "react-router-dom";
import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
  rating?: number;
  reviews?: number;
  isSponsored?: boolean;
}

const ProductCard = ({ id, name, price, image, rating = 0, reviews = 0, isSponsored = false }: ProductCardProps) => {
  const { addItem } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({ id, name, price, image });
    toast.success("Adicionado ao carrinho!");
  };

  return (
    <Link to={`/produto/${id}`} className="group block animate-fade-in">
      <div className="overflow-hidden rounded-xl border bg-card shadow-card transition-all duration-300 hover:shadow-elevated">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          {isSponsored && (
            <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
              ✨ Patrocinado
            </span>
          )}
          <Button
            size="icon"
            className="absolute bottom-3 right-3 h-9 w-9 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleAdd}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">{name}</h3>
          {rating > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="text-xs font-medium">{rating}</span>
              <span className="text-xs text-muted-foreground">({reviews})</span>
            </div>
          )}
          <p className="mt-2 text-lg font-bold text-primary">{price.toLocaleString("pt-MZ")} MZN</p>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;

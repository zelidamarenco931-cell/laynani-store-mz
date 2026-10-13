import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  id: string; // id do produto
  name: string;
  price: number;
  image: string;
  quantity: number;
  size?: string;
  color?: string;
}

// Identifica uma linha do carrinho: o mesmo produto em tamanhos/cores diferentes são linhas diferentes
export const cartLineKey = (item: Pick<CartItem, "id" | "size" | "color">) =>
  `${item.id}|${item.size ?? ""}|${item.color ?? ""}`;

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = "laynani_cart";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Guardar carrinho no localStorage sempre que muda
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const key = cartLineKey(item);
      const existing = prev.find((i) => cartLineKey(i) === key);
      if (existing) return prev.map((i) => (cartLineKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (lineKey: string) => setItems((prev) => prev.filter((i) => cartLineKey(i) !== lineKey));

  const updateQuantity = (lineKey: string, quantity: number) => {
    if (quantity <= 0) return removeItem(lineKey);
    setItems((prev) => prev.map((i) => (cartLineKey(i) === lineKey ? { ...i, quantity } : i)));
  };

  const clearCart = () => setItems([]);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

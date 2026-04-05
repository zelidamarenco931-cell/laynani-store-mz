import { Link } from "react-router-dom";
import { ShoppingCart, Search, Menu, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const Navbar = () => {
  const { totalItems } = useCart();
  const { isAdmin } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const navLinks = [
    { label: "Início", href: "/" },
    { label: "Catálogo", href: "/catalogo" },
    { label: "Afiliados", href: "/afiliados" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="bg-gradient-primary">
        <div className="container flex h-8 items-center justify-center text-xs font-medium text-primary-foreground">
          🚚 Entrega Rápida: 7 a 20 dias úteis para todo Moçambique
        </div>
      </div>
      <div className="container flex h-16 items-center justify-between gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <div className="mt-8 flex flex-col gap-4">
              <Link to="/" className="text-2xl font-bold text-gradient">Laynani</Link>
              {navLinks.map((l) => (
                <Link key={l.href} to={l.href} className="text-lg font-medium text-foreground/80 hover:text-primary transition-colors">{l.label}</Link>
              ))}
              {isAdmin && (
                <Link to="/admin" className="text-lg font-medium text-primary transition-colors">Painel Admin</Link>
              )}
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/" className="flex items-center gap-1">
          <span className="text-2xl font-extrabold text-gradient">Laynani</span>
          <span className="hidden text-xs font-medium text-muted-foreground sm:block">Store</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((l) => (
            <Link key={l.href} to={l.href} className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors">{l.label}</Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium text-primary transition-colors">Painel Admin</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden w-64 lg:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Pesquisar produtos..." className="pl-9 h-9" />
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSearchOpen(!searchOpen)}><Search className="h-5 w-5" /></Button>
          {isAdmin && (
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin" aria-label="Painel Admin"><Shield className="h-5 w-5" /></Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" asChild><Link to="/conta"><User className="h-5 w-5" /></Link></Button>
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link to="/carrinho">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary p-0 text-[10px] text-primary-foreground">{totalItems}</Badge>
              )}
            </Link>
          </Button>
        </div>
      </div>
      {searchOpen && (
        <div className="border-t p-3 lg:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Pesquisar produtos..." className="pl-9" autoFocus />
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

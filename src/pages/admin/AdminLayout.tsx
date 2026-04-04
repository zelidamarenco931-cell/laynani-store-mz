import { useEffect, useState } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, ShoppingBag, Package, DollarSign, Settings, ArrowLeft, Menu, FolderOpen, Megaphone, Users, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const adminLinks = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag },
  { label: "Produtos", href: "/admin/produtos", icon: Package },
  { label: "Categorias", href: "/admin/categorias", icon: FolderOpen },
  { label: "Marketing", href: "/admin/marketing", icon: Megaphone },
  { label: "Afiliados", href: "/admin/afiliados", icon: Users },
  { label: "Financeiro", href: "/admin/financeiro", icon: DollarSign },
  { label: "Configurações", href: "/admin/configuracoes", icon: Settings },
];

const AdminLayout = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, isAdmin, loading, navigate]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p>Carregando...</p></div>;
  if (!isAdmin) return null;

  const Sidebar = () => (
    <div className="flex flex-col gap-1">
      <Link to="/" className="mb-4 text-xl font-bold text-gradient">Laynani Admin</Link>
      {adminLinks.map((l) => (
        <Link
          key={l.href}
          to={l.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            location.pathname === l.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <l.icon className="h-4 w-4" />
          {l.label}
        </Link>
      ))}
      <div className="mt-auto pt-4 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar à Loja</Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 border-r bg-muted/30 p-4 lg:block">
        <Sidebar />
      </aside>
      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b px-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="w-64 p-4"><Sidebar /></SheetContent>
          </Sheet>
          <span className="text-lg font-bold text-gradient">Laynani Admin</span>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

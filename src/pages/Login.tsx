import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Login = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Login realizado!");
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gradient">Entrar</h1>
            <p className="mt-2 text-muted-foreground">Acesse sua conta Laynani Store</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-6 shadow-card">
            <div><Label>Email</Label><Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" /></div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Senha</Label>
                <Link to="/esqueci-senha" className="text-xs font-medium text-primary hover:underline">Esqueci a senha</Link>
              </div>
              <div className="relative">
                <Input type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="pr-10" />
                <button type="button" aria-label={show ? "Esconder senha" : "Mostrar senha"} onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta? <Link to="/registrar" className="font-medium text-primary hover:underline">Criar conta</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;

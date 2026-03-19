import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Register = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Conta criada! Verifique seu email.");
      navigate("/login");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gradient">Criar Conta</h1>
            <p className="mt-2 text-muted-foreground">Junte-se à Laynani Store</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-6 shadow-card">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" /></div>
            <div><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Criando..." : "Criar Conta"}</Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta? <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Register;

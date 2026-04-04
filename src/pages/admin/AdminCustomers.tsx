import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Mail, Phone, MapPin } from "lucide-react";

const AdminCustomers = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (data) setProfiles(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.phone || "").toLowerCase().includes(q)
    );
  });

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Utilizadores
        </h1>
        <Badge variant="secondary">{profiles.length} registados</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome, email ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">Nenhum utilizador encontrado.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold truncate">{p.name || "Sem nome"}</p>
                <Badge variant="outline" className="text-xs shrink-0">
                  {new Date(p.created_at).toLocaleDateString("pt-MZ")}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {p.email && (
                  <p className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> {p.email}
                  </p>
                )}
                {p.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" /> {p.phone}
                  </p>
                )}
                {p.province && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> {p.province}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;

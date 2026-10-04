import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { loadSearchIndex, matchesQuery, relevance } from "@/lib/search";
import { formatMZN, getPricing } from "@/lib/pricing";

interface SearchBarProps {
  className?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}

const MAX_SUGGESTIONS = 6;

const SearchBar = ({ className = "", autoFocus = false, onDone }: SearchBarProps) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [index, setIndex] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const term = query.trim();

  // Fecha a lista ao clicar fora.
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  const ensureIndex = () => {
    if (index.length === 0) loadSearchIndex().then(setIndex);
  };

  const suggestions = useMemo(() => {
    if (term.length < 2) return [];
    return index
      .filter((p) => matchesQuery(p, term))
      .sort((a, b) => relevance(b, term) - relevance(a, term))
      .slice(0, MAX_SUGGESTIONS);
  }, [index, term]);

  const finish = () => {
    setOpen(false);
    onDone?.();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term) return;
    navigate(`/catalogo?q=${encodeURIComponent(term)}`);
    finish();
  };

  const goToProduct = (id: string) => {
    navigate(`/produto/${id}`);
    setQuery("");
    finish();
  };

  const showList = open && term.length >= 2;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form onSubmit={submit} role="search">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          placeholder="Pesquisar produtos..."
          aria-label="Pesquisar produtos"
          className="h-9 pl-9 pr-8"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            ensureIndex();
          }}
          onFocus={() => {
            setOpen(true);
            ensureIndex();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {query && (
          <button
            type="button"
            aria-label="Limpar pesquisa"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {showList && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-background shadow-elevated">
          {suggestions.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Nenhum produto encontrado para “{term}”.</p>
          ) : (
            <>
              <ul>
                {suggestions.map((p) => {
                  const pricing = getPricing(p);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => goToProduct(p.id)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                      >
                        <img
                          src={p.images?.[0] || "/placeholder.svg"}
                          alt=""
                          loading="lazy"
                          className="h-10 w-10 shrink-0 rounded-md object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-sm font-medium">{p.name}</span>
                          <span className="flex items-baseline gap-2">
                            <span className={`text-xs font-semibold ${pricing.hasPromotion ? "text-destructive" : "text-primary"}`}>
                              {formatMZN(pricing.price)}
                            </span>
                            {pricing.hasPromotion && (
                              <span className="text-[11px] text-muted-foreground line-through">
                                {formatMZN(pricing.originalPrice!)}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => {
                  navigate(`/catalogo?q=${encodeURIComponent(term)}`);
                  finish();
                }}
                className="w-full border-t px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
              >
                Ver todos os resultados para “{term}”
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;

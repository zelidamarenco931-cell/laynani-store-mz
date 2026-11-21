interface LogoProps {
  className?: string;
}

// Logo oficial da Laynani Store: "LAYNANI" em preto, forte e simples (sem cores).
const Logo = ({ className = "" }: LogoProps) => (
  <span className={`select-none font-black uppercase leading-none tracking-[0.2em] text-foreground ${className}`}>
    Laynani
  </span>
);

export default Logo;

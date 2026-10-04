import { supabase } from "@/integrations/supabase/client";

// As tabelas de campanhas ainda não estão nos tipos gerados do Supabase.
export const campaignsDb = supabase as any;

export type CampaignPhase = "upcoming" | "running" | "ended";

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  banner_url: string | null;
  discount_percent: number;
  starts_at: string; // YYYY-MM-DD
  ends_at: string; // YYYY-MM-DD (inclusivo)
  active: boolean;
  created_at?: string;
  campaign_products?: { product_id: string }[];
}

const pad = (n: number) => String(n).padStart(2, "0");

// Data de hoje (fuso do dispositivo) no formato YYYY-MM-DD.
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const campaignPhase = (c: Pick<Campaign, "starts_at" | "ends_at">): CampaignPhase => {
  const today = todayStr();
  if (today < c.starts_at) return "upcoming";
  if (today > c.ends_at) return "ended";
  return "running";
};

const toDate = (value: string) => new Date(`${value}T00:00:00`);

export const formatDate = (value: string) => toDate(value).toLocaleDateString("pt-MZ");

export const daysUntil = (value: string) =>
  Math.round((toDate(value).getTime() - toDate(todayStr()).getTime()) / 86_400_000);

export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export const phaseLabel: Record<CampaignPhase, string> = {
  upcoming: "Agendada",
  running: "Em curso",
  ended: "Terminada",
};

// Texto curto sobre o tempo restante para a loja.
export const timeLeftLabel = (c: Pick<Campaign, "starts_at" | "ends_at">) => {
  const phase = campaignPhase(c);
  if (phase === "upcoming") return `Começa a ${formatDate(c.starts_at)}`;
  if (phase === "ended") return "Campanha terminada";
  const days = daysUntil(c.ends_at);
  if (days <= 0) return "Termina hoje";
  if (days === 1) return "Termina amanhã";
  return `Termina em ${days} dias`;
};

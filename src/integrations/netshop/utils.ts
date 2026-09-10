/**
 * Funções utilitárias para integração Netshop
 */

/**
 * Formata valor monetário para Netshop (em centavos)
 */
export const formatAmountForNetshop = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Converte centavos de volta para valor normal
 */
export const formatAmountFromNetshop = (amountCents: number): number => {
  return amountCents / 100;
};

/**
 * Mapeia status Netshop para status interno da aplicação
 */
export const mapNetshopStatus = (
  netshopStatus: string
): "pending" | "completed" | "failed" | "cancelled" => {
  const statusMap: Record<string, "pending" | "completed" | "failed" | "cancelled"> = {
    pending: "pending",
    processing: "pending",
    success: "completed",
    completed: "completed",
    paid: "completed",
    failed: "failed",
    error: "failed",
    cancelled: "cancelled",
    declined: "failed",
  };

  return statusMap[netshopStatus.toLowerCase()] || "pending";
};

/**
 * Valida configuração do Netshop
 */
export const validateNetshopConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const apiKey = import.meta.env.VITE_NETSHOP_API_KEY;
  const webhookSecret = import.meta.env.VITE_NETSHOP_WEBHOOK_SECRET;

  if (!apiKey) {
    errors.push("VITE_NETSHOP_API_KEY não configurada");
  }

  if (!webhookSecret && import.meta.env.MODE === "production") {
    errors.push("VITE_NETSHOP_WEBHOOK_SECRET não configurada (obrigatória em produção)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
import { NetshopPaymentRequest, NetshopPaymentResponse, NetshopApiError } from "./types";

/**
 * Cliente para integração com Netshop Payment Gateway
 * Documentação: https://netshop.co.mz/docs
 */

const NETSHOP_API_BASE = "https://api.netshop.co.mz/v1";
const NETSHOP_API_KEY = import.meta.env.VITE_NETSHOP_API_KEY;

class NetshopClient {
  private apiKey: string;
  private apiBase: string;

  constructor(apiKey: string = NETSHOP_API_KEY) {
    if (!apiKey) {
      throw new Error("Netshop API key not configured. Set VITE_NETSHOP_API_KEY in environment variables.");
    }
    this.apiKey = apiKey;
    this.apiBase = NETSHOP_API_BASE;
  }

  /**
   * Cria uma sessão de pagamento no Netshop
   */
  async createPaymentSession(request: NetshopPaymentRequest): Promise<NetshopPaymentResponse> {
    try {
      const payload = {
        amount: Math.round(request.amount * 100), // Converter para centavos
        currency: request.currency || "MZN",
        order_id: request.order_id,
        customer: {
          email: request.customer_email,
          phone: request.customer_phone,
          name: request.customer_name,
        },
        description: request.description,
        success_url: request.return_url,
        cancel_url: request.return_url.replace("success=true", "success=false"),
        webhook_url: request.webhook_url,
        metadata: request.metadata || {},
      };

      const response = await fetch(`${this.apiBase}/payments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.handleError(error);
      }

      const data = await response.json();

      return {
        id: data.id,
        status: data.status || "pending",
        payment_url: data.payment_url || data.checkout_url,
        order_id: request.order_id,
        amount: request.amount,
        currency: request.currency || "MZN",
      };
    } catch (error) {
      console.error("Netshop payment creation error:", error);
      throw error;
    }
  }

  /**
   * Verifica o status de um pagamento
   */
  async checkPaymentStatus(paymentId: string): Promise<{
    status: string;
    order_id: string;
    amount: number;
  }> {
    try {
      const response = await fetch(`${this.apiBase}/payments/${paymentId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.handleError(error);
      }

      const data = await response.json();
      return {
        status: data.status,
        order_id: data.order_id,
        amount: data.amount / 100, // Converter de centavos para unidades
      };
    } catch (error) {
      console.error("Netshop status check error:", error);
      throw error;
    }
  }

  /**
   * Valida a assinatura de um webhook do Netshop
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Implementar verificação de assinatura conforme especificado pelo Netshop
    // Este é um exemplo básico - ajustar conforme documentação oficial
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(payload).digest("hex");
    return digest === signature;
  }

  /**
   * Trata erros da API Netshop
   */
  private handleError(error: any): NetshopApiError {
    const apiError: NetshopApiError = {
      code: error.code || "UNKNOWN_ERROR",
      message: error.message || "Erro desconhecido com Netshop",
      details: error.details,
    };
    return apiError;
  }
}

// Instância singleton
export const netshopClient = new NetshopClient();
export default NetshopClient;
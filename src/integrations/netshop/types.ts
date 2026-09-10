/**
 * Tipos para integração com Netshop Payment Gateway
 */

export interface NetshopPaymentRequest {
  amount: number;
  currency?: string;
  order_id: string;
  customer_email: string;
  customer_phone: string;
  customer_name: string;
  description: string;
  return_url: string;
  webhook_url: string;
  metadata?: Record<string, any>;
}

export interface NetshopPaymentResponse {
  id: string;
  status: "pending" | "success" | "failed";
  payment_url: string;
  order_id: string;
  amount: number;
  currency: string;
}

export interface NetshopWebhookPayload {
  id: string;
  order_id: string;
  status: "success" | "failed" | "cancelled";
  amount: number;
  currency: string;
  timestamp: string;
  signature: string;
}

export interface NetshopApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
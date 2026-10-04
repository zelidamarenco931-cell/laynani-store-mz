import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Segredos a configurar no Supabase (Edge Functions > Secrets)
const apiKey = Deno.env.get("DEBITOPAY_API_KEY"); // sk_live_...
const merchantId = Deno.env.get("DEBITOPAY_MERCHANT_ID"); // UUID do merchant
const walletCode = Deno.env.get("DEBITOPAY_WALLET_CODE"); // código de 5 dígitos da carteira Visa/Mastercard (MZN)
const apiBase =
  Deno.env.get("DEBITOPAY_API_URL") ??
  "https://gyqoaningqhurhvdugne.supabase.co/functions/v1";

const MIN_CARD_AMOUNT_MZN = 50;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const missing = [
      ["DEBITOPAY_API_KEY", apiKey],
      ["DEBITOPAY_MERCHANT_ID", merchantId],
      ["DEBITOPAY_WALLET_CODE", walletCode],
    ].filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      console.error("Segredos em falta:", missing.join(", "));
      return json({ success: false, error: "Débito Pay não configurado.", missing }, 500);
    }

    // 1. Autenticar o utilizador
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ success: false, error: "Não autenticado." }, 401);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ success: false, error: "Sessão inválida." }, 401);
    }
    const user = userData.user;

    // 2. Ler pedido (o valor vem da base de dados, não do cliente)
    const { orderId, successUrl, customerEmail } = await req.json();
    if (!orderId) return json({ success: false, error: "orderId em falta." }, 400);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, total_mzn, shipping_address")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return json({ success: false, error: "Pedido não encontrado." }, 404);
    }
    if (order.user_id !== user.id) {
      return json({ success: false, error: "Pedido não pertence ao utilizador." }, 403);
    }

    const amount = Number(order.total_mzn);
    if (!amount || amount <= 0) {
      return json({ success: false, error: "Valor do pedido inválido." }, 400);
    }
    if (amount < MIN_CARD_AMOUNT_MZN) {
      return json(
        { success: false, error: `Valor mínimo para cartão: ${MIN_CARD_AMOUNT_MZN} MZN.` },
        400,
      );
    }

    // 3. URL de retorno: só aceitar a do próprio site
    const siteOrigin = req.headers.get("origin") || "";
    let returnUrl = `${siteOrigin}/pedido-sucesso?debitopay=true&order=${orderId}`;
    try {
      if (typeof successUrl === "string" && siteOrigin) {
        const u = new URL(successUrl);
        if (u.origin === siteOrigin) returnUrl = u.toString();
      }
    } catch (_) { /* usar fallback */ }

    // 4. Criar cobrança no payment-orchestrator (Visa/Mastercard - Hosted Checkout)
    const ship = (order.shipping_address ?? {}) as Record<string, string>;
    const payload = {
      action: "process",
      payment_method: "visa_mastercard",
      merchant_id: merchantId,
      wallet_code: walletCode,
      amount, // MZN inteiros (não cêntimos)
      currency: "MZN",
      source: "gateway",
      source_id: orderId,
      customer_name: ship.name || user.email || "Cliente",
      customer_email: customerEmail || user.email,
      customer_phone: ship.phone,
      return_url: returnUrl,
    };

    const clientIp = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Idempotency-Key": orderId,
      "X-Customer-Origin": `${siteOrigin}/checkout`,
    };
    if (clientIp) headers["X-Customer-IP"] = clientIp;
    const ua = req.headers.get("user-agent");
    if (ua) headers["X-Customer-User-Agent"] = ua;

    console.log("Debito Pay: criar cobrança", { orderId, amount });

    const response = await fetch(`${apiBase}/payment-orchestrator`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch (_) { /* tratado abaixo */ }

    if (!response.ok || !data?.success) {
      console.error("Debito Pay erro:", response.status, text);
      return json(
        {
          success: false,
          error: data?.error || `Débito Pay respondeu ${response.status}`,
          provider_status: response.status,
        },
        502,
      );
    }

    if (!data.checkout_url) {
      console.error("Sem checkout_url na resposta:", text);
      return json({ success: false, error: "Débito Pay não devolveu URL de pagamento." }, 502);
    }

    // 5. Guardar o payment_id (usado pelo webhook para encontrar o pedido)
    if (data.payment_id) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ debitopay_payment_id: String(data.payment_id) })
        .eq("id", orderId);
      if (updateError) console.error("Erro ao guardar debitopay_payment_id:", updateError);
    }

    return json({ success: true, url: data.checkout_url, payment_id: data.payment_id });
  } catch (error) {
    console.error("Error:", error);
    return json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});

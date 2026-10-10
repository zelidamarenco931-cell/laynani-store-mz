import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Segredos a configurar no Supabase (Edge Functions > Secrets)
const apiKey = Deno.env.get("DEBITOPAY_API_KEY"); // sk_live_...
const merchantId = Deno.env.get("DEBITOPAY_MERCHANT_ID"); // UUID do merchant
const cardWalletCode = Deno.env.get("DEBITOPAY_WALLET_CODE"); // carteira Visa/Mastercard (MZN)
const mpesaWalletCode = Deno.env.get("DEBITOPAY_MPESA_WALLET_CODE"); // carteira M-Pesa (MZN)
const apiBase =
  Deno.env.get("DEBITOPAY_API_URL") ??
  "https://gyqoaningqhurhvdugne.supabase.co/functions/v1";

const MIN_AMOUNT_MZN = { card: 50, mpesa: 10 } as const;

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

// Mesma regra de promoção do site (src/lib/pricing.ts)
const effectivePrice = (p: any): number => {
  const base = Number(p?.price_mzn || 0);
  const promo = Number(p?.promotional_price_mzn || 0);
  let active = !!p?.has_promotion && promo > 0 && promo < base;
  if (active) {
    const now = new Date();
    if (p.promotion_start_date && new Date(p.promotion_start_date) > now) active = false;
    if (p.promotion_end_date && new Date(p.promotion_end_date) < now) active = false;
  }
  return active ? promo : base;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { orderId, successUrl, customerEmail, phone } = body;
    const method: "card" | "mpesa" = body.method === "mpesa" ? "mpesa" : "card";
    const walletCode = method === "mpesa" ? mpesaWalletCode : cardWalletCode;

    const missing = [
      ["DEBITOPAY_API_KEY", apiKey],
      ["DEBITOPAY_MERCHANT_ID", merchantId],
      [method === "mpesa" ? "DEBITOPAY_MPESA_WALLET_CODE" : "DEBITOPAY_WALLET_CODE", walletCode],
    ].filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      console.error("Segredos em falta:", missing.join(", "));
      return json(
        { success: false, error: "Débito Pay não configurado.", message: "Este método de pagamento ainda não está disponível.", missing },
        500,
      );
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
    if (!orderId) return json({ success: false, error: "orderId em falta." }, 400);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, total_mzn, shipping_address, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return json({ success: false, error: "Pedido não encontrado." }, 404);
    }
    if (order.user_id !== user.id) {
      return json({ success: false, error: "Pedido não pertence ao utilizador." }, 403);
    }
    if (!["pending", "processing"].includes(order.status)) {
      return json({ success: false, error: "Pedido já processado.", message: "Este pedido já foi processado." }, 409);
    }

    const amount = Number(order.total_mzn);
    if (!amount || amount <= 0) {
      return json({ success: false, error: "Valor do pedido inválido." }, 400);
    }
    const min = MIN_AMOUNT_MZN[method];
    if (amount < min) {
      return json(
        { success: false, error: `Valor mínimo: ${min} MZN.`, message: `O valor mínimo para este método é ${min} MZN.` },
        400,
      );
    }

    // 2b. Confirmar o total no servidor: o total gravado pelo cliente não é de confiança.
    // Recalcula a partir dos itens, dos preços actuais dos produtos e do frete da província.
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("quantity, products(price_mzn, promotional_price_mzn, has_promotion, promotion_start_date, promotion_end_date)")
      .eq("order_id", orderId);

    if (itemsError || !orderItems || orderItems.length === 0) {
      return json(
        { success: false, error: "Pedido sem itens.", message: "O pedido não tem produtos. Volte ao carrinho e tente novamente." },
        400,
      );
    }

    let subtotal = 0;
    for (const it of orderItems as any[]) {
      const qty = Number(it.quantity);
      if (!Number.isInteger(qty) || qty <= 0 || !it.products) {
        return json({ success: false, error: "Itens inválidos.", message: "Há um produto inválido no pedido. Volte ao carrinho." }, 400);
      }
      subtotal += effectivePrice(it.products) * qty;
    }

    const province = String((order.shipping_address as any)?.province ?? "");
    const { data: rate } = await supabase
      .from("shipping_rates")
      .select("price_mzn")
      .eq("province", province)
      .maybeSingle();
    const expected = subtotal + Number(rate?.price_mzn || 0);

    if (Math.abs(expected - amount) > 1) {
      console.error("Total divergente", { orderId, gravado: amount, esperado: expected });
      return json(
        {
          success: false,
          error: "Total do pedido não confere.",
          message: "Os preços foram actualizados. Volte ao carrinho, actualize a página e faça o pedido novamente.",
        },
        409,
      );
    }

    // 3. Telefone M-Pesa (84 ou 85)
    let msisdn: string | undefined;
    if (method === "mpesa") {
      const digits = String(phone ?? "").replace(/\D/g, "").replace(/^258/, "");
      if (!/^8[45]\d{7}$/.test(digits)) {
        return json(
          { success: false, error: "Número M-Pesa inválido.", message: "Número M-Pesa inválido. Deve começar por 84 ou 85." },
          400,
        );
      }
      msisdn = `258${digits}`;
    }

    // 4. URL de retorno (só cartão): apenas a do próprio site
    const siteOrigin = req.headers.get("origin") || "";
    let returnUrl = `${siteOrigin}/pedido-sucesso?debitopay=true&order=${orderId}`;
    try {
      if (typeof successUrl === "string" && siteOrigin) {
        const u = new URL(successUrl);
        if (u.origin === siteOrigin) returnUrl = u.toString();
      }
    } catch (_) { /* usar fallback */ }

    // 5. Criar cobrança no payment-orchestrator
    const ship = (order.shipping_address ?? {}) as Record<string, string>;
    const payload: Record<string, unknown> = {
      action: "process",
      payment_method: method === "mpesa" ? "mpesa" : "visa_mastercard",
      merchant_id: merchantId,
      wallet_code: walletCode,
      amount, // MZN inteiros (não cêntimos)
      currency: "MZN",
      source: "gateway",
      source_id: orderId,
      customer_name: ship.name || user.email || "Cliente",
      customer_email: customerEmail || user.email,
      customer_phone: msisdn ?? ship.phone,
    };
    if (method === "mpesa") payload.phone = msisdn;
    else payload.return_url = returnUrl;

    const clientIp = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Idempotency-Key": `${orderId}:${method}`,
      "X-Customer-Origin": `${siteOrigin}/checkout`,
    };
    if (clientIp) headers["X-Customer-IP"] = clientIp;
    const ua = req.headers.get("user-agent");
    if (ua) headers["X-Customer-User-Agent"] = ua;

    console.log("Debito Pay: criar cobrança", { orderId, amount, method });

    const response = await fetch(`${apiBase}/payment-orchestrator`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch (_) { /* tratado abaixo */ }

    // Guardar o payment_id sempre que existir (o webhook usa-o para encontrar o pedido)
    if (data?.payment_id) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ debitopay_payment_id: String(data.payment_id) })
        .eq("id", orderId);
      if (updateError) console.error("Erro ao guardar debitopay_payment_id:", updateError);
    }

    if (!response.ok || !data?.success) {
      console.error("Debito Pay erro:", response.status, text);
      return json(
        {
          success: false,
          error: data?.error || `Débito Pay respondeu ${response.status}`,
          message: method === "mpesa"
            ? "O pagamento M-Pesa não foi concluído. Verifique o número, o saldo e o PIN e tente novamente."
            : "Não foi possível iniciar o pagamento. Tente novamente.",
          provider_status: response.status,
        },
        502,
      );
    }

    // ---- M-Pesa: confirmação síncrona ----
    if (method === "mpesa") {
      if (data.status === "success") {
        // Idempotente com o webhook: só mexe em pedidos ainda por confirmar.
        // O gatilho da base de dados aprova a comissão do afiliado.
        const { error: paidError } = await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", orderId)
          .in("status", ["pending", "processing"]);
        if (paidError) console.error("Erro ao marcar pedido como pago:", paidError);
        return json({ success: true, method: "mpesa", status: "success", payment_id: data.payment_id });
      }
      if (data.status === "pending") {
        // Aguarda o webhook payment.completed / payment.failed
        return json({ success: true, method: "mpesa", status: "pending", payment_id: data.payment_id });
      }
      console.error("M-Pesa estado inesperado:", text);
      return json(
        {
          success: false,
          error: `Estado M-Pesa: ${data.status}`,
          message: "O pagamento M-Pesa não foi concluído. Verifique o número, o saldo e o PIN e tente novamente.",
        },
        502,
      );
    }

    // ---- Cartão: redirecionar para o Hosted Checkout ----
    if (!data.checkout_url) {
      console.error("Sem checkout_url na resposta:", text);
      return json({ success: false, error: "Débito Pay não devolveu URL de pagamento.", message: "Não foi possível iniciar o pagamento. Tente novamente." }, 502);
    }

    return json({ success: true, method: "card", url: data.checkout_url, payment_id: data.payment_id });
  } catch (error) {
    console.error("Error:", error);
    return json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});

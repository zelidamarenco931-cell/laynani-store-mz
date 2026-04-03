import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length === 0) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Sessão inválida. Faça login novamente para continuar." }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return jsonResponse({ error: "Sessão inválida. Faça login novamente para continuar." }, 401);
    }

    const payload = await req.json();
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (authError || !user?.email) {
      return jsonResponse({ error: "Utilizador não autenticado." }, 401);
    }

    const requestOrigin =
      (isHttpUrl(payload.origin) ? payload.origin : null) ??
      req.headers.get("origin") ??
      req.headers.get("referer")?.match(/^https?:\/\/[^/]+/)?.[0];

    if (!requestOrigin) throw new Error("Missing request origin");

    const { items, shippingCost, shippingAddress, affiliateId } = payload;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return jsonResponse({ error: "Nenhum item foi enviado." }, 400);
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeSecretKey) throw new Error("Stripe secret key is not configured");

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const lineItems = items
      .map((item: any) => {
        const safeImages = isHttpUrl(item?.image) ? [item.image] : [];
        const unitAmount = Math.round(Number(item?.price || 0) * 100);
        const quantity = Math.max(1, Number(item?.quantity || 1));

        if (!unitAmount || !Number.isFinite(unitAmount)) return null;

        return {
          price_data: {
            currency: "mzn",
            product_data: {
              name: typeof item?.name === "string" && item.name.trim().length > 0 ? item.name : "Produto",
              ...(safeImages.length > 0 ? { images: safeImages } : {}),
            },
            unit_amount: unitAmount,
          },
          quantity,
        };
      })
      .filter(Boolean);

    if (lineItems.length === 0) {
      return jsonResponse({ error: "Os itens enviados são inválidos." }, 400);
    }

    if (Number(shippingCost) > 0) {
      lineItems.push({
        price_data: {
          currency: "mzn",
          product_data: {
            name: "Frete",
            images: [],
          },
          unit_amount: Math.round(Number(shippingCost) * 100),
        },
        quantity: 1,
      });
    }

    const metadata: Record<string, string> = {
      user_id: user.id,
      shipping_address: JSON.stringify(shippingAddress || {}),
    };
    if (affiliateId) metadata.affiliate_id = affiliateId;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      metadata,
      success_url: `${requestOrigin}/checkout?success=true`,
      cancel_url: `${requestOrigin}/checkout`,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");

    return jsonResponse({ url: session.url, sessionId: session.id }, 200);
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

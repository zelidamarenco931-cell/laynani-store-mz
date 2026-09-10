import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { items, shippingCost, successUrl, cancelUrl, customerEmail, metadata, orderId } = await req.json();

    const netshopApiKey = Deno.env.get("NETSHOP_API_KEY") ?? "";
    if (!netshopApiKey) {
      throw new Error("NETSHOP_API_KEY not configured");
    }

    // Calculate total in MZN
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const totalMzn = subtotal + shippingCost;

    // Prepare Netshop payment request
    const paymentPayload = {
      api_key: netshopApiKey,
      amount: totalMzn,
      currency: "MZN",
      reference: orderId,
      description: `Pedido #${orderId.slice(0, 8).toUpperCase()} - Laynani Store`,
      customer_email: customerEmail,
      customer_phone: metadata.phone,
      redirect_url: successUrl,
      webhook_url: `${new URL(req.url).origin}/functions/v1/handle-netshop-webhook`,
      metadata: {
        order_id: orderId,
        user_id: metadata.user_id,
        province: metadata.province,
        city: metadata.city,
        bairro: metadata.bairro,
        reference: metadata.reference,
        name: metadata.name,
        phone: metadata.phone,
      },
      auto_capture: true, // Automatic payment capture
    };

    // Create payment session with Netshop
    const response = await fetch("https://api.netshop.co.mz/v1/payments/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${netshopApiKey}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Netshop API error:", error);
      throw new Error(`Netshop API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.payment_url) {
      throw new Error("Failed to create Netshop payment session");
    }

    return new Response(JSON.stringify({ url: data.payment_url, payment_id: data.payment_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

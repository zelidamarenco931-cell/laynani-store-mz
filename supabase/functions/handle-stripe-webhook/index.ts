import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2024-06-20",
    });

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""
    );

    console.log(`Processing Stripe event: ${event.type}`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const orderId = session.metadata?.order_id;

      if (!orderId) {
        console.warn("No order_id in session metadata");
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if payment was actually successful
      if (session.payment_status === "paid") {
        // Update order status to "paid"
        const { error } = await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_method: "stripe",
            stripe_session_id: session.id,
          })
          .eq("id", orderId);

        if (error) {
          console.error("Error updating order:", error);
          return new Response(
            JSON.stringify({ error: "Failed to update order" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(`Order ${orderId} marked as paid`);

        // Get order details to send WhatsApp notification
        const { data: order } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (order) {
          const phone = order.shipping_address?.phone?.replace(/\D/g, "") || "";
          const phoneNum = phone.startsWith("258") ? phone : `258${phone}`;
          const msg = encodeURIComponent(
            `✅ *PAGAMENTO CONFIRMADO*\n\n` +
              `Olá ${order.shipping_address?.name || "Cliente"},\n\n` +
              `Seu pedido #${order.id.slice(0, 8).toUpperCase()} foi confirmado com sucesso!\n` +
              `💰 Total: ${Number(order.total_mzn).toLocaleString("pt-MZ")} MZN\n` +
              `💳 Método: Cartão / PayPal (Stripe)\n\n` +
              `Seu pedido será processado em breve. Obrigado!`
          );
          
          console.log(`WhatsApp notification ready for ${phoneNum}`);
        }
      }
    }

    // Handle payment_intent.payment_failed
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as any;
      const orderId = paymentIntent.metadata?.order_id;

      if (orderId) {
        console.log(`Payment failed for order ${orderId}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

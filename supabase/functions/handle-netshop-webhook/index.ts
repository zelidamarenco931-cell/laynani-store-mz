import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    console.log(`Processing Netshop webhook event: ${body.event}`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle payment completed event
    if (body.event === "payment.completed" || body.event === "payment.success") {
      const { payment_id, reference, status, amount, metadata } = body.data;
      const orderId = reference || metadata?.order_id;

      if (!orderId) {
        console.warn("No order_id in webhook payload");
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if payment was successful
      if (status === "completed" || status === "success" || status === "paid") {
        // Update order status to "paid"
        const { error } = await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_method: "netshop",
            netshop_payment_id: payment_id,
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

        console.log(`Order ${orderId} marked as paid via Netshop`);

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
              `💳 Método: Netshop (Pagamento Automático)\n\n` +
              `Obrigado pela compra! 🎉`
          );

          try {
            const waResponse = await fetch(
              `https://wa.me/${phoneNum}?text=${msg}`,
              { method: "HEAD" }
            );
            console.log("WhatsApp notification sent");
          } catch (e) {
            console.error("Failed to send WhatsApp notification:", e);
          }
        }
      }
    }

    // Handle payment failed event
    if (body.event === "payment.failed") {
      const { reference, metadata } = body.data;
      const orderId = reference || metadata?.order_id;

      if (orderId) {
        const { error } = await supabase
          .from("orders")
          .update({
            status: "failed",
            payment_method: "netshop",
          })
          .eq("id", orderId);

        if (!error) {
          console.log(`Order ${orderId} marked as failed`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

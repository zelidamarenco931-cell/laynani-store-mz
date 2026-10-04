import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const webhookSecret = Deno.env.get("DEBITOPAY_WEBHOOK_SECRET");

const enc = new TextEncoder();

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  if (!webhookSecret) {
    console.error("DEBITOPAY_WEBHOOK_SECRET em falta");
    return new Response("Not configured", { status: 500 });
  }

  const raw = await req.text();
  const received = (req.headers.get("x-webhook-signature") || "").replace(/^sha256=/i, "").trim().toLowerCase();
  const expected = await hmacHex(webhookSecret, raw);

  if (!received || !safeEqual(received, expected)) {
    console.error("Assinatura de webhook inválida");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch (_) {
    return new Response("Bad request", { status: 400 });
  }

  const paymentId = event?.data?.payment_id;
  if (!paymentId) return new Response("ok", { status: 200 });

  // Idempotente: só mexe em pedidos ainda por confirmar.
  // Ao passar para 'paid' / 'cancelled', o gatilho da base de dados aprova / cancela
  // automaticamente a comissão do afiliado.
  const pendingStates = ["pending", "processing"];

  if (event.event === "payment.completed") {
    const { error } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("debitopay_payment_id", String(paymentId))
      .in("status", pendingStates);
    if (error) {
      console.error("Erro ao confirmar pedido:", error);
      return new Response("DB error", { status: 500 }); // força retentativa
    }
  } else if (event.event === "payment.failed") {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("debitopay_payment_id", String(paymentId))
      .in("status", pendingStates);
    if (error) {
      console.error("Erro ao cancelar pedido:", error);
      return new Response("DB error", { status: 500 });
    }
  } else {
    console.log("Evento ignorado:", event.event);
  }

  return new Response("ok", { status: 200 });
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type PPEvent = {
  id: string;
  event_type: string;
  resource: any;
  summary?: string;
};

async function getPayPalAccessToken(baseUrl: string, clientId: string, secret: string) {
  const auth = btoa(`${clientId}:${secret}`);
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Failed to get PayPal token: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
    const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET")!;
    const PAYPAL_ENV = (Deno.env.get("PAYPAL_ENV") || "sandbox").toLowerCase();
    const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID")!;

    const baseUrl = PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const headers = Object.fromEntries(req.headers.entries());
    const bodyText = await req.text();
    const event = JSON.parse(bodyText) as PPEvent;

    // Verify webhook signature with PayPal
    const accessToken = await getPayPalAccessToken(baseUrl, PAYPAL_CLIENT_ID, PAYPAL_SECRET);
    const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: event,
      }),
    });

    if (!verifyRes.ok) {
      const txt = await verifyRes.text();
      return new Response(JSON.stringify({ error: "Webhook verification failed", detail: txt }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const verifyData = await verifyRes.json();
    if (verifyData.verification_status !== "SUCCESS") {
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Process relevant events
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const res = event.resource;
      const captureId = res.id;
      const amount = parseFloat(res.amount?.value || "0");
      const currency = res.amount?.currency_code || "USD";
      // Prefer custom_id because we store our internal invoice uuid there.
      // invoice_id may be a unique PayPal invoice id (string) and not a uuid.
      const invoiceId = res.custom_id || res.invoice_id || res?.supplementary_data?.related_ids?.order_id || null;

      if (invoiceId) {
        // Insert payment and mark invoice as paid
        const { error: insErr } = await supabaseAdmin.from("payments").insert({
          invoice_id: invoiceId,
          provider: "paypal",
          provider_txn_id: captureId,
          amount,
          currency,
          status: "completed",
          payer_email: res?.payer?.email_address || null,
          raw_payload: res,
        });
        if (!insErr) {
          await supabaseAdmin.from("invoices").update({ status: "paid" }).eq("id", invoiceId);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

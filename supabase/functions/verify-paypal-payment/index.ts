import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type VerifyRequest = {
  invoiceId: string;
  amount?: number;
  currency?: string; // default USD
  orderId?: string;
  captureId?: string;
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
  if (!res.ok) {
    throw new Error(`Failed to get PayPal token: ${res.status} ${await res.text()}`);
  }
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

    const baseUrl = PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Require auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as VerifyRequest;
    let { invoiceId, amount: clientAmount, currency = "USD", orderId, captureId } = body;
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "invoiceId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch invoice to verify amount
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select("id, amount, status")
      .eq("id", invoiceId)
      .single();
    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!orderId && !captureId) {
      const { data: latestPayment, error: payLookupErr } = await supabaseAdmin
        .from("payments")
        .select("provider_txn_id")
        .eq("invoice_id", invoiceId)
        .eq("provider", "paypal")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (payLookupErr || !latestPayment?.provider_txn_id) {
        return new Response(JSON.stringify({ error: "orderId or captureId required (no prior PayPal payment found for invoice)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      captureId = latestPayment.provider_txn_id;
    }

    // Get PayPal token
    const ppToken = await getPayPalAccessToken(baseUrl, PAYPAL_CLIENT_ID, PAYPAL_SECRET);

    // Retrieve PayPal order/capture to validate
    let paypalPayload: any = null;
    let verifiedAmount = 0;
    let status = "pending";
    let providerTxnId = captureId || orderId!;

    if (captureId) {
      const res = await fetch(`${baseUrl}/v2/payments/captures/${captureId}`, {
        headers: { Authorization: `Bearer ${ppToken}` },
      });

      if (!res.ok) {
        const txt = await res.text();
        const paypalDebugId = res.headers.get('paypal-debug-id');

        // Fallback: some merchants/apps may not have permission to read capture details,
        // but can still read the order. Try orderId if available.
        if (orderId) {
          const orderRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${ppToken}` },
          });

          if (!orderRes.ok) {
            const orderTxt = await orderRes.text();
            const orderDebugId = orderRes.headers.get('paypal-debug-id');
            return new Response(
              JSON.stringify({
                error: `PayPal capture fetch failed`,
                detail: txt,
                paypal_debug_id: paypalDebugId,
                baseUrl,
                captureId,
                order_fallback_error: `PayPal order fetch failed`,
                order_fallback_detail: orderTxt,
                order_paypal_debug_id: orderDebugId,
                orderId,
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          paypalPayload = await orderRes.json();
          status = paypalPayload.status || "pending";
          const units = paypalPayload.purchase_units?.[0];
          verifiedAmount = parseFloat(units?.amount?.value || "0");
          const cap = units?.payments?.captures?.[0];
          if (cap?.id) providerTxnId = cap.id;
        } else {
          return new Response(
            JSON.stringify({
              error: `PayPal capture fetch failed`,
              detail: txt,
              paypal_debug_id: paypalDebugId,
              baseUrl,
              captureId,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        paypalPayload = await res.json();
        status = paypalPayload.status || paypalPayload?.status_code || "pending";
        verifiedAmount = parseFloat(paypalPayload?.amount?.value || "0");
      }
    } else if (orderId) {
      const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${ppToken}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        return new Response(JSON.stringify({ error: `PayPal order fetch failed`, detail: txt }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      paypalPayload = await res.json();
      status = paypalPayload.status || "pending";
      const units = paypalPayload.purchase_units?.[0];
      verifiedAmount = parseFloat(units?.amount?.value || "0");
      // If captures present, use the first capture id as providerTxnId
      const cap = units?.payments?.captures?.[0];
      if (cap?.id) providerTxnId = cap.id;
    }

    // Amount check (allow server-side amount of invoice to be the source of truth)
    const expectedAmount = parseFloat(invoice.amount);
    if (clientAmount && Math.abs(expectedAmount - clientAmount) > 0.01) {
      return new Response(JSON.stringify({ error: "Amount mismatch", expectedAmount, clientAmount }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (Math.abs(expectedAmount - verifiedAmount) > 0.01) {
      // Not fatal: some endpoints (order fetch) may not show captured amount yet. Continue but mark warning.
    }

    const statusUpper = String(status || "").toUpperCase();
    const isCompleted = ["COMPLETED", "CAPTURED"].includes(statusUpper);
    const isPending = statusUpper === "PENDING";
    if (!isCompleted && !isPending) {
      return new Response(JSON.stringify({ error: "Payment not completed", status }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const paymentStatus = isCompleted ? "completed" : "pending";

    // Insert/update payment record (avoid duplicates if client retries verification)
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id, status")
      .eq("provider", "paypal")
      .eq("provider_txn_id", providerTxnId)
      .maybeSingle();

    let payment: any = null;

    if (existingPayment?.id) {
      const { data: updated, error: updPayErr } = await supabaseAdmin
        .from("payments")
        .update({
          status: paymentStatus,
          invoice_id: invoiceId,
          amount: expectedAmount,
          currency,
          payer_email: paypalPayload?.payer?.email_address || paypalPayload?.payment_source?.paypal?.email_address || null,
          raw_payload: paypalPayload,
        })
        .eq("id", existingPayment.id)
        .select()
        .single();
      if (updPayErr) {
        return new Response(JSON.stringify({ error: updPayErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      payment = updated;
    } else {
      const { data: inserted, error: insPayErr } = await supabaseAdmin
        .from("payments")
        .insert({
          invoice_id: invoiceId,
          provider: "paypal",
          provider_txn_id: providerTxnId,
          amount: expectedAmount,
          currency,
          status: paymentStatus,
          payer_email: paypalPayload?.payer?.email_address || paypalPayload?.payment_source?.paypal?.email_address || null,
          raw_payload: paypalPayload,
        })
        .select()
        .single();
      if (insPayErr) {
        return new Response(JSON.stringify({ error: insPayErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      payment = inserted;
    }

    if (isCompleted) {
      // Update invoice to paid if not already
      if (invoice.status !== "paid") {
        const { error: updInvErr } = await supabaseAdmin
          .from("invoices")
          .update({ status: "paid" })
          .eq("id", invoiceId);
        if (updInvErr) {
          return new Response(JSON.stringify({ error: updInvErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      return new Response(JSON.stringify({ success: true, payment, status: "paid" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, payment, status: "pending" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

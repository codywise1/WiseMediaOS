import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "npm:@solana/web3.js@1.95.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": [
    "content-type",
    "authorization",
    "x-client-info",
    "apikey",
    "Content-Type",
    "Authorization",
    "X-Client-Info",
    "Apikey"
  ].join(", "),
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

type VerifySolanaRequest = {
  invoiceId: string;
  signature: string;
  from: string;
  to: string;
  amount: number; // amount in SOL
  network?: "mainnet" | "devnet";
  lamports?: number; // optional exact lamports sent
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const DEFAULT_MAINNET = "https://api.mainnet-beta.solana.com";
    const DEFAULT_DEVNET = "https://api.devnet.solana.com";
    const ENV_RPC = Deno.env.get("SOLANA_RPC_URL");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Auth opcional (no bloquea si falta o es inválido)
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        await supabaseAdmin.auth.getUser(token);
      } catch (_) {
        // continuar sin contexto de usuario
      }
    }

    const body = (await req.json()) as VerifySolanaRequest;
    const { invoiceId, signature, from, to, amount, lamports } = body;
    const requestedNetwork = (body.network || Deno.env.get("SOLANA_NETWORK") || "mainnet") as
      | "mainnet"
      | "devnet";
    const SOLANA_RPC_URL = ENV_RPC || (requestedNetwork === "devnet" ? DEFAULT_DEVNET : DEFAULT_MAINNET);
    if (!invoiceId || !signature || !from || !to || !amount) {
      console.error("[verify-solana-payment] Missing fields", { invoiceId, signaturePresent: !!signature, from, to, amount });
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verifica la factura
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select("id, amount, status")
      .eq("id", invoiceId)
      .single();
    if (invErr || !invoice) {
      console.error("[verify-solana-payment] Invoice not found", { invoiceId, invErr });
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verificación on-chain
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const MAX_TX_RETRIES = 5;
    const RETRY_DELAY_BASE_MS = 600;

    let parsedTx: Awaited<ReturnType<typeof connection.getParsedTransaction>> | null = null;
    for (let attempt = 1; attempt <= MAX_TX_RETRIES; attempt++) {
      try {
        parsedTx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
        if (parsedTx && !parsedTx.meta?.err) {
          break;
        }
      } catch (err) {
        console.error("[verify-solana-payment] getParsedTransaction failed", { signature, attempt, err: (err as Error)?.message });
      }

      if (attempt < MAX_TX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_BASE_MS * attempt));
      }
    }

    if (!parsedTx || parsedTx.meta?.err) {
      console.error("[verify-solana-payment] Transaction not found/failed", { signature, parsedMetaErr: parsedTx?.meta?.err });
      return new Response(JSON.stringify({ error: "Transaction not found or failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fromPk = new PublicKey(from);
    const toPk = new PublicKey(to);

    // Busca transferencia system program de from -> to
    const ixns: any[] = parsedTx.transaction.message.instructions as any[];
    let transferredLamports = 0;
    for (const ix of ixns) {
      if (ix?.program === "system" && ix?.parsed?.type === "transfer") {
        const info = ix.parsed.info;
        if (info?.source === fromPk.toBase58() && info?.destination === toPk.toBase58()) {
          transferredLamports += Number(info.lamports || 0);
        }
      }
    }

    if (transferredLamports <= 0) {
      console.error("[verify-solana-payment] No matching transfer", { invoiceId, signature, from, to, transferredLamports });
      return new Response(JSON.stringify({ error: "No matching transfer found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const expectedLamports = typeof lamports === 'number' && lamports > 0
      ? Math.round(lamports)
      : Math.round(amount * LAMPORTS_PER_SOL);
    // tolerancia por redondeo (ampliada ligeramente)
    const tolerance = Math.round(0.00001 * LAMPORTS_PER_SOL);
    if (Math.abs(transferredLamports - expectedLamports) > tolerance) {
      console.error("[verify-solana-payment] Amount mismatch", { invoiceId, signature, transferredLamports, expectedLamports, tolerance });
      return new Response(JSON.stringify({ error: "Amount mismatch", transferredLamports, expectedLamports }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Inserta pago
    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .insert({
        invoice_id: invoiceId,
        provider: "solana",
        provider_txn_id: signature,
        amount: amount,
        currency: "SOL",
        status: "completed",
        payer_email: null,
        raw_payload: parsedTx as any,
      })
      .select()
      .single();
    if (payErr) {
      console.error("[verify-solana-payment] Failed to insert payment", { invoiceId, payErr });
      return new Response(JSON.stringify({ error: payErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Marca la factura como paid
    if (invoice.status !== "paid") {
      const { error: updErr } = await supabaseAdmin
        .from("invoices")
        .update({ status: "paid" })
        .eq("id", invoiceId);
      if (updErr) {
        console.error("[verify-solana-payment] Failed to update invoice status", { invoiceId, updErr });
        return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ success: true, payment, status: "paid" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
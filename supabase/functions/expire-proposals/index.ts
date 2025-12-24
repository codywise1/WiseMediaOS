// Supabase Edge Function to automatically expire proposals
// Deploy with: supabase functions deploy expire-proposals
// Schedule with: supabase functions schedule expire-proposals --cron "0 0 * * *"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all proposals that are sent/viewed and past their expiry date
    const { data: expiredProposals, error: fetchError } = await supabase
      .from("proposals")
      .select("id, title, client_id, expires_at, client:clients(email, company, name)")
      .in("status", ["sent", "viewed"])
      .lt("expires_at", new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!expiredProposals || expiredProposals.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No expired proposals found",
          count: 0 
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const results = [];

    for (const proposal of expiredProposals) {
      // Update proposal status to expired
      const { error: updateError } = await supabase
        .from("proposals")
        .update({ status: "expired" })
        .eq("id", proposal.id);

      if (updateError) {
        console.error(`Failed to expire proposal ${proposal.id}:`, updateError);
        results.push({ id: proposal.id, success: false, error: updateError.message });
        continue;
      }

      // Void the linked invoice
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id")
        .eq("proposal_id", proposal.id)
        .single();

      if (invoice) {
        await supabase
          .from("invoices")
          .update({
            status: "void",
            locked_from_send: true,
          })
          .eq("id", invoice.id);

        // Log invoice event
        await supabase.from("invoice_events").insert([
          {
            invoice_id: invoice.id,
            type: "voided",
            meta: { reason: "proposal_expired" },
          },
        ]);
      }

      // Log proposal event
      await supabase.from("proposal_events").insert([
        {
          proposal_id: proposal.id,
          type: "expired",
        },
      ]);

      results.push({ 
        id: proposal.id, 
        title: proposal.title,
        success: true 
      });

      // Optional: Send notification email
      // await sendExpiryNotification(proposal);
    }

    return new Response(
      JSON.stringify({
        message: "Proposals expired successfully",
        count: results.length,
        results,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error expiring proposals:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

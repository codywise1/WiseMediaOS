import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'Bolt Integration', version: '1.0.0' },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function corsResponse(body: object | null, status = 200) {
  if (status === 204) return new Response(null, { status, headers: corsHeaders });
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return corsResponse({}, 204);
    if (req.method !== 'GET') return corsResponse({ error: 'Method not allowed' }, 405);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return corsResponse({ error: 'Missing authorization header' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !user) return corsResponse({ error: 'Unauthorized' }, 401);

    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');

    // Fetch all invoices, paginated, with customer + status_transitions expanded
    const allInvoices: Stripe.Invoice[] = [];
    let startingAfter: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const listParams: Stripe.InvoiceListParams = {
        limit: 100,
        expand: ['data.customer', 'data.status_transitions'],
      };
      if (statusParam && statusParam !== 'all') {
        listParams.status = statusParam as Stripe.InvoiceListParams['status'];
      }
      if (startingAfter) listParams.starting_after = startingAfter;

      const page = await stripe.invoices.list(listParams);
      allInvoices.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length) startingAfter = page.data[page.data.length - 1].id;
    }

    const shaped = allInvoices.map((inv) => {
      const customer = inv.customer as Stripe.Customer | Stripe.DeletedCustomer | null;
      const custName =
        customer && !customer.deleted
          ? (customer as Stripe.Customer).name ||
            (customer as Stripe.Customer).email ||
            'Unknown Client'
          : 'Unknown Client';
      const custEmail =
        customer && !customer.deleted ? (customer as Stripe.Customer).email || '' : '';

      // Map Stripe statuses to internal vocabulary
      let status: string = inv.status ?? 'draft';
      if (inv.status === 'open') status = 'pending';
      else if (inv.status === 'paid') status = 'paid';
      else if (inv.status === 'uncollectible') status = 'overdue';
      else if (inv.status === 'void') status = 'overdue';
      else if (inv.status === 'draft') status = 'draft';

      // Payment date — use status_transitions.paid_at when available
      const transitions = inv.status_transitions as Stripe.Invoice.StatusTransitions | undefined;
      const paidAt = transitions?.paid_at
        ? new Date(transitions.paid_at * 1000).toISOString()
        : null;

      return {
        id: inv.id,
        number: inv.number,
        amount: (inv.amount_due ?? 0) / 100,
        amount_paid: (inv.amount_paid ?? 0) / 100,
        currency: inv.currency ?? 'usd',
        status,
        stripeStatus: inv.status,
        due_date: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
        created_at: new Date(inv.created * 1000).toISOString(),
        paid_at: paidAt,
        invoice_pdf: inv.invoice_pdf,
        hosted_invoice_url: inv.hosted_invoice_url,
        description: inv.description || '',
        client: custName,
        client_email: custEmail,
        paid: inv.paid,
        attempt_count: inv.attempt_count,
      };
    });

    return corsResponse({ invoices: shaped, total: shaped.length });
  } catch (error: any) {
    console.error(`stripe-invoices error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});

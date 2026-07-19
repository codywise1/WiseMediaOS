import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
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

function corsResponse(body: string | object | null, status = 200) {
  if (status === 204) {
    return new Response(null, { status, headers: corsHeaders });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// DBA filter — only return invoices belonging to Wise Media.
// Matches against invoice metadata.dba, description, customer metadata.dba,
// and customer name/email. Case-insensitive substring match.
const DBA_FILTER = (Deno.env.get('DBA_FILTER') || 'Wise Media').toLowerCase();

function matchesDba(invoice: Stripe.Invoice, customer?: Stripe.Customer | Stripe.DeletedCustomer): boolean {
  // 1. Invoice metadata.dba
  const invDba = (invoice.metadata?.dba || invoice.metadata?.DBA || '').toLowerCase();
  if (invDba && invDba.includes(DBA_FILTER)) return true;
  if (invDba && invDba !== DBA_FILTER) return false;

  // 2. Invoice description
  const desc = (invoice.description || '').toLowerCase();
  if (desc && desc.includes(DBA_FILTER)) return true;

  // 3. Customer metadata / name / email
  if (customer && !customer.deleted) {
    const cust = customer as Stripe.Customer;
    const custDba = (cust.metadata?.dba || cust.metadata?.DBA || '').toLowerCase();
    if (custDba) return custDba.includes(DBA_FILTER);
    const custName = (cust.name || '').toLowerCase();
    const custEmail = (cust.email || '').toLowerCase();
    if (custName.includes(DBA_FILTER) || custEmail.includes(DBA_FILTER)) return true;
  }

  // If no explicit DBA marker found, exclude by default (safer than including everything)
  return false;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'GET') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'Missing authorization header' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !user) {
      return corsResponse({ error: 'Unauthorized' }, 401);
    }

    // Optional status filter from query string
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status'); // open, paid, void, uncollectible
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 100);

    // Pull invoices from Stripe (most recent first)
    const invoices: Stripe.Invoice[] = [];
    let startingAfter: string | undefined;
    let hasMore = true;
    const maxPages = 10; // safety cap

    for (let page = 0; page < maxPages && hasMore; page++) {
      const listParams: Stripe.InvoiceListParams = {
        limit,
        expand: ['data.customer'],
      };
      if (statusParam && statusParam !== 'all') {
        listParams.status = statusParam as Stripe.InvoiceListParams['status'];
      }
      if (startingAfter) {
        listParams.starting_after = startingAfter;
      }

      const pageData = await stripe.invoices.list(listParams);
      invoices.push(...pageData.data);
      hasMore = pageData.has_more;
      if (pageData.data.length) {
        startingAfter = pageData.data[pageData.data.length - 1].id;
      }
    }

    // Filter to Wise Media DBA only
    const filtered = invoices.filter((inv) => {
      const customer = inv.customer as Stripe.Customer | Stripe.DeletedCustomer | undefined;
      return matchesDba(inv, customer);
    });

    // Shape the response for the frontend
    const shaped = filtered.map((inv) => {
      const customer = inv.customer as Stripe.Customer | Stripe.DeletedCustomer | undefined;
      const custName = customer && !customer.deleted ? (customer as Stripe.Customer).name || (customer as Stripe.Customer).email || 'Unknown Client' : 'Unknown Client';

      // Map Stripe status to our internal status vocabulary
      let status = inv.status;
      if (inv.status === 'open') status = 'pending';
      else if (inv.status === 'paid') status = 'paid';
      else if (inv.status === 'uncollectible') status = 'overdue';
      else if (inv.status === 'void') status = 'overdue';

      return {
        id: inv.id,
        number: inv.number,
        amount: inv.amount_due / 100,
        currency: inv.currency,
        status,
        stripeStatus: inv.status,
        due_date: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
        created_at: new Date(inv.created * 1000).toISOString(),
        invoice_pdf: inv.invoice_pdf,
        hosted_invoice_url: inv.hosted_invoice_url,
        description: inv.description || '',
        client: custName,
        client_email: customer && !customer.deleted ? (customer as Stripe.Customer).email || '' : '',
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

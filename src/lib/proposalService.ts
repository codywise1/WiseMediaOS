import { supabase, isSupabaseAvailable } from './supabase';
import { getClauseCodesForServices } from '../config/serviceTemplates';

export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'approved' | 'declined' | 'expired' | 'archived';
export type InvoiceStatus = 'draft' | 'unpaid' | 'paid' | 'void';
export type ServiceType = 'website' | 'landing_page' | 'web_app' | 'brand_identity' | 'seo' | 'graphic_design' | 'video_editing' | 'retainer' | 'other';
export type BillingPlanType = 'full_upfront' | 'split' | 'milestones' | 'monthly_retainer' | 'custom';

export interface Proposal {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  status: ProposalStatus;
  currency: string;
  value: number; // Changed from total_amount_cents to value
  expires_at?: string;
  sent_at?: string;
  approved_at?: string;
  declined_at?: string;
  created_by_user_id?: string;
  created_at: string;
  updated_at: string;
  client?: any;
  invoice?: any;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  service_type: ServiceType;
  name: string;
  description?: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  sort_order: number;
  created_at: string;
}

export interface BillingPlan {
  id: string;
  proposal_id: string;
  plan_type: BillingPlanType;
  currency: string;
  total_cents: number;
  deposit_cents: number;
  payment_terms_days: number;
  start_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProposalEvent {
  id: string;
  proposal_id: string;
  type: string;
  meta?: any;
  created_by_user_id?: string;
  created_at: string;
}

export interface InvoiceEvent {
  id: string;
  invoice_id: string;
  type: string;
  meta?: any;
  created_by_user_id?: string;
  created_at: string;
}

export interface Clause {
  id: string;
  code: string;
  scope: string;
  section: string;
  title: string;
  body: string;
  sort_order: number;
  is_active: boolean;
}

export const proposalService = {
  async getAll() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = supabase!;
    const { data, error } = await sb
      .from('proposals')
      .select(`
        *,
        client:clients(*),
        invoice:invoices(*),
        items:proposal_items(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate value from items if not set correctly in DB
    const processedData = data.map(proposal => {
      const invoiceData = Array.isArray(proposal.invoice) ? proposal.invoice[0] : proposal.invoice;

      let finalValue = proposal.value || proposal.total_amount_cents || 0;
      if (proposal.items && proposal.items.length > 0) {
        const calculatedTotal = proposal.items.reduce(
          (sum: number, item: any) => sum + (item.line_total_cents || 0),
          0
        );
        finalValue = calculatedTotal;
      }

      return {
        ...proposal,
        value: finalValue,
        invoice: invoiceData
      };
    });

    return processedData as Proposal[];
  },

  async getById(id: string) {
    if (!isSupabaseAvailable()) {
      return null;
    }

    const sb = supabase!;
    const { data, error } = await sb
      .from('proposals')
      .select(`
        *,
        client:clients(*),
        invoice:invoices(*),
        items:proposal_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    const invoiceData = Array.isArray(data.invoice) ? data.invoice[0] : data.invoice;
    let finalValue = data.value || data.total_amount_cents || 0;

    if (data.items && data.items.length > 0) {
      finalValue = data.items.reduce(
        (sum: number, item: any) => sum + (item.line_total_cents || 0),
        0
      );
    }

    return {
      ...data,
      value: finalValue,
      invoice: invoiceData
    } as Proposal;
  },

  async getItems(proposalId: string) {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = supabase!;
    const { data, error } = await sb
      .from('proposal_items')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('sort_order');

    if (error) throw error;
    return data as ProposalItem[];
  },

  async create(proposal: Omit<Proposal, 'id' | 'created_at' | 'updated_at' | 'client' | 'invoice'>) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = supabase!;

    // Create proposal
    const { data: proposalData, error: proposalError } = await sb
      .from('proposals')
      .insert([{
        client_id: proposal.client_id,
        title: proposal.title,
        description: proposal.description,
        status: 'draft',
        currency: proposal.currency || 'CAD',
        value: proposal.value || 0,
        expires_at: proposal.expires_at,
        created_by_user_id: proposal.created_by_user_id
      }])
      .select()
      .single();

    if (proposalError) throw proposalError;

    // Create draft invoice linked to proposal
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Default 7 days

    const { data: invoiceData, error: invoiceError } = await sb
      .from('invoices')
      .insert([{
        client_id: proposal.client_id,
        proposal_id: proposalData.id,
        amount: 0, // Changed from total_cents to amount
        description: `Proposal: ${proposal.title}`,
        status: 'pending',
        due_date: dueDate.toISOString(), // Required field
        locked_from_send: true,
        activation_source: null
      }])
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Log proposal created event
    await sb.from('proposal_events').insert([{
      proposal_id: proposalData.id,
      type: 'created',
      created_by_user_id: proposal.created_by_user_id
    }]);

    // Log invoice created and linked event
    await sb.from('invoice_events').insert([{
      invoice_id: invoiceData.id,
      type: 'created'
    }, {
      invoice_id: invoiceData.id,
      type: 'linked_to_proposal',
      meta: { proposal_id: proposalData.id }
    }]);

    return { ...proposalData, invoice: invoiceData } as Proposal;
  },

  async addItems(proposalId: string, items: Omit<ProposalItem, 'id' | 'proposal_id' | 'created_at'>[]) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = supabase!;

    // Insert proposal items
    const { data: itemsData, error: itemsError } = await sb
      .from('proposal_items')
      .insert(items.map(item => ({
        ...item,
        proposal_id: proposalId
      })))
      .select();

    if (itemsError) throw itemsError;

    // Calculate aggregate total from ALL items for this proposal
    const { data: allItems, error: itemsFetchError } = await sb
      .from('proposal_items')
      .select('line_total_cents')
      .eq('proposal_id', proposalId);

    if (itemsFetchError) throw itemsFetchError;

    const totalCents = (allItems || []).reduce((sum, item) => sum + (item.line_total_cents || 0), 0);

    // Update proposal totals
    await sb
      .from('proposals')
      .update({
        value: totalCents
      })
      .eq('id', proposalId);

    // Update the linked invoice amount directly by proposal_id
    const { error: invoiceUpdateError } = await sb
      .from('invoices')
      .update({
        amount: totalCents / 100 // Convert cents to dollars
      })
      .eq('proposal_id', proposalId);

    if (invoiceUpdateError) {
      console.error('Error updating invoice amount:', invoiceUpdateError);
    }

    // Mirror NEW items to invoice_items if invoice exists
    const { data: invoice } = await sb
      .from('invoices')
      .select('id')
      .eq('proposal_id', proposalId)
      .single();

    if (invoice?.id) {
      const { error: mirrorError } = await sb.from('invoice_items').insert(
        itemsData.map((item: ProposalItem, index: number) => ({
          invoice_id: invoice.id,
          proposal_item_id: item.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          line_total_cents: item.line_total_cents,
          sort_order: (allItems?.length || 0) - itemsData.length + index
        }))
      );

      if (mirrorError) {
        console.error('Error mirroring items:', mirrorError);
      }
    }

    return itemsData as ProposalItem[];
  },

  async send(proposalId: string, userId?: string) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = supabase!;

    // Recalculate total value to ensure sync
    const { data: allItems } = await sb
      .from('proposal_items')
      .select('line_total_cents')
      .eq('proposal_id', proposalId);

    const totalCents = (allItems || []).reduce((sum, item) => sum + (item.line_total_cents || 0), 0);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Update proposal status AND value
    const { data: proposalData, error: proposalError } = await sb
      .from('proposals')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        value: totalCents
      })
      .eq('id', proposalId)
      .select()
      .single();

    if (proposalError) throw proposalError;

    // Sync invoice amount explicitly
    await sb
      .from('invoices')
      .update({ amount: totalCents / 100 })
      .eq('proposal_id', proposalId);

    // Rest of send logic (clauses, events)
    // Get proposal items to determine services
    const { data: items } = await sb
      .from('proposal_items')
      .select('service_type')
      .eq('proposal_id', proposalId);

    const serviceTypes = items?.map((i: any) => i.service_type) || [];
    const clauseCodes = getClauseCodesForServices(serviceTypes);

    // Get clause data
    const { data: clauses } = await sb
      .from('clauses')
      .select('*')
      .in('code', clauseCodes)
      .eq('is_active', true)
      .order('sort_order');

    // Create clause snapshot
    const snapshotHash = JSON.stringify(clauses?.map((c: Clause) => c.code).sort());
    const { data: snapshot, error: snapshotError } = await sb
      .from('proposal_clause_snapshots')
      .insert([{
        proposal_id: proposalId,
        version: 1,
        status: 'locked',
        snapshot_hash: snapshotHash
      }])
      .select()
      .single();

    if (snapshotError) throw snapshotError;

    // Insert snapshot items
    if (clauses && clauses.length > 0) {
      await sb.from('proposal_clause_snapshot_items').insert(
        clauses.map((clause: Clause) => ({
          snapshot_id: snapshot.id,
          clause_code: clause.code,
          section: clause.section,
          title: clause.title,
          body: clause.body,
          sort_order: clause.sort_order
        }))
      );
    }

    // Log event
    await sb.from('proposal_events').insert([{
      proposal_id: proposalId,
      type: 'sent',
      created_by_user_id: userId
    }]);

    return proposalData as Proposal;
  },

  async approve(proposalId: string, userId?: string) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = supabase!;

    // Recalculate total value to ensure sync
    const { data: allItems } = await sb
      .from('proposal_items')
      .select('line_total_cents')
      .eq('proposal_id', proposalId);

    const totalCents = (allItems || []).reduce((sum, item) => sum + (item.line_total_cents || 0), 0);

    // Update proposal status AND value
    const { data: proposalData, error: proposalError } = await sb
      .from('proposals')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        value: totalCents
      })
      .eq('id', proposalId)
      .select()
      .single();

    if (proposalError) throw proposalError;

    // Get and update linked invoice
    const { data: invoice } = await sb
      .from('invoices')
      .select('*')
      .eq('proposal_id', proposalId)
      .single();

    if (invoice) {
      // Activate invoice - update status to unpaid AND sync amount
      await sb
        .from('invoices')
        .update({
          status: 'unpaid',
          amount: totalCents / 100
        })
        .eq('id', invoice.id);

      // Log invoice activation
      await sb.from('invoice_events').insert([{
        invoice_id: invoice.id,
        type: 'activated',
        meta: { proposal_id: proposalId }
      }]);
    }

    // Log proposal approval
    await sb.from('proposal_events').insert([{
      proposal_id: proposalId,
      type: 'approved',
      created_by_user_id: userId
    }]);

    return proposalData as Proposal;
  },

  async decline(proposalId: string, userId?: string) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = supabase!;

    // Update proposal
    await sb
      .from('proposals')
      .update({
        status: 'declined',
        declined_at: new Date().toISOString()
      })
      .eq('id', proposalId);

    // Void linked invoice
    const { data: invoice } = await sb
      .from('invoices')
      .select('id')
      .eq('proposal_id', proposalId)
      .single();

    if (invoice) {
      await sb
        .from('invoices')
        .update({
          status: 'void',
          locked_from_send: true
        })
        .eq('id', invoice.id);

      await sb.from('invoice_events').insert([{
        invoice_id: invoice.id,
        type: 'voided',
        meta: { reason: 'proposal_declined' }
      }]);
    }

    // Log event
    await sb.from('proposal_events').insert([{
      proposal_id: proposalId,
      type: 'declined',
      created_by_user_id: userId
    }]);
  },

  async expire(proposalId: string) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = supabase!;

    // Update proposal
    await sb
      .from('proposals')
      .update({ status: 'expired' })
      .eq('id', proposalId);

    // Void linked invoice
    const { data: invoice } = await sb
      .from('invoices')
      .select('id')
      .eq('proposal_id', proposalId)
      .single();

    if (invoice) {
      await sb
        .from('invoices')
        .update({
          status: 'void',
          locked_from_send: true
        })
        .eq('id', invoice.id);

      await sb.from('invoice_events').insert([{
        invoice_id: invoice.id,
        type: 'voided',
        meta: { reason: 'proposal_expired' }
      }]);
    }

    // Log event
    await sb.from('proposal_events').insert([{
      proposal_id: proposalId,
      type: 'expired'
    }]);
  },

  async delete(proposalId: string) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = supabase!;
    const { error } = await sb
      .from('proposals')
      .delete()
      .eq('id', proposalId);

    if (error) throw error;
  }
};

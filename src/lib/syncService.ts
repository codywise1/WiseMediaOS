import { supabase, isSupabaseAvailable } from './supabase';

/**
 * Sync service: keeps proposals, invoices, and projects in sync.
 *
 * - When a proposal is approved → ensure a linked invoice exists (handled in proposalService)
 *   AND create/activate a linked project.
 * - When an invoice is paid → mark the linked project as in_progress (work can start).
 * - When an invoice is voided → mark the linked project as on_hold.
 *
 * The link chain is: proposal → invoice (invoices.proposal_id) → project (projects.invoice_link = invoice.id)
 */

export const syncService = {
  /**
   * Called after a proposal is approved. Ensures a project exists and is linked
   * to the proposal's invoice. Creates the project if it doesn't exist yet.
   */
  async syncOnProposalApproved(proposalId: string, clientId: string, proposalTitle: string) {
    if (!isSupabaseAvailable()) return;
    const sb = supabase!;

    // Find the linked invoice
    const { data: invoice } = await sb
      .from('invoices')
      .select('id')
      .eq('proposal_id', proposalId)
      .maybeSingle();

    if (!invoice) return; // nothing to link yet

    // Check if a project already exists linked to this invoice
    const { data: existing } = await sb
      .from('projects')
      .select('id')
      .eq('invoice_link', invoice.id)
      .maybeSingle();

    if (existing) {
      // Project already exists — make sure it's not in "not_started" if we have approval
      await sb
        .from('projects')
        .update({ status: 'planning' })
        .eq('id', existing.id);
      return;
    }

    // Create a new project linked to the approved proposal's invoice
    const { error } = await sb.from('projects').insert([{
      client_id: clientId,
      name: proposalTitle,
      description: `Auto-created from approved proposal: ${proposalTitle}`,
      status: 'planning',
      progress: 0,
      team_size: 1,
      project_type: 'Website',
      priority: 'Medium',
      billing_type: 'Fixed',
      invoice_link: invoice.id,
    }]);

    if (error) {
      console.error('[syncService] Error creating project from proposal:', error);
    }
  },

  /**
   * Called when an invoice transitions to paid. Marks the linked project as in_progress.
   */
  async syncOnInvoicePaid(invoiceId: string) {
    if (!isSupabaseAvailable()) return;
    const sb = supabase!;

    const { data: project } = await sb
      .from('projects')
      .select('id, status')
      .eq('invoice_link', invoiceId)
      .maybeSingle();

    if (!project) return;

    // Only move to in_progress if it's in a pre-work state
    if (project.status === 'planning' || project.status === 'not_started' || project.status === 'on_hold') {
      await sb
        .from('projects')
        .update({ status: 'in_progress' })
        .eq('id', project.id);
    }
  },

  /**
   * Called when an invoice is voided. Puts the linked project on hold.
   */
  async syncOnInvoiceVoided(invoiceId: string) {
    if (!isSupabaseAvailable()) return;
    const sb = supabase!;

    const { data: project } = await sb
      .from('projects')
      .select('id')
      .eq('invoice_link', invoiceId)
      .maybeSingle();

    if (!project) return;

    await sb
      .from('projects')
      .update({ status: 'on_hold' })
      .eq('id', project.id);
  },
};

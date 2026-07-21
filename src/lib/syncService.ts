import { supabase, isSupabaseAvailable } from './supabase';

/**
 * Sync service: keeps proposals, invoices, and projects in sync.
 *
 * The link chain uses many-to-many join tables:
 *   proposal <-> invoice  (proposal_invoices)
 *   proposal <-> project  (proposal_projects)
 *   invoice   <-> project (invoice_projects)
 *
 * Flow when a proposal is approved:
 *   1. Ensure a linked invoice exists (legacy invoices.proposal_id kept in sync).
 *   2. Link the proposal to that invoice in proposal_invoices.
 *   3. Create/activate a linked project and link it in proposal_projects + invoice_projects.
 *
 * Flow when an invoice is paid:
 *   - Mark all linked projects (via invoice_projects) as in_progress.
 *
 * Flow when an invoice is voided:
 *   - Put all linked projects on hold.
 */

export const syncService = {
  /**
   * Called after a proposal is approved. Ensures an invoice exists and is linked,
   * then ensures a project exists and is linked to both the proposal and the invoice.
   */
  async syncOnProposalApproved(proposalId: string, clientId: string, proposalTitle: string) {
    if (!isSupabaseAvailable()) return;
    const sb = supabase!;

    // Find a linked invoice (via join table first, then legacy FK)
    const { data: joinInvoices } = await sb
      .from('proposal_invoices')
      .select('invoice_id')
      .eq('proposal_id', proposalId);

    let invoiceId: string | undefined = joinInvoices?.[0]?.invoice_id;

    if (!invoiceId) {
      // Fall back to legacy invoices.proposal_id
      const { data: legacyInvoice } = await sb
        .from('invoices')
        .select('id')
        .eq('proposal_id', proposalId)
        .maybeSingle();
      invoiceId = legacyInvoice?.id;

      if (invoiceId) {
        // Backfill the join table
        await sb.from('proposal_invoices').upsert(
          { proposal_id: proposalId, invoice_id: invoiceId },
          { onConflict: 'proposal_id,invoice_id' }
        );
      }
    }

    if (!invoiceId) return; // nothing to link yet

    // Check if a project already exists linked to this proposal
    const { data: existingLinks } = await sb
      .from('proposal_projects')
      .select('project_id, project:projects(id, status)')
      .eq('proposal_id', proposalId);

    let projectId: string | undefined = existingLinks?.[0]?.project_id;

    if (projectId) {
      // Project exists — make sure it's not stuck in "not_started"
      const projectStatus = (existingLinks?.[0] as any)?.project?.status;
      if (projectStatus === 'not_started') {
        await sb.from('projects').update({ status: 'planning' }).eq('id', projectId);
      }
    } else {
      // Create a new project linked to the approved proposal
      const { data: newProject, error } = await sb.from('projects').insert([{
        client_id: clientId,
        name: proposalTitle,
        description: `Auto-created from approved proposal: ${proposalTitle}`,
        status: 'planning',
        progress: 0,
        team_size: 1,
        project_type: 'Website',
        priority: 'Medium',
        billing_type: 'Fixed',
      }]).select('id').single();

      if (error) {
        console.error('[syncService] Error creating project from proposal:', error);
        return;
      }
      projectId = newProject.id;

      // Link proposal <-> project
      await sb.from('proposal_projects').upsert(
        { proposal_id: proposalId, project_id: projectId },
        { onConflict: 'proposal_id,project_id' }
      );
    }

    // Ensure invoice <-> project link exists
    await sb.from('invoice_projects').upsert(
      { invoice_id: invoiceId, project_id: projectId },
      { onConflict: 'invoice_id,project_id' }
    );
  },

  /**
   * Called when an invoice transitions to paid. Marks all linked projects as in_progress.
   */
  async syncOnInvoicePaid(invoiceId: string) {
    if (!isSupabaseAvailable()) return;
    const sb = supabase!;

    const { data: links } = await sb
      .from('invoice_projects')
      .select('project_id, project:projects(id, status)')
      .eq('invoice_id', invoiceId);

    if (!links || links.length === 0) return;

    for (const link of links) {
      const project = (link as any).project;
      if (project && ['planning', 'not_started', 'on_hold'].includes(project.status)) {
        await sb.from('projects').update({ status: 'in_progress' }).eq('id', project.id);
      }
    }
  },

  /**
   * Called when an invoice is voided. Puts all linked projects on hold.
   */
  async syncOnInvoiceVoided(invoiceId: string) {
    if (!isSupabaseAvailable()) return;
    const sb = supabase!;

    const { data: links } = await sb
      .from('invoice_projects')
      .select('project_id')
      .eq('invoice_id', invoiceId);

    if (!links || links.length === 0) return;

    for (const link of links) {
      await sb.from('projects').update({ status: 'on_hold' }).eq('id', link.project_id);
    }
  },
};

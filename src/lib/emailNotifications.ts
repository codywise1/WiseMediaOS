import { Proposal } from './proposalService';

interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  type: 'proposal_sent' | 'proposal_approved' | 'proposal_declined' | 'proposal_expiring' | 'invoice_activated';
}

/**
 * Email notification service for proposal events
 * This is a placeholder implementation - integrate with your email service (SendGrid, Resend, etc.)
 */
export const emailNotificationService = {
  /**
   * Send email when proposal is sent to client
   */
  async sendProposalSentNotification(proposal: Proposal, clientEmail: string) {
    const notification: EmailNotification = {
      to: clientEmail,
      subject: `New Proposal: ${proposal.title}`,
      body: `
        <h2>You have received a new proposal</h2>
        <p>Dear ${proposal.client?.company || proposal.client?.name},</p>
        
        <p>We're pleased to share a new proposal with you:</p>
        
        <h3>${proposal.title}</h3>
        <p><strong>Total Value:</strong> $${(proposal.value / 100).toFixed(2)} ${proposal.currency}</p>
        <p><strong>Valid Until:</strong> ${proposal.expires_at ? new Date(proposal.expires_at).toLocaleDateString() : 'N/A'}</p>
        
        <p>Please review the proposal at your earliest convenience.</p>
        
        <p><a href="${window.location.origin}/proposals/${proposal.id}" style="background-color: #3aa3eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Proposal</a></p>
        
        <p>If you have any questions, please don't hesitate to reach out.</p>
        
        <p>Best regards,<br>Your Team</p>
      `,
      type: 'proposal_sent'
    };

    return this.sendEmail(notification);
  },

  /**
   * Send email when proposal is approved
   */
  async sendProposalApprovedNotification(proposal: Proposal, adminEmail: string) {
    const notification: EmailNotification = {
      to: adminEmail,
      subject: `Proposal Approved: ${proposal.title}`,
      body: `
        <h2>Proposal Approved!</h2>
        <p>Great news! The following proposal has been approved:</p>
        
        <h3>${proposal.title}</h3>
        <p><strong>Client:</strong> ${proposal.client?.company || proposal.client?.name}</p>
        <p><strong>Total Value:</strong> $${(proposal.value / 100).toFixed(2)} ${proposal.currency}</p>
        <p><strong>Approved:</strong> ${proposal.approved_at ? new Date(proposal.approved_at).toLocaleDateString() : 'Just now'}</p>
        
        <p>The linked invoice has been automatically activated and is ready to be sent to the client.</p>
        
        <p><a href="${window.location.origin}/proposals/${proposal.id}" style="background-color: #3aa3eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Proposal</a></p>
      `,
      type: 'proposal_approved'
    };

    return this.sendEmail(notification);
  },

  /**
   * Send email when proposal is declined
   */
  async sendProposalDeclinedNotification(proposal: Proposal, adminEmail: string) {
    const notification: EmailNotification = {
      to: adminEmail,
      subject: `Proposal Declined: ${proposal.title}`,
      body: `
        <h2>Proposal Declined</h2>
        <p>The following proposal has been declined:</p>
        
        <h3>${proposal.title}</h3>
        <p><strong>Client:</strong> ${proposal.client?.company || proposal.client?.name}</p>
        <p><strong>Total Value:</strong> $${(proposal.value / 100).toFixed(2)} ${proposal.currency}</p>
        
        <p>The linked invoice has been voided.</p>
        
        <p><a href="${window.location.origin}/proposals/${proposal.id}" style="background-color: #3aa3eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Proposal</a></p>
      `,
      type: 'proposal_declined'
    };

    return this.sendEmail(notification);
  },

  /**
   * Send reminder email when proposal is about to expire
   */
  async sendProposalExpiringNotification(proposal: Proposal, clientEmail: string) {
    const daysUntilExpiry = proposal.expires_at 
      ? Math.ceil((new Date(proposal.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    const notification: EmailNotification = {
      to: clientEmail,
      subject: `Reminder: Proposal Expiring Soon - ${proposal.title}`,
      body: `
        <h2>Proposal Expiring Soon</h2>
        <p>Dear ${proposal.client?.company || proposal.client?.name},</p>
        
        <p>This is a friendly reminder that your proposal is expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}:</p>
        
        <h3>${proposal.title}</h3>
        <p><strong>Total Value:</strong> $${(proposal.value / 100).toFixed(2)} ${proposal.currency}</p>
        <p><strong>Expires:</strong> ${proposal.expires_at ? new Date(proposal.expires_at).toLocaleDateString() : 'N/A'}</p>
        
        <p>Please review and approve the proposal before it expires.</p>
        
        <p><a href="${window.location.origin}/proposals/${proposal.id}" style="background-color: #3aa3eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Proposal</a></p>
        
        <p>If you have any questions or need more time, please let us know.</p>
        
        <p>Best regards,<br>Your Team</p>
      `,
      type: 'proposal_expiring'
    };

    return this.sendEmail(notification);
  },

  /**
   * Send email when invoice is activated from proposal approval
   */
  async sendInvoiceActivatedNotification(proposal: Proposal, clientEmail: string, invoiceId: string) {
    const notification: EmailNotification = {
      to: clientEmail,
      subject: `Invoice Ready: ${proposal.title}`,
      body: `
        <h2>Invoice Activated</h2>
        <p>Dear ${proposal.client?.company || proposal.client?.name},</p>
        
        <p>Thank you for approving our proposal! Your invoice is now ready:</p>
        
        <h3>${proposal.title}</h3>
        <p><strong>Invoice Amount:</strong> $${(proposal.value / 100).toFixed(2)} ${proposal.currency}</p>
        
        <p>You can view and pay your invoice using the link below:</p>
        
        <p><a href="${window.location.origin}/invoices/${invoiceId}" style="background-color: #3aa3eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Invoice</a></p>
        
        <p>We look forward to working with you!</p>
        
        <p>Best regards,<br>Your Team</p>
      `,
      type: 'invoice_activated'
    };

    return this.sendEmail(notification);
  },

  /**
   * Core email sending function
   * Replace this with your actual email service integration
   */
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    // TODO: Integrate with your email service (SendGrid, Resend, AWS SES, etc.)
    console.log('📧 Email Notification:', {
      to: notification.to,
      subject: notification.subject,
      type: notification.type
    });

    // For development, just log the email
    if (process.env.NODE_ENV === 'development') {
      console.log('Email body:', notification.body);
      return true;
    }

    // Example integration with a hypothetical email service:
    /*
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
    */

    return true;
  }
};

/**
 * Supabase Edge Function for automated email notifications
 * Create this as: supabase/functions/proposal-notifications/index.ts
 */
export const proposalNotificationsEdgeFunction = `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { type, proposalId } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Get proposal data
  const { data: proposal } = await supabase
    .from('proposals')
    .select('*, client:clients(*)')
    .eq('id', proposalId)
    .single()

  if (!proposal) {
    return new Response(JSON.stringify({ error: 'Proposal not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Send appropriate notification based on type
  // Integrate with your email service here

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
`;

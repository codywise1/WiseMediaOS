import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { termsAndConditionsTemplate } from '../config/termsTemplate';

/**
 * Generates a professional PDF for a proposal and triggers a direct download.
 */
export const generateProposalPDF = async (proposal: any) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  document.body.appendChild(container);

  const createdDate = proposal.createdDate || proposal.created_at || new Date().toISOString();
  const expiryDate = proposal.expiryDate || proposal.due_date || new Date().toISOString();
  const filename = `PROP-${proposal.id.slice(0, 8).toUpperCase()}-${(proposal.client || 'Client').replace(/[^a-z0-9]/gi, '_')}.pdf`;

  container.innerHTML = `
    <div style="background: #020617; color: #f8fafc; padding: 60px; font-family: 'Montserrat', sans-serif; width: 800px; border-radius: 0;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px;">
        <div>
          <div style="font-family: 'Integral CF', sans-serif; font-size: 32px; font-weight: 700; color: #ffffff;">WISE MEDIA</div>
          <div style="font-size: 12px; font-weight: 700; color: #3aa3eb; text-transform: uppercase; letter-spacing: 2px;">Operating System</div>
        </div>
        <div style="font-family: 'Integral CF', sans-serif; font-size: 14px; font-weight: 700; color: #3aa3eb; background: rgba(58, 163, 235, 0.1); padding: 10px 20px; border-radius: 14px; border: 1px solid rgba(58, 163, 235, 0.2);">
          PROP-${proposal.id.slice(0, 8).toUpperCase()}
        </div>
      </div>
      <h1 style="font-family: 'Integral CF', sans-serif; font-size: 42px; font-weight: 700; color: #ffffff; margin-bottom: 40px; letter-spacing: -1px; text-transform: uppercase;">
        ${proposal.title}
      </h1>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px;">
        <div style="background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Project Value</div>
          <div style="font-family: 'Integral CF', sans-serif; font-size: 32px; color: #3aa3eb;">$${proposal.value.toLocaleString()}</div>
        </div>
        <div style="background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Client</div>
          <div style="font-size: 18px; font-weight: 600; color: #ffffff;">${proposal.client}</div>
        </div>
        <div style="background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Created Date</div>
          <div style="font-size: 14px; font-weight: 600; color: #ffffff;">${new Date(createdDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div style="background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Expiry Date</div>
          <div style="font-size: 14px; font-weight: 600; color: #ffffff;">${new Date(expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
      <div style="margin-bottom: 40px;">
        <div style="font-size: 12px; font-weight: 700; color: #3aa3eb; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">Description</div>
        <div style="background: rgba(255, 255, 255, 0.03); border-radius: 24px; padding: 32px; border: 1px solid rgba(255, 255, 255, 0.05); color: #cbd5e1; line-height: 1.6;">
          ${proposal.description}
        </div>
      </div>
      <div style="margin-bottom: 40px;">
        <div style="font-size: 12px; font-weight: 700; color: #3aa3eb; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">Included Services</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 40px;">
          ${proposal.services ? proposal.services.map((s: string) => `
            <span style="background: rgba(58, 163, 235, 0.1); border: 1px solid rgba(58, 163, 235, 0.2); color: #3aa3eb; padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${s}</span>
          `).join('') : ''}
        </div>
      </div>

      <div style="page-break-before: always; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 40px; margin-bottom: 40px;">
        <div style="font-size: 12px; font-weight: 700; color: #3aa3eb; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px;">Terms & Conditions</div>
        <div style="background: rgba(255, 255, 255, 0.02); border-radius: 24px; padding: 32px; border: 1px solid rgba(255, 255, 255, 0.05); color: #94a3b8; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">
          ${termsAndConditionsTemplate}
        </div>
      </div>

      <div style="margin-top: 60px; text-align: center; padding-top: 40px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: #64748b; font-size: 12px;">
        Wise Media Operating System · info@wisemedia.io
      </div>
    </div>
  `;

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#020617',
      logging: false,
      useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);

    // Multi-page logic
    const margin = 10; // 10mm margins
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const innerWidth = pdfWidth - (margin * 2);
    const innerHeight = pdfHeight - (margin * 2);

    // Calculate scale to fit width
    const ratio = innerWidth / imgProps.width;
    const renderedHeight = imgProps.height * ratio;

    let heightLeft = renderedHeight;
    let position = margin;

    // Background color #020617 for masking
    const bgColor = { r: 2, g: 6, b: 23 };

    const drawMasks = () => {
      pdf.setFillColor(bgColor.r, bgColor.g, bgColor.b);
      // Top mask
      pdf.rect(0, 0, pdfWidth, margin, 'F');
      // Bottom mask
      pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');
      // Left mask
      pdf.rect(0, 0, margin, pdfHeight, 'F');
      // Right mask
      pdf.rect(pdfWidth - margin, 0, margin, pdfHeight, 'F');
    };

    // Add first page
    pdf.addImage(imgData, 'PNG', margin, position, innerWidth, renderedHeight);
    drawMasks();
    heightLeft -= innerHeight;

    // Add subsequent pages if content exceeds innerHeight
    while (heightLeft > 0) {
      position -= innerHeight;
      pdf.addPage();
      // Set background color for new page
      pdf.setFillColor(bgColor.r, bgColor.g, bgColor.b);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

      pdf.addImage(imgData, 'PNG', margin, position, innerWidth, renderedHeight);
      drawMasks();
      heightLeft -= innerHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating Proposal PDF:', error);
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generates a professional, print-grade PDF for an invoice and triggers a direct download.
 * Clean light-background document with refined typography, line-item table, and footer.
 */
export const generateInvoicePDF = async (invoice: any) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  document.body.appendChild(container);

  const createdDate = invoice.createdDate || invoice.created_at || new Date().toISOString();
  const dueDate = invoice.dueDate || invoice.due_date || new Date().toISOString();
  const clientIdentifier = (invoice.client || 'Client').replace(/[^a-z0-9]/gi, '_');
  const filename = `INV-${invoice.id.slice(0, 8).toUpperCase()}-${clientIdentifier}.pdf`;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const statusLabel = (invoice.status || 'pending').charAt(0).toUpperCase() + (invoice.status || 'pending').slice(1);
  const statusColor =
    invoice.status === 'paid' ? '#059669' :
    invoice.status === 'overdue' ? '#dc2626' :
    invoice.status === 'draft' ? '#6b7280' : '#d97706';

  const amount = (invoice.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const taxRate = invoice.tax_rate ?? 0;
  const taxAmount = taxRate ? (invoice.amount * taxRate) / 100 : 0;
  const total = (invoice.amount || 0) + taxAmount;

  container.innerHTML = `
    <div style="background: #ffffff; color: #0f172a; padding: 72px 64px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Helvetica Neue', sans-serif; width: 800px; box-sizing: border-box;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 32px; border-bottom: 1px solid #e2e8f0;">
        <div>
          <div style="font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">Wise Media</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">Operating System</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 12px; line-height: 1.5;">
            info@wisemedia.io<br/>
            wisemedia.io
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: -1px; line-height: 1;">Invoice</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 8px; font-variant-numeric: tabular-nums; letter-spacing: 0.3px;">
            No. INV-${invoice.id.slice(0, 8).toUpperCase()}
          </div>
          <div style="display: inline-block; margin-top: 12px; padding: 5px 12px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: ${statusColor}; background: ${statusColor}14; border: 1px solid ${statusColor}33;">
            ${statusLabel}
          </div>
        </div>
      </div>

      <!-- Bill To + Dates -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; padding: 36px 0;">
        <div>
          <div style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 8px;">Bill To</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${invoice.client || 'Client'}</div>
        </div>
        <div>
          <div style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 8px;">Issue Date</div>
          <div style="font-size: 14px; font-weight: 600; color: #334155;">${fmt(createdDate)}</div>
        </div>
        <div>
          <div style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 8px;">Due Date</div>
          <div style="font-size: 14px; font-weight: 600; color: #334155;">${fmt(dueDate)}</div>
        </div>
      </div>

      <!-- Line items table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
        <thead>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <th style="text-align: left; padding: 12px 0; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Description</th>
            <th style="text-align: right; padding: 12px 0; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; width: 140px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 20px 0; font-size: 14px; color: #334155; line-height: 1.5;">
              ${invoice.description || 'Professional services'}
            </td>
            <td style="padding: 20px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums;">
              ${amount}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 48px;">
        <div style="width: 280px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 13px; color: #64748b;">
            <span>Subtotal</span>
            <span style="font-variant-numeric: tabular-nums; color: #334155; font-weight: 600;">${amount}</span>
          </div>
          ${taxRate ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9;">
            <span>Tax (${taxRate}%)</span>
            <span style="font-variant-numeric: tabular-nums; color: #334155; font-weight: 600;">${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: baseline; padding: 18px 0 8px; border-top: 2px solid #0f172a; margin-top: 8px;">
            <span style="font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 1px;">Total Due</span>
            <span style="font-size: 24px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; letter-spacing: -0.5px;">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <!-- Payment note -->
      <div style="background: #f8fafc; border-radius: 16px; padding: 20px 24px; margin-bottom: 48px; border: 1px solid #e2e8f0;">
        <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Payment</div>
        <div style="font-size: 13px; color: #475569; line-height: 1.6;">
          Please remit payment by the due date. For questions about this invoice, contact info@wisemedia.io.
        </div>
      </div>

      <!-- Footer -->
      <div style="padding-top: 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 10px; color: #94a3b8; letter-spacing: 0.3px;">
          Wise Media · Operating System
        </div>
        <div style="font-size: 10px; color: #94a3b8; letter-spacing: 0.3px;">
          Thank you for your business
        </div>
      </div>
    </div>
  `;

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const innerWidth = pdfWidth - margin * 2;
    const ratio = innerWidth / imgProps.width;
    const renderedHeight = imgProps.height * ratio;

    let heightLeft = renderedHeight;
    let position = margin;

    const drawMasks = () => {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdfWidth, margin, 'F');
      pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');
      pdf.rect(0, 0, margin, pdfHeight, 'F');
      pdf.rect(pdfWidth - margin, 0, margin, pdfHeight, 'F');
    };

    pdf.addImage(imgData, 'PNG', margin, position, innerWidth, renderedHeight);
    drawMasks();
    heightLeft -= (pdfHeight - margin * 2);

    while (heightLeft > 0) {
      position -= (pdfHeight - margin * 2);
      pdf.addPage();
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      pdf.addImage(imgData, 'PNG', margin, position, innerWidth, renderedHeight);
      drawMasks();
      heightLeft -= (pdfHeight - margin * 2);
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating Invoice PDF:', error);
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
};
/**
 * Generates a professional PDF for a note and triggers a direct download.
 */
export const generateNotePDF = async (note: any) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  document.body.appendChild(container);

  const createdDate = note.created_at || new Date().toISOString();
  const filename = `NOTE-${note.id.slice(0, 8).toUpperCase()}-${(note.title || 'Untitled').replace(/[^a-z0-9]/gi, '_')}.pdf`;

  // Helper to format block content for PDF
  const renderBlocks = (blocks: any[]) => {
    if (!blocks || !Array.isArray(blocks)) return '';
    return blocks.map(block => {
      switch (block.type) {
        case 'heading':
          const level = block.level || 2;
          const fontSize = level === 1 ? '24px' : level === 2 ? '20px' : '16px';
          return `<h${level} style="font-family: 'Integral CF', sans-serif; font-size: ${fontSize}; font-weight: 700; color: #ffffff; margin-top: 24px; margin-bottom: 12px;">${block.content || ''}</h${level}>`;
        case 'paragraph':
          return `<p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 16px; white-space: pre-wrap;">${block.content || ''}</p>`;
        case 'bullets':
          return `
            <ul style="margin-bottom: 16px; list-style-type: none; padding-left: 0;">
              ${(block.items || []).map((item: string) => `
                <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                  <span style="color: #3aa3eb; font-weight: bold;">•</span>
                  <span style="font-size: 14px; color: #cbd5e1;">${item}</span>
                </li>
              `).join('')}
            </ul>
          `;
        case 'numbered':
          return `
            <ol style="margin-bottom: 16px; list-style-type: none; padding-left: 0;">
              ${(block.items || []).map((item: string, i: number) => `
                <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                  <span style="color: #3aa3eb; font-weight: bold; font-family: monospace;">${i + 1}.</span>
                  <span style="font-size: 14px; color: #cbd5e1;">${item}</span>
                </li>
              `).join('')}
            </ol>
          `;
        case 'todo':
          return `
            <div style="margin-bottom: 16px;">
              ${(block.todos || []).map((todo: any) => `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <div style="width: 14px; height: 14px; border: 1px solid ${todo.done ? '#3aa3eb' : 'rgba(255,255,255,0.2)'}; background: ${todo.done ? '#3aa3eb' : 'transparent'}; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                    ${todo.done ? '<span style="color: white; font-size: 10px;">✓</span>' : ''}
                  </div>
                  <span style="font-size: 14px; color: ${todo.done ? '#64748b' : '#cbd5e1'}; ${todo.done ? 'text-decoration: line-through;' : ''}">${todo.text}</span>
                </div>
              `).join('')}
            </div>
          `;
        case 'divider':
          return `<hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 32px 0;" />`;
        case 'quote':
          return `
            <div style="border-left: 3px solid #3aa3eb; padding-left: 20px; font-style: italic; color: #cbd5e1; font-size: 16px; margin-bottom: 24px; background: rgba(58, 163, 235, 0.05); padding: 16px 20px;">
              ${block.content || ''}
            </div>
          `;
        case 'callout':
          return `
            <div style="background: rgba(58, 163, 235, 0.1); border: 1px solid rgba(58, 163, 235, 0.2); border-radius: 12px; padding: 16px; color: #3aa3eb; font-size: 14px; font-weight: 500; margin-bottom: 16px;">
              ${block.content || ''}
            </div>
          `;
        default:
          return '';
      }
    }).join('');
  };

  container.innerHTML = `
    <div style="background: #020617; color: #f8fafc; padding: 60px; font-family: 'Montserrat', sans-serif; width: 800px; border-radius: 0;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px;">
        <div>
          <div style="font-family: 'Integral CF', sans-serif; font-size: 32px; font-weight: 700; color: #ffffff;">WISE MEDIA</div>
          <div style="font-size: 12px; font-weight: 700; color: #3aa3eb; text-transform: uppercase; letter-spacing: 2px;">Operating System</div>
        </div>
        <div style="font-family: 'Integral CF', sans-serif; font-size: 14px; font-weight: 700; color: #3aa3eb; background: rgba(58, 163, 235, 0.1); padding: 10px 20px; border-radius: 14px; border: 1px solid rgba(58, 163, 235, 0.2);">
          NOTE-${note.id.slice(0, 8).toUpperCase()}
        </div>
      </div>
      
      <h1 style="font-family: 'Integral CF', sans-serif; font-size: 42px; font-weight: 700; color: #ffffff; margin-bottom: 10px; letter-spacing: -1px; text-transform: uppercase;">
        ${note.title || 'Untitled'}
      </h1>
      
      <div style="display: flex; gap: 12px; margin-bottom: 40px;">
        <span style="background: rgba(58, 163, 235, 0.1); border: 1px solid rgba(58, 163, 235, 0.2); color: #3aa3eb; padding: 4px 12px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${note.category || 'General'}</span>
        <span style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #64748b; padding: 4px 12px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${new Date(createdDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 60px;">
        <div style="background: rgba(255, 255, 255, 0.02); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Author</div>
          <div style="font-size: 16px; font-weight: 600; color: #ffffff;">Team Member</div>
        </div>
        <div style="background: rgba(255, 255, 255, 0.02); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Linked Client</div>
          <div style="font-size: 16px; font-weight: 600; color: #ffffff;">${note.client?.name || 'Internal'}</div>
        </div>
      </div>

      <div style="background: rgba(255, 255, 255, 0.01); border-radius: 32px; padding: 40px; border: 1px solid rgba(255, 255, 255, 0.05); min-height: 400px;">
        ${renderBlocks(note.content)}
      </div>

      <div style="margin-top: 60px; text-align: center; padding-top: 40px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: #64748b; font-size: 12px;">
        Wise Media Operating System · info@wisemedia.io
      </div>
    </div>
  `;

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#020617',
      logging: false,
      useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);

    const margin = 15; // 15mm margins
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const innerWidth = pdfWidth - (margin * 2);
    const innerHeight = pdfHeight - (margin * 2);

    // Calculate scale to fit width
    const ratio = innerWidth / imgProps.width;
    const renderedHeight = imgProps.height * ratio;

    let heightLeft = renderedHeight;
    let position = margin;

    // Background color #020617 for masking
    const bgColor = { r: 2, g: 6, b: 23 };

    const drawMasks = () => {
      pdf.setFillColor(bgColor.r, bgColor.g, bgColor.b);
      // Top mask
      pdf.rect(0, 0, pdfWidth, margin, 'F');
      // Bottom mask
      pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');
      // Left mask
      pdf.rect(0, 0, margin, pdfHeight, 'F');
      // Right mask
      pdf.rect(pdfWidth - margin, 0, margin, pdfHeight, 'F');
    };

    // Add first page
    pdf.addImage(imgData, 'PNG', margin, position, innerWidth, renderedHeight);
    drawMasks();
    heightLeft -= innerHeight;

    // Add subsequent pages if content exceeds innerHeight
    while (heightLeft > 0) {
      position -= innerHeight;
      pdf.addPage();
      // Set background color for new page
      pdf.setFillColor(bgColor.r, bgColor.g, bgColor.b);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

      pdf.addImage(imgData, 'PNG', margin, position, innerWidth, renderedHeight);
      drawMasks();
      heightLeft -= innerHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating Note PDF:', error);
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
};

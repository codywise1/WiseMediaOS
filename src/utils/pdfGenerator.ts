import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { termsAndConditionsTemplate } from '../config/termsTemplate';
import {
  fetchLogoDataUrl,
  stripMarkdown,
  fmtMoney,
  fmtDate,
  fmtDateLong,
  addImageMultiPage,
  ACCENT,
  ACCENT_RGB,
  INK,
  INK_RGB,
  SLATE,
  MUTED,
  LINE,
  SURFACE,
  WISE_EMAIL,
  WISE_SITE,
} from './pdfShared';

const PAGE_W = 800;
const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Helvetica Neue', sans-serif`;

function logoBlock(logoUrl: string | null) {
  if (logoUrl) {
    return `<img src="${logoUrl}" style="height: 40px; width: auto; display: block;" crossorigin="anonymous" />`;
  }
  return `<div style="font-size: 26px; font-weight: 800; color: ${INK}; letter-spacing: -0.5px;">Wise Media</div>`;
}

function statusPill(status: string) {
  const s = (status || 'pending').toLowerCase();
  const color = s === 'paid' ? '#059669' : s === 'overdue' ? '#dc2626' : s === 'draft' ? '#6b7280' : '#d97706';
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return `<span style="display: inline-block; padding: 5px 12px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: ${color}; background: ${color}14; border: 1px solid ${color}33;">${label}</span>`;
}

function sectionLabel(text: string) {
  return `<div style="font-size: 9px; font-weight: 700; color: ${MUTED}; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 8px;">${text}</div>`;
}

function footerBlock() {
  return `
    <div style="padding-top: 24px; border-top: 1px solid ${LINE}; display: flex; justify-content: space-between; align-items: center; margin-top: 48px;">
      <div style="font-size: 10px; color: ${MUTED}; letter-spacing: 0.3px;">Wise Media · ${WISE_EMAIL} · ${WISE_SITE}</div>
      <div style="font-size: 10px; color: ${MUTED}; letter-spacing: 0.3px;">Thank you for your business</div>
    </div>
  `;
}

export const generateProposalPDF = async (proposal: any) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${PAGE_W}px`;
  document.body.appendChild(container);

  const createdDate = proposal.createdDate || proposal.created_at || new Date().toISOString();
  const expiryDate = proposal.expiryDate || proposal.due_date || new Date().toISOString();
  const filename = `PROP-${proposal.id.slice(0, 8).toUpperCase()}-${(proposal.client || 'Client').replace(/[^a-z0-9]/gi, '_')}.pdf`;
  const logoUrl = await fetchLogoDataUrl();

  const descHtml = stripMarkdown(proposal.description || '').replace(/\n/g, '<br/>');

  container.innerHTML = `
    <div style="background: #ffffff; color: ${INK}; padding: 72px 64px; font-family: ${FONT}; width: ${PAGE_W}px; box-sizing: border-box;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 32px; border-bottom: 1px solid ${LINE};">
        <div>
          ${logoBlock(logoUrl)}
          <div style="font-size: 11px; color: ${MUTED}; margin-top: 8px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">Operating System</div>
          <div style="font-size: 11px; color: ${MUTED}; margin-top: 10px; line-height: 1.5;">${WISE_EMAIL}<br/>${WISE_SITE}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 32px; font-weight: 800; color: ${INK}; letter-spacing: -1px; line-height: 1;">Proposal</div>
          <div style="font-size: 11px; color: ${SLATE}; margin-top: 8px; font-variant-numeric: tabular-nums; letter-spacing: 0.3px;">No. PROP-${proposal.id.slice(0, 8).toUpperCase()}</div>
        </div>
      </div>

      <h1 style="font-size: 30px; font-weight: 800; color: ${INK}; margin: 40px 0 32px; letter-spacing: -0.5px; line-height: 1.15;">${proposal.title}</h1>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px;">
        <div style="background: ${SURFACE}; border-radius: 14px; padding: 20px 24px; border: 1px solid ${LINE};">
          ${sectionLabel('Project Value')}
          <div style="font-size: 28px; font-weight: 800; color: ${ACCENT}; font-variant-numeric: tabular-nums;">$${(proposal.value || 0).toLocaleString()}</div>
        </div>
        <div style="background: ${SURFACE}; border-radius: 14px; padding: 20px 24px; border: 1px solid ${LINE};">
          ${sectionLabel('Client')}
          <div style="font-size: 18px; font-weight: 700; color: ${INK};">${proposal.client || 'Client'}</div>
        </div>
        <div style="background: ${SURFACE}; border-radius: 14px; padding: 20px 24px; border: 1px solid ${LINE};">
          ${sectionLabel('Created Date')}
          <div style="font-size: 14px; font-weight: 600; color: ${SLATE};">${fmtDateLong(createdDate)}</div>
        </div>
        <div style="background: ${SURFACE}; border-radius: 14px; padding: 20px 24px; border: 1px solid ${LINE};">
          ${sectionLabel('Expiry Date')}
          <div style="font-size: 14px; font-weight: 600; color: ${SLATE};">${fmtDateLong(expiryDate)}</div>
        </div>
      </div>

      <div style="margin-bottom: 40px;">
        ${sectionLabel('Description')}
        <div style="font-size: 14px; color: ${SLATE}; line-height: 1.7;">${descHtml}</div>
      </div>

      ${proposal.services && proposal.services.length ? `
      <div style="margin-bottom: 40px;">
        ${sectionLabel('Included Services')}
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${proposal.services.map((s: string) => `<span style="background: ${ACCENT}14; border: 1px solid ${ACCENT}33; color: ${ACCENT}; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600;">${stripMarkdown(s)}</span>`).join('')}
        </div>
      </div>` : ''}

      <div style="page-break-before: always; border-top: 1px solid ${LINE}; padding-top: 40px; margin-bottom: 40px;">
        ${sectionLabel('Terms & Conditions')}
        <div style="font-size: 12px; color: ${SLATE}; line-height: 1.7; white-space: pre-wrap;">${termsAndConditionsTemplate}</div>
      </div>

      ${footerBlock()}
    </div>
  `;

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    addImageMultiPage(pdf, imgData, canvas.width, canvas.height, { margin: 12, bg: [255, 255, 255] });
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating Proposal PDF:', error);
  } finally {
    if (container.parentNode) document.body.removeChild(container);
  }
};

export const generateInvoicePDF = async (invoice: any) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${PAGE_W}px`;
  document.body.appendChild(container);

  const createdDate = invoice.createdDate || invoice.created_at || new Date().toISOString();
  const dueDate = invoice.dueDate || invoice.due_date || new Date().toISOString();
  const clientIdentifier = (invoice.client || 'Client').replace(/[^a-z0-9]/gi, '_');
  const filename = `INV-${invoice.id.slice(0, 8).toUpperCase()}-${clientIdentifier}.pdf`;
  const logoUrl = await fetchLogoDataUrl();

  const amount = fmtMoney(invoice.amount || 0);
  const taxRate = invoice.tax_rate ?? 0;
  const taxAmount = taxRate ? (invoice.amount * taxRate) / 100 : 0;
  const total = (invoice.amount || 0) + taxAmount;
  const descHtml = stripMarkdown(invoice.description || 'Professional services').replace(/\n/g, '<br/>');

  container.innerHTML = `
    <div style="background: #ffffff; color: ${INK}; padding: 72px 64px; font-family: ${FONT}; width: ${PAGE_W}px; box-sizing: border-box;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 32px; border-bottom: 1px solid ${LINE};">
        <div>
          ${logoBlock(logoUrl)}
          <div style="font-size: 11px; color: ${MUTED}; margin-top: 8px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">Operating System</div>
          <div style="font-size: 11px; color: ${MUTED}; margin-top: 10px; line-height: 1.5;">${WISE_EMAIL}<br/>${WISE_SITE}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 32px; font-weight: 800; color: ${INK}; letter-spacing: -1px; line-height: 1;">Invoice</div>
          <div style="font-size: 11px; color: ${SLATE}; margin-top: 8px; font-variant-numeric: tabular-nums; letter-spacing: 0.3px;">No. INV-${invoice.id.slice(0, 8).toUpperCase()}</div>
          <div style="margin-top: 12px;">${statusPill(invoice.status)}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; padding: 36px 0;">
        <div>
          ${sectionLabel('Bill To')}
          <div style="font-size: 15px; font-weight: 700; color: ${INK};">${invoice.client || 'Client'}</div>
        </div>
        <div>
          ${sectionLabel('Issue Date')}
          <div style="font-size: 14px; font-weight: 600; color: ${SLATE};">${fmtDate(createdDate)}</div>
        </div>
        <div>
          ${sectionLabel('Due Date')}
          <div style="font-size: 14px; font-weight: 600; color: ${SLATE};">${fmtDate(dueDate)}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
        <thead>
          <tr style="border-bottom: 1px solid ${LINE};">
            <th style="text-align: left; padding: 12px 0; font-size: 10px; font-weight: 700; color: ${MUTED}; text-transform: uppercase; letter-spacing: 1px;">Description</th>
            <th style="text-align: right; padding: 12px 0; font-size: 10px; font-weight: 700; color: ${MUTED}; text-transform: uppercase; letter-spacing: 1px; width: 140px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 20px 0; font-size: 14px; color: ${SLATE}; line-height: 1.5;">${descHtml}</td>
            <td style="padding: 20px 0; font-size: 14px; color: ${INK}; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums;">${amount}</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 48px;">
        <div style="width: 280px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 13px; color: ${SLATE};">
            <span>Subtotal</span>
            <span style="font-variant-numeric: tabular-nums; color: ${INK}; font-weight: 600;">${amount}</span>
          </div>
          ${taxRate ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 13px; color: ${SLATE}; border-top: 1px solid #f1f5f9;">
            <span>Tax (${taxRate}%)</span>
            <span style="font-variant-numeric: tabular-nums; color: ${INK}; font-weight: 600;">${fmtMoney(taxAmount)}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: baseline; padding: 18px 0 8px; border-top: 2px solid ${INK}; margin-top: 8px;">
            <span style="font-size: 11px; font-weight: 700; color: ${INK}; text-transform: uppercase; letter-spacing: 1px;">Total Due</span>
            <span style="font-size: 24px; font-weight: 800; color: ${INK}; font-variant-numeric: tabular-nums; letter-spacing: -0.5px;">${fmtMoney(total)}</span>
          </div>
        </div>
      </div>

      <div style="background: ${SURFACE}; border-radius: 14px; padding: 20px 24px; margin-bottom: 48px; border: 1px solid ${LINE};">
        ${sectionLabel('Payment')}
        <div style="font-size: 13px; color: ${SLATE}; line-height: 1.6;">Please remit payment by the due date. For questions about this invoice, contact ${WISE_EMAIL}.</div>
      </div>

      ${footerBlock()}
    </div>
  `;

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    addImageMultiPage(pdf, imgData, canvas.width, canvas.height, { margin: 12, bg: [255, 255, 255] });
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating Invoice PDF:', error);
  } finally {
    if (container.parentNode) document.body.removeChild(container);
  }
};

export const generateNotePDF = async (note: any) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${PAGE_W}px`;
  document.body.appendChild(container);

  const createdDate = note.created_at || new Date().toISOString();
  const filename = `NOTE-${note.id.slice(0, 8).toUpperCase()}-${(note.title || 'Untitled').replace(/[^a-z0-9]/gi, '_')}.pdf`;
  const logoUrl = await fetchLogoDataUrl();

  const renderBlocks = (blocks: any[]) => {
    if (!blocks || !Array.isArray(blocks)) return '';
    return blocks.map(block => {
      switch (block.type) {
        case 'heading': {
          const level = block.level || 2;
          const fontSize = level === 1 ? '24px' : level === 2 ? '20px' : '16px';
          return `<h${level} style="font-size: ${fontSize}; font-weight: 700; color: ${INK}; margin-top: 24px; margin-bottom: 12px;">${stripMarkdown(block.content || '')}</h${level}>`;
        }
        case 'paragraph':
          return `<p style="font-size: 14px; line-height: 1.7; color: ${SLATE}; margin-bottom: 16px; white-space: pre-wrap;">${stripMarkdown(block.content || '')}</p>`;
        case 'bullets':
          return `<ul style="margin-bottom: 16px; list-style-type: none; padding-left: 0;">${(block.items || []).map((item: string) => `<li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;"><span style="color: ${ACCENT}; font-weight: bold;">•</span><span style="font-size: 14px; color: ${SLATE};">${stripMarkdown(item)}</span></li>`).join('')}</ul>`;
        case 'numbered':
          return `<ol style="margin-bottom: 16px; list-style-type: none; padding-left: 0;">${(block.items || []).map((item: string, i: number) => `<li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;"><span style="color: ${ACCENT}; font-weight: bold; font-family: monospace;">${i + 1}.</span><span style="font-size: 14px; color: ${SLATE};">${stripMarkdown(item)}</span></li>`).join('')}</ol>`;
        case 'todo':
          return `<div style="margin-bottom: 16px;">${(block.todos || []).map((todo: any) => `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;"><div style="width: 14px; height: 14px; border: 1px solid ${todo.done ? ACCENT : LINE}; background: ${todo.done ? ACCENT : 'transparent'}; border-radius: 4px; display: flex; align-items: center; justify-content: center;">${todo.done ? '<span style="color: white; font-size: 10px;">✓</span>' : ''}</div><span style="font-size: 14px; color: ${todo.done ? MUTED : SLATE}; ${todo.done ? 'text-decoration: line-through;' : ''}">${stripMarkdown(todo.text)}</span></div>`).join('')}</div>`;
        case 'divider':
          return `<hr style="border: 0; border-top: 1px solid ${LINE}; margin: 32px 0;" />`;
        case 'quote':
          return `<div style="border-left: 3px solid ${ACCENT}; padding: 16px 20px; font-style: italic; color: ${SLATE}; font-size: 16px; margin-bottom: 24px; background: ${SURFACE};">${stripMarkdown(block.content || '')}</div>`;
        case 'callout':
          return `<div style="background: ${ACCENT}14; border: 1px solid ${ACCENT}33; border-radius: 12px; padding: 16px; color: ${ACCENT}; font-size: 14px; font-weight: 500; margin-bottom: 16px;">${stripMarkdown(block.content || '')}</div>`;
        default:
          return '';
      }
    }).join('');
  };

  container.innerHTML = `
    <div style="background: #ffffff; color: ${INK}; padding: 72px 64px; font-family: ${FONT}; width: ${PAGE_W}px; box-sizing: border-box;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 32px; border-bottom: 1px solid ${LINE};">
        <div>
          ${logoBlock(logoUrl)}
          <div style="font-size: 11px; color: ${MUTED}; margin-top: 8px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">Operating System</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 32px; font-weight: 800; color: ${INK}; letter-spacing: -1px; line-height: 1;">Note</div>
          <div style="font-size: 11px; color: ${SLATE}; margin-top: 8px; font-variant-numeric: tabular-nums; letter-spacing: 0.3px;">No. NOTE-${note.id.slice(0, 8).toUpperCase()}</div>
        </div>
      </div>

      <h1 style="font-size: 30px; font-weight: 800; color: ${INK}; margin: 40px 0 10px; letter-spacing: -0.5px;">${note.title || 'Untitled'}</h1>

      <div style="display: flex; gap: 12px; margin-bottom: 40px;">
        <span style="background: ${ACCENT}14; border: 1px solid ${ACCENT}33; color: ${ACCENT}; padding: 4px 12px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${note.category || 'General'}</span>
        <span style="background: ${SURFACE}; border: 1px solid ${LINE}; color: ${SLATE}; padding: 4px 12px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${fmtDateLong(createdDate)}</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px;">
        <div style="background: ${SURFACE}; border-radius: 14px; padding: 20px 24px; border: 1px solid ${LINE};">
          ${sectionLabel('Author')}
          <div style="font-size: 16px; font-weight: 600; color: ${INK};">Team Member</div>
        </div>
        <div style="background: ${SURFACE}; border-radius: 14px; padding: 20px 24px; border: 1px solid ${LINE};">
          ${sectionLabel('Linked Client')}
          <div style="font-size: 16px; font-weight: 600; color: ${INK};">${note.client?.name || 'Internal'}</div>
        </div>
      </div>

      <div style="font-size: 14px; color: ${SLATE}; line-height: 1.7; min-height: 200px;">
        ${renderBlocks(note.content)}
      </div>

      ${footerBlock()}
    </div>
  `;

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    addImageMultiPage(pdf, imgData, canvas.width, canvas.height, { margin: 12, bg: [255, 255, 255] });
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating Note PDF:', error);
  } finally {
    if (container.parentNode) document.body.removeChild(container);
  }
};

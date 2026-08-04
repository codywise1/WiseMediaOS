import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Proposal, ProposalItem } from '../lib/proposalService';
import { serviceTemplates } from '../config/serviceTemplates';
import {
  fetchLogoDataUrl,
  stripMarkdown,
  renderTermsHtml,
  fmtMoney,
  fmtDate,
  fmtDateLong,
  addImageMultiPage,
  ACCENT,
  ACCENT_RGB,
  INK,
  INK_RGB,
  SLATE,
  SLATE_RGB,
  MUTED,
  MUTED_RGB,
  LINE,
  LINE_RGB,
  SURFACE,
  SURFACE_RGB,
  WISE_EMAIL,
  WISE_SITE,
} from './pdfShared';

interface ProposalWithItems extends Proposal {
  items?: ProposalItem[];
  clauses?: any[];
}

const PAGE_W = 800;
const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Helvetica Neue', sans-serif`;

function logoBlock(logoUrl: string | null) {
  if (logoUrl) {
    return `<img src="${logoUrl}" style="height: 40px; width: auto; display: block;" crossorigin="anonymous" />`;
  }
  return `<div style="font-size: 26px; font-weight: 800; color: ${INK}; letter-spacing: -0.5px;">Wise Media</div>`;
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

export const generateProposalPDF = async (proposal: ProposalWithItems, items: ProposalItem[]) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${PAGE_W}px`;
  document.body.appendChild(container);

  const createdDate = proposal.created_at || new Date().toISOString();
  const expiryDate = proposal.expires_at || new Date().toISOString();
  const clientName = proposal.client?.company || proposal.client?.name || 'Client';
  const filename = `PROP-${proposal.id.slice(0, 8).toUpperCase()}-${clientName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  const logoUrl = await fetchLogoDataUrl();

  const descHtml = stripMarkdown(proposal.description || '').replace(/\n/g, '<br/>');
  const totalCents = items.reduce((sum, i) => sum + (i.line_total_cents || 0), 0);

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
          <div style="font-size: 28px; font-weight: 800; color: ${ACCENT}; font-variant-numeric: tabular-nums;">$${fmtMoney(totalCents, true)}</div>
        </div>
        <div style="background: ${SURFACE}; border-radius: 14px; padding: 20px 24px; border: 1px solid ${LINE};">
          ${sectionLabel('Client')}
          <div style="font-size: 18px; font-weight: 700; color: ${INK};">${clientName}</div>
          ${proposal.client?.email ? `<div style="font-size: 12px; color: ${SLATE}; margin-top: 4px;">${proposal.client.email}</div>` : ''}
          ${proposal.client?.phone ? `<div style="font-size: 12px; color: ${SLATE}; margin-top: 2px;">${proposal.client.phone}</div>` : ''}
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

      ${proposal.description ? `
      <div style="margin-bottom: 40px;">
        ${sectionLabel('Description')}
        <div style="font-size: 14px; color: ${SLATE}; line-height: 1.7;">${descHtml}</div>
      </div>` : ''}

      <div style="margin-bottom: 40px;">
        ${sectionLabel('Services & Pricing')}
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid ${LINE};">
              <th style="text-align: left; padding: 12px 0; font-size: 10px; font-weight: 700; color: ${MUTED}; text-transform: uppercase; letter-spacing: 1px;">Service</th>
              <th style="text-align: center; padding: 12px 0; font-size: 10px; font-weight: 700; color: ${MUTED}; text-transform: uppercase; letter-spacing: 1px; width: 60px;">Qty</th>
              <th style="text-align: right; padding: 12px 0; font-size: 10px; font-weight: 700; color: ${MUTED}; text-transform: uppercase; letter-spacing: 1px; width: 120px;">Unit Price</th>
              <th style="text-align: right; padding: 12px 0; font-size: 10px; font-weight: 700; color: ${MUTED}; text-transform: uppercase; letter-spacing: 1px; width: 120px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 16px 0; font-size: 14px; color: ${INK}; font-weight: 600;">${stripMarkdown(item.name)}</td>
                <td style="padding: 16px 0; font-size: 14px; color: ${SLATE}; text-align: center;">${item.quantity}</td>
                <td style="padding: 16px 0; font-size: 14px; color: ${SLATE}; text-align: right; font-variant-numeric: tabular-nums;">$${fmtMoney(item.unit_price_cents, true)}</td>
                <td style="padding: 16px 0; font-size: 14px; color: ${INK}; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums;">$${fmtMoney(item.line_total_cents, true)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
          <div style="width: 280px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; padding: 18px 0 8px; border-top: 2px solid ${INK};">
              <span style="font-size: 11px; font-weight: 700; color: ${INK}; text-transform: uppercase; letter-spacing: 1px;">Total</span>
              <span style="font-size: 24px; font-weight: 800; color: ${INK}; font-variant-numeric: tabular-nums; letter-spacing: -0.5px;">$${fmtMoney(totalCents, true)}</span>
            </div>
          </div>
        </div>
      </div>

      ${items.some(i => serviceTemplates.find(t => t.serviceType === i.service_type)) ? `
      <div style="page-break-before: always; border-top: 1px solid ${LINE}; padding-top: 40px; margin-bottom: 40px;">
        ${sectionLabel('Scope of Work')}
        ${items.map(item => {
          const template = serviceTemplates.find(t => t.serviceType === item.service_type);
          if (!template) return '';
          return `
            <div style="margin-bottom: 32px;">
              <h3 style="font-size: 18px; font-weight: 700; color: ${INK}; margin-bottom: 16px;">${template.label}</h3>
              ${template.sowBlocks.map(block => `
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 13px; font-weight: 700; color: ${INK}; margin-bottom: 8px;">${block.title}</div>
                  <ul style="list-style-type: none; padding-left: 0;">
                    ${block.items.map(blockItem => `
                      <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
                        <span style="color: ${ACCENT}; font-weight: bold;">•</span>
                        <span style="font-size: 13px; color: ${SLATE}; line-height: 1.6;">${stripMarkdown(blockItem)}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              `).join('')}
              ${template.clauseCodes && template.clauseCodes.length > 0 ? `
                <div style="background: ${SURFACE}; border-radius: 10px; padding: 12px 16px; border: 1px solid ${LINE}; margin-top: 8px;">
                  <span style="font-size: 11px; font-weight: 700; color: ${MUTED}; text-transform: uppercase; letter-spacing: 1px;">Applicable Clauses: </span>
                  <span style="font-size: 12px; color: ${SLATE};">${template.clauseCodes.join(', ')}</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>` : ''}

      <div style="page-break-before: always; border-top: 1px solid ${LINE}; padding-top: 40px; margin-bottom: 40px;">
        ${sectionLabel('Legal Terms & Conditions')}
        <div style="font-size: 12px; color: ${SLATE}; line-height: 1.7;">
          This proposal is subject to our standard terms and conditions, including global clauses (G01-G15) and service-specific clauses. Full legal terms are available upon request and will be locked upon proposal acceptance.
        </div>
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

export const generateProposalPreviewPDF = async (proposal: ProposalWithItems, items: ProposalItem[]): Promise<Blob> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${PAGE_W}px`;
  document.body.appendChild(container);

  const logoUrl = await fetchLogoDataUrl();
  const totalCents = items.reduce((sum, i) => sum + (i.line_total_cents || 0), 0);

  container.innerHTML = `
    <div style="background: #ffffff; color: ${INK}; padding: 72px 64px; font-family: ${FONT}; width: ${PAGE_W}px; box-sizing: border-box;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 32px; border-bottom: 1px solid ${LINE};">
        <div>
          ${logoBlock(logoUrl)}
          <div style="font-size: 11px; color: ${MUTED}; margin-top: 8px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">Operating System</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 32px; font-weight: 800; color: ${INK}; letter-spacing: -1px; line-height: 1;">Proposal</div>
          <div style="font-size: 11px; color: ${SLATE}; margin-top: 8px;">No. PROP-${proposal.id.slice(0, 8).toUpperCase()}</div>
        </div>
      </div>

      <h1 style="font-size: 30px; font-weight: 800; color: ${INK}; margin: 40px 0 32px;">${proposal.title}</h1>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px;">
        <div style="background: ${SURFACE}; border-radius: 14px; padding: 20px 24px; border: 1px solid ${LINE};">
          ${sectionLabel('Project Value')}
          <div style="font-size: 28px; font-weight: 800; color: ${ACCENT};">$${fmtMoney(totalCents, true)}</div>
        </div>
        <div style="background: ${SURFACE}; border-radius: 14px; padding: 20px 24px; border: 1px solid ${LINE};">
          ${sectionLabel('Client')}
          <div style="font-size: 18px; font-weight: 700; color: ${INK};">${proposal.client?.company || proposal.client?.name || 'Client'}</div>
        </div>
      </div>

      ${footerBlock()}
    </div>
  `;

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    addImageMultiPage(pdf, imgData, canvas.width, canvas.height, { margin: 12, bg: [255, 255, 255] });
    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating Proposal preview PDF:', error);
    return new Blob();
  } finally {
    if (container.parentNode) document.body.removeChild(container);
  }
};

export const generateTermsAndConditionsPDF = async (proposalTitle: string, clientName: string, termsText: string) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${PAGE_W}px`;
  document.body.appendChild(container);

  const logoUrl = await fetchLogoDataUrl();
  const filename = `Terms_and_Conditions_${proposalTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`;

  container.innerHTML = `
    <div style="background: #ffffff; color: ${INK}; padding: 72px 64px; font-family: ${FONT}; width: ${PAGE_W}px; box-sizing: border-box;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 32px; border-bottom: 1px solid ${LINE};">
        <div>
          ${logoBlock(logoUrl)}
          <div style="font-size: 11px; color: ${MUTED}; margin-top: 8px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">Operating System</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 28px; font-weight: 800; color: ${INK}; letter-spacing: -1px;">Terms & Conditions</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 40px 0;">
        <div style="background: ${SURFACE}; border-radius: 14px; padding: 20px 24px; border: 1px solid ${LINE};">
          ${sectionLabel('Proposal')}
          <div style="font-size: 16px; font-weight: 700; color: ${INK};">${proposalTitle}</div>
        </div>
        <div style="background: ${SURFACE}; border-radius: 14px; padding: 20px 24px; border: 1px solid ${LINE};">
          ${sectionLabel('Client')}
          <div style="font-size: 16px; font-weight: 700; color: ${INK};">${clientName}</div>
        </div>
      </div>

      <div style="font-size: 13px; color: ${SLATE}; line-height: 1.8;">${renderTermsHtml(termsText)}</div>

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
    console.error('Error generating Terms PDF:', error);
  } finally {
    if (container.parentNode) document.body.removeChild(container);
  }
};

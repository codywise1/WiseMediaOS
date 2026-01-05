// PDF Generation utility with branded design
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${proposal.services ? proposal.services.map((s: string) => `
            <span style="background: rgba(58, 163, 235, 0.1); border: 1px solid rgba(58, 163, 235, 0.2); color: #3aa3eb; padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${s}</span>
          `).join('') : ''}
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
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating Proposal PDF:', error);
  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Generates a professional PDF for an invoice and triggers a direct download.
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

  container.innerHTML = `
    <div style="background: #020617; color: #f8fafc; padding: 60px; font-family: 'Montserrat', sans-serif; width: 800px; border-radius: 0;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px;">
        <div>
          <div style="font-family: 'Integral CF', sans-serif; font-size: 32px; font-weight: 700; color: #ffffff;">WISE MEDIA</div>
          <div style="font-size: 12px; font-weight: 700; color: #3aa3eb; text-transform: uppercase; letter-spacing: 2px;">Operating System</div>
        </div>
        <div style="font-family: 'Integral CF', sans-serif; font-size: 14px; font-weight: 700; color: #3aa3eb; background: rgba(58, 163, 235, 0.1); padding: 10px 20px; border-radius: 14px; border: 1px solid rgba(58, 163, 235, 0.2);">
          INV-${invoice.id.slice(0, 8).toUpperCase()}
        </div>
      </div>
      <h1 style="font-family: 'Integral CF', sans-serif; font-size: 48px; font-weight: 700; color: #ffffff; margin-bottom: 40px; letter-spacing: -2px;">INVOICE</h1>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 60px;">
        <div>
          <h3 style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Bill To</h3>
          <p style="font-size: 18px; font-weight: 600; color: #ffffff;">${invoice.client}</p>
        </div>
        <div style="text-align: right;">
          <h3 style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Status</h3>
          <span style="display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; ${invoice.status === 'paid' ? 'background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3);' :
      invoice.status === 'overdue' ? 'background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);' :
        'background: rgba(58, 163, 235, 0.2); color: #3aa3eb; border: 1px solid rgba(58, 163, 235, 0.3);'
    }">${invoice.status}</span>
        </div>
      </div>
      <div style="background: rgba(58, 163, 235, 0.1); border-radius: 24px; padding: 32px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border: 1px solid rgba(58, 163, 235, 0.2);">
        <span style="font-size: 14px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Total Amount Due</span>
        <span style="font-family: 'Integral CF', sans-serif; font-size: 42px; color: #3aa3eb;">$${invoice.amount.toLocaleString()}</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px;">
        <div style="background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Issue Date</div>
          <div style="font-size: 14px; font-weight: 600; color: #ffffff;">${new Date(createdDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div style="background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Due Date</div>
          <div style="font-size: 14px; font-weight: 600; color: #ffffff;">${new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.03); border-radius: 24px; padding: 32px; margin-bottom: 40px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <h3 style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Services Description</h3>
        <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">${invoice.description}</p>
      </div>
      <div style="margin-top: 60px; text-align: center; padding-top: 40px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: #64748b; font-size: 12px;">
        Thank you for choosing Wise Media. We appreciate your business.<br>
        <span style="display: inline-block; margin-top: 12px;">Questions? info@wisemedia.io · wisemedia.io</span>
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
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating Invoice PDF:', error);
  } finally {
    document.body.removeChild(container);
  }
};
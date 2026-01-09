import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Proposal, ProposalItem } from '../lib/proposalService';
import { serviceTemplates } from '../config/serviceTemplates';

interface ProposalWithItems extends Proposal {
  items?: ProposalItem[];
  clauses?: any[];
}

export const generateProposalPDF = async (proposal: ProposalWithItems, items: ProposalItem[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSAL', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Proposal ID: ${proposal.id.substring(0, 8)}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // Client Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Information', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Client: ${proposal.client?.company || proposal.client?.name || 'N/A'}`, 20, yPosition);
  yPosition += 6;
  if (proposal.client?.email) {
    doc.text(`Email: ${proposal.client.email}`, 20, yPosition);
    yPosition += 6;
  }
  if (proposal.client?.phone) {
    doc.text(`Phone: ${proposal.client.phone}`, 20, yPosition);
    yPosition += 6;
  }

  yPosition += 10;

  // Proposal Details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Proposal Details', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Title: ${proposal.title}`, 20, yPosition);
  yPosition += 6;

  if (proposal.description) {
    const descLines = doc.splitTextToSize(`Description: ${proposal.description}`, pageWidth - 40);
    doc.text(descLines, 20, yPosition);
    yPosition += descLines.length * 6;
  }

  doc.text(`Status: ${proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Created: ${new Date(proposal.created_at).toLocaleDateString()}`, 20, yPosition);
  yPosition += 6;

  if (proposal.expires_at) {
    doc.text(`Expires: ${new Date(proposal.expires_at).toLocaleDateString()}`, 20, yPosition);
    yPosition += 6;
  }

  yPosition += 10;

  // Services & Pricing Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Services & Pricing', 20, yPosition);
  yPosition += 8;

  const tableData = items.map(item => [
    item.name,
    item.quantity.toString(),
    `$${(item.unit_price_cents / 100).toFixed(2)}`,
    `$${(item.line_total_cents / 100).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Service', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    foot: [['', '', 'Total:', `$${(proposal.value / 100).toFixed(2)}`]],
    theme: 'grid',
    headStyles: { fillColor: [58, 163, 235], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' }
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = 20;
  }

  // Scope of Work
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Scope of Work', 20, yPosition);
  yPosition += 8;

  items.forEach(item => {
    const template = serviceTemplates.find(t => t.serviceType === item.service_type);
    if (!template) return;

    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(template.label, 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    template.sowBlocks.forEach(block => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(block.title, 25, yPosition);
      yPosition += 6;

      doc.setFont('helvetica', 'normal');
      block.items.forEach(blockItem => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        const lines = doc.splitTextToSize(`• ${blockItem}`, pageWidth - 50);
        doc.text(lines, 30, yPosition);
        yPosition += lines.length * 5;
      });
      yPosition += 4;
    });

    yPosition += 8;
  });

  // Legal Terms Notice
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Legal Terms & Conditions', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const legalNotice = 'This proposal is subject to our standard terms and conditions, including global clauses (G01-G15) and service-specific clauses. Full legal terms are available upon request and will be locked upon proposal acceptance.';
  const legalLines = doc.splitTextToSize(legalNotice, pageWidth - 40);
  doc.text(legalLines, 20, yPosition);
  yPosition += legalLines.length * 5 + 10;

  // Footer
  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('This proposal is valid until the expiration date listed above.', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Save the PDF
  const fileName = `Proposal_${proposal.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export const generateProposalPreviewPDF = async (_proposal: ProposalWithItems, _items: ProposalItem[]): Promise<Blob> => {
  const doc = new jsPDF();
  // Same generation logic as above but return blob instead of saving
  // ... (reuse the same code)
  return doc.output('blob');
};


export const generateTermsAndConditionsPDF = async (proposalTitle: string, clientName: string, termsText: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms and Conditions', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Proposal: ${proposalTitle}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Client: ${clientName}`, 20, yPosition);
  yPosition += 10;

  // Horizontal line
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 10;

  // Terms Content
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(termsText, pageWidth - 40);

  lines.forEach((line: string) => {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(line, 20, yPosition);
    yPosition += 6;
  });

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY, { align: 'center' });

  const fileName = `Terms_and_Conditions_${proposalTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(fileName);
};


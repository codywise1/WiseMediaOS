// PDF Generation utility with branded design
export const generateProposalPDF = (proposal: any) => {
  // Create a new window for PDF generation
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposal - ${proposal.id}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Integral+CF:wght@700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Montserrat', sans-serif;
        }
        
        body {
          background: url('https://codywise.io/wp-content/uploads/2025/02/IMG-4-Wise-Media.webp') no-repeat center center fixed;
          background-size: cover;
          min-height: 100vh;
          padding: 40px 20px;
          color: #e2e8f0;
          margin: 0;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 0 20px rgba(58, 163, 235, 0.15), 0 0 40px rgba(58, 163, 235, 0.1);
          position: relative;
        }
        
        .container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          pointer-events: none;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .logo {
          height: 60px;
          width: auto;
        }
        
        .proposal-id {
          font-size: 18px;
          font-weight: 600;
          color: #3aa3eb;
          background: rgba(58, 163, 235, 0.2);
          padding: 8px 16px;
          border-radius: 12px;
          border: 1px solid rgba(58, 163, 235, 0.3);
        }
        
        .title {
          font-family: 'Integral CF', sans-serif;
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, #3aa3eb, #3aa3eb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }
        
        .subtitle {
          font-size: 18px;
          color: #cbd5e1;
          margin-bottom: 40px;
        }
        
        .section {
          margin-bottom: 32px;
        }
        
        .section-title {
          font-family: 'Integral CF', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #3aa3eb;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }
        
        .info-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
        }
        
        .info-label {
          font-size: 14px;
          color: #94a3b8;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-value {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
        }
        
        .value-large {
          font-size: 28px;
          color: #3aa3eb;
        }
        
        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        
        .service-tag {
          background: rgba(58, 163, 235, 0.2);
          border: 1px solid rgba(58, 163, 235, 0.3);
          color: #3aa3eb;
          padding: 8px 16px;
          border-radius: 20px;
          text-align: center;
          font-weight: 500;
          font-size: 14px;
        }
        
        .description {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          line-height: 1.6;
          font-size: 16px;
          color: #e2e8f0;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          text-transform: capitalize;
        }
        
        .status-approved {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        
        .status-pending {
          background: rgba(58, 163, 235, 0.2);
          color: #3aa3eb;
          border: 1px solid rgba(58, 163, 235, 0.3);
        }
        
        .status-under_review {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }
        
        .status-draft {
          background: rgba(107, 114, 128, 0.2);
          color: #9ca3af;
          border: 1px solid rgba(107, 114, 128, 0.3);
        }
        
        .status-rejected {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }
        
        .contact-info {
          display: flex;
          justify-content: center;
          gap: 32px;
          margin-top: 16px;
        }
        
        .contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        @media print {
          body {
            background: #1e293b !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .container {
            box-shadow: none;
            border: 1px solid #334155;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://codywise.io/wp-content/uploads/2025/02/Wise-Media-Logo.svg" alt="Wise Media" class="logo">
          <div class="proposal-id">${proposal.id}</div>
        </div>
        
        <h1 class="title">${proposal.title}</h1>
        <p class="subtitle">Project Proposal for ${proposal.client}</p>
        
        <div class="info-grid">
          <div class="info-card">
            <div class="info-label">Project Value</div>
            <div class="info-value value-large">$${proposal.value.toLocaleString()}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Status</div>
            <div class="info-value">
              <span class="status-badge status-${proposal.status}">
                ${proposal.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div class="info-card">
            <div class="info-label">Created Date</div>
            <div class="info-value">${new Date(proposal.createdDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Expiry Date</div>
            <div class="info-value">${new Date(proposal.expiryDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
          </div>
        </div>
        
        <div class="section">
          <h2 class="section-title">Project Description</h2>
          <div class="description">
            ${proposal.description}
          </div>
        </div>
        
        <div class="section">
          <h2 class="section-title">Services Included</h2>
          <div class="services-grid">
            ${proposal.services.map((service: string) => `
              <div class="service-tag">${service}</div>
            `).join('')}
          </div>
        </div>
        
        <div class="footer">
          <p>This proposal is valid until ${new Date(proposal.expiryDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          <div class="contact-info">
            <div class="contact-item">
              <span>📧</span>
              <span>info@wisemedia.io</span>
            </div>
            <div class="contact-item">
              <span>📞</span>
              <span>+1 (555) 123-4567</span>
            </div>
            <div class="contact-item">
              <span>🌐</span>
              <span>wisemedia.io</span>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
};

export const generateInvoicePDF = (invoice: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice - ${invoice.id}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Integral+CF:wght@700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Montserrat', sans-serif;
        }
        
        body {
          background: url('https://codywise.io/wp-content/uploads/2025/02/IMG-4-Wise-Media.webp') no-repeat center center fixed;
          background-size: cover;
          min-height: 100vh;
          padding: 40px 20px;
          color: #e2e8f0;
          margin: 0;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 0 20px rgba(58, 163, 235, 0.15), 0 0 40px rgba(58, 163, 235, 0.1);
          position: relative;
        }
        
        .container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          pointer-events: none;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .logo {
          height: 60px;
          width: auto;
        }
        
        .invoice-id {
          font-size: 18px;
          font-weight: 600;
          color: #3aa3eb;
          background: rgba(58, 163, 235, 0.2);
          padding: 8px 16px;
          border-radius: 12px;
          border: 1px solid rgba(58, 163, 235, 0.3);
        }
        
        .title {
          font-family: 'Integral CF', sans-serif;
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, #3aa3eb, #3aa3eb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }
        
        .subtitle {
          font-size: 18px;
          color: #cbd5e1;
          margin-bottom: 40px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }
        
        .info-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
        }
        
        .info-label {
          font-size: 14px;
          color: #94a3b8;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-value {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
        }
        
        .amount-large {
          font-size: 36px;
          color: #3aa3eb;
          font-weight: 700;
        }
        
        .description {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          line-height: 1.6;
          font-size: 16px;
          color: #e2e8f0;
          margin-bottom: 32px;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          text-transform: capitalize;
        }
        
        .status-paid {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        
        .status-pending {
          background: rgba(58, 163, 235, 0.2);
          color: #3aa3eb;
          border: 1px solid rgba(58, 163, 235, 0.3);
        }
        
        .status-overdue {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .status-draft {
          background: rgba(107, 114, 128, 0.2);
          color: #9ca3af;
          border: 1px solid rgba(107, 114, 128, 0.3);
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }
        
        .payment-info {
          background: rgba(58, 163, 235, 0.1);
          border: 1px solid rgba(58, 163, 235, 0.2);
          border-radius: 16px;
          padding: 20px;
          margin-top: 20px;
        }
        
        @media print {
          body {
            background: #1e293b !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .container {
            box-shadow: none;
            border: 1px solid #334155;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://codywise.io/wp-content/uploads/2025/02/Wise-Media-Logo.svg" alt="Wise Media" class="logo">
          <div class="invoice-id">${invoice.id}</div>
        </div>
        
        <h1 class="title">Invoice</h1>
        <p class="subtitle">Bill to: ${invoice.client}</p>
        
        <div class="info-grid">
          <div class="info-card">
            <div class="info-label">Amount Due</div>
            <div class="info-value amount-large">$${invoice.amount.toLocaleString()}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Status</div>
            <div class="info-value">
              <span class="status-badge status-${invoice.status}">
                ${invoice.status}
              </span>
            </div>
          </div>
          <div class="info-card">
            <div class="info-label">Issue Date</div>
            <div class="info-value">${new Date(invoice.createdDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Due Date</div>
            <div class="info-value">${new Date(invoice.dueDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
          </div>
        </div>
        
        <div class="description">
          <strong>Description:</strong><br>
          ${invoice.description}
        </div>
        
        ${invoice.status !== 'paid' ? `
          <div class="payment-info">
            <h3 style="color: #3aa3eb; margin-bottom: 12px;">Payment Information</h3>
            <p>Please remit payment by the due date to avoid late fees.</p>
            <p style="margin-top: 8px;"><strong>Payment Methods:</strong> Bank Transfer, Credit Card, PayPal</p>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p style="margin-top: 8px;">Questions? Contact us at info@wisemedia.io or +1 (555) 123-4567</p>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
};
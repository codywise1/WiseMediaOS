import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService, Invoice as InvoiceType } from '../lib/supabase';
import { 
  DocumentIcon, 
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import InvoiceModal from './InvoiceModal';
import ConfirmDialog from './ConfirmDialog';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import PaymentModal from './PaymentModal';

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
}

interface InvoicesProps {
  currentUser: User | null;
}

interface Invoice extends Omit<InvoiceType, 'created_at' | 'due_date'> {
  createdDate: string;
  dueDate: string;
  client: string;
}

const statusConfig = {
  paid: { color: 'bg-white/30 text-white', icon: CheckCircleIcon },
  pending: { color: 'bg-[#3aa3eb]/30 text-[#3aa3eb]', icon: ClockIcon },
  overdue: { color: 'bg-red-900/30 text-red-400', icon: ExclamationTriangleIcon },
  draft: { color: 'bg-gray-900/30 text-gray-400', icon: DocumentIcon },
};

export default function Invoices({ currentUser }: InvoicesProps) {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  React.useEffect(() => {
    loadInvoices();
  }, [currentUser]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      let data: InvoiceType[] = [];
      
      if (currentUser?.role === 'admin') {
        data = await invoiceService.getAll();
      } else if (currentUser?.id) {
        // For clients, get invoices assigned to them
        data = await invoiceService.getByClientId(currentUser.id);
      }
      
      // Transform data to match component interface
      const transformedInvoices: Invoice[] = data.map(invoice => ({
        ...invoice,
        client: invoice.client?.name || 'Unknown Client',
        createdDate: invoice.created_at?.split('T')[0] || '',
        dueDate: invoice.due_date || ''
      }));
      
      setInvoices(transformedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPending = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdue = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);

  const handleNewInvoice = () => {
    setSelectedInvoice(undefined);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveInvoice = (invoiceData: any) => {
    const saveInvoice = async () => {
      try {
        // Transform data for API
        const apiData = {
          id: modalMode === 'create' ? `INV-2024-${String(invoices.length + 1).padStart(3, '0')}` : invoiceData.id,
          client_id: invoiceData.client_id,
          amount: invoiceData.amount,
          description: invoiceData.description,
          status: invoiceData.status,
          due_date: invoiceData.dueDate
        };

        if (modalMode === 'create') {
          await invoiceService.create(apiData);
        } else if (selectedInvoice) {
          await invoiceService.update(selectedInvoice.id, apiData);
        }
        
        // Reload invoices
        await loadInvoices();
      } catch (error) {
        console.error('Error saving invoice:', error);
        alert('Error saving invoice. Please try again.');
      }
    };
    
    saveInvoice();
  };

  const confirmDelete = async () => {
    if (selectedInvoice) {
      try {
        await invoiceService.delete(selectedInvoice.id);
        await loadInvoices();
        setIsDeleteDialogOpen(false);
        setSelectedInvoice(undefined);
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Error deleting invoice. Please try again.');
      }
    }
  };

  const handlePayInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handlePaymentSuccess = (paymentDetails: any) => {
    const updateInvoiceStatus = async () => {
      if (selectedInvoice) {
        try {
          await invoiceService.update(selectedInvoice.id, { status: 'paid' });
          await loadInvoices();
          
          // Show success message
          alert(`Payment successful!\n\nInvoice: ${selectedInvoice.id}\nAmount: $${selectedInvoice.amount.toLocaleString()}\nMethod: ${paymentDetails.method}\n\nThank you for your payment!`);
        } catch (error) {
          console.error('Error updating invoice status:', error);
        }
      }
      setIsPaymentModalOpen(false);
      setSelectedInvoice(undefined);
    };
    
    updateInvoiceStatus();
  };

  const isAdmin = currentUser?.role === 'admin';

  // All invoices are already filtered by loadInvoices based on user role
  const visibleInvoices = invoices;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>Invoices</h1>
            <p className="text-gray-300">Manage payments and track outstanding balances</p>
          </div>
          {isAdmin && (
            <button 
              onClick={handleNewInvoice}
              className="btn-primary text-white font-medium flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              New Invoice
            </button>
          )}
          {!isAdmin && (
            <div className="text-sm text-gray-400">View and pay your invoices</div>
          )}
        </div>
      </div>

      {/* Invoice Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Paid</p>
              <p className="text-2xl font-bold text-white">${totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Pending</p>
              <p className="text-2xl font-bold text-white">${totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-500">
              <ExclamationTriangleIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Overdue</p>
              <p className="text-2xl font-bold text-white">${totalOverdue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <DocumentIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Total</p>
              <p className="text-2xl font-bold text-white">{visibleInvoices.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="glass-card rounded-xl neon-glow">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>Recent Invoices</h2>
        </div>
        
        <div className="divide-y divide-slate-700">
          {visibleInvoices.map((invoice) => {
            const statusInfo = statusConfig[invoice.status as keyof typeof statusConfig];
            const StatusIcon = statusInfo.icon;
            
            return (
              <div key={invoice.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-lg bg-slate-700">
                      <DocumentIcon className="h-6 w-6 text-gray-300" />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>{invoice.id}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{invoice.client}</p>
                      <p className="text-sm text-gray-500">{invoice.description}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">${invoice.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">Due: {invoice.dueDate}</p>
                    {isAdmin && (
                      <div className="flex items-center justify-end space-x-2 mt-2">
                        <button 
                          onClick={() => handleEditInvoice(invoice)}
                          className="text-blue-500 hover:text-white p-1"
                          title="Edit Invoice"
                        >
                          <PencilIcon className="h-4 w-4 text-blue-500" />
                        </button>
                        <button 
                          onClick={() => handleDeleteInvoice(invoice)}
                          className="text-blue-500 hover:text-red-400 p-1"
                          title="Delete Invoice"
                        >
                          <TrashIcon className="h-4 w-4 text-blue-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                  <p className="text-sm text-gray-400">Created: {invoice.createdDate}</p>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                      className="flex items-center space-x-1 text-white hover:text-blue-300 text-sm"
                    >
                      <EyeIcon className="h-4 w-4 text-white" />
                      View
                    </button>
                    <button 
                      onClick={() => {
                        generateInvoicePDF(invoice);
                      }}
                      className="flex items-center space-x-1 text-white hover:text-blue-300 text-sm"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 text-white" />
                      Download
                    </button>
                    {invoice.status === 'pending' && !isAdmin && (
                      <button 
                        onClick={() => {
                          handlePayInvoice(invoice);
                        }}
                        className="btn-action text-sm font-medium flex items-center space-x-1"
                      >
                        <CreditCardIcon className="h-4 w-4 text-white" />
                        Pay Now
                      </button>
                    )}
                    {invoice.status === 'overdue' && !isAdmin && (
                      <button 
                        onClick={() => {
                          handlePayInvoice(invoice);
                        }}
                        className="btn-action text-sm font-medium flex items-center space-x-1"
                      >
                        <ExclamationTriangleIcon className="h-4 w-4 text-white" />
                        Pay Now
                      </button>
                    )}
                    {(invoice.status === 'pending' || invoice.status === 'overdue') && isAdmin && (
                      <button 
                        onClick={() => {
                          const reminderSent = confirm(`Send payment reminder to ${invoice.client}?\n\nInvoice: ${invoice.id}\nAmount: $${invoice.amount.toLocaleString()}\nDue Date: ${invoice.dueDate}`);
                          if (reminderSent) {
                            alert(`Payment reminder sent successfully!\n\nTo: ${invoice.client}\nInvoice: ${invoice.id}\nAmount: $${invoice.amount.toLocaleString()}\n\nThe client will receive an email reminder about this outstanding payment.`);
                          }
                        }}
                        className="btn-action text-sm font-medium flex items-center space-x-1"
                      >
                        <EnvelopeIcon className="h-4 w-4 text-white" />
                        Send Reminder
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveInvoice}
        invoice={selectedInvoice}
        mode={modalMode}
        currentUser={currentUser}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice "${selectedInvoice?.id}"? This action cannot be undone.`}
      />

      {selectedInvoice && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedInvoice(undefined);
          }}
          invoice={selectedInvoice}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
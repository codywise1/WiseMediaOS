import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService, Invoice as InvoiceRecord, UserRole } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
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
import { useToast } from '../contexts/ToastContext';
import InvoiceModal from './InvoiceModal';
import ConfirmDialog from './ConfirmDialog';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import PaymentModal from './PaymentModal';

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface InvoicesProps {
  currentUser: User | null;
}

type InvoiceView = Omit<InvoiceRecord, 'client'> & {
  createdDate: string;
  dueDate: string;
  client: string;
  clientRecord?: InvoiceRecord['client'];
};

const statusConfig = {
  paid: { color: 'bg-white/30 text-white', icon: CheckCircleIcon },
  pending: { color: 'bg-[#3aa3eb]/30 text-[#3aa3eb]', icon: ClockIcon },
  unpaid: { color: 'bg-orange-500/30 text-orange-400', icon: ClockIcon },
  overdue: { color: 'bg-red-900/30 text-red-400', icon: ExclamationTriangleIcon },
  draft: { color: 'bg-gray-900/30 text-gray-400', icon: DocumentIcon },
  ready: { color: 'bg-[#3aa3eb]/30 text-[#3aa3eb]', icon: CheckCircleIcon },
  void: { color: 'bg-red-500/30 text-red-400', icon: TrashIcon },
};

export default function Invoices({ currentUser }: InvoicesProps) {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceView | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    loadInvoices();
  }, [currentUser?.id, currentUser?.role]);

  const loadInvoices = async () => {
    try {
      if (invoices.length === 0) {
        setLoading(true);
      }
      let data: InvoiceRecord[] = [];

      if (currentUser?.role === 'admin') {
        data = await invoiceService.getAll();
      } else if (currentUser) {
        // For clients, rely on RLS to return only their invoices.
        // currentUser.id is the auth user id and does not match invoices.client_id (clients.id).
        data = await invoiceService.getForCurrentUser();
      }

      // Transform data to match component interface
      const transformedInvoices: InvoiceView[] = data.map(invoice => ({
        ...invoice,
        clientRecord: invoice.client,
        client: invoice.client?.name || 'Unknown Client',
        createdDate: invoice.created_at || '',
        dueDate: invoice.due_date || ''
      }));

      setInvoices(transformedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
      if (invoices.length === 0) {
        setInvoices([]);
      }
      toastError('Error loading invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalPending = invoices.filter(inv => inv.status === 'pending' || inv.status === 'unpaid' || inv.status === 'ready').reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdue = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);

  const handleNewInvoice = () => {
    setSelectedInvoice(undefined);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditInvoice = (invoice: InvoiceView) => {
    setSelectedInvoice(invoice);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteInvoice = (invoice: InvoiceView) => {
    setSelectedInvoice(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveInvoice = (invoiceData: any) => {
    const saveInvoice = async () => {
      try {
        // Transform data for API
        const payload = {
          client_id: invoiceData.client_id,
          amount: invoiceData.amount,
          description: invoiceData.description,
          status: invoiceData.status,
          due_date: invoiceData.dueDate
        };

        if (modalMode === 'create') {
          await invoiceService.create(payload);
          toastSuccess('Invoice created successfully.');
        } else if (selectedInvoice) {
          await invoiceService.update(selectedInvoice.id, payload as any);
          toastSuccess('Invoice updated successfully.');
        }

        // Reload invoices
        await loadInvoices();
      } catch (error) {
        console.error('Error saving invoice:', error);
        toastError('Error saving invoice. Please try again.');
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
        toastError('Error deleting invoice. Please try again.');
      }
    }
  };

  const handlePayInvoice = (invoice: InvoiceView) => {
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

  const handlePaymentSuccess = async (_paymentDetails: any) => {
    // Refresh invoices in the background; the PaymentModal already shows a styled confirmation
    try {
      await loadInvoices();
    } catch (error) {
      console.error('Error refreshing invoices:', error);
    }
    // Modal will close itself via handleSuccessClose after user clicks "Close"
  };

  const isAdmin = currentUser?.role === 'admin';

  // All invoices are already filtered by loadInvoices based on user role
  const visibleInvoices = invoices;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Invoices</h1>
            <p className="text-gray-300">Manage payments and track outstanding balances</p>
          </div>
          {isAdmin && (
            <button
              onClick={handleNewInvoice}
              className="btn-primary text-white font-medium flex items-center justify-center space-x-2 shrink-glow-button shrink-0 w-full sm:w-auto"
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
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Recent Invoices</h2>
        </div>

        <div className="divide-y divide-slate-700">
          {visibleInvoices.map((invoice) => {
            const statusInfo = statusConfig[invoice.status as keyof typeof statusConfig] || statusConfig.draft;
            const StatusIcon = statusInfo.icon;

            return (
              <div key={invoice.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col gap-4 min-w-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-700">
                      <DocumentIcon className="h-6 w-6 text-gray-300" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-center sm:gap-3">
                        <h3
                          className="text-lg font-bold text-white min-w-0 truncate"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        >
                          {invoice.client}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{invoice.description}</p>

                      {/* Proposal Context Banner */}
                      {invoice.proposal_id && (
                        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs">
                          <div className="flex items-center gap-2">
                            <DocumentIcon className="h-3 w-3 text-blue-400" />
                            <span className="text-blue-300">
                              {invoice.locked_from_send
                                ? 'Linked to proposal (awaiting approval)'
                                : invoice.activation_source === 'proposal_approval'
                                  ? 'Activated from approved proposal'
                                  : 'Linked to proposal'}
                            </span>
                            <button
                              onClick={() => navigate(`/proposals/${invoice.proposal_id}`)}
                              className="text-blue-400 hover:text-blue-300 ml-auto"
                            >
                              View Proposal →
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          className="text-blue-500 hover:text-white p-1 shrink-glow-button"
                          title="View Invoice"
                          aria-label="View Invoice"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            generateInvoicePDF(invoice);
                          }}
                          className="text-blue-500 hover:text-white p-1 shrink-glow-button"
                          title="Download Invoice"
                          aria-label="Download Invoice"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleEditInvoice(invoice)}
                              className="text-blue-500 hover:text-white p-1 shrink-glow-button"
                              title="Edit Invoice"
                              aria-label="Edit Invoice"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="text-blue-500 hover:text-red-400 p-1 shrink-glow-button"
                              title="Delete Invoice"
                              aria-label="Delete Invoice"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-bold text-white">${invoice.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">Due: {invoice.dueDate ? formatAppDate(invoice.dueDate) : '—'}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-400">Created: {invoice.createdDate ? formatAppDate(invoice.createdDate) : '—'}</p>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 w-full sm:w-auto">
                    {invoice.status === 'pending' && !isAdmin && (
                      <button
                        onClick={() => {
                          handlePayInvoice(invoice);
                        }}
                        className="btn-action text-sm font-medium flex items-center justify-center space-x-1 shrink-glow-button w-full sm:w-auto"
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
                        className="btn-action text-sm font-medium flex items-center justify-center space-x-1 shrink-glow-button w-full sm:w-auto"
                      >
                        <ExclamationTriangleIcon className="h-4 w-4 text-white" />
                        Pay Now
                      </button>
                    )}
                    {(invoice.status === 'pending' || invoice.status === 'overdue') && isAdmin && (
                      <button
                        onClick={() => {
                          toastSuccess(
                            `Payment reminder queued for ${invoice.client} ($${invoice.amount.toLocaleString()} · Due ${invoice.dueDate}).`
                          );
                        }}
                        className="btn-action text-sm font-medium flex items-center justify-center space-x-1 shrink-glow-button w-full sm:w-auto"
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
        message={
          selectedInvoice
            ? `Are you sure you want to delete the invoice for "${selectedInvoice.client}" ($${selectedInvoice.amount.toLocaleString()})? This action cannot be undone.`
            : 'Are you sure you want to delete this invoice? This action cannot be undone.'
        }
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
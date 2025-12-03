import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clientService, invoiceService, Client, Invoice } from '../lib/supabase';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  BanknotesIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import InvoiceModal from './InvoiceModal';
import ConfirmDialog from './ConfirmDialog';
import { format } from 'date-fns';

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
}

interface InvoiceDetailProps {
  currentUser: User | null;
}

export default function InvoiceDetail({ currentUser }: InvoiceDetailProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (id) {
      loadInvoiceData();
    }
  }, [id]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      const [invoicesData, clientsData] = await Promise.all([
        invoiceService.getAll(),
        clientService.getAll()
      ]);

      const foundInvoice = invoicesData.find(inv => inv.id === id);
      if (foundInvoice) {
        setInvoice(foundInvoice);
        const foundClient = clientsData.find(c => c.id === foundInvoice.client_id);
        setClient(foundClient || null);
      } else {
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Error loading invoice data:', error);
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInvoice = async (invoiceData: any) => {
    try {
      await invoiceService.update(id!, invoiceData);
      await loadInvoiceData();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Error updating invoice. Please try again.');
    }
  };

  const handleDeleteInvoice = async () => {
    try {
      await invoiceService.delete(id!);
      navigate('/invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Error deleting invoice. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-600/20 text-green-300 border-green-600/30';
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30';
      case 'overdue':
        return 'bg-red-600/20 text-red-300 border-red-600/30';
      case 'draft':
        return 'bg-gray-600/20 text-gray-300 border-gray-600/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-600/30';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!invoice) return null;

  const daysUntilDue = getDaysUntilDue(invoice.due_date);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <button
        onClick={() => navigate('/invoices')}
        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        <span>Back to Invoices</span>
      </button>

      <div className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl bg-gradient-to-br from-[#3aa3eb] to-[#2d8bc7] flex items-center justify-center">
              <DocumentTextIcon className="h-8 w-8 md:h-12 md:w-12 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                Invoice #{invoice.id}
              </h1>
              <p className="text-base md:text-xl text-gray-300">{invoice.description}</p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center space-x-3">
              <span className={`px-4 py-2 rounded-xl text-sm font-medium border ${getStatusColor(invoice.status)}`}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <PencilIcon className="h-5 w-5 text-white" />
              </button>
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="p-3 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition-colors"
              >
                <TrashIcon className="h-5 w-5 text-red-400" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/30 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CurrencyDollarIcon className="h-4 w-4 text-[#3aa3eb]" />
              <span className="text-xs text-gray-400">Amount</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-white">
              ${invoice.amount.toLocaleString()}
            </p>
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CalendarIcon className="h-4 w-4 text-[#3aa3eb]" />
              <span className="text-xs text-gray-400">Due Date</span>
            </div>
            <p className="text-sm md:text-base font-medium text-white">
              {format(new Date(invoice.due_date), 'MMM d, yyyy')}
            </p>
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <ClockIcon className="h-4 w-4 text-[#3aa3eb]" />
              <span className="text-xs text-gray-400">Days Until Due</span>
            </div>
            <p className={`text-xl md:text-2xl font-bold ${
              daysUntilDue < 0 ? 'text-red-400' :
              daysUntilDue < 7 ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} overdue` : daysUntilDue}
            </p>
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BanknotesIcon className="h-4 w-4 text-[#3aa3eb]" />
              <span className="text-xs text-gray-400">Status</span>
            </div>
            <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-medium border ${getStatusColor(invoice.status)}`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {client && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <UserIcon className="h-6 w-6 mr-2 text-[#3aa3eb]" />
                Client Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#3aa3eb] to-[#2d8bc7] flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {(client.company || client.name).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{client.company || client.name}</p>
                    <p className="text-sm text-gray-400">{client.name}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Email</p>
                      <a href={`mailto:${client.email}`} className="text-white hover:text-[#3aa3eb] transition-colors">
                        {client.email}
                      </a>
                    </div>
                    {client.phone && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Phone</p>
                        <a href={`tel:${client.phone}`} className="text-white hover:text-[#3aa3eb] transition-colors">
                          {client.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="flex-1 btn-secondary py-2 rounded-lg text-sm"
                  >
                    View Client Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <DocumentTextIcon className="h-6 w-6 mr-2 text-[#3aa3eb]" />
              Invoice Details
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Description</p>
                <p className="text-white">{invoice.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Created</p>
                  <p className="text-white">{format(new Date(invoice.created_at), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Last Updated</p>
                  <p className="text-white">{format(new Date(invoice.updated_at), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {isAdmin && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
              <div className="space-y-3">
                <button className="w-full btn-primary py-3 rounded-xl flex items-center justify-center space-x-2">
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  <span>Download PDF</span>
                </button>
                <button className="w-full btn-secondary py-3 rounded-xl flex items-center justify-center space-x-2">
                  <EnvelopeIcon className="h-5 w-5" />
                  <span>Send to Client</span>
                </button>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full bg-slate-800/50 hover:bg-slate-700/50 text-white py-3 rounded-xl transition-colors"
                >
                  Edit Invoice
                </button>
              </div>
            </div>
          )}

          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white font-medium">${invoice.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-white/10">
                <span className="text-lg font-bold text-white">Total</span>
                <span className="text-lg font-bold text-white">${invoice.amount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <>
          <InvoiceModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleSaveInvoice}
            invoice={invoice}
            mode="edit"
          />

          <ConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={handleDeleteInvoice}
            title="Delete Invoice"
            message={`Are you sure you want to delete invoice #${invoice.id}? This action cannot be undone.`}
          />
        </>
      )}
    </div>
  );
}

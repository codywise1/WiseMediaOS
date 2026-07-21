import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { clientService, projectService, invoiceService, Client, Project, Invoice, UserRole } from '../lib/supabase';
import { formatToISODate } from '../lib/dateFormat';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  XMarkIcon,
  LinkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Partial<Invoice>) => void;
  invoice?: Invoice;
  mode: 'create' | 'edit';
  currentUser?: { role: UserRole } | null;
}

type Status = 'draft' | 'pending' | 'paid' | 'overdue';

const STATUS_META: Record<Status, { label: string; color: string; dot: string }> = {
  draft: { label: 'Draft', color: 'text-gray-400', dot: 'bg-gray-500' },
  pending: { label: 'Pending', color: 'text-amber-400', dot: 'bg-amber-500' },
  paid: { label: 'Paid', color: 'text-emerald-400', dot: 'bg-emerald-500' },
  overdue: { label: 'Overdue', color: 'text-red-400', dot: 'bg-red-500' },
};

export default function InvoiceModal({ isOpen, onClose, onSave, invoice, mode, currentUser }: InvoiceModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    amount: '',
    dueDate: '',
    issuedDate: '',
    paidDate: '',
    status: 'draft' as Status,
    description: ''
  });
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadClients();
      loadProjects();
    }
  }, [currentUser]);

  const loadClients = async () => {
    try {
      setClients(await clientService.getAll());
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadProjects = async () => {
    try {
      setProjects(await projectService.getAll());
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  useEffect(() => {
    if (invoice && mode === 'edit') {
      setFormData({
        client_id: invoice.client_id || '',
        client_name: invoice.client?.name || invoice.client?.company || '',
        amount: invoice.amount.toString(),
        dueDate: invoice.due_date ? formatToISODate(invoice.due_date) : '',
        issuedDate: invoice.issued_at ? formatToISODate(invoice.issued_at) : '',
        paidDate: invoice.paid_at ? formatToISODate(invoice.paid_at) : '',
        status: (['draft', 'pending', 'paid', 'overdue'].includes(invoice.status) ? invoice.status : 'draft') as Status,
        description: invoice.description
      });
      setLinkedProjectIds((invoice as any).project_ids || (invoice.project_id ? [invoice.project_id] : []));
      setSyncState('idle');
    } else {
      setFormData({
        client_id: '',
        client_name: '',
        amount: '',
        dueDate: '',
        issuedDate: '',
        paidDate: '',
        status: 'draft',
        description: ''
      });
      setLinkedProjectIds([]);
      setSyncState('idle');
    }
  }, [invoice, mode, isOpen]);

  // Filter projects by selected client
  const clientProjects = formData.client_id
    ? projects.filter(p => p.client_id === formData.client_id)
    : projects;

  // Live-sync the project title to the projects table (debounced)
  const syncProjectTitle = useCallback(async (projectId: string, newTitle: string) => {
    if (!projectId || !newTitle.trim()) {
      setSyncState('idle');
      return;
    }
    setSyncState('syncing');
    try {
      await projectService.update(projectId, { name: newTitle.trim() });
      setSyncState('synced');
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: newTitle.trim() } : p));
      setTimeout(() => setSyncState('idle'), 2000);
    } catch (error) {
      console.error('Error syncing project title:', error);
      setSyncState('error');
      setTimeout(() => setSyncState('idle'), 3000);
    }
  }, []);

  const handleProjectTitleChange = (value: string) => {
    setFormData(prev => ({ ...prev, projectTitle: value }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (formData.project_id) {
      debounceRef.current = setTimeout(() => {
        syncProjectTitle(formData.project_id, value);
      }, 800);
    }
  };

  const handleProjectToggle = (projectId: string) => {
    setLinkedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const invoiceData = {
      client_id: formData.client_id,
      project_ids: linkedProjectIds,
      amount: parseInt(formData.amount),
      description: formData.description,
      due_date: formData.dueDate,
      issued_at: formData.issuedDate || null,
      paid_at: formData.status === 'paid' ? (formData.paidDate || new Date().toISOString()) : (formData.paidDate || null),
      status: formData.status
    };
    onSave(invoiceData as Partial<Invoice>);
    setIsSubmitting(false);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClientChange = (clientId: string) => {
    setFormData(prev => ({
      ...prev,
      client_id: clientId,
    }));
    setLinkedProjectIds([]);
    setSyncState('idle');
  };

  const statusMeta = STATUS_META[formData.status];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-3xl" hideHeader>
      <form onSubmit={handleSubmit} className="flex flex-col h-[85vh]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-sm font-medium text-gray-400">
              {mode === 'create' ? 'New Invoice' : 'Edit Invoice'}
            </span>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !formData.amount || !formData.client_id}
            className="px-4 py-1.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 space-y-6">
          {/* Linked projects — multi-select */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="h-3.5 w-3.5 text-gray-500" />
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Linked Projects {linkedProjectIds.length > 0 && <span className="text-[#3aa3eb] normal-case font-medium">· {linkedProjectIds.length} selected</span>}
              </label>
            </div>
            {currentUser?.role === 'admin' ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar rounded-lg border border-white/10 bg-slate-900/40 p-2">
                {clientProjects.length === 0 ? (
                  <p className="text-sm text-gray-600 px-3 py-2">
                    {formData.client_id ? 'No projects for this client yet.' : 'Select a client first.'}
                  </p>
                ) : (
                  clientProjects.map((p) => {
                    const checked = linkedProjectIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${checked ? 'bg-[#3aa3eb]/10 border border-[#3aa3eb]/30' : 'hover:bg-white/5 border border-transparent'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleProjectToggle(p.id)}
                          className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#3aa3eb] focus:ring-[#3aa3eb]/40"
                        />
                        <span className={`text-sm font-medium ${checked ? 'text-white' : 'text-gray-300'}`}>{p.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-300">
                {linkedProjectIds.length > 0
                  ? linkedProjectIds.map(id => projects.find(p => p.id === id)?.name).filter(Boolean).join(', ')
                  : 'No linked projects'}
              </p>
            )}
          </div>

          {/* Amount — large, prominent */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-500 font-bold">$</span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0"
                required
                className="form-input w-full pl-10 pr-4 py-3 rounded-lg text-2xl font-bold text-white"
              />
            </div>
          </div>

          {/* Client + Status row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Client</label>
              {currentUser?.role === 'admin' ? (
                <select
                  name="client_id"
                  value={formData.client_id}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="form-input w-full px-4 py-2.5 rounded-lg text-sm"
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}{client.company && ` (${client.company})`}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  className="form-input w-full px-4 py-2.5 rounded-lg text-sm"
                  placeholder="Client name"
                  required
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Status</label>
              <div className="relative">
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-input w-full px-4 py-2.5 rounded-lg text-sm appearance-none pr-10"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${statusMeta.dot}`} />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Date Issued</label>
              <DatePicker
                selected={formData.issuedDate ? new Date(formData.issuedDate + 'T00:00:00') : null}
                onChange={(date: Date | null) => {
                  const iso = date ? formatToISODate(date) : '';
                  setFormData(prev => ({ ...prev, issuedDate: iso }));
                }}
                dateFormat="MMM. dd, yyyy"
                placeholderText="Not issued yet"
                className="form-input w-full px-4 py-2.5 rounded-lg text-sm"
                isClearable
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Due Date</label>
              <DatePicker
                selected={formData.dueDate ? new Date(formData.dueDate + 'T00:00:00') : null}
                onChange={(date: Date | null) => {
                  const iso = date ? formatToISODate(date) : '';
                  setFormData(prev => ({ ...prev, dueDate: iso }));
                }}
                dateFormat="MMM. dd, yyyy"
                placeholderText="Select date"
                className="form-input w-full px-4 py-2.5 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          {/* Paid date — only when status is paid */}
          {formData.status === 'paid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Date Paid</label>
                <DatePicker
                  selected={formData.paidDate ? new Date(formData.paidDate + 'T00:00:00') : null}
                  onChange={(date: Date | null) => {
                    const iso = date ? formatToISODate(date) : '';
                    setFormData(prev => ({ ...prev, paidDate: iso }));
                  }}
                  dateFormat="MMM. dd, yyyy"
                  placeholderText="Today"
                  className="form-input w-full px-4 py-2.5 rounded-lg text-sm"
                  isClearable
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="form-input w-full px-4 py-2.5 rounded-lg text-sm resize-none"
              placeholder="What is this invoice for?"
              required
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

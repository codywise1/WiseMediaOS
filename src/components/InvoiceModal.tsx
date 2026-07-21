import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { clientService, projectService, invoiceService, Client, Project, Invoice, UserRole } from '../lib/supabase';
import { formatToISODate } from '../lib/dateFormat';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Link as LinkIcon } from 'lucide-react';

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

const labelCls = 'block text-sm font-medium text-gray-300 mb-2';
const inputCls = 'form-input w-full px-4 py-3 rounded-xl text-sm';

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
      setFormData({ client_id: '', client_name: '', amount: '', dueDate: '', issuedDate: '', paidDate: '', status: 'draft', description: '' });
      setLinkedProjectIds([]);
      setSyncState('idle');
    }
  }, [invoice, mode, isOpen]);

  const clientProjects = formData.client_id
    ? projects.filter(p => p.client_id === formData.client_id)
    : projects;

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
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
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
    setFormData(prev => ({ ...prev, client_id: clientId }));
    setLinkedProjectIds([]);
    setSyncState('idle');
  };

  const statusMeta = STATUS_META[formData.status];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'New Invoice' : 'Edit Invoice'}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="submit"
            form="invoice-form"
            disabled={isSubmitting || !formData.amount || !formData.client_id}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Invoice' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form id="invoice-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Linked projects */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="h-3.5 w-3.5 text-gray-500" />
            <label className={labelCls}>
              Linked Projects
              {linkedProjectIds.length > 0 && <span className="text-[#3aa3eb] ml-1">· {linkedProjectIds.length} selected</span>}
            </label>
          </div>
          {currentUser?.role === 'admin' ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar rounded-xl border border-white/10 bg-slate-900/40 p-2">
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

        {/* Amount */}
        <div>
          <label className={labelCls}>Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-500 font-bold">$</span>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0"
              required
              className="form-input w-full pl-10 pr-4 py-3 rounded-xl text-2xl font-bold text-white"
            />
          </div>
        </div>

        {/* Client + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Client</label>
            {currentUser?.role === 'admin' ? (
              <select
                name="client_id"
                value={formData.client_id}
                onChange={(e) => handleClientChange(e.target.value)}
                className={inputCls}
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
                className={inputCls}
                placeholder="Client name"
                required
              />
            )}
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <div className="relative">
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={`${inputCls} appearance-none pr-10`}
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
            <label className={labelCls}>Date Issued</label>
            <DatePicker
              selected={formData.issuedDate ? new Date(formData.issuedDate + 'T00:00:00') : null}
              onChange={(date: Date | null) => {
                const iso = date ? formatToISODate(date) : '';
                setFormData(prev => ({ ...prev, issuedDate: iso }));
              }}
              dateFormat="MMM. dd, yyyy"
              placeholderText="Not issued yet"
              className={inputCls}
              isClearable
            />
          </div>
          <div>
            <label className={labelCls}>Due Date</label>
            <DatePicker
              selected={formData.dueDate ? new Date(formData.dueDate + 'T00:00:00') : null}
              onChange={(date: Date | null) => {
                const iso = date ? formatToISODate(date) : '';
                setFormData(prev => ({ ...prev, dueDate: iso }));
              }}
              dateFormat="MMM. dd, yyyy"
              placeholderText="Select date"
              className={inputCls}
              required
            />
          </div>
        </div>

        {/* Paid date — full width, only when status is paid */}
        {formData.status === 'paid' && (
          <div>
            <label className={labelCls}>Date Paid</label>
            <DatePicker
              selected={formData.paidDate ? new Date(formData.paidDate + 'T00:00:00') : null}
              onChange={(date: Date | null) => {
                const iso = date ? formatToISODate(date) : '';
                setFormData(prev => ({ ...prev, paidDate: iso }));
              }}
              dateFormat="MMM. dd, yyyy"
              placeholderText="Today"
              className={inputCls}
              isClearable
            />
          </div>
        )}

        {/* Description */}
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder="What is this invoice for?"
            required
          />
        </div>
      </form>
    </Modal>
  );
}

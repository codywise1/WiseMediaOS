import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { clientService, projectService, invoiceService, Client, Project, Invoice, UserRole } from '../lib/supabase';
import { proposalService, Proposal } from '../lib/proposalService';
import { formatToISODate } from '../lib/dateFormat';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Link as LinkIcon, FileText } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Partial<Invoice>) => void;
  invoice?: Invoice;
  mode: 'create' | 'edit';
  currentUser?: { role: UserRole } | null;
}

type Status = 'draft' | 'pending' | 'paid' | 'overdue' | 'void';

const STATUS_META: Record<Status, { label: string; color: string; dot: string }> = {
  draft: { label: 'Draft', color: 'text-gray-400', dot: 'bg-gray-500' },
  pending: { label: 'Pending', color: 'text-amber-400', dot: 'bg-amber-500' },
  paid: { label: 'Paid', color: 'text-emerald-400', dot: 'bg-emerald-500' },
  overdue: { label: 'Overdue', color: 'text-red-400', dot: 'bg-red-500' },
  void: { label: 'Void', color: 'text-slate-400', dot: 'bg-slate-600' },
};

const labelCls = 'block text-sm font-medium text-gray-300 mb-2';
const inputCls = 'form-input w-full px-4 py-3 rounded-xl text-sm';

export default function InvoiceModal({ isOpen, onClose, onSave, invoice, mode, currentUser }: InvoiceModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    client_name: '',
    amount: '',
    dueDate: '',
    issuedDate: '',
    paidDate: '',
    status: 'draft' as Status,
    voidReason: '',
    description: '',
    proposal_id: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadClients();
      loadProjects();
      loadProposals();
    }
  }, [currentUser]);

  const loadClients = async () => {
    try { setClients(await clientService.getAll()); }
    catch (e) { console.error('Error loading clients:', e); }
  };

  const loadProjects = async () => {
    try { setProjects(await projectService.getAll()); }
    catch (e) { console.error('Error loading projects:', e); }
  };

  const loadProposals = async () => {
    try { setProposals(await proposalService.getAll()); }
    catch (e) { console.error('Error loading proposals:', e); }
  };

  useEffect(() => {
    if (invoice && mode === 'edit') {
      setFormData({
        title: (invoice as any).title || '',
        client_id: invoice.client_id || '',
        client_name: invoice.client?.name || invoice.client?.company || '',
        amount: invoice.amount.toString(),
        dueDate: invoice.due_date ? formatToISODate(invoice.due_date) : '',
        issuedDate: invoice.issued_at ? formatToISODate(invoice.issued_at) : '',
        paidDate: invoice.paid_at ? formatToISODate(invoice.paid_at) : '',
        status: (['draft', 'pending', 'paid', 'overdue', 'void'].includes(invoice.status) ? invoice.status : 'draft') as Status,
        voidReason: (invoice as any).void_reason || '',
        description: invoice.description,
        proposal_id: invoice.proposal_id || (invoice as any).proposal_id || '',
      });
      setLinkedProjectIds((invoice as any).project_ids || (invoice.project_id ? [invoice.project_id] : []));
    } else {
      setFormData({ title: '', client_id: '', client_name: '', amount: '', dueDate: '', issuedDate: '', paidDate: '', status: 'draft', voidReason: '', description: '', proposal_id: '' });
      setLinkedProjectIds([]);
    }
  }, [invoice, mode, isOpen]);

  const clientProjects = formData.client_id
    ? projects.filter(p => p.client_id === formData.client_id)
    : projects;

  const clientProposals = formData.client_id
    ? proposals.filter(p => p.client_id === formData.client_id)
    : proposals;

  const handleProjectToggle = (projectId: string) => {
    setLinkedProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const handleProposalChange = (proposalId: string) => {
    setFormData(prev => ({ ...prev, proposal_id: proposalId }));
    if (proposalId) {
      const proposal = proposals.find(p => p.id === proposalId);
      if (proposal) {
        // Auto-fill title from proposal title if empty, and amount from proposal value
        setFormData(prev => ({
          ...prev,
          proposal_id: proposalId,
          title: prev.title || proposal.title,
          client_id: prev.client_id || proposal.client_id,
          amount: prev.amount || (proposal.value ? (proposal.value / 100).toString() : prev.amount),
        }));
        // Auto-link the proposal's project if it has one
        if ((proposal as any).project_id && !linkedProjectIds.includes((proposal as any).project_id)) {
          setLinkedProjectIds(prev => [...prev, (proposal as any).project_id]);
        }
      }
    }
  };

  const handleClientChange = (clientId: string) => {
    setFormData(prev => ({ ...prev, client_id: clientId, proposal_id: '' }));
    setLinkedProjectIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const invoiceData = {
      title: formData.title.trim(),
      client_id: formData.client_id,
      proposal_id: formData.proposal_id || null,
      project_ids: linkedProjectIds,
      amount: parseInt(formData.amount),
      description: formData.description,
      due_date: formData.dueDate,
      issued_at: formData.issuedDate || null,
      paid_at: formData.status === 'paid' ? (formData.paidDate || new Date().toISOString()) : (formData.paidDate || null),
      void_reason: formData.status === 'void' ? (formData.voidReason.trim() || null) : null,
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
        {/* Title */}
        <div>
          <label className={labelCls}>Invoice Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={inputCls}
            placeholder="e.g. Website Design — Landing Page Build"
            required
          />
          <p className="text-xs text-gray-500 mt-1.5">Shown as the invoice name. Use the service or proposal name.</p>
        </div>

        {/* Linked proposal */}
        {currentUser?.role === 'admin' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-3.5 w-3.5 text-gray-500" />
              <label className={labelCls}>
                Linked Proposal
                {formData.proposal_id && <span className="text-emerald-400 ml-1">· Linked</span>}
              </label>
            </div>
            <select
              name="proposal_id"
              value={formData.proposal_id}
              onChange={(e) => handleProposalChange(e.target.value)}
              className={inputCls}
            >
              <option value="">No linked proposal</option>
              {clientProposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} · ${(p.value / 100).toLocaleString()} · {p.status}
                </option>
              ))}
            </select>
            {formData.proposal_id && (
              <p className="text-xs text-emerald-400/70 mt-1.5">Amount and title auto-filled from proposal. Adjust as needed.</p>
            )}
          </div>
        )}

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
                <option value="void">Void</option>
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

        {/* Void reason — full width, only when status is void */}
        {formData.status === 'void' && (
          <div>
            <label className={labelCls}>Reason</label>
            <input
              type="text"
              name="voidReason"
              value={formData.voidReason}
              onChange={handleChange}
              className={inputCls}
              placeholder="e.g. Voided — client cancelled the project"
              required
            />
            <p className="text-xs text-gray-500 mt-1.5">Required. Explains why this invoice was voided. The void timestamp is stamped automatically.</p>
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
          />
        </div>
      </form>
    </Modal>
  );
}

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { clientService, Client, Invoice, UserRole } from '../lib/supabase';
import { formatToISODate } from '../lib/dateFormat';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Partial<Invoice>) => void;
  invoice?: Invoice;
  mode: 'create' | 'edit';
  currentUser?: { role: UserRole } | null;
}

export default function InvoiceModal({ isOpen, onClose, onSave, invoice, mode, currentUser }: InvoiceModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    amount: '',
    dueDate: '',
    status: 'draft',
    description: ''
  });

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadClients();
    }
  }, [currentUser]);

  const loadClients = async () => {
    try {
      const clientData = await clientService.getAll();
      setClients(clientData);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  useEffect(() => {
    if (invoice && mode === 'edit') {
      setFormData({
        client_id: invoice.client_id || '',
        client_name: invoice.client?.name || invoice.client?.company || '',
        amount: invoice.amount.toString(),
        dueDate: invoice.due_date ? formatToISODate(invoice.due_date) : '',
        status: invoice.status,
        description: invoice.description
      });
    } else {
      setFormData({
        client_id: '',
        client_name: '',
        amount: '',
        dueDate: '',
        status: 'draft',
        description: ''
      });
    }
  }, [invoice, mode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Find client name for display
    const selectedClient = clients.find(c => c.id === formData.client_id);

    const invoiceData = {
      client_id: formData.client_id,
      amount: parseInt(formData.amount),
      description: formData.description,
      due_date: formData.dueDate,
      status: formData.status as 'draft' | 'pending' | 'paid' | 'overdue'
    };
    onSave(invoiceData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'create' ? 'Create New Invoice' : 'Edit Invoice'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Client</label>
            {currentUser?.role === 'admin' ? (
              <select
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                required
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.company && `(${client.company})`}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="Client name"
                required
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Amount ($)</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
            <DatePicker
              selected={formData.dueDate ? new Date(formData.dueDate + 'T00:00:00') : null}
              onChange={(date: Date | null) => {
                const iso = date ? formatToISODate(date) : '';
                setFormData(prev => ({ ...prev, dueDate: iso }));
              }}
              dateFormat="MMM. dd, yyyy"
              placeholderText="Dec. 10, 2025"
              className="form-input w-full px-4 py-3 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="form-input w-full px-4 py-3 rounded-lg"
            placeholder="Invoice description..."
            required
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary shrink-glow-button"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary shrink-glow-button"
          >
            {mode === 'create' ? 'Create Invoice' : 'Update Invoice'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
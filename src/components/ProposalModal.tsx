import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { clientService, Client } from '../lib/supabase';
import { formatToISODate } from '../lib/dateFormat';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Proposal {
  id: string;
  title: string;
  client: string;
  client_id?: string;
  value: number;
  status: string;
  createdDate: string;
  expiryDate: string;
  services: string[];
  description: string;
}

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proposal: Omit<Proposal, 'id' | 'createdDate'> | Proposal) => void;
  proposal?: Proposal;
  mode: 'create' | 'edit';
  currentUser?: { role: 'admin' | 'user' } | null;
}

export default function ProposalModal({ isOpen, onClose, onSave, proposal, mode, currentUser }: ProposalModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    client_name: '',
    value: '',
    status: 'draft',
    expiryDate: '',
    services: '',
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
    if (proposal && mode === 'edit') {
      setFormData({
        title: proposal.title,
        client_id: proposal.client_id || '',
        client_name: proposal.client || '',
        value: proposal.value.toString(),
        status: proposal.status,
        expiryDate: proposal.expiryDate ? formatToISODate(proposal.expiryDate) : '',
        services: proposal.services.join(', '),
        description: proposal.description
      });
    } else {
      setFormData({
        title: '',
        client_id: '',
        client_name: '',
        value: '',
        status: 'draft',
        expiryDate: '',
        services: '',
        description: ''
      });
    }
  }, [proposal, mode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find client name for display
    const selectedClient = clients.find(c => c.id === formData.client_id);
    
    const proposalData = {
      ...formData,
      client_id: formData.client_id,
      client: selectedClient?.name || formData.client_name,
      value: parseInt(formData.value),
      services: formData.services.split(',').map(s => s.trim()).filter(s => s),
      expiryDate: formData.expiryDate,
      ...(mode === 'edit' && proposal ? { id: proposal.id, createdDate: proposal.createdDate } : {})
    };
    onSave(proposalData);
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
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'create' ? 'Create New Proposal' : 'Edit Proposal'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
              required
            />
          </div>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Value ($)</label>
            <input
              type="number"
              name="value"
              value={formData.value}
              onChange={handleChange}
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
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Expiry Date</label>
            <DatePicker
              selected={formData.expiryDate ? new Date(formData.expiryDate) : null}
              onChange={(date: Date | null) => {
                const iso = date ? formatToISODate(date) : '';
                setFormData(prev => ({ ...prev, expiryDate: iso }));
              }}
              dateFormat="MMM. dd, yyyy"
              placeholderText="Dec. 10, 2025"
              className="form-input w-full px-4 py-3 rounded-lg"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Services (comma-separated)</label>
          <input
            type="text"
            name="services"
            value={formData.services}
            onChange={handleChange}
            className="form-input w-full px-4 py-3 rounded-lg"
            placeholder="Web Development, SEO, Design, etc."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="form-input w-full px-4 py-3 rounded-lg"
            placeholder="Proposal description..."
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
            {mode === 'create' ? 'Create Proposal' : 'Update Proposal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
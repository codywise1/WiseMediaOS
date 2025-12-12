import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created: string;
  lastUpdate: string;
  description: string;
  category: string;
}

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ticket: Omit<SupportTicket, 'id' | 'created' | 'lastUpdate'> | SupportTicket) => void;
  ticket?: SupportTicket;
  mode: 'create' | 'edit';
}

export default function SupportModal({ isOpen, onClose, onSave, ticket, mode }: SupportModalProps) {
  const [formData, setFormData] = useState({
    subject: '',
    status: 'open',
    priority: 'medium',
    description: '',
    category: 'Technical Support'
  });

  useEffect(() => {
    if (ticket && mode === 'edit') {
      setFormData({
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        description: ticket.description,
        category: ticket.category
      });
    } else {
      setFormData({
        subject: '',
        status: 'open',
        priority: 'medium',
        description: '',
        category: 'Technical Support'
      });
    }
  }, [ticket, mode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ticketData = {
      ...formData,
      ...(mode === 'edit' && ticket ? { id: ticket.id, created: ticket.created, lastUpdate: ticket.lastUpdate } : {})
    };
    onSave(ticketData);
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
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'create' ? 'Create Support Ticket' : 'Edit Support Ticket'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="form-input w-full px-4 py-3 rounded-lg"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
            >
              <option value="Technical Support">Technical Support</option>
              <option value="Bug Report">Bug Report</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Training">Training</option>
              <option value="Billing">Billing</option>
              <option value="General">General</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            className="form-input w-full px-4 py-3 rounded-lg"
            placeholder="Please describe your issue in detail..."
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
            {mode === 'create' ? 'Create Ticket' : 'Update Ticket'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
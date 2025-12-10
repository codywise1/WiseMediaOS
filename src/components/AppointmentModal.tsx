import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { clientService, Client, UserRole } from '../lib/supabase';

interface Appointment {
  id: number;
  title: string;
  client: string;
  date: string;
  time: string;
  duration: string;
  type: string;
  status: string;
  location: string;
  description: string;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Omit<Appointment, 'id'> | Appointment) => void;
  appointment?: Appointment;
  mode: 'create' | 'edit';
  currentUser?: { role: UserRole } | null;
  clients?: Client[];
}

export default function AppointmentModal({ isOpen, onClose, onSave, appointment, mode, currentUser, clients: clientsProp = [] }: AppointmentModalProps) {
  const [clients, setClients] = useState<Client[]>(clientsProp);
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    client_name: '',
    date: '',
    time: '',
    duration: '30 minutes',
    type: 'video',
    status: 'confirmed',
    location: '',
    description: ''
  });

  useEffect(() => {
    setClients(clientsProp);
  }, [clientsProp]);

  useEffect(() => {
    if (currentUser?.role === 'admin' && !clientsProp.length) {
      loadClients();
    }
  }, [currentUser, clientsProp.length]);

  const loadClients = async () => {
    try {
      const clientData = await clientService.getAll();
      setClients(clientData);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  useEffect(() => {
    if (appointment && mode === 'edit') {
      setFormData({
        title: appointment.title,
        client_id: appointment.client_id || '',
        client_name: appointment.client || '',
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration,
        type: appointment.type,
        status: appointment.status,
        location: appointment.location,
        description: appointment.description
      });
    } else {
      setFormData({
        title: '',
        client_id: '',
        client_name: '',
        date: '',
        time: '',
        duration: '30 minutes',
        type: 'video',
        status: 'confirmed',
        location: '',
        description: ''
      });
    }
  }, [appointment, mode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find client name for display
    const selectedClient = clients.find(c => c.id === formData.client_id);
    
    const appointmentData = {
      ...formData,
      client_id: formData.client_id,
      client: selectedClient?.name || formData.client_name,
      date: formData.date,
      time: formData.time,
      ...(mode === 'edit' && appointment ? { id: appointment.id } : {})
    };
    onSave(appointmentData);
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
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'create' ? 'Book New Appointment' : 'Edit Appointment'}>
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Time</label>
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
            <select
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
            >
              <option value="30 minutes">30 minutes</option>
              <option value="45 minutes">45 minutes</option>
              <option value="1 hour">1 hour</option>
              <option value="1.5 hours">1.5 hours</option>
              <option value="2 hours">2 hours</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
            >
              <option value="video">Video Call</option>
              <option value="phone">Phone Call</option>
              <option value="in-person">In Person</option>
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
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="form-input w-full px-4 py-3 rounded-lg"
            placeholder="Zoom Meeting, Google Meet, Phone, etc."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="form-input w-full px-4 py-3 rounded-lg"
            placeholder="Meeting agenda or notes..."
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
          >
            {mode === 'create' ? 'Book Appointment' : 'Update Appointment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
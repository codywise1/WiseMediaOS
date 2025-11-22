import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { clientService, Client } from '../lib/supabase';

interface Project {
  id: number;
  name: string;
  client: string;
  progress: number;
  status: string;
  dueDate: string;
  team: number;
  budget: string;
  description: string;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id'> | Project) => void;
  project?: Project;
  mode: 'create' | 'edit';
  currentUser?: { role: 'admin' | 'user' } | null;
}

export default function ProjectModal({ isOpen, onClose, onSave, project, mode, currentUser }: ProjectModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    client_name: '',
    progress: 0,
    status: 'Planning',
    dueDate: '',
    team: 1,
    budget: '',
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
    if (project && mode === 'edit') {
      setFormData({
        name: project.name,
        client_id: project.client_id || '',
        client_name: project.client || '',
        progress: project.progress,
        status: project.status,
        dueDate: project.dueDate,
        team: project.team,
        budget: project.budget.replace('$', '').replace(',', ''),
        description: project.description || ''
      });
    } else {
      setFormData({
        name: '',
        client_id: '',
        client_name: '',
        progress: 0,
        status: 'Planning',
        dueDate: '',
        team: 1,
        budget: '',
        description: ''
      });
    }
  }, [project, mode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find client name for display
    const selectedClient = clients.find(c => c.id === formData.client_id);
    
    const projectData = {
      ...formData,
      client: selectedClient?.name || formData.client_name,
      budget: `$${parseInt(formData.budget).toLocaleString()}`,
      ...(mode === 'edit' && project ? { id: project.id } : {})
    };
    onSave(projectData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'progress' || name === 'team' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'create' ? 'Create New Project' : 'Edit Project'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
            >
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Progress (%)</label>
            <input
              type="number"
              name="progress"
              value={formData.progress}
              onChange={handleChange}
              min="0"
              max="100"
              className="form-input w-full px-4 py-3 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Team Size</label>
            <input
              type="number"
              name="team"
              value={formData.team}
              onChange={handleChange}
              min="1"
              className="form-input w-full px-4 py-3 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Budget ($)</label>
            <input
              type="number"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
              required
            />
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
            placeholder="Project description..."
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
            {mode === 'create' ? 'Create Project' : 'Update Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
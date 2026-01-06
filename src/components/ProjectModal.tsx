import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { clientService, Client, UserRole } from '../lib/supabase';
import { formatToISODate } from '../lib/dateFormat';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: any) => void;
  project?: any;
  mode: 'create' | 'edit';
  currentUser?: User | null;
}

export default function ProjectModal({ isOpen, onClose, onSave, project, mode, currentUser }: ProjectModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    client_name: '',
    project_type: 'Website',
    status: 'not_started',
    priority: 'Medium',
    startDate: '',
    dueDate: '',
    budget: '',
    billing_type: 'Fixed',
    invoice_link: '',
    owner: '',
    assigned_members: [] as string[],
    internal_tags: [] as string[],
    description: '',
    progress: 0,
    team: 1
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
        name: project.name || '',
        client_id: project.client_id || '',
        client_name: project.client || '',
        project_type: project.project_type || 'Website',
        status: project.status || 'not_started',
        priority: project.priority || 'Medium',
        startDate: project.startDate ? formatToISODate(project.startDate) : '',
        dueDate: project.dueDate ? formatToISODate(project.dueDate) : '',
        budget: project.budget?.toString().replace(/[$,]/g, '') || '',
        billing_type: project.billing_type || 'Fixed',
        invoice_link: project.invoice_link || '',
        owner: project.owner || '',
        assigned_members: project.assigned_members || [],
        internal_tags: project.internal_tags || [],
        description: project.description || '',
        progress: project.progress || 0,
        team: project.team || 1,
      });
    } else {
      setFormData({
        name: '',
        client_id: '',
        client_name: '',
        project_type: 'Website',
        status: 'not_started',
        priority: 'Medium',
        startDate: '',
        dueDate: '',
        budget: '',
        billing_type: 'Fixed',
        invoice_link: '',
        owner: currentUser?.name || '',
        assigned_members: [],
        internal_tags: [],
        description: '',
        progress: 0,
        team: 1,
      });
    }
  }, [project, mode, isOpen, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedClient = clients.find(c => c.id === formData.client_id);

    const projectData = {
      ...formData,
      client: selectedClient?.name || formData.client_name,
      budget: `$${parseInt(formData.budget || '0').toLocaleString()}`,
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
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basics */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Basics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Project Title *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Client *</label>
              {currentUser?.role === 'admin' ? (
                <select
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleChange}
                  className="form-input w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                  className="form-input w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Client name"
                  required
                />
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Project Type</label>
              <select
                name="project_type"
                value={formData.project_type}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="Website">Website</option>
                <option value="Landing Page">Landing Page</option>
                <option value="Web App">Web App</option>
                <option value="SEO">SEO</option>
                <option value="Brand Identity">Brand Identity</option>
                <option value="Video Editing">Video Editing</option>
                <option value="Graphic Design">Graphic Design</option>
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                required
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Timeline & Progress */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Timeline & Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
              <DatePicker
                selected={formData.startDate ? new Date(formData.startDate) : null}
                onChange={(date: Date | null) => {
                  const iso = date ? formatToISODate(date) : '';
                  setFormData(prev => ({ ...prev, startDate: iso }));
                }}
                dateFormat="MMM. dd, yyyy"
                placeholderText="Dec. 10, 2025"
                className="form-input w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
              <DatePicker
                selected={formData.dueDate ? new Date(formData.dueDate) : null}
                onChange={(date: Date | null) => {
                  const iso = date ? formatToISODate(date) : '';
                  setFormData(prev => ({ ...prev, dueDate: iso }));
                }}
                dateFormat="MMM. dd, yyyy"
                placeholderText="Dec. 10, 2025"
                className="form-input w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Progress: <span className="text-blue-400 font-bold">{formData.progress}%</span>
              </label>
              <input
                type="range"
                name="progress"
                min="0"
                max="100"
                value={formData.progress}
                onChange={handleChange}
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3aa3eb 0%, #3aa3eb ${formData.progress}%, #334155 ${formData.progress}%, #334155 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Financials */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Financials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Project Value ($)</label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="3500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Billing Type</label>
              <select
                name="billing_type"
                value={formData.billing_type}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="Fixed">Fixed</option>
                <option value="Hourly">Hourly</option>
                <option value="Retainer">Retainer</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Invoice Link</label>
              <input
                type="url"
                name="invoice_link"
                value={formData.invoice_link}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all shrink-glow-button"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shrink-glow-button"
          >
            {mode === 'create' ? 'Create Project' : 'Update Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

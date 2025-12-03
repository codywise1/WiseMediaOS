import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Client } from '../lib/supabase';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Omit<Client, 'id' | 'created_at' | 'updated_at'> | Client) => void;
  client?: Client;
  mode: 'create' | 'edit';
}

export default function ClientModal({ isOpen, onClose, onSave, client, mode }: ClientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    first_name: '',
    category: '' as '' | 'Personal Care' | 'Real Estate' | 'Art' | 'Web3' | 'Hospitality' | 'Travel Agency' | 'E-Commerce' | 'Law' | 'Investing' | 'Finance' | 'Forex',
    location: '',
    services_requested: [] as string[],
    service_type: '' as '' | 'Website' | 'Branding' | 'Retainer' | 'Ads' | 'Other',
    client_tier: '' as '' | 'Lead' | 'Active' | 'Past' | 'VIP',
    source: '' as '' | 'Referral' | 'Instagram' | 'X' | 'Repeat' | 'Other',
    status: 'active' as 'active' | 'inactive' | 'prospect' | 'archived',
    notes: '',
    website: '',
    address: ''
  });

  useEffect(() => {
    if (client && mode === 'edit') {
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone || '',
        company: client.company || '',
        first_name: client.first_name || '',
        category: client.category || '',
        location: client.location || '',
        services_requested: client.services_requested || [],
        service_type: client.service_type || '',
        client_tier: client.client_tier || '',
        source: client.source || '',
        status: client.status,
        notes: client.notes || '',
        website: client.website || '',
        address: client.address || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        first_name: '',
        category: '',
        location: '',
        services_requested: [],
        service_type: '',
        client_tier: '',
        source: '',
        status: 'active',
        notes: '',
        website: '',
        address: ''
      });
    }
    setShowMoreDetails(false);
  }, [client, mode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Name and email are required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    const clientData = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim() || null,
      company: formData.company.trim() || null,
      first_name: formData.first_name.trim() || null,
      category: formData.category || null,
      location: formData.location.trim() || null,
      services_requested: formData.services_requested.length > 0 ? formData.services_requested : null,
      service_type: formData.service_type || null,
      client_tier: formData.client_tier || null,
      source: formData.source || null,
      status: formData.status,
      notes: formData.notes.trim() || null,
      website: formData.website.trim() || null,
      address: formData.address.trim() || null,
      ...(mode === 'edit' && client ? { id: client.id, created_at: client.created_at, updated_at: client.updated_at } : {})
    };

    onSave(clientData);

    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  };

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={mode === 'create' ? 'Add New Client' : 'Edit Client'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Name & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="John Smith"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="john@company.com"
                required
              />
            </div>
          </div>

          {/* Row 2: Company & First Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Company</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="John"
              />
            </div>
          </div>

          {/* Row 2b: Category & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
              >
                <option value="">Select category...</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Art">Art</option>
                <option value="Web3">Web3</option>
                <option value="Hospitality">Hospitality</option>
                <option value="Travel Agency">Travel Agency</option>
                <option value="E-Commerce">E-Commerce</option>
                <option value="Law">Law</option>
                <option value="Investing">Investing</option>
                <option value="Finance">Finance</option>
                <option value="Forex">Forex</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="Calgary, Miami, etc."
              />
            </div>
          </div>

          {/* Row 2c: Phone & Services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Services Requested</label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                {['WordPress Website', 'SEO', 'Brand Identity', 'Video Editing', 'Graphic Design', 'Landing Page'].map(service => (
                  <label key={service} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.services_requested.includes(service)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            services_requested: [...prev.services_requested, service]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            services_requested: prev.services_requested.filter(s => s !== service)
                          }));
                        }
                      }}
                      className="rounded border-gray-600 text-[#3aa3eb] focus:ring-[#3aa3eb]"
                    />
                    <span className="text-xs text-gray-300">{service}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Service Type & Client Tier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Service Type</label>
              <select
                name="service_type"
                value={formData.service_type}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
              >
                <option value="">Select service...</option>
                <option value="Website">Website</option>
                <option value="Branding">Branding</option>
                <option value="Retainer">Retainer</option>
                <option value="Ads">Ads</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Client Tier</label>
              <select
                name="client_tier"
                value={formData.client_tier}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
              >
                <option value="">Select tier...</option>
                <option value="Lead">Lead</option>
                <option value="Active">Active</option>
                <option value="Past">Past</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>

          {/* Row 4: Source & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Source</label>
              <select
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
              >
                <option value="">Select source...</option>
                <option value="Referral">Referral</option>
                <option value="Instagram">Instagram</option>
                <option value="X">X</option>
                <option value="Repeat">Repeat</option>
                <option value="Other">Other</option>
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="prospect">Prospect</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="form-input w-full px-4 py-3 rounded-lg resize-none"
              placeholder="Additional notes about this client..."
            />
          </div>

          {/* More Details Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="flex items-center space-x-2 text-[#3aa3eb] hover:text-blue-300 transition-colors font-medium"
            >
              <span>{showMoreDetails ? 'Hide' : 'Add more'} details</span>
              <ChevronRightIcon
                className={`h-4 w-4 transition-transform duration-200 ${showMoreDetails ? 'rotate-90' : ''}`}
              />
            </button>
          </div>

          {/* Collapsible More Details Section */}
          {showMoreDetails && (
            <div className="space-y-6 pt-4 border-t border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="form-input w-full px-4 py-3 rounded-lg"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-input w-full px-4 py-3 rounded-lg"
                    placeholder="Full address"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4">
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
              disabled={isSubmitting}
            >
              {isSubmitting
                ? (mode === 'create' ? 'Adding...' : 'Updating...')
                : (mode === 'create' ? 'Add Client' : 'Update Client')
              }
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

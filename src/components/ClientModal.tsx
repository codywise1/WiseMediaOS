import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Client } from '../lib/supabase';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Omit<Client, 'id' | 'created_at' | 'updated_at'> | Client) => void;
  client?: Client;
  mode: 'create' | 'edit';
}

export default function ClientModal({ isOpen, onClose, onSave, client, mode }: ClientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const serviceOptions = [
    'Website',
    'Landing Page',
    'Web App',
    'SEO',
    'Brand Identity',
    'Video Editing',
    'Graphic Design'
  ];
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    category: '' as '' | 'Personal Care' | 'Real Estate' | 'Art' | 'Web3' | 'Hospitality' | 'Travel Agency' | 'E-Commerce' | 'Law' | 'Investing' | 'Finance' | 'Forex',
    location: '',
    services_requested: [] as string[],
    client_tier: '' as '' | 'Lead' | 'Active' | 'Past' | 'VIP',
    source: '' as '' | 'Referral' | 'Instagram' | 'X' | 'Repeat' | 'Other',
    status: 'active' as 'active' | 'inactive' | 'prospect' | 'archived',
    linkedin: '',
    twitter: '',
    instagram: '',
    facebook: '',
    tiktok: ''
  });

  useEffect(() => {
    if (client && mode === 'edit') {
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone || '',
        company: client.company || '',
        category: client.category || '',
        location: client.location || '',
        services_requested: client.services_requested || [],
        client_tier: client.client_tier || '',
        source: client.source || '',
        status: client.status,
        linkedin: client.linkedin || '',
        twitter: client.twitter || '',
        instagram: client.instagram || '',
        facebook: client.facebook || '',
        tiktok: client.tiktok || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        category: '',
        location: '',
        services_requested: [],
        client_tier: '',
        source: '',
        status: 'active',
        linkedin: '',
        twitter: '',
        instagram: '',
        facebook: '',
        tiktok: ''
      });
    }
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
      category: formData.category || null,
      location: formData.location.trim() || null,
      services_requested: formData.services_requested.length > 0 ? formData.services_requested : null,
      client_tier: formData.client_tier || null,
      source: formData.source || null,
      status: formData.status,
      linkedin: formData.linkedin.trim() || null,
      twitter: formData.twitter.trim() || null,
      instagram: formData.instagram.trim() || null,
      facebook: formData.facebook.trim() || null,
      tiktok: formData.tiktok.trim() || null,
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
                placeholder="Satoshi Nakamoto"
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
                placeholder="satoshi@wisemedia.io"
                required
              />
            </div>
          </div>

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
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
              >
                <option value="">Select category...</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Short Term Rentals">Short Term Rentals</option>
                <option value="Finance">Finance</option>
                <option value="Crypto & Web3">Crypto & Web3</option>
                <option value="E-Commerce">E-Commerce</option>
                <option value="SAAS & Technology">SAAS & Technology</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Health & Fitness">Health & Fitness</option>
                <option value="Hospitality">Hospitality</option>
                <option value="Travel Agency">Travel Agency</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Marketing Agency">Marketing Agency</option>
                <option value="Creator / Influencer">Creator / Influencer</option>
                <option value="Digital Goods">Digital Goods</option>
                <option value="Food & Nightlife">Food & Nightlife</option>
                <option value="Construction & Trades">Construction & Trades</option>
                <option value="Law">Law</option>
                <option value="Coaching & Consulting">Coaching & Consulting</option>
                <option value="Education & Courses">Education & Courses</option>
                <option value="Automotive">Automotive</option>
                <option value="Non-Profit / Community">Non-Profit / Community</option>

              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Services Requested</label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              {serviceOptions.map(service => (
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Social Media</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">LinkedIn</label>
                <input
                  type="text"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleChange}
                  className="form-input w-full px-4 py-3 rounded-lg"
                  placeholder="linkedin.com/in/username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Twitter / X</label>
                <input
                  type="text"
                  name="twitter"
                  value={formData.twitter}
                  onChange={handleChange}
                  className="form-input w-full px-4 py-3 rounded-lg"
                  placeholder="@username or twitter.com/username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Instagram</label>
                <input
                  type="text"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleChange}
                  className="form-input w-full px-4 py-3 rounded-lg"
                  placeholder="@username or instagram.com/username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Facebook</label>
                <input
                  type="text"
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleChange}
                  className="form-input w-full px-4 py-3 rounded-lg"
                  placeholder="facebook.com/username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">TikTok</label>
                <input
                  type="text"
                  name="tiktok"
                  value={formData.tiktok}
                  onChange={handleChange}
                  className="form-input w-full px-4 py-3 rounded-lg"
                  placeholder="@username or tiktok.com/@username"
                />
              </div>
            </div>
          </div>

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

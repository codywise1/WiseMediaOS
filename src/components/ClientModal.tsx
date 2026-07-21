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

const labelCls = 'block text-sm font-medium text-gray-300 mb-2';
const inputCls = 'form-input w-full px-4 py-3 rounded-xl text-sm';

const serviceOptions = [
  'Website', 'Landing Page', 'Web App', 'SEO', 'Brand Identity', 'Video Editing', 'Graphic Design',
];

const categoryOptions = [
  'Automotive', 'Coaching & Consulting', 'Construction & Trades', 'Creator / Influencer',
  'Crypto & Web3', 'Digital Goods', 'E-Commerce', 'Education & Courses', 'Finance',
  'Food & Nightlife', 'Health & Fitness', 'Hospitality', 'Law', 'Marketing Agency',
  'Non-Profit / Community', 'Personal Care', 'Professional Services', 'Real Estate',
  'SAAS & Technology', 'Short Term Rentals', 'Travel Agency',
];

export default function ClientModal({ isOpen, onClose, onSave, client, mode }: ClientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '', category: '' as string,
    location: '', services_requested: [] as string[],
    source: '' as string, status: 'prospect' as string,
    linkedin: '', twitter: '', instagram: '', facebook: '', tiktok: '', youtube: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name, email: client.email, phone: client.phone || '',
        company: client.company || '', category: client.category || '',
        location: client.location || '',
        services_requested: client.services_requested || [],
        source: client.source || '', status: client.status,
        linkedin: client.linkedin || '', twitter: client.twitter || '',
        instagram: client.instagram || '', facebook: client.facebook || '',
        tiktok: client.tiktok || '', youtube: client.youtube || '',
      });
    } else if (mode === 'create') {
      setFormData({
        name: '', email: '', phone: '', company: '', category: '',
        location: '', services_requested: [], source: '', status: 'prospect',
        linkedin: '', twitter: '', instagram: '', facebook: '', tiktok: '', youtube: '',
      });
    }
  }, [client, mode, isOpen]);

  useEffect(() => { if (!isOpen) setIsSubmitting(false); }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.name.trim() || !formData.email.trim()) { alert('Name and email are required.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) { alert('Please enter a valid email address.'); return; }
    setIsSubmitting(true);
    onSave({
      ...(mode === 'edit' && client ? client : {}),
      ...formData,
      name: formData.name.trim(), email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim() || null, company: formData.company.trim() || null,
      category: formData.category || null, location: formData.location.trim() || null,
      services_requested: formData.services_requested.length > 0 ? formData.services_requested : null,
      linkedin: formData.linkedin.trim() || null, twitter: formData.twitter.trim() || null,
      instagram: formData.instagram.trim() || null, facebook: formData.facebook.trim() || null,
      tiktok: formData.tiktok.trim() || null, youtube: formData.youtube.trim() || null,
    } as Client);
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Client' : 'Edit Client'}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="submit"
            form="client-form"
            disabled={isSubmitting}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add Client' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form id="client-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Name + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name <span className="text-red-400">*</span></label>
            <input type="text" name="name" value={formData.name} onChange={handleChange}
              className={inputCls} placeholder="Satoshi Nakamoto" required />
          </div>
          <div>
            <label className={labelCls}>Email <span className="text-red-400">*</span></label>
            <input type="email" name="email" value={formData.email} onChange={handleChange}
              className={inputCls} placeholder="satoshi@wisemedia.io" required />
          </div>
        </div>

        {/* Company + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Company</label>
            <input type="text" name="company" value={formData.company} onChange={handleChange}
              className={inputCls} placeholder="Company name" />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select name="category" value={formData.category} onChange={handleChange} className={inputCls}>
              <option value="">Select category</option>
              {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Location + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Location</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange}
              className={inputCls} placeholder="Calgary, Miami, etc." />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
              className={inputCls} placeholder="+1 (555) 123-4567" />
          </div>
        </div>

        {/* Services */}
        <div>
          <label className={labelCls}>Services Requested</label>
          <div className="flex flex-wrap gap-2">
            {serviceOptions.map(service => {
              const active = formData.services_requested.includes(service);
              return (
                <button
                  key={service} type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      services_requested: active
                        ? prev.services_requested.filter(s => s !== service)
                        : [...prev.services_requested, service],
                    }));
                  }}
                  className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                    active
                      ? 'bg-[#3aa3eb]/20 border border-[#3aa3eb]/50 text-[#3aa3eb]'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {service}
                </button>
              );
            })}
          </div>
        </div>

        {/* State + Source */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Client State</label>
            <select name="status" value={formData.status} onChange={handleChange} className={inputCls}>
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="vip">VIP</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Source</label>
            <select name="source" value={formData.source} onChange={handleChange} className={inputCls}>
              <option value="">Select source</option>
              <option value="Referral">Referral</option>
              <option value="Instagram">Instagram</option>
              <option value="X">X</option>
              <option value="Repeat">Repeat</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Social Media */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 mt-2">Social Media</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: 'linkedin', label: 'LinkedIn', ph: 'linkedin.com/in/username' },
              { name: 'twitter', label: 'Twitter / X', ph: '@username' },
              { name: 'instagram', label: 'Instagram', ph: '@username' },
              { name: 'facebook', label: 'Facebook', ph: 'facebook.com/username' },
              { name: 'tiktok', label: 'TikTok', ph: '@username' },
              { name: 'youtube', label: 'YouTube', ph: '@username' },
            ].map(s => (
              <div key={s.name}>
                <label className={labelCls}>{s.label}</label>
                <input type="text" name={s.name} value={(formData as any)[s.name]} onChange={handleChange}
                  className={inputCls} placeholder={s.ph} />
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

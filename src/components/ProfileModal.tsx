import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { UserCircleIcon, CameraIcon } from '@heroicons/react/24/outline';
import { avatarService, isSupabaseAvailable } from '../lib/supabase';

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
  avatar?: string;
  phone?: string;
  company?: string;
  title?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  github?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  timezone?: string;
  bio?: string;
  industry?: string;
  companySize?: string;
  budget?: string;
  referralSource?: string;
  notes?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Partial<User>) => void;
  user: User | null;
}

export default function ProfileModal({ isOpen, onClose, onSave, user }: ProfileModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    website: '',
    linkedin: '',
    twitter: '',
    instagram: '',
    facebook: '',
    github: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    timezone: '',
    bio: '',
    industry: '',
    companySize: '',
    budget: '',
    referralSource: '',
    notes: '',
    avatar: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || '',
        title: user.title || '',
        website: user.website || '',
        linkedin: user.linkedin || '',
        twitter: user.twitter || '',
        instagram: user.instagram || '',
        facebook: user.facebook || '',
        github: user.github || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || '',
        country: user.country || '',
        timezone: user.timezone || 'America/New_York',
        bio: user.bio || '',
        industry: user.industry || '',
        companySize: user.companySize || '',
        budget: user.budget || '',
        referralSource: user.referralSource || '',
        notes: user.notes || '',
        avatar: user.avatar || 'https://wisemedia.io/wp-content/uploads/2025/09/Wise-Media-Favicon-Wise-Media.webp'
      });
    }
  }, [user, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Name and email are required fields.');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address.');
      return;
    }
    
    const userData = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim() || undefined,
      company: formData.company.trim() || undefined,
      title: formData.title.trim() || undefined,
      website: formData.website.trim() || undefined,
      linkedin: formData.linkedin.trim() || undefined,
      twitter: formData.twitter.trim() || undefined,
      instagram: formData.instagram.trim() || undefined,
      facebook: formData.facebook.trim() || undefined,
      github: formData.github.trim() || undefined,
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      state: formData.state.trim() || undefined,
      zipCode: formData.zipCode.trim() || undefined,
      country: formData.country.trim() || undefined,
      timezone: formData.timezone || undefined,
      bio: formData.bio.trim() || undefined,
      industry: formData.industry.trim() || undefined,
      companySize: formData.companySize || undefined,
      budget: formData.budget.trim() || undefined,
      referralSource: formData.referralSource.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      avatar: formData.avatar.trim() || undefined
    };
    
    onSave(userData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user?.id) {
      alert('User ID not found. Please try logging in again.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    try {
      if (isSupabaseAvailable()) {
        const avatarUrl = await avatarService.uploadAvatar(file, user.id);
        setFormData(prev => ({
          ...prev,
          avatar: avatarUrl
        }));
        alert('Avatar uploaded successfully!');
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormData(prev => ({
            ...prev,
            avatar: event.target?.result as string
          }));
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile & Business Information">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <img
              src={formData.avatar || 'https://wisemedia.io/wp-content/uploads/2025/09/Wise-Media-Favicon-Wise-Media.webp'}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4"
            />
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center border-2 cursor-pointer hover:bg-slate-600 transition-colors">
              <CameraIcon className="h-4 w-4 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-sm text-gray-400">Click the camera icon to change your avatar</p>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                required
              />
            </div>
          </div>
          
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Job Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="CEO, Marketing Director, etc."
              />
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="Your company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="https://yourcompany.com"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Industry</label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
              >
                <option value="">Select Industry</option>
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="retail">Retail</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="education">Education</option>
                <option value="real-estate">Real Estate</option>
                <option value="consulting">Consulting</option>
                <option value="marketing">Marketing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Company Size</label>
              <select
                name="companySize"
                value={formData.companySize}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
              >
                <option value="">Select Size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="500+">500+ employees</option>
              </select>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Social Media</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">LinkedIn</label>
              <input
                type="url"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Twitter</label>
              <input
                type="url"
                name="twitter"
                value={formData.twitter}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="https://twitter.com/yourusername"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Instagram</label>
              <input
                type="url"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="https://instagram.com/yourusername"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Facebook</label>
              <input
                type="url"
                name="facebook"
                value={formData.facebook}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="https://facebook.com/yourpage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">GitHub</label>
              <input
                type="url"
                name="github"
                value={formData.github}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="https://github.com/yourusername"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Address Information</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
              placeholder="123 Main Street"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="New York"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="NY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Zip Code</label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
                placeholder="10001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
              >
                <option value="">Select Country</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="UK">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Business Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Project Budget Range</label>
              <select
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
              >
                <option value="">Select Budget Range</option>
                <option value="under-5k">Under $5,000</option>
                <option value="5k-15k">$5,000 - $15,000</option>
                <option value="15k-50k">$15,000 - $50,000</option>
                <option value="50k-100k">$50,000 - $100,000</option>
                <option value="100k+">$100,000+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">How did you hear about us?</label>
              <select
                name="referralSource"
                value={formData.referralSource}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 rounded-lg"
              >
                <option value="">Select Source</option>
                <option value="google">Google Search</option>
                <option value="social-media">Social Media</option>
                <option value="referral">Referral</option>
                <option value="linkedin">LinkedIn</option>
                <option value="conference">Conference/Event</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              className="form-input w-full px-4 py-3 rounded-lg"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
            </select>
          </div>
        </div>

        {/* Bio and Notes */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Additional Information</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              className="form-input w-full px-4 py-3 rounded-lg"
              placeholder="Tell us about yourself and your business..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Additional Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="form-input w-full px-4 py-3 rounded-lg"
              placeholder="Any additional information or special requirements..."
            />
          </div>
        </div>

        {/* Account Type Display */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-3">
            <UserCircleIcon className="h-5 w-5 text-[#3aa3eb]" />
            <div>
              <p className="text-sm font-medium text-white">Account Type</p>
              <p className="text-xs text-gray-400">
                {user?.role === 'admin' ? 'Administrator Account' : 'Client Account'}
              </p>
            </div>
          </div>
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
            Save Profile
          </button>
        </div>
      </form>
    </Modal>
  );
}
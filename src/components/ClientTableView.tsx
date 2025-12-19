import { useState } from 'react';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { Client } from '../lib/supabase';
import CategoryBadge from './CategoryBadge';
import ServiceTag from './ServiceTag';
import { formatPhoneNumber } from '../lib/phoneFormat';

interface ClientTableViewProps {
  clients: Client[];
  isAdmin: boolean;
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

type SortField = 'company' | 'name' | 'category' | 'email' | 'location';
type SortDirection = 'asc' | 'desc';

export default function ClientTableView({ clients, isAdmin, onView, onEdit, onDelete }: ClientTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('company');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedClients = [...clients].sort((a, b) => {
    let aValue = '';
    let bValue = '';

    switch (sortField) {
      case 'company':
        aValue = a.company || a.name || '';
        bValue = b.company || b.name || '';
        break;
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'category':
        aValue = a.category || '';
        bValue = b.category || '';
        break;
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'location':
        aValue = a.location || '';
        bValue = b.location || '';
        break;
    }

    const comparison = aValue.localeCompare(bValue);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    );
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th
                className="text-left px-6 py-4 text-sm font-bold text-gray-200 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('company')}
              >
                <div className="flex items-center space-x-2">
                  <span>Company</span>
                  <SortIcon field="company" />
                </div>
              </th>
              <th
                className="text-left px-6 py-4 text-sm font-bold text-gray-200 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-2">
                  <span>Name</span>
                  <SortIcon field="name" />
                </div>
              </th>
              <th
                className="text-left px-6 py-4 text-sm font-bold text-gray-200 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center space-x-2">
                  <span>Category</span>
                  <SortIcon field="category" />
                </div>
              </th>
              <th
                className="text-left px-6 py-4 text-sm font-bold text-gray-200 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center space-x-2">
                  <span>Email</span>
                  <SortIcon field="email" />
                </div>
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">
                Phone
              </th>
              <th
                className="text-left px-6 py-4 text-sm font-bold text-gray-200 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('location')}
              >
                <div className="flex items-center space-x-2">
                  <span>Location</span>
                  <SortIcon field="location" />
                </div>
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">
                Service Requested
              </th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedClients.map((client, index) => (
              <tr
                key={client.id}
                className={`border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${index % 2 === 0 ? 'bg-slate-900/20' : ''
                  }`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white">
                      {client.company || client.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-200 font-medium">{client.name || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  {client.category ? (
                    <CategoryBadge category={client.category} size="sm" />
                  ) : (
                    <span className="text-sm text-gray-400 font-medium">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-200 font-medium">{client.email}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-200 font-medium">{client.phone ? formatPhoneNumber(client.phone) : '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-200 font-medium">{client.location || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {client.services_requested && client.services_requested.length > 0 ? (
                      client.services_requested.slice(0, 2).map((service, idx) => (
                        <ServiceTag key={idx} service={service} size="sm" />
                      ))
                    ) : (
                      <span className="text-sm text-gray-400 font-medium">-</span>
                    )}
                    {client.services_requested && client.services_requested.length > 2 && (
                      <span className="text-xs text-gray-300 font-bold ml-1">
                        +{client.services_requested.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onView(client)}
                      className="text-gray-300 hover:text-white p-1 transition-colors"
                      title="View"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => onEdit(client)}
                          className="text-blue-400 hover:text-blue-300 p-1 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(client)}
                          className="text-red-400 hover:text-red-300 p-1 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedClients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No clients found</p>
        </div>
      )}
    </div>
  );
}

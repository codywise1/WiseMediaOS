import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import ProposalModal from './ProposalModal';
import ConfirmDialog from './ConfirmDialog';
import { proposalService } from '../lib/supabase';

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
}

interface ProposalsProps {
  currentUser: User | null;
}

const statusConfig = {
  approved: { color: 'bg-white/30 text-white', icon: CheckCircleIcon, label: 'Approved' },
  pending: { color: 'bg-[#3aa3eb]/30 text-[#3aa3eb]', icon: ClockIcon, label: 'Pending Review' },
  under_review: { color: 'bg-[#3aa3eb]/30 text-[#3aa3eb]', icon: EyeIcon, label: 'Under Review' },
  draft: { color: 'bg-gray-900/30 text-gray-400', icon: PencilIcon, label: 'Draft' },
  rejected: { color: 'bg-red-900/30 text-red-400', icon: ClipboardDocumentListIcon, label: 'Rejected' },
};

export default function Proposals({ currentUser }: ProposalsProps) {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  React.useEffect(() => {
    loadProposals();
  }, [currentUser]);

  const loadProposals = async () => {
    try {
      setLoading(true);
      let data = [];
      
      if (currentUser?.role === 'admin') {
        data = await proposalService.getAll();
      } else if (currentUser?.id) {
        data = await proposalService.getByClientId(currentUser.id);
      }
      
      // Transform data to match component interface
      const transformedProposals = data.map(proposal => ({
        id: proposal.id,
        title: proposal.title,
        client: proposal.client?.name || 'Unknown Client',
        client_id: proposal.client_id,
        value: proposal.value,
        status: proposal.status,
        services: proposal.services || [],
        description: proposal.description,
        createdDate: proposal.created_at?.split('T')[0] || '',
        expiryDate: proposal.expiry_date || ''
      }));
      
      setProposals(transformedProposals);
    } catch (error) {
      console.error('Error loading proposals:', error);
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = proposals.reduce((sum, proposal) => sum + proposal.value, 0);
  const approvedValue = proposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.value, 0);
  const pendingCount = proposals.filter(p => p.status === 'pending' || p.status === 'under_review').length;

  const handleNewProposal = () => {
    setSelectedProposal(undefined);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditProposal = (proposal: any) => {
    setSelectedProposal(proposal);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteProposal = (proposal: any) => {
    setSelectedProposal(proposal);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveProposal = (proposalData: any) => {
    const saveProposal = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const proposalId = modalMode === 'create'
          ? `PROP-${currentYear}-${String(proposals.length + 1).padStart(3, '0')}`
          : proposalData.id;

        const apiData = {
          id: proposalId,
          client_id: proposalData.client_id,
          title: proposalData.title,
          description: proposalData.description,
          value: proposalData.value,
          status: proposalData.status,
          services: proposalData.services,
          expiry_date: proposalData.expiryDate
        };

        if (modalMode === 'create') {
          await proposalService.create(apiData);
        } else if (selectedProposal) {
          await proposalService.update(selectedProposal.id, apiData);
        }

        await loadProposals();
        setIsModalOpen(false);
      } catch (error) {
        console.error('Error saving proposal:', error);
        alert('Error saving proposal. Please try again.');
      }
    };

    saveProposal();
  };

  const confirmDelete = () => {
    const deleteProposal = async () => {
      if (selectedProposal) {
        try {
          await proposalService.delete(selectedProposal.id);
          await loadProposals();
          setIsDeleteDialogOpen(false);
          setSelectedProposal(undefined);
        } catch (error) {
          console.error('Error deleting proposal:', error);
          alert('Error deleting proposal. Please try again.');
        }
      }
    };
    
    deleteProposal();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  // Users can only see approved proposals, admins see all
  const visibleProposals = isAdmin ? proposals : proposals.filter(p => p.status === 'approved' || p.status === 'pending');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>Proposals</h1>
            <p className="text-gray-300">Create, track, and manage project proposals</p>
          </div>
          {isAdmin && (
            <button 
              onClick={handleNewProposal}
              className="btn-primary text-white font-medium flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              New Proposal
            </button>
          )}
          {!isAdmin && (
            <div className="text-sm text-gray-400">Review and manage your proposals</div>
          )}
        </div>
      </div>

      {/* Proposal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Total Proposals</p>
              <p className="text-2xl font-bold text-white">{visibleProposals.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Approved Value</p>
              <p className="text-2xl font-bold text-white">${approvedValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Pending Review</p>
              <p className="text-2xl font-bold text-white">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Total Value</p>
              <p className="text-2xl font-bold text-white">${totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-6">
        {visibleProposals.map((proposal) => {
          const statusInfo = statusConfig[proposal.status as keyof typeof statusConfig];
          const StatusIcon = statusInfo.icon;
          
          return (
            <div key={proposal.id} className="glass-card rounded-xl p-6 card-hover neon-glow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-slate-700">
                    <ClipboardDocumentListIcon className="h-6 w-6 text-gray-300" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>{proposal.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{proposal.client}</p>
                    <p className="text-sm text-gray-500">{proposal.description}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">${proposal.value.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">{proposal.id}</p>
                  {isAdmin && (
                    <div className="flex items-center justify-end space-x-2 mt-2">
                      <button 
                        onClick={() => handleEditProposal(proposal)}
                        className="text-blue-500 hover:text-white p-1"
                        title="Edit Proposal"
                      >
                        <PencilIcon className="h-4 w-4 text-blue-500" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProposal(proposal)}
                        className="text-blue-500 hover:text-red-400 p-1"
                        title="Delete Proposal"
                      >
                        <TrashIcon className="h-4 w-4 text-blue-500" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Services */}
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Services Included:</p>
                <div className="flex flex-wrap gap-2">
                  {proposal.services.map((service, index) => (
                    <span key={index} className="px-3 py-1 bg-slate-800 text-gray-300 rounded-full text-sm">
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Created: {proposal.createdDate}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Expires: {proposal.expiryDate}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {proposal.status === 'draft' && (
                    <button
                      onClick={() => {
                        alert(`Sending proposal for review: ${proposal.title}\nClient: ${proposal.client}\n\nProposal sent successfully!`);
                      }}
                      className="btn-action text-sm font-medium"
                    >
                      Send for Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ProposalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProposal}
        proposal={selectedProposal}
        mode={modalMode}
        currentUser={currentUser}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Proposal"
        message={`Are you sure you want to delete proposal "${selectedProposal?.title}"? This action cannot be undone.`}
      />
    </div>
  );
}
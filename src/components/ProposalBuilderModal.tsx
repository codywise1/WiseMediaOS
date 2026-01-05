import { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { clientService, Client } from '../lib/supabase';
import { proposalService, ProposalItem } from '../lib/proposalService';
import { serviceTemplates, ServiceTemplate } from '../config/serviceTemplates';
import { useToast } from '../contexts/ToastContext';

interface ProposalBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId?: string;
  editProposalId?: string;
}

interface ProposalFormData {
  client_id: string;
  title: string;
  description: string;
  currency: string;
  expires_at: string;
  selectedServices: {
    serviceType: string;
    quantity: number;
    unitPrice: number;
  }[];
  billingPlan: 'full_upfront' | 'split' | 'milestones' | 'monthly_retainer' | 'custom';
  paymentTermsDays: number;
  depositPercent: number;
}

const steps = [
  { id: 1, name: 'Context', description: 'Client and proposal basics' },
  { id: 2, name: 'Services', description: 'Select services and scope' },
  { id: 3, name: 'Pricing', description: 'Pricing and payment plan' },
  { id: 4, name: 'SOW', description: 'Scope of work details' },
  { id: 5, name: 'Agreement', description: 'Legal terms and clauses' },
  { id: 6, name: 'Review', description: 'Review and create' }
];

export default function ProposalBuilderModal({ isOpen, onClose, onSuccess, currentUserId, editProposalId }: ProposalBuilderModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [proposalId, setProposalId] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProposalFormData>({
    client_id: '',
    title: '',
    description: '',
    currency: 'CAD',
    expires_at: '',
    selectedServices: [],
    billingPlan: 'full_upfront',
    paymentTermsDays: 7,
    depositPercent: 50
  });

  useEffect(() => {
    if (isOpen) {
      loadClients();
      if (editProposalId) {
        setProposalId(editProposalId);
        loadExistingProposal(editProposalId);
      } else {
        // Reset form for NEW proposal
        setCurrentStep(1);
        setProposalId(null);
        setFormData({
          client_id: '',
          title: '',
          description: '',
          currency: 'CAD',
          expires_at: '',
          selectedServices: [],
          billingPlan: 'full_upfront',
          paymentTermsDays: 7,
          depositPercent: 50
        });
      }
    }
  }, [isOpen, editProposalId]);

  const loadExistingProposal = async (id: string) => {
    try {
      setLoading(true);
      const proposal = await proposalService.getById(id);
      if (proposal) {
        const items = await proposalService.getItems(id);

        setFormData({
          client_id: proposal.client_id,
          title: proposal.title,
          description: proposal.description || '',
          currency: proposal.currency || 'CAD',
          expires_at: proposal.expires_at || '',
          selectedServices: items.map(item => ({
            serviceType: item.service_type,
            quantity: item.quantity,
            unitPrice: item.unit_price_cents
          })),
          billingPlan: proposal.billing_plan?.plan_type || 'full_upfront',
          paymentTermsDays: proposal.billing_plan?.payment_terms_days || 7,
          depositPercent: proposal.billing_plan?.deposit_cents && proposal.value
            ? Math.round((proposal.billing_plan.deposit_cents / proposal.value) * 100)
            : 50
        });
      }
    } catch (error) {
      console.error('Error loading existing proposal:', error);
      toastError('Failed to load proposal data');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const data = await clientService.getAll();
      // Sort clients alphabetically by company or name
      const sortedData = [...data].sort((a, b) => {
        const nameA = (a.company || a.name || '').toLowerCase();
        const nameB = (b.company || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setClients(sortedData);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleNext = async () => {
    // Validate current step
    if (currentStep === 1) {
      if (!formData.client_id || !formData.title) {
        toastError('Please select a client and enter a proposal title');
        return;
      }
      // Create draft proposal on first step completion
      if (!proposalId) {
        await createDraftProposal();
      }
    }

    if (currentStep === 2) {
      if (formData.selectedServices.length === 0) {
        toastError('Please select at least one service');
        return;
      }
      // Add items to proposal
      if (proposalId) {
        await addProposalItems();
      }
    }

    if (currentStep === 3) {
      if (proposalId) {
        await saveBillingPlan();
      }
    }

    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const createDraftProposal = async () => {
    try {
      setLoading(true);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const proposalData = {
        client_id: formData.client_id,
        title: formData.title,
        description: formData.description,
        status: 'draft' as const,
        currency: formData.currency,
        value: 0,
        expires_at: expiresAt.toISOString(),
        created_by_user_id: currentUserId
      };

      if (editProposalId) {
        await proposalService.update(editProposalId, proposalData);
        setProposalId(editProposalId);
      } else {
        const proposal = await proposalService.create(proposalData);
        setProposalId(proposal.id);
        toastSuccess('Draft proposal created with linked invoice');
      }
    } catch (error) {
      console.error('Error saving proposal:', error);
      toastError('Failed to save proposal basics');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const addProposalItems = async () => {
    if (!proposalId) return;

    try {
      setLoading(true);
      // If editing, clear existing items first to avoid duplicates
      if (editProposalId) {
        await proposalService.clearItems(proposalId);
      }

      const items: Omit<ProposalItem, 'id' | 'proposal_id' | 'created_at'>[] = formData.selectedServices.map((service, index) => ({
        service_type: service.serviceType as any,
        name: serviceTemplates.find(t => t.serviceType === service.serviceType)?.label || service.serviceType,
        description: '',
        quantity: service.quantity,
        unit_price_cents: service.unitPrice,
        line_total_cents: service.quantity * service.unitPrice,
        sort_order: index
      }));

      await proposalService.addItems(proposalId, items);
      toastSuccess('Services updated');
    } catch (error) {
      console.error('Error updating items:', error);
      toastError('Failed to update services');
    } finally {
      setLoading(false);
    }
  };

  const saveBillingPlan = async () => {
    if (!proposalId) return;

    try {
      setLoading(true);
      await proposalService.saveBillingPlan({
        proposal_id: proposalId,
        plan_type: formData.billingPlan,
        currency: formData.currency,
        total_cents: calculateTotal(),
        deposit_cents: formData.billingPlan === 'split' ? calculateTotal() * (formData.depositPercent / 100) : 0,
        payment_terms_days: formData.paymentTermsDays
      });
      toastSuccess('Payment plan saved');
    } catch (error) {
      console.error('Error saving billing plan:', error);
      toastError('Failed to save payment plan');
    } finally {
      setLoading(false);
    }
  };

  const handleSendProposal = async () => {
    if (!proposalId) return;

    try {
      setLoading(true);
      await proposalService.send(proposalId, currentUserId);
      toastSuccess('Proposal sent successfully! Legal terms locked and invoice remains in draft.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error sending proposal:', error);
      toastError('Failed to send proposal');
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (serviceType: string) => {
    const template = serviceTemplates.find(t => t.serviceType === serviceType);
    if (!template) return;

    const exists = formData.selectedServices.find(s => s.serviceType === serviceType);

    if (exists) {
      setFormData({
        ...formData,
        selectedServices: formData.selectedServices.filter(s => s.serviceType !== serviceType)
      });
    } else {
      setFormData({
        ...formData,
        selectedServices: [
          ...formData.selectedServices,
          {
            serviceType,
            quantity: 1,
            unitPrice: template.defaultPriceCents
          }
        ]
      });
    }
  };

  const updateServiceQuantity = (serviceType: string, quantity: number) => {
    setFormData({
      ...formData,
      selectedServices: formData.selectedServices.map(s =>
        s.serviceType === serviceType ? { ...s, quantity } : s
      )
    });
  };

  const updateServicePrice = (serviceType: string, unitPrice: number) => {
    setFormData({
      ...formData,
      selectedServices: formData.selectedServices.map(s =>
        s.serviceType === serviceType ? { ...s, unitPrice } : s
      )
    });
  };

  const calculateTotal = () => {
    return formData.selectedServices.reduce((sum, service) =>
      sum + (service.quantity * service.unitPrice), 0
    );
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: formData.currency
    }).format(cents / 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-6xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                {editProposalId ? 'Edit Proposal' : 'New Proposal'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Guided proposal builder with auto-generated SOW and linked invoice
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Stepper */}
          <div className="px-6 py-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                      ${currentStep > step.id ? 'bg-green-500 text-white' :
                        currentStep === step.id ? 'bg-[#3aa3eb] text-white' :
                          'bg-slate-700 text-gray-400'}
                    `}>
                      {currentStep > step.id ? <CheckIcon className="h-5 w-5" /> : step.id}
                    </div>
                    <div className="text-center mt-2">
                      <div className={`text-xs font-semibold ${currentStep >= step.id ? 'text-white' : 'text-gray-500'}`}>
                        {step.name}
                      </div>
                      <div className="text-xs text-gray-500 hidden sm:block">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-green-500' : 'bg-slate-700'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 min-h-[400px]">
            {/* Step 1: Context */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">
                    Client *
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]"
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.company || client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">
                    Proposal Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Brand Development & Website"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Internal notes about this proposal..."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]"
                    >
                      <option value="CAD">CAD</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-300">
                    <strong>Auto-save:</strong> A draft proposal and linked invoice will be created when you proceed to the next step.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Services */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Select Services</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {serviceTemplates.map((template) => {
                      const isSelected = formData.selectedServices.some(s => s.serviceType === template.serviceType);
                      const selectedService = formData.selectedServices.find(s => s.serviceType === template.serviceType);

                      return (
                        <div
                          key={template.serviceType}
                          className={`
                            p-4 rounded-lg border-2 cursor-pointer transition-all
                            ${isSelected
                              ? 'border-[#3aa3eb] bg-[#3aa3eb]/10'
                              : 'border-slate-700 bg-slate-800 hover:border-slate-600'}
                          `}
                          onClick={() => toggleService(template.serviceType)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-bold text-white">{template.label}</h4>
                              <p className="text-xs text-gray-400">{template.priceRangeHint}</p>
                            </div>
                            <div className={`
                              w-6 h-6 rounded border-2 flex items-center justify-center
                              ${isSelected ? 'border-[#3aa3eb] bg-[#3aa3eb]' : 'border-slate-600'}
                            `}>
                              {isSelected && <CheckIcon className="h-4 w-4 text-white" />}
                            </div>
                          </div>

                          {isSelected && selectedService && (
                            <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                              <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Quantity</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={selectedService.quantity}
                                  onChange={(e) => updateServiceQuantity(template.serviceType, parseInt(e.target.value) || 1)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Unit Price ($)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={selectedService.unitPrice / 100}
                                  onChange={(e) => updateServicePrice(template.serviceType, Math.round(parseFloat(e.target.value) * 100) || 0)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatCurrency(selectedService.unitPrice)} × {selectedService.quantity} = {formatCurrency(selectedService.unitPrice * selectedService.quantity)}
                                </p>
                              </div>
                            </div>
                          )}

                          {isSelected && (
                            <div className="mt-4 pt-4 border-t border-slate-700">
                              <p className="text-xs font-bold text-gray-400 mb-2">Included:</p>
                              <ul className="text-xs text-gray-300 space-y-1">
                                {template.sowBlocks[0]?.items.slice(0, 3).map((item, idx) => (
                                  <li key={idx}>• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {formData.selectedServices.length > 0 && (
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 font-semibold">Subtotal:</span>
                      <span className="text-2xl font-bold text-white">
                        {formatCurrency(calculateTotal())}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Pricing */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Pricing Summary</h3>
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 space-y-4">
                    {formData.selectedServices.map((service) => {
                      const template = serviceTemplates.find(t => t.serviceType === service.serviceType);
                      return (
                        <div key={service.serviceType} className="flex justify-between items-center">
                          <div>
                            <p className="text-white font-semibold">{template?.label}</p>
                            <p className="text-sm text-gray-400">
                              {formatCurrency(service.unitPrice)} × {service.quantity}
                            </p>
                          </div>
                          <p className="text-white font-bold">
                            {formatCurrency(service.unitPrice * service.quantity)}
                          </p>
                        </div>
                      );
                    })}
                    <div className="pt-4 border-t border-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-white">Total:</span>
                        <span className="text-2xl font-bold text-[#3aa3eb]">
                          {formatCurrency(calculateTotal())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Payment Plan</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: 'full_upfront', label: 'Full Upfront', desc: '100% due on approval' },
                      { value: 'split', label: '50/50 Split', desc: '50% deposit, 50% on completion' },
                      { value: 'milestones', label: 'Milestones', desc: 'Custom milestone payments' },
                      { value: 'monthly_retainer', label: 'Monthly', desc: 'Recurring monthly billing' },
                      { value: 'custom', label: 'Custom', desc: 'Unstructured or special terms' }
                    ].map((plan) => (
                      <div
                        key={plan.value}
                        onClick={() => setFormData({ ...formData, billingPlan: plan.value as any })}
                        className={`
                          p-4 rounded-lg border-2 cursor-pointer transition-all
                          ${formData.billingPlan === plan.value
                            ? 'border-[#3aa3eb] bg-[#3aa3eb]/10'
                            : 'border-slate-700 bg-slate-800 hover:border-slate-600'}
                        `}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-white">{plan.label}</h4>
                          <div className={`
                            w-5 h-5 rounded-full border-2 flex items-center justify-center
                            ${formData.billingPlan === plan.value ? 'border-[#3aa3eb] bg-[#3aa3eb]' : 'border-slate-600'}
                          `}>
                            {formData.billingPlan === plan.value && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">{plan.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">
                    Payment Terms (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.paymentTermsDays}
                    onChange={(e) => setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value) || 7 })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Invoice will be due {formData.paymentTermsDays} days after proposal approval
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: SOW */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Scope of Work</h3>
                  <p className="text-gray-400 mb-6">
                    SOW sections will be auto-generated based on your selected services. Each service includes deliverables, exclusions, and terms.
                  </p>

                  {formData.selectedServices.map((service) => {
                    const template = serviceTemplates.find(t => t.serviceType === service.serviceType);
                    if (!template) return null;

                    return (
                      <div key={service.serviceType} className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-4">
                        <h4 className="text-xl font-bold text-white mb-4">{template.label}</h4>
                        {template.sowBlocks.map((block, idx) => (
                          <div key={idx} className="mb-4">
                            <h5 className="text-sm font-bold text-[#3aa3eb] mb-2">{block.title}</h5>
                            <ul className="text-sm text-gray-300 space-y-1 pl-4">
                              {block.items.map((item, itemIdx) => (
                                <li key={itemIdx} className="list-disc">{item}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-300">
                    <strong>Note:</strong> These SOW sections will be locked when you send the proposal. Global legal clauses will be automatically included.
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Agreement */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Legal Agreement</h3>
                  <p className="text-gray-400 mb-6">
                    Master agreement and service-specific clauses will be automatically assembled and locked when sent.
                  </p>

                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h4 className="text-sm font-bold text-[#3aa3eb] mb-3">Included Clauses:</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <p>• Global Clauses (G01-G15): Scope control, deliverables, payment, IP, liability, etc.</p>
                      {formData.selectedServices.map((service) => {
                        const template = serviceTemplates.find(t => t.serviceType === service.serviceType);
                        return (
                          <p key={service.serviceType}>
                            • {template?.label} Clauses ({template?.clauseCodes.join(', ')}): Service-specific terms
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-sm text-amber-300">
                    <strong>Important:</strong> Legal terms will be locked and versioned when you send this proposal. No edits will be possible after sending.
                  </p>
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Review & Send</h3>

                  <div className="space-y-4">
                    {/* Client Info */}
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <h4 className="text-sm font-bold text-[#3aa3eb] mb-2">Client</h4>
                      <p className="text-white">
                        {clients.find(c => c.id === formData.client_id)?.company ||
                          clients.find(c => c.id === formData.client_id)?.name}
                      </p>
                    </div>

                    {/* Proposal Info */}
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <h4 className="text-sm font-bold text-[#3aa3eb] mb-2">Proposal</h4>
                      <p className="text-white font-semibold">{formData.title}</p>
                      {formData.description && (
                        <p className="text-sm text-gray-400 mt-1">{formData.description}</p>
                      )}
                    </div>

                    {/* Services Summary */}
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <h4 className="text-sm font-bold text-[#3aa3eb] mb-3">Services</h4>
                      <div className="space-y-2">
                        {formData.selectedServices.map((service) => {
                          const template = serviceTemplates.find(t => t.serviceType === service.serviceType);
                          return (
                            <div key={service.serviceType} className="flex justify-between text-sm">
                              <span className="text-gray-300">
                                {template?.label} × {service.quantity}
                              </span>
                              <span className="text-white font-semibold">
                                {formatCurrency(service.unitPrice * service.quantity)}
                              </span>
                            </div>
                          );
                        })}
                        <div className="pt-2 border-t border-slate-700 flex justify-between">
                          <span className="text-white font-bold">Total:</span>
                          <span className="text-[#3aa3eb] font-bold text-lg">
                            {formatCurrency(calculateTotal())}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Plan */}
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <h4 className="text-sm font-bold text-[#3aa3eb] mb-2">Payment Plan</h4>
                      <p className="text-white capitalize">{formData.billingPlan.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-400">Due {formData.paymentTermsDays} days after approval</p>
                    </div>

                    {/* Invoice Status */}
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <p className="text-sm text-green-300">
                        <strong>✓ Draft Invoice Created:</strong> A linked invoice has been created and will activate automatically when this proposal is approved.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-700">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              className="px-6 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              {currentStep < 6 ? (
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="px-6 py-3 bg-[#3aa3eb] text-white font-semibold rounded-lg hover:bg-[#2d8bc7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : 'Next'}
                </button>
              ) : (
                <button
                  onClick={handleSendProposal}
                  disabled={loading}
                  className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Proposal'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

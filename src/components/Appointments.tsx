import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { clientService, appointmentService, UserRole, Client } from '../lib/supabase';
import { 
  CalendarIcon, 
  ClockIcon,
  VideoCameraIcon,
  PhoneIcon,
  UserIcon,
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import AppointmentModal from './AppointmentModal';
import ConfirmDialog from './ConfirmDialog';

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface AppointmentsProps {
  currentUser: User | null;
}

type AppointmentApi = {
  id: string;
  title: string;
  client_id: string;
  appointment_date: string;
  appointment_time: string;
  duration: string;
  type: string;
  status: string;
  location?: string | null;
  description?: string | null;
  client?: { name?: string };
};

const formatTo12h = (raw: string | null | undefined) => {
  if (!raw) return '';
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(am|pm))?$/i);
  if (!match) return raw;

  let [_, h, m, period] = match;
  let hours = parseInt(h, 10);
  let suffix = period ? period.toUpperCase() : '';

  if (period) {
    const isPM = period.toLowerCase() === 'pm';
    hours = hours % 12;
    hours = isPM ? (hours === 0 ? 12 : hours) : hours === 0 ? 12 : hours;
    suffix = isPM ? 'PM' : 'AM';
  } else {
    suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
  }

  const hh = hours.toString();
  return `${hh}:${m} ${suffix}`;
};

const appointmentTypes = [
  { 
    name: 'Consultation Call', 
    duration: '30 min', 
    icon: PhoneIcon, 
    color: 'bg-[#3aa3eb]',
    calendarUrl: 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2gM2TTSiOVFVhgF7Wlh_CMhzdWIscSg1gM7ZoPh54woIpS7wWaoTiiwBRn2jnS1fBFwReWUeFF'
  },
  { 
    name: 'Review Call', 
    duration: '45 min', 
    icon: VideoCameraIcon, 
    color: 'bg-[#3aa3eb]',
    calendarUrl: 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2gM2TTSiOVFVhgF7Wlh_CMhzdWIscSg1gM7ZoPh54woIpS7wWaoTiiwBRn2jnS1fBFwReWUeFF'
  },
  { 
    name: 'Discovery Call', 
    duration: '60 min', 
    icon: UserIcon, 
    color: 'bg-[#3aa3eb]',
    calendarUrl: 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2gM2TTSiOVFVhgF7Wlh_CMhzdWIscSg1gM7ZoPh54woIpS7wWaoTiiwBRn2jnS1fBFwReWUeFF'
  },
];

const googleCalendarEmbedUrl =
  'https://calendar.google.com/calendar/embed?src=your_calendar_id%40group.calendar.google.com&ctz=America/New_York';

const statusColors = {
  confirmed: 'bg-white/30 text-white',
  pending: 'bg-[#3aa3eb]/30 text-[#3aa3eb]',
  cancelled: 'bg-red-900/30 text-red-400',
};

export default function Appointments({ currentUser }: AppointmentsProps) {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<typeof appointmentTypes[0] | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const isAdmin = currentUser?.role === 'admin';

  React.useEffect(() => {
    loadClients().then(clientData => {
      loadAppointments(clientData);
    });
  }, [isAdmin]);

  const loadAppointments = async (clientListParam?: Client[]) => {
    try {
      setLoading(true);
      let data: AppointmentApi[] = [];
      const clientList = clientListParam || clients;
      
      if (currentUser?.role === 'admin') {
        data = (await appointmentService.getAll()) as AppointmentApi[];
      } else if (currentUser?.id) {
        const clientForUser = clientList.find(c => c.email?.toLowerCase() === currentUser.email.toLowerCase());
        if (clientForUser?.id) {
          data = (await appointmentService.getByClientId(clientForUser.id)) as AppointmentApi[];
        } else {
          setAppointments([]);
          setLoading(false);
          return;
        }
      }
      
      // Transform data to match component interface
      const transformedAppointments = data.map(appointment => ({
        id: appointment.id,
        title: appointment.title,
        client: appointment.client?.name || 'Unknown Client',
        client_id: appointment.client_id,
        date: appointment.appointment_date,
        time: formatTo12h(appointment.appointment_time),
        duration: appointment.duration,
        type: appointment.type,
        status: appointment.status,
        location: appointment.location || '',
        description: appointment.description || ''
      }));
      
      setAppointments(transformedAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async (): Promise<Client[]> => {
    try {
      const clientData = await clientService.getAll();
      setClients(clientData);
      return clientData;
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
      return [];
    }
  };

  const ensureClientIdForCurrentUser = async (): Promise<string | null> => {
    if (!currentUser?.email) return null;
    const clientList = clients.length ? clients : await loadClients();
    const existing = clientList.find(c => c.email?.toLowerCase() === currentUser.email.toLowerCase());
    if (existing?.id) return existing.id;

    try {
      const newClient = await clientService.create({
        name: currentUser.name || currentUser.email,
        email: currentUser.email,
        phone: '',
        company: '',
        address: '',
        website: '',
        notes: '',
        status: 'active'
      } as any);
      setClients(prev => [...prev, newClient]);
      return newClient.id;
    } catch (error) {
      console.error('Error creating client for current user:', error);
      return null;
    }
  };

  const handleNewAppointment = () => {
    setSelectedAppointment(undefined);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleBookAppointmentType = (appointmentType: typeof appointmentTypes[0]) => {
    setSelectedAppointmentType(appointmentType);
    setShowClientSelector(true);
  };

  const handleClientSelect = (client: any) => {
    if (selectedAppointmentType) {
      // Open Google Calendar with pre-filled information
      const calendarUrl = new URL(selectedAppointmentType.calendarUrl);
      calendarUrl.searchParams.set('prefill_email', client.email);
      calendarUrl.searchParams.set('prefill_name', client.name);
      window.open(calendarUrl.toString(), '_blank');
    }
    setShowClientSelector(false);
    setSelectedAppointmentType(null);
  };

  const handleEditAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveAppointment = (appointmentData: any) => {
    const saveAppointment = async () => {
      try {
        const clientId = isAdmin
          ? appointmentData.client_id
          : await ensureClientIdForCurrentUser();
        if (!clientId) {
          toastError(isAdmin ? 'Please select a client before saving.' : 'No client record found for your account. Please contact support or create a client profile first.');
          return;
        }

        // Transform data for API
        const apiData = {
          client_id: clientId,
          title: appointmentData.title,
          description: appointmentData.description,
          appointment_date: appointmentData.date,
          appointment_time: appointmentData.time,
          duration: appointmentData.duration,
          type: appointmentData.type,
          status: appointmentData.status,
          location: appointmentData.location
        };

        if (modalMode === 'create') {
          await appointmentService.create(apiData);
        } else if (selectedAppointment) {
          await appointmentService.update(selectedAppointment.id, apiData);
        }
        
        // Reload appointments
        await loadAppointments();
      } catch (error) {
        console.error('Error saving appointment:', error);
        toastError('Error saving appointment. Please try again.');
      }
    };
    
    saveAppointment();
  };

  const confirmDelete = () => {
    const deleteAppointment = async () => {
      if (selectedAppointment) {
        try {
          await appointmentService.delete(selectedAppointment.id);
          await loadAppointments();
          setIsDeleteDialogOpen(false);
          setSelectedAppointment(undefined);
        } catch (error) {
          console.error('Error deleting appointment:', error);
          toastError('Error deleting appointment. Please try again.');
        }
      }
    };
    
    deleteAppointment();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>Appointments</h1>
            <p className="text-gray-300">Schedule and manage your meetings and consultations</p>
          </div>
          {isAdmin && (
            <button 
              onClick={handleNewAppointment}
              className="btn-primary text-white font-medium flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              Book Meeting
            </button>
          )}
        </div>
      </div>

      {/* Quick Book Options */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {appointmentTypes.slice(0, 3).map((type, index) => (
            <div key={index} className="glass-card rounded-xl p-6 card-hover cursor-pointer">
              <div className={`p-3 rounded-lg ${type.color} mb-4 inline-block`}>
                <type.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>{type.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{type.duration}</p>
              <button
                onClick={() => handleBookAppointmentType(type)}
                className="btn-secondary w-full text-sm font-medium"
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Client Selector Modal */}
      {showClientSelector && selectedAppointmentType && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={() => setShowClientSelector(false)}></div>
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform glass-card neon-glow rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white title-font">Select Client for {selectedAppointmentType.name}</h3>
                <button
                  onClick={() => setShowClientSelector(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className="w-full p-4 text-left bg-slate-800/50 hover:bg-slate-800/70 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{client.name}</p>
                        <p className="text-gray-400 text-sm">{client.email}</p>
                        {client.company && (
                          <p className="text-gray-500 text-xs">{client.company}</p>
                        )}
                      </div>
                      <div className="text-blue-400">→</div>
                    </div>
                  </button>
                ))}
              </div>
              
              {clients.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">No clients found. Add clients first to book appointments.</p>
                  <button 
                    onClick={() => navigate('/clients')}
                    className="btn-primary mt-4"
                  >
                    Add Clients
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar View Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>Upcoming Appointments</h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setViewMode('list')}
            className={`btn-secondary text-sm font-medium ${viewMode === 'list' ? 'border-white/60' : ''} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!isAdmin}
          >
            List View
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            className={`btn-primary text-sm ${viewMode === 'calendar' ? 'ring-2 ring-white/40' : ''} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!isAdmin}
          >
            Calendar View
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="glass-card rounded-2xl p-4 neon-glow">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/10">
            <iframe
              src={googleCalendarEmbedUrl}
              title="Google Calendar"
              className="w-full h-full border-0"
              allow="geolocation; microphone; camera"
            />
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Para sincronizar, usa el enlace de inserción público de tu calendario de Google (Configurar &gt; Integrar calendario).
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="glass-card rounded-xl p-6 card-hover neon-glow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-slate-700">
                    {appointment.type === 'video' && <VideoCameraIcon className="h-6 w-6 text-[#3aa3eb]" />}
                    {appointment.type === 'phone' && <PhoneIcon className="h-6 w-6 text-[#3aa3eb]" />}
                    {appointment.type === 'in-person' && <MapPinIcon className="h-6 w-6 text-[#3aa3eb]" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>{appointment.title}</h3>
                    <p className="text-sm text-gray-400">{appointment.client}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[appointment.status as keyof typeof statusColors]}`}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </span>
                {isAdmin && (
                  <div className="flex items-center space-x-2 ml-4">
                    <button 
                      onClick={() => handleEditAppointment(appointment)}
                      className="text-blue-500 hover:text-white p-1"
                      title="Edit Appointment"
                    >
                      <PencilIcon className="h-4 w-4 text-blue-500" />
                    </button>
                    <button 
                      onClick={() => handleDeleteAppointment(appointment)}
                      className="text-blue-500 hover:text-red-400 p-1"
                      title="Delete Appointment"
                    >
                      <TrashIcon className="h-4 w-4 text-blue-500" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-gray-300 mb-4">{appointment.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{appointment.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{appointment.time} ({appointment.duration})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{appointment.location}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => {
                      toastInfo(`Rescheduling appointment: ${appointment.title}\nCurrent: ${appointment.date} at ${appointment.time}\n\nPlease select a new date and time.`, 5000);
                    }}
                    className={`text-white hover:text-blue-300 text-sm ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!isAdmin}
                  >
                    Reschedule
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm(`Are you sure you want to cancel "${appointment.title}"?`)) {
                        toastSuccess('Appointment cancelled successfully.');
                      }
                    }}
                    className={`text-red-400 hover:text-red-300 text-sm ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!isAdmin}
                  >
                    Cancel
                  </button>
                  {appointment.type === 'video' && (
                    <button 
                      onClick={() => {
                        window.open('https://meet.google.com/sample-meeting-link', '_blank');
                      }}
                      className="btn-action text-sm font-medium"
                    >
                      Join Meeting
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAppointment}
        appointment={selectedAppointment}
        mode={modalMode}
        currentUser={currentUser}
        clients={clients}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Appointment"
        message={`Are you sure you want to delete the appointment "${selectedAppointment?.title}"? This action cannot be undone.`}
      />
    </div>
  );
}
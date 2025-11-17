import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { Calendar, Plus, X, Video, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Appointment {
  id: string;
  title: string;
  scheduled_at: string;
  meeting_platform: string | null;
  meeting_link: string | null;
  status: string;
  admin_id: string | null;
  client_id: string | null;
}

export default function AppointmentsPage() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    scheduled_at: '',
    meeting_platform: 'zoom',
    meeting_link: '',
    status: 'scheduled',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [profile]);

  async function fetchAppointments() {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .or(`admin_id.eq.${profile.id},client_id.eq.${profile.id}`)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile || !formData.title.trim() || !formData.scheduled_at) return;

    setSaving(true);
    try {
      if (editingAppointment) {
        const { error } = await supabase
          .from('appointments')
          .update({
            title: formData.title,
            scheduled_at: formData.scheduled_at,
            meeting_platform: formData.meeting_platform,
            meeting_link: formData.meeting_link,
            status: formData.status,
          })
          .eq('id', editingAppointment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('appointments').insert({
          title: formData.title,
          scheduled_at: formData.scheduled_at,
          meeting_platform: formData.meeting_platform,
          meeting_link: formData.meeting_link,
          status: formData.status,
          admin_id: profile.id,
        });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingAppointment(null);
      setFormData({
        title: '',
        scheduled_at: '',
        meeting_platform: 'zoom',
        meeting_link: '',
        status: 'scheduled',
      });
      fetchAppointments();
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert('Failed to save appointment');
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(appointment: Appointment) {
    setEditingAppointment(appointment);
    setFormData({
      title: appointment.title,
      scheduled_at: appointment.scheduled_at,
      meeting_platform: appointment.meeting_platform || 'zoom',
      meeting_link: appointment.meeting_link || '',
      status: appointment.status,
    });
    setShowModal(true);
  }

  function openNewModal() {
    setEditingAppointment(null);
    setFormData({
      title: '',
      scheduled_at: '',
      meeting_platform: 'zoom',
      meeting_link: '',
      status: 'scheduled',
    });
    setShowModal(true);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'scheduled': return 'bg-blue-500/20 text-blue-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white text-[40px]" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Appointments
          </h1>
          <button onClick={openNewModal} className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
            <Plus size={20} />
            Schedule Appointment
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <GlassCard>
              <p className="text-gray-400 text-center py-8" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Loading appointments...</p>
            </GlassCard>
          ) : appointments.length === 0 ? (
            <GlassCard>
              <p className="text-gray-400 text-center py-8" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>No appointments yet. Click "Schedule Appointment" to create one.</p>
            </GlassCard>
          ) : (
            appointments.map((appointment) => (
              <GlassCard key={appointment.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <Calendar className="text-purple-400" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{appointment.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-gray-400" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '16px' }}>
                          {new Date(appointment.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                        {appointment.meeting_platform && (
                          <span className="flex items-center gap-1 text-blue-400 text-sm">
                            <Video size={14} />
                            {appointment.meeting_platform === 'zoom' ? 'Zoom' : 'Google Meet'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(appointment.status)}`} style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                    <button onClick={() => openEditModal(appointment)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {editingAppointment ? 'Edit Appointment' : 'Schedule Appointment'}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Title</label>
                    <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }} placeholder="e.g., Client Strategy Meeting" />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Date & Time</label>
                    <input type="datetime-local" value={formData.scheduled_at} onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }} />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Meeting Platform</label>
                    <select value={formData.meeting_platform} onChange={(e) => setFormData({...formData, meeting_platform: e.target.value})} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                      <option value="zoom">Zoom</option>
                      <option value="google_meet">Google Meet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Meeting Link</label>
                    <input type="url" value={formData.meeting_link} onChange={(e) => setFormData({...formData, meeting_link: e.target.value})} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }} placeholder="https://zoom.us/j/..." />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button onClick={handleSave} disabled={saving || !formData.title.trim() || !formData.scheduled_at} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg transition-colors font-medium" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                      {saving ? 'Saving...' : editingAppointment ? 'Update Appointment' : 'Schedule Appointment'}
                    </button>
                    <button onClick={() => setShowModal(false)} className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Cancel</button>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </>
      )}
    </>
  );
}

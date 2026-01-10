import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    VideoCameraIcon,
    MagnifyingGlassIcon,
    VideoCameraSlashIcon,
    ClipboardDocumentCheckIcon,
    CheckCircleIcon,
    ShareIcon
} from '@heroicons/react/24/outline';
import { ArrowRight } from 'lucide-react';
import {
    meetingService,
    clientService,
    projectService,
    Meeting,
    Client,
    Project,
    MeetingStatus
} from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLoadingGuard } from '../hooks/useLoadingGuard';
import MeetingCard from '../components/MeetingCard';
import ScheduleMeetingModal from '../components/ScheduleMeetingModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function MeetingsPage() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'all'>('all');
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

    const currentUser = profile ? {
        id: profile.id,
        role: profile.role,
        name: profile.name
    } : null;

    useLoadingGuard(loading, setLoading);

    useEffect(() => {
        loadData();
    }, [profile?.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [meetingsData, clientsData, projectsData] = await Promise.all([
                meetingService.getAll(),
                clientService.getAll(),
                projectService.getAll()
            ]);
            setMeetings(meetingsData);
            setClients(clientsData);
            setProjects(projectsData);
        } catch (error) {
            console.error('Error loading meetings data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinMeeting = (meeting: Meeting) => {
        console.log('[MeetingsPage] handleJoinMeeting called', { id: meeting.id, status: meeting.status });

        if (!meeting.id) {
            console.error('[MeetingsPage] Cannot join meeting: No meeting ID provided.');
            return;
        }

        // For both 'live' and 'scheduled' meetings, we navigate to our internal live view
        if (meeting.status === 'live' || meeting.status === 'scheduled') {
            const targetPath = `/meetings/live/${meeting.id}`;
            console.log('[MeetingsPage] Navigating to:', targetPath);
            navigate(targetPath);
        } else if (meeting.meeting_url) {
            console.log('[MeetingsPage] Opening external URL:', meeting.meeting_url);
            window.open(meeting.meeting_url, '_blank');
        } else {
            console.warn('[MeetingsPage] Join clicked for meeting with status:', meeting.status, 'and no URL.');
        }
    };

    const handleViewDetails = (meeting: Meeting) => {
        console.log('[MeetingsPage] handleViewDetails called', { id: meeting.id });
        if (meeting.id) {
            navigate(`/meetings/${meeting.id}`);
        }
    };

    const handleShareMeeting = async (meeting: Meeting) => {
        // Sharing logic would go here - likely opening a share modal
        console.log('Sharing meeting:', meeting.id);
    };

    const handleDeleteMeeting = (meeting: Meeting) => {
        setSelectedMeeting(meeting);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedMeeting) {
            try {
                await meetingService.delete(selectedMeeting.id);
                setIsDeleteDialogOpen(false);
                setSelectedMeeting(null);
                loadData();
            } catch (error) {
                console.error('Error deleting meeting:', error);
            }
        }
    };

    const filteredMeetings = meetings.filter(meeting => {
        const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            meeting.client?.name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
        const matchesClient = clientFilter === 'all' || meeting.client_id === clientFilter;
        const matchesProject = projectFilter === 'all' || meeting.project_id === projectFilter;

        let matchesDate = true;
        const now = new Date();
        const meetingDate = new Date(`${meeting.meeting_date}T${meeting.meeting_time}`);

        if (dateFilter === 'upcoming') {
            matchesDate = meetingDate >= now || meeting.status === 'live';
        } else if (dateFilter === 'past') {
            matchesDate = meetingDate < now && meeting.status !== 'live';
        }

        return matchesSearch && matchesStatus && matchesClient && matchesProject && matchesDate;
    });

    // Calculate stats
    const stats = {
        upcoming: meetings.filter(m => {
            const date = new Date(`${m.meeting_date}T${m.meeting_time}`);
            return date >= new Date() && m.status !== 'cancelled';
        }).length,
        awaitingSummary: meetings.filter(m => m.status === 'processing' || (m.status === 'ready' && !m.summary_id)).length,
        completed: meetings.filter(m => m.status === 'ready' || m.status === 'shared').length,
        shared: meetings.filter(m => m.status === 'shared').length
    };

    if (loading) return null;

    return (
        <div className="space-y-8 pb-20">
            {/* Header and Filters Section */}
            <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
                    <div className="min-w-0">
                        <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                            MEETINGS
                        </h1>
                        <p className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {currentUser?.role === 'admin'
                                ? 'Calls, recordings, transcripts, and follow-ups in one place.'
                                : 'Review call recordings, summaries, and agreed outcomes.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {filteredMeetings.some(m => m.status === 'live') && (
                            <button
                                onClick={() => {
                                    const liveMeeting = filteredMeetings.find(m => m.status === 'live');
                                    if (liveMeeting) handleJoinMeeting(liveMeeting);
                                }}
                                className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-full font-bold uppercase tracking-wide transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse flex items-center gap-2"
                            >
                                <VideoCameraIcon className="h-5 w-5" />
                                Join Live Now
                            </button>
                        )}
                        <button
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="btn-header-glass space-x-2 shrink-0 w-full sm:w-auto"
                        >
                            <span className="btn-text-glow">Schedule Meeting</span>
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </button>
                    </div>
                </div>

                {/* Search & Filters Inside Header Container */}
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        {/* Search Filter */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Search</label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search meetings..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* Date Filter */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Date</label>
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value as any)}
                                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
                            >
                                <option value="upcoming">Upcoming</option>
                                <option value="past">Past</option>
                                <option value="all">All Dates</option>
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
                            >
                                <option value="all">All Status</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="live">Live</option>
                                <option value="processing">Processing</option>
                                <option value="ready">Ready</option>
                                <option value="shared">Shared</option>
                            </select>
                        </div>

                        {/* Client Filter */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Client</label>
                            <select
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
                            >
                                <option value="all">All Clients</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Upcoming"
                    count={stats.upcoming}
                    icon={VideoCameraIcon}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                />
                <StatCard
                    label="Awaiting Summary"
                    count={stats.awaitingSummary}
                    icon={ClipboardDocumentCheckIcon}
                    color="text-amber-400"
                    bg="bg-amber-500/10"
                />
                <StatCard
                    label="Completed"
                    count={stats.completed}
                    icon={CheckCircleIcon}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                />
                <StatCard
                    label="Shared with Client"
                    count={stats.shared}
                    icon={ShareIcon}
                    color="text-purple-400"
                    bg="bg-purple-500/10"
                />
            </div>

            {/* Meetings Grid */}
            {filteredMeetings.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredMeetings.map(meeting => (
                        <MeetingCard
                            key={meeting.id}
                            meeting={meeting}
                            currentUserRole={currentUser?.role}
                            onJoin={handleJoinMeeting}
                            onViewDetails={handleViewDetails}
                            onShare={handleShareMeeting}
                            onDelete={handleDeleteMeeting}
                        />
                    ))}
                </div>
            ) : (
                <div className="glass-card rounded-2xl p-12 text-center border border-white/10">
                    <VideoCameraSlashIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No meetings found</h3>
                    <p className="text-gray-400">Try adjusting your filters or schedule a new meeting.</p>
                </div>
            )}

            {/* Schedule Modal */}
            <ScheduleMeetingModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSave={loadData}
                currentUser={currentUser}
            />

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Meeting"
                message={`Are you sure you want to delete the meeting "${selectedMeeting?.title}"? This action cannot be undone.`}
            />
        </div>
    );
}

function StatCard({ label, count, icon: Icon, color, bg }: any) {
    return (
        <div className="glass-card rounded-xl p-5 border border-white/10 flex items-center gap-4 group hover:border-white/20 transition-all">
            <div className={`p-3 rounded-lg ${bg} ${color} group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-black text-white mt-0.5">{count}</p>
            </div>
        </div>
    );
}
